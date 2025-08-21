// AI-Driven Data Parser for Receipt JSON
// Transforms raw TabScanner data into clean, structured, searchable format

class AIDataParser {
    constructor(openaiApiKey = null) {
        this.openaiApiKey = openaiApiKey || process.env.OPENAI_API_KEY;
        this.useAI = !!this.openaiApiKey;
        
        console.log('AIDataParser: AI Processing', this.useAI ? 'ENABLED' : 'DISABLED (using rule-based parsing)');
    }

    /**
     * Main parsing function - transforms raw TabScanner JSON into clean structured data
     * @param {Object} rawReceiptData - Raw receipt data with TabScanner JSON
     * @returns {Promise<Object>} Clean, structured receipt data
     */
    async parseReceiptData(rawReceiptData) {
        console.log('🤖 AI Data Parser: Starting intelligent parsing...');
        
        const result = {
            // Core receipt information
            receipt: {
                id: rawReceiptData.receipt_info?.id || null,
                processing_status: 'ai_parsed',
                confidence_score: 0
            },
            
            // Enhanced store information
            store: {
                name: null,
                chain: null,
                normalized_name: null, // AI-cleaned store name
                location: {
                    address: null,
                    city: null,
                    state: null,
                    zip: null,
                    coordinates: null // Future: geocoding
                },
                contact: {
                    phone: null,
                    website: null
                },
                store_id: null,
                store_type: null // grocery, pharmacy, restaurant, etc.
            },

            // Enhanced transaction details
            transaction: {
                date: null,
                time: null,
                datetime_iso: null,
                payment_method: null,
                card_type: null,
                card_last4: null,
                transaction_id: null
            },

            // Enhanced financial breakdown
            financial: {
                subtotal: 0,
                tax_total: 0,
                fees: 0,
                discounts: 0,
                tips: 0,
                grand_total: 0,
                currency: 'USD',
                tax_breakdown: [], // Different tax rates
                payment_breakdown: [] // Cash, card, etc.
            },

            // AI-enhanced items with categorization
            items: [],

            // AI-derived insights
            insights: {
                meal_type: null, // breakfast, lunch, dinner, snack
                cuisine_type: null, // italian, mexican, etc.
                dietary_flags: [], // vegetarian, gluten-free, organic
                shopping_category: null, // grocery, dining, convenience
                estimated_people: 1, // AI estimate based on quantities
                health_score: null, // AI assessment of healthiness
                sustainability_score: null // organic, local, eco-friendly items
            },

            // Quality metrics
            quality: {
                ocr_confidence: 0,
                ai_confidence: 0,
                data_completeness: 0,
                validation_errors: [],
                processing_time: null
            }
        };

        const startTime = Date.now();

        try {
            // Step 1: Extract base data from TabScanner
            await this.extractBaseData(rawReceiptData, result);

            // Step 2: AI-enhance store information
            if (this.useAI) {
                await this.aiEnhanceStore(rawReceiptData, result);
                await this.aiCategorizeItems(rawReceiptData, result);
                await this.aiGenerateInsights(rawReceiptData, result);
            } else {
                await this.ruleBasedEnhancements(rawReceiptData, result);
            }

            // Step 3: Validate and score data quality
            this.calculateQualityMetrics(result);
            
            result.quality.processing_time = Date.now() - startTime;
            
            console.log('✅ AI Data Parser: Processing complete');
            console.log(`   Confidence: ${result.quality.ai_confidence}%`);
            console.log(`   Items processed: ${result.items.length}`);
            console.log(`   Processing time: ${result.quality.processing_time}ms`);

            return result;

        } catch (error) {
            console.error('❌ AI Data Parser error:', error.message);
            result.quality.validation_errors.push(error.message);
            return result;
        }
    }

