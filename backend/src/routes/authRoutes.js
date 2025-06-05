const express = require('express');
const passport = require('../config/passport'); // Corrected path
const jwt = require('jsonwebtoken');
const knex = require('knex')(require('../../knexfile').development); // Adjust path as needed

const router = express.Router();

// Generate JWT
const generateToken = (user) => {
    return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// Generate Refresh Token and store it
const generateRefreshToken = async (user) => {
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 7);

    // Remove old refresh tokens for this user
    await knex('refresh_tokens').where({ user_id: user.id }).del();
    // Store new refresh token
    await knex('refresh_tokens').insert({
        user_id: user.id,
        token: refreshToken,
        expires_at: expires_at
    });
    return refreshToken;
};

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: `${process.env.APP_BASE_URL}/login?error=true`, session: false }), async (req, res) => {
    // Successful authentication
    const user = req.user;
    const token = generateToken(user);
    const refreshToken = await generateRefreshToken(user);

    // Redirect to frontend with tokens (or set as cookies)
    // For simplicity, redirecting with query parameters. Consider cookies for production.
    res.redirect(`${process.env.APP_BASE_URL}/auth/callback?token=${token}&refreshToken=${refreshToken}`);
});

router.post('/token/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token required' });
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        const storedToken = await knex('refresh_tokens')
            .where({ user_id: decoded.id, token: refreshToken })
            .first();

        if (!storedToken || new Date(storedToken.expires_at) < new Date()) {
            if(storedToken) await knex('refresh_tokens').where({id: storedToken.id}).del(); // remove expired/invalid token
            return res.status(403).json({ message: 'Invalid or expired refresh token' });
        }

        const user = await knex('users').where({ id: decoded.id }).first();
        if (!user) {
            return res.status(403).json({ message: 'User not found for refresh token' });
        }

        const newAccessToken = generateToken(user);
        res.json({ accessToken: newAccessToken });

    } catch (error) {
        console.error("Refresh token error:", error);
        return res.status(403).json({ message: 'Invalid refresh token' });
    }
});


module.exports = router;
