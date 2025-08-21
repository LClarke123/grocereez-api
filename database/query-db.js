// Simple Database Query Interface
// Usage: node query-db.js "SELECT * FROM custom_receipts;"

const { Pool } = require('pg');
require('dotenv').config();

async function queryDatabase(sql) {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log(`🔍 Executing Query: ${sql}\n`);
        
        const result = await pool.query(sql);
        
        if (result.rows.length === 0) {
            console.log('📭 No results found.');
        } else {
            console.log(`📊 Found ${result.rows.length} rows:\n`);
            
            // Pretty print results
            if (result.rows.length <= 10) {
                // Show detailed results for small queries
                result.rows.forEach((row, index) => {
                    console.log(`${index + 1}.`);
                    Object.entries(row).forEach(([key, value]) => {
                        console.log(`   ${key}: ${value}`);
                    });
                    console.log();
                });
            } else {
                // Show summary for large queries
                console.log('First 5 rows:');
                result.rows.slice(0, 5).forEach((row, index) => {
                    console.log(`${index + 1}. ${JSON.stringify(row)}`);
                });
                console.log(`\n... and ${result.rows.length - 5} more rows.`);
            }
        }
        
    } catch (error) {
        console.error('❌ Query Error:', error.message);
    } finally {
        await pool.end();
    }
}

// Get SQL from command line argument
const sql = process.argv[2];

if (!sql) {
    console.log('📋 DATABASE QUERY INTERFACE');
    console.log('===========================\n');
    console.log('Usage: node query-db.js "YOUR_SQL_QUERY"');
    console.log('\nExample queries:');
    console.log('• node query-db.js "SELECT * FROM custom_receipts;"');
    console.log('• node query-db.js "SELECT item_name, item_price FROM custom_receipt_items ORDER BY item_price DESC LIMIT 5;"');
    console.log('• node query-db.js "SELECT brand_name, COUNT(*) FROM custom_receipts GROUP BY brand_name;"');
    console.log('• node query-db.js "SELECT COUNT(*) FROM custom_receipt_items WHERE item_type_code = \'PANTRY\';"');
} else {
    queryDatabase(sql);
}