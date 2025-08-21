// Direct TabScanner API Test
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function testTabScannerDirectly() {
    console.log('🔍 Testing TabScanner API Directly');
    console.log('=====================================\n');

    const apiKey = process.env.TABSCANNER_API_KEY;
    const apiUrl = 'https://api.tabscanner.com/api/2/process';
    
    console.log('API Key (first 10 chars):', apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET');
    console.log('API URL:', apiUrl);
    console.log('API Key configured:', !!apiKey);
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

    try {
        // Create form data
        console.log('🚀 Creating request to TabScanner...');
        const formData = new FormData();
        const imageBuffer = fs.readFileSync(imagePath);
        
        formData.append('file', imageBuffer, {
            filename: 'test-receipt.jpg',
            contentType: 'image/jpeg'
        });
        formData.append('documentType', 'receipt');
        formData.append('outputFormat', 'json');

        console.log('Form data prepared with fields:', Object.keys(formData.getHeaders()));
        console.log('Making API request...\n');

        // Make API request
        const response = await axios.post(apiUrl, formData, {
            headers: {
                'X-API-Key': apiKey,
                ...formData.getHeaders()
            },
            timeout: 30000,
            maxContentLength: 10 * 1024 * 1024
        });

        console.log('✅ TabScanner API Response:');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));

        // Check if response has useful data
        if (response.data && response.data.results && response.data.results.length > 0) {
            const result = response.data.results[0];
            console.log('\n📊 Extracted Data Summary:');
            console.log('Text length:', result.text ? result.text.length : 0);
            console.log('Confidence:', result.confidence || 'Not provided');
            
            if (result.receipt) {
                console.log('Merchant:', result.receipt.merchant_name || 'Not found');
                console.log('Total:', result.receipt.total || 'Not found');
                console.log('Items count:', result.receipt.items ? result.receipt.items.length : 0);
            }

            if (result.text) {
                console.log('\n📝 Raw OCR Text (first 300 chars):');
                console.log(result.text.substring(0, 300) + '...');
            }
        } else {
            console.log('\n⚠️  No results found in response');
        }

    } catch (error) {
        console.error('❌ TabScanner API Error:');
        console.error('Message:', error.message);
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Status Text:', error.response.statusText);
            console.error('Response Headers:', error.response.headers);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('No response received');
            console.error('Request config:', error.config);
        } else {
            console.error('Error setting up request');
        }
    }
}

// Also test a simple API key validation endpoint if available
async function testAPIKeyValidation() {
    console.log('\n🔑 Testing API Key Validation');
    console.log('===============================');
    
    const apiKey = process.env.TABSCANNER_API_KEY;
    
    try {
        // Try to hit a simple endpoint to validate the key
        const response = await axios.get('https://api.tabscanner.com/api/2/account', {
            headers: {
                'X-API-Key': apiKey
            },
            timeout: 10000
        });
        
        console.log('✅ API Key Valid - Account Info:');
        console.log(JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.log('❌ API Key Validation Failed:');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Error:', error.message);
        }
    }
}

async function main() {
    await testAPIKeyValidation();
    await testTabScannerDirectly();
}

if (require.main === module) {
    main().catch(console.error);
}