// Purge all mock/test data from the database
const { Pool } = require('pg');

async function purgeMockData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Starting database purge of mock/test data...');

    // Delete all receipt items first (foreign key constraint)
    const itemsResult = await pool.query('DELETE FROM receipt_items');
    console.log(`Deleted ${itemsResult.rowCount} receipt items`);

    // Delete all receipts
    const receiptsResult = await pool.query('DELETE FROM receipts');
    console.log(`Deleted ${receiptsResult.rowCount} receipts`);

    // Delete all stores (they'll be recreated from real receipts)
    const storesResult = await pool.query('DELETE FROM stores');
    console.log(`Deleted ${storesResult.rowCount} stores`);

    // Delete processing logs
    const logsResult = await pool.query('DELETE FROM processing_logs');
    console.log(`Deleted ${logsResult.rowCount} processing logs`);

    // Delete user sessions (force re-authentication with clean slate)
    const sessionsResult = await pool.query('DELETE FROM user_sessions');
    console.log(`Deleted ${sessionsResult.rowCount} user sessions`);

    console.log('Database purge completed successfully!');
    console.log('All mock data has been removed. Analytics will now be clean.');

    await pool.end();
  } catch (error) {
    console.error('Error purging mock data:', error);
    await pool.end();
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  purgeMockData()
    .then(() => {
      console.log('Purge complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Purge failed:', error);
      process.exit(1);
    });
}

module.exports = { purgeMockData };