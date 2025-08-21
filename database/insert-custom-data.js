// Insert Custom Mapped Receipt Data into Database
// Demonstrates how the processed receipt data gets stored in the custom structure

const { Pool } = require('pg');
const CustomFieldMapper = require('./custom-field-mapper');
const fs = require('fs');
require('dotenv').config();

async function insertCustomMappedData() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🗄️  CUSTOM DATABASE INSERTION DEMO');
        console.log('===================================\n');

        // Create custom tables
        console.log('📊 Creating custom database tables...');
        const schema = fs.readFileSync('create-custom-database.sql', 'utf8');
        await pool.query(schema);
        console.log('✅ Custom tables created\n');

        // Load the processed receipt data
        const rawDataFiles = fs.readdirSync('.')
            .filter(file => file.startsWith('test_receipt_raw_'))
            .sort()
            .reverse();

        if (rawDataFiles.length === 0) {
            throw new Error('No raw receipt data found');
        }

        const rawData = JSON.parse(fs.readFileSync(rawDataFiles[0], 'utf8'));
        const mapper = new CustomFieldMapper();
        const mappedData = mapper.mapToCustomStructure(rawData);

        console.log('💾 Inserting receipt header data...');
        
        // Insert receipt header
        const receiptInsertQuery = `
            INSERT INTO custom_receipts (
                brand_name, street_number, street_name, city, state, zipcode,
                date_field, time_field, tax_field_1, tax_field_2, total_price_field,
                confidence_score, phone, raw_address
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
            ) RETURNING id
        `;

        const receiptResult = await pool.query(receiptInsertQuery, [
            mappedData.brand_name,
            mappedData.street_number,
            mappedData.street_name,
            mappedData.city,
            mappedData.state,
            mappedData.zipcode,
            mappedData.date_field,
            mappedData.time_field,
            mappedData.tax_field_1,
            mappedData.tax_field_2,
            mappedData.total_price_field,
            mappedData.confidence_score,
            mappedData.phone,
            mappedData.raw_address
        ]);

        const receiptId = receiptResult.rows[0].id;
        console.log(`✅ Receipt header inserted with ID: ${receiptId}`);

        console.log('🛒 Inserting receipt items...');
        
        // Insert receipt items
        const itemInsertQuery = `
            INSERT INTO custom_receipt_items (
                receipt_id, item_name, item_type_code, item_price,
                quantity, unit_price, unit, category, confidence
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;

        let itemsInserted = 0;
        for (const item of mappedData.items) {
            await pool.query(itemInsertQuery, [
                receiptId,
                item.item_name,
                item.item_type_code,
                item.item_price,
                item.quantity,
                item.unit_price,
                item.unit,
                item.category,
                item.confidence
            ]);
            itemsInserted++;
        }

        console.log(`✅ ${itemsInserted} items inserted\n`);

        // Query and display the stored data
        console.log('📋 QUERYING STORED DATA');
        console.log('======================\n');

        // Show receipt header
        const headerQuery = `
            SELECT 
                brand_name,
                street_number || ' ' || street_name as full_address,
                city || ', ' || state || ' ' || zipcode as location,
                date_field,
                time_field,
                tax_field_1,
                tax_field_2,
                total_price_field,
                confidence_score
            FROM custom_receipts 
            WHERE id = $1
        `;

        const headerResult = await pool.query(headerQuery, [receiptId]);
        const header = headerResult.rows[0];

        console.log('🏪 RECEIPT HEADER DATA:');
        console.log(`   Brand: ${header.brand_name}`);
        console.log(`   Address: ${header.full_address}`);
        console.log(`   Location: ${header.location}`);
        console.log(`   Date: ${header.date_field}`);
        console.log(`   Time: ${header.time_field}`);
        console.log(`   Tax 1: $${header.tax_field_1}`);
        console.log(`   Tax 2: $${header.tax_field_2}`);
        console.log(`   Total: $${header.total_price_field}`);
        console.log(`   Confidence: ${(header.confidence_score * 100).toFixed(1)}%\n`);

        // Show sample items with type codes
        const itemsQuery = `
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
        `;

        const itemsResult = await pool.query(itemsQuery, [receiptId]);

        console.log('🛍️  TOP 10 ITEMS BY PRICE:');
        itemsResult.rows.forEach((item, index) => {
            console.log(`${index + 1}. ${item.item_name}`);
            console.log(`   Type: ${item.item_type_code} | Price: $${item.item_price} | Qty: ${item.quantity}`);
            console.log(`   Unit Price: $${Number(item.unit_price).toFixed(2)} | Category: ${item.category}\n`);
        });

        // Show type code statistics
        const statsQuery = `
            SELECT 
                item_type_code,
                COUNT(*) as item_count,
                SUM(item_price) as total_value,
                AVG(item_price) as avg_price
            FROM custom_receipt_items 
            WHERE receipt_id = $1
            GROUP BY item_type_code
            ORDER BY total_value DESC
        `;

        const statsResult = await pool.query(statsQuery, [receiptId]);

        console.log('📊 TYPE CODE STATISTICS:');
        statsResult.rows.forEach(stat => {
            console.log(`   ${stat.item_type_code}: ${stat.item_count} items, $${Number(stat.total_value).toFixed(2)} total, $${Number(stat.avg_price).toFixed(2)} avg`);
        });

        // Show the complete database structure
        console.log('\n🗃️  COMPLETE DATABASE RECORD:');
        console.log('============================\n');

        const completeQuery = `
            SELECT json_build_object(
                'receipt_header', json_build_object(
                    'brand_name', r.brand_name,
                    'street_number', r.street_number,
                    'street_name', r.street_name,
                    'city', r.city,
                    'state', r.state,
                    'zipcode', r.zipcode,
                    'date_field', r.date_field,
                    'time_field', r.time_field,
                    'tax_field_1', r.tax_field_1,
                    'tax_field_2', r.tax_field_2,
                    'total_price_field', r.total_price_field
                ),
                'item_count', COUNT(i.id),
                'sample_items', json_agg(
                    json_build_object(
                        'item_name', i.item_name,
                        'item_type_code', i.item_type_code,
                        'item_price', i.item_price
                    ) ORDER BY i.item_price DESC
                ) FILTER (WHERE i.id IS NOT NULL)
            ) as receipt_data
            FROM custom_receipts r
            LEFT JOIN custom_receipt_items i ON r.id = i.receipt_id
            WHERE r.id = $1
            GROUP BY r.id
        `;

        const completeResult = await pool.query(completeQuery, [receiptId]);
        console.log(JSON.stringify(completeResult.rows[0].receipt_data, null, 2));

        console.log('\n✅ CUSTOM FIELD MAPPING COMPLETE!');
        console.log('=================================');
        console.log('✅ Receipt processed through TabScanner OCR');
        console.log('✅ Data mapped to your exact column structure');  
        console.log('✅ Brand normalized to "Trader Joes"');
        console.log('✅ Address split into separate fields');
        console.log('✅ Items categorized with type codes');
        console.log('✅ Data successfully stored in database');

    } catch (error) {
        console.error('❌ Database insertion failed:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

insertCustomMappedData().catch(console.error);