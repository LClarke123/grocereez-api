// Test TabScanner API with Correct Authentication Format
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function testTabScannerAuth() {
    console.log('🔑 Testing TabScanner API with Correct Headers');
    console.log('===============================================\n');

    const apiKey = process.env.TABSCANNER_API_KEY;
    const apiUrl = 'https://api.tabscanner.com/api/2/process';
    
    console.log('API Key (first 10 chars):', apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET');
    console.log('API URL:', apiUrl);
    console.log('API Key length:', apiKey ? apiKey.length : 0);
    console.log();

    if (!apiKey) {
        console.log('❌ No API key configured');
        return;
    }

    // Check if test image exists
    const imagePath = path.join(__dirname, 'test-images', 'test-receipt.jpg');
    console.log('Looking for image at:', imagePath);
    
    if (!fs.existsSync(imagePath)) {
        console.log('❌ Test image not found');
        return;
    }

    const stats = fs.statSync(imagePath);
    console.log(`📷 Image found: ${Math.round(stats.size / 1024)}KB\n`);

    // Test different header formats based on documentation
    const headerTests = [
        {
            name: 'apikey (lowercase) - Documentation Standard',
            headers: { 'apikey': apiKey }
        },
        {
            name: 'Authorization Bearer',
            headers: { 'Authorization': `Bearer ${apiKey}` }
        },
        {
            name: 'X-API-Key (current implementation)',
            headers: { 'X-API-Key': apiKey }
        },
        {
            name: 'API-Key header',
            headers: { 'API-Key': apiKey }
        }
    ];

    for (const test of headerTests) {
        console.log(`🧪 Testing: ${test.name}`);
        
        try {
            // Create form data
            const formData = new FormData();
            const imageBuffer = fs.readFileSync(imagePath);
            
            formData.append('file', imageBuffer, {
                filename: 'test-receipt.jpg',
                contentType: 'image/jpeg'
            });
            
            // Add optional parameters based on documentation
            formData.append('documentType', 'receipt');
            formData.append('decimalPlaces', '2');

            console.log(`   → Making request to ${apiUrl}`);
            console.log(`   → Headers:`, Object.keys(test.headers));

            // Make API request
            const response = await axios.post(apiUrl, formData, {
                headers: {
                    ...test.headers,
                    ...formData.getHeaders()
                },
                timeout: 30000,
                maxContentLength: 10 * 1024 * 1024
            });

            console.log(`✅ SUCCESS with ${test.name}`);
            console.log('   → Status:', response.status);
            console.log('   → Response Keys:', Object.keys(response.data));
            console.log('   → Response:', JSON.stringify(response.data, null, 2));
            
            // If we get a successful response, this is the correct method
            if (response.data && !response.data.error) {
                console.log(`\n🎉 FOUND WORKING METHOD: ${test.name}`);
                return test;
            }

        } catch (error) {
            console.log(`❌ ${test.name} failed:`);
            if (error.response) {
                console.log(`   → Status: ${error.response.status}`);
                console.log(`   → Response:`, JSON.stringify(error.response.data, null, 2));
                
                // Check for specific error messages that might give us clues
                if (error.response.data?.message) {
                    console.log(`   → Error Message: ${error.response.data.message}`);
                }
            } else {
                console.log(`   → Network Error:`, error.message);
            }
        }
        
        console.log('');
    }

    console.log('🔍 All header tests completed. Checking for other potential issues...');
    await testAPIEndpoint();
}

async function testAPIEndpoint() {
    console.log('\n🌐 Testing API Endpoint Variations');
    console.log('===================================');
    
    const apiKey = process.env.TABSCANNER_API_KEY;
    const endpoints = [
        'https://api.tabscanner.com/api/2/process',
        'https://api.tabscanner.com/api/process', 
        'https://api.tabscanner.com/process',
        'https://dashboard.tabscanner.com/api/2/process'
    ];

    for (const endpoint of endpoints) {
        console.log(`🔗 Testing endpoint: ${endpoint}`);
        
        try {
            // Try a simple request to see if the endpoint exists
            const response = await axios.post(endpoint, 
                { test: 'endpoint' }, 
                {
                    headers: {
                        'apikey': apiKey,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );
            
            console.log(`   ✅ Endpoint responds: ${response.status}`);
            
        } catch (error) {
            if (error.response) {
                console.log(`   → Status: ${error.response.status}`);
                if (error.response.status === 404) {
                    console.log(`   ❌ Endpoint not found`);
                } else if (error.response.status === 401) {
                    console.log(`   🔑 Endpoint exists but auth failed`);
                } else {
                    console.log(`   ℹ️  Endpoint exists, got: ${error.response.data?.message || 'response'}`);
                }
            } else {
                console.log(`   ❌ Network error: ${error.message}`);
            }
        }
    }
}

async function main() {
    try {
        const workingMethod = await testTabScannerAuth();
        
        if (workingMethod) {
            console.log('\n📝 IMPLEMENTATION NOTES:');
            console.log(`Use header: ${JSON.stringify(workingMethod.headers)}`);
            console.log('Update OCRService to use this authentication method');
        } else {
            console.log('\n⚠️  No working authentication method found');
            console.log('Possible issues:');
            console.log('1. API key is invalid or expired');
            console.log('2. Account needs activation or billing setup');
            console.log('3. API endpoint has changed');
            console.log('4. Rate limiting or regional restrictions');
        }
        
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

if (require.main === module) {
    main();
}

module.exports = { testTabScannerAuth };