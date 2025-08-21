// Script to View Parsed OCR Data from API
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

class OCRDataViewer {
    constructor() {
        this.authToken = null;
    }

    async authenticate() {
        // Login to get auth token
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/login`, {
                email: 'test@grocerypal.com',
                password: 'testpassword123'
            });
            this.authToken = response.data.token;
            console.log('✅ Authenticated successfully');
            return true;
        } catch (error) {
            console.log('❌ Authentication failed:', error.response?.data || error.message);
            return false;
        }
    }

    async getAllReceipts() {
        console.log('\n📋 Getting all processed receipts...');
        
        try {
            const response = await axios.get(`${API_BASE_URL}/receipts?limit=100`, {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });

            const receipts = response.data.receipts;
            console.log(`Found ${receipts.length} receipts:`);
            
            receipts.forEach((receipt, index) => {
                console.log(`\n${index + 1}. Receipt ID: ${receipt.id}`);
                console.log(`   Store: ${receipt.store_name || 'Unknown'}`);
                console.log(`   Date: ${receipt.receipt_date || 'Unknown'}`);
                console.log(`   Total: $${receipt.total_amount || '0.00'}`);
                console.log(`   Status: ${receipt.status}`);
                console.log(`   Items: ${receipt.item_count} items`);
            });

            return receipts;
        } catch (error) {
            console.error('❌ Failed to get receipts:', error.response?.data || error.message);
            return [];
        }
    }

    async getReceiptDetails(receiptId) {
        console.log(`\n🔍 Getting detailed data for receipt: ${receiptId}`);
        
        try {
            const response = await axios.get(`${API_BASE_URL}/receipts/${receiptId}`, {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });

            const { receipt, items } = response.data;
            
            console.log('\n📊 RECEIPT DETAILS:');
            console.log('===================');
            console.log('Receipt ID:', receipt.id);
            console.log('Store:', receipt.store_name || 'Unknown');
            console.log('Date:', receipt.receipt_date);
            console.log('Time:', receipt.receipt_time);
            console.log('Total Amount:', `$${receipt.total_amount}`);
            console.log('Tax Amount:', `$${receipt.tax_amount}`);
            console.log('Subtotal:', `$${receipt.subtotal_amount}`);
            console.log('Processing Status:', receipt.status);
            
            console.log('\n📝 LINE ITEMS:');
            console.log('===============');
            items.forEach((item, index) => {
                console.log(`${index + 1}. ${item.item_name}`);
                console.log(`   Quantity: ${item.quantity}`);
                console.log(`   Unit Price: $${item.unit_price || 'N/A'}`);
                console.log(`   Line Total: $${item.line_total}`);
                console.log(`   Confidence: ${item.confidence_score || 'N/A'}`);
                console.log('');
            });

            // Show raw OCR text if available
            if (receipt.ocr_raw_text) {
                console.log('📄 RAW OCR TEXT:');
                console.log('=================');
                console.log(receipt.ocr_raw_text);
            }

            // Show processed LLM data (JSON)
            if (receipt.llm_processed_data) {
                console.log('\n🤖 PROCESSED JSON DATA:');
                console.log('========================');
                console.log(JSON.stringify(receipt.llm_processed_data, null, 2));
            }

            return { receipt, items };
            
        } catch (error) {
            console.error('❌ Failed to get receipt details:', error.response?.data || error.message);
            return null;
        }
    }

    async exportReceiptData(receiptId, format = 'json') {
        console.log(`\n💾 Exporting receipt data in ${format} format...`);
        
        const data = await this.getReceiptDetails(receiptId);
        if (!data) return;

        const exportData = {
            receipt: data.receipt,
            items: data.items,
            exported_at: new Date().toISOString(),
            export_format: format
        };

        // Save to file
        const fs = require('fs');
        const filename = `receipt_${receiptId}_${Date.now()}.${format}`;
        
        if (format === 'json') {
            fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
        } else if (format === 'csv') {
            // Convert to CSV format
            const csv = this.convertToCSV(data.items);
            fs.writeFileSync(filename.replace('.csv', '_items.csv'), csv);
        }

        console.log(`✅ Data exported to: ${filename}`);
        return filename;
    }

    convertToCSV(items) {
        const headers = ['item_name', 'quantity', 'unit_price', 'line_total', 'confidence_score'];
        const csvRows = [headers.join(',')];
        
        items.forEach(item => {
            const row = [
                `"${item.item_name}"`,
                item.quantity,
                item.unit_price || 0,
                item.line_total,
                item.confidence_score || 0
            ];
            csvRows.push(row.join(','));
        });
        
        return csvRows.join('\n');
    }
}

async function main() {
    console.log('🔍 OCR Data Viewer');
    console.log('==================\n');

    const viewer = new OCRDataViewer();
    
    // Authenticate
    const authenticated = await viewer.authenticate();
    if (!authenticated) return;

    // Get all receipts
    const receipts = await viewer.getAllReceipts();
    if (receipts.length === 0) {
        console.log('No receipts found. Process a receipt first using test-ocr.js');
        return;
    }

    // Get details for the most recent receipt
    const latestReceipt = receipts[0];
    console.log(`\n📋 Showing details for latest receipt: ${latestReceipt.id}`);
    
    const details = await viewer.getReceiptDetails(latestReceipt.id);
    
    // Export the data
    if (details) {
        await viewer.exportReceiptData(latestReceipt.id, 'json');
        await viewer.exportReceiptData(latestReceipt.id, 'csv');
    }

    console.log('\n✅ OCR data viewing complete!');
    console.log('\n📝 Available API Endpoints:');
    console.log('   GET /receipts - List all receipts');
    console.log('   GET /receipts/:id - Get receipt details + items');
    console.log('   GET /receipts/:id/status - Get processing status');
    console.log('   GET /analytics/spending - Get spending analytics');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = OCRDataViewer;