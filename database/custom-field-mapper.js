// Custom Field Mapper for Receipt Data
// Maps TabScanner JSON to specific database structure requested by user

class CustomFieldMapper {
    constructor() {
        this.brandNormalization = {
            'trader joes': 'Trader Joes',
            'trader joe\'s': 'Trader Joes',
            'traderjoes': 'Trader Joes'
        };
    }

    /**
     * Maps raw TabScanner data to custom database structure
     * @param {Object} tabScannerData - Raw TabScanner response
     * @returns {Object} Mapped data structure
     */
    mapToCustomStructure(tabScannerData) {
        const result = tabScannerData.rawData?.result;
        
        if (!result) {
            throw new Error('No TabScanner result data found');
        }

        // Parse address components
        const addressData = this.parseAddress(result);
        
        // Parse tax fields (up to 2 distinct tax types)
        const taxData = this.parseTaxes(result);
        
        // Map items with type codes
        const itemsData = this.mapItems(result);

        return {
            // Store/Brand Information
            brand_name: this.normalizeBrandName(result.establishment || ''),
            
            // Address Fields
            street_number: addressData.street_number,
            street_name: addressData.street_name,
            city: addressData.city,
            state: addressData.state,
            zipcode: addressData.zipcode,
            
            // Date and Time
            date_field: this.formatDate(result.dateISO || result.date),
            time_field: this.formatTime(result.dateISO || result.date),
            
            // Financial Fields
            tax_field_1: taxData.tax_1,
            tax_field_2: taxData.tax_2,
            total_price_field: result.total || 0,
            
            // Items with type codes
            items: itemsData,
            
            // Additional context
            original_merchant: result.establishment,
            phone: result.phoneNumber,
            raw_address: result.address,
            confidence_score: this.calculateOverallConfidence(result)
        };
    }

