# 📊 GroceryPal OCR Data Access Guide

## 🎯 **How to Access Parsed OCR JSON Data**

Your TabScanner OCR data is stored in multiple formats and can be accessed through various methods:

## 📍 **1. API Endpoints**

### Get All Receipts
```bash
GET http://localhost:3000/receipts
Authorization: Bearer <your-jwt-token>
```

### Get Specific Receipt with Items
```bash
GET http://localhost:3000/receipts/{receipt-id}
Authorization: Bearer <your-jwt-token>
```

### Get Processing Status & Logs
```bash
GET http://localhost:3000/receipts/{receipt-id}/status
Authorization: Bearer <your-jwt-token>
```

## 🗄️ **2. Database Structure**

### Main Tables Containing OCR Data

#### `receipts` Table
```sql
-- Key OCR data columns:
- ocr_raw_text          TEXT        -- Raw OCR text from TabScanner
- llm_processed_data    JSONB       -- Complete TabScanner response JSON
- total_amount          DECIMAL     -- Parsed total amount
- tax_amount            DECIMAL     -- Parsed tax amount
- subtotal_amount       DECIMAL     -- Parsed subtotal
- receipt_date          DATE        -- Parsed receipt date
- receipt_time          TIME        -- Parsed receipt time
- status                VARCHAR     -- processing, completed, failed
```

#### `receipt_items` Table
```sql
-- Individual line items:
- item_name            VARCHAR     -- Parsed item name
- quantity             DECIMAL     -- Item quantity
- unit_price           DECIMAL     -- Per-unit price
- line_total           DECIMAL     -- Total line price
- confidence_score     DECIMAL     -- OCR confidence (0-1)
- raw_text             VARCHAR     -- Original OCR text for item
```

#### `stores` Table
```sql
-- Store information extracted from receipts:
- name                 VARCHAR     -- Store name
- chain                VARCHAR     -- Store chain
- address              TEXT        -- Store address
- phone                VARCHAR     -- Store phone number
```

## 📋 **3. JSON Data Formats**

### TabScanner Complete Response (stored in `llm_processed_data`)
```json
{
  "rawData": {
    "result": {
      "establishment": "Trader Joes",
      "address": "Trader Joe'S Portland (519), Marginal Way, Portland, ME 04101",
      "phoneNumber": "207-699-3799",
      "date": "2025-08-17 12:33:00",
      "dateISO": "2025-08-17T12:33:00",
      "total": 96.49,
      "tax": 0.62,
      "subTotal": 0,
      "currency": "USD",
      "paymentMethod": "American Express",
      "lineItems": [
        {
          "descClean": "OL VE OIL",
          "qty": 1,
          "price": 0,
          "lineTotal": 9.99,
          "unit": "",
          "symbols": ["$"]
        },
        // ... 34 more items
      ],
      "establishmentConfidence": 0.99,
      "totalConfidence": 0.6,
      "dateConfidence": 0.95,
      "customFields": {
        "URL": "www.traderjoes.com",
        "StoreID": "0519",
        "PaymentMethod": "American Express",
        "CardLast4Digits": "1008"
      }
    }
  }
}
```

### Processed Receipt Object (API response format)
```json
{
  "receipt": {
    "id": "c4796f28-eea3-4b7c-bbf6-bbda81dcf8b1",
    "store_name": "Trader Joes",
    "receipt_date": "2025-08-17",
    "receipt_time": "12:33:00",
    "total_amount": 96.49,
    "tax_amount": 0.62,
    "subtotal_amount": 0,
    "status": "completed",
    "ocr_raw_text": "Trader Joes\\nTrader Joe'S Portland...",
    "llm_processed_data": { /* Complete TabScanner JSON */ }
  },
  "items": [
    {
      "item_name": "OL VE OIL",
      "quantity": 1.000,
      "unit_price": null,
      "line_total": 9.99,
      "confidence_score": 1.0,
      "raw_text": "OL VE OIL"
    }
    // ... more items
  ]
}
```

## 🛠️ **4. Access Methods**

### Method 1: Use Provided Scripts
```bash
# View all OCR data via API
node view-ocr-data.js

# Query database directly
node database-queries.js

# Export to JSON files
node view-ocr-data.js  # Creates receipt_*.json files
```

