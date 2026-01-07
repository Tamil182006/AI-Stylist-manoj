const express = require('express');
const router = express.Router();
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const Result = require('../models/Result');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');
require('dotenv').config();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configure Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: fs.readFileSync(path).toString("base64"),
            mimeType
        },
    };
}

function getColorRecommendations(skinTone, occasion) {
    const recommendations = {
        'Fair': {
            'Formal': ['Navy Blue', 'Charcoal Grey', 'Black', 'Burgundy'],
            'Semi-Formal': ['Olive Green', 'Beige', 'Light Grey', 'Dusty Pink'],
            'Casual': ['Pastel Blue', 'Light Pink', 'White', 'Mint Green']
        },
        'Medium': {
            'Formal': ['Navy Blue', 'Dark Grey', 'Deep Blue', 'Maroon'],
            'Semi-Formal': ['Tan', 'Forest Green', 'Rust Orange', 'Cream'],
            'Casual': ['Denim Blue', 'Olive', 'Burnt Orange', 'Teal']
        },
        'Dark': {
            'Formal': ['White', 'Light Grey', 'Sky Blue', 'Cream'],
            'Semi-Formal': ['Lavender', 'Peach', 'Light Yellow', 'Powder Blue'],
            'Casual': ['Bright White', 'Yellow', 'Hot Pink', 'Electric Blue']
        }
    };

    return recommendations[skinTone]?.[occasion] || ['Blue', 'Grey', 'White'];
}

// ============================================
// HAIRSTYLE & BEARD RECOMMENDATIONS
// ============================================
function getStyleRecommendations(faceShape) {
    const styles = {
        "Oval": {
            "hairstyle": "Pompadour, Side Part, or Slicked Back",
            "beardStyle": "Clean shaven or Light stubble"
        },
        "Round": {
            "hairstyle": "High Volume Undercut or Faux Hawk (adds height)",
            "beardStyle": "Goatee or Van Dyke (adds length to face)"
        },
        "Square": {
            "hairstyle": "Buzz Cut, Crew Cut, or Short Textured",
            "beardStyle": "Light Beard or Designer Stubble (softens angles)"
        },
        "Heart": {
            "hairstyle": "Long Fringe, Side Swept, or Textured Quiff",
            "beardStyle": "Full Beard (adds bulk to narrow jaw)"
        },
        "Oblong": {
            "hairstyle": "Side Swept with Volume or Fringe (reduces length)",
            "beardStyle": "Mutton Chops or Short Beard"
        }
    };

    return styles[faceShape] || styles["Oval"];
}

// ============================================
// PRODUCT SEARCH - WEB SCRAPING WITH PUPPETEER
// ============================================
const { searchProducts } = require('./puppeteerScraper');

