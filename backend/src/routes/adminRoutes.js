const express = require('express');
const pool = require('../config/db');
const { protect } = require('../middleware/authMiddleware'); // For JWT auth
const { isAdmin } = require('../middleware/adminAuthMiddleware'); // For admin check
const { stripHtml } = require('../utils/sanitize');

const router = express.Router();

// Apply protect and isAdmin middleware to all routes in this file
router.use(protect, isAdmin);

// --- User Management ---

// GET /api/admin/users - List all users with pagination
router.get('/users', async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const offset = (page - 1) * limit;

  try {
    const usersResult = await pool.query(
      'SELECT id, name, email, role, is_banned, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    const totalResult = await pool.query('SELECT COUNT(*) FROM users');
    const totalUsers = parseInt(totalResult.rows[0].count, 10);

    res.json({
      data: usersResult.rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        limit,
      },
    });
  } catch (error) {
    console.error('Admin: Error fetching users:', error);
    res.status(500).json({ message: 'Server error while fetching users.' });
  }
});

// POST /api/admin/users/:userId/ban - Ban a user
router.post('/users/:userId/ban', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query('UPDATE users SET is_banned = TRUE, updated_at = current_timestamp WHERE id = $1 RETURNING id, name, email, role, is_banned', [userId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'User banned successfully.', user: result.rows[0] });
  } catch (error) {
    console.error('Admin: Error banning user:', error);
    res.status(500).json({ message: 'Server error while banning user.' });
  }
});

// POST /api/admin/users/:userId/unban - Unban a user
router.post('/users/:userId/unban', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query('UPDATE users SET is_banned = FALSE, updated_at = current_timestamp WHERE id = $1 RETURNING id, name, email, role, is_banned', [userId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'User unbanned successfully.', user: result.rows[0] });
  } catch (error) {
    console.error('Admin: Error unbanning user:', error);
    res.status(500).json({ message: 'Server error while unbanning user.' });
  }
});

// PUT /api/admin/users/:userId/role - Update user's role
router.put('/users/:userId/role', async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body; // e.g., 'admin', 'user', 'moderator'

  if (!role || !['user', 'admin', 'moderator'].includes(role)) { // Define allowed roles
    return res.status(400).json({ message: 'Invalid role specified. Allowed roles are: user, admin, moderator.' });
  }

  try {
    const result = await pool.query('UPDATE users SET role = $1, updated_at = current_timestamp WHERE id = $2 RETURNING id, name, email, role, is_banned', [role, userId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'User role updated successfully.', user: result.rows[0] });
  } catch (error) {
    console.error('Admin: Error updating user role:', error);
    res.status(500).json({ message: 'Server error while updating user role.' });
  }
});

// --- Statistics ---
// GET /api/admin/stats/summary
router.get('/stats/summary', async (req, res) => {
  try {
    const usersCountPromise = pool.query('SELECT COUNT(*) FROM users');
    const topicsCountPromise = pool.query('SELECT COUNT(*) FROM topics');
    const commentsCountPromise = pool.query('SELECT COUNT(*) FROM comments');

    const [usersResult, topicsResult, commentsResult] = await Promise.all([
      usersCountPromise,
      topicsCountPromise,
      commentsCountPromise,
    ]);

    res.json({
      totalUsers: parseInt(usersResult.rows[0].count, 10),
      totalTopics: parseInt(topicsResult.rows[0].count, 10),
      totalComments: parseInt(commentsResult.rows[0].count, 10),
    });
  } catch (error) {
    console.error('Admin: Error fetching summary stats:', error);
    res.status(500).json({ message: 'Server error while fetching summary stats.' });
  }
});

