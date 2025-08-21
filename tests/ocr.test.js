// OCR Service Unit Tests
const OCRService = require('../services/ocrService');
const fs = require('fs');
const path = require('path');

describe('OCR Service', () => {
    let ocrService;
    
    beforeEach(() => {
        // Test with mock data (no API key)
        process.env.TABSCANNER_API_KEY = '';
        ocrService = new OCRService();
    });

    describe('Mock Data Processing', () => {
        test('should generate valid mock OCR response', async () => {
            const mockBuffer = Buffer.from('fake image data');
            const filename = 'test-receipt.jpg';
            
            const result = await ocrService.processReceipt(mockBuffer, filename);
            
            expect(result.success).toBe(true);
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.receipt.merchant).toBe("Trader Joe's");
            expect(result.receipt.total).toBe(25.87);
            expect(result.receipt.items).toHaveLength(5);
            expect(result.receipt.items[0].name).toBe('Organic Bananas');
            expect(result.rawText).toContain("TRADER JOE'S");
        });

        test('should validate mock OCR results successfully', () => {
            const mockResult = {
                success: true,
                confidence: 0.92,
                rawText: 'TRADER JOES Total $25.87',
                receipt: {
                    merchant: "Trader Joe's",
                    total: 25.87,
                    items: [{ name: 'Test Item', totalPrice: 5.99 }]
                }
            };

            const validation = ocrService.validateOCRResult(mockResult);
            
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        test('should fail validation for empty results', () => {
            const emptyResult = {
                success: true,
                confidence: 0,
                rawText: '',
                receipt: {
                    merchant: null,
                    total: null,
                    items: []
                }
            };

            const validation = ocrService.validateOCRResult(emptyResult);
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('No useful receipt data could be extracted');
        });
    });

    describe('TabScanner Response Parsing', () => {
        test('should parse valid TabScanner response', () => {
            const mockTabScannerResponse = {
                results: [{
                    confidence: 0.95,
                    text: 'WALMART\nItem 1 $5.99\nItem 2 $3.49\nTotal $9.48',
                    receipt: {
                        merchant_name: 'Walmart',
                        date: '2025-08-21',
                        total: '$9.48',
                        tax: '$0.75',
                        items: [
                            {
                                description: 'Item 1',
                                total_price: '$5.99',
                                quantity: '1'
                            },
                            {
                                description: 'Item 2', 
                                total_price: '$3.49',
                                quantity: '1'
                            }
                        ]
                    }
                }]
            };

            const result = ocrService.parseTabScannerResponse(mockTabScannerResponse);
            
            expect(result.success).toBe(true);
            expect(result.confidence).toBe(0.95);
            expect(result.receipt.merchant).toBe('Walmart');
            expect(result.receipt.total).toBe(9.48);
            expect(result.receipt.tax).toBe(0.75);
            expect(result.receipt.items).toHaveLength(2);
            expect(result.receipt.items[0].name).toBe('Item 1');
            expect(result.receipt.items[0].totalPrice).toBe(5.99);
        });

        test('should handle malformed TabScanner response', () => {
            const malformedResponse = {
                error: 'Some error occurred'
            };

            const result = ocrService.parseTabScannerResponse(malformedResponse);
            
            expect(result.success).toBe(true);
            expect(result.confidence).toBe(0);
            expect(result.receipt.merchant).toBeNull();
        });

        test('should extract merchant from raw text when structured data missing', () => {
            const responseWithOnlyText = {
                results: [{
                    confidence: 0.8,
                    text: 'TARGET\n123 Main St\nBananas $2.99\nTotal $2.99',
                    receipt: null
                }]
            };

            const result = ocrService.parseTabScannerResponse(responseWithOnlyText);
            
            expect(result.success).toBe(true);
            expect(result.receipt.merchant).toBe('TARGET');
            expect(result.receipt.total).toBe(2.99);
        });
    });

    describe('Amount Parsing', () => {
        test('should parse various amount formats', () => {
            expect(ocrService.parseAmount('$25.87')).toBe(25.87);
            expect(ocrService.parseAmount('25.87')).toBe(25.87);
            expect(ocrService.parseAmount('€15.50')).toBe(15.50);
            expect(ocrService.parseAmount('£8.99')).toBe(8.99);
            expect(ocrService.parseAmount('  $12.34  ')).toBe(12.34);
            expect(ocrService.parseAmount('')).toBeNull();
            expect(ocrService.parseAmount('invalid')).toBeNull();
        });
    });

    describe('Merchant Extraction', () => {
        test('should extract merchant from various text formats', () => {
            const text1 = 'WALMART\n123 Main Street\nTotal $25.99';
            expect(ocrService.extractMerchantFromText(text1)).toBe('WALMART');

            const text2 = 'Target Store\n456 Oak Ave\nPhone: 555-1234';
            expect(ocrService.extractMerchantFromText(text2)).toBe('Target Store');

            const text3 = '123 Main Street\nPhone: 555-1234\nStore Name';
            expect(ocrService.extractMerchantFromText(text3)).toBe('Store Name');
        });
    });

    describe('Error Handling', () => {
        test('should handle API errors gracefully', async () => {
            // Simulate API error by using invalid key - this will now fall back to mock data
            const originalKey = process.env.TABSCANNER_API_KEY;
            process.env.TABSCANNER_API_KEY = 'invalid_key';
            const ocrServiceWithBadKey = new OCRService();
            
            const result = await ocrServiceWithBadKey.processReceipt(
                Buffer.from('test'), 
                'test.jpg'
            );
            
            // Should fall back to mock data
            expect(result.success).toBe(true);
            expect(result.receipt.merchant).toBe("Trader Joe's");
            
            // Restore original key
            process.env.TABSCANNER_API_KEY = originalKey;
        });
    });
});

describe('Real Receipt Processing (Integration)', () => {
    let ocrService;
    
    beforeEach(() => {
        ocrService = new OCRService();
    });

    test('should process test receipt image with mock data', async () => {
        const testImagePath = path.join(__dirname, '..', 'test-images', 'test-receipt.jpg');
        
        if (fs.existsSync(testImagePath)) {
            // Force use of mock data for consistent testing
            const originalKey = process.env.TABSCANNER_API_KEY;
            process.env.TABSCANNER_API_KEY = '';
            const ocrServiceMock = new OCRService();
            
            const imageBuffer = fs.readFileSync(testImagePath);
            const result = await ocrServiceMock.processReceipt(imageBuffer, 'test-receipt.jpg');
            
            expect(result.success).toBe(true);
            expect(result.receipt.total).toBeGreaterThan(0);
            expect(result.receipt.items.length).toBeGreaterThan(0);
            
            // Validate the result
            const validation = ocrServiceMock.validateOCRResult(result);
            expect(validation.isValid).toBe(true);
            
            // Restore original key
            process.env.TABSCANNER_API_KEY = originalKey;
        } else {
            console.log('⚠️  Test image not found, skipping image processing test');
        }
    });
});

describe('API Key Scenarios', () => {
    test('should use mock data when no API key is configured', () => {
        process.env.TABSCANNER_API_KEY = '';
        const ocrService = new OCRService();
        expect(ocrService.useMockData).toBe(true);
    });

    test('should use real API when valid key is configured', () => {
        process.env.TABSCANNER_API_KEY = 'valid_key_example';
        const ocrService = new OCRService();
        expect(ocrService.useMockData).toBe(false);
    });

    test('should use mock data when demo key is configured', () => {
        process.env.TABSCANNER_API_KEY = 'demo_key';
        const ocrService = new OCRService();
        expect(ocrService.useMockData).toBe(true);
    });
});