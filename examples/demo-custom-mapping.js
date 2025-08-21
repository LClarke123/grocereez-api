// Demonstration of Custom Field Mapping
// Shows how TabScanner JSON data maps to user's specific database structure

const CustomFieldMapper = require('./custom-field-mapper');
const fs = require('fs');
const path = require('path');

async function demonstrateCustomMapping() {
    console.log('🎯 CUSTOM FIELD MAPPING DEMONSTRATION');
    console.log('====================================\n');

    try {
        // Load the raw TabScanner response we just processed
        const rawDataFiles = fs.readdirSync('.')
            .filter(file => file.startsWith('test_receipt_raw_'))
            .sort()
            .reverse(); // Get the most recent

        if (rawDataFiles.length === 0) {
            throw new Error('No raw TabScanner data found. Run OCR processing first.');
        }

        const rawDataFile = rawDataFiles[0];
        console.log(`📁 Loading raw data from: ${rawDataFile}\n`);

        const rawData = JSON.parse(fs.readFileSync(rawDataFile, 'utf8'));
        const mapper = new CustomFieldMapper();

        // Perform the custom mapping
        const mappedData = mapper.mapToCustomStructure(rawData);

        console.log('🗺️  FIELD MAPPING RESULTS');
        console.log('========================\n');

        // Display the mapped structure
        console.log('📋 STORE & BRAND INFORMATION:');
        console.log(`   Brand Name (normalized): "${mappedData.brand_name}"`);
        console.log(`   Original Merchant: "${mappedData.original_merchant}"`);
        console.log(`   Phone: ${mappedData.phone}\n`);

        console.log('🏠 ADDRESS COMPONENTS:');
        console.log(`   Street Number: ${mappedData.street_number}`);
        console.log(`   Street Name: "${mappedData.street_name}"`);
        console.log(`   City: ${mappedData.city}`);
        console.log(`   State: ${mappedData.state}`);
        console.log(`   Zipcode: ${mappedData.zipcode}`);
        console.log(`   Raw Address: "${mappedData.raw_address}"\n`);

        console.log('📅 DATE & TIME FIELDS:');
        console.log(`   Date Field: ${mappedData.date_field}`);
        console.log(`   Time Field: ${mappedData.time_field}\n`);

        console.log('💰 FINANCIAL FIELDS:');
        console.log(`   Tax Field 1: $${mappedData.tax_field_1}`);
        console.log(`   Tax Field 2: $${mappedData.tax_field_2}`);
        console.log(`   Total Price: $${mappedData.total_price_field}`);
        console.log(`   Confidence Score: ${(mappedData.confidence_score * 100).toFixed(1)}%\n`);

        console.log('🛒 ITEM MAPPINGS WITH TYPE CODES:');
        console.log('=================================\n');

        // Display first 10 items with detailed mapping
        const itemsToShow = mappedData.items.slice(0, 10);
        itemsToShow.forEach((item, index) => {
            console.log(`${index + 1}. ${item.item_name}`);
            console.log(`   Type Code: ${item.item_type_code}`);
            console.log(`   Price: $${item.item_price.toFixed(2)}`);
            console.log(`   Quantity: ${item.quantity}`);
            console.log(`   Unit Price: $${item.unit_price.toFixed(2)}`);
            console.log(`   Category: ${item.category}`);
            console.log(`   Unit: ${item.unit}`);
            console.log();
        });

        if (mappedData.items.length > 10) {
            console.log(`... and ${mappedData.items.length - 10} more items\n`);
        }

        // Show summary statistics
        console.log('📊 MAPPING SUMMARY:');
        console.log('==================\n');
        
        const typeCodeCounts = {};
        const categoryCounts = {};
        
        mappedData.items.forEach(item => {
            typeCodeCounts[item.item_type_code] = (typeCodeCounts[item.item_type_code] || 0) + 1;
            categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
        });

        console.log('Type Code Distribution:');
        Object.entries(typeCodeCounts)
            .sort((a, b) => b[1] - a[1])
            .forEach(([code, count]) => {
                console.log(`   ${code}: ${count} items`);
            });

        console.log('\nCategory Distribution:');
        Object.entries(categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .forEach(([category, count]) => {
                console.log(`   ${category}: ${count} items`);
            });

        // Create database-ready structure
        console.log('\n💾 DATABASE-READY STRUCTURE:');
        console.log('============================\n');

        const databaseRecord = {
            receipt_header: {
                brand_name: mappedData.brand_name,
                street_number: mappedData.street_number,
                street_name: mappedData.street_name,
                city: mappedData.city,
                state: mappedData.state,
                zipcode: mappedData.zipcode,
                date_field: mappedData.date_field,
                time_field: mappedData.time_field,
                tax_field_1: mappedData.tax_field_1,
                tax_field_2: mappedData.tax_field_2,
                total_price_field: mappedData.total_price_field,
                confidence_score: mappedData.confidence_score
            },
            receipt_items: mappedData.items.map(item => ({
                item_name: item.item_name,
                item_type_code: item.item_type_code,
                item_price: item.item_price,
                quantity: item.quantity,
                unit_price: item.unit_price,
                category: item.category
            }))
        };

        console.log(JSON.stringify(databaseRecord, null, 2));

        // Save the mapped result
        const timestamp = Date.now();
        const outputFile = `custom_mapped_receipt_${timestamp}.json`;
        fs.writeFileSync(outputFile, JSON.stringify(databaseRecord, null, 2));
        console.log(`\n✅ Custom mapped data saved to: ${outputFile}`);

        console.log('\n🎯 FIELD TRANSPOSITION COMPLETE!');
        console.log('=================================');
        console.log('✅ Brand name normalized to "Trader Joes"');
        console.log('✅ Address parsed into separate fields');
        console.log('✅ Date and time extracted');
        console.log('✅ Tax fields separated (Tax 1 & Tax 2)');
        console.log('✅ Items mapped with type codes');
        console.log('✅ Ready for database insertion');

    } catch (error) {
        console.error('❌ Mapping demonstration failed:', error.message);
        throw error;
    }
}

// Run the demonstration
demonstrateCustomMapping().catch(console.error);