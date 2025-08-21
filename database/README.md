# 🗄️ Database Operations

This folder contains all database-related files for the GroceryPal API.

## 📊 Schema Files

### `schema.sql`
- **Original database schema** for basic receipt storage
- Tables: `users`, `stores`, `receipts`, `receipt_items`
- Basic OCR data storage structure

### `enhanced-schema.sql`
- **AI-enhanced schema** for intelligent data processing
- Tables: `enhanced_stores`, `ai_parsed_receipts`, `product_catalog`, `ai_parsed_items`, `shopping_insights`
- Supports AI categorization, product intelligence, shopping patterns

### `create-custom-database.sql`
- **Custom field mapping schema** per user specifications
- Tables: `custom_receipts`, `custom_receipt_items`
- Exact field structure requested: brand normalization, address parsing, tax separation

## 🤖 AI Processing

### `ai-data-processor.js`
- **Main orchestrator** for AI data enhancement
- Processes raw OCR data through AI intelligence
- Creates product catalogs and shopping insights
- Usage: `node ai-data-processor.js`

### `aiDataParser.js` (symlinked from services/)
- Core AI parsing logic
- Transforms TabScanner JSON into structured data
- Handles fallback to rule-based processing

## 🗺️ Custom Field Mapping

### `custom-field-mapper.js`
- **Maps OCR data to your exact specifications**
- Brand normalization ("Trader Joes" standardization)
- Address parsing into separate fields
- Item type code assignment (PANTRY, DAIRY, PROD, etc.)

### `insert-custom-data.js`
- Demonstrates complete workflow from OCR → Database
- Creates custom tables and inserts processed data
- Usage: `node insert-custom-data.js`

## 🔍 Data Access & Querying

### `database-access-guide.js`
- **Comprehensive database access tutorial**
- Shows all query patterns and examples
- Demonstrates joins, aggregations, exports
- Usage: `node database-access-guide.js`

### `query-db.js`
- **Command-line query interface**
- Quick database queries without complex setup
- Usage: `node query-db.js "SELECT * FROM custom_receipts;"`

## 🚀 Quick Commands

```bash
# View processed receipts
node query-db.js "SELECT brand_name, total_price_field FROM custom_receipts;"

# Items by type code
node query-db.js "SELECT item_type_code, COUNT(*) FROM custom_receipt_items GROUP BY item_type_code;"

# Complete access guide
node database-access-guide.js

# Process all receipts through AI
node ai-data-processor.js

# Insert custom mapped data
node insert-custom-data.js
```

## 📋 Database Tables Overview

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `custom_receipts` | Receipt headers with custom fields | `brand_name`, `street_number`, `date_field`, `tax_field_1`, `total_price_field` |
| `custom_receipt_items` | Items with type codes | `item_name`, `item_type_code`, `item_price`, `category` |
| `ai_parsed_receipts` | AI-enhanced receipts | `ai_confidence_score`, `processing_status` |
| `product_catalog` | Intelligent product database | `normalized_name`, `dietary_tags`, `purchase_frequency` |

## 🔗 Dependencies

All database operations require:
- PostgreSQL connection (via `DATABASE_URL`)
- Node.js pg library
- Environment variables configured in `.env`