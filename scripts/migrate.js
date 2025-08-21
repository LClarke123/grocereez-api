// migrate.js - Database Migration Script
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Connecting to database...');
    
    // Read the schema file
    const schema = fs.readFileSync('schema.sql', 'utf8');
    
    console.log('Running database migration...');
    
    // Execute the schema
    await pool.query(schema);
    
    console.log('✅ Database migration completed successfully!');
    console.log('All tables created:');
    console.log('- users');
    console.log('- stores'); 
    console.log('- receipts');
    console.log('- receipt_items');
    console.log('- product_categories');
    console.log('- user_sessions');
    console.log('- processing_logs');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await pool.end();
    console.log('Database connection closed.');
  }
}

runMigration();