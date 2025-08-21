// Test Different Authentication Methods for TabScanner
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function testAuthMethods() {
    console.log('🔐 Testing Different Authentication Methods');
    console.log('==========================================\n');

    const apiKey = process.env.TABSCANNER_API_KEY;
    const apiUrl = 'https://api.tabscanner.com/api/2/process';
    const imagePath = path.join(__dirname, 'test-images', 'test-receipt.jpg');

    if (!apiKey || !fs.existsSync(imagePath)) {
        console.log('❌ Missing API key or test image');
        return;
    }

    const imageBuffer = fs.readFileSync(imagePath);
    console.log(`API Key: ${apiKey.substring(0, 10)}... (${apiKey.length} chars)\n`);

    const authMethods = [
        {
            name: 'X-API-Key header',
            headers: { 'X-API-Key': apiKey }
        },
        {
            name: 'Authorization: Bearer',
            headers: { 'Authorization': `Bearer ${apiKey}` }
        },
        {
            name: 'Authorization: API-Key',
            headers: { 'Authorization': `API-Key ${apiKey}` }
        },
        {
            name: 'api-key header',
            headers: { 'api-key': apiKey }
        },
        {
            name: 'apikey header',
            headers: { 'apikey': apiKey }
        },
        {
            name: 'X-RapidAPI-Key header',
            headers: { 'X-RapidAPI-Key': apiKey }
        }
    ];

    for (const method of authMethods) {
        console.log(`🧪 Testing: ${method.name}`);
        
        try {
            const formData = new FormData();
            formData.append('file', imageBuffer, {
                filename: 'test-receipt.jpg',
                contentType: 'image/jpeg'
            });
            formData.append('documentType', 'receipt');
            formData.append('outputFormat', 'json');

            const response = await axios.post(apiUrl, formData, {
                headers: {
                    ...method.headers,
                    ...formData.getHeaders()
                },
                timeout: 15000
            });

            console.log(`✅ SUCCESS with ${method.name}`);
            console.log('Response:', JSON.stringify(response.data, null, 2));
            
            // If successful, we found the right method!
            return method.name;

        } catch (error) {
            if (error.response) {
                console.log(`❌ ${method.name} failed:`);
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Response:`, JSON.stringify(error.response.data, null, 2));
            } else {
                console.log(`❌ ${method.name} network error:`, error.message);
            }
        }
        
        console.log(''); // Empty line for readability
    }

    console.log('🔍 All authentication methods failed. Checking API key validity...');
    
    // Try to get more info about the API key issue
    await testMinimalRequest(apiKey);
}

async function testMinimalRequest(apiKey) {
    console.log('\n📡 Testing Minimal Request');
    console.log('===========================');
    
    try {
        // Try just hitting the API endpoint without multipart data
        const response = await axios.post('https://api.tabscanner.com/api/2/process', 
            { test: 'minimal' }, 
            {
                headers: {
                    'X-API-Key': apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );
        
        console.log('Minimal request response:', response.data);
        
    } catch (error) {
        if (error.response) {
            console.log('Minimal request failed:');
            console.log('Status:', error.response.status);
            console.log('Data:', JSON.stringify(error.response.data, null, 2));
            
            // Check if the error message gives us clues
            const errorMsg = error.response.data?.message || '';
            if (errorMsg.includes('API key')) {
                console.log('\n💡 API Key Issue Detected:');
                console.log('   - The API key format might be wrong');
                console.log('   - The API key might be expired or invalid');
                console.log('   - The API key might not have the correct permissions');
            }
        } else {
            console.log('Network error:', error.message);
        }
    }
}

// Test with URL parameters as well
async function testURLParams() {
    console.log('\n🌐 Testing URL Parameters');
    console.log('==========================');
    
    const apiKey = process.env.TABSCANNER_API_KEY;
    const apiUrl = `https://api.tabscanner.com/api/2/process?api_key=${apiKey}`;
    
    try {
        const response = await axios.post(apiUrl, { test: 'url_param' }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });
        
        console.log('✅ URL parameter method worked!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        if (error.response) {
            console.log('❌ URL parameter method failed:');
            console.log('Status:', error.response.status);
            console.log('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Network error:', error.message);
        }
    }
}

async function main() {
    await testAuthMethods();
    await testURLParams();
    
    console.log('\n🔧 Recommendations:');
    console.log('1. Verify the API key is correct and active');
    console.log('2. Check TabScanner documentation for authentication method');
    console.log('3. Contact TabScanner support if the issue persists');
    console.log('4. For now, the app will fall back to mock data');
}

if (require.main === module) {
    main().catch(console.error);
}