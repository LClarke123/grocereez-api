-- Enhanced Database Schema for AI-Parsed Receipt Data
-- This schema stores clean, structured, AI-enhanced receipt data

-- Drop existing enhanced tables if they exist (for development)
DROP TABLE IF EXISTS ai_parsed_items CASCADE;
DROP TABLE IF EXISTS ai_parsed_receipts CASCADE;
DROP TABLE IF EXISTS enhanced_stores CASCADE;
DROP TABLE IF EXISTS product_catalog CASCADE;
DROP TABLE IF EXISTS shopping_insights CASCADE;

-- Enhanced Stores Table - AI-cleaned and normalized store data
CREATE TABLE enhanced_stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Information
    normalized_name VARCHAR(255) NOT NULL,
    chain VARCHAR(255),
    store_type VARCHAR(50), -- grocery, pharmacy, restaurant, convenience, department, specialty
    location_type VARCHAR(50), -- urban, suburban, rural, mall, standalone
    price_range VARCHAR(20), -- budget, mid-range, premium
    
    -- Location Data
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'USA',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Contact Information
    phone VARCHAR(20),
    website VARCHAR(255),
    store_id VARCHAR(50), -- Original store ID from receipts
    
    -- AI-Enhanced Metadata
    known_for TEXT[], -- Array of store characteristics
    specialties TEXT[], -- Key product categories
    avg_price_level DECIMAL(3,2), -- 1.0-5.0 price rating
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Link to original store
    original_store_id UUID REFERENCES stores(id)
);

-- AI-Parsed Receipts Table - Clean, structured receipt data
CREATE TABLE ai_parsed_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Link to original receipt
    original_receipt_id UUID REFERENCES receipts(id),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    enhanced_store_id UUID REFERENCES enhanced_stores(id),
    
    -- Transaction Information
    transaction_date DATE NOT NULL,
    transaction_time TIME,
    transaction_datetime TIMESTAMP WITH TIME ZONE,
    
    -- Payment Information
    payment_method VARCHAR(50),
    card_type VARCHAR(50),
    card_last4 VARCHAR(4),
    transaction_id VARCHAR(100),
    
    -- Financial Breakdown (all amounts in cents to avoid floating point issues)
    subtotal_cents INTEGER DEFAULT 0,
    tax_total_cents INTEGER DEFAULT 0,
    fees_cents INTEGER DEFAULT 0,
    discounts_cents INTEGER DEFAULT 0,
    tips_cents INTEGER DEFAULT 0,
    grand_total_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- AI Processing Status
    processing_status VARCHAR(50) DEFAULT 'ai_parsed', -- ai_parsed, validated, needs_review
    ai_confidence_score INTEGER, -- 0-100
    data_completeness_score INTEGER, -- 0-100
    validation_errors TEXT[],
    processing_time_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Product Catalog - Normalized product database built from AI parsing
