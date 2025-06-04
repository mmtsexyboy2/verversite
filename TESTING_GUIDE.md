# Testing Guide

This guide outlines the steps to test the integrated application. Some steps require manual interaction and setup of Google OAuth credentials.

## Prerequisites

1.  **Docker and Docker Compose:** Ensure Docker and Docker Compose are installed and running.
2.  **Google OAuth Credentials:**
    *   Obtain `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from your Google Cloud Console.
    *   Update these values in `backend/.env`.
    *   Ensure the OAuth 2.0 consent screen is configured.
    *   Add the authorized JavaScript origin: `http://localhost:3000` (for frontend).
    *   Add the authorized redirect URI: `http://localhost:3001/auth/google/callback` (for backend).

## I. Environment Setup and Migration

1.  **Build and Run Services:**
    *   Open your terminal in the project root.
    *   Build the Docker images: `docker-compose build`
    *   Start all services in detached mode: `docker-compose up -d`

2.  **Check Service Logs:**
    *   View logs to ensure services started correctly: `docker-compose logs backend frontend postgres`
    *   Look for any error messages. The backend log should show "Waiting for PostgreSQL to be ready...", "Running database migrations...", and then "Starting server...".
    *   The `entrypoint.sh` script in the backend service attempts to run database migrations. You should see log output related to `node-pg-migrate up`.

3.  **Verify Port Accessibility:**
    *   Frontend should be accessible at `http://localhost:3000`.
    *   Backend should be accessible at `http://localhost:3001`.

4.  **Verify Database Migrations:**
    *   After the services are up, particularly the backend, the migrations should have run.
    *   You can confirm this by:
        *   Checking the backend logs for messages from `node-pg-migrate`.
        *   Connecting to the PostgreSQL container and inspecting the database schema:
            ```bash
            docker-compose exec postgres psql -U user -d mydatabase
            ```
            Once in `psql`, list tables: `\dt`
            You should see `users`, `auth_tokens`, `user_profiles`, and `pgmigrations` tables.
            Exit `psql` with `\q`.

## II. Backend API Smoke Tests

1.  **`/auth/google` Endpoint (Initiate OAuth):**
    *   Open your web browser and navigate to `http://localhost:3001/auth/google`.
    *   Alternatively, use `curl`: `curl -L http://localhost:3001/auth/google`
    *   **Expected:** You should be redirected to Google's sign-in page. This confirms the initial part of the OAuth flow is working.

2.  **Protected Route `/api/users/me` (Requires JWT):**
    *   This test requires a valid JWT. To obtain one:
        1.  Temporarily modify `backend/src/routes/authRoutes.js` in the `/google/callback` handler to `console.log` the generated `token` before the `res.json({ token })` line.
        2.  Restart the backend: `docker-compose restart backend`. Check logs for the new token after authenticating.
        3.  Perform the full Google Sign-in flow via the frontend (see Section III).
        4.  Copy the logged JWT from the backend logs.
    *   **Test Case 1: With valid JWT**
        ```bash
        export YOUR_JWT="<paste_your_JWT_here>"
        curl -H "Authorization: Bearer $YOUR_JWT" http://localhost:3001/api/users/me
        ```
        *   **Expected:** A JSON response containing the authenticated user's profile data (id, email, name, profile details if any).
    *   **Test Case 2: Without JWT**
        ```bash
        curl http://localhost:3001/api/users/me
        ```
        *   **Expected:** A 401 Unauthorized error (e.g., `{"message":"Not authorized, no token"}`).
    *   **Important:** Remember to remove any temporary `console.log` statements for tokens after testing.

## III. Frontend Application Smoke Tests (Manual Browser Interaction)

1.  **Access Frontend:**
    *   Open your web browser and navigate to `http://localhost:3000`.

2.  **Home Page:**
    *   **Expected:** The home page should load, displaying "Welcome to the Application" and navigation links for "Home" and "Login".

3.  **Login Process:**
    *   Click the "Login" link (if not already on the login page, e.g. `http://localhost:3000/login`).
    *   On the login page, click the "Sign in with Google" button.
    *   **Expected:** You should be redirected to the backend URL (`http://localhost:3001/auth/google`), which then redirects to the Google Sign-in page.

4.  **Google Authentication & Callback:**
    *   Sign in with your Google account.
    *   After successful authentication with Google, you should be redirected back to the backend's callback URL (`/auth/google/callback`).
    *   The backend will process this, generate a JWT, and redirect to the frontend's callback page (`http://localhost:3000/auth/callback?token=YOUR_JWT`).
    *   **Expected (Frontend `/auth/callback` behavior):**
        *   The page should show "Processing authentication..." briefly.
        *   The JWT from the URL query parameter should be stored in LocalStorage. (You can verify this using browser developer tools: Application > Local Storage).
        *   You should be automatically redirected to your profile page (`/profile`).

5.  **Profile Page Display:**
    *   **Expected:**
        *   The profile page (`http://localhost:3000/profile`) should load.
        *   It should display your Name and Email retrieved from the backend (`/api/users/me` endpoint).
        *   If you have profile details (bio, avatar), they should be displayed; otherwise, it might show "Not set" or similar.
        *   A "Home" link should be present.

6.  **Logout Functionality:**
    *   On the profile page, click the "Logout" button.
    *   **Expected:**
        *   The JWT should be removed from LocalStorage.
        *   You should be redirected to the login page (`/login`).
        *   Attempting to access `/profile` directly should redirect you back to `/login`.

## IV. Review and Refinement

*   Double-check configurations in `backend/.env`, `frontend/.env.local`, and `docker-compose.yml` if any issues arise.
*   Ensure the `NEXT_PUBLIC_BACKEND_URL` in `frontend/.env.local` is `http://localhost:3001` for this local Docker setup.
*   The `DATABASE_URL` in `backend/.env` should match the PostgreSQL service details in `docker-compose.yml`.
*   The `entrypoint.sh` in the backend uses a `sleep 5` to wait for Postgres. If migrations fail on the first startup due to Postgres not being ready, you might need to increase this sleep duration or implement a more robust wait mechanism (e.g., using `pg_isready` if `postgresql-client` tools were added to the backend image, or `nc` if `netcat-openbsd` was added). To add `nc`:
    ```dockerfile
    # In backend/Dockerfile, before USER node (if any) or early in setup
    # RUN apk update && apk add --no-cache netcat-openbsd
    ```
    And then in `entrypoint.sh`:
    ```sh
    # while ! nc -z postgres 5432; do
    #  echo "Waiting for postgres..."
    #  sleep 1
    # done
    # echo "PostgreSQL started"
    ```

This testing guide should help verify the core application functionality.
