const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const knex = require('../db/knex'); // Adjust path if your knex instance is elsewhere

// Utility function to generate a unique username (simplified)
async function generateUniqueUsername(profile) {
  let username = '';
  if (profile.emails && profile.emails[0] && profile.emails[0].value) {
    username = profile.emails[0].value.split('@')[0];
  } else if (profile.name && profile.name.givenName && profile.name.familyName) {
    username = `${profile.name.givenName}${profile.name.familyName}`;
  } else {
    username = `user${profile.id.substring(0, 5)}`; // Fallback
  }
  username = username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(); // Sanitize

  let is_unique = false;
  let counter = 0;
  let potential_username = username;
  while (!is_unique) {
    const existing_user = await knex('users').where({ username: potential_username }).first();
    if (!existing_user) {
      is_unique = true;
    } else {
      counter++;
      potential_username = `${username}${counter}`;
    }
  }
  return potential_username;
}

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_OAUTH_REDIRECT_URI,
    scope: ['profile', 'email'] // Ensure scope matches what's expected
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await knex('users').where({ google_id: profile.id }).first();

      if (user) {
        // User exists, update details
        const updatedInfo = {
          last_login: knex.fn.now(),
          avatar_url: profile.photos && profile.photos[0] ? profile.photos[0].value : user.avatar_url,
          full_name: profile.displayName || user.full_name,
          // Optionally update email and email_verified if they can change and you want to sync
          // email: profile.emails && profile.emails[0] ? profile.emails[0].value : user.email,
          // email_verified: profile.emails && profile.emails[0] ? profile.emails[0].verified : user.email_verified,
        };
        await knex('users').where({ id: user.id }).update(updatedInfo);
        user = { ...user, ...updatedInfo }; // Merge updated info into user object
        return done(null, user);
      } else {
        // User does not exist, create new user
        const newUsername = await generateUniqueUsername(profile);
        const newUser = {
          google_id: profile.id,
          email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
          email_verified: profile.emails && profile.emails[0] ? profile.emails[0].verified : false,
          username: newUsername,
          full_name: profile.displayName,
          avatar_url: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
          is_active: true,
          // date_joined is handled by defaultTo(knex.fn.now()) in migration
        };

        if (!newUser.email) {
          // If email is not available from profile, it's a problem as it's not nullable
          // This should ideally not happen if 'email' scope is granted.
          return done(new Error("Email not found in Google profile. Cannot create user."), null);
        }

        const [createdUser] = await knex('users').insert(newUser).returning('*');
        return done(null, createdUser);
      }
    } catch (error) {
      return done(error, null);
    }
  }
));

// If using sessions with Passport (even briefly during OAuth dance), these are needed.
// For pure JWT, if session: false is strictly used, these might be less critical
// but are often included as good practice with Passport.
passport.serializeUser((user, done) => {
  done(null, user.id); // Serialize user by their database ID
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await knex('users').where({ id }).first();
    done(null, user); // Deserialize user by fetching from DB
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport; // Export configured passport