    /**
     * Extract base data from raw TabScanner JSON or LLM processed data
     */
    async extractBaseData(rawReceiptData, result) {
        // Support both TabScanner format and existing LLM processed data
        let tabscannerData = rawReceiptData.tabscanner_full_response?.rawData?.result;
        
        // If no TabScanner data, try to use LLM processed data (which is mapped to tabscanner_full_response)
        if (!tabscannerData && rawReceiptData.tabscanner_full_response) {
            const llmData = rawReceiptData.tabscanner_full_response;
            tabscannerData = this.convertLLMDataToTabScannerFormat(llmData);
        }
        
        // Direct fallback to llm_processed_data if still no data
        if (!tabscannerData && rawReceiptData.llm_processed_data) {
            const llmData = rawReceiptData.llm_processed_data;
            tabscannerData = this.convertLLMDataToTabScannerFormat(llmData);
        }
        
        if (!tabscannerData) {
            throw new Error('No TabScanner data found in input');
        }

        // Store information
        result.store.name = tabscannerData.establishment || rawReceiptData.receipt_info?.store_name;
        result.store.chain = result.store.name; // Will be AI-enhanced later
        result.store.location.address = tabscannerData.address;
        result.store.contact.phone = tabscannerData.phoneNumber;
        result.store.contact.website = tabscannerData.customFields?.URL;
        result.store.store_id = tabscannerData.customFields?.StoreID;

        // Parse address if available
        if (tabscannerData.addressNorm) {
            result.store.location.city = tabscannerData.addressNorm.city;
            result.store.location.state = tabscannerData.addressNorm.state;
            result.store.location.zip = tabscannerData.addressNorm.postcode;
        }

        // Transaction details
        result.transaction.date = tabscannerData.dateISO ? tabscannerData.dateISO.split('T')[0] : tabscannerData.date;
        result.transaction.time = tabscannerData.dateISO ? tabscannerData.dateISO.split('T')[1] : null;
        result.transaction.datetime_iso = tabscannerData.dateISO;
        result.transaction.payment_method = tabscannerData.paymentMethod;
        result.transaction.card_last4 = tabscannerData.customFields?.CardLast4Digits;

        // Financial data
        result.financial.subtotal = parseFloat(tabscannerData.subTotal) || 0;
        result.financial.tax_total = parseFloat(tabscannerData.tax) || 0;
        result.financial.grand_total = parseFloat(tabscannerData.total) || parseFloat(rawReceiptData.receipt_info?.total_amount) || 0;
        result.financial.currency = tabscannerData.currency || 'USD';
        
        // Process tax breakdown
        if (tabscannerData.taxes && Array.isArray(tabscannerData.taxes)) {
            result.financial.tax_breakdown = tabscannerData.taxes.map(tax => ({ amount: tax }));
        }

        // Extract base items
        if (tabscannerData.lineItems && Array.isArray(tabscannerData.lineItems)) {
            result.items = tabscannerData.lineItems.map((item, index) => ({
                id: `item_${index}`,
                name: item.descClean || item.desc,
                original_name: item.desc,
                quantity: parseFloat(item.qty) || 1,
                unit_price: parseFloat(item.price) || null,
                line_total: parseFloat(item.lineTotal) || 0,
                unit: item.unit || null,
                
                // Will be enhanced by AI
                category: null,
                subcategory: null,
                brand: null,
                product_type: null,
                dietary_tags: [],
                nutrition_category: null, // healthy, neutral, unhealthy
                
                // Technical data
                confidence: item.confidence || 1.0,
                symbols: item.symbols || [],
                product_code: item.productCode || null
            }));
        }

        // Initial quality scoring
        result.quality.ocr_confidence = this.calculateAverageConfidence(tabscannerData);
    }

    /**
     * Convert LLM processed data to TabScanner format for compatibility
     */
    convertLLMDataToTabScannerFormat(llmData) {
        const receipt = llmData.receipt || {};
        
        return {
            establishment: receipt.merchant || 'Unknown Store',
            address: receipt.address || null,
            phoneNumber: receipt.phone || null,
            date: receipt.date || null,
            dateISO: receipt.date ? `${receipt.date}T${receipt.time || '00:00:00'}` : null,
            total: receipt.total || 0,
            subTotal: receipt.subtotal || 0,
            tax: receipt.tax || 0,
            currency: 'USD',
            paymentMethod: null,
            establishmentConfidence: llmData.confidence || 0.9,
            totalConfidence: llmData.confidence || 0.9,
            dateConfidence: llmData.confidence || 0.9,
            lineItems: receipt.items ? receipt.items.map((item, index) => ({
                desc: item.name || `Item ${index + 1}`,
                descClean: item.name || `Item ${index + 1}`,
                qty: item.quantity || 1,
                price: item.unitPrice || item.price || item.unit_price || 0,
                lineTotal: item.totalPrice || item.total || item.line_total || (item.unitPrice * (item.quantity || 1)) || 0,
                unit: item.unit || 'each',
                confidence: item.confidence || 0.9,
                symbols: [],
                productCode: null
            })) : []
        };
    }

