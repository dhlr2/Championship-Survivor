/**
 * Football Data Service
 * Uses football-data.org free tier (EFL Championship = "ELC")
 * AGGRESSIVELY caches to stay within 10 req/min limit
 */
const axios = require('axios');
const db = require('../db');

const BASE = process.env.FOOTBALL_API_BASE || 'https://api.football-data.org/v4';
const API_KEY = process.env.FOOTBALL_API_KEY;
const COMP_ID = process.env.CHAMPIONSHIP_COMPETITION_ID || 'ELC';
const CACHE_TTL_MINS = parseInt(process.env.FIXTURE_CACHE_TTL || '60');

const api = axios.create({
  baseURL: BASE,
  headers: { 'X-Auth-Token': API_KEY },
  timeout: 10000,
});

// In-memory lock to prevent concurrent identical requests
const inFlight = {};

async function fetchWithLock(key, fetchFn) {
  if (inFlight[key]) return inFlight[key];
  inFlight[key] = fetchFn().finally(() => { delete inFlight[key]; });
  return inFlight[key];
}

/**
 * Get all Championship teams — cached in DB, refreshed once per season
 */
async function getTeams() {
  // Check DB cache
  const cached = await db.query(
    'SELECT * FROM team_cache ORDER BY name ASC'
  );
  if (cached.rows.length > 0) {
    return cached.rows;
  }

  return fetchWithLock('teams', async () => {
    const res = await api.get(`/competitions/${COMP_ID}/teams`);
    const teams = res.data.teams.map(t => ({
      id: t.id,
      name: t.name,
      short_name: t.shortName,
      tla: t.tla,
      crest_url: t.crest,
    }));

    // Upsert into cache
    for (const t of teams) {
      await db.query(
        `INSERT INTO team_cache (id, name, short_name, tla, crest_url, cached_at)
         VALUES ($1,$2,$3,$4,$5,NOW())
         ON CONFLICT (id) DO UPDATE SET
           name=$2, short_name=$3, tla=$4, crest_url=$5, cached_at=NOW()`,
        [t.id, t.name, t.short_name, t.tla, t.crest_url]
      );
    }
    return teams;
  });
}

/**
 * Get fixtures for a matchday — cached in DB
 * Only hits API if cache is stale (> CACHE_TTL_MINS old) or no data
 */
async function getFixturesForMatchday(matchday) {
  const cacheCheck = await db.query(
    `SELECT *, EXTRACT(EPOCH FROM (NOW() - cached_at))/60 AS age_mins
     FROM fixture_cache
     WHERE matchday = $1
     ORDER BY match_date ASC`,
    [matchday]
  );

  const stale = cacheCheck.rows.length === 0 ||
    cacheCheck.rows.some(r => r.age_mins > CACHE_TTL_MINS);

  if (!stale) return cacheCheck.rows;

  return fetchWithLock(`fixtures_${matchday}`, async () => {
    const res = await api.get(`/competitions/${COMP_ID}/matches`, {
      params: { matchday },
    });

    const matches = res.data.matches;
    for (const m of matches) {
      await db.query(
        `INSERT INTO fixture_cache
           (external_id, home_team_id, home_team, away_team_id, away_team,
            matchday, match_date, status, home_score, away_score, cached_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
         ON CONFLICT (external_id) DO UPDATE SET
           status=$8, home_score=$9, away_score=$10, cached_at=NOW()`,
        [
          m.id,
          m.homeTeam.id, m.homeTeam.name,
          m.awayTeam.id, m.awayTeam.name,
          m.matchday,
          m.utcDate,
          m.status,
          m.score?.fullTime?.home ?? null,
          m.score?.fullTime?.away ?? null,
        ]
      );
    }

    const updated = await db.query(
      'SELECT * FROM fixture_cache WHERE matchday=$1 ORDER BY match_date ASC',
      [matchday]
    );
    return updated.rows;
  });
}

/**
 * Get current/upcoming matchday for Championship
 * Cached aggressively — only changes weekly
 */
let currentMatchdayCache = null;
let currentMatchdayCachedAt = null;

async function getCurrentMatchday() {
  const now = Date.now();
  if (
    currentMatchdayCache &&
    currentMatchdayCachedAt &&
    now - currentMatchdayCachedAt < 30 * 60 * 1000 // 30 min
  ) {
    return currentMatchdayCache;
  }

  return fetchWithLock('current_matchday', async () => {
    const res = await api.get(`/competitions/${COMP_ID}`);
    const matchday = res.data.currentSeason?.currentMatchday || 1;
    currentMatchdayCache = matchday;
    currentMatchdayCachedAt = Date.now();
    return matchday;
  });
}

/**
 * Refresh results for a specific matchday (called by cron on matchdays)
 * Returns { matchday, finished: [{external_id, home_team_id, away_team_id, home_score, away_score}] }
 */
async function refreshMatchdayResults(matchday) {
  // Force stale by deleting in-memory lock — hits API
  const res = await api.get(`/competitions/${COMP_ID}/matches`, {
    params: { matchday },
  });

  const matches = res.data.matches;
  for (const m of matches) {
    await db.query(
      `UPDATE fixture_cache SET
         status=$1, home_score=$2, away_score=$3, cached_at=NOW()
       WHERE external_id=$4`,
      [
        m.status,
        m.score?.fullTime?.home ?? null,
        m.score?.fullTime?.away ?? null,
        m.id,
      ]
    );
  }

  const finished = matches
    .filter(m => m.status === 'FINISHED')
    .map(m => ({
      external_id: m.id,
      home_team_id: m.homeTeam.id,
      away_team_id: m.awayTeam.id,
      home_score: m.score.fullTime.home,
      away_score: m.score.fullTime.away,
    }));

  return { matchday, finished };
}

/**
 * Get all seasons matchdays (used to list upcoming gameweeks)
 * Heavily cached
 */
async function getSeasonMatchdays() {
  const res = await db.query(
    `SELECT DISTINCT matchday, MIN(match_date) as first_game
     FROM fixture_cache
     GROUP BY matchday
     ORDER BY matchday ASC`
  );
  return res.rows;
}

module.exports = {
  getTeams,
  getFixturesForMatchday,
  getCurrentMatchday,
  refreshMatchdayResults,
  getSeasonMatchdays,
};