// ============================================
// MAIN ANALYZE ROUTE
// ============================================
router.post('/analyze', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
    }

    const { occasion } = req.body;
    const imagePath = req.file.path;
    const absoluteImagePath = path.resolve(imagePath);

    // Path to Python script
    const scriptPath = path.join(__dirname, '../python/face_analysis.py');

    console.log(`Analyzing image: ${absoluteImagePath} for occasion: ${occasion}`);

    // Spawn Python process for face analysis
    const pythonProcess = spawn('python', [scriptPath, absoluteImagePath, occasion]);

    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        errorString += data.toString();
    });

    pythonProcess.on('close', async (code) => {
        console.log(`Python process exited with code ${code}`);

        if (code !== 0) {
            console.error('Python Error:', errorString);
            return res.status(500).json({ error: 'Analysis failed', details: errorString });
        }

        try {
            // Parse Python output
            const jsonStartIndex = dataString.indexOf('{');
            const jsonEndIndex = dataString.lastIndexOf('}');

            if (jsonStartIndex === -1 || jsonEndIndex === -1) {
                throw new Error("No JSON found in python output");
            }

            const cleanJsonString = dataString.substring(jsonStartIndex, jsonEndIndex + 1);
            const analysisResult = JSON.parse(cleanJsonString);

            if (analysisResult.error) {
                return res.status(400).json({ error: analysisResult.error });
            }

            console.log("✅ Face Analysis Complete:", analysisResult);

            // ============================================
            // STEP 1: Get Style & Beard Recommendations
            // ============================================
            const styleRecs = getStyleRecommendations(analysisResult.faceShape);

            // ============================================
            // STEP 2: Get Color Recommendations
            // ============================================
            const recommendedColors = getColorRecommendations(analysisResult.skinTone, occasion);

            console.log("🎨 Recommended Colors:", recommendedColors);

            // ============================================
            // STEP 3: Call Gemini for Style Category
            // ============================================

            // Map occasion to default style category (fallback)
            const defaultStyleCategories = {
                'Formal': 'Formal Business Attire',
                'Semi-Formal': 'Smart Casual',
                'Casual': 'Casual Streetwear'
            };

            let styleCategory = defaultStyleCategories[occasion] || 'Smart Casual';

            try {
                if (process.env.GEMINI_API_KEY) {
                    console.log("🤖 Calling Gemini for Style Category...");

                    // Use gemini-2.5-flash (newer model, might have separate quota)
                    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                    const imagePart = fileToGenerativePart(imagePath, req.file.mimetype);

                    const prompt = `
                        Analyze the person in this image and determine the BEST style category for them based on:
                        - Face Shape: ${analysisResult.faceShape}
                        - Skin Tone: ${analysisResult.skinTone}
                        - Occasion: ${occasion}
                        
                        Choose ONE category from:
                        - Formal Business Attire
                        - Smart Casual
                        - Casual Streetwear
                        - Party Evening Wear
                        - Traditional Ethnic
                        - Sporty Athletic
                        
                        Return ONLY the category name, nothing else. No explanation, no markdown.
                    `;

                    const result = await model.generateContent([prompt, imagePart]);
                    const response = await result.response;
                    styleCategory = response.text().trim();

                    console.log("✅ Gemini Style Category:", styleCategory);
                }
            } catch (geminiError) {
                console.error("❌ Gemini Error:", geminiError.message);
                console.log(`⚠️ Using fallback category: ${styleCategory}`);
            }

            // ============================================
            // STEP 4: Search for Products (Web Scraping)
            // ============================================
            console.log("🛍️ Searching for products via web scraping...");
            const products = await searchProducts(styleCategory, recommendedColors, occasion, {
                limit: 12,
                gender: 'men',
                sources: ['myntra', 'ajio'] // Can add 'flipkart' if needed
            });

            console.log(`✅ Found ${products.length} real products`);

            // ============================================
            // STEP 5: Save to MongoDB
            // ============================================
            const newResult = new Result({
                imagePath: req.file.path,
                occasion: occasion,
                faceShape: analysisResult.faceShape,
                skinTone: analysisResult.skinTone,
                outfit: styleCategory, // Store style category instead of specific outfit
                hairstyle: styleRecs.hairstyle,
                beardStyle: styleRecs.beardStyle,
            });

            await newResult.save();

            // ============================================
            // STEP 6: Return Complete Response
            // ============================================
            res.json({
                success: true,
                userImagePath: absoluteImagePath, // 👈 NEW: Send image path for try-on
                analysis: {
                    faceShape: analysisResult.faceShape,
                    skinTone: analysisResult.skinTone,
                    hairstyle: styleRecs.hairstyle,
                    beardStyle: styleRecs.beardStyle
                },
                styleCategory: styleCategory,
                recommendedColors: recommendedColors,
                products: products,
                message: "Analysis complete! Select a product to try on virtually."
            });

        } catch (err) {
            console.error('❌ Error:', err);
            res.status(500).json({
                error: 'Failed to process analysis',
                details: err.message
            });
        }
    });
});

module.exports = router;