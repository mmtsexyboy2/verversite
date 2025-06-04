const express = require('express');
const rateLimit = require('express-rate-limit'); // Import rate-limit
const pool = require('../config/db');
const { protect } = require('../middleware/authMiddleware');
const { upload, processAndSaveImage } = require('../middleware/uploadMiddleware');
const { stripHtml } = require('../utils/sanitize'); // Import sanitizer
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Rate limiter for content creation
const createContentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Limit each IP to 100 create requests per windowMs
  message: 'Too many content creation requests from this IP, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/topics - Create a new topic
router.post('/', protect, createContentLimiter, upload.single('image'), processAndSaveImage, async (req, res) => {
  let { title, text_content, category_id } = req.body;
  const user_id = req.user.id;
  const image_url = req.file ? req.file.processedPath : null;

  // Sanitize title
  title = stripHtml(title || '');

  // Basic Validation
  if (!title || !text_content || !category_id) {
    // If an image was uploaded but validation failed, attempt to delete it.
    if (image_url) {
        const fullPath = path.join(__dirname, '..', '..', image_url.replace('/uploads', 'uploads')); // Construct absolute path
        fs.unlink(fullPath, (err) => {
            if (err) console.error("Error deleting uploaded image after validation failure:", err);
        });
    }
    return res.status(400).json({ message: 'Title, text content, and category ID are required.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO topics (user_id, category_id, title, text_content, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user_id, category_id, title, text_content, image_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating topic:', error);
    // If an image was uploaded but DB insertion failed, attempt to delete it.
     if (image_url) {
        const fullPath = path.join(__dirname, '..', '..', image_url.replace('/uploads', 'uploads'));
        fs.unlink(fullPath, (err) => {
            if (err) console.error("Error deleting uploaded image after DB insertion failure:", err);
        });
    }
    if (error.code === '23503') { // Foreign key constraint violation (e.g. category_id doesn't exist)
        return res.status(400).json({message: 'Invalid category ID or user ID.'});
    }
    res.status(500).json({ message: 'Server error while creating topic.' });
  }
});

// GET /api/topics/:topicId/suggestions - Fetch topic suggestions
router.get('/:topicId/suggestions', async (req, res) => {
  const currentTopicId = parseInt(req.params.topicId, 10);

  try {
    // Fetch current topic's category_id
    const currentTopicRes = await pool.query('SELECT category_id FROM topics WHERE id = $1', [currentTopicId]);
    if (currentTopicRes.rows.length === 0) {
      return res.status(404).json({ message: 'Current topic not found.' });
    }
    const currentCategoryId = currentTopicRes.rows[0].category_id;

    let suggestions = [];
    const suggestedIds = new Set([currentTopicId]); // Keep track of IDs already suggested or current

    // 1. Same Category (try to get 2-3)
    if (currentCategoryId) {
      const sameCategoryTopics = await pool.query(
        `SELECT t.id, t.title, c.name as category_name, u.name as author_name
         FROM topics t
         LEFT JOIN categories c ON t.category_id = c.id
         LEFT JOIN users u ON t.user_id = u.id
         WHERE t.category_id = $1 AND t.id != $2
         ORDER BY t.created_at DESC
         LIMIT 3`,
        [currentCategoryId, currentTopicId]
      );
      sameCategoryTopics.rows.forEach(topic => {
        if (suggestions.length < 3 && !suggestedIds.has(topic.id)) {
          suggestions.push(topic);
          suggestedIds.add(topic.id);
        }
      });
    }

    // 2. Popular (try to get 1-2, ensuring total suggestions up to 4-5)
    if (suggestions.length < 5) {
        const popularLimit = 5 - suggestions.length;
        const popularTopics = await pool.query(
            `SELECT t.id, t.title, c.name as category_name, u.name as author_name, COUNT(tl.topic_id) as likes_count
             FROM topics t
             LEFT JOIN topic_likes tl ON t.id = tl.topic_id
             LEFT JOIN categories c ON t.category_id = c.id
             LEFT JOIN users u ON t.user_id = u.id
             WHERE t.id != $1 ${suggestedIds.size > 0 ? `AND t.id NOT IN (${Array.from(suggestedIds).join(',')})` : ''}
             GROUP BY t.id, c.name, u.name
             ORDER BY likes_count DESC, t.created_at DESC
             LIMIT $2`,
            [currentTopicId, popularLimit + 5] // Fetch a bit more in case some are already picked
        );
        popularTopics.rows.forEach(topic => {
            if (suggestions.length < 5 && !suggestedIds.has(topic.id)) {
                suggestions.push(topic);
                suggestedIds.add(topic.id);
            }
        });
    }


    // 3. Random (if still needed to fill up to 3-5)
    if (suggestions.length < 3) { // Ensure at least 3 suggestions if possible
        const randomLimit = 5 - suggestions.length; // Aim for 5, but at least 3
        const randomTopics = await pool.query(
            `SELECT t.id, t.title, c.name as category_name, u.name as author_name
             FROM topics t
             LEFT JOIN categories c ON t.category_id = c.id
             LEFT JOIN users u ON t.user_id = u.id
             WHERE t.id != $1 ${suggestedIds.size > 0 ? `AND t.id NOT IN (${Array.from(suggestedIds).join(',')})` : ''}
             ORDER BY RANDOM()
             LIMIT $2`,
            [currentTopicId, randomLimit + 5] // Fetch a bit more
        );
        randomTopics.rows.forEach(topic => {
            if (suggestions.length < 5 && !suggestedIds.has(topic.id)) {
                suggestions.push(topic);
                suggestedIds.add(topic.id);
            }
        });
    }

    // Ensure we don't exceed 5 suggestions if overfetching happened
    res.json(suggestions.slice(0, 5));

  } catch (error) {
    console.error('Error fetching topic suggestions:', error);
    res.status(500).json({ message: 'Server error while fetching topic suggestions.' });
  }
});

// GET /api/topics - Fetch topics with pagination and author/category info
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;

  try {
    const topicsResult = await pool.query(
      `SELECT
         t.id, t.title, t.text_content, t.image_url, t.created_at, t.updated_at,
         u.id AS user_id, u.name AS author_name, u.email AS author_email,
         c.id AS category_id, c.name AS category_name,
         (SELECT COUNT(*) FROM topic_likes tl WHERE tl.topic_id = t.id) AS likes_count
       FROM topics t
       JOIN users u ON t.user_id = u.id
       LEFT JOIN categories c ON t.category_id = c.id
      `SELECT
         t.id, t.title, t.text_content, t.image_url, t.created_at, t.updated_at,
          t.is_highlighted, t.is_pinned, t.is_ver_ver_ticked, -- Added flags
         u.id AS user_id, u.name AS author_name, u.email AS author_email,
          c.id AS category_id, c.name AS category_name, c.theme_config AS category_theme_config,
         (SELECT COUNT(*) FROM topic_likes tl WHERE tl.topic_id = t.id) AS likes_count
       FROM topics t
       JOIN users u ON t.user_id = u.id
       LEFT JOIN categories c ON t.category_id = c.id
       ORDER BY t.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // For total count, needed for pagination metadata
    const totalResult = await pool.query('SELECT COUNT(*) FROM topics');
    const totalTopics = parseInt(totalResult.rows[0].count, 10);

    res.json({
      data: topicsResult.rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalTopics / limit),
        totalTopics: totalTopics,
        limit: limit,
      },
    });
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ message: 'Server error while fetching topics.' });
  }
});

