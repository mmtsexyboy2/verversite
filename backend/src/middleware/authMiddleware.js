const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../../.env' }); // Adjust path to .env if necessary, assuming .env is in backend root

const protect = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user to request object (excluding password or sensitive fields if they were in token)
      // We expect the user ID to be in the token payload as 'id'
      req.user = { id: decoded.id, email: decoded.email };

      next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };
