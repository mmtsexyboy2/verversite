const express = require('express');
const { requireJwt } = require('../middlewares/authMiddleware'); // Use requireJwt for these routes
const User = require('../models/userModel');

const router = express.Router();

// GET /api/v1/users/me - Get current user's basic info (from JWT or fetched)
router.get('/me', requireJwt, async (req, res) => {
  try {
    // req.user is populated by requireJwt middleware from the token payload.
    // It usually contains id, email. Fetch full user details from DB.
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    // Exclude sensitive data like password hash if it were there
    const { password_hash, ...userOutput } = user;
    res.json(userOutput);
  } catch (error) {
    console.error("Error fetching /users/me:", error);
    res.status(500).json({ message: 'Error fetching user information.' });
  }
});

// GET /api/v1/users/me/profile - Get current user's extended profile
router.get('/me/profile', requireJwt, async (req, res) => {
  try {
    const userId = req.user.id; // from JWT
    const basicUser = await User.findById(userId);
    if (!basicUser) {
        return res.status(404).json({ message: 'User not found.' });
    }
    const profile = await User.getProfile(userId);
    if (!profile) {
        // This case should ideally be handled by getProfile returning a default or User.findById including it
        return res.status(404).json({ message: 'Profile not found for user.' });
    }
    // Combine basic user info (excluding sensitive data) with profile
    const { password_hash, ...userOutput } = basicUser;
    res.json({ ...userOutput, ...profile });
  } catch (error) {
    console.error("Error fetching /users/me/profile:", error);
    res.status(500).json({ message: 'Error fetching user profile.' });
  }
});

// PUT /api/v1/users/me/profile - Update current user's profile
router.put('/me/profile', requireJwt, async (req, res) => {
  try {
    const userId = req.user.id; // from JWT
    const { full_name, bio } = req.body; // Extract editable fields

    if (full_name === undefined && bio === undefined) {
        return res.status(400).json({ message: 'No fields provided for update.' });
    }

    const updatedProfileData = {};
    if (full_name !== undefined) updatedProfileData.fullName = full_name;
    if (bio !== undefined) updatedProfileData.bio = bio;

    const updatedUserAndProfile = await User.updateProfile(userId, updatedProfileData);

    if (!updatedUserAndProfile) {
      return res.status(404).json({ message: 'User not found or profile update failed.' });
    }
    // Exclude sensitive data like password hash if it were there
    const { password_hash, ...output } = updatedUserAndProfile;
    res.json(output);
  } catch (error) {
    console.error("Error updating /users/me/profile:", error);
    res.status(500).json({ message: 'Error updating user profile.' });
  }
});

module.exports = router;
