# PostgreSQL Database Schema

This document outlines the initial database schema for the project using PostgreSQL.

## Table Definitions

Below are the \`CREATE TABLE\` statements for the core entities.

---

### Table: \`users\`

Stores information about registered users.

\`\`\`sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(150) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Store hashed passwords only
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    is_staff BOOLEAN DEFAULT FALSE,      -- For Django admin access
    is_superuser BOOLEAN DEFAULT FALSE,  -- For Django superuser access
    date_joined TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
\`\`\`

**Notes:**
*   \`password_hash\` will store the result of a secure hashing algorithm (e.g., bcrypt, Argon2).
*   \`is_staff\` and \`is_superuser\` are included with Django in mind.
*   Timestamps are stored with time zone information.

---

### Table: \`topics\`

Stores topics or posts created by users.

\`\`\`sql
CREATE TABLE topics (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_author
        FOREIGN KEY(author_id)
        REFERENCES users(id)
        ON DELETE CASCADE -- If a user is deleted, their topics are also deleted.
);

CREATE INDEX idx_topics_author_id ON topics(author_id);
CREATE INDEX idx_topics_created_at ON topics(created_at DESC);
\`\`\`

**Notes:**
*   \`author_id\` links to the \`users\` table.
*   \`ON DELETE CASCADE\` means if a user is deleted, their topics are automatically deleted. This can be changed to \`ON DELETE SET NULL\` if topics should be preserved but unassigned (would require \`author_id\` to be nullable).

---

### Table: \`comments\`

Stores comments made by users on topics.

\`\`\`sql
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    author_id INTEGER NOT NULL,
    topic_id INTEGER NOT NULL,
    parent_comment_id INTEGER NULL, -- For threaded/nested comments
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_comment_author
        FOREIGN KEY(author_id)
        REFERENCES users(id)
        ON DELETE CASCADE, -- If a user is deleted, their comments are also deleted.

    CONSTRAINT fk_topic
        FOREIGN KEY(topic_id)
        REFERENCES topics(id)
        ON DELETE CASCADE, -- If a topic is deleted, its comments are also deleted.

    CONSTRAINT fk_parent_comment
        FOREIGN KEY(parent_comment_id)
        REFERENCES comments(id)
        ON DELETE SET NULL -- If a parent comment is deleted, replies become top-level.
);

CREATE INDEX idx_comments_author_id ON comments(author_id);
CREATE INDEX idx_comments_topic_id ON comments(topic_id);
CREATE INDEX idx_comments_parent_comment_id ON comments(parent_comment_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);
\`\`\`

**Notes:**
*   \`author_id\` links to the \`users\` table.
*   \`topic_id\` links to the \`topics\` table.
*   \`parent_comment_id\` is optional and allows for threaded comments. If a parent comment is deleted, its children could either be deleted (CASCADE) or become top-level comments (SET NULL, requires \`parent_comment_id\` to be nullable). \`SET NULL\` is chosen here.
*   \`ON DELETE CASCADE\` for \`author_id\` and \`topic_id\` ensures data integrity when users or topics are removed.

## Relationships Summary

*   A \`user\` can create many \`topics\`.
*   A \`user\` can write many \`comments\`.
*   A \`topic\` can have many \`comments\`.
*   A \`comment\` can optionally reply to another \`comment\` (self-referencing for threads).

This initial schema provides a foundation. It can be expanded with more tables (e.g., categories, tags, votes/likes, admin_actions) and columns as the project evolves.
