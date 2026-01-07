const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const outfitScraper = require('./outfitScarpper');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

// @route   GET /api/outfits/search
// @desc    Search products for outfit builder
// @access  Private
router.get('/outfits/search', authenticate, async (req, res) => {
    try {
        const { query, category, limit } = req.query;

        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
        }

        console.log(`🔍 Outfit Search: "${query}", category: ${category || 'all'} `);

        // Use the outfit scraper
        const products = await outfitScraper.searchForOutfitBuilder(query, {
            limit: parseInt(limit) || 10,
            category: category || null
        });

        res.status(200).json({
            success: true,
            products: products,
            count: products.length
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search products. Please try again.'
        });
    }
});


// @route   POST /api/outfits/save
// @desc    Save a new outfit
// @access  Private
router.post('/outfits/save', authenticate, async (req, res) => {
    try {
        const { name, items, totalPrice, itemCount } = req.body;

        if (!name || !items) {
            return res.status(400).json({
                success: false,
                error: 'Outfit name and items are required'
            });
        }

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Create outfit object
        const outfit = {
            id: Date.now().toString(),
            name: name.trim(),
            items: items,
            totalPrice: totalPrice || 0,
            itemCount: itemCount || 0,
            createdAt: new Date()
        };

        // Add to user's outfits array
        if (!user.outfits) {
            user.outfits = [];
        }
        user.outfits.push(outfit);

        await user.save();

        res.status(201).json({
            success: true,
            message: 'Outfit saved successfully!',
            outfit: outfit
        });

    } catch (error) {
        console.error('Save outfit error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error. Please try again.'
        });
    }
});

// @route   GET /api/outfits
// @desc    Get all user outfits
// @access  Private
router.get('/outfits', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const outfits = user.outfits || [];

        res.status(200).json({
            success: true,
            outfits: outfits.reverse() // Most recent first
        });

    } catch (error) {
        console.error('Get outfits error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error. Please try again.'
        });
    }
});

// @route   DELETE /api/outfits/:outfitId
// @desc    Delete an outfit
// @access  Private
router.delete('/outfits/:outfitId', authenticate, async (req, res) => {
    try {
        const { outfitId } = req.params;

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Remove outfit from array
        if (user.outfits) {
            user.outfits = user.outfits.filter(outfit => outfit.id !== outfitId);
            await user.save();
        }

        res.status(200).json({
            success: true,
            message: 'Outfit deleted successfully!'
        });

    } catch (error) {
        console.error('Delete outfit error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error. Please try again.'
        });
    }
});

module.exports = router;
