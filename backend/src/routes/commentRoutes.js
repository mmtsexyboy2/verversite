const express = require('express');
const rateLimit = require('express-rate-limit'); // Import rate-limit
const pool = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });

// Rate limiter for content creation (can share or have separate for comments)
const createCommentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // Example: allow more comments than topics
  message: 'Too many comments created from this IP, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/topics/:topicId/comments - Create a new comment
router.post('/', protect, createCommentLimiter, async (req, res) => {
  const { topicId } = req.params;
  const { text_content, parent_comment_id } = req.body;
  const user_id = req.user.id;

  if (!text_content) {
    return res.status(400).json({ message: 'Text content is required.' });
  }

  try {
    // Check if topic exists
    const topicExists = await pool.query('SELECT id FROM topics WHERE id = $1', [topicId]);
    if (topicExists.rows.length === 0) {
      return res.status(404).json({ message: 'Topic not found.' });
    }

    // If parent_comment_id is provided, check if it belongs to the same topic and exists
    if (parent_comment_id) {
      const parentCommentExists = await pool.query(
        'SELECT id FROM comments WHERE id = $1 AND topic_id = $2',
        [parent_comment_id, topicId]
      );
      if (parentCommentExists.rows.length === 0) {
        return res.status(400).json({ message: 'Parent comment not found or does not belong to this topic.' });
      }
    }

    const result = await pool.query(
      'INSERT INTO comments (user_id, topic_id, parent_comment_id, text_content) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, topicId, parent_comment_id || null, text_content]
    );

    // Fetch user information for the created comment
    const commentAuthor = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [result.rows[0].user_id]);
    const commentWithAuthor = {
        ...result.rows[0],
        user: commentAuthor.rows[0]
    };

    res.status(201).json(commentWithAuthor);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'Server error while creating comment.' });
  }
});

// GET /api/topics/:topicId/comments - Fetch all comments for a topic
router.get('/', async (req, res) => {
  const { topicId } = req.params;
  try {
    // Fetch comments with author details and like count
    const result = await pool.query(
      `SELECT
         c.id, c.user_id, c.topic_id, c.parent_comment_id, c.text_content, c.created_at, c.updated_at,
         u.name AS author_name, u.email AS author_email,
         (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) AS likes_count
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.topic_id = $1
       ORDER BY c.created_at ASC`, // Fetch chronologically; frontend will build hierarchy
      [topicId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: 'Server error while fetching comments.' });
  }
});

// DELETE /api/comments/:commentId - Delete a comment (Note: This route is not nested under topics)
// This will be a separate router or handled differently. For now, let's make a top-level comment deletion route.
// A new router file might be cleaner: commentActionsRoutes.js or similar.
// For this subtask, I will create a new router file for this specific action.

module.exports = router;
