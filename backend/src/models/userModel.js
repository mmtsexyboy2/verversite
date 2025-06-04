const db = require('./db');

const User = {
  async findByGoogleId(googleId) {
    const { rows } = await db.query('SELECT * FROM users WHERE google_id = \$1', [googleId]);
    return rows[0];
  },

  async findById(id) {
    const { rows } = await db.query('SELECT * FROM users WHERE id = \$1', [id]);
    return rows[0];
  },

  async findByEmail(email) {
    const { rows } = await db.query('SELECT * FROM users WHERE email = \$1', [email]);
    return rows[0];
  },

  async createFromGoogleProfile(profile) {
    const googleId = profile.id;
    const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
    const fullName = profile.displayName;
    const avatarUrl = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;

    if (!email) {
      throw new Error('Email not provided by Google profile.');
    }

    // Try to find user by Google ID first
    let user = await this.findByGoogleId(googleId);
    if (user) {
      // Optionally update user details if they changed
      if (user.full_name !== fullName || user.avatar_url !== avatarUrl) {
        const { rows: updatedRows } = await db.query(
          'UPDATE users SET full_name = \$1, avatar_url = \$2, updated_at = CURRENT_TIMESTAMP WHERE id = \$3 RETURNING *',
          [fullName, avatarUrl, user.id]
        );
        return updatedRows[0];
      }
      return user;
    }

    // If not found by Google ID, check if an account with this email already exists
    user = await this.findByEmail(email);
    if (user) {
      // Account with this email exists. Link Google ID to this account.
      // You might want to add more checks or logic here if the account is already linked to another Google ID.
      const { rows: updatedRows } = await db.query(
        'UPDATE users SET google_id = \$1, full_name = COALESCE(full_name, \$2), avatar_url = COALESCE(avatar_url, \$3), updated_at = CURRENT_TIMESTAMP WHERE id = \$4 RETURNING *',
        [googleId, fullName, avatarUrl, user.id]
      );
      console.log(\`Linked Google ID \${googleId} to existing user with email \${email}\`);
      return updatedRows[0];
    }

    // If no existing user, create a new one
    const { rows: newRows } = await db.query(
      'INSERT INTO users (google_id, email, full_name, avatar_url) VALUES (\$1, \$2, \$3, \$4) RETURNING *',
      [googleId, email, fullName, avatarUrl]
    );
    const newUser = newRows[0];
    console.log(\`Created new user for Google ID \${googleId} with email \${email}\`);

    // Create an initial empty profile for the new user
    try {
      await db.query('INSERT INTO user_profiles (user_id, bio) VALUES (\$1, \$2)', [newUser.id, '']);
      console.log(\`Created initial profile for user ID \${newUser.id}\`);
    } catch (profileError) {
      console.error(\`Error creating profile for user ID \${newUser.id}: \${profileError.message}\`);
      // Decide if this error should prevent user creation or just be logged
    }

    return newUser;
  },

  async updateProfile(userId, { fullName, bio }) {
    // Update users table
    if (fullName !== undefined) {
        const { rows } = await db.query(
            'UPDATE users SET full_name = \$1, updated_at = CURRENT_TIMESTAMP WHERE id = \$2 RETURNING *',
            [fullName, userId]
        );
        if (rows.length === 0) {
            return null; // Or throw error
        }
    }

    // Update user_profiles table
    // Check if profile exists, then update or insert
    const { rows: profileRows } = await db.query('SELECT * FROM user_profiles WHERE user_id = \$1', [userId]);
    if (profileRows.length > 0) {
        if (bio !== undefined) {
            await db.query(
                'UPDATE user_profiles SET bio = \$1, updated_at = CURRENT_TIMESTAMP WHERE user_id = \$2',
                [bio, userId]
            );
        }
    } else {
        // Create profile if it doesn't exist
         await db.query(
            'INSERT INTO user_profiles (user_id, bio) VALUES (\$1, \$2)',
            [userId, bio === undefined ? null : bio]
        );
    }

    // Return combined user and profile info
    const user = await this.findById(userId);
    const profile = await this.getProfile(userId);
    return { ...user, ...profile };
  },

  async getProfile(userId) {
    const { rows } = await db.query('SELECT bio, updated_at as profile_updated_at FROM user_profiles WHERE user_id = \$1', [userId]);
    return rows[0] || { bio: null }; // Return bio or null if no profile
  }
};

module.exports = User;
