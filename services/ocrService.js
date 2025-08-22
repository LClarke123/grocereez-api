// services/ocrService.js - TabScanner OCR Integration with Debug Logging
const axios = require('axios');
const FormData = require('form-data');

class OCRService {
  constructor() {
    this.apiKey = process.env.TABSCANNER_API_KEY;
    this.baseURL = 'https://api.tabscanner.com/api/2/process';
    
    if (!this.apiKey) {
      throw new Error('TABSCANNER_API_KEY environment variable is required');
    }
    
    console.log('OCRService: TabScanner API initialized with key:', this.apiKey.substring(0, 10) + '...');
  }

  /**
   * Process receipt image using TabScanner OCR
   * @param {Buffer} imageBuffer - Image file buffer
   * @param {string} filename - Original filename
   * @returns {Promise<Object>} OCR results
   */
  async processReceipt(imageBuffer, filename) {
    console.log('OCRService: Starting TabScanner API processing for file:', filename);
    console.log('OCRService: Image buffer size:', imageBuffer.length, 'bytes');

    try {
      // Step 1: Upload receipt for processing
      console.log('OCRService: Step 1 - Uploading receipt to TabScanner...');
      
      const formData = new FormData();
      formData.append('file', imageBuffer, {
        filename: filename,
        contentType: 'image/jpeg'
      });
      formData.append('documentType', 'receipt');
      
      const uploadResponse = await axios.post(this.baseURL, formData, {
        headers: {
          'apikey': this.apiKey, // Use correct header name (lowercase)
          ...formData.getHeaders()
        },
        timeout: 30000,
        maxContentLength: 10 * 1024 * 1024,
      });

      console.log('OCRService: Upload response:', uploadResponse.data);

      if (!uploadResponse.data.success || !uploadResponse.data.token) {
        throw new Error(`Upload failed: ${uploadResponse.data.message || 'Unknown error'}`);
      }

      const token = uploadResponse.data.token;
      console.log('OCRService: Upload successful, token:', token);

      // Step 2: Poll for results
      console.log('OCRService: Step 2 - Polling for processing results...');
      
      const resultUrl = `https://api.tabscanner.com/api/result/${token}`;
      let attempts = 0;
      const maxAttempts = 20; // Try for up to 60 seconds
      
      while (attempts < maxAttempts) {
        attempts++;
        
        // Wait before checking (except first attempt)
        if (attempts > 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        console.log(`OCRService: Checking results (attempt ${attempts}/${maxAttempts})...`);
        
        const resultResponse = await axios.get(resultUrl, {
          headers: { 'apikey': this.apiKey },
          timeout: 15000
        });
        
        const data = resultResponse.data;
        console.log(`OCRService: Result status: ${data.status}`);
        
        if (data.status === 'done' && data.result) {
          console.log('OCRService: Processing complete! Parsing results...');
          return this.parseTabScannerResponse(data);
        } else if (data.status === 'pending') {
          console.log('OCRService: Still processing, waiting...');
          continue;
        } else if (data.status === 'error' || data.status === 'failed') {
          throw new Error(`Processing failed: ${data.message || 'Unknown error'}`);
        }
      }
      
      throw new Error('Processing timeout - results not available after polling');
      
    } catch (error) {
      console.error('OCRService: TabScanner API error:', error.message);
      
      if (error.response) {
        console.error('OCRService: API Error Status:', error.response.status);
        console.error('OCRService: API Error Data:', error.response.data);
      }
      
      // Don't fall back to mock data - throw the error so it can be handled properly
      throw error;
    }
  }


  /**
   * Parse TabScanner response into standardized format
   * @param {Object} tabScannerData - Raw TabScanner response
   * @returns {Object} Standardized OCR results
   */
  parseTabScannerResponse(tabScannerData) {
    console.log('OCRService: Parsing TabScanner response...');
    
    try {
      const result = {
        success: true,
        confidence: 0,
        rawText: '',
        receipt: {
          merchant: null,
          address: null,
          phone: null,
          date: null,
          time: null,
          total: null,
          tax: null,
          subtotal: null,
          items: []
        },
        rawData: tabScannerData
      };

      // TabScanner returns data in .result object (not .results array)
      if (tabScannerData.result) {
        console.log('OCRService: Processing TabScanner result data');
        const receipt = tabScannerData.result;
        
        // Extract merchant information
        result.receipt.merchant = receipt.establishment || null;
        result.receipt.address = receipt.address || null;
        result.receipt.phone = receipt.phoneNumber || null;
        
        console.log('OCRService: Extracted merchant:', result.receipt.merchant);
        console.log('OCRService: Extracted address:', result.receipt.address);
        
        // Extract date and time
        result.receipt.date = receipt.dateISO ? receipt.dateISO.split('T')[0] : receipt.date;
        result.receipt.time = receipt.dateISO ? receipt.dateISO.split('T')[1] : null;
        
        console.log('OCRService: Extracted date:', result.receipt.date);
        
        // Extract financial information
        result.receipt.total = this.parseAmount(receipt.total) || 0;
        result.receipt.tax = this.parseAmount(receipt.tax) || 0;
        result.receipt.subtotal = this.parseAmount(receipt.subTotal) || 0;
        
        console.log('OCRService: Extracted totals - Total:', result.receipt.total, 'Tax:', result.receipt.tax, 'Subtotal:', result.receipt.subtotal);
        
        // Extract line items
        if (receipt.lineItems && Array.isArray(receipt.lineItems)) {
          console.log('OCRService: Processing', receipt.lineItems.length, 'line items');
          result.receipt.items = receipt.lineItems
            .filter(item => item.descClean && item.lineTotal) // Only include items with description and price
            .map(item => ({
              name: item.descClean || item.desc || 'Unknown Item',
              quantity: parseFloat(item.qty) || 1,
              unitPrice: this.parseAmount(item.price) || null,
              totalPrice: this.parseAmount(item.lineTotal) || 0,
              category: null, // TabScanner doesn't provide categories
              confidence: 1.0 // Default confidence for TabScanner results
            }));
          
          console.log('OCRService: Processed', result.receipt.items.length, 'valid line items');
        }
        
        // Set confidence scores based on TabScanner's confidence fields
        const confidenceScores = [
          receipt.establishmentConfidence,
          receipt.totalConfidence,
          receipt.dateConfidence
        ].filter(score => score !== undefined);
        
        if (confidenceScores.length > 0) {
          result.confidence = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
        } else {
          result.confidence = 0.9; // Default high confidence for successful TabScanner results
        }
        
        console.log('OCRService: Overall confidence score:', result.confidence);
        
        // Create a summary raw text from the extracted data
        result.rawText = this.generateRawTextSummary(result.receipt);
        
      } else {
        console.log('OCRService: No result data found in TabScanner response');
        result.success = false;
      }

      console.log('OCRService: Final parsed result summary:');
      console.log('  - Success:', result.success);
      console.log('  - Confidence:', result.confidence);
      console.log('  - Merchant:', result.receipt.merchant);
      console.log('  - Total:', result.receipt.total);
      console.log('  - Items:', result.receipt.items.length);

      return result;
      
    } catch (error) {
      console.error('OCRService: Error parsing TabScanner response:', error);
      return {
        success: false,
        error: 'Failed to parse OCR response',
        confidence: 0,
        rawText: '',
        rawData: tabScannerData
      };
    }
  }

  /**
   * Generate a raw text summary from parsed receipt data
   * @param {Object} receipt - Parsed receipt data
   * @returns {string} Raw text summary
   */
  generateRawTextSummary(receipt) {
    let text = '';
    
    if (receipt.merchant) {
      text += `${receipt.merchant}\n`;
    }
    
    if (receipt.address) {
      text += `${receipt.address}\n`;
    }
    
    if (receipt.phone) {
      text += `Phone: ${receipt.phone}\n`;
    }
    
    text += '\n';
    
    if (receipt.date) {
      text += `Date: ${receipt.date}\n`;
    }
    
    text += '\n';
    
    // Add items
    if (receipt.items && receipt.items.length > 0) {
      receipt.items.forEach(item => {
        const qty = item.quantity > 1 ? `${item.quantity}x ` : '';
        text += `${qty}${item.name}${item.totalPrice ? ` $${item.totalPrice.toFixed(2)}` : ''}\n`;
      });
    }
    
    text += '\n';
    
    if (receipt.subtotal) {
      text += `Subtotal: $${receipt.subtotal.toFixed(2)}\n`;
    }
    
    if (receipt.tax) {
      text += `Tax: $${receipt.tax.toFixed(2)}\n`;
    }
    
    if (receipt.total) {
      text += `Total: $${receipt.total.toFixed(2)}\n`;
    }
    
    return text;
  }

  /**
   * Parse monetary amount from string
   * @param {string|number} amount - Amount to parse
   * @returns {number|null} Parsed amount or null
   */
  parseAmount(amount) {
    if (!amount) return null;
    
    // Convert to string and remove currency symbols and spaces
    const cleanAmount = String(amount)
      .replace(/[$€£¥₹]/g, '')
      .replace(/[^\d.-]/g, '');
    
    const parsed = parseFloat(cleanAmount);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Extract merchant name from raw text using patterns
   * @param {string} text - Raw OCR text
   * @returns {string|null} Merchant name
   */
  extractMerchantFromText(text) {
    if (!text) return null;
    
    // Common patterns for merchant names (first few lines, uppercase, etc.)
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Usually merchant name is in the first few lines
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i];
      // Skip lines that look like addresses, phone numbers, or dates
      if (!/\d{3,}/.test(line) && !/^\d+\s+\w+/.test(line) && line.length > 2) {
        return line;
      }
    }
    
    return null;
  }