    /**
     * AI-enhanced store information processing
     */
    async aiEnhanceStore(rawReceiptData, result) {
        if (!this.useAI) return;

        console.log('🤖 AI enhancing store information...');

        const storePrompt = `
Analyze this store information and provide enhanced details in JSON format:

Store Name: ${result.store.name}
Address: ${result.store.location.address}
Phone: ${result.store.contact.phone}
Website: ${result.store.contact.website}

Return JSON with:
{
  "normalized_name": "Clean, standardized store name",
  "chain": "Parent company/chain name",
  "store_type": "grocery|pharmacy|restaurant|convenience|department|specialty",
  "location_type": "urban|suburban|rural|mall|standalone",
  "known_for": ["key characteristics", "specialty items"],
  "price_range": "budget|mid-range|premium"
}
`;

        try {
            const aiResponse = await this.callOpenAI(storePrompt);
            const storeData = JSON.parse(aiResponse);
            
            result.store.normalized_name = storeData.normalized_name;
            result.store.chain = storeData.chain;
            result.store.store_type = storeData.store_type;
            result.store.location_type = storeData.location_type;
            result.store.known_for = storeData.known_for;
            result.store.price_range = storeData.price_range;
            
        } catch (error) {
            console.log('AI store enhancement failed, using fallback logic');
            this.fallbackStoreEnhancement(result);
        }
        
        // Always ensure normalized_name is set (safety check)
        if (!result.store.normalized_name) {
            result.store.normalized_name = result.store.name || result.store.chain || 'Unknown Store';
        }
    }

    /**
     * AI-powered item categorization and enhancement
     */
    async aiCategorizeItems(rawReceiptData, result) {
        if (!this.useAI || !result.items.length) return;

        console.log('🤖 AI categorizing items...');

        // Process items in batches of 10
        const batchSize = 10;
        for (let i = 0; i < result.items.length; i += batchSize) {
            const batch = result.items.slice(i, i + batchSize);
            await this.processItemBatch(batch);
        }
    }

    async processItemBatch(items) {
        const itemList = items.map(item => `${item.name} - $${item.line_total}`).join('\n');
        
        const itemsPrompt = `
Analyze these grocery/retail items and enhance each with categories and tags:

Items:
${itemList}

For each item, return JSON array with objects containing:
{
  "name": "original item name",
  "category": "produce|dairy|meat|bakery|pantry|frozen|beverages|snacks|health|household|other",
  "subcategory": "specific subcategory",
  "brand": "brand name if identifiable",
  "product_type": "specific product description",
  "dietary_tags": ["organic", "gluten-free", "vegan", "vegetarian", "keto", "low-fat", etc.],
  "nutrition_category": "healthy|neutral|unhealthy",
  "size_info": "package size/weight if mentioned"
}
`;

        try {
            const aiResponse = await this.callOpenAI(itemsPrompt);
            const enhancedItems = JSON.parse(aiResponse);
            
            // Apply AI enhancements to items
            enhancedItems.forEach((enhanced, index) => {
                if (items[index]) {
                    Object.assign(items[index], enhanced);
                }
            });
            
        } catch (error) {
            console.log('AI item categorization failed for batch, using fallback');
            this.fallbackItemCategorization(items);
        }
    }

    /**
     * AI-generated shopping insights
     */
    async aiGenerateInsights(rawReceiptData, result) {
        if (!this.useAI) return;

        console.log('🤖 AI generating shopping insights...');

        const itemSummary = result.items.slice(0, 20).map(item => 
            `${item.name} (${item.quantity}x $${item.line_total})`
        ).join(', ');

        const insightsPrompt = `
Analyze this shopping receipt and provide insights:

Store: ${result.store.name}
Total: $${result.financial.grand_total}
Items: ${itemSummary}
Date: ${result.transaction.date}
Time: ${result.transaction.time}

Return JSON with insights:
{
  "meal_type": "breakfast|lunch|dinner|snack|mixed|grocery-shopping",
  "cuisine_type": "american|italian|mexican|asian|mediterranean|mixed|other",
  "dietary_flags": ["vegetarian", "vegan", "organic", "gluten-free", "keto", "healthy", "processed"],
  "shopping_category": "grocery|quick-meal|dining|convenience|bulk-shopping",
  "estimated_people": number,
  "health_score": 1-10,
  "sustainability_score": 1-10,
  "budget_category": "budget|moderate|premium",
  "shopping_pattern": "planned|impulse|routine|special-occasion"
}
`;

        try {
            const aiResponse = await this.callOpenAI(insightsPrompt);
            const insights = JSON.parse(aiResponse);
            
            Object.assign(result.insights, insights);
            
        } catch (error) {
            console.log('AI insights generation failed, using fallback');
            this.fallbackInsightsGeneration(result);
        }
    }

    /**
     * Rule-based enhancements when AI is not available
     */
    async ruleBasedEnhancements(rawReceiptData, result) {
        console.log('🔧 Using rule-based enhancements...');
        
        this.fallbackStoreEnhancement(result);
        this.fallbackItemCategorization(result.items);
        this.fallbackInsightsGeneration(result);
        
        // Final safety checks
        if (!result.store.normalized_name) {
            result.store.normalized_name = result.store.name || result.store.chain || 'Unknown Store';
        }
    }

