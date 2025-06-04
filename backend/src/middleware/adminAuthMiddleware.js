require('dotenv').config(); // To access process.env

const isAdmin = (req, res, next) => {
  if (!req.user || !req.user.email) {
    // This should ideally not happen if 'protect' middleware runs before it
    return res.status(401).json({ message: 'Not authenticated or user email missing.' });
  }

  const adminEmailsEnv = process.env.ADMIN_EMAILS || '';
  const adminEmailList = adminEmailsEnv.split(',').map(email => email.trim().toLowerCase());

  if (adminEmailList.includes(req.user.email.toLowerCase())) {
    next(); // User is an admin
  } else {
    res.status(403).json({ message: 'Forbidden: User is not an administrator.' });
  }
};

module.exports = { isAdmin };