  /**
   * Extract basic information from raw text when structured data isn't available
   * @param {Object} result - Result object to populate
   */
  extractFromRawText(result) {
    const text = result.rawText;
    if (!text) return;

    console.log('OCRService: Extracting data from raw text...');

    // Extract total amount (look for patterns like "TOTAL $XX.XX")
    const totalMatch = text.match(/total[:\s]*\$?(\d+\.?\d*)/i);
    if (totalMatch) {
      result.receipt.total = parseFloat(totalMatch[1]);
      console.log('OCRService: Extracted total from text:', result.receipt.total);
    }

    // Extract tax amount
    const taxMatch = text.match(/tax[:\s]*\$?(\d+\.?\d*)/i);
    if (taxMatch) {
      result.receipt.tax = parseFloat(taxMatch[1]);
      console.log('OCRService: Extracted tax from text:', result.receipt.tax);
    }

    // Extract date (various formats)
    const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
    if (dateMatch) {
      result.receipt.date = dateMatch[1];
      console.log('OCRService: Extracted date from text:', result.receipt.date);
    }

    // Extract merchant name
    result.receipt.merchant = this.extractMerchantFromText(text);
    console.log('OCRService: Extracted merchant from text:', result.receipt.merchant);
  }

  /**
   * Validate OCR results and check for minimum required data
   * @param {Object} ocrResult - OCR processing result
   * @returns {Object} Validation result
   */
  validateOCRResult(ocrResult) {
    console.log('OCRService: Validating OCR result...');
    
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (!ocrResult.success) {
      validation.isValid = false;
      validation.errors.push('OCR processing failed');
      console.log('OCRService: Validation failed - OCR processing failed');
      return validation;
    }

    // Check confidence threshold
    if (ocrResult.confidence < 0.5) {
      validation.warnings.push('Low OCR confidence score');
      console.log('OCRService: Warning - Low confidence score:', ocrResult.confidence);
    }

    // More lenient validation for development
    const hasTotal = ocrResult.receipt.total && ocrResult.receipt.total > 0;
    const hasMerchant = ocrResult.receipt.merchant && ocrResult.receipt.merchant.trim().length > 0;
    const hasRawText = ocrResult.rawText && ocrResult.rawText.length > 10;
    const hasItems = ocrResult.receipt.items && ocrResult.receipt.items.length > 0;

    console.log('OCRService: Validation checks:');
    console.log('  - Has total:', hasTotal, '(value:', ocrResult.receipt.total, ')');
    console.log('  - Has merchant:', hasMerchant, '(value:', ocrResult.receipt.merchant, ')');
    console.log('  - Has raw text:', hasRawText, '(length:', ocrResult.rawText?.length, ')');
    console.log('  - Has items:', hasItems, '(count:', ocrResult.receipt.items?.length, ')');

    // Only fail if we have absolutely no useful data
    if (!hasTotal && !hasMerchant && !hasRawText && !hasItems) {
      validation.isValid = false;
      validation.errors.push('No useful receipt data could be extracted');
      console.log('OCRService: Validation failed - No useful data extracted');
    } else {
      // Add warnings for missing data but don't fail
      if (!hasTotal) {
        validation.warnings.push('No monetary amounts detected');
      }
      if (!hasMerchant) {
        validation.warnings.push('Merchant name not found');
      }
      if (!hasItems) {
        validation.warnings.push('No line items extracted');
      }
      console.log('OCRService: Validation passed with', validation.warnings.length, 'warnings');
    }

    console.log('OCRService: Final validation result:', {
      isValid: validation.isValid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length
    });

    return validation;
  }
}

module.exports = OCRService;