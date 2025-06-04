const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/userModel'); // For fetching user details if needed post-auth

const router = express.Router();

// Route to initiate Google OAuth flow
// GET /api/v1/auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth callback route
// GET /api/v1/auth/google/callback
router.get('/google/callback',
  passport.authenticate('google', {
    // successRedirect: config.frontendURL + '/profile', // Or handle redirect manually to set token
    failureRedirect: config.frontendURL + '/login?error=google_auth_failed', // Redirect to login page on failure
    session: false, // We will handle session/token manually after this
  }),
  (req, res) => {
    // Successful authentication by passport. req.user should be available.
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication failed, user not found after Google callback.' });
    }

    // User is authenticated, create a JWT
    const payload = {
      id: req.user.id, // Use database ID for JWT payload
      email: req.user.email,
      // Add any other relevant, non-sensitive info to the payload
    };

    const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    // Send the token to the client.
    // Option 1: As a JSON response (client then stores it, e.g., in localStorage)
    // res.json({ token, user: req.user });

    // Option 2: Set it in an HTTP-only cookie (more secure against XSS)
    // and redirect to frontend.
    res.cookie('jwt_token', token, {
      httpOnly: true,
      secure: config.isProduction, // Send only over HTTPS in production
      maxAge: parseInt(config.jwt.expiresIn) * 1000 || 3600 * 1000, // e.g., 1 hour in ms
      // sameSite: 'Lax' // Or 'Strict'. 'Lax' is often a good default.
    });

    // Redirect to a page on the frontend that indicates successful login
    // For example, to user's profile page or a dashboard.
    res.redirect(config.frontendURL + '/profile?login=success'); // Adjust as needed
  }
);

// Logout route
// POST /api/v1/auth/logout
router.post('/logout', (req, res) => {
  // If using session-based auth alongside JWT (e.g. for the OAuth flow itself):
  if (req.logout) { // req.logout is added by passport
    req.logout(err => { // Modern passport req.logout is async and needs a callback
        if (err) {
            console.error("Error during req.logout:", err);
            // Decide if this error should prevent cookie clearing
        }
    });
  }
  if (req.session) {
    req.session.destroy(err => { // Destroy server-side session
        if (err) {
            console.error("Error destroying session:", err);
        }
    });
  }

  // Clear the JWT cookie
  res.clearCookie('jwt_token', {
    httpOnly: true,
    secure: config.isProduction,
    // sameSite: 'Lax'
  });

  res.status(200).json({ message: 'Logout successful.' });
});

module.exports = router;
