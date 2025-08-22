const { Pool } = require('pg');

// Initialize database with basic schema
const initializeDatabase = async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Initializing database schema...');

    // Create basic tables if they don't exist
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        password_hash VARCHAR(255),
        phone VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS stores (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        chain VARCHAR(255),
        address TEXT,
        phone VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS receipts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id),
        store_id UUID REFERENCES stores(id),
        receipt_date DATE,
        total_amount DECIMAL(10,2),
        tax_amount DECIMAL(10,2),
        subtotal DECIMAL(10,2),
        image_url TEXT,
        image_filename VARCHAR(255),
        file_size INTEGER,
        status VARCHAR(50) DEFAULT 'processing',
        ocr_raw_text TEXT,
        processing_errors TEXT,
        processed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS product_categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) UNIQUE NOT NULL,
        parent_category_id UUID REFERENCES product_categories(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS receipt_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        receipt_id UUID NOT NULL REFERENCES receipts(id),
        category_id UUID REFERENCES product_categories(id),
        product_name VARCHAR(255) NOT NULL,
        quantity DECIMAL(8,3),
        unit_price DECIMAL(10,2),
        line_total DECIMAL(10,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id),
        token_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);

    // Insert basic categories
    await pool.query(`
      INSERT INTO product_categories (name) VALUES 
        ('Groceries'),
        ('Produce'),
        ('Meat & Seafood'),
        ('Dairy'),
        ('Bakery'),
        ('Beverages'),
        ('Health & Beauty'),
        ('Household'),
        ('Other')
      ON CONFLICT (name) DO NOTHING;
    `);

    console.log('Database schema initialized successfully!');
    await pool.end();
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    await pool.end();
    throw error;
  }
};

module.exports = { initializeDatabase };