-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id VARCHAR(255) UNIQUE NOT NULL, -- Google's unique user ID
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- User Profiles Table (can be extended later)
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    -- Add other profile-specific fields here in the future
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Authentication Tokens Table (for session management or other token types if needed)
-- For JWT, we might not store them directly in DB if they are short-lived and stateless.
-- However, including a table for refresh tokens or API keys might be useful.
CREATE TABLE auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_type VARCHAR(50) NOT NULL, -- e.g., 'refresh_token', 'api_key'
    token_hash VARCHAR(255) NOT NULL, -- Store a hashed version of the token
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, token_type) -- A user can have one of each token type
);

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS \$\$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
\$\$ LANGUAGE plpgsql;

-- Triggers to update 'updated_at' on users table
CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Triggers to update 'updated_at' on user_profiles table
CREATE TRIGGER set_timestamp_user_profiles
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_auth_tokens_user_id ON auth_tokens(user_id);

COMMENT ON COLUMN users.google_id IS 'Unique identifier from Google';
COMMENT ON COLUMN users.email IS 'User''s email, must be unique';
COMMENT ON TABLE user_profiles IS 'Stores additional profile information for users';
COMMENT ON TABLE auth_tokens IS 'Stores refresh tokens or other long-lived tokens';
COMMENT ON COLUMN auth_tokens.token_hash IS 'Hashed value of the token for security';
