-- Custom Database Schema for User-Specified Field Structure
-- Maps receipt data to exact columns requested by user

-- Receipt header table with user-specified columns
CREATE TABLE IF NOT EXISTS custom_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Brand and Store Information
    brand_name VARCHAR(255) NOT NULL, -- Normalized brand (e.g., "Trader Joes")
    
    -- Address Components (separate fields as requested)
    street_number VARCHAR(20),
    street_name VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(10),
    zipcode VARCHAR(20),
    
    -- Date and Time Fields
    date_field DATE NOT NULL,
    time_field TIME,
    
    -- Financial Fields
    tax_field_1 DECIMAL(10,2) DEFAULT 0,
    tax_field_2 DECIMAL(10,2) DEFAULT 0,
    total_price_field DECIMAL(10,2) NOT NULL,
    
    -- Additional metadata
    confidence_score DECIMAL(3,2),
    phone VARCHAR(20),
    raw_address TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Receipt items table with item type codes as requested
CREATE TABLE IF NOT EXISTS custom_receipt_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_id UUID REFERENCES custom_receipts(id) ON DELETE CASCADE,
    
    -- Item Information
    item_name VARCHAR(500) NOT NULL,
    item_type_code VARCHAR(20) NOT NULL, -- PROD, DAIRY, PANTRY, MEAT, BAKERY, FEE, MISC
    item_price DECIMAL(10,2) NOT NULL,
    
    -- Quantity and Pricing
    quantity DECIMAL(10,3) DEFAULT 1,
    unit_price DECIMAL(10,2),
    unit VARCHAR(20) DEFAULT 'each',
    
    -- Categorization
    category VARCHAR(100),
    
    -- Quality metrics
    confidence DECIMAL(3,2) DEFAULT 1.0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_receipts_brand ON custom_receipts(brand_name);
CREATE INDEX IF NOT EXISTS idx_custom_receipts_date ON custom_receipts(date_field DESC);
CREATE INDEX IF NOT EXISTS idx_custom_receipts_location ON custom_receipts(city, state);
CREATE INDEX IF NOT EXISTS idx_custom_receipt_items_receipt ON custom_receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_custom_receipt_items_type ON custom_receipt_items(item_type_code);

-- View for easy querying
CREATE OR REPLACE VIEW receipt_summary AS
SELECT 
    r.id,
    r.brand_name,
    r.street_number,
    r.street_name,
    r.city,
    r.state,
    r.zipcode,
    r.date_field,
    r.time_field,
    r.tax_field_1,
    r.tax_field_2,
    r.total_price_field,
    COUNT(i.id) as item_count,
    AVG(i.confidence) as avg_item_confidence,
    string_agg(DISTINCT i.item_type_code, ', ') as type_codes_present
FROM custom_receipts r
LEFT JOIN custom_receipt_items i ON r.id = i.receipt_id
GROUP BY r.id;

-- Comments for documentation
COMMENT ON TABLE custom_receipts IS 'Receipt header data with user-specified field structure';
COMMENT ON COLUMN custom_receipts.brand_name IS 'Normalized brand name (e.g., Trader Joes for all variations)';
COMMENT ON COLUMN custom_receipts.street_number IS 'Street number extracted from address';
COMMENT ON COLUMN custom_receipts.street_name IS 'Street name extracted from address';
COMMENT ON COLUMN custom_receipts.tax_field_1 IS 'First distinct tax amount';
COMMENT ON COLUMN custom_receipts.tax_field_2 IS 'Second distinct tax amount if present';
COMMENT ON TABLE custom_receipt_items IS 'Individual receipt items with type codes';
COMMENT ON COLUMN custom_receipt_items.item_type_code IS 'Categorized type code: PROD, DAIRY, PANTRY, MEAT, BAKERY, FEE, MISC';