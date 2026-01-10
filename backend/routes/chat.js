const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { searchForOutfitBuilder } = require('./outfitScarpper');

const JWT_SECRET = process.env.JWT_SECRET || 'xxx1718zzz-manoj';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware to verify JWT token
const authenticate = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
};

// @route   POST /api/chat/message
// @desc    Send message to AI chatbot with profile context
// @access  Private
router.post('/message', authenticate, async (req, res) => {
    try {
        const { message, conversationHistory } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        // Get user with profile
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        console.log(`💬 Chat message from ${user.name}: "${message}"`);

        // Build context with user's profile
        const profile = user.styleProfile;
        const hasProfile = profile && profile.physical;

        let systemContext = `You are a personal AI fashion stylist assistant. Be friendly, helpful, and encouraging.

IMPORTANT RESPONSE STYLE:
- Keep responses SHORT and CONCISE (2-3 sentences max for simple questions)
- Only give detailed answers when specifically asked for explanations
- Be conversational and natural, not robotic
- Use bullet points for lists when needed`;

        if (hasProfile) {
            systemContext += `

USER'S STYLE PROFILE:
- Name: ${user.name}
- Face Shape: ${profile.physical?.faceShape?.type} (${Math.round((profile.physical?.faceShape?.confidence || 0.8) * 100)}% confidence)
- Skin Tone: ${profile.physical?.skinTone?.category} with ${profile.physical?.skinTone?.undertone} undertone (${profile.physical?.skinTone?.hex})
- Body Type: ${profile.bodyType?.category} - ${profile.bodyType?.build || 'Average'} build
- Primary Style: ${profile.stylePersonality?.primary?.type} (${profile.stylePersonality?.primary?.percentage || 70}%)
- Best Colors: ${profile.colorPalette?.best?.map(c => c.name).join(', ') || 'Not set'}
- Colors to Avoid: ${profile.colorPalette?.avoid?.map(c => c.name).join(', ') || 'None'}
- Recommended Fits: ${profile.recommendations?.fits?.join(', ') || 'Standard'}

RESPONSE GUIDELINES:
1. Reference their profile when relevant (don't repeat everything)
2. Suggest colors from their "best colors" list
3. Recommend fits suitable for their body type
4. Match suggestions to their style personality
5. Be specific but BRIEF
6. If they ask about products, say you can search for them
7. IMPORTANT: Keep answers under 50 words unless they ask for details
`;
        } else {
            systemContext += `

This user hasn't completed their style analysis yet. 
Encourage them to upload a photo for personalized recommendations.
You can still give general fashion advice.
Keep responses SHORT and friendly.
`;
        }

        // Build conversation history for context
        let conversationContext = '';
        if (conversationHistory && conversationHistory.length > 0) {
            // Use last 5 messages for context
            const recentMessages = conversationHistory.slice(-5);
            conversationContext = '\n\nRECENT CONVERSATION:\n';
            recentMessages.forEach(msg => {
                conversationContext += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.message}\n`;
            });
        }

        const fullPrompt = `${systemContext}${conversationContext}

USER'S CURRENT MESSAGE: ${message}

Respond naturally and helpfully. If they're asking about products or want to see items, mention that you can search for specific products.
If they want outfit suggestions, be specific with items and colors from their profile.`;

        // Call Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const botMessage = response.text().trim();

        console.log(`🤖 Bot response: "${botMessage.substring(0, 100)}..."`);

        // Detect if user wants products
        const wantsProducts = detectProductIntent(message, botMessage);
        let products = [];
        let searchQuery = '';

        if (wantsProducts.needsProducts) {
            console.log(`🛍️ Searching products for: "${wantsProducts.query}"`);

            // If user has profile, filter by their best colors
            let colorContext = '';
            if (hasProfile && profile.colorPalette?.best) {
                colorContext = profile.colorPalette.best.slice(0, 3).map(c => c.name).join(' ');
            }

            searchQuery = wantsProducts.query + (colorContext ? ' ' + colorContext : '');

            try {
                products = await searchForOutfitBuilder(searchQuery, { limit: 6 });
                console.log(`✅ Found ${products.length} products`);
            } catch (error) {
                console.error('Product search error:', error);
                products = [];
            }
        }

        res.json({
            success: true,
            message: botMessage,
            products: products,
            searchQuery: wantsProducts.needsProducts ? wantsProducts.query : null,
            hasProfile: hasProfile,
            suggestions: generateQuickReplies(message, hasProfile)
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process message. Please try again.',
            details: error.message
        });
    }
});

// Helper: Detect if user wants to see products
function detectProductIntent(userMessage, botResponse) {
    const productKeywords = [
        'show', 'find', 'search', 'look for', 'need', 'want',
        'shirt', 'pant', 'shoe', 'jacket', 'dress', 'suit',
        'formal', 'casual', 'party', 'wedding'
    ];

    const messageLower = userMessage.toLowerCase();
    const responseLower = botResponse.toLowerCase();

    // Check if user explicitly asks for products
    const userAsksForProducts = productKeywords.some(keyword => messageLower.includes(keyword));

    // Extract potential product query
    let query = '';

    if (messageLower.includes('show me') || messageLower.includes('find me')) {
        query = userMessage.split(/show me|find me/i)[1]?.trim() || '';
    } else if (messageLower.includes('need') || messageLower.includes('want')) {
        query = userMessage.split(/need|want/i)[1]?.trim() || '';
    } else if (userAsksForProducts) {
        // Extract clothing items mentioned
        const items = ['shirt', 'pant', 'trouser', 'shoe', 'jacket', 'suit', 'dress', 'blazer'];
        const foundItems = items.filter(item => messageLower.includes(item));
        if (foundItems.length > 0) {
            query = foundItems[0];
            // Add color if mentioned
            const colors = ['blue', 'black', 'white', 'red', 'navy', 'grey', 'green'];
            const foundColor = colors.find(color => messageLower.includes(color));
            if (foundColor) query = foundColor + ' ' + query;
        }
    }

    return {
        needsProducts: userAsksForProducts && query.length > 0,
        query: query
    };
}

// Helper: Generate quick reply suggestions
function generateQuickReplies(lastMessage, hasProfile) {
    const messageLower = lastMessage.toLowerCase();

    if (!hasProfile) {
        return [
            "Upload my photo",
            "Tell me about styles",
            "What colors suit me?"
        ];
    }

    // Context-aware suggestions
    if (messageLower.includes('color')) {
        return [
            "Show me products in my colors",
            "What about accessories?",
            "Help with outfit"
        ];
    }

    if (messageLower.includes('outfit') || messageLower.includes('wear')) {
        return [
            "Show me formal wear",
            "Casual outfit ideas",
            "Build an outfit"
        ];
    }

    // Default suggestions
    return [
        "What should I wear today?",
        "Show me my best colors",
        "Help me build an outfit",
        "Formal wear suggestions"
    ];
}

// @route   GET /api/chat/greeting
// @desc    Get personalized greeting based on profile
// @access  Private
router.get('/greeting', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const profile = user.styleProfile;
        const hasProfile = profile && profile.physical;

        let greeting = `👋 Hi ${user.name}! I'm your AI Style Assistant!`;

        if (hasProfile) {
            greeting += `\n\nI see you have a ${profile.physical?.faceShape?.type} face shape and ${profile.physical?.skinTone?.category} ${profile.physical?.skinTone?.undertone} skin tone. Your style is ${profile.stylePersonality?.primary?.type}!\n\nHow can I help you today?`;
        } else {
            greeting += `\n\nI'm here to help with all your fashion questions!\n\n💡 **Tip:** Upload a photo for personalized style recommendations!`;
        }

        res.json({
            success: true,
            greeting: greeting,
            hasProfile: hasProfile
        });

    } catch (error) {
        console.error('Greeting error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate greeting'
        });
    }
});

module.exports = router;