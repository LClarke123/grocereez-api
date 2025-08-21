const { Pool } = require('pg');
require('dotenv').config();

async function debugDataStructure() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false
    });
    
    const result = await pool.query(
        'SELECT id, llm_processed_data FROM receipts WHERE id = $1', 
        ['ac91fbf9-5dad-4607-8998-3990c0f04423']
    );
    
    if (result.rows.length > 0) {
        console.log('LLM Processed Data Structure:');
        console.log(JSON.stringify(result.rows[0].llm_processed_data, null, 2));
    }
    
    await pool.end();
}

debugDataStructure();