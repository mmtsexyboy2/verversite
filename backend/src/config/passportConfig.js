const GoogleStrategy = require('passport-google-oauth20').Strategy;
const config = require('./index');
const User = require('../models/userModel'); // User model for DB operations
const jwt = require('jsonwebtoken');

module.exports = function(passport) {
  passport.use(new GoogleStrategy({
    clientID: config.google.clientID,
    clientSecret: config.google.clientSecret,
    callbackURL: config.google.callbackURL,
    scope: ['profile', 'email'], // Request 'profile' and 'email' scopes
    passReqToCallback: true // Allows us to pass req object to the callback
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findByGoogleId(profile.id);

      if (user) {
        // User found, proceed
        return done(null, user);
      } else {
        // If user not found by google_id, try to find by email or create new
        user = await User.createFromGoogleProfile(profile);
        return done(null, user);
      }
    } catch (err) {
      console.error("Error in Google OAuth Strategy:", err);
      return done(err, null);
    }
  }));

  // Serializes user information to be stored in the session.
  // For JWT based auth, we might not rely heavily on server-side sessions after token issuance.
  // Storing user ID is common.
  passport.serializeUser((user, done) => {
    done(null, user.id); // Store user's database ID in session
  });

  // Deserializes user information from the session.
  // Retrieves the full user object based on the stored ID.
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user); // User object is attached to req.user
    } catch (err) {
      done(err, null);
    }
  });
};
