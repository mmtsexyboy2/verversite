const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth-middleware');
const knex = require('../db/knex'); // Assuming knex is configured and exported from here

// GET /api/users/me
// Protected route, requires valid JWT access token
router.get('/me', verifyToken, async (req, res) => {
  // req.user is attached by verifyToken middleware and contains token payload
  // For more up-to-date user info, or if you need fields not in the JWT payload:
  try {
    const userFromDb = await knex('users')
      .select('id', 'username', 'email', 'google_id', 'full_name', 'avatar_url', 'is_active', 'is_staff', 'is_superuser', 'date_joined', 'last_login')
      .where({ id: req.user.id })
      .first();

    if (!userFromDb) {
      // This case should ideally not happen if JWT is valid and user ID in it exists
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!userFromDb.is_active) {
        return res.status(403).json({ message: 'Forbidden: User account is inactive.' });
    }

    res.json(userFromDb);
  } catch (error) {
    console.error('Error fetching user details for /me:', error);
    res.status(500).json({ message: 'Error fetching user details.' });
  }
});

// Example of a protected route to update user details (e.g., username)
// PUT /api/users/me
router.put('/me', verifyToken, async (req, res) => {
  const { username, full_name } = req.body; // Allow updating specific fields
  const userId = req.user.id;

  if (!username && !full_name) {
    return res.status(400).json({ message: 'No updateable fields provided (e.g., username, full_name).' });
  }

  const updateData = {};
  if (username) updateData.username = username;
  if (full_name) updateData.full_name = full_name;
  updateData.updated_at = knex.fn.now();


  try {
    // Check if username is being updated and if it's already taken
    if (username) {
      const existingUser = await knex('users')
        .where({ username: username })
        .whereNot({ id: userId })
        .first();
      if (existingUser) {
        return res.status(409).json({ message: 'Username already taken.' });
      }
    }

    const [updatedUser] = await knex('users')
      .where({ id: userId })
      .update(updateData)
      .returning(['id', 'username', 'email', 'google_id', 'full_name', 'avatar_url', 'is_active', 'is_staff', 'is_superuser', 'date_joined', 'last_login', 'updated_at']);

    if (!updatedUser) {
        return res.status(404).json({ message: 'User not found or update failed.'});
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user details for /me:', error);
    // Specific error for unique constraint violation on username (though checked above, good fallback)
    if (error.routine === '_bt_check_unique') { // This error code might be PostgreSQL specific
        return res.status(409).json({ message: 'Username already taken.' });
    }
    res.status(500).json({ message: 'Error updating user details.' });
  }
});


module.exports = router;
