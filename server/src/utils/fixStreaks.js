/**
 * Utility script to recalculate all streaks in the database
 * Run with: node src/utils/fixStreaks.js
 */
const { recalculateStreaks } = require('../lib/db');
const pool = require('../lib/db').pool;

async function fixAllStreaks() {
  try {
    console.log('Starting streak recalculation for all users...');
    
    // Get all user IDs
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT user_id FROM users');
      
      // Recalculate streaks for each user
      for (const user of result.rows) {
        console.log(`Recalculating streaks for user ${user.user_id}...`);
        await recalculateStreaks(user.user_id);
      }
      
      console.log('All streaks have been recalculated successfully!');
    } finally {
      client.release();
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error recalculating streaks:', error);
    process.exit(1);
  }
}

fixAllStreaks(); 