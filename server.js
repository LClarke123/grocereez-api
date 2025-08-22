// GroceryPal API Server
// Node.js + Express.js + PostgreSQL

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const OCRService = require('./services/ocrService');
const { initializeDatabase } = require('./init-db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize OCR service
console.log('Initializing OCR service...');
console.log('TABSCANNER_API_KEY available:', !!process.env.TABSCANNER_API_KEY);
console.log('TABSCANNER_API_KEY length:', process.env.TABSCANNER_API_KEY?.length || 'N/A');

let ocrService;
try {
  ocrService = new OCRService();
  console.log('OCR service initialized successfully');
} catch (error) {
  console.error('Failed to initialize OCR service:', error.message);
  console.error('This will cause all receipt processing to fail');
  throw error;
}

// Middleware
app.use(helmet());
// CORS configuration for production and development
const corsOrigins = process.env.NODE_ENV === 'production' 
  ? (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [
      'https://grocereez.netlify.app',
      'https://thriving-figolla-28c63e.netlify.app',
      'https://68a871447aab3109d1d00dcc--grocereez.netlify.app',
      'https://silly-donut-211951.netlify.app',
      'https://cosmic-croissant-bc3258.netlify.app',
      'https://gregarious-salmiakki-b614ee.netlify.app',
      'https://inquisitive-eclair-2363c6.netlify.app'
    ])
  : ['http://localhost:8081', 'http://localhost:8082', 'http://localhost:8083', 'http://localhost:3000'];

console.log('CORS Origins:', corsOrigins);

app.use(cors({
  origin: '*', // Allow all origins for production deployment
  credentials: false, // Disable credentials when using wildcard
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.'
});

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Utility functions
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Handle demo tokens for MVP (both development and production)
  if (token.startsWith('dev-mock-token-') || token.startsWith('demo-token-')) {
    console.log('Development mode: Accepting mock token for testing');
    const mockUserId = '00000000-0000-4000-8000-000000000001';
    
    try {
      // Check if development user exists, create if not
      const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [mockUserId]);
      
      if (userCheck.rows.length === 0) {
        console.log('Creating development user...');
        await pool.query(
          'INSERT INTO users (id, email, first_name, last_name, password_hash, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
          [mockUserId, 'dev@example.com', 'Development', 'User', 'dev-hash']
        );
        console.log('Development user created successfully');
      }
      
      req.userId = mockUserId;
      return next();
    } catch (error) {
      console.error('Error handling development user:', error);
      return res.status(500).json({ error: 'Development setup error' });
    }
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if session exists and is active
    const sessionResult = await pool.query(
      'SELECT * FROM user_sessions WHERE user_id = $1 AND token_hash = $2 AND is_active = true AND expires_at > NOW()',
      [decoded.userId, token]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});


// Authentication endpoints
app.post('/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    // Create user
    const hashedPassword = await hashPassword(password);
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, created_at`,
      [email.toLowerCase(), hashedPassword, firstName, lastName, phone]
    );

    const user = userResult.rows[0];
    const token = generateToken(user.id);

    // Create session
    await pool.query(
      `INSERT INTO user_sessions (user_id, token_hash, expires_at, ip_address, user_agent) 
       VALUES ($1, $2, NOW() + INTERVAL '30 days', $3, $4)`,
      [user.id, token, req.ip, req.get('User-Agent')]
    );

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        createdAt: user.created_at
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const userResult = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name, is_active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    // Create session
    await pool.query(
      `INSERT INTO user_sessions (user_id, token_hash, expires_at, ip_address, user_agent) 
       VALUES ($1, $2, NOW() + INTERVAL '30 days', $3, $4)`,
      [user.id, token, req.ip, req.get('User-Agent')]
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/auth/logout', authenticateToken, async (req, res) => {
  try {
    // Deactivate current session
    await pool.query(
      'UPDATE user_sessions SET is_active = false WHERE user_id = $1 AND token_hash = $2',
      [req.userId, req.headers['authorization'].split(' ')[1]]
    );

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Receipt endpoints with OCR integration
app.post('/receipts/upload', authenticateToken, upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Receipt image is required' });
    }

    console.log(`Processing receipt upload for user ${req.userId}`);
    console.log(`File size: ${req.file.size} bytes`);

    // TODO: Upload to S3 and get URL (for now, simulate)
    const imageUrl = `https://example-bucket.s3.amazonaws.com/receipts/${uuidv4()}.jpg`;
    const filename = `receipt_${Date.now()}.jpg`;

    // Create receipt record with 'processing' status
    const receiptResult = await pool.query(
      `INSERT INTO receipts (user_id, image_url, image_filename, file_size, status) 
       VALUES ($1, $2, $3, $4, 'processing') 
       RETURNING id, status, created_at`,
      [req.userId, imageUrl, filename, req.file.size]
    );

    const receipt = receiptResult.rows[0];

    // Process receipt with OCR asynchronously
    processReceiptAsync(receipt.id, req.file.buffer, req.file.originalname)
      .catch(error => {
        console.error(`Fatal error in processReceiptAsync for receipt ${receipt.id}:`, error);
        // Update receipt status to failed if async processing fails
        pool.query(
          `UPDATE receipts 
           SET status = 'failed', 
               processing_errors = $1, 
               processed_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [`Fatal processing error: ${error.message}`, receipt.id]
        ).catch(dbError => {
          console.error('Failed to update receipt status after processing error:', dbError);
        });
      });

    res.status(201).json({
      message: 'Receipt uploaded successfully and is being processed',
      receipt: {
        id: receipt.id,
        status: receipt.status,
        uploadedAt: receipt.created_at
      }
    });
  } catch (error) {
    console.error('Receipt upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Async function to process receipts with OCR
async function processReceiptAsync(receiptId, imageBuffer, originalFilename) {
  console.log(`=== RECEIPT PROCESSING START ===`);
  console.log(`processReceiptAsync called for receipt ${receiptId}`);
  console.log(`Filename: ${originalFilename}`);
  console.log(`Buffer size: ${imageBuffer?.length || 'undefined'} bytes`);
  console.log(`TabScanner API Key available: ${process.env.TABSCANNER_API_KEY ? 'YES' : 'NO'}`);
  console.log(`TabScanner API Key length: ${process.env.TABSCANNER_API_KEY?.length || 'N/A'}`);
  
  try {
    console.log(`Starting OCR processing for receipt ${receiptId}`);
    console.log('About to call ocrService.processReceipt...');

    // Process with OCR
    const ocrResult = await ocrService.processReceipt(imageBuffer, originalFilename);
    
    console.log(`OCR completed for receipt ${receiptId}:`, {
      success: ocrResult.success,
      confidence: ocrResult.confidence,
      merchant: ocrResult.receipt?.merchant,
      total: ocrResult.receipt?.total,
      itemCount: ocrResult.receipt?.items?.length || 0
    });
    
    // Debug: Log the full OCR result
    console.log('DEBUG: Full OCR Result:', JSON.stringify(ocrResult, null, 2));

    // Validate OCR results
    const validation = ocrService.validateOCRResult(ocrResult);
    
    // Debug: Log validation result
    console.log('DEBUG: Validation Result:', JSON.stringify(validation, null, 2));
    
    if (!validation.isValid) {
      console.error(`OCR validation failed for receipt ${receiptId}:`, validation.errors);
      
      // Update receipt status to failed
      await pool.query(
        `UPDATE receipts 
         SET status = 'failed', 
             processing_errors = $1, 
             processed_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [validation.errors, receiptId]
      );
      
      // Log the failure
      await pool.query(
        `INSERT INTO processing_logs (receipt_id, log_level, message, context) 
         VALUES ($1, 'error', 'OCR validation failed', $2)`,
        [receiptId, JSON.stringify({ errors: validation.errors, warnings: validation.warnings })]
      );
      
      return;
    }

    // Update receipt with OCR data
    await pool.query(
      `UPDATE receipts 
       SET status = 'completed',
           receipt_date = $1,
           total_amount = $2,
           tax_amount = $3,
           subtotal = $4,
           ocr_raw_text = $5,
           processing_errors = $6,
           processed_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [
        ocrResult.receipt.date,
        ocrResult.receipt.total,
        ocrResult.receipt.tax,
        ocrResult.receipt.subtotal,
        ocrResult.rawText,
        JSON.stringify(validation.warnings),
        receiptId
      ]
    );

    // Find or create store
    let storeId = null;
    if (ocrResult.receipt.merchant) {
      const storeResult = await pool.query(
        'SELECT id FROM stores WHERE name ILIKE $1 LIMIT 1',
        [`%${ocrResult.receipt.merchant}%`]
      );
      
      if (storeResult.rows.length > 0) {
        storeId = storeResult.rows[0].id;
      } else {
        // Create new store
        const newStoreResult = await pool.query(
          'INSERT INTO stores (name, chain) VALUES ($1, $2) RETURNING id',
          [ocrResult.receipt.merchant, ocrResult.receipt.merchant]
        );
        storeId = newStoreResult.rows[0].id;
      }
      
      // Update receipt with store
      await pool.query(
        'UPDATE receipts SET store_id = $1 WHERE id = $2',
        [storeId, receiptId]
      );
    }

    // Insert receipt items
    if (ocrResult.receipt.items && ocrResult.receipt.items.length > 0) {
      console.log(`Inserting ${ocrResult.receipt.items.length} receipt items for receipt ${receiptId}`);
      for (const item of ocrResult.receipt.items) {
        await pool.query(
          `INSERT INTO receipt_items 
           (receipt_id, product_name, quantity, unit_price, line_total) 
           VALUES ($1, $2, $3, $4, $5)`,
          [
            receiptId,
            item.name,
            item.quantity || 1,
            item.unitPrice,
            item.totalPrice
          ]
        );
      }
    }

    // Log successful processing
    await pool.query(
      `INSERT INTO processing_logs (receipt_id, log_level, message, context) 
       VALUES ($1, 'info', 'Receipt processed successfully', $2)`,
      [receiptId, JSON.stringify({ 
        merchant: ocrResult.receipt.merchant,
        total: ocrResult.receipt.total,
        itemCount: ocrResult.receipt.items?.length || 0,
        confidence: ocrResult.confidence 
      })]
    );

    console.log(`Receipt ${receiptId} processed successfully`);

  } catch (error) {
    console.error(`Error processing receipt ${receiptId}:`, error);
    
    // Update receipt status to failed
    await pool.query(
      `UPDATE receipts 
       SET status = 'failed', 
           processing_errors = $1, 
           processed_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [[error.message], receiptId]
    );
    
    // Log the error
    await pool.query(
      `INSERT INTO processing_logs (receipt_id, log_level, message, context) 
       VALUES ($1, 'error', 'Receipt processing failed', $2)`,
      [receiptId, JSON.stringify({ error: error.message, stack: error.stack })]
    );
  }
}

app.get('/receipts', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const receiptsResult = await pool.query(
      `SELECT r.id, r.receipt_date, r.total_amount, r.status, r.created_at,
              s.name as store_name, s.chain as store_chain,
              COUNT(ri.id) as item_count
       FROM receipts r
       LEFT JOIN stores s ON r.store_id = s.id
       LEFT JOIN receipt_items ri ON r.id = ri.receipt_id
       WHERE r.user_id = $1
       GROUP BY r.id, s.name, s.chain
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.userId, limit, offset]
    );

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM receipts WHERE user_id = $1',
      [req.userId]
    );

    res.json({
      receipts: receiptsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Get receipts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/receipts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const receiptResult = await pool.query(
      `SELECT r.*, s.name as store_name, s.chain as store_chain, s.address as store_address
       FROM receipts r
       LEFT JOIN stores s ON r.store_id = s.id
       WHERE r.id = $1 AND r.user_id = $2`,
      [id, req.userId]
    );

    if (receiptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const receipt = receiptResult.rows[0];

    // Get receipt items
    const itemsResult = await pool.query(
      `SELECT ri.*, pc.name as category_name
       FROM receipt_items ri
       LEFT JOIN product_categories pc ON ri.category_id = pc.id
       WHERE ri.receipt_id = $1
       ORDER BY ri.created_at`,
      [id]
    );

    res.json({
      receipt,
      items: itemsResult.rows
    });
  } catch (error) {
    console.error('Get receipt details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// New endpoint to check receipt processing status
app.get('/receipts/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const receiptResult = await pool.query(
      `SELECT id, status, created_at, processed_at, processing_errors, total_amount, 
              ocr_raw_text
       FROM receipts 
       WHERE id = $1 AND user_id = $2`,
      [id, req.userId]
    );

    if (receiptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const receipt = receiptResult.rows[0];

    res.json({
      receipt: {
        id: receipt.id,
        status: receipt.status,
        uploadedAt: receipt.created_at,
        processedAt: receipt.processed_at,
        totalAmount: receipt.total_amount,
        errors: receipt.processing_errors,
        hasRawText: !!receipt.ocr_raw_text,
        hasProcessedData: !!receipt.ocr_raw_text
      }
    });
  } catch (error) {
    console.error('Get receipt status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Analytics endpoints
app.get('/analytics/spending', authenticateToken, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let dateCondition = '';
    switch (period) {
      case '7d':
        dateCondition = "AND r.receipt_date >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case '30d':
        dateCondition = "AND r.receipt_date >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      case '90d':
        dateCondition = "AND r.receipt_date >= CURRENT_DATE - INTERVAL '90 days'";
        break;
      case '1y':
        dateCondition = "AND r.receipt_date >= CURRENT_DATE - INTERVAL '1 year'";
        break;
    }

    // Total spending
    const totalResult = await pool.query(
      `SELECT 
         COALESCE(SUM(total_amount), 0) as total_spent,
         COUNT(*) as receipt_count,
         COALESCE(AVG(total_amount), 0) as avg_receipt_amount
       FROM receipts r
       WHERE user_id = $1 AND status = 'completed' ${dateCondition}`,
      [req.userId]
    );

    // Spending by category
    const categoryResult = await pool.query(
      `SELECT 
         pc.name as category,
         COALESCE(SUM(ri.line_total), 0) as total_spent,
         COUNT(ri.id) as item_count
       FROM receipt_items ri
       JOIN receipts r ON ri.receipt_id = r.id
       LEFT JOIN product_categories pc ON ri.category_id = pc.id
       WHERE r.user_id = $1 AND r.status = 'completed' ${dateCondition}
       GROUP BY pc.id, pc.name
       ORDER BY total_spent DESC`,
      [req.userId]
    );

    // Spending by store
    const storeResult = await pool.query(
      `SELECT 
         s.chain as store_chain,
         s.name as store_name,
         COALESCE(SUM(r.total_amount), 0) as total_spent,
         COUNT(r.id) as visit_count
       FROM receipts r
       LEFT JOIN stores s ON r.store_id = s.id
       WHERE r.user_id = $1 AND r.status = 'completed' ${dateCondition}
       GROUP BY s.chain, s.name
       ORDER BY total_spent DESC`,
      [req.userId]
    );

    // Spending trend by month (for trend chart)
    const trendResult = await pool.query(
      `SELECT 
         DATE_TRUNC('month', r.receipt_date) as month,
         COALESCE(SUM(r.total_amount), 0) as total_spent,
         COUNT(r.id) as receipt_count
       FROM receipts r
       WHERE r.user_id = $1 AND r.status = 'completed' ${dateCondition}
       GROUP BY DATE_TRUNC('month', r.receipt_date)
       ORDER BY month DESC
       LIMIT 12`,
      [req.userId]
    );

    // Recent receipts for linking to history
    const recentResult = await pool.query(
      `SELECT 
         r.id,
         r.receipt_date,
         r.total_amount,
         s.name as store_name,
         s.chain as store_chain
       FROM receipts r
       LEFT JOIN stores s ON r.store_id = s.id
       WHERE r.user_id = $1 AND r.status = 'completed' ${dateCondition}
       ORDER BY r.receipt_date DESC, r.created_at DESC
       LIMIT 10`,
      [req.userId]
    );

    res.json({
      summary: totalResult.rows[0],
      byCategory: categoryResult.rows,
      byStore: storeResult.rows,
      trend: trendResult.rows,
      recentReceipts: recentResult.rows,
      period
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User profile endpoints
app.get('/user/profile', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name, phone, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: userResult.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/user/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;

    const userResult = await pool.query(
      `UPDATE users 
       SET first_name = $1, last_name = $2, phone = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, email, first_name, last_name, phone, updated_at`,
      [firstName, lastName, phone, req.userId]
    );

    res.json({
      message: 'Profile updated successfully',
      user: userResult.rows[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// Admin endpoint to purge all mock/test data (before 404 handler)
app.post('/admin/purge-data', async (req, res) => {
  try {
    console.log('Admin: Purging all mock/test data from database...');

    // Delete all receipt items first (foreign key constraint)
    const itemsResult = await pool.query('DELETE FROM receipt_items');
    console.log(`Deleted ${itemsResult.rowCount} receipt items`);

    // Delete all receipts
    const receiptsResult = await pool.query('DELETE FROM receipts');
    console.log(`Deleted ${receiptsResult.rowCount} receipts`);

    // Delete all stores (they'll be recreated from real receipts)
    const storesResult = await pool.query('DELETE FROM stores');
    console.log(`Deleted ${storesResult.rowCount} stores`);

    // Delete processing logs if the table exists
    try {
      const logsResult = await pool.query('DELETE FROM processing_logs');
      console.log(`Deleted ${logsResult.rowCount} processing logs`);
    } catch (error) {
      console.log('Processing logs table does not exist (skipping)');
    }

    // Delete user sessions (force re-authentication with clean slate)
    const sessionsResult = await pool.query('DELETE FROM user_sessions');
    console.log(`Deleted ${sessionsResult.rowCount} user sessions`);

    const summary = {
      message: 'Database purged successfully - all mock data removed',
      deleted: {
        receipts: receiptsResult.rowCount,
        receipt_items: itemsResult.rowCount,
        stores: storesResult.rowCount,
        user_sessions: sessionsResult.rowCount
      },
      timestamp: new Date().toISOString()
    };

    console.log('Database purge completed:', summary);
    res.json(summary);

  } catch (error) {
    console.error('Error purging database:', error);
    res.status(500).json({ 
      error: 'Database purge failed',
      details: error.message 
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Start server first
    app.listen(PORT, () => {
      console.log(`GroceryPal API server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Initialize database in background after server starts
      if (process.env.DATABASE_URL) {
        console.log('Initializing database in background...');
        initializeDatabase().then(() => {
          console.log('Database initialization completed');
        }).catch(error => {
          console.error('Database initialization failed:', error);
          // Don't exit - server can still handle basic requests
        });
      }
    });
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;