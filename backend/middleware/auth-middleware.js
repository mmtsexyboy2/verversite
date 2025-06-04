const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../auth/jwt-utils'); // Or directly process.env.JWT_SECRET
const knex = require('../db/knex');

/**
 * Middleware to verify JWT access token.
 * If token is valid, attaches user payload to req.user.
 * Otherwise, sends 401 or 403 response.
 */
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided or malformed header.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Token is valid, attach user information to request object
    // You might want to fetch fresh user data from DB to ensure user is still active, etc.
    // For now, we'll use the decoded token payload.
    // If you need more current data (e.g. roles, active status):
    // const user = await knex('users').where({ id: decoded.id }).first();
    // if (!user || !user.is_active) {
    //   return res.status(403).json({ message: 'Forbidden: User not found or inactive.' });
    // }
    // req.user = user; // Attach full user object from DB

    req.user = decoded; // Attach decoded payload (id, username, email)

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Unauthorized: Token expired.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Unauthorized: Invalid token.' });
    }
    // Other errors
    console.error("Token verification error:", error);
    return res.status(500).json({ message: 'Server error during token verification.' });
  }
}

/**
 * Middleware to check if the authenticated user is an admin (staff or superuser).
 * Should be used after verifyToken.
 */
async function isAdmin(req, res, next) {
  if (!req.user) {
    // This should ideally be caught by verifyToken if it's always used before isAdmin
    return res.status(401).json({ message: 'Unauthorized: No user context.' });
  }

  // Fetch the latest user flags from DB to ensure accuracy
  // req.user from verifyToken might have stale is_staff/is_superuser flags if only from JWT payload
  try {
    const userFromDb = await knex('users')
      .select('is_staff', 'is_superuser', 'is_active')
      .where({ id: req.user.id })
      .first();

    if (!userFromDb) {
      return res.status(403).json({ message: 'Forbidden: User not found.' });
    }
    if (!userFromDb.is_active) {
        return res.status(403).json({ message: 'Forbidden: User account is inactive.' });
    }

    if (userFromDb.is_staff || userFromDb.is_superuser) {
      next(); // User is an admin
    } else {
      return res.status(403).json({ message: 'Forbidden: Requires admin privileges.' });
    }
  } catch (error) {
    console.error("Error in isAdmin middleware:", error);
    return res.status(500).json({ message: 'Server error during admin check.' });
  }
}

/**
 * Middleware to optionally authenticate a user.
 * If a valid token is provided, req.user will be populated.
 * If no token or an invalid token is provided, req.user will remain undefined,
 * but the request will proceed.
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET); // JWT_SECRET should be imported or accessed via process.env
      // For consistency, and if needed by subsequent logic, fetch user from DB
      // const user = await knex('users').where({ id: decoded.id }).first();
      // if (user && user.is_active) {
      //   req.user = user;
      // }
      req.user = decoded; // Or just use the payload if DB call is too much for optional auth
    } catch (error) {
      // Token is invalid (expired, wrong signature, etc.), but we don't block the request.
      // console.log('OptionalAuth: Invalid token, proceeding as anonymous.', error.name);
    }
  }
  next();
}

module.exports = {
  verifyToken,
  isAdmin,
  optionalAuth,
};
