const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
require('dotenv').config();

// ============================================
// VIRTUAL TRY-ON USING HUGGING FACE SPACES
// ============================================
router.post('/virtual-tryon', async (req, res) => {
    try {
        console.log('\n🎨 Virtual Try-On Request Started...');
        
        const { userImagePath, productImageUrl } = req.body;
        
        if (!userImagePath || !productImageUrl) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing userImagePath or productImageUrl' 
            });
        }
        
        console.log('📥 User Image Path:', userImagePath);
        console.log('📥 Product Image URL:', productImageUrl);
        
        // Read user's image
        console.log('📤 Reading user image...');
        const userImageBuffer = fs.readFileSync(userImagePath);
        const userImageBase64 = userImageBuffer.toString('base64');
        
        // Download product image
        console.log('⬇️ Downloading product image...');
        const productResponse = await axios.get(productImageUrl, { 
            responseType: 'arraybuffer',
            timeout: 10000
        });
        const productImageBase64 = Buffer.from(productResponse.data).toString('base64');
        
        console.log('✅ Both images ready');
        console.log('🤖 Calling Hugging Face Virtual Try-On API...');
        
        // Create form data for Hugging Face API
        const formData = new FormData();
        formData.append('data', JSON.stringify([
            `data:image/jpeg;base64,${userImageBase64}`,  // Person image
            `data:image/jpeg;base64,${productImageBase64}`,  // Garment image
            "clothing"  // Category
        ]));
        
        // Call Hugging Face Spaces API (IDM-VTON)
        // This is a free public space!
        const hfResponse = await axios.post(
            'https://yisol-idm-vton.hf.space/run/predict',
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                },
                timeout: 120000 // 2 minute timeout (try-on takes time)
            }
        );
        
        console.log('✅ Hugging Face API responded!');
        
        // Parse response
        if (hfResponse.data && hfResponse.data.data) {
            const resultImageUrl = hfResponse.data.data[0];
            
            // Download result image
            console.log('📥 Downloading result image...');
            const resultResponse = await axios.get(resultImageUrl, {
                responseType: 'arraybuffer',
                timeout: 30000
            });
            
            const resultBase64 = Buffer.from(resultResponse.data).toString('base64');
            
            console.log('✅ Virtual try-on successful!\n');
            
            res.json({
                success: true,
                resultImageBase64: resultBase64
            });
        } else {
            throw new Error('Invalid response from Hugging Face API');
        }
        
    } catch (error) {
        console.error('❌ Virtual try-on error:', error.message);
        
        if (error.code === 'ETIMEDOUT') {
            return res.status(504).json({
                success: false,
                error: 'Virtual try-on timed out. The service might be busy. Please try again.'
            });
        }
        
        res.status(500).json({
            success: false,
            error: error.message || 'Virtual try-on failed'
        });
    }
});

// ============================================
// HEALTH CHECK
// ============================================
router.get('/tryon-health', async (req, res) => {
    res.json({
        backend: 'healthy',
        method: 'Hugging Face Spaces (Free)',
        model: 'IDM-VTON'
    });
});

module.exports = router;