CREATE TABLE product_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Product Identification
    normalized_name VARCHAR(500) NOT NULL,
    brand VARCHAR(255),
    product_type VARCHAR(255),
    
    -- Categorization
    category VARCHAR(100) NOT NULL, -- produce, dairy, meat, bakery, etc.
    subcategory VARCHAR(100),
    department VARCHAR(100),
    
    -- Product Attributes
    size_info VARCHAR(255),
    unit_type VARCHAR(50), -- each, lb, oz, pack, etc.
    upc_code VARCHAR(50),
    
    -- AI-Enhanced Tags
    dietary_tags TEXT[], -- organic, gluten-free, vegan, etc.
    nutrition_category VARCHAR(20), -- healthy, neutral, unhealthy
    allergen_info TEXT[],
    
    -- Pricing Intelligence
    avg_price_cents INTEGER,
    price_range_min_cents INTEGER,
    price_range_max_cents INTEGER,
    common_sizes TEXT[], -- Common package sizes seen
    
    -- Popularity Metrics
    purchase_frequency INTEGER DEFAULT 1,
    total_quantity_sold DECIMAL(10,3) DEFAULT 0,
    unique_customers INTEGER DEFAULT 1,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Quality Metrics
    confidence_score DECIMAL(3,2) DEFAULT 1.0,
    data_sources TEXT[], -- tabscanner, ai_enhanced, user_input
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI-Parsed Items - Enhanced individual line items
CREATE TABLE ai_parsed_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Links
    ai_receipt_id UUID REFERENCES ai_parsed_receipts(id) ON DELETE CASCADE,
    product_catalog_id UUID REFERENCES product_catalog(id),
    original_item_id UUID REFERENCES receipt_items(id),
    
    -- Original Data
    original_name VARCHAR(500) NOT NULL,
    normalized_name VARCHAR(500) NOT NULL,
    
    -- Product Details
    brand VARCHAR(255),
    size_info VARCHAR(255),
    product_type VARCHAR(255),
    
    -- Categorization (denormalized for performance)
    category VARCHAR(100),
    subcategory VARCHAR(100),
    department VARCHAR(100),
    
    -- Pricing (in cents)
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    unit_price_cents INTEGER,
    line_total_cents INTEGER NOT NULL,
    discount_cents INTEGER DEFAULT 0,
    
    -- AI-Enhanced Attributes
    dietary_tags TEXT[],
    nutrition_category VARCHAR(20), -- healthy, neutral, unhealthy
    sustainability_score INTEGER, -- 1-10
    
    -- Quality Metrics
    ocr_confidence DECIMAL(3,2),
    ai_confidence DECIMAL(3,2),
    name_match_confidence DECIMAL(3,2), -- How well it matched to product catalog
    
    -- Metadata
    unit_type VARCHAR(50),
    product_code VARCHAR(100),
    symbols TEXT[],
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Shopping Insights - AI-generated insights per receipt
CREATE TABLE shopping_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ai_receipt_id UUID REFERENCES ai_parsed_receipts(id) ON DELETE CASCADE,
    
    -- Shopping Pattern Analysis
    meal_type VARCHAR(50), -- breakfast, lunch, dinner, snack, mixed, grocery-shopping
    cuisine_type VARCHAR(50), -- american, italian, mexican, asian, etc.
    shopping_category VARCHAR(50), -- grocery, quick-meal, dining, convenience, bulk-shopping
    shopping_pattern VARCHAR(50), -- planned, impulse, routine, special-occasion
    
    -- Dietary Analysis
    dietary_flags TEXT[], -- vegetarian, vegan, organic, gluten-free, keto, healthy
    health_score INTEGER, -- 1-10 overall healthiness
    processed_food_ratio DECIMAL(3,2), -- 0.0-1.0 ratio of processed foods
    
    -- Sustainability & Ethics
    sustainability_score INTEGER, -- 1-10 based on organic, local, eco-friendly items
    organic_item_count INTEGER DEFAULT 0,
    local_item_count INTEGER DEFAULT 0,
    
    -- Economic Analysis
    budget_category VARCHAR(20), -- budget, moderate, premium
    price_efficiency_score DECIMAL(3,2), -- Value for money assessment
    bulk_buying_score DECIMAL(3,2), -- How much bulk buying occurred
    
    -- Household Analysis
    estimated_people INTEGER DEFAULT 1,
    estimated_days_of_food INTEGER,
    household_type VARCHAR(50), -- single, couple, family, large-family
    
    -- Temporal Patterns
    time_of_day VARCHAR(20), -- morning, afternoon, evening, late-night
    day_type VARCHAR(20), -- weekday, weekend, holiday
    season VARCHAR(20), -- spring, summer, fall, winter
    
    -- Quality Metrics
    insight_confidence INTEGER, -- 0-100 confidence in AI insights
    analysis_version VARCHAR(20) DEFAULT '1.0',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced Indexes for Performance
CREATE INDEX idx_enhanced_stores_normalized_name ON enhanced_stores(normalized_name);
CREATE INDEX idx_enhanced_stores_chain ON enhanced_stores(chain);
CREATE INDEX idx_enhanced_stores_location ON enhanced_stores(city, state);

