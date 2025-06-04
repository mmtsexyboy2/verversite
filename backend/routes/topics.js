const express = require('express');
const router = express.Router();
const knex = require('../db/knex'); // Knex instance
const { verifyToken, isAdmin, optionalAuth } = require('../middleware/auth-middleware');

// POST /api/topics - Create a new topic (Authenticated users)
router.post('/', verifyToken, async (req, res) => {
  const { title, body, category_id } = req.body;
  const user_id = req.user.id; // From verifyToken middleware

  // Validation
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ message: 'Topic title is required.' });
  }
  if (!body || typeof body !== 'string' || body.trim() === '') {
    return res.status(400).json({ message: 'Topic body is required.' });
  }
  if (!category_id || typeof category_id !== 'number' || !Number.isInteger(category_id)) {
    return res.status(400).json({ message: 'Valid category_id is required.' });
  }

  try {
    // Check if category exists
    const category = await knex('categories').where({ id: category_id }).first();
    if (!category) {
      return res.status(400).json({ message: `Category with id ${category_id} not found.` });
    }

    const [newTopic] = await knex('topics')
      .insert({
        user_id,
        category_id,
        title: title.trim(),
        body: body.trim(),
      })
      .returning('*');

    // Fetch user and category details to return with the topic
    const author = await knex('users').select('id', 'username', 'avatar_url').where({ id: newTopic.user_id }).first();
    const topicCategory = await knex('categories').select('id', 'name').where({ id: newTopic.category_id }).first();

    res.status(201).json({
      ...newTopic,
      author,
      category: topicCategory,
      like_count: 0, // New topic has 0 likes
    });
  } catch (error) {
    console.error('Error creating topic:', error);
    // Specific error for foreign key violation if knex doesn't catch it before (though it should)
    if (error.routine === 'ri_ReportViolation' && error.constraint && error.constraint.includes('topics_category_id_fkey')) {
        return res.status(400).json({ message: `Category with id ${category_id} not found.` });
    }
    res.status(500).json({ message: 'Error creating topic.' });
  }
});

// GET /api/topics - Get all topics (Publicly accessible, with optional auth for "hasLiked")
router.get('/', optionalAuth, async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = parseInt(req.query.pageSize, 10) || 10;
  const sortBy = req.query.sortBy || 'newest'; // 'newest', 'mostLiked'

  try {
    let query = knex('topics')
      .select(
        'topics.*',
        'users.username as author_username',
        'users.avatar_url as author_avatar_url',
        'categories.name as category_name',
        knex.raw('COUNT(DISTINCT likes.id) as like_count') // Count distinct likes
      )
      .leftJoin('users', 'topics.user_id', 'users.id')
      .leftJoin('categories', 'topics.category_id', 'categories.id')
      .leftJoin('likes', 'topics.id', 'likes.topic_id')
      .groupBy('topics.id', 'users.id', 'categories.id') // Group by necessary fields
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    if (sortBy === 'newest') {
      query = query.orderBy('topics.created_at', 'desc');
    } else if (sortBy === 'mostLiked') {
      query = query.orderBy('like_count', 'desc').orderBy('topics.created_at', 'desc'); // Fallback sort by newest
    } else {
        query = query.orderBy('topics.created_at', 'desc'); // Default to newest
    }

    const topics = await query;

    // If user is authenticated, add 'hasLiked' flag
    if (req.user && req.user.id) {
      const topicIds = topics.map(t => t.id);
      const userLikes = await knex('likes')
        .where({ user_id: req.user.id })
        .whereIn('topic_id', topicIds)
        .select('topic_id');
      const likedTopicIds = new Set(userLikes.map(ul => ul.topic_id));
      topics.forEach(topic => {
        topic.hasLiked = likedTopicIds.has(topic.id);
      });
    }


    const totalTopics = await knex('topics').count('id as total').first();
    const totalItems = parseInt(totalTopics.total, 10);
    const totalPages = Math.ceil(totalItems / pageSize);

    res.status(200).json({
      data: topics,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ message: 'Error fetching topics.' });
  }
});

// GET /api/topics/:id - Get a specific topic by ID (Publicly accessible, with optional auth for "hasLiked")
router.get('/:id', optionalAuth, async (req, res) => {
  const { id } = req.params;
  if (isNaN(parseInt(id, 10))) {
    return res.status(400).json({ message: 'Invalid topic ID format.' });
  }

  try {
    const topic = await knex('topics')
      .select(
        'topics.*',
        'users.username as author_username',
        'users.avatar_url as author_avatar_url',
        'categories.name as category_name',
        knex.raw('COUNT(DISTINCT likes.id) as like_count')
      )
      .leftJoin('users', 'topics.user_id', 'users.id')
      .leftJoin('categories', 'topics.category_id', 'categories.id')
      .leftJoin('likes', 'topics.id', 'likes.topic_id')
      .where('topics.id', parseInt(id, 10))
      .groupBy('topics.id', 'users.id', 'categories.id')
      .first();

    if (topic) {
      // If user is authenticated, add 'hasLiked' flag
      topic.hasLiked = false; // Default
      if (req.user && req.user.id) {
        const userLike = await knex('likes')
          .where({ user_id: req.user.id, topic_id: topic.id })
          .first();
        if (userLike) {
          topic.hasLiked = true;
        }
      }
      res.status(200).json(topic);
    } else {
      res.status(404).json({ message: 'Topic not found.' });
    }
  } catch (error) {
    console.error('Error fetching topic by ID:', error);
    res.status(500).json({ message: 'Error fetching topic.' });
  }
});

// DELETE /api/topics/:id - Delete a topic (Owner or Admin)
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id; // From verifyToken

  if (isNaN(parseInt(id, 10))) {
    return res.status(400).json({ message: 'Invalid topic ID format.' });
  }

  try {
    const topic = await knex('topics').where({ id: parseInt(id, 10) }).first();

    if (!topic) {
      return res.status(404).json({ message: 'Topic not found.' });
    }

    // Check if user is owner or admin (req.user.is_staff/is_superuser should be fresh from isAdmin or verifyToken if it fetches user roles)
    // For this, we might need to ensure req.user has up-to-date admin flags.
    // The isAdmin middleware is separate. Here we check ownership OR rely on req.user flags.
    // Let's assume verifyToken populates req.user with id, and we need to fetch current user's admin status for safety.
    const currentUser = await knex('users').select('is_staff', 'is_superuser').where({id: userId}).first();


    if (topic.user_id !== userId && !(currentUser && (currentUser.is_staff || currentUser.is_superuser))) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this topic.' });
    }

    await knex('topics').where({ id: parseInt(id, 10) }).del();
    res.status(204).send(); // No content, successful deletion
  } catch (error) {
    console.error('Error deleting topic:', error);
    res.status(500).json({ message: 'Error deleting topic.' });
  }
});

// Nested Comment Router for /api/topics/:topic_id/comments
const commentsController = require('./comments'); // Assuming controllers are exported from comments.js
const topicCommentRouter = express.Router({ mergeParams: true });

topicCommentRouter.post('/', verifyToken, commentsController.createComment);
topicCommentRouter.get('/', optionalAuth, commentsController.getCommentsForTopic);

router.use('/:topic_id/comments', topicCommentRouter);

module.exports = router;
