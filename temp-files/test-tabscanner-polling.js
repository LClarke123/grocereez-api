// TabScanner API Test with Proper Polling
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function testTabScannerWithPolling() {
    console.log('🔄 Testing TabScanner API with Polling');
    console.log('=======================================\n');

    const apiKey = process.env.TABSCANNER_API_KEY;
    const processUrl = 'https://api.tabscanner.com/api/2/process';
    const imagePath = path.join(__dirname, 'test-images', 'test-receipt.jpg');
    
    if (!apiKey || !fs.existsSync(imagePath)) {
        console.log('❌ Missing API key or test image');
        return;
    }

    try {
        // Step 1: Upload receipt
        console.log('📤 Step 1: Uploading receipt...');
        
        const formData = new FormData();
        const imageBuffer = fs.readFileSync(imagePath);
        
        formData.append('file', imageBuffer, {
            filename: 'test-receipt.jpg',
            contentType: 'image/jpeg'
        });
        formData.append('documentType', 'receipt');
        
        const uploadResponse = await axios.post(processUrl, formData, {
            headers: {
                'apikey': apiKey,
                ...formData.getHeaders()
            },
            timeout: 30000
        });

        console.log('✅ Upload successful!');
        console.log('   Token:', uploadResponse.data.token);
        
        const token = uploadResponse.data.token;

        // Step 2: Poll for results with retry logic
        console.log('\n⏳ Step 2: Polling for results...');
        
        const maxAttempts = 20; // Try for up to 60 seconds (20 attempts * 3 seconds)
        let attempt = 0;
        let results = null;

        while (attempt < maxAttempts) {
            attempt++;
            console.log(`   Attempt ${attempt}/${maxAttempts}...`);
            
            try {
                const resultUrl = `https://api.tabscanner.com/api/result/${token}`;
                const resultResponse = await axios.get(resultUrl, {
                    headers: { 'apikey': apiKey },
                    timeout: 10000
                });

                const data = resultResponse.data;
                console.log(`   Status: ${data.status} (Code: ${data.status_code})`);

                if (data.status === 'success' && data.result) {
                    results = data;
                    break;
                } else if (data.status === 'pending') {
                    console.log('   Still processing...');
                } else if (data.status === 'error' || data.status === 'failed') {
                    console.log('   Processing failed:', data.message);
                    break;
                }
                
            } catch (error) {
                console.log(`   Request failed: ${error.message}`);
            }

            // Wait 3 seconds before next attempt
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        // Step 3: Process results
        if (results && results.result && results.result.length > 0) {
            console.log('\n🎉 SUCCESS! Receipt processed successfully!');
            console.log('📊 EXTRACTED RECEIPT DATA:');
            console.log('==========================================');
            
            const receipt = results.result[0];
            
            console.log('🏪 Merchant:', receipt.establishment || 'Not found');
            console.log('📅 Date:', receipt.date || 'Not found');
            console.log('🕒 Time:', receipt.time || 'Not found');
            console.log('💰 Total:', receipt.total || 'Not found');
            console.log('🧾 Tax:', receipt.tax || 'Not found');
            console.log('📍 Address:', receipt.address || 'Not found');
            console.log('☎️  Phone:', receipt.phone || 'Not found');
            console.log('📋 Items Count:', receipt.lineItems ? receipt.lineItems.length : 0);
            
            // Show line items
            if (receipt.lineItems && receipt.lineItems.length > 0) {
                console.log('\n📝 LINE ITEMS:');
                receipt.lineItems.forEach((item, index) => {
                    console.log(`${index + 1}. ${item.desc || item.description || 'Unknown Item'}`);
                    console.log(`   Quantity: ${item.qty || '1'}`);
                    console.log(`   Price: ${item.lineTotal || item.total || 'N/A'}`);
                    if (item.unitPrice) console.log(`   Unit Price: ${item.unitPrice}`);
                    console.log('');
                });
            }

            // Show confidence and processing info
            console.log('📈 PROCESSING INFO:');
            console.log('   Confidence:', receipt.confidence || 'Not provided');
            console.log('   Processing Time:', receipt.processingTime || 'Not provided');
            
            // Show raw text sample
            if (receipt.rawText) {
                console.log('\n📄 RAW OCR TEXT (first 200 chars):');
                console.log(receipt.rawText.substring(0, 200) + '...');
            }

            return {
                success: true,
                token: token,
                receipt: receipt,
                fullResults: results
            };

        } else {
            console.log('\n❌ No results obtained after polling');
            console.log('   Final response:', results ? JSON.stringify(results, null, 2) : 'No response');
            
            return {
                success: false,
                error: 'No results after polling',
                token: token
            };
        }

    } catch (error) {
        console.error('\n❌ TabScanner API Test Failed:');
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }
        
        return {
            success: false,
            error: error.message
        };
    }
}

async function main() {
    const result = await testTabScannerWithPolling();
    
    if (result.success) {
        console.log('\n✅ TabScanner API integration verified!');
        console.log('\n🔧 Implementation Requirements:');
        console.log('1. Use "apikey" header (not X-API-Key)');
        console.log('2. Two-step process: upload → poll for results');
        console.log('3. Handle polling with retry logic');
        console.log('4. Parse results.result[0] for receipt data');
        console.log('5. Map TabScanner fields to our database schema');
    } else {
        console.log('\n⚠️  Further investigation needed');
        console.log('Check TabScanner dashboard or contact support');
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testTabScannerWithPolling };