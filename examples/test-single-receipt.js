const AIDataProcessor = require('./ai-data-processor');

async function testSingleReceipt() {
    const processor = new AIDataProcessor();
    
    try {
        // Process just one receipt to debug the issues
        const receiptId = 'ac91fbf9-5dad-4607-8998-3990c0f04423';
        console.log(`🎯 Testing single receipt: ${receiptId}`);
        
        const result = await processor.processSingleReceipt(receiptId);
        console.log('✅ Success!');
        console.log('Enhanced data:', JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await processor.close();
    }
}

testSingleReceipt();