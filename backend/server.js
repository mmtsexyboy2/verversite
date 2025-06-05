require('dotenv').config(); // At the very top
const express = require('express');
const path = require('path'); // if not already there
const session = require('express-session');
const passport = require('./src/config/passport'); // Path to your passport config
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const topicRoutes = require('./src/routes/topicRoutes');
const commentRoutes = require('./src/routes/commentRoutes'); // For topic-specific comments
const likeRoutes = require('./src/routes/likeRoutes');
const feedRoutes = require('./src/routes/feedRoutes');
const uploadRoutes = require('./src/routes/uploadRoutes');
const cors = require('cors');
const cookieParser = require('cookie-parser');


const app = express();
const PORT = process.env.PORT || 3000;

// Make the 'uploads' directory publicly accessible
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware
app.use(cors({
    origin: process.env.APP_BASE_URL, // Allow frontend to access
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration (can be basic if JWT is primary, but passport Google strategy might use it briefly)
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, // Set to false for Google OAuth if not saving session for all visitors
     cookie: { secure: process.env.NODE_ENV === 'production' } // use secure cookies in production
}));

// Passport middleware
app.use(passport.initialize());
// app.use(passport.session()); // Only if you need persistent login sessions via cookies managed by passport

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/topics/:topicId/comments', commentRoutes); // Nested comment routes under topics
app.use('/api/likes', likeRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/uploads', uploadRoutes);

app.get('/', (req, res) => {
    res.send('VerVerSite Backend is running!');
});

// Basic error handler (optional, can be more sophisticated)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
