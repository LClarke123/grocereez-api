// AI Data Processing Orchestrator
// Transforms raw TabScanner JSON into clean, searchable, AI-enhanced database records

const { Pool } = require('pg');
const AIDataParser = require('./services/aiDataParser');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class AIDataProcessor {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        this.aiParser = new AIDataParser();
        console.log('🤖 AI Data Processor initialized');
    }

    /**
     * Process all existing raw receipt data through AI enhancement
     */
    async processAllRawReceipts() {
        console.log('🚀 AI Data Processor: Processing all raw receipts...\n');

        try {
            // First, create enhanced tables if they don't exist
            await this.setupEnhancedDatabase();

            // Get all completed receipts with raw data
            const rawReceipts = await this.getRawReceiptData();
            console.log(`📋 Found ${rawReceipts.length} completed receipts to process\n`);

            let processedCount = 0;
            let errorCount = 0;

            for (const rawReceipt of rawReceipts) {
                try {
                    console.log(`Processing receipt ${rawReceipt.id} (${processedCount + 1}/${rawReceipts.length})`);
                    
                    // Check if already processed
                    const existing = await this.checkIfAlreadyProcessed(rawReceipt.id);
                    if (existing) {
                        console.log('   ✓ Already processed, skipping...\n');
                        continue;
                    }

                    // AI-enhance the raw data
                    const enhancedData = await this.aiParser.parseReceiptData(rawReceipt);

                    // Store enhanced data in new tables
                    await this.storeEnhancedData(enhancedData, rawReceipt);
                    
                    processedCount++;
                    console.log(`   ✅ Successfully processed receipt ${rawReceipt.id}\n`);

                } catch (error) {
                    console.error(`   ❌ Error processing receipt ${rawReceipt.id}:`, error.message, '\n');
                    errorCount++;
                }
            }

            console.log('🎉 AI Data Processing Complete!');
            console.log(`   Processed: ${processedCount} receipts`);
            console.log(`   Errors: ${errorCount} receipts`);
            console.log(`   Total Enhanced Records Created: ${processedCount}\n`);

            // Generate summary statistics
            await this.generateProcessingSummary();

            return { processedCount, errorCount };

        } catch (error) {
            console.error('❌ AI Data Processing failed:', error.message);
            throw error;
        }
    }

    /**
     * Process a single receipt by ID
     */
    async processSingleReceipt(receiptId) {
        console.log(`🎯 Processing single receipt: ${receiptId}`);

        const rawReceipt = await this.getSingleRawReceipt(receiptId);
        if (!rawReceipt) {
            throw new Error(`Receipt ${receiptId} not found or not completed`);
        }

        const enhancedData = await this.aiParser.parseReceiptData(rawReceipt);
        await this.storeEnhancedData(enhancedData, rawReceipt);

        console.log(`✅ Successfully processed receipt ${receiptId}`);
        return enhancedData;
    }

    /**
     * Setup enhanced database tables
     */
    async setupEnhancedDatabase() {
        console.log('📊 Setting up enhanced database tables...');

        try {
            const schemaFile = fs.readFileSync('enhanced-schema.sql', 'utf8');
            await this.pool.query(schemaFile);
            console.log('✅ Enhanced database schema ready\n');
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log('✅ Enhanced database tables already exist\n');
            } else {
                throw error;
            }
        }
    }

    /**
     * Get all raw receipt data for processing
     */
    async getRawReceiptData() {
        const query = `
            SELECT 
                r.id,
                r.user_id,
                r.receipt_date,
                r.receipt_time,
                r.total_amount,
                r.tax_amount,
                r.subtotal_amount,
                r.ocr_raw_text,
                r.llm_processed_data,
                r.status,
                r.created_at,
                r.processed_at,
                s.name as store_name,
                s.chain as store_chain,
                s.address as store_address,
                s.phone as store_phone,
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
                ) FILTER (WHERE ri.id IS NOT NULL) as items
            FROM receipts r
            LEFT JOIN stores s ON r.store_id = s.id
            LEFT JOIN receipt_items ri ON r.id = ri.receipt_id
            WHERE r.status = 'completed' 
              AND r.llm_processed_data IS NOT NULL
            GROUP BY r.id, s.id
            ORDER BY r.created_at DESC
        `;

        const result = await this.pool.query(query);
        return result.rows.map(row => ({
            receipt_info: {
                id: row.id,
                user_id: row.user_id,
                store_name: row.store_name,
                store_chain: row.store_chain,
                store_address: row.store_address,
                store_phone: row.store_phone,
                receipt_date: row.receipt_date,
                receipt_time: row.receipt_time,
                total_amount: row.total_amount,
                tax_amount: row.tax_amount,
                subtotal_amount: row.subtotal_amount,
                status: row.status,
                created_at: row.created_at,
                processed_at: row.processed_at
            },
            items: row.items || [],
            raw_ocr_text: row.ocr_raw_text,
            tabscanner_full_response: row.llm_processed_data
        }));
    }

    /**
     * Get single receipt data by ID
     */
    async getSingleRawReceipt(receiptId) {
        const rawReceipts = await this.getRawReceiptData();
        return rawReceipts.find(receipt => receipt.receipt_info.id === receiptId);
    }

    /**
     * Check if receipt has already been AI-processed
     */
    async checkIfAlreadyProcessed(receiptId) {
        const result = await this.pool.query(
            'SELECT id FROM ai_parsed_receipts WHERE original_receipt_id = $1',
            [receiptId]
        );
        return result.rows.length > 0;
    }

    /**
     * Store AI-enhanced data in new database tables
     */
    async storeEnhancedData(enhancedData, rawReceipt) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');

            // 1. Create or get enhanced store
            const enhancedStoreId = await this.createEnhancedStore(client, enhancedData.store, rawReceipt);

            // 2. Create AI-parsed receipt
            const aiReceiptId = await this.createAIParsedReceipt(client, enhancedData, enhancedStoreId, rawReceipt);

            // 3. Create shopping insights
            await this.createShoppingInsights(client, enhancedData.insights, aiReceiptId);

            // 4. Process items and build product catalog
            await this.processEnhancedItems(client, enhancedData.items, aiReceiptId, rawReceipt);

            await client.query('COMMIT');
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Create or update enhanced store record
     */
    async createEnhancedStore(client, storeData, rawReceipt) {
        // Try to find existing enhanced store
        let result = await client.query(
            'SELECT id FROM enhanced_stores WHERE normalized_name ILIKE $1 AND city = $2',
            [storeData.normalized_name || storeData.name, storeData.location.city]
        );

        if (result.rows.length > 0) {
            return result.rows[0].id;
        }

        // Create new enhanced store
        result = await client.query(`
            INSERT INTO enhanced_stores (
                normalized_name, chain, store_type, location_type, price_range,
                address, city, state, zip_code, phone, website, store_id,
                known_for, specialties
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id
        `, [
            storeData.normalized_name || storeData.name,
            storeData.chain,
            storeData.store_type,
            storeData.location_type,
            storeData.price_range,
            storeData.location.address,
            storeData.location.city,
            storeData.location.state,
            storeData.location.zip,
            storeData.contact.phone,
            storeData.contact.website,
            storeData.store_id,
            storeData.known_for || [],
            storeData.specialties || []
        ]);

        return result.rows[0].id;
    }

    /**
     * Create AI-parsed receipt record
     */
    async createAIParsedReceipt(client, enhancedData, enhancedStoreId, rawReceipt) {
        const result = await client.query(`
            INSERT INTO ai_parsed_receipts (
                original_receipt_id, user_id, enhanced_store_id,
                transaction_date, transaction_time, transaction_datetime,
                payment_method, card_type, card_last4, transaction_id,
                subtotal_cents, tax_total_cents, fees_cents, discounts_cents, 
                tips_cents, grand_total_cents, currency,
                processing_status, ai_confidence_score, data_completeness_score,
                validation_errors, processing_time_ms
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
            RETURNING id
        `, [
            rawReceipt.receipt_info.id,
            rawReceipt.receipt_info.user_id,
            enhancedStoreId,
            enhancedData.transaction.date,
            enhancedData.transaction.time,
            enhancedData.transaction.datetime_iso,
            enhancedData.transaction.payment_method,
            enhancedData.transaction.card_type,
            enhancedData.transaction.card_last4,
            enhancedData.transaction.transaction_id,
            Math.round(enhancedData.financial.subtotal * 100),
            Math.round(enhancedData.financial.tax_total * 100),
            Math.round(enhancedData.financial.fees * 100),
            Math.round(enhancedData.financial.discounts * 100),
            Math.round(enhancedData.financial.tips * 100),
            Math.round(enhancedData.financial.grand_total * 100),
            enhancedData.financial.currency,
            enhancedData.receipt.processing_status,
            enhancedData.quality.ai_confidence,
            enhancedData.quality.data_completeness,
            enhancedData.quality.validation_errors,
            enhancedData.quality.processing_time
        ]);

        return result.rows[0].id;
    }

    /**
     * Create shopping insights record
     */
    async createShoppingInsights(client, insights, aiReceiptId) {
        await client.query(`
            INSERT INTO shopping_insights (
                ai_receipt_id, meal_type, cuisine_type, shopping_category, 
                shopping_pattern, dietary_flags, health_score, processed_food_ratio,
                sustainability_score, budget_category, price_efficiency_score,
                estimated_people, estimated_days_of_food, household_type,
                insight_confidence
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `, [
            aiReceiptId,
            insights.meal_type,
            insights.cuisine_type,
            insights.shopping_category,
            insights.shopping_pattern,
            insights.dietary_flags || [],
            insights.health_score,
            0, // processed_food_ratio - to be calculated
            insights.sustainability_score,
            insights.budget_category,
            0, // price_efficiency_score - to be calculated
            insights.estimated_people,
            0, // estimated_days_of_food - to be calculated
            '', // household_type - to be calculated
            85 // Default insight confidence
        ]);
    }

    /**
     * Process enhanced items and build product catalog
     */
    async processEnhancedItems(client, items, aiReceiptId, rawReceipt) {
        for (const item of items) {
            // Find or create product in catalog
            const productId = await this.findOrCreateProduct(client, item);

            // Create AI-parsed item record
            await client.query(`
                INSERT INTO ai_parsed_items (
                    ai_receipt_id, product_catalog_id, original_name, normalized_name,
                    brand, size_info, product_type, category, subcategory,
                    quantity, unit_price_cents, line_total_cents, discount_cents,
                    dietary_tags, nutrition_category, sustainability_score,
                    ocr_confidence, ai_confidence, name_match_confidence, unit_type
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            `, [
                aiReceiptId,
                productId,
                item.original_name || item.name,
                item.name,
                item.brand,
                item.size_info,
                item.product_type,
                item.category,
                item.subcategory,
                item.quantity,
                item.unit_price ? Math.round(item.unit_price * 100) : null,
                Math.round(item.line_total * 100),
                0, // discount_cents
                item.dietary_tags || [],
                item.nutrition_category,
                0, // sustainability_score
                item.confidence,
                item.confidence, // ai_confidence
                1.0, // name_match_confidence
                item.unit
            ]);
        }
    }

    /**
     * Find existing product or create new one in catalog
     */
    async findOrCreateProduct(client, item) {
        // Try to find existing product
        let result = await client.query(
            'SELECT id FROM product_catalog WHERE normalized_name ILIKE $1',
            [item.name]
        );

        if (result.rows.length > 0) {
            // Update frequency and pricing
            await client.query(`
                UPDATE product_catalog 
                SET purchase_frequency = purchase_frequency + 1,
                    last_seen = CURRENT_TIMESTAMP,
                    avg_price_cents = COALESCE(
                        (avg_price_cents * (purchase_frequency - 1) + $2) / purchase_frequency, 
                        $2
                    )
                WHERE id = $1
            `, [result.rows[0].id, Math.round(item.line_total * 100)]);

            return result.rows[0].id;
        }

        // Create new product
        result = await client.query(`
            INSERT INTO product_catalog (
                normalized_name, brand, product_type, category, subcategory,
                size_info, dietary_tags, nutrition_category,
                avg_price_cents, price_range_min_cents, price_range_max_cents,
                purchase_frequency, confidence_score
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1, $12)
            RETURNING id
        `, [
            item.name,
            item.brand,
            item.product_type,
            item.category,
            item.subcategory,
            item.size_info,
            item.dietary_tags || [],
            item.nutrition_category,
            Math.round(item.line_total * 100),
            Math.round(item.line_total * 100), // Initial min = avg
            Math.round(item.line_total * 100), // Initial max = avg
            item.confidence || 1.0
        ]);

        return result.rows[0].id;
    }

    /**
     * Generate processing summary and insights
     */
    async generateProcessingSummary() {
        console.log('📊 Generating AI Processing Summary...\n');

        const queries = {
            totalProcessed: 'SELECT COUNT(*) as count FROM ai_parsed_receipts',
            avgConfidence: 'SELECT AVG(ai_confidence_score) as avg_confidence FROM ai_parsed_receipts',
            storeTypes: `
                SELECT store_type, COUNT(*) as count 
                FROM enhanced_stores 
                GROUP BY store_type 
                ORDER BY count DESC
            `,
            topCategories: `
                SELECT category, COUNT(*) as count, AVG(line_total_cents/100.0) as avg_price
                FROM ai_parsed_items 
                GROUP BY category 
                ORDER BY count DESC 
                LIMIT 10
            `,
            healthScores: `
                SELECT 
                    health_score,
                    COUNT(*) as count,
                    AVG(grand_total_cents/100.0) as avg_spending
                FROM ai_parsed_receipts apr
                JOIN shopping_insights si ON apr.id = si.ai_receipt_id
                WHERE health_score IS NOT NULL
                GROUP BY health_score
                ORDER BY health_score DESC
            `,
            dietaryTrends: `
                SELECT 
                    UNNEST(dietary_flags) as dietary_flag,
                    COUNT(*) as frequency
                FROM shopping_insights
                WHERE dietary_flags IS NOT NULL AND array_length(dietary_flags, 1) > 0
                GROUP BY dietary_flag
                ORDER BY frequency DESC
                LIMIT 10
            `,
            productCatalogStats: `
                SELECT 
                    COUNT(*) as total_products,
                    COUNT(DISTINCT category) as categories,
                    COUNT(DISTINCT brand) as brands,
                    AVG(purchase_frequency) as avg_frequency
                FROM product_catalog
            `
        };

        for (const [name, query] of Object.entries(queries)) {
            try {
                const result = await this.pool.query(query);
                console.log(`📈 ${name.toUpperCase()}:`);
                
                if (result.rows.length === 1 && Object.keys(result.rows[0]).length === 1) {
                    console.log(`   ${Object.values(result.rows[0])[0]}\n`);
                } else {
                    result.rows.forEach(row => console.log('  ', row));
                    console.log();
                }
            } catch (error) {
                console.log(`❌ ${name} query failed:`, error.message, '\n');
            }
        }
    }

    /**
     * Query enhanced data with intelligent filtering
     */
    async queryEnhancedData(filters = {}) {
        let whereConditions = ['1=1'];
        let params = [];
        let paramCount = 0;

        // Build dynamic where clause
        if (filters.store_type) {
            paramCount++;
            whereConditions.push(`es.store_type = $${paramCount}`);
            params.push(filters.store_type);
        }

        if (filters.category) {
            paramCount++;
            whereConditions.push(`api.category = $${paramCount}`);
            params.push(filters.category);
        }

        if (filters.min_health_score) {
            paramCount++;
            whereConditions.push(`si.health_score >= $${paramCount}`);
            params.push(filters.min_health_score);
        }

        if (filters.date_from) {
            paramCount++;
            whereConditions.push(`apr.transaction_date >= $${paramCount}`);
            params.push(filters.date_from);
        }

        const query = `
            SELECT 
                apr.id,
                es.normalized_name as store_name,
                es.store_type,
                apr.transaction_date,
                apr.grand_total_cents / 100.0 as total_amount,
                apr.ai_confidence_score,
                si.health_score,
                si.shopping_category,
                si.dietary_flags,
                COUNT(api.id) as item_count
            FROM ai_parsed_receipts apr
            JOIN enhanced_stores es ON apr.enhanced_store_id = es.id
            LEFT JOIN shopping_insights si ON apr.id = si.ai_receipt_id
            LEFT JOIN ai_parsed_items api ON apr.id = api.ai_receipt_id
            WHERE ${whereConditions.join(' AND ')}
            GROUP BY apr.id, es.id, si.id
            ORDER BY apr.transaction_date DESC
            LIMIT 50
        `;

        return await this.pool.query(query, params);
    }

    async close() {
        await this.pool.end();
    }
}

// Main execution function
async function main() {
    console.log('🤖 AI-Driven Data Parsing System');
    console.log('================================\n');

    const processor = new AIDataProcessor();

    try {
        // Process all existing receipts
        const results = await processor.processAllRawReceipts();
        
        console.log('\n🎯 Testing Enhanced Data Queries...\n');
        
        // Test various queries
        const testQueries = [
            { store_type: 'grocery' },
            { category: 'produce' },
            { min_health_score: 7 },
            { date_from: '2025-08-01' }
        ];

        for (const filter of testQueries) {
            console.log(`Query with filters:`, filter);
            const result = await processor.queryEnhancedData(filter);
            console.log(`Found ${result.rows.length} matching receipts\n`);
        }

        console.log('✅ AI Data Processing System Demo Complete!');

    } catch (error) {
        console.error('❌ Processing failed:', error.message);
    } finally {
        await processor.close();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = AIDataProcessor;