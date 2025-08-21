// Complete TabScanner API Test with Results Retrieval
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function testCompleteTabScannerFlow() {
    console.log('🔄 Testing Complete TabScanner API Flow');
    console.log('========================================\n');

    const apiKey = process.env.TABSCANNER_API_KEY;
    const processUrl = 'https://api.tabscanner.com/api/2/process';
    const imagePath = path.join(__dirname, 'test-images', 'test-receipt.jpg');
    
    if (!apiKey || !fs.existsSync(imagePath)) {
        console.log('❌ Missing API key or test image');
        return;
    }

    try {
        // Step 1: Upload receipt for processing
        console.log('📤 Step 1: Uploading receipt...');
        
        const formData = new FormData();
        const imageBuffer = fs.readFileSync(imagePath);
        
        formData.append('file', imageBuffer, {
            filename: 'test-receipt.jpg',
            contentType: 'image/jpeg'
        });
        formData.append('documentType', 'receipt');
        formData.append('decimalPlaces', '2');

        const uploadResponse = await axios.post(processUrl, formData, {
            headers: {
                'apikey': apiKey,  // Using correct header format
                ...formData.getHeaders()
            },
            timeout: 30000
        });

        console.log('✅ Upload successful!');
        console.log('   Status:', uploadResponse.data.status);
        console.log('   Token:', uploadResponse.data.token);
        console.log('   Message:', uploadResponse.data.message);

        if (!uploadResponse.data.success || !uploadResponse.data.token) {
            throw new Error('Upload failed or no token received');
        }

        const token = uploadResponse.data.token;

        // Step 2: Wait for processing (TabScanner docs say ~5 seconds)
        console.log('\n⏳ Step 2: Waiting for processing (~5 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 6000));

        // Step 3: Retrieve results
        console.log('\n📥 Step 3: Retrieving processed results...');
        
        const resultUrl = `https://api.tabscanner.com/api/result/${token}`;
        console.log('   Result URL:', resultUrl);

        const resultResponse = await axios.get(resultUrl, {
            headers: {
                'apikey': apiKey
            },
            timeout: 15000
        });

        console.log('✅ Results retrieved!');
        console.log('   Status:', resultResponse.status);
        
        const results = resultResponse.data;
        console.log('\n📊 EXTRACTED RECEIPT DATA:');
        console.log('==========================================');
        
        if (results.result && results.result.length > 0) {
            const receipt = results.result[0];
            
            console.log('🏪 Merchant:', receipt.establishment || 'Not found');
            console.log('📅 Date:', receipt.date || 'Not found');
            console.log('💰 Total:', receipt.total || 'Not found');
            console.log('🧾 Tax:', receipt.tax || 'Not found');
            console.log('📋 Items Count:', receipt.lineItems ? receipt.lineItems.length : 0);
            
            if (receipt.lineItems && receipt.lineItems.length > 0) {
                console.log('\n📝 LINE ITEMS:');
                receipt.lineItems.forEach((item, index) => {
                    console.log(`${index + 1}. ${item.desc || item.description || 'Unknown Item'}`);
                    console.log(`   Price: ${item.lineTotal || item.total || 'N/A'}`);
                    console.log(`   Quantity: ${item.qty || item.quantity || '1'}`);
                    console.log('');
                });
            }

            // Show raw OCR text if available
            if (receipt.rawText || receipt.raw_text) {
                console.log('📄 RAW OCR TEXT (first 300 chars):');
                const rawText = receipt.rawText || receipt.raw_text;
                console.log(rawText.substring(0, 300) + '...');
            }

        } else {
            console.log('⚠️  No results found in response');
            console.log('Full response:', JSON.stringify(results, null, 2));
        }

        console.log('\n✅ TABSCANNER API TEST COMPLETED SUCCESSFULLY!');
        
        return {
            success: true,
            token: token,
            results: results
        };

    } catch (error) {
        console.error('❌ TabScanner API Test Failed:');
        
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Status Text:', error.response.statusText);
            console.error('   Response Data:', JSON.stringify(error.response.data, null, 2));
            
            if (error.response.status === 401) {
                console.error('\n🔑 Authentication Error - Check API key');
            } else if (error.response.status === 429) {
                console.error('\n⏰ Rate Limited - Wait and try again');
            } else if (error.response.status === 404) {
                console.error('\n🔍 Endpoint not found - Check URL');
            }
        } else if (error.request) {
            console.error('   No response received');
            console.error('   Request:', error.message);
        } else {
            console.error('   Error:', error.message);
        }
        
        return {
            success: false,
            error: error.message
        };
    }
}

async function main() {
    const result = await testCompleteTabScannerFlow();
    
    if (result.success) {
        console.log('\n🎯 NEXT STEPS:');
        console.log('1. Update OCRService to use "apikey" header instead of "X-API-Key"');
        console.log('2. Implement two-step process: upload → wait → retrieve results');
        console.log('3. Update response parsing to handle TabScanner result format');
        console.log('4. Remove mock data fallback for invalid API key');
    } else {
        console.log('\n⚠️  API integration needs further investigation');
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testCompleteTabScannerFlow };