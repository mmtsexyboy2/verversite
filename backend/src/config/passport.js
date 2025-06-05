const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const knex = require('knex')(require('../../knexfile').development); // Adjust path as needed
const jwt = require('jsonwebtoken');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.API_BASE_URL}/api/auth/google/callback`,
    scope: ['profile', 'email']
},
async (accessToken, refreshToken, profile, done) => {
    try {
        // Find or create user
        let user = await knex('users').where({ google_id: profile.id }).first();
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;

        if (!email) {
            return done(new Error("Email not provided by Google."), null);
        }

        // Check if email is verified by Google
        const emailVerified = profile.emails && profile.emails[0] && profile.emails[0].verified;


        if (!user) {
            // Check if user with this email already exists (e.g. signed up differently before)
            let existingUserByEmail = await knex('users').where({ email: email }).first();
            if (existingUserByEmail) {
                // Link Google ID to existing email if not already linked
                if (!existingUserByEmail.google_id) {
                     await knex('users').where({id: existingUserByEmail.id}).update({google_id: profile.id, email_verified: emailVerified === true || emailVerified === 'true' });
                     user = await knex('users').where({ id: existingUserByEmail.id }).first();
                } else if (existingUserByEmail.google_id !== profile.id) {
                    // Email is associated with a different Google ID
                    return done(new Error("This email is already associated with another Google account."), null);
                } else {
                    user = existingUserByEmail; // Should be the same user
                }
            } else {
                // Create new user
                const username = email.split('@')[0] + "_" + Math.random().toString(36).substring(2, 7); // Basic unique username
                const [newUserId] = await knex('users').insert({
                    google_id: profile.id,
                    email: email,
                    email_verified: emailVerified === true || emailVerified === 'true',
                    username: username, // Consider a better username generation strategy
                    full_name: profile.displayName,
                    avatar_url: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                    date_joined: new Date(),
                    last_login: new Date()
                }).returning('id');
                user = await knex('users').where({ id: newUserId.id ? newUserId.id : newUserId }).first(); // .id for postgres
            }
        } else {
            // User exists, update last login and potentially avatar/name
            await knex('users').where({ id: user.id }).update({
                last_login: new Date(),
                full_name: profile.displayName,
                avatar_url: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                email_verified: emailVerified === true || emailVerified === 'true'
            });
            user = await knex('users').where({ id: user.id }).first(); // refresh user data
        }
        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await knex('users').where({ id }).first();
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

module.exports = passport;
