// Database Queries for OCR Data Access
const { Pool } = require('pg');
require('dotenv').config();

class DatabaseQueries {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }

    async getAllReceiptsWithItems() {
        console.log('📊 Querying all receipts with items...\n');
        
        const query = `
            SELECT 
                r.id as receipt_id,
                r.user_id,
                r.receipt_date,
                r.receipt_time,
                r.total_amount,
                r.tax_amount,
                r.subtotal_amount,
                r.status,
                r.created_at,
                r.processed_at,
                r.ocr_raw_text,
                r.llm_processed_data,
                s.name as store_name,
                s.chain as store_chain,
                s.address as store_address,
                COUNT(ri.id) as item_count,
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'item_id', ri.id,
                        'item_name', ri.item_name,
                        'quantity', ri.quantity,
                        'unit_price', ri.unit_price,
                        'line_total', ri.line_total,
                        'confidence_score', ri.confidence_score,
                        'raw_text', ri.raw_text
                    ) ORDER BY ri.created_at
                ) as items
            FROM receipts r
            LEFT JOIN stores s ON r.store_id = s.id
            LEFT JOIN receipt_items ri ON r.id = ri.receipt_id
            WHERE r.status = 'completed'
            GROUP BY r.id, s.id
            ORDER BY r.created_at DESC
        `;

        try {
            const result = await this.pool.query(query);
            console.log(`Found ${result.rows.length} completed receipts\n`);
            
            result.rows.forEach((receipt, index) => {
                console.log(`${index + 1}. Receipt ${receipt.receipt_id}`);
                console.log(`   Store: ${receipt.store_name || 'Unknown'} (${receipt.store_chain || 'N/A'})`);
                console.log(`   Date: ${receipt.receipt_date || 'Unknown'}`);
                console.log(`   Total: $${receipt.total_amount || '0.00'}`);
                console.log(`   Items: ${receipt.item_count} items`);
                console.log(`   Processed: ${receipt.processed_at || 'Not processed'}`);
                console.log('');
            });

            return result.rows;
        } catch (error) {
            console.error('❌ Database query failed:', error.message);
            return [];
        }
    }

    async getReceiptWithFullJSON(receiptId) {
        console.log(`🔍 Getting complete JSON data for receipt: ${receiptId}\n`);
        
        const query = `
            SELECT 
                r.*,
                s.name as store_name,
                s.chain as store_chain,
                s.address as store_address,
                s.phone as store_phone,
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'item_id', ri.id,
                        'item_name', ri.item_name,
                        'standardized_name', ri.standardized_name,
                        'brand', ri.brand,
                        'size_description', ri.size_description,
                        'quantity', ri.quantity,
                        'unit_price', ri.unit_price,
                        'line_total', ri.line_total,
                        'discount_amount', ri.discount_amount,
                        'upc_code', ri.upc_code,
                        'department', ri.department,
                        'is_taxable', ri.is_taxable,
                        'confidence_score', ri.confidence_score,
                        'raw_text', ri.raw_text,
                        'created_at', ri.created_at
                    ) ORDER BY ri.created_at
                ) as items_detail
            FROM receipts r
            LEFT JOIN stores s ON r.store_id = s.id
            LEFT JOIN receipt_items ri ON r.id = ri.receipt_id
            WHERE r.id = $1
            GROUP BY r.id, s.id
        `;

        try {
            const result = await this.pool.query(query, [receiptId]);
            
            if (result.rows.length === 0) {
                console.log('❌ Receipt not found');
                return null;
            }

            const receipt = result.rows[0];
            console.log('📋 Receipt Overview:');
            console.log('===================');
            console.log('ID:', receipt.id);
            console.log('User ID:', receipt.user_id);
            console.log('Store:', receipt.store_name);
            console.log('Date/Time:', receipt.receipt_date, receipt.receipt_time);
            console.log('Total:', `$${receipt.total_amount}`);
            console.log('Status:', receipt.status);
            console.log('Items Count:', receipt.items_detail.filter(item => item.item_id).length);
            
            console.log('\n🤖 Complete JSON Data Structure:');
            console.log('=================================');
            console.log('1. RAW OCR TEXT LENGTH:', receipt.ocr_raw_text?.length || 0, 'characters');
            console.log('2. PROCESSED DATA SIZE:', JSON.stringify(receipt.llm_processed_data).length, 'characters');
            console.log('3. TABSCANNER FIELDS AVAILABLE:', Object.keys(receipt.llm_processed_data?.rawData?.result || {}));

            return receipt;
        } catch (error) {
            console.error('❌ Database query failed:', error.message);
            return null;
        }
    }

    async exportAllDataToJSON() {
        console.log('💾 Exporting all receipt data to JSON files...\n');
        
        const receipts = await this.getAllReceiptsWithItems();
        const fs = require('fs');
        
        receipts.forEach((receipt, index) => {
            const filename = `receipt_${receipt.receipt_id}_export.json`;
            const exportData = {
                receipt_info: {
                    id: receipt.receipt_id,
                    user_id: receipt.user_id,
                    store_name: receipt.store_name,
                    store_chain: receipt.store_chain,
                    receipt_date: receipt.receipt_date,
                    receipt_time: receipt.receipt_time,
                    total_amount: receipt.total_amount,
                    tax_amount: receipt.tax_amount,
                    subtotal_amount: receipt.subtotal_amount,
                    status: receipt.status,
                    created_at: receipt.created_at,
                    processed_at: receipt.processed_at
                },
                items: receipt.items.filter(item => item.item_id), // Remove null items
                raw_ocr_text: receipt.ocr_raw_text,
                tabscanner_full_response: receipt.llm_processed_data,
                export_metadata: {
                    exported_at: new Date().toISOString(),
                    export_type: 'complete_receipt_data',
                    item_count: receipt.item_count
                }
            };
            
            fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
            console.log(`✅ Exported: ${filename} (${receipt.item_count} items)`);
        });

        console.log(`\n🎉 Exported ${receipts.length} receipt files`);
        return receipts.length;
    }

    async getSpendingAnalytics() {
        console.log('📊 Generating spending analytics from database...\n');
        
        const queries = {
            totalSpending: `
                SELECT 
                    COUNT(*) as receipt_count,
                    SUM(total_amount) as total_spent,
                    AVG(total_amount) as avg_receipt_amount,
                    MIN(receipt_date) as first_receipt,
                    MAX(receipt_date) as last_receipt
                FROM receipts 
                WHERE status = 'completed' AND total_amount > 0
            `,
            
            spendingByStore: `
                SELECT 
                    s.name as store_name,
                    s.chain as store_chain,
                    COUNT(r.id) as visit_count,
                    SUM(r.total_amount) as total_spent,
                    AVG(r.total_amount) as avg_spending
                FROM receipts r
                JOIN stores s ON r.store_id = s.id
                WHERE r.status = 'completed' AND r.total_amount > 0
                GROUP BY s.id, s.name, s.chain
                ORDER BY total_spent DESC
            `,
            
            topItems: `
                SELECT 
                    ri.item_name,
                    COUNT(*) as purchase_frequency,
                    SUM(ri.line_total) as total_spent_on_item,
                    AVG(ri.line_total) as avg_item_cost,
                    SUM(ri.quantity) as total_quantity
                FROM receipt_items ri
                JOIN receipts r ON ri.receipt_id = r.id
                WHERE r.status = 'completed'
                GROUP BY ri.item_name
                HAVING COUNT(*) > 1
                ORDER BY total_spent_on_item DESC
                LIMIT 20
            `,
            
            monthlyTrends: `
                SELECT 
                    DATE_TRUNC('month', receipt_date) as month,
                    COUNT(*) as receipt_count,
                    SUM(total_amount) as monthly_spending,
                    AVG(total_amount) as avg_receipt_value
                FROM receipts
                WHERE status = 'completed' AND total_amount > 0
                GROUP BY DATE_TRUNC('month', receipt_date)
                ORDER BY month DESC
            `
        };

        try {
            const results = {};
            
            for (const [queryName, sql] of Object.entries(queries)) {
                const result = await this.pool.query(sql);
                results[queryName] = result.rows;
                console.log(`✅ ${queryName}: ${result.rows.length} results`);
            }

            // Display results
            console.log('\n📊 SPENDING SUMMARY:');
            if (results.totalSpending[0]) {
                const summary = results.totalSpending[0];
                console.log(`   Total Receipts: ${summary.receipt_count}`);
                console.log(`   Total Spent: $${Number(summary.total_spent).toFixed(2)}`);
                console.log(`   Average Receipt: $${Number(summary.avg_receipt_amount).toFixed(2)}`);
                console.log(`   Date Range: ${summary.first_receipt} to ${summary.last_receipt}`);
            }

            console.log('\n🏪 TOP STORES:');
            results.spendingByStore.forEach((store, index) => {
                console.log(`   ${index + 1}. ${store.store_name} - $${Number(store.total_spent).toFixed(2)} (${store.visit_count} visits)`);
            });

            console.log('\n🛒 MOST PURCHASED ITEMS:');
            results.topItems.slice(0, 10).forEach((item, index) => {
                console.log(`   ${index + 1}. ${item.item_name} - $${Number(item.total_spent_on_item).toFixed(2)} (bought ${item.purchase_frequency}x)`);
            });

            return results;
        } catch (error) {
            console.error('❌ Analytics query failed:', error.message);
            return {};
        }
    }

    async close() {
        await this.pool.end();
    }
}

async function main() {
    console.log('🗄️  GroceryPal Database OCR Data Access');
    console.log('========================================\n');

    const db = new DatabaseQueries();

    try {
        // 1. Show all receipts with items
        await db.getAllReceiptsWithItems();

        // 2. Get detailed data for latest receipt
        const receipts = await db.pool.query('SELECT id FROM receipts WHERE status = \'completed\' ORDER BY created_at DESC LIMIT 1');
        if (receipts.rows.length > 0) {
            await db.getReceiptWithFullJSON(receipts.rows[0].id);
        }

        // 3. Export all data
        await db.exportAllDataToJSON();

        // 4. Generate analytics
        await db.getSpendingAnalytics();

        console.log('\n✅ Database analysis complete!');
        
    } catch (error) {
        console.error('❌ Database operations failed:', error);
    } finally {
        await db.close();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = DatabaseQueries;