const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { getFixturesForMatchday, getTeams } = require('../services/football');
const { submitPick, getUsedTeams, resolveGameweek } = require('../services/game');

// GET /api/picks/fixtures/:matchday — get fixtures for a matchday
router.get('/fixtures/:matchday', authenticate, async (req, res) => {
  try {
    const fixtures = await getFixturesForMatchday(parseInt(req.params.matchday));
    res.json(fixtures);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch fixtures' });
  }
});

// GET /api/picks/teams — all Championship teams
router.get('/teams', authenticate, async (req, res) => {
  try {
    const teams = await getTeams();
    res.json(teams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch teams' });
  }
});

// GET /api/picks/room/:roomId — my picks history + available teams this week
router.get('/room/:roomId', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;

    // Verify membership
    const memberCheck = await db.query(
      'SELECT * FROM room_members WHERE room_id=$1 AND user_id=$2',
      [roomId, req.user.id]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member' });
    }

    // Get room + current gameweek
    const roomRes = await db.query('SELECT * FROM rooms WHERE id=$1', [roomId]);
    const room = roomRes.rows[0];

    // Get current gameweek
    const gwRes = await db.query(
      `SELECT * FROM gameweeks WHERE room_id=$1 ORDER BY week_number DESC LIMIT 1`,
      [roomId]
    );
    const gw = gwRes.rows[0];

    // My picks history
    const usedTeams = await getUsedTeams(req.user.id, roomId);

    // All teams
    const allTeams = await getTeams();

    // Available teams (not yet picked)
    const usedIds = new Set(usedTeams.map(t => t.team_id));
    const availableTeams = allTeams.filter(t => !usedIds.has(t.id));

    // This week's pick (if any)
    let currentPick = null;
    if (gw) {
      const pickRes = await db.query(
        'SELECT * FROM picks WHERE gameweek_id=$1 AND user_id=$2',
        [gw.id, req.user.id]
      );
      currentPick = pickRes.rows[0] || null;
    }

    // Fixtures for current matchday
    let fixtures = [];
    if (gw) {
      try {
        fixtures = await getFixturesForMatchday(gw.week_number);
      } catch { /* non-fatal */ }
    }

    res.json({
      room,
      currentGameweek: gw,
      usedTeams,
      availableTeams,
      currentPick,
      fixtures,
      membership: memberCheck.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/picks/room/:roomId — submit a pick
router.post('/room/:roomId', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { teamId, gameweekId } = req.body;
    if (!teamId || !gameweekId) {
      return res.status(400).json({ error: 'teamId and gameweekId required' });
    }

    const allTeams = await getTeams();
    const result = await submitPick(
      req.user.id, roomId, gameweekId, teamId, allTeams
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Could not submit pick' });
  }
});

// POST /api/picks/room/:roomId/resolve — admin/creator resolves gameweek
router.post('/room/:roomId/resolve', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { gameweekId } = req.body;

    // Verify creator
    const roomRes = await db.query('SELECT creator_id FROM rooms WHERE id=$1', [roomId]);
    const room = roomRes.rows[0];
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the creator can resolve a gameweek' });
    }

    const result = await resolveGameweek(roomId, gameweekId);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// GET /api/picks/room/:roomId/all-picks — everyone's picks this week
router.get('/room/:roomId/all-picks', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;

    const memberCheck = await db.query(
      'SELECT id FROM room_members WHERE room_id=$1 AND user_id=$2',
      [roomId, req.user.id]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member' });
    }

    const gwRes = await db.query(
      `SELECT * FROM gameweeks WHERE room_id=$1 ORDER BY week_number DESC LIMIT 1`,
      [roomId]
    );
    const gw = gwRes.rows[0];
    if (!gw) return res.json([]);

    const picksRes = await db.query(
      `SELECT p.*, u.username, u.avatar_color, rm.cards, rm.status as member_status
       FROM picks p
       JOIN users u ON u.id = p.user_id
       JOIN room_members rm ON rm.room_id = p.room_id AND rm.user_id = p.user_id
       WHERE p.gameweek_id=$1 ORDER BY u.username ASC`,
      [gw.id]
    );

    res.json(picksRes.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
