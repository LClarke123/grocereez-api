# 🗄️ DATABASE ACCESS SUMMARY

## Your Receipt Data is Now Available!

### 📊 Database Tables Created
- **`custom_receipts`** - Receipt header data with your exact field structure
- **`custom_receipt_items`** - Individual items with type codes and categories

### 🔌 Connection Information
- **Database**: PostgreSQL on Railway
- **Connection String**: Set in `.env` file as `DATABASE_URL`
- **Status**: ✅ Connected and accessible

---

## 🚀 Quick Access Methods

### 1. Command Line Query Tool (Easiest)
```bash
# View all receipts
node query-db.js "SELECT * FROM custom_receipts;"

# View items by type
node query-db.js "SELECT item_type_code, COUNT(*) FROM custom_receipt_items GROUP BY item_type_code;"

# Top expensive items
node query-db.js "SELECT item_name, item_price FROM custom_receipt_items ORDER BY item_price DESC LIMIT 10;"
```

### 2. Node.js Code
```javascript
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Query receipts
const result = await pool.query('SELECT * FROM custom_receipts');
console.log(result.rows);
```

### 3. Direct Database Access
```bash
# Using psql command line
psql "$DATABASE_URL"

# Then run SQL commands
SELECT * FROM custom_receipts;
```

---

## 📋 Your Data Structure

### Receipt Headers (`custom_receipts`)
| Field | Type | Example |
|-------|------|---------|
| `brand_name` | VARCHAR | "Trader Joes" |
| `street_number` | VARCHAR | "519" |
| `street_name` | VARCHAR | "Marginal Way" |
| `city` | VARCHAR | "Portland" |
| `state` | VARCHAR | "ME" |
| `zipcode` | VARCHAR | "04101" |
| `date_field` | DATE | "2025-08-17" |
| `time_field` | TIME | "12:33:00" |
| `tax_field_1` | DECIMAL | 0.22 |
| `tax_field_2` | DECIMAL | 0.22 |
| `total_price_field` | DECIMAL | 1.00 |

### Receipt Items (`custom_receipt_items`)
| Field | Type | Example |
|-------|------|---------|
| `item_name` | VARCHAR | "OL VE OIL" |
| `item_type_code` | VARCHAR | "PANTRY" |
| `item_price` | DECIMAL | 9.99 |
| `quantity` | DECIMAL | 1.000 |
| `unit_price` | DECIMAL | 9.99 |
| `category` | VARCHAR | "pantry" |

---

## 📊 Current Data Summary

**Receipts Processed**: 2 receipts  
**Total Items**: 70 items  
**Store**: Trader Joes  
**Date**: August 17, 2025  

### Items by Type Code:
- **MISC**: 32 items ($3.29 avg)
- **PROD**: 16 items ($2.70 avg) 
- **PANTRY**: 12 items ($2.33 avg)
- **DAIRY**: 4 items ($1.69 avg)
- **FEE**: 4 items ($0.13 avg)
- **MEAT**: 2 items ($3.99 avg)

---

## 🔍 Useful Queries

### Basic Queries
```sql
-- All receipts
SELECT * FROM custom_receipts;

-- All items
SELECT * FROM custom_receipt_items;

-- Items for specific receipt
SELECT * FROM custom_receipt_items WHERE receipt_id = 'YOUR_RECEIPT_ID';
```

### Analytics Queries
```sql
-- Spending by store
SELECT brand_name, SUM(total_price_field) as total_spent 
FROM custom_receipts GROUP BY brand_name;

-- Most expensive items
SELECT item_name, item_price 
FROM custom_receipt_items 
ORDER BY item_price DESC LIMIT 10;

-- Items by category
SELECT category, COUNT(*), AVG(item_price) 
FROM custom_receipt_items 
GROUP BY category;

-- Type code distribution
SELECT item_type_code, COUNT(*) as item_count
FROM custom_receipt_items 
GROUP BY item_type_code 
ORDER BY item_count DESC;
```

### Advanced Joins
```sql
-- Receipts with item counts
SELECT r.brand_name, r.date_field, COUNT(i.id) as item_count, r.total_price_field
FROM custom_receipts r
LEFT JOIN custom_receipt_items i ON r.id = i.receipt_id
GROUP BY r.id;

-- All items with receipt info
SELECT r.brand_name, r.date_field, i.item_name, i.item_type_code, i.item_price
FROM custom_receipts r
JOIN custom_receipt_items i ON r.id = i.receipt_id
ORDER BY i.item_price DESC;
```

---

## 💾 Export Options

### JSON Export
```sql
SELECT json_build_object(
    'receipt_id', r.id,
    'store', r.brand_name,
    'date', r.date_field,
    'total', r.total_price_field,
    'items', json_agg(json_build_object(
        'name', i.item_name,
        'type', i.item_type_code,
        'price', i.item_price
    ))
) FROM custom_receipts r
JOIN custom_receipt_items i ON r.id = i.receipt_id
GROUP BY r.id;
```

### CSV Export
```sql
-- Receipt headers
COPY (SELECT brand_name, date_field, total_price_field, city, state FROM custom_receipts) 
TO '/tmp/receipts.csv' WITH CSV HEADER;

-- Items
COPY (SELECT item_name, item_type_code, item_price, category FROM custom_receipt_items) 
TO '/tmp/items.csv' WITH CSV HEADER;
```

---

## 🛠️ Tools You Can Use

### GUI Database Tools
- **pgAdmin**: https://www.pgadmin.org/
- **DBeaver**: https://dbeaver.io/ 
- **TablePlus**: https://tableplus.com/

### Built-in Tools (This Project)
- `node database-access-guide.js` - Complete access guide
- `node query-db.js "SQL_QUERY"` - Quick query interface

---

## 🎯 Next Steps

1. **Query your data** using the examples above
2. **Export to CSV/JSON** for analysis in Excel/Python
3. **Build dashboards** using the structured data
4. **Add more receipts** by processing them through the API

Your receipt data is now fully accessible and ready for analysis! 🚀