### Method 2: Direct Database Queries
```sql
-- Get all receipts with complete JSON
SELECT 
    id,
    store_id,
    receipt_date,
    total_amount,
    ocr_raw_text,
    llm_processed_data,
    status
FROM receipts 
WHERE status = 'completed';

-- Get all line items for a receipt
SELECT 
    item_name,
    quantity,
    line_total,
    confidence_score
FROM receipt_items 
WHERE receipt_id = 'your-receipt-id';

-- Get complete receipt with items (JSON aggregated)
SELECT 
    r.*,
    s.name as store_name,
    JSON_AGG(
        JSON_BUILD_OBJECT(
            'item_name', ri.item_name,
            'quantity', ri.quantity,
            'line_total', ri.line_total,
            'confidence', ri.confidence_score
        )
    ) as items
FROM receipts r
LEFT JOIN stores s ON r.store_id = s.id
LEFT JOIN receipt_items ri ON r.id = ri.receipt_id
WHERE r.id = 'your-receipt-id'
GROUP BY r.id, s.id;
```

### Method 3: Custom API Integration
```javascript
// Example: Custom data extraction
const axios = require('axios');

async function getReceiptData(receiptId, authToken) {
    const response = await axios.get(
        `http://localhost:3000/receipts/${receiptId}`,
        { headers: { 'Authorization': `Bearer ${authToken}` } }
    );
    
    const { receipt, items } = response.data;
    
    // Access TabScanner raw response
    const tabscannerData = receipt.llm_processed_data.rawData.result;
    
    // Extract specific fields
    return {
        store: tabscannerData.establishment,
        address: tabscannerData.address,
        phone: tabscannerData.phoneNumber,
        date: tabscannerData.dateISO,
        payment: tabscannerData.paymentMethod,
        items: items.map(item => ({
            name: item.item_name,
            price: item.line_total,
            quantity: item.quantity
        })),
        confidence: {
            establishment: tabscannerData.establishmentConfidence,
            total: tabscannerData.totalConfidence,
            date: tabscannerData.dateConfidence
        }
    };
}
```

## 📊 **5. Available Data Fields**

### From TabScanner Response:
- **Store Info**: establishment, address, phoneNumber, url
- **Financial**: total, tax, subTotal, discount, tip, cash, change
- **Date/Time**: date, dateISO, time
- **Items**: lineItems[] with descClean, qty, price, lineTotal
- **Payment**: paymentMethod, cardLast4Digits
- **Location**: addressNorm (parsed address components)
- **Confidence**: establishmentConfidence, totalConfidence, dateConfidence
- **Metadata**: currency, documentType, customFields

### Database Normalized Fields:
- **Receipt**: total_amount, tax_amount, subtotal_amount, receipt_date
- **Items**: item_name, quantity, unit_price, line_total, confidence_score
- **Store**: name, chain, address, phone

## 🎯 **6. Common Use Cases**

### Export All Data to External System
```bash
node database-queries.js  # Exports receipt_*_export.json files
```

### Get Spending Analytics
```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/analytics/spending?period=30d
```

### Extract Specific Fields
```sql
-- Get only food items over $5
SELECT 
    r.receipt_date,
    s.name as store,
    ri.item_name,
    ri.line_total
FROM receipts r
JOIN stores s ON r.store_id = s.id
JOIN receipt_items ri ON r.id = ri.receipt_id
WHERE ri.line_total > 5.00
ORDER BY ri.line_total DESC;
```

## ✅ **Available Files**

Your OCR data is now accessible through:

1. **`view-ocr-data.js`** - API-based data viewer and exporter
2. **`database-queries.js`** - Direct database access and analytics
3. **`receipt_*_export.json`** - Complete exported receipt files
4. **Database tables** - receipts, receipt_items, stores

## 🔗 **Connection Details**

- **API Base URL**: `http://localhost:3000`
- **Database**: PostgreSQL (connection in .env file)
- **Authentication**: JWT tokens via `/auth/login`

All your TabScanner OCR data is now fully accessible and exportable! 🎉