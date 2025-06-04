# API Definitions (Conceptual)

This document outlines the initial conceptual API endpoints for the project.
Details like request/response bodies will be further defined using a formal
specification like OpenAPI/Swagger at a later stage.

## Base URL

All API endpoints are prefixed with `/api/`.

## Authentication

*   Endpoints requiring authentication will expect a token (e.g., JWT) in the
    `Authorization` header.
*   User registration and login will be the primary way to obtain these tokens.

---

## Users API

Base path: `/users/`

*   **`POST /users/register/`**
    *   Description: Register a new user.
    *   Request Body: Username, email, password.
    *   Response: User details (excluding password), possibly an auth token.
*   **`POST /users/login/`**
    *   Description: Log in an existing user.
    *   Request Body: Username (or email), password.
    *   Response: Auth token, user details.
*   **`GET /users/me/`**
    *   Description: Get details of the currently authenticated user.
    *   Authentication: Required.
    *   Response: User details (ID, username, email, etc.).
*   **`PUT /users/me/`**
    *   Description: Update details of the currently authenticated user.
    *   Authentication: Required.
    *   Request Body: Fields to update (e.g., email, password - with confirmation).
    *   Response: Updated user details.

---

## Topics API

Base path: `/topics/`

*   **`POST /topics/`**
    *   Description: Create a new topic.
    *   Authentication: Required.
    *   Request Body: Title, content/body, category (optional).
    *   Response: Details of the created topic.
*   **`GET /topics/`**
    *   Description: List all topics. Supports pagination.
    *   Authentication: Optional (publicly accessible).
    *   Query Parameters: `page`, `page_size`, `category_filter`.
    *   Response: Paginated list of topics.
*   **`GET /topics/{topic_id}/`**
    *   Description: Get details of a specific topic.
    *   Authentication: Optional (publicly accessible).
    *   Response: Topic details, including associated comments (or a link to comments).
*   **`PUT /topics/{topic_id}/`**
    *   Description: Update an existing topic.
    *   Authentication: Required (user must be the owner or an admin).
    *   Request Body: Fields to update (title, content/body).
    *   Response: Updated topic details.
*   **`DELETE /topics/{topic_id}/`**
    *   Description: Delete a topic.
    *   Authentication: Required (user must be the owner or an admin).
    *   Response: Success message or 204 No Content.

---

## Comments API

Base path: `/topics/{topic_id}/comments/` (for topic-specific comments)
Alternative base path: `/comments/` (for direct comment manipulation if needed)

*   **`POST /topics/{topic_id}/comments/`**
    *   Description: Create a new comment on a specific topic.
    *   Authentication: Required.
    *   Request Body: Comment text/content.
    *   Response: Details of the created comment.
*   **`GET /topics/{topic_id}/comments/`**
    *   Description: List all comments for a specific topic. Supports pagination.
    *   Authentication: Optional (publicly accessible).
    *   Query Parameters: `page`, `page_size`.
    *   Response: Paginated list of comments for the topic.
*   **`PUT /comments/{comment_id}/`**
    *   Description: Update an existing comment.
    *   Authentication: Required (user must be the owner or an admin).
    *   Request Body: Fields to update (comment text/content).
    *   Response: Updated comment details.
*   **`DELETE /comments/{comment_id}/`**
    *   Description: Delete a comment.
    *   Authentication: Required (user must be the owner or an admin).
    *   Response: Success message or 204 No Content.

---

## Admin API

Base path: `/admin/`

These endpoints are for administrative purposes and require admin privileges.
Many of these functionalities might be covered by Django's built-in admin panel.
Custom endpoints would be built if the admin panel is insufficient.

*   **`GET /admin/users/`**
    *   Description: List all users.
    *   Authentication: Admin required.
    *   Response: List of all user details.
*   **`PUT /admin/users/{user_id}/`**
    *   Description: Update a user's status or details (e.g., ban, make admin).
    *   Authentication: Admin required.
    *   Request Body: Fields to update.
    *   Response: Updated user details.
*   **`DELETE /admin/users/{user_id}/`**
    *   Description: Delete a user.
    *   Authentication: Admin required.
    *   Response: Success/Failure message.
*   **`GET /admin/topics/`** (or use existing `/topics/` with admin filter)
    *   Description: List all topics for moderation.
    *   Authentication: Admin required.
    *   Response: List of topics.
*   **`DELETE /admin/topics/{topic_id}/`** (or use existing `/topics/{topic_id}/` with admin rights)
    *   Description: Delete any topic.
    *   Authentication: Admin required.
    *   Response: Success/Failure message.
*   **`GET /admin/comments/`** (or use existing comment list endpoints with admin filter)
    *   Description: List all comments for moderation.
    *   Authentication: Admin required.
    *   Response: List of comments.
*   **`DELETE /admin/comments/{comment_id}/`** (or use existing `/comments/{comment_id}/` with admin rights)
    *   Description: Delete any comment.
    *   Authentication: Admin required.
    *   Response: Success/Failure message.
