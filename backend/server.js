require('dotenv').config(); // Load environment variables first

const express = require('express');
const passport = require('./auth/passport-setup'); // Configured Passport instance
const session = require('express-session'); // Passport Google strategy might use session briefly
const cookieParser = require('cookie-parser');
const knex = require('./db/knex'); // Knex instance

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user'); // For /api/users/me
const categoryRoutes = require('./routes/categories'); // For /api/categories
const topicRoutes = require('./routes/topics'); // For /api/topics
const commentsController = require('./routes/comments'); // For direct comment routes like DELETE
const likeRoutes = require('./routes/likes'); // For /api/likes
const { verifyToken } = require('./middleware/auth-middleware'); // General verifyToken

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(cookieParser());

// Express session middleware - required for some Passport strategies if session support is enabled.
// Even if aiming for stateless JWT, OAuth dance sometimes uses session.
// Keep it minimal if not relying on sessions post-auth.
app.use(session({
  secret: process.env.SESSION_SECRET || 'a_default_session_secret_replace_this', // Should be in .env
  resave: false,
  saveUninitialized: false, // True might be needed for Google OAuth if it sets a cookie before user is authenticated
  // cookie: { secure: process.env.NODE_ENV === 'production' } // Use secure cookies in production
}));

// Initialize Passport
app.use(passport.initialize());
// If your strategy or OAuth flow relies on sessions, even temporarily:
// app.use(passport.session()); // Only if serialize/deserializeUser is fully used for session management

// Test DB connection
knex.raw('SELECT 1').then(() => {
  console.log('Database connected successfully.');
}).catch(err => {
  console.error('Database connection failed:', err);
  // process.exit(1); // Optionally exit if DB connection is critical at start
});


// Routes
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Backend!' });
});

app.use('/api/auth', authRoutes); // Mount authentication routes (e.g., /api/auth/google)
app.use('/api/users', userRoutes);   // Mount user routes (e.g., /api/users/me)
app.use('/api/categories', categoryRoutes); // Mount category routes
app.use('/api/topics', topicRoutes); // Mount topic routes (which now includes /api/topics/:topic_id/comments)

// Direct Comment Routes (e.g., for DELETE /api/comments/:comment_id)
const commentRouter = express.Router();
commentRouter.delete('/:comment_id', verifyToken, commentsController.deleteComment); // Use general verifyToken
app.use('/api/comments', commentRouter);

// Like Routes
app.use('/api/likes', likeRoutes); // verifyToken is applied within likeRoutes

// Basic error handling middleware (example)
app.use((err, req, res, next) => {
  console.error("Global error handler:", err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong!',
    // errors: err.errors, // Optionally include more error details
  });
});

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
  console.log(`Google Client ID: ${process.env.GOOGLE_CLIENT_ID ? 'Loaded' : 'NOT LOADED'}`);
  console.log(`Google OAuth Redirect URI: ${process.env.GOOGLE_OAUTH_REDIRECT_URI}`);
  console.log(`JWT Secret: ${process.env.JWT_SECRET ? 'Loaded' : 'NOT LOADED'}`);
});
