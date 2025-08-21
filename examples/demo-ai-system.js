// Demonstration of AI Data Parsing System
// Shows how to access and use the clean, AI-enhanced data

const { Pool } = require('pg');
require('dotenv').config();

class AISystemDemo {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }

    async runDemo() {
        console.log('🤖 AI-Enhanced Data System Demo');
        console.log('================================\n');

        try {
            // Show the difference between raw and AI-enhanced data
            await this.compareRawVsEnhanced();

            // Demonstrate intelligent querying
            await this.demonstrateIntelligentQueries();

            // Show product intelligence
            await this.showProductIntelligence();

            // Display shopping insights
            await this.showShoppingInsights();

            // Show data export capabilities
            await this.demonstrateDataExport();

        } catch (error) {
            console.error('Demo failed:', error.message);
        }
    }

    async compareRawVsEnhanced() {
        console.log('📊 RAW vs AI-ENHANCED DATA COMPARISON');
        console.log('=====================================\n');

        // Get raw data sample
        const rawQuery = `
            SELECT 
                r.id,
                s.name as store_name,
                r.receipt_date,
                r.total_amount,
                COUNT(ri.id) as raw_items
            FROM receipts r
            LEFT JOIN stores s ON r.store_id = s.id
            LEFT JOIN receipt_items ri ON r.id = ri.receipt_id
            WHERE r.status = 'completed'
            GROUP BY r.id, s.id
            LIMIT 3
        `;

        const rawData = await this.pool.query(rawQuery);

        console.log('🗄️  RAW DATA (from TabScanner):');
        rawData.rows.forEach(row => {
            console.log(`   ${row.id}: ${row.store_name} - $${row.total_amount} (${row.raw_items} items)`);
        });

        // Get enhanced data sample
        const enhancedQuery = `
            SELECT 
                apr.id,
                es.normalized_name,
                es.store_type,
                es.price_range,
                apr.transaction_date,
                apr.grand_total_cents / 100.0 as total,
                apr.ai_confidence_score,
                si.health_score,
                si.shopping_category,
                array_length(si.dietary_flags, 1) as dietary_flag_count,
                COUNT(api.id) as enhanced_items
            FROM ai_parsed_receipts apr
            JOIN enhanced_stores es ON apr.enhanced_store_id = es.id
            LEFT JOIN shopping_insights si ON apr.id = si.ai_receipt_id
            LEFT JOIN ai_parsed_items api ON apr.id = api.ai_receipt_id
            GROUP BY apr.id, es.id, si.id
            LIMIT 3
        `;

        const enhancedData = await this.pool.query(enhancedQuery);

        console.log('\n🤖 AI-ENHANCED DATA:');
        if (enhancedData.rows.length === 0) {
            console.log('   ⚠️  No AI-enhanced data found. Run ai-data-processor.js first.\n');
            return;
        }

        enhancedData.rows.forEach(row => {
            console.log(`   ${row.id}: ${row.normalized_name} (${row.store_type})`);
            console.log(`      Total: $${row.total} | Confidence: ${row.ai_confidence_score}%`);
            console.log(`      Category: ${row.shopping_category} | Health: ${row.health_score}/10`);
            console.log(`      Price Range: ${row.price_range} | Items: ${row.enhanced_items}`);
            console.log();
        });
    }

    async demonstrateIntelligentQueries() {
        console.log('🔍 INTELLIGENT QUERYING EXAMPLES');
        console.log('=================================\n');

        const queries = [
            {
                name: 'Healthy Shopping Trips',
                query: `
                    SELECT 
                        es.normalized_name as store,
                        apr.transaction_date,
                        si.health_score,
                        si.dietary_flags,
                        apr.grand_total_cents / 100.0 as total
                    FROM ai_parsed_receipts apr
                    JOIN enhanced_stores es ON apr.enhanced_store_id = es.id
                    JOIN shopping_insights si ON apr.id = si.ai_receipt_id
                    WHERE si.health_score >= 6
                    ORDER BY si.health_score DESC
                    LIMIT 5
                `
            },
            {
                name: 'Organic Product Purchases',
                query: `
                    SELECT 
                        api.normalized_name,
                        COUNT(*) as purchase_count,
                        AVG(api.line_total_cents / 100.0) as avg_price,
                        string_agg(DISTINCT es.normalized_name, ', ') as stores
                    FROM ai_parsed_items api
                    JOIN ai_parsed_receipts apr ON api.ai_receipt_id = apr.id
                    JOIN enhanced_stores es ON apr.enhanced_store_id = es.id
                    WHERE 'organic' = ANY(api.dietary_tags)
                    GROUP BY api.normalized_name
                    ORDER BY purchase_count DESC
                    LIMIT 10
                `
            },
            {
                name: 'Spending by Store Type',
                query: `
                    SELECT 
                        es.store_type,
                        COUNT(*) as visits,
                        AVG(apr.grand_total_cents / 100.0) as avg_spend,
                        SUM(apr.grand_total_cents / 100.0) as total_spend
                    FROM ai_parsed_receipts apr
                    JOIN enhanced_stores es ON apr.enhanced_store_id = es.id
                    GROUP BY es.store_type
                    ORDER BY total_spend DESC
                `
            }
        ];

        for (const queryExample of queries) {
            console.log(`📈 ${queryExample.name}:`);
            try {
                const result = await this.pool.query(queryExample.query);
                if (result.rows.length === 0) {
                    console.log('   No data found (process more receipts for insights)\n');
                } else {
                    result.rows.forEach(row => {
                        console.log('  ', JSON.stringify(row, null, 2));
                    });
                    console.log();
                }
            } catch (error) {
                console.log(`   Query failed: ${error.message}\n`);
            }
        }
    }

    async showProductIntelligence() {
        console.log('🧠 PRODUCT INTELLIGENCE CATALOG');
        console.log('===============================\n');

        const productQuery = `
            SELECT 
                pc.normalized_name,
                pc.category,
                pc.subcategory,
                pc.brand,
                pc.dietary_tags,
                pc.nutrition_category,
                pc.purchase_frequency,
                pc.avg_price_cents / 100.0 as avg_price,
                (SELECT COUNT(*) FROM ai_parsed_items WHERE product_catalog_id = pc.id) as total_purchases
            FROM product_catalog pc
            WHERE pc.purchase_frequency > 1
            ORDER BY pc.purchase_frequency DESC, pc.avg_price_cents DESC
            LIMIT 15
        `;

        const products = await this.pool.query(productQuery);

        if (products.rows.length === 0) {
            console.log('⚠️  Product catalog is being built. Process more receipts to see intelligence.\n');
            return;
        }

        console.log('🛒 Top Frequently Purchased Products:');
        products.rows.forEach((product, index) => {
            console.log(`${index + 1}. ${product.normalized_name}`);
            console.log(`   Category: ${product.category}${product.subcategory ? ` > ${product.subcategory}` : ''}`);
            console.log(`   Brand: ${product.brand || 'Generic'}`);
            console.log(`   Frequency: ${product.purchase_frequency} purchases`);
            console.log(`   Avg Price: $${product.avg_price}`);
            console.log(`   Health: ${product.nutrition_category}`);
            if (product.dietary_tags && product.dietary_tags.length > 0) {
                console.log(`   Tags: ${product.dietary_tags.join(', ')}`);
            }
            console.log();
        });

        // Category breakdown
        const categoryQuery = `
            SELECT 
                category,
                COUNT(*) as product_count,
                AVG(avg_price_cents / 100.0) as avg_price,
                SUM(purchase_frequency) as total_purchases
            FROM product_catalog
            GROUP BY category
            ORDER BY total_purchases DESC
        `;

        const categories = await this.pool.query(categoryQuery);
        console.log('📊 Category Breakdown:');
        categories.rows.forEach(cat => {
            console.log(`   ${cat.category}: ${cat.product_count} products, $${Number(cat.avg_price).toFixed(2)} avg, ${cat.total_purchases} purchases`);
        });
        console.log();
    }

    async showShoppingInsights() {
        console.log('💡 AI-GENERATED SHOPPING INSIGHTS');
        console.log('=================================\n');

        const insightsQuery = `
            SELECT 
                es.normalized_name as store,
                apr.transaction_date,
                si.shopping_category,
                si.meal_type,
                si.cuisine_type,
                si.health_score,
                si.dietary_flags,
                si.budget_category,
                si.estimated_people,
                apr.grand_total_cents / 100.0 as total
            FROM shopping_insights si
            JOIN ai_parsed_receipts apr ON si.ai_receipt_id = apr.id
            JOIN enhanced_stores es ON apr.enhanced_store_id = es.id
            ORDER BY apr.transaction_date DESC
            LIMIT 10
        `;

        const insights = await this.pool.query(insightsQuery);

        if (insights.rows.length === 0) {
            console.log('⚠️  No shopping insights available. Process receipts through AI first.\n');
            return;
        }

        insights.rows.forEach((insight, index) => {
            console.log(`${index + 1}. ${insight.store} - ${insight.transaction_date}`);
            console.log(`   💰 Total: $${insight.total} (${insight.budget_category})`);
            console.log(`   🛒 Type: ${insight.shopping_category} | Meal: ${insight.meal_type}`);
            console.log(`   🍽️  Cuisine: ${insight.cuisine_type} | People: ${insight.estimated_people}`);
            console.log(`   💚 Health Score: ${insight.health_score}/10`);
            if (insight.dietary_flags && insight.dietary_flags.length > 0) {
                console.log(`   🏷️  Dietary: ${insight.dietary_flags.join(', ')}`);
            }
            console.log();
        });

        // Trend analysis
        const trendQuery = `
            SELECT 
                shopping_category,
                COUNT(*) as frequency,
                AVG(health_score) as avg_health,
                AVG(grand_total_cents / 100.0) as avg_spending
            FROM shopping_insights si
            JOIN ai_parsed_receipts apr ON si.ai_receipt_id = apr.id
            GROUP BY shopping_category
            ORDER BY frequency DESC
        `;

        const trends = await this.pool.query(trendQuery);
        console.log('📈 Shopping Pattern Trends:');
        trends.rows.forEach(trend => {
            console.log(`   ${trend.shopping_category}: ${trend.frequency} trips, $${Number(trend.avg_spending).toFixed(2)} avg, ${Number(trend.avg_health).toFixed(1)}/10 health`);
        });
        console.log();
    }

    async demonstrateDataExport() {
        console.log('💾 DATA EXPORT CAPABILITIES');
        console.log('===========================\n');

        // Export comprehensive receipt data
        const exportQuery = `
            SELECT 
                apr.id as receipt_id,
                es.normalized_name as store_name,
                es.chain,
                es.store_type,
                apr.transaction_date,
                apr.grand_total_cents / 100.0 as total_amount,
                apr.ai_confidence_score,
                
                -- Shopping insights
                si.shopping_category,
                si.health_score,
                si.dietary_flags,
                si.estimated_people,
                
                -- Items summary
                COUNT(api.id) as item_count,
                json_agg(
                    json_build_object(
                        'name', api.normalized_name,
                        'category', api.category,
                        'price', api.line_total_cents / 100.0,
                        'quantity', api.quantity,
                        'dietary_tags', api.dietary_tags,
                        'nutrition', api.nutrition_category
                    ) ORDER BY api.line_total_cents DESC
                ) as items
                
            FROM ai_parsed_receipts apr
            JOIN enhanced_stores es ON apr.enhanced_store_id = es.id
            LEFT JOIN shopping_insights si ON apr.id = si.ai_receipt_id
            LEFT JOIN ai_parsed_items api ON apr.id = api.ai_receipt_id
            GROUP BY apr.id, es.id, si.id
            ORDER BY apr.transaction_date DESC
            LIMIT 3
        `;

        const exportData = await this.pool.query(exportQuery);

        console.log('📋 Sample Enhanced Data Export (JSON format):');
        console.log('============================================');

        const exportObject = {
            export_metadata: {
                exported_at: new Date().toISOString(),
                format: 'ai_enhanced_receipt_data',
                version: '1.0'
            },
            receipts: exportData.rows
        };

        console.log(JSON.stringify(exportObject, null, 2));

        // Save to file
        const fs = require('fs');
        const filename = `ai_enhanced_receipts_${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(exportObject, null, 2));
        console.log(`\n✅ Data exported to: ${filename}\n`);
    }

    async getSystemStats() {
        console.log('📊 AI SYSTEM STATISTICS');
        console.log('=======================\n');

        const stats = {
            enhanced_receipts: await this.pool.query('SELECT COUNT(*) FROM ai_parsed_receipts'),
            enhanced_stores: await this.pool.query('SELECT COUNT(*) FROM enhanced_stores'),
            product_catalog_size: await this.pool.query('SELECT COUNT(*) FROM product_catalog'),
            total_items_processed: await this.pool.query('SELECT COUNT(*) FROM ai_parsed_items'),
            avg_confidence: await this.pool.query('SELECT AVG(ai_confidence_score) FROM ai_parsed_receipts'),
            categories_discovered: await this.pool.query('SELECT COUNT(DISTINCT category) FROM product_catalog'),
            dietary_tags_found: await this.pool.query('SELECT COUNT(*) FROM (SELECT DISTINCT unnest(dietary_tags) FROM product_catalog WHERE dietary_tags IS NOT NULL) AS distinct_tags')
        };

        console.log(`Enhanced Receipts: ${stats.enhanced_receipts.rows[0].count}`);
        console.log(`Enhanced Stores: ${stats.enhanced_stores.rows[0].count}`);
        console.log(`Product Catalog: ${stats.product_catalog_size.rows[0].count} products`);
        console.log(`Items Processed: ${stats.total_items_processed.rows[0].count}`);
        console.log(`Average AI Confidence: ${Number(stats.avg_confidence.rows[0].avg).toFixed(1)}%`);
        console.log(`Categories Discovered: ${stats.categories_discovered.rows[0].count}`);
        console.log(`Dietary Tags Found: ${stats.dietary_tags_found.rows[0].count}`);
        console.log();
    }

    async close() {
        await this.pool.end();
    }
}

async function main() {
    const demo = new AISystemDemo();
    
    try {
        await demo.getSystemStats();
        await demo.runDemo();
        console.log('✅ AI System Demo Complete!\n');
        
        console.log('🎯 NEXT STEPS:');
        console.log('1. Process more receipts through: node ai-data-processor.js');
        console.log('2. Add OpenAI API key for enhanced AI features');
        console.log('3. Query enhanced data using the new table structure');
        console.log('4. Build analytics dashboards on the clean data');
        
    } catch (error) {
        console.error('Demo error:', error.message);
    } finally {
        await demo.close();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = AISystemDemo;