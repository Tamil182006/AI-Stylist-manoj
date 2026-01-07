const puppeteer = require('puppeteer');

// ============================================
// MYNTRA SCRAPER WITH PUPPETEER
// ============================================
async function scrapeMyntraWithBrowser(searchQuery, limit = 10) {
    let browser;
    try {
        console.log(`🔍 Scraping Myntra with browser: ${searchQuery}`);
        
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });
        
        const page = await browser.newPage();
        
        // Set realistic viewport and user agent
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        const url = `https://www.myntra.com/${searchQuery.toLowerCase().replace(/\s+/g, '-')}`;
        
        // Go to page and wait for content
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // Wait for product grid to load
        await page.waitForSelector('.product-base', { timeout: 10000 }).catch(() => {
            console.log('Product grid not found, trying alternative selectors...');
        });
        
        // Extract product data
        const products = await page.evaluate((limit) => {
            const items = [];
            const productCards = document.querySelectorAll('.product-base');
            
            for (let i = 0; i < Math.min(productCards.length, limit); i++) {
                const card = productCards[i];
                
                const name = card.querySelector('.product-product')?.textContent?.trim();
                const brand = card.querySelector('.product-brand')?.textContent?.trim();
                const price = card.querySelector('.product-discountedPrice')?.textContent?.trim();
                const originalPrice = card.querySelector('.product-strike')?.textContent?.trim();
                const discount = card.querySelector('.product-discountPercentage')?.textContent?.trim();
                const image = card.querySelector('img')?.src;
                const link = card.querySelector('a')?.href;
                
                if (name && price && image) {
                    items.push({
                        id: `myntra-${Date.now()}-${i}`,
                        name: `${brand || ''} ${name}`,
                        brand: brand,
                        price: price,
                        originalPrice: originalPrice,
                        discount: discount,
                        image: image,
                        buyLink: link,
                        category: 'upper_body',
                        source: 'Myntra'
                    });
                }
            }
            
            return items;
        }, limit);
        
        await browser.close();
        
        console.log(`✅ Myntra: Found ${products.length} products`);
        return products;
        
    } catch (error) {
        console.error('❌ Myntra browser scraping failed:', error.message);
        if (browser) await browser.close();
        return [];
    }
}

// ============================================
// AJIO SCRAPER WITH PUPPETEER
// ============================================
async function scrapeAjioWithBrowser(searchQuery, limit = 10) {
    let browser;
    try {
        console.log(`🔍 Scraping Ajio with browser: ${searchQuery}`);
        
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        const url = `https://www.ajio.com/search/?text=${encodeURIComponent(searchQuery)}`;
        
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // Wait for products
        await page.waitForSelector('.item', { timeout: 10000 }).catch(() => {
            console.log('Ajio products not found');
        });
        
        const products = await page.evaluate((limit) => {
            const items = [];
            const productCards = document.querySelectorAll('.item');
            
            for (let i = 0; i < Math.min(productCards.length, limit); i++) {
                const card = productCards[i];
                
                const name = card.querySelector('.nameCls')?.textContent?.trim();
                const brand = card.querySelector('.brand')?.textContent?.trim();
                const price = card.querySelector('.price')?.textContent?.trim();
                const image = card.querySelector('img')?.src;
                const link = card.querySelector('a')?.href;
                
                if (name && price) {
                    items.push({
                        id: `ajio-${Date.now()}-${i}`,
                        name: `${brand || ''} ${name}`,
                        brand: brand,
                        price: price,
                        image: image?.startsWith('http') ? image : `https:${image}`,
                        buyLink: link,
                        category: 'upper_body',
                        source: 'Ajio'
                    });
                }
            }
            
            return items;
        }, limit);
        
        await browser.close();
        
        console.log(`✅ Ajio: Found ${products.length} products`);
        return products;
        
    } catch (error) {
        console.error('❌ Ajio browser scraping failed:', error.message);
        if (browser) await browser.close();
        return [];
    }
}

// ============================================
// SEARCH QUERY BUILDER
// ============================================
function buildSearchQuery(styleCategory, colors, occasion) {
    const categoryMap = {
        'Formal Business Attire': 'formal shirt men',
        'Smart Casual': 'casual shirt men',
        'Casual Streetwear': 'tshirt men',
        'Party Evening Wear': 'party shirt men',
        'Traditional Ethnic': 'kurta men',
        'Sporty Athletic': 'sports tshirt men'
    };
    
    const baseQuery = categoryMap[styleCategory] || 'shirt men';
    const color = colors[0]?.toLowerCase() || '';
    
    return `${color} ${baseQuery}`;
}

// ============================================
// MAIN SEARCH FUNCTION
// ============================================
async function searchProducts(styleCategory, colors, occasion, options = {}) {
    const { limit = 12 } = options;
    
    console.log(`\n🛍️ Starting product search...`);
    console.log(`Style: ${styleCategory}, Colors: ${colors.join(', ')}`);
    
    const searchQuery = buildSearchQuery(styleCategory, colors, occasion);
    console.log(`📝 Search Query: "${searchQuery}"\n`);
    
    let allProducts = [];
    
    // Try Myntra with Puppeteer
    try {
        const myntraProducts = await scrapeMyntraWithBrowser(searchQuery, Math.ceil(limit / 2));
        allProducts = [...allProducts, ...myntraProducts];
    } catch (e) {
        console.log('Myntra failed, continuing...');
    }
    
    // Try Ajio if not enough products
    if (allProducts.length < limit) {
        try {
            const ajioProducts = await scrapeAjioWithBrowser(searchQuery, limit - allProducts.length);
            allProducts = [...allProducts, ...ajioProducts];
        } catch (e) {
            console.log('Ajio failed, continuing...');
        }
    }
    
    // Fallback to mock data
    if (allProducts.length === 0) {
        console.log('⚠️ All scraping failed, using mock data');
        return getMockProducts(styleCategory, colors);
    }
    
    console.log(`\n✅ Total: ${allProducts.length} products found\n`);
    return allProducts.slice(0, limit);
}

// ============================================
// MOCK DATA FALLBACK
// ============================================
function getMockProducts(styleCategory, colors) {
    return [
        {
            id: 'mock-1',
            name: `${colors[0]} ${styleCategory} Shirt`,
            brand: 'Generic Brand',
            price: '₹1,299',
            image: 'https://via.placeholder.com/300x400?text=Product+1',
            buyLink: 'https://www.myntra.com',
            category: 'upper_body',
            source: 'Mock'
        },
        {
            id: 'mock-2',
            name: `${colors[1]} Premium Blazer`,
            brand: 'Generic Brand',
            price: '₹3,499',
            image: 'https://via.placeholder.com/300x400?text=Product+2',
            buyLink: 'https://www.myntra.com',
            category: 'upper_body',
            source: 'Mock'
        },
        {
            id: 'mock-3',
            name: `${colors[0]} Complete Outfit`,
            brand: 'Generic Brand',
            price: '₹5,999',
            image: 'https://via.placeholder.com/300x400?text=Product+3',
            buyLink: 'https://www.myntra.com',
            category: 'full_body',
            source: 'Mock'
        }
    ];
}

module.exports = {
    searchProducts,
    scrapeMyntraWithBrowser,
    scrapeAjioWithBrowser
};