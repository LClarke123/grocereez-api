// Debug TabScanner Response Format
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function debugTabScannerResponse() {
    console.log('🔍 Debugging TabScanner Response Format');
    console.log('========================================\n');

    const apiKey = process.env.TABSCANNER_API_KEY;
    const processUrl = 'https://api.tabscanner.com/api/2/process';
    const imagePath = path.join(__dirname, 'test-images', 'test-receipt.jpg');
    
    try {
        // Upload receipt
        console.log('📤 Uploading receipt...');
        
        const formData = new FormData();
        const imageBuffer = fs.readFileSync(imagePath);
        
        formData.append('file', imageBuffer, {
            filename: 'test-receipt.jpg',
            contentType: 'image/jpeg'
        });
        
        const uploadResponse = await axios.post(processUrl, formData, {
            headers: {
                'apikey': apiKey,
                ...formData.getHeaders()
            },
            timeout: 30000
        });

        const token = uploadResponse.data.token;
        console.log('✅ Upload successful! Token:', token);
        
        // Wait and check a few times with detailed logging
        const attempts = [3, 6, 10, 15]; // seconds to wait
        
        for (const waitTime of attempts) {
            console.log(`\n⏳ Waiting ${waitTime} seconds...`);
            await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
            
            console.log(`🔍 Checking results after ${waitTime} seconds:`);
            
            try {
                const resultUrl = `https://api.tabscanner.com/api/result/${token}`;
                const response = await axios.get(resultUrl, {
                    headers: { 'apikey': apiKey },
                    timeout: 15000
                });

                console.log('📋 FULL RESPONSE ANALYSIS:');
                console.log('   Status Code:', response.status);
                console.log('   Response Headers:', Object.keys(response.headers));
                console.log('   Content-Type:', response.headers['content-type']);
                console.log('   Response Size:', JSON.stringify(response.data).length, 'characters');
                console.log('\n📄 COMPLETE RESPONSE BODY:');
                console.log(JSON.stringify(response.data, null, 2));
                
                // Check all possible data locations
                const data = response.data;
                console.log('\n🔍 DATA STRUCTURE ANALYSIS:');
                console.log('   Root keys:', Object.keys(data));
                console.log('   Status:', data.status);
                console.log('   Status Code:', data.status_code);
                console.log('   Success:', data.success);
                console.log('   Message:', data.message);
                
                // Look for results in various possible locations
                const possibleResultKeys = ['result', 'results', 'data', 'receipt', 'extraction', 'ocr'];
                for (const key of possibleResultKeys) {
                    if (data[key]) {
                        console.log(`   Found data in "${key}":`, typeof data[key], Array.isArray(data[key]) ? `(${data[key].length} items)` : '');
                        if (typeof data[key] === 'object') {
                            console.log(`   "${key}" keys:`, Object.keys(data[key]));
                        }
                    }
                }
                
                // If status is done, break and analyze
                if (data.status === 'done' || data.status === 'success') {
                    console.log('\n✅ Processing complete! Analyzing results...');
                    
                    if (data.result && Array.isArray(data.result) && data.result.length > 0) {
                        console.log('📊 Receipt Data Found:');
                        const receipt = data.result[0];
                        console.log('   Receipt keys:', Object.keys(receipt));
                        
                        // Show each field
                        Object.entries(receipt).forEach(([key, value]) => {
                            if (typeof value === 'string' && value.length < 100) {
                                console.log(`   ${key}:`, value);
                            } else if (typeof value === 'number') {
                                console.log(`   ${key}:`, value);
                            } else if (Array.isArray(value)) {
                                console.log(`   ${key}: [${value.length} items]`);
                            } else {
                                console.log(`   ${key}:`, typeof value);
                            }
                        });
                        
                    } else {
                        console.log('⚠️  Status is done but no result array found');
                    }
                    
                    break;
                }
                
            } catch (error) {
                console.log(`❌ Request failed: ${error.message}`);
                if (error.response) {
                    console.log('   Error status:', error.response.status);
                    console.log('   Error data:', JSON.stringify(error.response.data, null, 2));
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

async function main() {
    await debugTabScannerResponse();
    
    console.log('\n🎯 This debug will help us understand:');
    console.log('1. Exact response format when processing is complete');
    console.log('2. Where the receipt data is located in the response');
    console.log('3. Field names and structure used by TabScanner');
    console.log('4. Any timing issues with the API');
}

if (require.main === module) {
    main().catch(console.error);
}