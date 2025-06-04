const express = require('express');
const pool = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// DELETE /api/comments/:commentId - Delete a comment
router.delete('/:commentId', protect, async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.id;

  try {
    // Check if the comment exists and if the user is the author
    const commentResult = await pool.query('SELECT user_id FROM comments WHERE id = $1', [commentId]);
    if (commentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Comment not found.' });
    }

    const comment = commentResult.rows[0];
    if (comment.user_id !== userId) {
      // Add admin check here later if needed
      return res.status(403).json({ message: 'User not authorized to delete this comment.' });
    }

    await pool.query('DELETE FROM comments WHERE id = $1 AND user_id = $2', [commentId, userId]);
    res.status(200).json({ message: 'Comment deleted successfully.' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Server error while deleting comment.' });
  }
});

// POST /api/comments/:commentId/like - Toggle like for a comment
router.post('/:commentId/like', protect, async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user.id;

    try {
        // Check if comment exists
        const commentExists = await pool.query('SELECT id FROM comments WHERE id = $1', [commentId]);
        if (commentExists.rows.length === 0) {
            return res.status(404).json({ message: 'Comment not found.' });
        }

        // Check if like already exists
        const likeResult = await pool.query(
            'SELECT * FROM comment_likes WHERE user_id = $1 AND comment_id = $2',
            [userId, commentId]
        );

        let liked = false;
        if (likeResult.rows.length > 0) {
            // Like exists, remove it (unlike)
            await pool.query(
                'DELETE FROM comment_likes WHERE user_id = $1 AND comment_id = $2',
                [userId, commentId]
            );
            liked = false;
        } else {
            // Like does not exist, add it
            await pool.query(
                'INSERT INTO comment_likes (user_id, comment_id) VALUES ($1, $2)',
                [userId, commentId]
            );
            liked = true;
        }

        // Get current like count
        const countResult = await pool.query('SELECT COUNT(*) FROM comment_likes WHERE comment_id = $1', [commentId]);
        const likesCount = parseInt(countResult.rows[0].count, 10);

        res.json({ liked, likesCount });
    } catch (error) {
        console.error('Error toggling comment like:', error);
        res.status(500).json({ message: 'Server error while toggling comment like.' });
    }
});


module.exports = router;
