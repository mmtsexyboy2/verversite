const express = require('express');
const knex = require('knex')(require('../../knexfile').development);
const { protect } = require('../middleware/authMiddleware'); // User must be logged in to create/delete topics

const router = express.Router();

// @desc    Create a new topic
// @route   POST /api/topics
// @access  Private
router.post('/', protect, async (req, res) => {
    const { title, body, category_id, image_url } = req.body;
    if (!title || !body) {
        return res.status(400).json({ message: 'Title and body are required' });
    }
    try {
        const [newTopicId] = await knex('topics').insert({
            title,
            body,
            category_id: category_id || null,
            image_url: image_url || null,
            user_id: req.user.id, // from protect middleware
        }).returning('id');
        const newTopic = await knex('topics').where({ id: newTopicId.id || newTopicId }).first();
        res.status(201).json(newTopic);
    } catch (error) {
        console.error('Error creating topic:', error);
        res.status(500).json({ message: 'Error creating topic', error: error.message });
    }
});

// @desc    Get all topics (with basic pagination and sorting)
// @route   GET /api/topics
// @access  Public
router.get('/', async (req, res) => {
    const { page = 1, limit = 10, sort_by = 'created_at', order = 'desc', category_id, user_id } = req.query;
    const offset = (page - 1) * limit;

    try {
        let query = knex('topics')
            .select(
                'topics.*',
                'users.username as author_username',
                'categories.name as category_name',
                knex.raw('(SELECT COUNT(*)::integer FROM comments WHERE comments.topic_id = topics.id) as comment_count'),
                knex.raw('(SELECT COUNT(*)::integer FROM likes WHERE likes.topic_id = topics.id) as like_count'),
                knex.raw('(COALESCE((SELECT COUNT(*)::integer FROM likes WHERE likes.topic_id = topics.id), 0) + COALESCE((SELECT COUNT(*)::integer FROM comments WHERE comments.topic_id = topics.id), 0)) as popularity_score')
             )
            .leftJoin('users', 'topics.user_id', 'users.id')
            .leftJoin('categories', 'topics.category_id', 'categories.id')
            .limit(parseInt(limit))
            .offset(parseInt(offset))
            .orderBy(sort_by, order);

        let countQuery = knex('topics').count('id as total');

        if (category_id) {
            query = query.where('topics.category_id', parseInt(category_id));
            countQuery = countQuery.where('topics.category_id', parseInt(category_id));
        }
        if (user_id) {
            query = query.where('topics.user_id', parseInt(user_id));
            countQuery = countQuery.where('topics.user_id', parseInt(user_id));
        }

        const topics = await query;
        const totalResult = await countQuery.first();
        const totalTopics = parseInt(totalResult.total);


        res.json({
            data: topics,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total_topics: totalTopics,
                total_pages: Math.ceil(totalTopics / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching topics:', error);
        res.status(500).json({ message: 'Error fetching topics', error: error.message });
    }
});

// @desc    Get a single topic by ID (with author, category, comments, likes)
// @route   GET /api/topics/:id
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const topic = await knex('topics')
            .select('topics.*', 'users.username as author_username', 'users.avatar_url as author_avatar', 'categories.name as category_name', 'categories.theme_settings as category_theme')
            .leftJoin('users', 'topics.user_id', 'users.id')
            .leftJoin('categories', 'topics.category_id', 'categories.id')
            .where('topics.id', req.params.id)
            .first();

        if (!topic) {
            return res.status(404).json({ message: 'Topic not found' });
        }

        // Get like count
        const likeCountResult = await knex('likes').where({ topic_id: topic.id }).count('id as count').first();
        topic.like_count = parseInt(likeCountResult.count);

        // Get comments (can be a separate call from frontend for complex nesting, or basic list here)
        // For now, just the topic details. Comments can be fetched via /api/topics/:id/comments
        res.json(topic);
    } catch (error) {
        console.error('Error fetching topic:', error);
        res.status(500).json({ message: 'Error fetching topic', error: error.message });
    }
});

// @desc    Delete a topic
// @route   DELETE /api/topics/:id
// @access  Private (Owner or Admin)
router.delete('/:id', protect, async (req, res) => {
    try {
        const topic = await knex('topics').where({ id: req.params.id }).first();
        if (!topic) {
            return res.status(404).json({ message: 'Topic not found' });
        }
        // Check if user is owner or admin (req.user.is_staff || req.user.is_superuser comes from authMiddleware)
        if (topic.user_id !== req.user.id && !req.user.is_staff && !req.user.is_superuser) {
            return res.status(403).json({ message: 'User not authorized to delete this topic' });
        }
        await knex('topics').where({ id: req.params.id }).del();
        res.json({ message: 'Topic deleted successfully' });
    } catch (error) {
        console.error('Error deleting topic:', error);
        res.status(500).json({ message: 'Error deleting topic', error: error.message });
    }
});

// Note: Topic update (PUT /api/topics/:id) is not a requirement ("users can... delete but not edit topics")

module.exports = router;
