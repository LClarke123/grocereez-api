-- GroceryPal MVP Database Schema
-- PostgreSQL 14+

-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table - stores user account information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stores table - standardized store/retailer information
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    chain VARCHAR(255), -- e.g., "Kroger", "Walmart", "Target"
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Receipt processing status enum
CREATE TYPE receipt_status AS ENUM (
    'uploaded',
    'processing',
    'completed',
    'failed',
    'invalid'
);

-- Receipts table - stores receipt metadata and processing information
CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id),
    
    -- File storage information
    image_url VARCHAR(500) NOT NULL,
    image_filename VARCHAR(255) NOT NULL,
    file_size INTEGER,
    
    -- Receipt data
    receipt_date DATE,
    receipt_time TIME,
    total_amount DECIMAL(10,2),
    tax_amount DECIMAL(10,2),
    subtotal_amount DECIMAL(10,2),
    
    -- Processing information
    status receipt_status DEFAULT 'uploaded',
    ocr_raw_text TEXT,
    llm_processed_data JSONB,
    processing_errors TEXT[],
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Product categories for standardization
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    parent_category_id UUID REFERENCES product_categories(id),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Receipt items - individual line items from receipts
CREATE TABLE receipt_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    category_id UUID REFERENCES product_categories(id),
    
    -- Item information
    item_name VARCHAR(500) NOT NULL,
    standardized_name VARCHAR(500), -- LLM-processed standardized name
    brand VARCHAR(255),
    size_description VARCHAR(255), -- e.g., "16 oz", "1 lb", "12 pack"
    
    -- Pricing
    unit_price DECIMAL(10,2),
    quantity DECIMAL(10,3) DEFAULT 1, -- supports fractional quantities (e.g., 1.5 lbs)
    line_total DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Additional metadata
    upc_code VARCHAR(50), -- if available from OCR
    department VARCHAR(100),
    is_taxable BOOLEAN DEFAULT true,
    
    -- Processing metadata
    confidence_score DECIMAL(3,2), -- OCR/LLM confidence (0.00 to 1.00)
    raw_text VARCHAR(1000), -- original OCR text for this item
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User sessions for authentication
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Processing logs for debugging and monitoring
CREATE TABLE processing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE,
    log_level VARCHAR(20) NOT NULL, -- 'info', 'warning', 'error'
    message TEXT NOT NULL,
    context JSONB, -- additional context data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_receipts_user_id ON receipts(user_id);
CREATE INDEX idx_receipts_status ON receipts(status);
CREATE INDEX idx_receipts_date ON receipts(receipt_date DESC);
CREATE INDEX idx_receipt_items_receipt_id ON receipt_items(receipt_id);
CREATE INDEX idx_receipt_items_category ON receipt_items(category_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_stores_chain ON stores(chain);

-- Full-text search indexes for item names
CREATE INDEX idx_receipt_items_search ON receipt_items USING gin(to_tsvector('english', item_name));
CREATE INDEX idx_receipt_items_std_search ON receipt_items USING gin(to_tsvector('english', standardized_name));

-- Triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stores_updated_at 
    BEFORE UPDATE ON stores 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receipts_updated_at 
    BEFORE UPDATE ON receipts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial product categories
INSERT INTO product_categories (name, description) VALUES
('Produce', 'Fresh fruits and vegetables'),
('Meat & Seafood', 'Fresh and packaged meat, poultry, and seafood'),
('Dairy & Eggs', 'Milk, cheese, yogurt, eggs, and dairy products'),
('Pantry', 'Canned goods, dry goods, condiments, and pantry staples'),
('Frozen Foods', 'Frozen meals, vegetables, desserts, and frozen items'),
('Bakery', 'Bread, pastries, cakes, and bakery items'),
('Beverages', 'Non-alcoholic drinks, juices, water, and soft drinks'),
('Snacks', 'Chips, crackers, nuts, and snack foods'),
('Health & Beauty', 'Personal care, cosmetics, and health products'),
('Household', 'Cleaning supplies, paper products, and household items'),
('Baby & Kids', 'Baby food, diapers, and children''s products'),
('Pet Care', 'Pet food, toys, and pet supplies'),
('Alcohol', 'Beer, wine, and spirits'),
('Other', 'Items that don''t fit other categories');

-- Create a view for receipt analytics
CREATE VIEW receipt_analytics AS
SELECT 
    r.user_id,
    r.receipt_date,
    s.chain as store_chain,
    r.total_amount,
    r.tax_amount,
    COUNT(ri.id) as item_count,
    AVG(ri.line_total) as avg_item_price
FROM receipts r
LEFT JOIN stores s ON r.store_id = s.id
LEFT JOIN receipt_items ri ON r.id = ri.receipt_id
WHERE r.status = 'completed'
GROUP BY r.id, r.user_id, r.receipt_date, s.chain, r.total_amount, r.tax_amount;

-- Comments for documentation
COMMENT ON TABLE users IS 'User account information and authentication data';
COMMENT ON TABLE stores IS 'Standardized store/retailer information for receipt association';
COMMENT ON TABLE receipts IS 'Receipt metadata, processing status, and file information';
COMMENT ON TABLE receipt_items IS 'Individual line items extracted from receipts';
COMMENT ON TABLE product_categories IS 'Hierarchical product categorization system';
COMMENT ON TABLE user_sessions IS 'JWT session management and authentication tracking';
COMMENT ON TABLE processing_logs IS 'System logs for receipt processing debugging';

COMMENT ON COLUMN receipts.llm_processed_data IS 'JSON structure containing LLM-enhanced receipt data';
COMMENT ON COLUMN receipt_items.confidence_score IS 'OCR/LLM confidence score from 0.00 to 1.00';
COMMENT ON COLUMN receipt_items.standardized_name IS 'LLM-processed standardized product name';