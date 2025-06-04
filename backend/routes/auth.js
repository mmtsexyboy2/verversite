const express = require('express');
const passport = require('passport'); // Configured instance from passport-setup.js
const { generateAccessToken, generateAndStoreRefreshToken, verifyAndValidateRefreshToken, invalidateRefreshToken } = require('../auth/jwt-utils');
const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Initiates Google OAuth flow
// /api/auth/google
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// Handles Google OAuth callback
// /api/auth/google/callback
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: `${FRONTEND_URL}/login?error=google_auth_failed`, session: false }),
  async (req, res) => {
    // Successful authentication, user object is attached to req.user by Passport
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication failed: No user profile returned.' });
    }

    try {
      const user = req.user; // User from database, processed by passport-setup.js
      const accessToken = generateAccessToken(user);
      const refreshToken = await generateAndStoreRefreshToken(user);

      // Redirect to frontend with tokens and user info in query parameters
      const userPayload = { // Send non-sensitive user details
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        full_name: user.full_name,
        // Include is_staff, is_superuser if needed by frontend immediately,
        // but typically these are checked by backend on protected actions
        is_staff: user.is_staff,
        is_superuser: user.is_superuser
      };

      const queryParams = new URLSearchParams({
        accessToken,
        refreshToken,
        user: JSON.stringify(userPayload)
      }).toString();

      res.redirect(`${FRONTEND_URL}/auth/google/callback?${queryParams}`);

    } catch (error) {
      console.error('Error generating tokens:', error);
      res.status(500).json({ message: 'Error generating tokens' });
    }
  }
);

// Refreshes an access token
// /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }

  try {
    const user = await verifyAndValidateRefreshToken(refreshToken);

    if (!user) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    // If refresh token is valid, issue a new access token
    const newAccessToken = generateAccessToken(user);

    // Optional: Implement refresh token rotation (generate new refresh token, invalidate old one)
    // const newRefreshToken = await generateAndStoreRefreshToken(user);
    // await invalidateRefreshToken(refreshToken, user.id); // Invalidate the used token

    res.json({
      accessToken: newAccessToken,
      // refreshToken: newRefreshToken, // if rotating
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Error processing refresh token' });
  }
});

// Logs out a user by invalidating their refresh token
// /api/auth/logout
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required to logout' });
  }

  try {
    // We need user_id to safely invalidate. Best if this comes from an authenticated session
    // or if the refresh token itself contains the user_id (which it does via JWT decode).
    const decoded = require('jsonwebtoken').verify(refreshToken, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
        return res.status(401).json({ message: 'Invalid refresh token structure.' });
    }

    const invalidated = await invalidateRefreshToken(refreshToken, decoded.id);

    if (invalidated > 0) {
      res.status(200).json({ message: 'Logout successful, refresh token invalidated.' });
    } else {
      // This could mean the token was already invalid or didn't exist
      res.status(404).json({ message: 'Refresh token not found or already invalidated.' });
    }
  } catch (error) {
    // Handle JWT errors (e.g., expired, malformed)
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Invalid or expired refresh token.' });
    }
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Error during logout' });
  }
});

module.exports = router;
