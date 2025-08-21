// test-ocr.js - Test script for OCR functionality with real receipt
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:3000';

class OCRTester {
  constructor() {
    this.authToken = null;
    this.testUser = {
      email: 'test@grocerypal.com',
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'User'
    };
  }

  async runAllTests() {
    console.log('Starting GroceryPal OCR Tests with Real Receipt\n');
    
    try {
      // Step 1: Register or login test user
      await this.setupTestUser();
      
      // Step 2: Test OCR with the real receipt
      await this.testReceiptUpload();
      
      // Step 3: Check processing status
      await this.checkProcessingStatus();
      
      // Step 4: View receipt data
      await this.viewReceiptData();
      
      // Step 5: Test analytics
      await this.testAnalytics();
      
      console.log('\nAll tests completed successfully!');
      
    } catch (error) {
      console.error('\nTest failed:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
    }
  }

  async setupTestUser() {
    console.log('Setting up test user...');
    
    try {
      // Try to register (will fail if user exists)
      const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, this.testUser);
      this.authToken = registerResponse.data.token;
      console.log('Test user registered successfully');
    } catch (error) {
      if (error.response?.status === 409) {
        // User exists, try to login
        console.log('User exists, logging in...');
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
          email: this.testUser.email,
          password: this.testUser.password
        });
        this.authToken = loginResponse.data.token;
        console.log('Logged in successfully');
      } else {
        throw error;
      }
    }
  }

  async testReceiptUpload() {
    console.log('\nTesting receipt upload with real receipt image...');
    
    // Use the real receipt image
    const testImagePath = await this.findReceiptImage();
    
    if (!fs.existsSync(testImagePath)) {
      throw new Error(`Receipt image not found at ${testImagePath}. Please ensure test-receipt.jpg exists in the test-images folder.`);
    }

    // Check if the file is actually an image
    const stats = fs.statSync(testImagePath);
    console.log(`Using receipt image: ${path.basename(testImagePath)} (${Math.round(stats.size / 1024)}KB)`);

    const formData = new FormData();
    formData.append('receipt', fs.createReadStream(testImagePath));

    try {
      console.log('Uploading receipt to TabScanner API...');
      const response = await axios.post(`${API_BASE_URL}/receipts/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          ...formData.getHeaders()
        },
        timeout: 60000 // 60 second timeout for OCR processing
      });

      this.receiptId = response.data.receipt.id;
      console.log('Receipt uploaded successfully');
      console.log(`Receipt ID: ${this.receiptId}`);
      console.log(`Status: ${response.data.receipt.status}`);

    } catch (error) {
      console.error('Receipt upload failed');
      if (error.response?.data) {
        console.error('Error details:', error.response.data);
      }
      throw error;
    }
  }

  async findReceiptImage() {
    const testDir = path.join(__dirname, 'test-images');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
    }
    
    // Look for the receipt image
    const receiptPath = path.join(testDir, 'test-receipt.jpg');
    
    if (fs.existsSync(receiptPath)) {
      console.log(`Found receipt image: ${receiptPath}`);
      return receiptPath;
    }
    
    // Also check for other common image formats
    const alternativeNames = [
      'test-receipt.jpeg',
      'test-receipt.png',
      'receipt.jpg',
      'receipt.jpeg',
      'receipt.png'
    ];
    
    for (const name of alternativeNames) {
      const altPath = path.join(testDir, name);
      if (fs.existsSync(altPath)) {
        console.log(`Found receipt image: ${altPath}`);
        return altPath;
      }
    }
    
    throw new Error(`No receipt image found in ${testDir}. Please add test-receipt.jpg to the test-images folder.`);
  }

  async checkProcessingStatus() {
    console.log('\nChecking OCR processing status...');
    
    // Wait for TabScanner processing
    console.log('Waiting for TabScanner API processing...');
    await this.sleep(5000); // Wait 5 seconds for OCR processing
    
    try {
      const response = await axios.get(`${API_BASE_URL}/receipts/${this.receiptId}/status`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      const receipt = response.data.receipt;
      console.log('\nProcessing Status:');
      console.log(`Status: ${receipt.status}`);
      console.log(`Uploaded: ${new Date(receipt.uploadedAt).toLocaleString()}`);
      console.log(`Processed: ${receipt.processedAt ? new Date(receipt.processedAt).toLocaleString() : 'Not yet processed'}`);
      console.log(`Total Amount: $${receipt.totalAmount || 'Not detected'}`);
      console.log(`Has Raw Text: ${receipt.hasRawText ? 'Yes' : 'No'}`);
      console.log(`Has Processed Data: ${receipt.hasProcessedData ? 'Yes' : 'No'}`);
      
      if (receipt.errors && receipt.errors.length > 0) {
        console.log(`Errors: ${receipt.errors.join(', ')}`);
      }

      // Show processing logs
      if (response.data.logs && response.data.logs.length > 0) {
        console.log('\nProcessing Logs:');
        response.data.logs.forEach(log => {
          const timestamp = new Date(log.created_at).toLocaleTimeString();
          console.log(`[${timestamp}] [${log.log_level.toUpperCase()}] ${log.message}`);
        });
      }

      // If still processing, wait and check again
      if (receipt.status === 'processing') {
        console.log('\nReceipt still processing, waiting...');
        await this.sleep(3000);
        return this.checkProcessingStatus();
      }

    } catch (error) {
      console.error('Failed to check processing status');
      throw error;
    }
  }

  async viewReceiptData() {
    console.log('\nViewing extracted receipt data...');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/receipts/${this.receiptId}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      const receipt = response.data.receipt;
      const items = response.data.items;

      console.log('\nReceipt Details (from TabScanner):');
      console.log(`Store: ${receipt.store_name || 'Unknown'}`);
      console.log(`Date: ${receipt.receipt_date || 'Not detected'}`);
      console.log(`Time: ${receipt.receipt_time || 'Not detected'}`);
      console.log(`Total: $${receipt.total_amount || 'Not detected'}`);
      console.log(`Tax: $${receipt.tax_amount || 'Not detected'}`);
      console.log(`Subtotal: $${receipt.subtotal_amount || 'Not detected'}`);
      console.log(`Items Count: ${items.length}`);

      if (items.length > 0) {
        console.log('\nExtracted Items:');
        items.forEach((item, index) => {
          console.log(`${index + 1}. ${item.item_name} - $${item.line_total} (qty: ${item.quantity})`);
        });
      } else {
        console.log('\nNo items extracted from receipt');
      }

      // Show raw OCR text if available
      if (receipt.ocr_raw_text) {
        console.log('\nRaw OCR Text (first 200 characters):');
        console.log(receipt.ocr_raw_text.substring(0, 200) + '...');
      }

    } catch (error) {
      console.error('Failed to view receipt details');
      throw error;
    }
  }

  async testAnalytics() {
    console.log('\nTesting analytics with real receipt data...');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/spending?period=30d`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      const analytics = response.data;
      console.log('\nSpending Summary (30 days):');
      console.log(`Total Spent: $${analytics.summary.total_spent}`);
      console.log(`Receipt Count: ${analytics.summary.receipt_count}`);
      console.log(`Average Receipt: $${Number(analytics.summary.avg_receipt_amount).toFixed(2)}`);

      if (analytics.byStore && analytics.byStore.length > 0) {
        console.log('\nSpending by Store:');
        analytics.byStore.forEach(store => {
          console.log(`${store.store_chain || 'Unknown Store'}: $${store.total_spent} (${store.visit_count} visits)`);
        });
      }

      if (analytics.byCategory && analytics.byCategory.length > 0) {
        console.log('\nSpending by Category:');
        analytics.byCategory.forEach(category => {
          console.log(`${category.category || 'Uncategorized'}: $${category.total_spent} (${category.item_count} items)`);
        });
      }

    } catch (error) {
      console.error('Failed to test analytics');
      console.error('Error details:', error.response?.data || error.message);
      throw error;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the tests
async function main() {
  console.log('GroceryPal OCR Test Suite');
  console.log('=========================');
  console.log('This test will process a real receipt through TabScanner API\n');
  
  const tester = new OCRTester();
  await tester.runAllTests();
}

// Handle command line execution
if (require.main === module) {
  main().catch(console.error);
}

module.exports = OCRTester;