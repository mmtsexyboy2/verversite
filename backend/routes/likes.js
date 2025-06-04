const express = require('express');
const router = express.Router();
const knex = require('../db/knex'); // Knex instance
const { verifyToken } = require('../middleware/auth-middleware');

// POST /api/likes - Like a Topic or Comment
router.post('/', verifyToken, async (req, res) => {
  const { topicId, commentId } = req.body;
  const userId = req.user.id;

  // Validate input: one of topicId or commentId must be provided, but not both
  if ((!topicId && !commentId) || (topicId && commentId)) {
    return res.status(400).json({ message: 'Either topicId or commentId must be provided, but not both.' });
  }

  let itemType = '';
  let itemId = null;

  try {
    if (topicId) {
      if (isNaN(parseInt(topicId, 10))) return res.status(400).json({ message: 'Invalid topicId format.' });
      itemId = parseInt(topicId, 10);
      itemType = 'topic';
      const topic = await knex('topics').where({ id: itemId }).first();
      if (!topic) return res.status(404).json({ message: `Topic with id ${itemId} not found.` });
    } else { // commentId must be present
      if (isNaN(parseInt(commentId, 10))) return res.status(400).json({ message: 'Invalid commentId format.' });
      itemId = parseInt(commentId, 10);
      itemType = 'comment';
      const comment = await knex('comments').where({ id: itemId }).first();
      if (!comment) return res.status(404).json({ message: `Comment with id ${itemId} not found.` });
    }

    // Check if already liked
    const existingLikeQuery = { user_id: userId };
    if (itemType === 'topic') existingLikeQuery.topic_id = itemId;
    else existingLikeQuery.comment_id = itemId;

    const existingLike = await knex('likes').where(existingLikeQuery).first();

    if (existingLike) {
      return res.status(200).json({ message: `You have already liked this ${itemType}.`, like: existingLike });
    }

    // Create the like
    const newLikePayload = { user_id: userId };
    if (itemType === 'topic') newLikePayload.topic_id = itemId;
    else newLikePayload.comment_id = itemId;

    const [createdLike] = await knex('likes').insert(newLikePayload).returning('*');
    res.status(201).json({ message: `Successfully liked the ${itemType}.`, like: createdLike });

  } catch (error) {
    console.error(`Error liking ${itemType}:`, error);
    // Handle potential unique constraint violation from DB if the check above somehow fails (race condition, etc.)
    // Error codes/messages for unique constraint violations vary by DB (e.g., PostgreSQL uses '23505')
    if (error.code === '23505' || (error.routine && error.routine.includes('_bt_check_unique'))) {
      return res.status(409).json({ message: `You have already liked this ${itemType} (database constraint).` });
    }
    // Handle check constraint violation `likes_topic_or_comment_check`
    if (error.constraint === 'likes_topic_or_comment_check' || (error.message && error.message.includes('likes_topic_or_comment_check'))) {
        return res.status(400).json({ message: 'Database check constraint violation: A like must be for a topic or a comment, not both or neither.' });
    }
    res.status(500).json({ message: `Error liking ${itemType}.` });
  }
});

// DELETE /api/likes - Unlike a Topic or Comment
router.delete('/', verifyToken, async (req, res) => {
  const { topicId, commentId } = req.body; // Using body for DELETE to pass parameters
  const userId = req.user.id;

  if ((!topicId && !commentId) || (topicId && commentId)) {
    return res.status(400).json({ message: 'Either topicId or commentId must be provided to unlike, but not both.' });
  }

  let itemType = '';
  let itemId = null;

  if (topicId) {
    if (isNaN(parseInt(topicId, 10))) return res.status(400).json({ message: 'Invalid topicId format.' });
    itemId = parseInt(topicId, 10);
    itemType = 'topic';
  } else { // commentId must be present
    if (isNaN(parseInt(commentId, 10))) return res.status(400).json({ message: 'Invalid commentId format.' });
    itemId = parseInt(commentId, 10);
    itemType = 'comment';
  }

  try {
    const deleteQuery = { user_id: userId };
    if (itemType === 'topic') deleteQuery.topic_id = itemId;
    else deleteQuery.comment_id = itemId;

    const deletedCount = await knex('likes').where(deleteQuery).del();

    if (deletedCount > 0) {
      res.status(204).send(); // Successfully unliked
    } else {
      // User hadn't liked it, or the item ID was wrong but belonged to user.
      // Returning 204 is fine as the state (not liked) is achieved.
      // Alternatively, could return 404 if being strict about unliking something not liked.
      res.status(204).send();
    }
  } catch (error) {
    console.error(`Error unliking ${itemType}:`, error);
    res.status(500).json({ message: `Error unliking ${itemType}.` });
  }
});

module.exports = router;
