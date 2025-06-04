const jwt = require('jsonwebtoken');
const knex = require('../db/knex'); // Adjust if your knex setup is different

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m';
const JWT_REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d';

/**
 * Generates a JWT Access Token.
 * @param {object} user - User object for whom the token is generated.
 * @returns {string} - The JWT Access Token.
 */
function generateAccessToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    // Add any other claims you find necessary for the access token
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_ACCESS_TOKEN_EXPIRES_IN });
}

/**
 * Generates a JWT Refresh Token and stores it in the database.
 * @param {object} user - User object for whom the token is generated.
 * @returns {Promise<string>} - The JWT Refresh Token.
 */
async function generateAndStoreRefreshToken(user) {
  const payload = {
    id: user.id,
    // Refresh tokens typically have minimal information, mainly user ID
    // and a type claim if you use different types of refresh tokens.
  };

  const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_TOKEN_EXPIRES_IN });

  // Calculate expiry date for the database
  const expiresInMs = convertToMilliseconds(JWT_REFRESH_TOKEN_EXPIRES_IN);
  const expires_at = new Date(Date.now() + expiresInMs);

  // Store the refresh token in the database
  // Consider invalidating old refresh tokens for the user here if that's your strategy
  await knex('refresh_tokens').insert({
    user_id: user.id,
    token: refreshToken, // Consider hashing this if desired: await bcrypt.hash(refreshToken, 10)
    expires_at: expires_at,
  });

  return refreshToken;
}

/**
 * Verifies a refresh token and checks if it's valid and exists in the database.
 * @param {string} token - The refresh token to verify.
 * @returns {Promise<object|null>} - The user object from the token if valid, otherwise null.
 */
async function verifyAndValidateRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const storedToken = await knex('refresh_tokens')
      .where({ token: token }) // If hashing tokens, this lookup changes
      .andWhere('user_id', decoded.id)
      .andWhere('expires_at', '>', new Date())
      .first();

    if (!storedToken) {
      return null; // Token not found or expired
    }

    // Optionally, fetch the full user details if needed for generating a new access token
    const user = await knex('users').where({ id: decoded.id }).first();
    return user;

  } catch (error) {
    // Token verification failed (e.g., signature mismatch, expired JWT)
    return null;
  }
}

/**
 * Invalidates a refresh token by deleting it from the database.
 * @param {string} token - The refresh token to invalidate.
 * @param {number} userId - The ID of the user to whom the token belongs.
 * @returns {Promise<number>} - The number of rows deleted.
 */
async function invalidateRefreshToken(token, userId) {
  // Ensure token belongs to the user to prevent misuse if token is known
  return knex('refresh_tokens')
    .where({ token: token, user_id: userId })
    .del();
}

/**
 * Helper to convert human-readable time (e.g., '7d', '15m') to milliseconds.
 * @param {string} timeStr - Time string like '7d', '15m', '1h'.
 * @returns {number} - Time in milliseconds.
 */
function convertToMilliseconds(timeStr) {
  const unit = timeStr.charAt(timeStr.length - 1);
  const value = parseInt(timeStr.slice(0, -1), 10);
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: throw new Error('Invalid time string format for JWT expiry.');
  }
}

module.exports = {
  generateAccessToken,
  generateAndStoreRefreshToken,
  verifyAndValidateRefreshToken,
  invalidateRefreshToken,
  JWT_SECRET // Exporting for potential use in middleware directly
};