CREATE INDEX idx_ai_parsed_receipts_user_date ON ai_parsed_receipts(user_id, transaction_date DESC);
CREATE INDEX idx_ai_parsed_receipts_store ON ai_parsed_receipts(enhanced_store_id);
CREATE INDEX idx_ai_parsed_receipts_total ON ai_parsed_receipts(grand_total_cents DESC);

CREATE INDEX idx_product_catalog_normalized_name ON product_catalog(normalized_name);
CREATE INDEX idx_product_catalog_category ON product_catalog(category, subcategory);
CREATE INDEX idx_product_catalog_brand ON product_catalog(brand);
CREATE INDEX idx_product_catalog_frequency ON product_catalog(purchase_frequency DESC);

CREATE INDEX idx_ai_parsed_items_receipt ON ai_parsed_items(ai_receipt_id);
CREATE INDEX idx_ai_parsed_items_product ON ai_parsed_items(product_catalog_id);
CREATE INDEX idx_ai_parsed_items_category ON ai_parsed_items(category);

CREATE INDEX idx_shopping_insights_receipt ON shopping_insights(ai_receipt_id);
CREATE INDEX idx_shopping_insights_patterns ON shopping_insights(shopping_category, meal_type);

-- Full-text search indexes
CREATE INDEX idx_product_catalog_search ON product_catalog USING gin(to_tsvector('english', normalized_name || ' ' || COALESCE(brand, '')));
CREATE INDEX idx_ai_parsed_items_search ON ai_parsed_items USING gin(to_tsvector('english', normalized_name));

-- Triggers for updating timestamps
CREATE TRIGGER update_enhanced_stores_updated_at 
    BEFORE UPDATE ON enhanced_stores 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_catalog_updated_at 
    BEFORE UPDATE ON product_catalog 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for easy data access
CREATE VIEW receipt_analytics_enhanced AS
SELECT 
    apr.id,
    apr.user_id,
    apr.transaction_date,
    es.normalized_name as store_name,
    es.chain,
    es.store_type,
    apr.grand_total_cents / 100.0 as grand_total,
    apr.ai_confidence_score,
    COUNT(api.id) as item_count,
    si.health_score,
    si.sustainability_score,
    si.shopping_category,
    si.dietary_flags
FROM ai_parsed_receipts apr
LEFT JOIN enhanced_stores es ON apr.enhanced_store_id = es.id
LEFT JOIN ai_parsed_items api ON apr.id = api.ai_receipt_id
LEFT JOIN shopping_insights si ON apr.id = si.ai_receipt_id
GROUP BY apr.id, es.id, si.id;

-- Product intelligence view
CREATE VIEW product_intelligence AS
SELECT 
    pc.normalized_name,
    pc.brand,
    pc.category,
    pc.subcategory,
    pc.avg_price_cents / 100.0 as avg_price,
    pc.purchase_frequency,
    pc.dietary_tags,
    pc.nutrition_category,
    COUNT(DISTINCT api.ai_receipt_id) as unique_purchases,
    SUM(api.quantity) as total_quantity_purchased,
    AVG(api.line_total_cents / 100.0) as avg_purchase_amount
FROM product_catalog pc
LEFT JOIN ai_parsed_items api ON pc.id = api.product_catalog_id
GROUP BY pc.id;

-- Comments for documentation
COMMENT ON TABLE enhanced_stores IS 'AI-cleaned and normalized store information with enhanced attributes';
COMMENT ON TABLE ai_parsed_receipts IS 'Clean, structured receipt data processed by AI with quality metrics';
COMMENT ON TABLE product_catalog IS 'Normalized product database built from AI analysis of receipt items';
COMMENT ON TABLE ai_parsed_items IS 'Enhanced line items with AI categorization and product matching';
COMMENT ON TABLE shopping_insights IS 'AI-generated insights about shopping patterns and preferences';

COMMENT ON COLUMN ai_parsed_receipts.grand_total_cents IS 'Total amount in cents to avoid floating-point precision issues';
COMMENT ON COLUMN product_catalog.dietary_tags IS 'Array of dietary attributes like organic, gluten-free, vegan';
COMMENT ON COLUMN shopping_insights.health_score IS 'AI-assessed healthiness score from 1-10';