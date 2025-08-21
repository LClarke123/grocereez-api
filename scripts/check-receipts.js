const { Pool } = require('pg');
require('dotenv').config();

async function checkReceipts() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false
    });
    
    const result = await pool.query('SELECT id, status, llm_processed_data FROM receipts WHERE status = $1', ['completed']);
    console.log(`Found ${result.rows.length} completed receipts:`);
    
    result.rows.forEach((r, i) => {
        console.log(`${i + 1}. ID: ${r.id}`);
        console.log(`   Has LLM Data: ${!!r.llm_processed_data}`);
        if (r.llm_processed_data && r.llm_processed_data.receipt) {
            console.log(`   Merchant: ${r.llm_processed_data.receipt.merchant || 'None'}`);
            console.log(`   Items: ${r.llm_processed_data.receipt.items ? r.llm_processed_data.receipt.items.length : 0}`);
        } else if (r.llm_processed_data) {
            console.log(`   LLM Data Keys: ${Object.keys(r.llm_processed_data).join(', ')}`);
        }
        console.log();
    });
    
    await pool.end();
}

checkReceipts().catch(console.error);