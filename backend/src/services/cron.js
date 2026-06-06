/**
 * Cron Service
 * Polls for match results during Championship matchdays
 * Designed to use MINIMUM API calls
 */
const cron = require('node-cron');
const db = require('../db');
const { resolveGameweek } = require('./game');

/**
 * Check for active gameweeks that need resolving
 * Runs every 15 minutes during typical matchday hours (Fri eve, Sat, Sun)
 */
async function checkAndResolve() {
  try {
    // Find all active gameweeks across all rooms
    const gwRes = await db.query(
      `SELECT gw.*, r.id as room_id
       FROM gameweeks gw
       JOIN rooms r ON r.id = gw.room_id
       WHERE gw.status = 'open' AND r.status = 'active'`
    );

    for (const gw of gwRes.rows) {
      try {
        const result = await resolveGameweek(gw.room_id, gw.id);
        if (result.resolved > 0) {
          console.log(`[CRON] Resolved gameweek ${gw.week_number} for room ${gw.room_id}: ${result.resolved} picks settled`);
        }
      } catch (err) {
        console.error(`[CRON] Error resolving gw ${gw.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[CRON] Check failed:', err.message);
  }
}

function startCron() {
  // Every 15 minutes on Fri, Sat, Sun (Championship matchday days)
  // 5 4 * * 5,6,0 = Fri-Sun at various times
  // Using every 15 mins overall but only meaningful on matchdays
  cron.schedule('*/15 * * * *', checkAndResolve);
  console.log('[CRON] Result poller started (every 15 mins)');
}

module.exports = { startCron, checkAndResolve };
