require('dotenv').config();
const express = require('express');
const passport = require('passport');
const helmet = require('helmet'); // Import helmet
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const topicRoutes = require('./routes/topicRoutes');
const commentRoutes = require('./routes/commentRoutes');
const commentActionsRoutes = require('./routes/commentActionsRoutes');
const feedRoutes = require('./routes/feedRoutes');
const sitemapRoutes = require('./routes/sitemapRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes'); // Import report routes

// Passport config
require('./config/passport-setup')(passport);

const app = express();

// Middleware
app.use(helmet()); // Use helmet for security headers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Passport middleware
app.use(passport.initialize());

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/topics/:topicId/comments', commentRoutes);
app.use('/api/comments', commentActionsRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/sitemap.xml', sitemapRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes); // Use report routes

// Basic route
app.get('/', (req, res) => {
  res.send('Backend server is running');
});

// Simple error handling middleware (to be expanded later)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
