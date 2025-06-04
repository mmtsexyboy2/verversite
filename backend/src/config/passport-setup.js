const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./db'); // Database pool
require('dotenv').config({ path: '../.env' });

module.exports = function(passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/callback', // Assuming base URL is handled by proxy or ingress
        proxy: true // Important if behind a proxy like Nginx or in Docker
      },
      async (accessToken, refreshToken, profile, done) => {
        const { id, displayName, emails } = profile;
        const email = emails && emails.length > 0 ? emails[0].value : null;

        if (!email) {
          return done(new Error('No email found in Google profile'), null);
        }

        try {
          // Check if user exists
          let userResult = await pool.query('SELECT * FROM users WHERE google_id = $1', [id]);
          let user = userResult.rows[0];

          if (user) {
            // User exists, update name if changed, and update email if it was null
            // Or if you want to allow email changes, handle that logic here
            if (user.name !== displayName || (user.email === null && email !== null)) {
              const updateUser = await pool.query(
                'UPDATE users SET name = $1, email = COALESCE(email, $2), updated_at = current_timestamp WHERE google_id = $3 RETURNING *',
                [displayName, email, id]
              );
              user = updateUser.rows[0];
            }
            return done(null, user);
          } else {
            // New user, create one
            // Check if email is already in use by another account (non-Google)
            const existingEmailUser = await pool.query('SELECT * FROM users WHERE email = $1 AND google_id IS NULL', [email]);
            if (existingEmailUser.rows.length > 0) {
              // Potentially link accounts or return error. For now, error.
              return done(new Error('Email already in use by a different account type.'), null);
            }

            const newUser = await pool.query(
              'INSERT INTO users (google_id, email, name) VALUES ($1, $2, $3) RETURNING *',
              [id, email, displayName]
            );
            return done(null, newUser.rows[0]);
          }
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );

  // For JWT, session-based serialize/deserialize might not be strictly needed
  // if every protected route re-verifies JWT.
  // However, passport still requires them. They can be minimal.
  passport.serializeUser((user, done) => {
    done(null, user.id); // Store user.id in the session (if sessions were used)
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      const user = result.rows[0];
      done(null, user); // Attach user object to req.user
    } catch (err) {
      done(err, null);
    }
  });
};
