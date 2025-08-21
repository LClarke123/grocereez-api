const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function createEnhancedSchema() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🔧 Creating enhanced database schema...');
        
        // Read the schema file
        const schema = fs.readFileSync('enhanced-schema.sql', 'utf8');
        
        // Execute the schema
        await pool.query(schema);
        
        console.log('✅ Enhanced database schema created successfully!');
        
        // Verify tables were created
        const tables = await pool.query(`
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN ('enhanced_stores', 'ai_parsed_receipts', 'product_catalog', 'ai_parsed_items', 'shopping_insights')
            ORDER BY tablename
        `);
        
        console.log('\n📋 Created tables:');
        tables.rows.forEach(row => {
            console.log(`   ✓ ${row.tablename}`);
        });
        
    } catch (error) {
        console.error('❌ Error creating schema:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    createEnhancedSchema().catch(console.error);
}

module.exports = createEnhancedSchema;