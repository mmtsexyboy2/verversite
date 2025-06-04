const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: '../.env' });

const router = express.Router();

// Rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Initiate Google OAuth
// Scope requests profile information and email
router.get(
  '/google',
  authLimiter, // Apply the limiter
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// Google OAuth callback
router.get(
  '/google/callback',
  authLimiter, // Apply the limiter
  passport.authenticate('google', { session: false, failureRedirect: '/auth/google/failure' }),
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
      expiresIn: '7d', // Updated token expiration to 7 days
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
