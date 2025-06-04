const express = require('express');
const pool = require('../config/db'); // Assuming db.js exports the pg pool

const router = express.Router();

// GET /api/categories - Fetches all categories
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, description, theme_config, created_at FROM categories ORDER BY name ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error while fetching categories.' });
  }
});

module.exports = router;