    fallbackStoreEnhancement(result) {
        const storeName = result.store.name?.toLowerCase() || '';
        
        // Common store chains
        const storePatterns = {
            'trader joe': { chain: "Trader Joe's", type: 'grocery', price_range: 'mid-range' },
            'whole foods': { chain: 'Whole Foods Market', type: 'grocery', price_range: 'premium' },
            'walmart': { chain: 'Walmart', type: 'department', price_range: 'budget' },
            'target': { chain: 'Target', type: 'department', price_range: 'mid-range' },
            'kroger': { chain: 'Kroger', type: 'grocery', price_range: 'mid-range' },
            'safeway': { chain: 'Safeway', type: 'grocery', price_range: 'mid-range' }
        };

        for (const [pattern, data] of Object.entries(storePatterns)) {
            if (storeName.includes(pattern)) {
                result.store.chain = data.chain;
                result.store.normalized_name = data.chain;
                result.store.store_type = data.type;
                result.store.price_range = data.price_range;
                break;
            }
        }
        
        // Ensure we always have a normalized name
        if (!result.store.normalized_name) {
            result.store.normalized_name = result.store.name || result.store.chain || 'Unknown Store';
        }
        
        // Set default values if not already set
        if (!result.store.store_type) {
            result.store.store_type = 'grocery'; // Default assumption
        }
    }

    fallbackItemCategorization(items) {
        const categoryRules = {
            produce: ['banana', 'apple', 'orange', 'lettuce', 'tomato', 'onion', 'potato', 'carrot', 'broccoli', 'spinach'],
            dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'eggs'],
            meat: ['chicken', 'beef', 'pork', 'fish', 'salmon', 'turkey', 'bacon'],
            bakery: ['bread', 'bagel', 'muffin', 'croissant', 'cake', 'cookie'],
            beverages: ['water', 'soda', 'juice', 'coffee', 'tea', 'beer', 'wine'],
            pantry: ['rice', 'pasta', 'cereal', 'beans', 'oil', 'sauce', 'spice'],
            frozen: ['frozen', 'ice cream', 'pizza'],
            snacks: ['chips', 'crackers', 'nuts', 'candy', 'chocolate']
        };

        items.forEach(item => {
            const itemName = item.name?.toLowerCase() || '';
            
            for (const [category, keywords] of Object.entries(categoryRules)) {
                if (keywords.some(keyword => itemName.includes(keyword))) {
                    item.category = category;
                    item.nutrition_category = ['produce', 'dairy'].includes(category) ? 'healthy' : 'neutral';
                    break;
                }
            }
            
            if (!item.category) {
                item.category = 'other';
                item.nutrition_category = 'neutral';
            }
        });
    }

    fallbackInsightsGeneration(result) {
        const totalAmount = result.financial.grand_total;
        const itemCount = result.items.length;
        
        result.insights.shopping_category = totalAmount > 50 ? 'grocery' : 'convenience';
        result.insights.estimated_people = Math.max(1, Math.floor(itemCount / 15));
        result.insights.budget_category = totalAmount < 25 ? 'budget' : totalAmount < 100 ? 'moderate' : 'premium';
    }

    /**
     * Calculate quality metrics and confidence scores
     */
    calculateQualityMetrics(result) {
        let completenessScore = 0;
        let totalFields = 0;

        // Check completeness of key fields
        const checks = [
            result.store.name,
            result.store.normalized_name,
            result.transaction.date,
            result.financial.grand_total > 0,
            result.items.length > 0,
            result.store.store_type
        ];

        checks.forEach(check => {
            totalFields++;
            if (check) completenessScore++;
        });

        result.quality.data_completeness = Math.round((completenessScore / totalFields) * 100);
        result.quality.ai_confidence = Math.min(95, result.quality.data_completeness + 10);
        
        // Factor in OCR confidence
        result.quality.ai_confidence = Math.round(
            (result.quality.ai_confidence + result.quality.ocr_confidence * 100) / 2
        );
    }

    calculateAverageConfidence(tabscannerData) {
        const confidenceScores = [
            tabscannerData.establishmentConfidence,
            tabscannerData.totalConfidence,
            tabscannerData.dateConfidence
        ].filter(score => score !== undefined && score !== null);

        if (confidenceScores.length === 0) return 0.8; // Default
        
        return confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
    }

    /**
     * Call OpenAI API (placeholder - implement based on your preference)
     */
    async callOpenAI(prompt) {
        // This is a placeholder - implement your preferred AI service
        // Could use OpenAI, Claude, local models, etc.
        
        if (!this.openaiApiKey) {
            throw new Error('No AI API key configured');
        }

        // Example implementation would go here
        // For now, throwing error to use fallback methods
        throw new Error('AI API not implemented - using fallback methods');
    }
}

module.exports = AIDataParser;