    /**
     * Normalize brand names according to user specifications
     */
    normalizeBrandName(rawBrand) {
        const normalized = rawBrand.toLowerCase().trim();
        
        // Check for Trader Joes variations
        for (const [pattern, replacement] of Object.entries(this.brandNormalization)) {
            if (normalized.includes(pattern)) {
                return replacement;
            }
        }
        
        // Return cleaned version of original if no match
        return rawBrand.replace(/['"]/g, '').trim();
    }

    /**
     * Parse address into component fields
     */
    parseAddress(result) {
        const addressNorm = result.addressNorm || {};
        const rawAddress = result.address || '';
        
        return {
            street_number: addressNorm.number || this.extractStreetNumber(rawAddress),
            street_name: addressNorm.street || this.extractStreetName(rawAddress),
            city: addressNorm.city || null,
            state: addressNorm.state || null,
            zipcode: addressNorm.postcode || this.extractZipCode(rawAddress)
        };
    }

    /**
     * Extract street number from raw address string
     */
    extractStreetNumber(address) {
        const match = address.match(/\b(\d+)\b/);
        return match ? match[1] : null;
    }

    /**
     * Extract street name from raw address string
     */
    extractStreetName(address) {
        // Try to extract street name after number and before city
        const parts = address.split(',');
        if (parts.length > 0) {
            const streetPart = parts[0].trim();
            // Remove leading number and building name
            const streetName = streetPart
                .replace(/^\d+\s*/, '') // Remove leading numbers
                .replace(/^[^,]*\s\(\d+\)\s*,?\s*/, '') // Remove store info like "Portland (519)"
                .trim();
            
            return streetName || null;
        }
        return null;
    }

    /**
     * Extract zip code from raw address string
     */
    extractZipCode(address) {
        const match = address.match(/\b(\d{5}(?:-\d{4})?)\b/);
        return match ? match[1] : null;
    }

    /**
     * Parse distinct tax fields (up to 2)
     */
    parseTaxes(result) {
        const taxes = result.taxes || [];
        const summaryItems = result.summaryItems || [];
        
        // Extract tax items from summary
        const taxItems = summaryItems.filter(item => 
            item.lineType === 'Tax' || 
            item.desc.toLowerCase().includes('tax')
        );

        return {
            tax_1: taxes[0] || (taxItems[0] ? taxItems[0].lineTotal : 0),
            tax_2: taxes[1] || (taxItems[1] ? taxItems[1].lineTotal : 0)
        };
    }

    /**
     * Map items with type codes
     */
    mapItems(result) {
        const lineItems = result.lineItems || [];
        
        return lineItems.map((item, index) => ({
            item_name: item.descClean || item.desc,
            item_type_code: this.generateItemTypeCode(item, index),
            item_price: item.lineTotal || 0,
            quantity: item.qty || 1,
            unit_price: item.price || (item.lineTotal / (item.qty || 1)),
            unit: item.unit || 'each',
            category: this.categorizeItem(item.descClean || item.desc),
            confidence: item.confidence || 1.0
        }));
    }

    /**
     * Generate item type codes
     */
    generateItemTypeCode(item, index) {
        const name = (item.descClean || item.desc || '').toLowerCase();
        
        // Category-based type codes
        if (name.includes('produce') || name.includes('fruit') || name.includes('vegetable') || 
            name.includes('apple') || name.includes('banana') || name.includes('berries') ||
            name.includes('broccoli') || name.includes('spinach') || name.includes('onion')) {
            return 'PROD';
        }
        
        if (name.includes('milk') || name.includes('yogurt') || name.includes('cheese') ||
            name.includes('dairy')) {
            return 'DAIRY';
        }
        
        if (name.includes('bread') || name.includes('bakery')) {
            return 'BAKERY';
        }
        
        if (name.includes('meat') || name.includes('beef') || name.includes('chicken') ||
            name.includes('fish')) {
            return 'MEAT';
        }
        
        if (name.includes('beans') || name.includes('oil') || name.includes('pasta') ||
            name.includes('rice')) {
            return 'PANTRY';
        }
        
        if (name.includes('bottle') || name.includes('deposit') || name.includes('fee')) {
            return 'FEE';
        }
        
        // Default type code
        return 'MISC';
    }

    /**
     * Categorize items for better organization
     */
    categorizeItem(itemName) {
        const name = itemName.toLowerCase();
        
        if (name.includes('apple') || name.includes('berries') || name.includes('broccoli') ||
            name.includes('spinach') || name.includes('onion') || name.includes('potato') ||
            name.includes('lime') || name.includes('avocado') || name.includes('cauliflower')) {
            return 'produce';
        }
        
        if (name.includes('milk') || name.includes('coconut milk')) {
            return 'dairy';
        }
        
        if (name.includes('beans') || name.includes('oil')) {
            return 'pantry';
        }
        
        if (name.includes('sushi') || name.includes('wrap') || name.includes('curry')) {
            return 'prepared_food';
        }
        
        return 'other';
    }

    /**
     * Format date field
     */
    formatDate(dateString) {
        if (!dateString) return null;
        
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0]; // YYYY-MM-DD format
        } catch (error) {
            return dateString.split(' ')[0] || dateString;
        }
    }

    /**
     * Format time field
     */
    formatTime(dateString) {
        if (!dateString) return null;
        
        try {
            const date = new Date(dateString);
            return date.toTimeString().split(' ')[0]; // HH:MM:SS format
        } catch (error) {
            // Try to extract time from string
            const timeMatch = dateString.match(/(\d{1,2}:\d{2}:\d{2})/);
            return timeMatch ? timeMatch[1] : null;
        }
    }

    /**
     * Calculate overall confidence score
     */
    calculateOverallConfidence(result) {
        const confidenceScores = [
            result.establishmentConfidence,
            result.totalConfidence,
            result.dateConfidence
        ].filter(score => score !== undefined && score !== null);
        
        if (confidenceScores.length === 0) return 0.85; // Default confidence
        
        return confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
    }
}

module.exports = CustomFieldMapper;