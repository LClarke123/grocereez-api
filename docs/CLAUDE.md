# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GroceryPal is a receipt scanning and grocery analytics MVP built with Node.js, Express, and PostgreSQL. It integrates with TabScanner OCR API to extract receipt data and provides analytics on spending patterns.

### Core Architecture

- **Backend**: Node.js + Express.js REST API
- **Database**: PostgreSQL with UUID primary keys
- **OCR**: TabScanner API integration with fallback to mock data
- **Authentication**: JWT with session tracking in database
- **File Handling**: Multer for receipt image uploads (10MB limit)

## Development Commands

### Essential Commands
```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Run tests
npm test

# Database migration (creates all tables)
npm run migrate
```

### Database Setup
```bash
# Run database migration to create schema
node migrate.js
```

### OCR Testing
```bash
# Test OCR functionality with real receipt (requires receipt image in test-images/)
node test-ocr.js
```

## Database Architecture

### Key Tables
- **users**: User accounts with JWT authentication
- **receipts**: Receipt metadata and OCR processing status
- **receipt_items**: Individual line items from receipts
- **stores**: Normalized store information
- **product_categories**: Hierarchical categorization system
- **user_sessions**: JWT session management
- **processing_logs**: OCR processing logs for debugging

### Processing States
Receipts go through these states:
1. `uploaded` - Initial upload
2. `processing` - OCR in progress
3. `completed` - Successfully processed
4. `failed` - Processing failed
5. `invalid` - Invalid receipt data

## API Structure

### Core Endpoints
- `POST /auth/register` - User registration
- `POST /auth/login` - User authentication
- `POST /receipts/upload` - Receipt upload with OCR processing
- `GET /receipts/:id/status` - Check OCR processing status
- `GET /receipts/:id` - Get receipt details with items
- `GET /analytics/spending` - Spending analytics by category/store

### Authentication
All protected endpoints require `Authorization: Bearer <token>` header. Sessions are tracked in database with expiration.

## OCR Processing

### TabScanner Integration
The OCRService (`services/ocrService.js`) handles:
- Real TabScanner API calls when `TABSCANNER_API_KEY` is configured
- Mock data fallback for development
- Async processing with status updates
- Validation and error handling

### Required Environment Variables
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
TABSCANNER_API_KEY=your-api-key (optional - uses mock data if not set)
```

## File Upload Handling

- Images uploaded via multipart/form-data
- 10MB file size limit
- Accepts jpg, jpeg, png, gif formats
- Files processed in memory (not saved to disk)
- Async OCR processing after upload response

## Error Handling Patterns

- Database errors logged and return generic 500 responses
- OCR failures fall back to mock data during development
- Rate limiting on auth endpoints (5 requests/15min)
- Global rate limiting (100 requests/15min)
- Validation errors return 400 with specific messages

## Testing Strategy

- Use `test-ocr.js` for end-to-end OCR testing
- Place test receipt images in `test-images/` directory
- Jest configured for unit testing (no tests currently written)
- API endpoints tested via integration tests in `test-ocr.js`

## Security Implementation

- Helmet.js for security headers
- CORS configured for specific origins
- Password hashing with bcryptjs (12 rounds)
- JWT tokens with 30-day expiration
- Session tracking prevents token reuse after logout
- SQL injection protection via parameterized queries

## Common Development Workflows

### Adding New Endpoints
1. Add route handler in `server.js`
2. Use `authenticateToken` middleware for protected routes
3. Handle errors with try/catch and consistent error responses
4. Update database queries with proper parameterization

### Database Changes
1. Modify `schema.sql`
2. Run `node migrate.js` to apply changes
3. Consider data migration for existing installations

### OCR Enhancement
1. Modify parsing logic in `services/ocrService.js`
2. Test with real TabScanner API responses
3. Update validation rules in `validateOCRResult()`
4. Add processing logs for debugging