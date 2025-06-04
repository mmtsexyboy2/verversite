const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const pool = require('../config/db');

const router = express.Router();

// GET /api/users/me - Get current user's profile
router.get('/me', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user details from users table
    const userResult = await pool.query('SELECT id, google_id, email, name, created_at, updated_at FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch user profile from user_profiles table
    const profileResult = await pool.query('SELECT bio, avatar_url FROM user_profiles WHERE user_id = $1', [userId]);
    const profile = profileResult.rows[0];

    // Combine user and profile information
    const userProfile = {
      ...user,
      profile: profile || null, // If no profile, set to null
    };

    res.json(userProfile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
});

// PUT /api/users/me - Update current user's profile
router.put('/me', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { bio, avatar_url, name } = req.body; // Allow updating name in users table as well

    // Update name in users table if provided
    if (name !== undefined) {
      await pool.query('UPDATE users SET name = $1, updated_at = current_timestamp WHERE id = $2', [name, userId]);
    }

    // Upsert profile: Insert or update user_profiles
    // COALESCE is used to keep existing values if new ones are not provided (null)
    const upsertProfileQuery = `
      INSERT INTO user_profiles (user_id, bio, avatar_url)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id)
      DO UPDATE SET
        bio = COALESCE($2, user_profiles.bio),
        avatar_url = COALESCE($3, user_profiles.avatar_url),
        updated_at = current_timestamp
      RETURNING bio, avatar_url;
    `;
    // Use null for bio or avatar_url if they are not provided in the request,
    // so COALESCE can work correctly to keep existing values.
    const profileValues = [userId, bio !== undefined ? bio : null, avatar_url !== undefined ? avatar_url : null];
    const profileResult = await pool.query(upsertProfileQuery, profileValues);

    // Fetch updated user details (including potentially updated name)
    const updatedUserResult = await pool.query('SELECT id, google_id, email, name, created_at, updated_at FROM users WHERE id = $1', [userId]);

    res.json({
      ...updatedUserResult.rows[0],
      profile: profileResult.rows[0],
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    if (error.code === '23503') { // Foreign key violation
        return res.status(400).json({ message: 'User ID does not exist or other integrity constraint violation.'})
    }
    res.status(500).json({ message: 'Server error while updating profile' });
  }
});

module.exports = router;
