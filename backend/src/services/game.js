/**
 * Game Logic Service
 * Handles pick resolution, card assignment, and winner detection
 */
const db = require('../db');
const { refreshMatchdayResults } = require('./football');

/**
 * Resolve all picks for a completed gameweek in a room
 * - WIN  → no card change
 * - DRAW / LOSS → +1 card (yellow first, red second = eliminated)
 * Returns summary of results
 */
async function resolveGameweek(roomId, gameweekId) {
  // Get all picks for this gameweek
  const picksRes = await db.query(
    `SELECT p.*, rm.cards, rm.status as member_status
     FROM picks p
     JOIN room_members rm ON rm.user_id = p.user_id AND rm.room_id = p.room_id
     WHERE p.gameweek_id = $1 AND p.room_id = $2 AND p.result IS NULL`,
    [gameweekId, roomId]
  );

  if (picksRes.rows.length === 0) return { resolved: 0, results: [] };

  // Get the matchday from this gameweek
  const gwRes = await db.query(
    'SELECT week_number FROM gameweeks WHERE id=$1',
    [gameweekId]
  );
  const matchday = gwRes.rows[0]?.week_number;
  if (!matchday) throw new Error('Gameweek not found');

  // Fetch fresh results from API
  const { finished } = await refreshMatchdayResults(matchday);
  if (finished.length === 0) return { resolved: 0, results: [], message: 'No finished matches yet' };

  // Build a map: teamId → result
  const teamResults = {};
  for (const m of finished) {
    if (m.home_score === null || m.away_score === null) continue;
    if (m.home_score > m.away_score) {
      teamResults[m.home_team_id] = 'win';
      teamResults[m.away_team_id] = 'loss';
    } else if (m.home_score < m.away_score) {
      teamResults[m.home_team_id] = 'loss';
      teamResults[m.away_team_id] = 'win';
    } else {
      teamResults[m.home_team_id] = 'draw';
      teamResults[m.away_team_id] = 'draw';
    }
  }

  const results = [];

  for (const pick of picksRes.rows) {
    const outcome = teamResults[pick.team_id];
    if (!outcome) continue; // match not finished yet

    // Update pick result
    await db.query(
      'UPDATE picks SET result=$1 WHERE id=$2',
      [outcome, pick.id]
    );

    let newCards = pick.cards;
    let newStatus = pick.member_status;

    if (outcome === 'draw' || outcome === 'loss') {
      newCards = pick.cards + 1;
      if (newCards >= 2) {
        newStatus = 'eliminated';
      } else {
        newStatus = 'yellow_card';
      }

      await db.query(
        `UPDATE room_members SET cards=$1, status=$2
         WHERE room_id=$3 AND user_id=$4`,
        [newCards, newStatus, roomId, pick.user_id]
      );
    }

    results.push({
      userId: pick.user_id,
      teamId: pick.team_id,
      teamName: pick.team_name,
      outcome,
      cards: newCards,
      status: newStatus,
    });
  }

  // Check if game is over (only 1 active player left)
  const activeRes = await db.query(
    `SELECT user_id FROM room_members
     WHERE room_id=$1 AND status != 'eliminated'`,
    [roomId]
  );

  if (activeRes.rows.length === 1) {
    const winnerId = activeRes.rows[0].user_id;
    await db.query(
      `UPDATE rooms SET status='finished', winner_id=$1 WHERE id=$2`,
      [winnerId, roomId]
    );
    return { resolved: results.length, results, winner: winnerId };
  }

  // All eliminated (edge case) — last man standing was everyone
  if (activeRes.rows.length === 0) {
    await db.query(
      `UPDATE rooms SET status='finished' WHERE id=$1`,
      [roomId]
    );
    return { resolved: results.length, results, winner: null };
  }

  // Mark gameweek complete
  await db.query(
    `UPDATE gameweeks SET status='completed' WHERE id=$1`,
    [gameweekId]
  );

  return { resolved: results.length, results };
}

/**
 * Get teams already picked by a user in a room (cannot pick again)
 */
async function getUsedTeams(userId, roomId) {
  const res = await db.query(
    `SELECT DISTINCT p.team_id, p.team_name, p.team_short, p.team_crest, p.result,
            gw.week_number
     FROM picks p
     JOIN gameweeks gw ON gw.id = p.gameweek_id
     WHERE p.user_id=$1 AND p.room_id=$2
     ORDER BY gw.week_number ASC`,
    [userId, roomId]
  );
  return res.rows;
}

/**
 * Get available teams for a user this week
 */
async function getAvailableTeams(userId, roomId, allTeams) {
  const used = await getUsedTeams(userId, roomId);
  const usedIds = new Set(used.map(t => t.team_id));
  return allTeams.filter(t => !usedIds.has(t.id));
}

/**
 * Submit a pick — validates no double-pick
 */
async function submitPick(userId, roomId, gameweekId, teamId, allTeams) {
  // Check gameweek is open
  const gwRes = await db.query(
    `SELECT * FROM gameweeks WHERE id=$1 AND room_id=$2`,
    [gameweekId, roomId]
  );
  const gw = gwRes.rows[0];
  if (!gw) throw new Error('Gameweek not found');
  if (gw.status !== 'open') throw new Error('Picks are locked for this gameweek');

  // Check user is active
  const memberRes = await db.query(
    `SELECT * FROM room_members WHERE room_id=$1 AND user_id=$2`,
    [roomId, userId]
  );
  const member = memberRes.rows[0];
  if (!member) throw new Error('You are not in this room');
  if (member.status === 'eliminated') throw new Error('You have been eliminated');

  // Check team hasn't been used by this user in this room
  const usedCheck = await db.query(
    `SELECT id FROM picks WHERE room_id=$1 AND user_id=$2 AND team_id=$3`,
    [roomId, userId, teamId]
  );
  if (usedCheck.rows.length > 0) {
    throw new Error('You have already picked this team previously');
  }

  // Check not already picked this gameweek
  const dupCheck = await db.query(
    `SELECT id FROM picks WHERE gameweek_id=$1 AND user_id=$2`,
    [gameweekId, userId]
  );
  if (dupCheck.rows.length > 0) {
    throw new Error('You have already made a pick for this gameweek');
  }

  // Find team info
  const team = allTeams.find(t => t.id === parseInt(teamId));
  if (!team) throw new Error('Invalid team');

  await db.query(
    `INSERT INTO picks (gameweek_id, room_id, user_id, team_id, team_name, team_short, team_crest)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [gameweekId, roomId, userId, team.id, team.name, team.tla, team.crest_url]
  );

  return { success: true, team };
}

module.exports = {
  resolveGameweek,
  getUsedTeams,
  getAvailableTeams,
  submitPick,
};
