# API Definitions (Conceptual)

This document outlines the initial conceptual API endpoints for the project.
Details like request/response bodies will be further defined using a formal
specification like OpenAPI/Swagger at a later stage.

## Base URL

All API endpoints are prefixed with `/api/`.

## Authentication

Authentication is primarily handled via Google OAuth 2.0.
Endpoints requiring authentication will expect a JWT in the `Authorization: Bearer <token>` header.

*   **`GET /api/auth/google`**
    *   Description: Initiates the Google OAuth 2.0 authentication flow. Redirects the user to Google's consent screen.
    *   Authentication: None.
    *   Response: Redirect to Google.

*   **`GET /api/auth/google/callback`**
    *   Description: Handles the callback from Google after successful authentication. Google redirects here with an authorization code. The backend exchanges this code for tokens, finds or creates a user, and issues JWTs (access and refresh tokens).
    *   Authentication: None (Google provides the code).
    *   Response: JSON containing `accessToken`, `refreshToken`, and `user` details.

*   **`POST /api/auth/refresh`**
    *   Description: Obtain a new access token using a valid refresh token.
    *   Authentication: None (requires a valid refresh token in the request body).
    *   Request Body: `{ "refreshToken": "your_refresh_token_here" }`
    *   Response: JSON containing `accessToken` (and potentially a new `refreshToken` if rotation is implemented).

*   **`POST /api/auth/logout`** (Optional)
    *   Description: Invalidate the provided refresh token.
    *   Authentication: None (requires a valid refresh token in the request body or an HttpOnly cookie).
    *   Request Body: `{ "refreshToken": "your_refresh_token_here" }` (if not using cookies)
    *   Response: Success message or 204 No Content.

---

## Users API

Base path: `/api/users/`

*   **`GET /api/users/me/`**
    *   Description: Get details of the currently authenticated user.
    *   Authentication: Required (Valid JWT access token).
    *   Response: User details (ID, username, email, google_id, avatar_url, etc.).
*   **`PUT /api/users/me/`**
    *   Description: Update details of the currently authenticated user (e.g., username if allowed, or other preferences).
    *   Authentication: Required (Valid JWT access token).
    *   Request Body: Fields to update.
    *   Response: Updated user details.

---

## Topics API

Base path: `/api/topics/`

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

Base path: `/api/topics/{topic_id}/comments/`
Alternative base path: `/api/comments/`

*   **`POST /api/topics/{topic_id}/comments/`**
    *   Description: Create a new comment on a specific topic.
    *   Authentication: Required.
    *   Request Body: Comment text/content.
    *   Response: Details of the created comment.
*   **`GET /api/topics/{topic_id}/comments/`**
    *   Description: List all comments for a specific topic. Supports pagination.
    *   Authentication: Optional (publicly accessible).
    *   Query Parameters: `page`, `page_size`.
    *   Response: Paginated list of comments for the topic.
*   **`PUT /api/comments/{comment_id}/`**
    *   Description: Update an existing comment.
    *   Authentication: Required (user must be the owner or an admin).
    *   Request Body: Fields to update (comment text/content).
    *   Response: Updated comment details.
*   **`DELETE /api/comments/{comment_id}/`**
    *   Description: Delete a comment.
    *   Authentication: Required (user must be the owner or an admin).
    *   Response: Success message or 204 No Content.

---

## Admin API

Base path: `/api/admin/`

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
