# PostgreSQL Database Schema (Refined for Google OAuth)

This document outlines the database schema, focusing on user authentication via Google OAuth.
Migrations will be managed by Knex.js in the backend application.

## Table Definitions

---

### Table: `users`

Stores information about registered users, primarily authenticated via Google.

```sql
-- This is a conceptual representation. Actual schema managed by Knex migrations.
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE NULL, -- Unique ID from Google, main identifier for OAuth users
    email VARCHAR(255) UNIQUE NOT NULL, -- Email from Google, must be verified
    email_verified BOOLEAN DEFAULT FALSE,
    username VARCHAR(150) UNIQUE NOT NULL, -- Derived or chosen, must be unique
    full_name VARCHAR(255) NULL,          -- User's full name from Google profile
    avatar_url TEXT NULL,                 -- URL of the user's avatar from Google
    password_hash VARCHAR(255) NULL,      -- Nullable, as primary auth is Google. For potential future password login.

    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_staff BOOLEAN DEFAULT FALSE NOT NULL,
    is_superuser BOOLEAN DEFAULT FALSE NOT NULL,

    date_joined TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

**Notes:**
*   `google_id`: Will store the unique identifier provided by Google for the user. This is crucial for linking accounts.
*   `email`: Should be captured from Google and ideally should be verified by Google.
*   `email_verified`: Flag to indicate if the email was verified by Google.
*   `username`: A unique identifier within the system. Could be auto-generated from email or Google name, with a mechanism to ensure uniqueness.
*   `full_name`, `avatar_url`: Store additional profile information from Google.
*   `password_hash`: Kept nullable. If the application *only* supports Google OAuth, this might be removed, but keeping it offers flexibility for future traditional auth.

---

### Table: `refresh_tokens`

Stores refresh tokens for JWT-based authentication, allowing users to obtain new access tokens without re-authenticating.

```sql
-- This is a conceptual representation. Actual schema managed by Knex migrations.
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL, -- The refresh token string
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT fk_refresh_token_user
        FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE -- If the user is deleted, their refresh tokens are also deleted.
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
```

**Notes:**
*   This table is necessary if implementing a JWT strategy with access tokens that expire and can be renewed using a longer-lived refresh token.
*   `ON DELETE CASCADE` ensures that if a user account is deleted, all associated refresh tokens are also removed.

## Relationships Summary

*   A `user` can have multiple `refresh_tokens` (e.g., if they log in from multiple devices, though typically one active refresh token per device/session is managed).

This schema will be implemented and version-controlled using Knex.js migrations in the `backend/` application.
