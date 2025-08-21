# 🛠️ Utility Scripts

This folder contains utility scripts for maintenance, debugging, and data operations.

## 🔧 Database Utilities

### `create-enhanced-schema.js`
- **Creates AI-enhanced database tables**
- Sets up tables for intelligent data processing
- Includes proper indexing and relationships
- **Usage**: `node create-enhanced-schema.js`

### `migrate.js`
- **Database migration script**
- Handles schema updates and data migrations
- **Usage**: `node migrate.js`

## 🔍 Data Inspection & Debugging

### `check-receipts.js`
- **Inspects existing receipt data**
- Shows receipt count, data structure, and completeness
- Useful for debugging data issues
- **Usage**: `node check-receipts.js`

### `debug-data-structure.js`
- **Analyzes OCR data structure**
- Shows actual vs expected data formats
- Helps debug parsing issues
- **Usage**: `node debug-data-structure.js`

### `debug-tabscanner-response.js`
- **Debug TabScanner API responses**
- Analyzes OCR API response format
- Troubleshoot OCR integration issues
- **Usage**: `node debug-tabscanner-response.js`

### `view-ocr-data.js`
- **View processed OCR data**
- Display receipt OCR results in readable format
- Compare raw text vs structured data
- **Usage**: `node view-ocr-data.js`

## 📊 Data Management

### `database-queries.js`
- **Collection of useful database queries**
- Pre-built queries for common operations
- Analysis and reporting queries
- **Usage**: `node database-queries.js`

## 🚀 Quick Operations

```bash
# Check what receipts you have
node scripts/check-receipts.js

# Set up enhanced database
node scripts/create-enhanced-schema.js

# Debug data structure issues
node scripts/debug-data-structure.js

# View OCR results
node scripts/view-ocr-data.js

# Run database queries
node scripts/database-queries.js
```

## 🔄 Common Workflows

### Database Setup:
1. `create-enhanced-schema.js` - Create tables
2. `check-receipts.js` - Verify existing data
3. Run main processing scripts

### Debugging Issues:
1. `debug-data-structure.js` - Check data format
2. `debug-tabscanner-response.js` - Check OCR responses
3. `view-ocr-data.js` - Examine processed data
4. `check-receipts.js` - Verify database state

### Data Analysis:
1. `check-receipts.js` - Data overview
2. `database-queries.js` - Run analysis queries
3. Export results for further analysis

## ⚡ Script Categories

| Category | Scripts | Purpose |
|----------|---------|---------|
| **Setup** | `create-enhanced-schema.js`, `migrate.js` | Database initialization |
| **Debug** | `debug-*.js`, `view-ocr-data.js` | Troubleshooting |
| **Analysis** | `check-receipts.js`, `database-queries.js` | Data inspection |

## 🔗 Dependencies

These scripts require:
- Database connection configured
- Node.js environment
- Proper environment variables in `.env`

Most scripts are standalone and can be run independently for specific tasks.