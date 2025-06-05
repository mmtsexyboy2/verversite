const express = require('express');
const knex = require('knex')(require('../../knexfile').development);
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// @desc    Like/Unlike a topic or comment
// @route   POST /api/likes
// @access  Private
router.post('/', protect, async (req, res) => {
    const { topic_id, comment_id } = req.body;
    const user_id = req.user.id;

    if (!topic_id && !comment_id) {
        return res.status(400).json({ message: 'Topic ID or Comment ID is required' });
    }
    if (topic_id && comment_id) {
        return res.status(400).json({ message: 'Cannot like both a topic and a comment in a single request' });
    }

    const likeData = { user_id };
    if (topic_id) likeData.topic_id = parseInt(topic_id);
    if (comment_id) likeData.comment_id = parseInt(comment_id);

    try {
        const existingLike = await knex('likes').where(likeData).first();

        if (existingLike) {
            // User has already liked this item, so unlike it (delete the like)
            await knex('likes').where({ id: existingLike.id }).del();
            res.json({ message: 'Like removed' });
        } else {
            // User has not liked this item yet, so add a like
            if (topic_id) {
                const target = await knex('topics').where({id: topic_id}).first();
                if(!target) return res.status(404).json({message: "Topic not found"});
            }
            if (comment_id) {
                const target = await knex('comments').where({id: comment_id}).first();
                if(!target) return res.status(404).json({message: "Comment not found"});
            }

            const [newLikeId] = await knex('likes').insert(likeData).returning('id');
            const newLike = await knex('likes').where({id: newLikeId.id || newLikeId}).first();
            res.status(201).json({ message: 'Liked successfully', like: newLike });
        }
    } catch (error) {
        console.error('Error processing like:', error);
         // Check for unique constraint violation if somehow logic above fails (should not happen with check)
        if (error.routine === '_bt_check_unique' || error.message.includes('duplicate key value violates unique constraint')) {
             // This case should ideally be handled by the existingLike check, but as a fallback:
             return res.status(409).json({ message: 'Like already exists or constraint violation.' });
        }
        res.status(500).json({ message: 'Error processing like', error: error.message });
    }
});

// GET routes for likes are generally not needed as counts are included in topic/comment fetches.
// Could add a route to check if current user liked a specific item if needed.
// Example: GET /api/likes/status?topic_id=123
router.get('/status', protect, async (req, res) => {
    const { topic_id, comment_id } = req.query;
    const user_id = req.user.id;

    if (!topic_id && !comment_id) {
        return res.status(400).json({ message: 'Topic ID or Comment ID is required' });
    }

    const query = { user_id };
    if (topic_id) query.topic_id = parseInt(topic_id);
    if (comment_id) query.comment_id = parseInt(comment_id);

    try {
        const like = await knex('likes').where(query).first();
        res.json({ liked: !!like });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching like status' });
    }
});


module.exports = router;
