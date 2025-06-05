const express = require('express');
const knex = require('knex')(require('../../knexfile').development);
const { protect } = require('../middleware/authMiddleware');

// Note: This router will be mounted under /api/topics/:topicId/comments
// OR as /api/comments if direct comment manipulation is needed.
// For simplicity, let's assume it's for a specific topic.
const router = express.Router({ mergeParams: true }); // mergeParams allows access to :topicId

// @desc    Create a comment on a topic
// @route   POST /api/topics/:topicId/comments
// @access  Private
router.post('/', protect, async (req, res) => {
    const { body, parent_comment_id } = req.body;
    const { topicId } = req.params; // from the path e.g. /api/topics/123/comments

    if (!body) {
        return res.status(400).json({ message: 'Comment body is required' });
    }
    try {
        // Check if topic exists
        const topic = await knex('topics').where({ id: topicId }).first();
        if (!topic) {
            return res.status(404).json({ message: 'Topic not found' });
        }

        const [newCommentId] = await knex('comments').insert({
            body,
            topic_id: parseInt(topicId),
            user_id: req.user.id,
            parent_comment_id: parent_comment_id || null
        }).returning('id');

        const newComment = await knex('comments')
            .select('comments.*', 'users.username as author_username', 'users.avatar_url as author_avatar')
            .leftJoin('users', 'comments.user_id', 'users.id')
            .where('comments.id', newCommentId.id || newCommentId)
            .first();

        res.status(201).json(newComment);
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({ message: 'Error creating comment', error: error.message });
    }
});

// @desc    Get all comments for a topic (can be enhanced with nesting)
// @route   GET /api/topics/:topicId/comments
// @access  Public
router.get('/', async (req, res) => {
    const { topicId } = req.params;
    const { page = 1, limit = 20, sort_by = 'created_at', order = 'asc' } = req.query; // Default to asc for comments
    const offset = (page - 1) * limit;

    try {
        // Check if topic exists
        const topic = await knex('topics').where({ id: topicId }).first();
        if (!topic) {
            return res.status(404).json({ message: 'Topic not found' });
        }

        // Basic flat list of comments with author info
        // Implementing full recursive fetching of nested comments can be complex and resource-intensive.
        // Often, clients fetch top-level comments, then fetch replies as needed.
        const comments = await knex('comments')
            .select('comments.*', 'users.username as author_username', 'users.avatar_url as author_avatar',
                    knex.raw('(SELECT COUNT(*)::integer FROM likes WHERE likes.comment_id = comments.id) as like_count')
                   )
            .leftJoin('users', 'comments.user_id', 'users.id')
            .where({ topic_id: parseInt(topicId) })
            // .whereNull('parent_comment_id') // To get only top-level comments initially
            .orderBy(sort_by, order)
            .limit(parseInt(limit))
            .offset(parseInt(offset));

        // Count for pagination
        const totalResult = await knex('comments').where({ topic_id: parseInt(topicId) }).count('id as total').first();
        const totalComments = parseInt(totalResult.total);

        // A common approach for nesting is to fetch all comments for a topic
        // and then arrange them into a tree structure on the client-side or in an intermediate step.
        // For this API, we'll return them flat for now, sorted by creation time.
        // The frontend can then decide how to display them (e.g., fetch children on demand).

        res.json({
            data: comments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total_comments: totalComments,
                total_pages: Math.ceil(totalComments / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: 'Error fetching comments', error: error.message });
    }
});

// @desc    Delete a comment
// @route   DELETE /api/comments/:commentId  (Note: direct path, not nested under topic for deletion)
// @access  Private (Owner or Admin)
// We'll need a separate router for /api/comments or add it to the main server file.
// For now, let's assume we can delete via /api/topics/:topicId/comments/:commentId for consistency of this file.
router.delete('/:commentId', protect, async (req, res) => {
    const { commentId } = req.params;
    try {
        const comment = await knex('comments').where({ id: commentId }).first();
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }
        if (comment.user_id !== req.user.id && !req.user.is_staff && !req.user.is_superuser) {
            return res.status(403).json({ message: 'User not authorized to delete this comment' });
        }
        // Deleting a comment might make its children orphans if not handled (CASCADE in DB takes care of it)
        await knex('comments').where({ id: commentId }).del();
        res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: 'Error deleting comment', error: error.message });
    }
});

// Note: Comment update is not a requirement.

module.exports = router;
