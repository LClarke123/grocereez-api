# 🎯 Examples & Demonstrations

This folder contains example scripts and demonstrations of the GroceryPal API capabilities.

## 🤖 AI System Demonstrations

### `demo-ai-system.js`
- **Complete AI data processing showcase**
- Shows transformation from raw OCR to intelligent data
- Demonstrates:
  - Raw vs AI-enhanced data comparison
  - Product intelligence and categorization
  - Shopping insights generation
  - Data export capabilities
- **Usage**: `node demo-ai-system.js`

### `demo-custom-mapping.js`
- **Custom field mapping demonstration**
- Shows how TabScanner JSON maps to your specific database structure
- Demonstrates:
  - Brand name normalization to "Trader Joes"
  - Address parsing into separate fields
  - Item type code assignment
  - Database-ready structure generation
- **Usage**: `node demo-custom-mapping.js`

## 🧪 Testing Scripts

### `test-single-receipt.js`
- **Single receipt processing test**
- Useful for debugging and development
- Processes one receipt with detailed logging
- **Usage**: `node test-single-receipt.js`

## 📊 What These Examples Show

### AI System Demo Output:
```
🤖 AI-Enhanced Data System Demo
================================

📊 RAW vs AI-ENHANCED DATA COMPARISON
Raw Data: Trader Joe's - $25.87 (5 items)
Enhanced: Trader Joe's (grocery) - $25.87 | Confidence: 94% | Health: 7/10

🧠 PRODUCT INTELLIGENCE CATALOG
Top Products: Coffee Beans, Greek Yogurt, Almond Milk
Categories: produce(8), dairy(7), pantry(6), beverages(2)

💡 SHOPPING INSIGHTS
Pattern: convenience shopping, 1 person, moderate budget
Health Score: 7/10, dietary flags: organic, healthy
```

### Custom Mapping Demo Output:
```
🗺️ FIELD MAPPING RESULTS
========================
Brand Name: "Trader Joes" (normalized)
Address: 519 Marginal Way, Portland, ME 04101
Date/Time: 2025-08-17 12:33:00
Tax Fields: $0.22 / $0.22
Items: 35 items with type codes (PANTRY, PROD, DAIRY, etc.)
```

## 🚀 Running the Examples

1. **Ensure prerequisites:**
   ```bash
   # Database connection configured
   # OCR data available (run API first)
   ```

2. **Run demonstrations:**
   ```bash
   # AI system showcase
   node examples/demo-ai-system.js
   
   # Custom field mapping
   node examples/demo-custom-mapping.js
   
   # Single receipt test
   node examples/test-single-receipt.js
   ```

3. **Expected outputs:**
   - Detailed console output showing data transformations
   - Generated export files in `../exports/` folder
   - Database records created and demonstrated

## 🎓 Learning Path

1. **Start with**: `demo-custom-mapping.js` to see your exact field requirements
2. **Then run**: `demo-ai-system.js` to see advanced AI capabilities
3. **Debug with**: `test-single-receipt.js` for detailed processing steps

## 🔍 Use Cases

- **Understanding data flow**: See how OCR → AI → Database works
- **Debugging issues**: Isolate problems with single receipt testing
- **Client demonstrations**: Show capabilities to stakeholders
- **Development reference**: Examples for building new features

These examples demonstrate the complete capabilities of your receipt processing system!