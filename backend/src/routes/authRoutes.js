const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../.env' });

const router = express.Router();

// Initiate Google OAuth
// Scope requests profile information and email
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/google/failure' }), // session: false as we are using JWT
  (req, res) => {
    // Successful authentication
    if (!req.user) {
      return res.status(401).json({ message: 'User authentication failed.' });
    }

    // Generate JWT
    const payload = {
      id: req.user.id,
      email: req.user.email,
      // Add other relevant user details to payload if needed
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1h', // Token expiration time
    });

    // For now, return token in JSON response.
    // In a real app, you might redirect to frontend:
    // res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    res.json({ token });
  }
);

// Simple failure route for Google OAuth
router.get('/google/failure', (req, res) => {
  res.status(401).json({ message: 'Google Authentication Failed' });
});

module.exports = router;
