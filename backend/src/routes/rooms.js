const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { getCurrentMatchday, getTeams } = require('../services/football');

// Generate short room code
function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST /api/rooms — create a room
router.post('/', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Room name required' });

    let code;
    let tries = 0;
    while (tries < 10) {
      code = generateCode();
      const exists = await db.query('SELECT id FROM rooms WHERE code=$1', [code]);
      if (exists.rows.length === 0) break;
      tries++;
    }

    const room = await db.query(
      `INSERT INTO rooms (name, code, creator_id) VALUES ($1,$2,$3)
       RETURNING *`,
      [name, code, req.user.id]
    );

    // Creator auto-joins
    await db.query(
      `INSERT INTO room_members (room_id, user_id) VALUES ($1,$2)`,
      [room.rows[0].id, req.user.id]
    );

    res.status(201).json(room.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/rooms/join — join by code
router.post('/join', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Room code required' });

    const roomRes = await db.query('SELECT * FROM rooms WHERE code=$1', [code.toUpperCase()]);
    const room = roomRes.rows[0];
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.status === 'finished') return res.status(400).json({ error: 'Game already finished' });

    const alreadyIn = await db.query(
      'SELECT id FROM room_members WHERE room_id=$1 AND user_id=$2',
      [room.id, req.user.id]
    );
    if (alreadyIn.rows.length > 0) {
      return res.status(409).json({ error: 'Already in this room', room });
    }

    if (room.status === 'active') {
      return res.status(400).json({ error: 'Game already in progress' });
    }

    await db.query(
      'INSERT INTO room_members (room_id, user_id) VALUES ($1,$2)',
      [room.id, req.user.id]
    );

    res.json({ success: true, room });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/rooms — my rooms
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.*, rm.status as my_status, rm.cards as my_cards,
              (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) as member_count
       FROM rooms r
       JOIN room_members rm ON rm.room_id = r.id AND rm.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/rooms/:id — room details + members + current gameweek
router.get('/:id', authenticate, async (req, res) => {
  try {
    const roomRes = await db.query(
      `SELECT r.*, u.username as creator_username
       FROM rooms r JOIN users u ON u.id = r.creator_id
       WHERE r.id=$1`,
      [req.params.id]
    );
    const room = roomRes.rows[0];
    if (!room) return res.status(404).json({ error: 'Room not found' });

    // Check membership
    const memberCheck = await db.query(
      'SELECT * FROM room_members WHERE room_id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this room' });
    }

    // Members list
    const membersRes = await db.query(
      `SELECT rm.*, u.username, u.avatar_color
       FROM room_members rm
       JOIN users u ON u.id = rm.user_id
       WHERE rm.room_id=$1
       ORDER BY rm.cards ASC, u.username ASC`,
      [req.params.id]
    );

    // Current gameweek
    const gwRes = await db.query(
      `SELECT * FROM gameweeks WHERE room_id=$1 ORDER BY week_number DESC LIMIT 1`,
      [req.params.id]
    );

    // Winner details
    let winner = null;
    if (room.winner_id) {
      const winnerRes = await db.query(
        'SELECT id, username, avatar_color FROM users WHERE id=$1',
        [room.winner_id]
      );
      winner = winnerRes.rows[0];
    }

    res.json({
      room,
      members: membersRes.rows,
      currentGameweek: gwRes.rows[0] || null,
      myMembership: memberCheck.rows[0],
      winner,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/rooms/:id/start — creator starts the game
router.post('/:id/start', authenticate, async (req, res) => {
  try {
    const roomRes = await db.query('SELECT * FROM rooms WHERE id=$1', [req.params.id]);
    const room = roomRes.rows[0];
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.creator_id !== req.user.id) return res.status(403).json({ error: 'Only the creator can start the game' });
    if (room.status === 'active') return res.status(400).json({ error: 'Game already started' });
    if (room.status === 'finished') return res.status(400).json({ error: 'Game already finished' });

    // Check minimum players
    const memberCount = await db.query(
      'SELECT COUNT(*) FROM room_members WHERE room_id=$1',
      [room.id]
    );
    if (parseInt(memberCount.rows[0].count) < 2) {
      return res.status(400).json({ error: 'Need at least 2 players to start' });
    }

    const matchday = await getCurrentMatchday();

    // Create first gameweek
    const gw = await db.query(
      `INSERT INTO gameweeks (room_id, week_number, status)
       VALUES ($1,$2,'open') RETURNING *`,
      [room.id, matchday]
    );

    await db.query(
      `UPDATE rooms SET status='active', current_gameweek=$1 WHERE id=$2`,
      [matchday, room.id]
    );

    res.json({ success: true, gameweek: gw.rows[0], matchday });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/rooms/:id/next-week — creator advances to next gameweek
router.post('/:id/next-week', authenticate, async (req, res) => {
  try {
    const roomRes = await db.query('SELECT * FROM rooms WHERE id=$1', [req.params.id]);
    const room = roomRes.rows[0];
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.creator_id !== req.user.id) return res.status(403).json({ error: 'Only the creator can advance' });
    if (room.status !== 'active') return res.status(400).json({ error: 'Game not active' });

    const nextMatchday = (room.current_gameweek || 1) + 1;

    const gw = await db.query(
      `INSERT INTO gameweeks (room_id, week_number, status)
       VALUES ($1,$2,'open')
       ON CONFLICT (room_id, week_number) DO UPDATE SET status='open'
       RETURNING *`,
      [room.id, nextMatchday]
    );

    await db.query(
      'UPDATE rooms SET current_gameweek=$1 WHERE id=$2',
      [nextMatchday, room.id]
    );

    res.json({ success: true, gameweek: gw.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// POST /api/rooms/:id/end — creator manually ends the game
router.post('/:id/end', authenticate, async (req, res) => {
  try {
    const roomRes = await db.query('SELECT * FROM rooms WHERE id=$1', [req.params.id]);
    const room = roomRes.rows[0];
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.creator_id !== req.user.id) return res.status(403).json({ error: 'Only the creator can end the game' });
    if (room.status === 'finished') return res.status(400).json({ error: 'Game already finished' });

    const activeRes = await db.query(
      `SELECT user_id FROM room_members WHERE room_id=$1 AND status != 'eliminated' LIMIT 1`,
      [room.id]
    );
    const winnerId = activeRes.rows[0]?.user_id || null;

    await db.query(
      `UPDATE rooms SET status='finished', winner_id=$1 WHERE id=$2`,
      [winnerId, room.id]
    );

    res.json({ success: true, winner_id: winnerId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

