const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const knex = require('knex')(require('../../knexfile').development);

const router = express.Router();

// @desc    Get user profile (current logged in user)
// @route   GET /api/users/me
// @access  Private
router.get('/me', protect, async (req, res) => {
    // req.user is attached by the 'protect' middleware
    const user = await knex('users')
        .where({ id: req.user.id })
        .select('id', 'google_id', 'email', 'username', 'full_name', 'avatar_url', 'date_joined', 'last_login', 'is_staff', 'is_superuser') // Added admin flags
        .first();
    if (user) {
        res.json(user);
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

// @desc    Update user profile (current logged in user)
// @route   PUT /api/users/me
// @access  Private
router.put('/me', protect, async (req, res) => {
    const { full_name } = req.body;
    const userId = req.user.id;

    // Basic validation
    if (typeof full_name !== 'string') {
        return res.status(400).json({ message: 'Full name must be a string.' });
    }
    if (full_name.trim().length === 0) {
        return res.status(400).json({ message: 'Full name cannot be empty.' });
    }
    if (full_name.length > 100) { // Max length check
        return res.status(400).json({ message: 'Full name cannot exceed 100 characters.' });
    }

    try {
        const updatedUserRows = await knex('users')
            .where({ id: userId })
            .update({ full_name: full_name.trim() })
            .returning(['id', 'email', 'username', 'full_name', 'avatar_url', 'date_joined', 'last_login', 'is_staff', 'is_superuser']);

        if (updatedUserRows && updatedUserRows.length > 0) {
            res.json(updatedUserRows[0]);
        } else {
            // This case should ideally not happen if protect middleware works and user exists
            res.status(404).json({ message: 'User not found or update failed.' });
        }
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ message: 'Error updating user profile' });
    }
});

// @desc    Logout user (conceptual - JWT is stateless, client needs to discard token)
// @route   POST /api/users/logout
// @access  Private
router.post('/logout', protect, async (req, res) => {
    try {
        // For JWT, logout is primarily client-side (deleting the token).
        // Server-side, we can invalidate the refresh token if one is being used.
        const userId = req.user.id;
        await knex('refresh_tokens').where({ user_id: userId }).del();
        res.status(200).json({ message: 'Logout successful. Please discard your access token.' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Error during logout' });
    }
});

// @desc    Get public user profile by username
// @route   GET /api/users/profile/:username
// @access  Public
router.get('/profile/:username', async (req, res) => {
    const { username } = req.params;
    try {
        const user = await knex('users')
            .where({ username })
            .select('id', 'username', 'full_name', 'avatar_url', 'date_joined')
            .first();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get user's topics
        const topics = await knex('topics')
            .where({ user_id: user.id })
            .select('id', 'title', 'created_at', 'category_id',
                knex.raw('(SELECT name FROM categories WHERE categories.id = topics.category_id) as category_name'),
                knex.raw('(SELECT COUNT(*)::integer FROM comments WHERE comments.topic_id = topics.id) as comment_count'),
                knex.raw('(SELECT COUNT(*)::integer FROM likes WHERE likes.topic_id = topics.id) as like_count')
            )
            .orderBy('created_at', 'desc')
            .limit(10); // Paginate later if needed

        // Get follower and following counts
        const followerCountResult = await knex('followers').where({ user_id: user.id }).count('id as count').first();
        const followingCountResult = await knex('followers').where({ follower_id: user.id }).count('id as count').first();

        user.topics = topics;
        user.follower_count = parseInt(followerCountResult.count);
        user.following_count = parseInt(followingCountResult.count);

        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Error fetching user profile' });
    }
});

// @desc    Follow/Unfollow a user (toggle)
// @route   POST /api/users/:userIdToFollow/follow
// @access  Private
router.post('/:userIdToFollow/follow', protect, async (req, res) => {
    const userIdToFollow = parseInt(req.params.userIdToFollow);
    const followerId = req.user.id; // Current logged-in user

    if (userIdToFollow === followerId) {
        return res.status(400).json({ message: "You cannot follow/unfollow yourself." });
    }

    try {
        // Check if user to follow exists
        const userToFollowExists = await knex('users').where({ id: userIdToFollow }).first();
        if (!userToFollowExists) {
            return res.status(404).json({ message: "User to follow not found." });
        }

        // Check if already following
        const existingFollow = await knex('followers')
            .where({ user_id: userIdToFollow, follower_id: followerId })
            .first();

        if (existingFollow) {
            // Already following, so unfollow (DELETE logic)
            await knex('followers')
                .where({ user_id: userIdToFollow, follower_id: followerId })
                .del();
            res.json({ message: 'Successfully unfollowed user.', is_following: false });
        } else {
            // Not following, so follow (POST logic)
            await knex('followers').insert({
                user_id: userIdToFollow,
                follower_id: followerId,
            });
            res.status(201).json({ message: 'Successfully followed user.', is_following: true });
        }
    } catch (error) {
        console.error('Error in follow/unfollow user:', error);
        // Unique constraint violation might happen if two requests come in at nearly the same time for new follow.
        if (error.routine === '_bt_check_unique' || (error.message && error.message.includes('unique constraint'))) {
            // Attempt to re-query to see current state, as it might have just been created
            const currentFollowState = await knex('followers').where({ user_id: userIdToFollow, follower_id: followerId }).first();
            if(currentFollowState) return res.status(409).json({ message: 'You are already following this user.', is_following: true });
            // If somehow it's not there after a unique constraint error on insert, it's an odd state.
        }
        res.status(500).json({ message: 'Error processing follow/unfollow request' });
    }
});

// @desc    Get status if current user is following target user
// @route   GET /api/users/:targetUserId/follow_status
// @access  Private
router.get('/:targetUserId/follow_status', protect, async (req, res) => {
    const targetUserId = parseInt(req.params.targetUserId);
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
         return res.json({ is_following: false, is_self: true }); // Not following self
    }
    try {
        const isFollowing = await knex('followers')
            .where({ user_id: targetUserId, follower_id: currentUserId })
            .first();
        res.json({ is_following: !!isFollowing, is_self: false });
    } catch (error) {
        console.error("Error fetching follow status:", error);
        res.status(500).json({ message: "Error fetching follow status" });
    }
});

// @desc    Get list of users a user is following
// @route   GET /api/users/:userId/following
// @access  Public
router.get('/:userId/following', async (req, res) => {
    const userId = parseInt(req.params.userId);
    try {
        const userExists = await knex('users').where({id: userId}).first();
        if (!userExists) return res.status(404).json({message: "User not found"});

        const following = await knex('followers')
            .join('users', 'followers.user_id', 'users.id') // User being followed
            .where('followers.follower_id', userId) // The one doing the following
            .select('users.id', 'users.username', 'users.avatar_url', 'users.full_name')
            .limit(50); // Add pagination later if needed
        res.json(following);
    } catch (error) {
        console.error('Error fetching following list:', error);
        res.status(500).json({ message: 'Error fetching following list' });
    }
});

// @desc    Get list of users following a user (followers)
// @route   GET /api/users/:userId/followers
// @access  Public
router.get('/:userId/followers', async (req, res) => {
    const userId = parseInt(req.params.userId);
    try {
        const userExists = await knex('users').where({id: userId}).first();
        if (!userExists) return res.status(404).json({message: "User not found"});

        const followers = await knex('followers')
            .join('users', 'followers.follower_id', 'users.id') // User doing the following
            .where('followers.user_id', userId) // The one being followed
            .select('users.id', 'users.username', 'users.avatar_url', 'users.full_name')
            .limit(50); // Add pagination later if needed
        res.json(followers);
    } catch (error) {
        console.error('Error fetching followers list:', error);
        res.status(500).json({ message: 'Error fetching followers list' });
    }
});

module.exports = router; // Ensure this is at the end
