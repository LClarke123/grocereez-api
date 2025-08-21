# 🛒 GroceryPal Receipt OCR API

A comprehensive receipt processing system that transforms receipt images into structured, queryable database records using TabScanner OCR and AI-powered data enhancement.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your database and API credentials
   ```

3. **Start the server:**
   ```bash
   npm start
   # or
   node server.js
   ```

## 📁 Project Structure

```
grocerypal-api/
├── 📄 server.js              # Main Express API server
├── 📄 package.json           # Dependencies and scripts
├── 📄 .env                   # Environment variables
│
├── 📂 services/              # Core business logic
│   ├── ocrService.js         # TabScanner OCR integration
│   └── aiDataParser.js       # AI-powered data enhancement
│
├── 📂 database/              # Database operations
│   ├── schema.sql            # Original database schema
│   ├── enhanced-schema.sql   # AI-enhanced tables
│   ├── create-custom-database.sql # Custom field mapping tables
│   ├── ai-data-processor.js  # AI enhancement orchestrator
│   ├── custom-field-mapper.js # Custom field extraction
│   ├── database-access-guide.js # Database query examples
│   ├── insert-custom-data.js # Custom data insertion
│   └── query-db.js           # Command-line query tool
│
├── 📂 scripts/               # Utility scripts
│   ├── check-receipts.js     # Receipt data inspection
│   ├── create-enhanced-schema.js # Schema creation
│   ├── debug-data-structure.js # Data debugging
│   ├── view-ocr-data.js      # OCR data viewer
│   └── migrate.js            # Database migrations
│
├── 📂 examples/              # Demo and example scripts
│   ├── demo-ai-system.js     # AI system demonstration
│   ├── demo-custom-mapping.js # Custom field mapping demo
│   └── test-single-receipt.js # Single receipt testing
│
├── 📂 exports/               # Generated data exports
│   ├── ai_enhanced_receipts_*.json # AI-enhanced exports
│   ├── custom_mapped_receipt_*.json # Custom mapped data
│   └── receipt_*.json        # Raw receipt exports
│
├── 📂 docs/                  # Documentation
│   ├── CLAUDE.md             # Development guide
│   ├── DATABASE_ACCESS_SUMMARY.md # Database access guide
│   ├── OCR_DATA_ACCESS_GUIDE.md # OCR data guide
│   ├── TABSCANNER_SUCCESS.md # OCR integration notes
│   └── TEST_RESULTS.md       # Testing documentation
│
├── 📂 test-images/           # Test receipt images
│   └── test-receipt.jpg      # Sample receipt for testing
│
├── 📂 tests/                 # Unit tests
│   └── ocr.test.js           # OCR service tests
│
└── 📂 temp-files/            # Temporary and debug files
    └── (development artifacts)
```

## ⚡ Core Features

### 🔍 Receipt OCR Processing
- **TabScanner API Integration**: High-accuracy OCR for receipt images
- **Real-time Processing**: Upload → Poll → Results workflow
- **Confidence Scoring**: Quality metrics for OCR results

### 🤖 AI Data Enhancement
- **Intelligent Parsing**: Transforms raw OCR into structured data
- **Product Categorization**: Automatic item classification
- **Store Normalization**: Brand name standardization
- **Shopping Insights**: AI-generated purchasing patterns

### 🗄️ Database Storage
- **Multiple Schemas**: Original, AI-enhanced, and custom field mapping
- **Structured Data**: Clean, queryable receipt and item records  
- **Type Codes**: Categorized items (PANTRY, DAIRY, PRODUCE, etc.)
- **Address Parsing**: Separated street, city, state, zip fields

## 🛠️ API Endpoints

### Receipt Processing
```http
POST /api/receipts/upload
Content-Type: multipart/form-data

# Upload receipt image for OCR processing
```

### Data Access
```http
GET /api/receipts
# Get all processed receipts

GET /api/receipts/:id
# Get specific receipt with items

GET /api/receipts/:id/items
# Get items for a receipt
```

## 🗃️ Database Access

### Quick Queries
```bash
# View all receipts
node database/query-db.js "SELECT * FROM custom_receipts;"

# Items by category
node database/query-db.js "SELECT item_type_code, COUNT(*) FROM custom_receipt_items GROUP BY item_type_code;"

# Complete access guide
node database/database-access-guide.js
```

### Custom Field Structure
Your receipts are stored with these exact fields:
- `brand_name` - Normalized store name
- `street_number`, `street_name`, `city`, `state`, `zipcode` - Parsed address
- `date_field`, `time_field` - Transaction date/time
- `tax_field_1`, `tax_field_2` - Separate tax amounts
- `total_price_field` - Receipt total

## 🎯 Usage Examples

### Process a Receipt
```javascript
const OCRService = require('./services/ocrService');
const ocrService = new OCRService();

const result = await ocrService.processReceipt(imageBuffer, 'receipt.jpg');
console.log('OCR Result:', result);
```

### AI Enhancement
```javascript
const AIDataProcessor = require('./database/ai-data-processor');
const processor = new AIDataProcessor();

await processor.processAllRawReceipts();
```

### Custom Field Mapping
```javascript
const CustomFieldMapper = require('./database/custom-field-mapper');
const mapper = new CustomFieldMapper();

const mappedData = mapper.mapToCustomStructure(tabscannerData);
```

## 🔧 Configuration

### Environment Variables
```env
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=your-jwt-secret
TABSCANNER_API_KEY=your-tabscanner-key
OPENAI_API_KEY=your-openai-key (optional)
NODE_ENV=development
PORT=3000
```

### Database Setup
```bash
# Create enhanced tables
node scripts/create-enhanced-schema.js

# Create custom field tables
node database/insert-custom-data.js
```

## 📊 Data Flow

1. **Image Upload** → TabScanner OCR → Raw JSON
2. **AI Enhancement** → Structured data with categories
3. **Custom Mapping** → Your specific field requirements
4. **Database Storage** → Queryable records

## 🧪 Testing

```bash
# Run OCR tests
npm test

# Test single receipt
node examples/test-single-receipt.js

# Demo AI system
node examples/demo-ai-system.js

# Demo custom mapping
node examples/demo-custom-mapping.js
```

## 📈 Current Status

- ✅ **TabScanner Integration**: Working with real API
- ✅ **AI Data Processing**: 92.7% average confidence
- ✅ **Custom Field Mapping**: All requested fields mapped
- ✅ **Database Storage**: Multiple schema options
- ✅ **Query Interface**: Command-line and programmatic access

## 📝 Recent Processing Results

- **Receipts Processed**: 2 from Trader Joes
- **Items Categorized**: 70 items across 6 type codes
- **Address Parsing**: Complete street/city/state/zip extraction
- **Data Quality**: 85%+ OCR confidence scores

## 🤝 Contributing

1. Check `docs/CLAUDE.md` for development setup
2. Review `docs/DATABASE_ACCESS_SUMMARY.md` for data structure
3. Use the provided scripts for testing and debugging

## 📞 Support

- **Database Issues**: Run `node database/database-access-guide.js`
- **OCR Problems**: Check `docs/TABSCANNER_SUCCESS.md`
- **API Testing**: See `docs/TEST_RESULTS.md`

---

**Built with**: Node.js, Express, PostgreSQL, TabScanner OCR, AI Enhancement