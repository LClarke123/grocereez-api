# ⚙️ Core Services

This folder contains the core business logic services for the GroceryPal API.

## 🔍 OCR Processing

### `ocrService.js`
- **TabScanner API Integration**
- Handles receipt image processing through OCR
- Features:
  - Real-time image upload and processing
  - Polling mechanism for async results
  - Confidence scoring and error handling
  - Support for various image formats

**Key Methods:**
```javascript
const ocrService = new OCRService();

// Process receipt image
const result = await ocrService.processReceipt(imageBuffer, filename);

// Result includes:
// - Raw OCR text
// - Structured receipt data (items, totals, dates)
// - Confidence scores
// - Merchant information
```

**Configuration:**
- Requires `TABSCANNER_API_KEY` in environment
- API endpoint: `https://api.tabscanner.com/api/2/process`
- Supports mock data mode for development

## 🤖 AI Data Enhancement

### `aiDataParser.js`
- **AI-Powered Data Intelligence**
- Transforms raw OCR into structured, categorized data
- Features:
  - Product categorization and dietary tagging
  - Store information enhancement
  - Shopping insights generation
  - Rule-based fallbacks when AI unavailable

**Key Methods:**
```javascript
const aiParser = new AIDataParser();

// Parse and enhance receipt data
const enhancedData = await aiParser.parseReceiptData(rawReceiptData);

// Enhanced data includes:
// - Normalized store information
// - Categorized items with dietary tags
// - Shopping insights (health scores, patterns)
// - Quality metrics and confidence scores
```

**AI Features:**
- OpenAI integration for intelligent categorization
- Fallback rule-based processing
- Product catalog building
- Shopping pattern analysis

## 🔄 Data Flow

```
Receipt Image → ocrService.js → Raw JSON Data
                                      ↓
Raw JSON Data → aiDataParser.js → Enhanced Structured Data
                                      ↓
Enhanced Data → Database Storage → Queryable Records
```

## 🛠️ Integration Example

```javascript
// Complete processing workflow
const OCRService = require('./services/ocrService');
const AIDataParser = require('./services/aiDataParser');

const ocrService = new OCRService();
const aiParser = new AIDataParser();

// 1. Process image through OCR
const ocrResult = await ocrService.processReceipt(imageBuffer, 'receipt.jpg');

// 2. Enhance with AI
const enhancedData = await aiParser.parseReceiptData({
    tabscanner_full_response: ocrResult.rawData,
    receipt_info: {
        store_name: ocrResult.receipt.merchant,
        total_amount: ocrResult.receipt.total
    }
});

// 3. Store in database (handled by database/ scripts)
```

## 🎯 Service Capabilities

### OCR Service (`ocrService.js`):
- ✅ **TabScanner API Integration**: Real OCR processing
- ✅ **Image Format Support**: JPG, PNG, PDF support
- ✅ **Async Processing**: Upload → Poll → Results workflow
- ✅ **Error Handling**: Robust error recovery
- ✅ **Confidence Metrics**: Quality assessment

### AI Parser (`aiDataParser.js`):
- ✅ **Product Intelligence**: Automatic categorization
- ✅ **Store Normalization**: Brand standardization
- ✅ **Shopping Insights**: Pattern recognition
- ✅ **Quality Assessment**: Confidence scoring
- ✅ **Fallback Processing**: Rule-based backup

## 🔧 Configuration

Both services require environment variables:

```env
# OCR Service
TABSCANNER_API_KEY=your-api-key

# AI Parser (optional for enhanced features)
OPENAI_API_KEY=your-openai-key
```

## 📊 Performance

- **OCR Processing**: ~3-5 seconds per receipt
- **AI Enhancement**: ~2-4 seconds per receipt  
- **Combined Workflow**: ~5-9 seconds total
- **Confidence Scores**: 85-95% typical range

These services form the core intelligence of the receipt processing system, transforming raw images into structured, queryable business data.