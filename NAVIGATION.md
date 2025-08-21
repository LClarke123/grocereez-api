# 🧭 Project Navigation Guide

## 🚀 Quick Start Commands

```bash
# Start the API server
npm start

# View database access guide
npm run db-guide

# Run AI system demonstration
npm run demo-ai

# Check your processed data
npm run check-data

# Query database directly
npm run query "SELECT * FROM custom_receipts;"
```

## 📁 Folder Organization

### 🏠 **Root Level**
- `README.md` - Main project documentation
- `server.js` - Express API server
- `package.json` - Dependencies and npm scripts
- `.env` - Environment configuration

### ⚙️ **Core Application** (`/services/`)
- `ocrService.js` - TabScanner OCR integration
- `aiDataParser.js` - AI data enhancement
- **Purpose**: Core business logic for receipt processing

### 🗄️ **Database Operations** (`/database/`)
- `query-db.js` - Command-line database queries
- `database-access-guide.js` - Complete access tutorial
- `custom-field-mapper.js` - Your specific field mapping
- `ai-data-processor.js` - AI enhancement orchestrator
- **Purpose**: All database interactions and data processing

### 🎯 **Examples & Demos** (`/examples/`)
- `demo-ai-system.js` - AI capabilities showcase
- `demo-custom-mapping.js` - Custom field mapping demo
- `test-single-receipt.js` - Single receipt debugging
- **Purpose**: Working examples and demonstrations

### 🛠️ **Utility Scripts** (`/scripts/`)
- `check-receipts.js` - Data inspection
- `create-enhanced-schema.js` - Database setup
- `debug-*.js` - Troubleshooting tools
- **Purpose**: Maintenance and debugging utilities

### 📚 **Documentation** (`/docs/`)
- `DATABASE_ACCESS_SUMMARY.md` - Database guide
- `CLAUDE.md` - Development setup
- `TABSCANNER_SUCCESS.md` - OCR integration notes
- **Purpose**: Project documentation and guides

### 📦 **Generated Data** (`/exports/`)
- JSON exports from processing
- CSV files for analysis
- **Purpose**: Output files from data processing

### 🧪 **Development** (`/tests/`, `/temp-files/`)
- Unit tests and temporary development files
- **Purpose**: Testing and development artifacts

## 🎯 Common Tasks

### 📊 **View Your Data**
```bash
# Quick database overview
npm run check-data

# Complete access guide with examples
npm run db-guide

# Query specific data
npm run query "SELECT brand_name, total_price_field FROM custom_receipts;"
```

### 🤖 **Run Demonstrations**
```bash
# See AI data processing in action
npm run demo-ai

# See your custom field mapping
npm run demo-mapping
```

### 🔧 **Maintenance**
```bash
# Set up database tables
npm run setup-db

# Process receipts through AI
npm run process-ai

# Start development server
npm run dev
```

## 🗂️ File Purpose Quick Reference

| Need to... | Go to... | File |
|------------|----------|------|
| **Query data** | `/database/` | `query-db.js` |
| **See examples** | `/examples/` | `demo-*.js` |
| **Debug issues** | `/scripts/` | `debug-*.js` |
| **Read docs** | `/docs/` | `*.md` |
| **Check exports** | `/exports/` | `*.json` |
| **Modify core logic** | `/services/` | `*.js` |

## 🔍 Finding What You Need

### "I want to see my processed receipt data"
→ `npm run db-guide` or `npm run query "SELECT * FROM custom_receipts;"`

### "I want to understand how the system works"
→ `npm run demo-ai` and `npm run demo-mapping`

### "I want to debug an issue"
→ `/scripts/debug-*.js` and `/scripts/check-receipts.js`

### "I want to modify the processing logic"
→ `/services/aiDataParser.js` and `/database/custom-field-mapper.js`

### "I want to see the documentation"
→ `/docs/` folder, start with `DATABASE_ACCESS_SUMMARY.md`

## 🎪 Project Structure Benefits

✅ **Clear separation** of concerns  
✅ **Easy navigation** with README files in each folder  
✅ **Quick access** via npm scripts  
✅ **Logical grouping** of related files  
✅ **Clean development** environment  

This organization makes it easy to find what you need and understand how the system works!