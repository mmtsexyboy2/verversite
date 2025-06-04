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

    // Check if user is admin
    const adminEmailsEnv = process.env.ADMIN_EMAILS || '';
    const adminEmailList = adminEmailsEnv.split(',').map(email => email.trim().toLowerCase());
    const isAdminUser = adminEmailList.includes(user.email.toLowerCase());

    // Combine user and profile information
    const userProfile = {
      ...user,
      profile: profile || null,
      isAdmin: isAdminUser, // Add isAdmin flag
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

// Follow a user
router.post('/:userId/follow', protect, async (req, res) => {
  const followerId = req.user.id; // Current logged-in user
  const followingId = parseInt(req.params.userId, 10);

  if (followerId === followingId) {
    return res.status(400).json({ message: 'You cannot follow yourself.' });
  }

  try {
    // Check if the user to be followed exists
    const userToFollow = await pool.query('SELECT id FROM users WHERE id = $1', [followingId]);
    if (userToFollow.rows.length === 0) {
      return res.status(404).json({ message: 'User to follow not found.' });
    }

    await pool.query(
      'INSERT INTO user_follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [followerId, followingId]
    );
    res.status(201).json({ message: 'Successfully followed user.' });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ message: 'Server error while trying to follow user.' });
  }
});

// Unfollow a user
router.delete('/:userId/follow', protect, async (req, res) => {
  const followerId = req.user.id; // Current logged-in user
  const followingId = parseInt(req.params.userId, 10);

  try {
    const result = await pool.query(
      'DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Follow relationship not found or already unfollowed.' });
    }
    res.status(200).json({ message: 'Successfully unfollowed user.' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ message: 'Server error while trying to unfollow user.' });
  }
});

// Get a user's followers
router.get('/:userId/followers', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email
       FROM users u
       JOIN user_follows uf ON u.id = uf.follower_id
       WHERE uf.following_id = $1`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({ message: 'Server error while fetching followers.' });
  }
});

// Get users a user is following
router.get('/:userId/following', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email
       FROM users u
       JOIN user_follows uf ON u.id = uf.following_id
       WHERE uf.follower_id = $1`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching following list:', error);
    res.status(500).json({ message: 'Server error while fetching following list.' });
  }
});


module.exports = router;
