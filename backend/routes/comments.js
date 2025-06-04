const knex = require('../db/knex'); // Knex instance
// Middlewares will be applied in the main router setup (server.js or topicRouter)

// Controller function to create a comment
async function createComment(req, res) {
  const { topic_id } = req.params; // From merged params
  const { body, parent_comment_id } = req.body;
  const user_id = req.user.id; // From verifyToken middleware

  // Validation
  if (!body || typeof body !== 'string' || body.trim() === '') {
    return res.status(400).json({ message: 'Comment body is required.' });
  }
  if (isNaN(parseInt(topic_id, 10))) {
    return res.status(400).json({ message: 'Invalid topic_id.' });
  }

  try {
    // Check if topic exists
    const topic = await knex('topics').where({ id: parseInt(topic_id, 10) }).first();
    if (!topic) {
      return res.status(404).json({ message: `Topic with id ${topic_id} not found.` });
    }

    // If parent_comment_id is provided, check if it exists and belongs to the same topic
    if (parent_comment_id !== undefined && parent_comment_id !== null) {
      if (isNaN(parseInt(parent_comment_id, 10))) {
        return res.status(400).json({ message: 'Invalid parent_comment_id format.' });
      }
      const parentComment = await knex('comments')
        .where({ id: parseInt(parent_comment_id, 10), topic_id: parseInt(topic_id, 10) })
        .first();
      if (!parentComment) {
        return res.status(400).json({ message: `Parent comment with id ${parent_comment_id} not found in this topic.` });
      }
    }

    const [newComment] = await knex('comments')
      .insert({
        user_id,
        topic_id: parseInt(topic_id, 10),
        parent_comment_id: parent_comment_id ? parseInt(parent_comment_id, 10) : null,
        body: body.trim(),
      })
      .returning('*');

    // Fetch author details to return with the comment
    const author = await knex('users').select('id', 'username', 'avatar_url').where({ id: newComment.user_id }).first();

    res.status(201).json({
      ...newComment,
      author,
      like_count: 0, // New comment has 0 likes
      hasLiked: false // User creating it hasn't liked it yet by default
    });

  } catch (error) {
    console.error('Error creating comment:', error);
    if (error.routine === 'ri_ReportViolation') { // FK violation
        if (error.constraint && error.constraint.includes('comments_topic_id_fkey')) {
            return res.status(400).json({ message: `Topic with id ${topic_id} not found.` });
        }
        if (error.constraint && error.constraint.includes('comments_parent_comment_id_fkey')) {
            return res.status(400).json({ message: `Parent comment with id ${parent_comment_id} not found.` });
        }
    }
    res.status(500).json({ message: 'Error creating comment.' });
  }
}

// Controller function to get comments for a topic
async function getCommentsForTopic(req, res) {
  const { topic_id } = req.params; // From merged params
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = parseInt(req.query.pageSize, 10) || 10;
  // Default order: oldest first to show conversational flow. Can be made a query param.
  const orderBy = req.query.orderBy || 'created_at_asc';

  if (isNaN(parseInt(topic_id, 10))) {
    return res.status(400).json({ message: 'Invalid topic_id.' });
  }

  try {
    // Check if topic exists
    const topic = await knex('topics').where({ id: parseInt(topic_id, 10) }).first();
    if (!topic) {
      return res.status(404).json({ message: `Topic with id ${topic_id} not found.` });
    }

    let query = knex('comments')
      .select(
        'comments.*',
        'users.username as author_username',
        'users.avatar_url as author_avatar_url',
        knex.raw('COUNT(DISTINCT likes.id) as like_count')
      )
      .leftJoin('users', 'comments.user_id', 'users.id')
      .leftJoin('likes', 'comments.id', 'likes.comment_id')
      .where('comments.topic_id', parseInt(topic_id, 10))
      .groupBy('comments.id', 'users.id') // Group by necessary fields
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    if (orderBy === 'created_at_asc') {
        query = query.orderBy('comments.created_at', 'asc');
    } else if (orderBy === 'created_at_desc') {
        query = query.orderBy('comments.created_at', 'desc');
    } else if (orderBy === 'mostLiked') {
        query = query.orderBy('like_count', 'desc').orderBy('comments.created_at', 'asc');
    } else {
        query = query.orderBy('comments.created_at', 'asc'); // Default
    }

    let comments = await query;

    // If user is authenticated, add 'hasLiked' flag
    if (req.user && req.user.id) {
      const commentIds = comments.map(c => c.id);
      if (commentIds.length > 0) {
        const userLikes = await knex('likes')
            .where({ user_id: req.user.id })
            .whereIn('comment_id', commentIds)
            .select('comment_id');
        const likedCommentIds = new Set(userLikes.map(ul => ul.comment_id));
        comments.forEach(comment => {
            comment.hasLiked = likedCommentIds.has(comment.id);
        });
      } else {
        comments.forEach(comment => comment.hasLiked = false);
      }
    } else {
        comments.forEach(comment => comment.hasLiked = false);
    }


    const totalCommentsResult = await knex('comments').where({ topic_id: parseInt(topic_id, 10) }).count('id as total').first();
    const totalItems = parseInt(totalCommentsResult.total, 10);
    const totalPages = Math.ceil(totalItems / pageSize);

    res.status(200).json({
      data: comments,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    });

  } catch (error) {
    console.error('Error fetching comments for topic:', error);
    res.status(500).json({ message: 'Error fetching comments.' });
  }
}

// Controller function to delete a comment
async function deleteComment(req, res) {
  const { comment_id } = req.params;
  const userId = req.user.id; // From verifyToken

  if (isNaN(parseInt(comment_id, 10))) {
    return res.status(400).json({ message: 'Invalid comment_id format.' });
  }

  try {
    const comment = await knex('comments').where({ id: parseInt(comment_id, 10) }).first();

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found.' });
    }

    const currentUser = await knex('users').select('is_staff', 'is_superuser').where({id: userId}).first();

    if (comment.user_id !== userId && !(currentUser && (currentUser.is_staff || currentUser.is_superuser))) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this comment.' });
    }

    // ON DELETE CASCADE for parent_comment_id in comments table handles replies.
    await knex('comments').where({ id: parseInt(comment_id, 10) }).del();
    res.status(204).send(); // No content, successful deletion

  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Error deleting comment.' });
  }
}

module.exports = {
  createComment,
  getCommentsForTopic,
  deleteComment,
};
