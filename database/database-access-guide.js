// Database Access Guide - How to Query Your Receipt Data
// Shows various ways to access and query the processed receipt data

const { Pool } = require('pg');
require('dotenv').config();

class DatabaseAccessGuide {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }

    async showAllAccessMethods() {
        console.log('🗄️  DATABASE ACCESS GUIDE');
        console.log('========================\n');

        try {
            // 1. Show all tables available
            await this.showAvailableTables();
            
            // 2. Show receipt headers
            await this.showReceiptHeaders();
            
            // 3. Show receipt items
            await this.showReceiptItems();
            
            // 4. Show advanced queries
            await this.showAdvancedQueries();
            
            // 5. Show data export methods
            await this.showDataExportMethods();

        } catch (error) {
            console.error('❌ Database access error:', error.message);
        }
    }

    async showAvailableTables() {
        console.log('📋 AVAILABLE TABLES');
        console.log('==================\n');

        const tablesQuery = `
            SELECT 
                tablename as table_name,
                schemaname as schema
            FROM pg_tables 
            WHERE schemaname = 'public'
            AND tablename LIKE '%custom%'
            ORDER BY tablename
        `;

        const result = await this.pool.query(tablesQuery);
        
        console.log('Your Custom Tables:');
        result.rows.forEach(row => {
            console.log(`   ✓ ${row.table_name}`);
        });
        console.log();

        // Show table structures
        console.log('📊 TABLE STRUCTURES:');
        console.log('===================\n');

        // Custom receipts table
        const receiptStructure = await this.pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'custom_receipts'
            ORDER BY ordinal_position
        `);

        console.log('🏪 custom_receipts table:');
        receiptStructure.rows.forEach(col => {
            console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });
        console.log();

        // Custom receipt items table
        const itemsStructure = await this.pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'custom_receipt_items'
            ORDER BY ordinal_position
        `);

        console.log('🛒 custom_receipt_items table:');
        itemsStructure.rows.forEach(col => {
            console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });
        console.log();
    }

    async showReceiptHeaders() {
        console.log('🏪 RECEIPT HEADERS - How to Access');
        console.log('==================================\n');

        // Show all receipt headers
        const headers = await this.pool.query(`
            SELECT 
                id,
                brand_name,
                street_number || ' ' || street_name as address,
                city || ', ' || state || ' ' || zipcode as location,
                date_field,
                time_field,
                tax_field_1,
                tax_field_2,
                total_price_field,
                confidence_score
            FROM custom_receipts
            ORDER BY date_field DESC
        `);

        console.log('All Receipt Headers:');
        console.log('Query: SELECT * FROM custom_receipts;\n');
        
        headers.rows.forEach((receipt, index) => {
            console.log(`${index + 1}. Receipt ID: ${receipt.id}`);
            console.log(`   Store: ${receipt.brand_name}`);
            console.log(`   Address: ${receipt.address}`);
            console.log(`   Location: ${receipt.location}`);
            console.log(`   Date/Time: ${receipt.date_field} ${receipt.time_field}`);
            console.log(`   Taxes: $${receipt.tax_field_1} / $${receipt.tax_field_2}`);
            console.log(`   Total: $${receipt.total_price_field}`);
            console.log(`   Confidence: ${(receipt.confidence_score * 100).toFixed(1)}%\n`);
        });
    }

    async showReceiptItems() {
        console.log('🛍️  RECEIPT ITEMS - How to Access');
        console.log('=================================\n');

        // Get a sample receipt ID
        const sampleReceipt = await this.pool.query(`
            SELECT id FROM custom_receipts LIMIT 1
        `);

        if (sampleReceipt.rows.length === 0) {
            console.log('No receipts found in database.\n');
            return;
        }

        const receiptId = sampleReceipt.rows[0].id;

        // Show items for this receipt
        const items = await this.pool.query(`
            SELECT 
                item_name,
                item_type_code,
                item_price,
                quantity,
                unit_price,
                category
            FROM custom_receipt_items
            WHERE receipt_id = $1
            ORDER BY item_price DESC
            LIMIT 10
        `, [receiptId]);

        console.log(`Items for Receipt ${receiptId}:`);
        console.log(`Query: SELECT * FROM custom_receipt_items WHERE receipt_id = '${receiptId}';\n`);

        items.rows.forEach((item, index) => {
            console.log(`${index + 1}. ${item.item_name}`);
            console.log(`   Type: ${item.item_type_code} | Price: $${item.item_price}`);
            console.log(`   Quantity: ${item.quantity} | Unit Price: $${Number(item.unit_price).toFixed(2)}`);
            console.log(`   Category: ${item.category}\n`);
        });
    }

    async showAdvancedQueries() {
        console.log('🔍 ADVANCED QUERIES - Useful Examples');
        console.log('=====================================\n');

        // Query 1: Items by type code
        console.log('1. GET ALL ITEMS BY TYPE CODE:');
        console.log('Query: SELECT item_type_code, COUNT(*), SUM(item_price) FROM custom_receipt_items GROUP BY item_type_code;');
        
        const typeStats = await this.pool.query(`
            SELECT 
                item_type_code,
                COUNT(*) as item_count,
                SUM(item_price) as total_value,
                AVG(item_price) as avg_price
            FROM custom_receipt_items
            GROUP BY item_type_code
            ORDER BY total_value DESC
        `);

        typeStats.rows.forEach(stat => {
            console.log(`   ${stat.item_type_code}: ${stat.item_count} items, $${Number(stat.total_value).toFixed(2)} total, $${Number(stat.avg_price).toFixed(2)} avg`);
        });
        console.log();

        // Query 2: Receipts by store
        console.log('2. GET RECEIPTS BY STORE:');
        console.log('Query: SELECT brand_name, COUNT(*), SUM(total_price_field) FROM custom_receipts GROUP BY brand_name;');
        
        const storeStats = await this.pool.query(`
            SELECT 
                brand_name,
                COUNT(*) as receipt_count,
                SUM(total_price_field) as total_spent,
                AVG(total_price_field) as avg_receipt
            FROM custom_receipts
            GROUP BY brand_name
        `);

        storeStats.rows.forEach(stat => {
            console.log(`   ${stat.brand_name}: ${stat.receipt_count} receipts, $${Number(stat.total_spent).toFixed(2)} total, $${Number(stat.avg_receipt).toFixed(2)} avg`);
        });
        console.log();

        // Query 3: Items by category
        console.log('3. GET ITEMS BY CATEGORY:');
        console.log('Query: SELECT category, COUNT(*), AVG(item_price) FROM custom_receipt_items GROUP BY category;');
        
        const categoryStats = await this.pool.query(`
            SELECT 
                category,
                COUNT(*) as item_count,
                AVG(item_price) as avg_price,
                MAX(item_price) as max_price
            FROM custom_receipt_items
            GROUP BY category
            ORDER BY item_count DESC
        `);

        categoryStats.rows.forEach(stat => {
            console.log(`   ${stat.category}: ${stat.item_count} items, $${Number(stat.avg_price).toFixed(2)} avg, $${Number(stat.max_price).toFixed(2)} max`);
        });
        console.log();

        // Query 4: Join receipts and items
        console.log('4. JOIN RECEIPTS AND ITEMS:');
        console.log('Query: SELECT r.brand_name, i.item_name, i.item_price FROM custom_receipts r JOIN custom_receipt_items i ON r.id = i.receipt_id;');
        
        const joinExample = await this.pool.query(`
            SELECT 
                r.brand_name,
                r.date_field,
                i.item_name,
                i.item_type_code,
                i.item_price
            FROM custom_receipts r
            JOIN custom_receipt_items i ON r.id = i.receipt_id
            ORDER BY i.item_price DESC
            LIMIT 5
        `);

        joinExample.rows.forEach(row => {
            console.log(`   ${row.brand_name} (${row.date_field}): ${row.item_name} [${row.item_type_code}] - $${row.item_price}`);
        });
        console.log();
    }

    async showDataExportMethods() {
        console.log('💾 DATA EXPORT METHODS');
        console.log('======================\n');

        console.log('1. EXPORT TO JSON:');
        const jsonExport = await this.pool.query(`
            SELECT json_build_object(
                'receipts', json_agg(
                    json_build_object(
                        'brand', brand_name,
                        'date', date_field,
                        'total', total_price_field,
                        'address', street_number || ' ' || street_name,
                        'location', city || ', ' || state
                    )
                )
            ) as export_data
            FROM custom_receipts
        `);

        console.log('Query: SELECT json_build_object(...) FROM custom_receipts;');
        console.log('Result:', JSON.stringify(jsonExport.rows[0].export_data, null, 2));
        console.log();

        console.log('2. EXPORT TO CSV FORMAT:');
        const csvExport = await this.pool.query(`
            SELECT 
                brand_name,
                date_field,
                total_price_field,
                city,
                state
            FROM custom_receipts
            ORDER BY date_field DESC
        `);

        console.log('Query: SELECT brand_name, date_field, total_price_field FROM custom_receipts;');
        console.log('CSV Headers: brand_name,date_field,total_price_field,city,state');
        csvExport.rows.forEach(row => {
            console.log(`${row.brand_name},${row.date_field},${row.total_price_field},${row.city},${row.state}`);
        });
        console.log();

        console.log('3. SUMMARY STATISTICS:');
        const summaryStats = await this.pool.query(`
            SELECT 
                COUNT(DISTINCT r.id) as total_receipts,
                COUNT(i.id) as total_items,
                SUM(r.total_price_field) as total_spent,
                AVG(r.total_price_field) as avg_receipt_value,
                COUNT(DISTINCT r.brand_name) as unique_stores
            FROM custom_receipts r
            LEFT JOIN custom_receipt_items i ON r.id = i.receipt_id
        `);

        const stats = summaryStats.rows[0];
        console.log(`   Total Receipts: ${stats.total_receipts}`);
        console.log(`   Total Items: ${stats.total_items}`);
        console.log(`   Total Spent: $${Number(stats.total_spent).toFixed(2)}`);
        console.log(`   Average Receipt: $${Number(stats.avg_receipt_value).toFixed(2)}`);
        console.log(`   Unique Stores: ${stats.unique_stores}`);
        console.log();
    }

    // Show connection information
    showConnectionInfo() {
        console.log('🔌 DATABASE CONNECTION INFO');
        console.log('===========================\n');
        
        console.log('Environment Variables:');
        console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'Set ✓' : 'Not set ✗'}`);
        console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
        console.log();

        console.log('Connection Methods:');
        console.log('1. Node.js (current method):');
        console.log('   const { Pool } = require("pg");');
        console.log('   const pool = new Pool({ connectionString: process.env.DATABASE_URL });');
        console.log();

        console.log('2. Direct psql command:');
        console.log('   psql "$DATABASE_URL"');
        console.log();

        console.log('3. Popular GUI tools:');
        console.log('   - pgAdmin: https://www.pgadmin.org/');
        console.log('   - DBeaver: https://dbeaver.io/');
        console.log('   - TablePlus: https://tableplus.com/');
        console.log();
    }

    async close() {
        await this.pool.end();
    }
}

async function runAccessGuide() {
    const guide = new DatabaseAccessGuide();
    
    try {
        guide.showConnectionInfo();
        await guide.showAllAccessMethods();
        
        console.log('🎯 QUICK ACCESS COMMANDS');
        console.log('========================');
        console.log('• View all receipts: SELECT * FROM custom_receipts;');
        console.log('• View all items: SELECT * FROM custom_receipt_items;');
        console.log('• Count items by type: SELECT item_type_code, COUNT(*) FROM custom_receipt_items GROUP BY item_type_code;');
        console.log('• Total spending: SELECT SUM(total_price_field) FROM custom_receipts;');
        console.log('• Items for specific receipt: SELECT * FROM custom_receipt_items WHERE receipt_id = \'YOUR_RECEIPT_ID\';');
        
    } catch (error) {
        console.error('❌ Access guide error:', error.message);
    } finally {
        await guide.close();
    }
}

if (require.main === module) {
    runAccessGuide().catch(console.error);
}

module.exports = DatabaseAccessGuide;