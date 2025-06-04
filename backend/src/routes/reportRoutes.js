const express = require('express');
const pool = require('../config/db');
const { protect } = require('../middleware/authMiddleware'); // For JWT auth
const { stripHtml } = require('../utils/sanitize');

const router = express.Router();

// POST /api/reports - Create a new report
router.post('/', protect, async (req, res) => {
  const { item_id, item_type, reason } = req.body;
  const reported_by_user_id = req.user.id;

  if (!item_id || !item_type) {
    return res.status(400).json({ message: 'Item ID and Item Type are required.' });
  }
  if (!['topic', 'comment'].includes(item_type.toLowerCase())) {
    return res.status(400).json({ message: "Invalid item_type. Must be 'topic' or 'comment'." });
  }

  const sanitizedReason = reason ? stripHtml(reason) : null;

  try {
    // Validate that the item exists
    if (item_type.toLowerCase() === 'topic') {
      const topicExists = await pool.query('SELECT id FROM topics WHERE id = $1', [item_id]);
      if (topicExists.rows.length === 0) {
        return res.status(404).json({ message: 'Topic to report not found.' });
      }
    } else if (item_type.toLowerCase() === 'comment') {
      const commentExists = await pool.query('SELECT id FROM comments WHERE id = $1', [item_id]);
      if (commentExists.rows.length === 0) {
        return res.status(404).json({ message: 'Comment to report not found.' });
      }
    }

    // Check if this user has already reported this exact item (optional, to prevent spam)
    const existingReport = await pool.query(
        'SELECT id FROM reports WHERE item_id = $1 AND item_type = $2 AND reported_by_user_id = $3 AND status = $4',
        [item_id, item_type.toLowerCase(), reported_by_user_id, 'pending']
    );
    if (existingReport.rows.length > 0) {
        return res.status(409).json({ message: 'You have already reported this item and it is pending review.' });
    }


    const result = await pool.query(
      'INSERT INTO reports (item_id, item_type, reported_by_user_id, reason) VALUES ($1, $2, $3, $4) RETURNING *',
      [item_id, item_type.toLowerCase(), reported_by_user_id, sanitizedReason]
    );
    res.status(201).json({ message: 'Report submitted successfully.', report: result.rows[0] });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ message: 'Server error while creating report.' });
  }
});

module.exports = router;