// GET /api/topics/:topicId - Fetch a single topic by ID
router.get('/:topicId', async (req, res) => {
  const { topicId } = req.params;
  try {
    const result = await pool.query(
      `SELECT
         t.id, t.title, t.text_content, t.image_url, t.created_at, t.updated_at,
         u.id AS user_id, u.name AS author_name, u.email AS author_email,
         c.id AS category_id, c.name AS category_name
       FROM topics t
       JOIN users u ON t.user_id = u.id
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = $1`,
      [topicId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Topic not found.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching topic:', error);
    res.status(500).json({ message: 'Server error while fetching topic.' });
  }
});

// POST /api/topics/:topicId/like - Toggle like for a topic
router.post('/:topicId/like', protect, async (req, res) => {
    const { topicId } = req.params;
    const userId = req.user.id;

    try {
        // Check if topic exists
        const topicExists = await pool.query('SELECT id FROM topics WHERE id = $1', [topicId]);
        if (topicExists.rows.length === 0) {
            return res.status(404).json({ message: 'Topic not found.' });
        }

        // Check if like already exists
        const likeResult = await pool.query(
            'SELECT * FROM topic_likes WHERE user_id = $1 AND topic_id = $2',
            [userId, topicId]
        );

        let liked = false;
        if (likeResult.rows.length > 0) {
            // Like exists, remove it (unlike)
            await pool.query(
                'DELETE FROM topic_likes WHERE user_id = $1 AND topic_id = $2',
                [userId, topicId]
            );
            liked = false;
        } else {
            // Like does not exist, add it
            await pool.query(
                'INSERT INTO topic_likes (user_id, topic_id) VALUES ($1, $2)',
                [userId, topicId]
            );
            liked = true;
        }

        // Get current like count
        const countResult = await pool.query('SELECT COUNT(*) FROM topic_likes WHERE topic_id = $1', [topicId]);
        const likesCount = parseInt(countResult.rows[0].count, 10);

        res.json({ liked, likesCount });
    } catch (error) {
        console.error('Error toggling topic like:', error);
        res.status(500).json({ message: 'Server error while toggling topic like.' });
    }
});


// POST /api/topics/:topicId/like - Toggle like for a topic
router.post('/:topicId/like', protect, async (req, res) => {
    const { topicId } = req.params;
    const userId = req.user.id;

    try {
        // Check if topic exists
        const topicExists = await pool.query('SELECT id FROM topics WHERE id = $1', [topicId]);
        if (topicExists.rows.length === 0) {
            return res.status(404).json({ message: 'Topic not found.' });
        }

        // Check if like already exists
        const likeResult = await pool.query(
            'SELECT * FROM topic_likes WHERE user_id = $1 AND topic_id = $2',
            [userId, topicId]
        );

        let liked = false;
        if (likeResult.rows.length > 0) {
            // Like exists, remove it (unlike)
            await pool.query(
                'DELETE FROM topic_likes WHERE user_id = $1 AND topic_id = $2',
                [userId, topicId]
            );
            liked = false;
        } else {
            // Like does not exist, add it
            await pool.query(
                'INSERT INTO topic_likes (user_id, topic_id) VALUES ($1, $2)',
                [userId, topicId]
            );
            liked = true;
        }

        // Get current like count
        const countResult = await pool.query('SELECT COUNT(*) FROM topic_likes WHERE topic_id = $1', [topicId]);
        const likesCount = parseInt(countResult.rows[0].count, 10);

        res.json({ liked, likesCount });
    } catch (error) {
        console.error('Error toggling topic like:', error);
        res.status(500).json({ message: 'Server error while toggling topic like.' });
    }
});


// DELETE /api/topics/:topicId - Delete a topic
router.delete('/:topicId', protect, async (req, res) => {
  const { topicId } = req.params;
  const userId = req.user.id; // From JWT

  try {
    // First, retrieve the topic to check ownership and get image_url for deletion
    const topicResult = await pool.query('SELECT user_id, image_url FROM topics WHERE id = $1', [topicId]);
    if (topicResult.rows.length === 0) {
      return res.status(404).json({ message: 'Topic not found.' });
    }

    const topic = topicResult.rows[0];
    // Check if the logged-in user is the author of the topic
    // (Admin role check would be added here later if needed)
    if (topic.user_id !== userId) {
      return res.status(403).json({ message: 'User not authorized to delete this topic.' });
    }

    // Delete the topic from the database
    await pool.query('DELETE FROM topics WHERE id = $1 AND user_id = $2', [topicId, userId]);

    // If the topic had an image, delete it from the filesystem
    if (topic.image_url) {
      const imagePath = path.join(__dirname, '..', '..', topic.image_url.replace('/uploads', 'uploads'));
      fs.unlink(imagePath, (err) => {
        if (err) {
          console.error('Error deleting topic image file:', err);
          // Non-critical error, so don't send 500, but log it.
          // The topic is already deleted from DB.
        } else {
          console.log('Successfully deleted topic image file:', imagePath);
        }
      });
    }

    res.status(200).json({ message: 'Topic deleted successfully.' });
  } catch (error) {
    console.error('Error deleting topic:', error);
    res.status(500).json({ message: 'Server error while deleting topic.' });
  }
});

module.exports = router;
