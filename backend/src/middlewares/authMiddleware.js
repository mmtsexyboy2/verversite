const passport = require('passport');
const jwt =require('jsonwebtoken');
const config = require('../config');

// This middleware checks if the user is authenticated via session (e.g., after OAuth redirect but before JWT is issued)
// Or if a valid JWT is provided in the Authorization header.
exports.isAuthenticated = (req, res, next) => {
  // First, try to authenticate via JWT
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (user) {
      req.user = user; // Attach user to request object
      return next();
    }
    // If JWT fails, check for session-based authentication (e.g. right after OAuth callback)
    if (req.isAuthenticated && req.isAuthenticated()) {
        // This means passport has deserialized the user from session
        return next();
    }
    // If neither, then unauthorized
    return res.status(401).json({ message: 'Unauthorized: No active session or valid JWT.' });
  })(req, res, next);
};

// Middleware to specifically check for JWT in Authorization header
// This should be used for API endpoints that strictly require a JWT.
exports.requireJwt = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: JWT token is required in Bearer format.' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: Token not found after Bearer prefix.' });
    }

    jwt.verify(token, config.jwt.secret, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Unauthorized: Token expired.' });
            }
            return res.status(401).json({ message: 'Unauthorized: Invalid token.' });
        }
        req.user = decoded; // Add decoded payload to request object
        // Note: decoded typically contains what you put in it, e.g., { id: user.id, email: user.email }
        // You might need to fetch the full user object from DB if more details are needed beyond the JWT payload
        next();
    });
};

// Configure JWT strategy for Passport (if not already elsewhere, good to centralize)
// This strategy is for verifying JWTs sent by clients
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const User = require('../models/userModel'); // Assuming userModel can find by ID

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.jwt.secret,
};

passport.use(new JwtStrategy(jwtOptions, async (payload, done) => {
  try {
    // The payload should contain user ID (or whatever identifier you used when signing the JWT)
    const user = await User.findById(payload.id); // 'id' is from when we signed the JWT
    if (user) {
      return done(null, user); // User found, authentication successful
    } else {
      return done(null, false); // User not found
    }
  } catch (error) {
    return done(error, false); // Error during authentication
  }
}));
