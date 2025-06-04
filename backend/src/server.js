const express = require('express');
const session = require('express-session'); // Optional, useful for some OAuth flows
const passport = require('passport');
const config = require('./config');
const cookieParser = require('cookie-parser');
// We will create this db module later for database interactions
// const db = require('./models/db'); // Placeholder for database connection pool

const app = express();
const PORT = config.port;

// Middlewares
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(cookieParser());

// Session middleware - Configure as needed.
// For JWT-only auth, session might be minimal or not used after obtaining token.
// If using JWTs primarily, ensure session is not strictly required for all auth routes.
app.use(
  session({
    secret: config.jwt.secret, // Reuse JWT secret for session for simplicity, or use a different one
    resave: false,
    saveUninitialized: false, // True might be needed for Google OAuth to work seamlessly before login
    cookie: {
      secure: config.isProduction, // true in production if using HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day, for example
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session()); // If using persistent login sessions

// Placeholder for Passport configuration (Google Strategy, serialization)
// We will create this file in the next step: src/config/passportConfig.js
require('./config/passportConfig')(passport);

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

app.get('/api/v1', (req, res) => {
  res.send('Hello from Backend API v1!');
});

// Basic error handling (can be improved)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  console.log(\`Backend server is running on http://localhost:\${PORT}\`);
});