// GET /api/admin/stats/popular-topics
router.get('/stats/popular-topics', async (req, res) => {
  try {
    // Popular by likes count for this example
    const result = await pool.query(
      `SELECT t.id, t.title, COUNT(tl.topic_id) as likes_count, u.name as author_name
       FROM topics t
       LEFT JOIN topic_likes tl ON t.id = tl.topic_id
       JOIN users u ON t.user_id = u.id
       GROUP BY t.id, u.name
       ORDER BY likes_count DESC
       LIMIT 10`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Admin: Error fetching popular topics stats:', error);
    res.status(500).json({ message: 'Server error while fetching popular topics stats.' });
  }
});

// --- Report Management ---
// GET /api/admin/reports - List reports with filtering and pagination
router.get('/reports', async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;
  const statusFilter = req.query.status || 'pending'; // Default to pending reports

  try {
    const reportsResult = await pool.query(
      `SELECT r.id, r.item_id, r.item_type, r.reason, r.status, r.created_at, r.reviewed_at,
              u_reported.name AS reported_by_name, u_reported.email AS reported_by_email,
              u_admin.name AS reviewed_by_admin_name
       FROM reports r
       LEFT JOIN users u_reported ON r.reported_by_user_id = u_reported.id
       LEFT JOIN users u_admin ON r.reviewed_by_admin_id = u_admin.id
       WHERE r.status = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [statusFilter, limit, offset]
    );

    const totalResult = await pool.query('SELECT COUNT(*) FROM reports WHERE status = $1', [statusFilter]);
    const totalReports = parseInt(totalResult.rows[0].count, 10);

    res.json({
      data: reportsResult.rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalReports / limit),
        totalReports,
        limit,
        statusFilter,
      },
    });
  } catch (error) {
    console.error('Admin: Error fetching reports:', error);
    res.status(500).json({ message: 'Server error while fetching reports.' });
  }
});

// POST /api/admin/reports/:reportId/status - Update report status
router.post('/reports/:reportId/status', async (req, res) => {
  const { reportId } = req.params;
  const { status } = req.body;
  const adminUserId = req.user.id; // Admin who is reviewing

  if (!status || !['pending', 'resolved_no_action', 'resolved_item_removed'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status provided.' });
  }

  try {
    const result = await pool.query(
      'UPDATE reports SET status = $1, reviewed_by_admin_id = $2, reviewed_at = current_timestamp WHERE id = $3 RETURNING *',
      [status, adminUserId, reportId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Report not found.' });
    }
    // Note: If status is 'resolved_item_removed', actual item deletion is manual or separate logic.
    res.json({ message: 'Report status updated successfully.', report: result.rows[0] });
  } catch (error) {
    console.error('Admin: Error updating report status:', error);
    res.status(500).json({ message: 'Server error while updating report status.' });
  }
});


// --- Category Management ---

// POST /api/admin/categories - Create a new category
router.post('/categories', async (req, res) => {
  let { name, description, theme_config } = req.body;

  name = stripHtml(name || '');
  description = stripHtml(description || ''); // Or allow some HTML with proper sanitizer if needed

  if (!name) {
    return res.status(400).json({ message: 'Category name is required.' });
  }
  if (theme_config && typeof theme_config !== 'object') {
    return res.status(400).json({ message: 'Theme config must be an object if provided.'});
  }


  try {
    const result = await pool.query(
      'INSERT INTO categories (name, description, theme_config) VALUES ($1, $2, $3) RETURNING *',
      [name, description, theme_config || {}]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Admin: Error creating category:', error);
    if (error.code === '23505') { // Unique violation for name
        return res.status(409).json({ message: 'Category name already exists.' });
    }
    res.status(500).json({ message: 'Server error while creating category.' });
  }
});

// PUT /api/admin/categories/:categoryId - Update an existing category
router.put('/categories/:categoryId', async (req, res) => {
  const { categoryId } = req.params;
  let { name, description, theme_config } = req.body;

  name = name ? stripHtml(name) : undefined;
  description = description ? stripHtml(description) : undefined;

  if (name === '') return res.status(400).json({ message: 'Category name cannot be empty.' });
  if (theme_config && typeof theme_config !== 'object') {
    return res.status(400).json({ message: 'Theme config must be an object.'});
  }

  // Build query dynamically based on provided fields
  const fields = [];
  const values = [];
  let queryIndex = 1;

  if (name !== undefined) {
    fields.push(`name = $${queryIndex++}`);
    values.push(name);
  }
  if (description !== undefined) {
    fields.push(`description = $${queryIndex++}`);
    values.push(description);
  }
  if (theme_config !== undefined) {
    fields.push(`theme_config = $${queryIndex++}`);
    values.push(theme_config);
  }
  fields.push(`updated_at = current_timestamp`);

  if (fields.length === 1) { // Only updated_at
    return res.status(400).json({ message: 'No fields provided for update.' });
  }

  values.push(categoryId); // For WHERE id = $N

  try {
    const result = await pool.query(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = $${queryIndex} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Category not found.' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Admin: Error updating category:', error);
     if (error.code === '23505') { // Unique violation for name
        return res.status(409).json({ message: 'Category name already exists.' });
    }
    res.status(500).json({ message: 'Server error while updating category.' });
  }
});

// DELETE /api/admin/categories/:categoryId - Delete a category
router.delete('/categories/:categoryId', async (req, res) => {
  const { categoryId } = req.params;
  try {
    // Consider impact on topics: current topics.category_id is SET NULL on category delete
    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [categoryId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Category not found.' });
    res.json({ message: 'Category deleted successfully.' });
  } catch (error) {
    console.error('Admin: Error deleting category:', error);
    // Check for foreign key violation if topics.category_id was ON DELETE RESTRICT
    // if (error.code === '23503') {
    //   return res.status(400).json({ message: 'Cannot delete category as it is referenced by topics. Please reassign topics first.' });
    // }
    res.status(500).json({ message: 'Server error while deleting category.' });
  }
});


// --- Topic Management (Admin) ---

// DELETE /api/admin/topics/:topicId - Admin deletes any topic
router.delete('/topics/:topicId', async (req, res) => {
  const { topicId } = req.params;
  try {
    const topicResult = await pool.query('SELECT image_url FROM topics WHERE id = $1', [topicId]);
    if (topicResult.rows.length === 0) {
      return res.status(404).json({ message: 'Topic not found.' });
    }
    const topic = topicResult.rows[0];

    await pool.query('DELETE FROM topics WHERE id = $1', [topicId]);

    if (topic.image_url) {
      const imagePath = path.join(__dirname, '..', '..', topic.image_url.replace('/uploads', 'uploads'));
      fs.unlink(imagePath, (err) => {
        if (err) console.error('Admin: Error deleting topic image file:', err);
        else console.log('Admin: Successfully deleted topic image file:', imagePath);
      });
    }
    res.json({ message: 'Topic deleted successfully by admin.' });
  } catch (error) {
    console.error('Admin: Error deleting topic:', error);
    res.status(500).json({ message: 'Server error while deleting topic.' });
  }
});

// --- Topic Flag Management ---
// Helper function to toggle a boolean flag on a topic
const toggleTopicFlag = async (topicId, flagName, res) => {
  try {
    // First, get the current value of the flag
    const currentFlagResult = await pool.query(`SELECT ${flagName} FROM topics WHERE id = $1`, [topicId]);
    if (currentFlagResult.rows.length === 0) {
      return res.status(404).json({ message: 'Topic not found.' });
    }
    const currentValue = currentFlagResult.rows[0][flagName];

    // Toggle the value
    const result = await pool.query(
      `UPDATE topics SET ${flagName} = NOT ${flagName}, updated_at = current_timestamp WHERE id = $1 RETURNING id, title, ${flagName}`,
      [topicId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Topic not found (should not happen after previous check).' }); // Should not happen
    res.json({ message: `Topic ${flagName} status toggled successfully. New status: ${!currentValue}`, topic: result.rows[0] });
  } catch (error) {
    console.error(`Admin: Error toggling ${flagName} for topic ${topicId}:`, error);
    res.status(500).json({ message: `Server error while toggling ${flagName}.` });
  }
};

// POST /api/admin/topics/:topicId/highlight - Toggle highlight status
router.post('/topics/:topicId/highlight', (req, res) => {
  toggleTopicFlag(req.params.topicId, 'is_highlighted', res);
});

// POST /api/admin/topics/:topicId/pin - Toggle pin status
router.post('/topics/:topicId/pin', (req, res) => {
  toggleTopicFlag(req.params.topicId, 'is_pinned', res);
});

// POST /api/admin/topics/:topicId/ver-ver-tick - Toggle Ver Ver Tick status
router.post('/topics/:topicId/ver-ver-tick', (req, res) => {
  toggleTopicFlag(req.params.topicId, 'is_ver_ver_ticked', res);
});


module.exports = router;
