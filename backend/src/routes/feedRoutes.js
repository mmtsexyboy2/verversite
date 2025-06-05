const express = require('express');
const { getFeedTopics } = require('../services/feedService'); // Adjust path if needed

const router = express.Router();

// @desc    Get the personalized topic feed
// @route   GET /api/feed
// @access  Public (or Private if user-specific elements are added later)
router.get('/', async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    try {
        const feedResult = await getFeedTopics({
            page: parseInt(page),
            limit: parseInt(limit)
        });
        res.json(feedResult);
    } catch (error) {
        console.error('Error fetching feed:', error);
        res.status(500).json({ message: 'Error fetching feed', error: error.message });
    }
});

module.exports = router;
