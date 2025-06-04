# ور ور سایت (Ver Ver Site)

## Introduction

ور ور سایت (Ver Ver Site) is a forum-style application, similar to Reddit or Ninicity, allowing users to engage in discussions, share content, and follow other users. This project is built with a Node.js (Express.js) backend, a Next.js frontend, and PostgreSQL for data storage, all containerized with Docker.

## Prerequisites

*   **Node.js:** v18.x (as used in Dockerfiles)
*   **Docker:** Latest stable version
*   **Docker Compose:** Latest stable version
*   **PostgreSQL Client:** (Optional) For local database inspection (e.g., `psql`). The server is Dockerized.
*   **Git:** For cloning the repository.

## Getting Started

1.  **Clone the Repository:**
    ```bash
    git clone <repository_url>
    # Replace <repository_url> with the actual URL of this repository
    ```

2.  **Navigate to Project Directory:**
    ```bash
    cd <project_directory>
    # Replace <project_directory> with the name of the cloned folder
    ```

## Backend Setup

1.  **Navigate to Backend Directory:**
    ```bash
    cd backend
    ```

2.  **Create Environment File:**
    Copy the example environment file and customize it.
    ```bash
    cp .env.example .env
    ```
    *(Note: `.env.example` will be created in a later step of this subtask. For now, you would manually create `backend/.env`)*

3.  **Configure Backend Environment Variables (`backend/.env`):**
    Ensure the following variables are set in your `backend/.env` file:

    *   `DATABASE_URL`: The connection string for the PostgreSQL database.
        *   Example: `postgresql://user:password@postgres:5432/verversite_db`
        *   `user`: The PostgreSQL username.
        *   `password`: The PostgreSQL password.
        *   `postgres`: The hostname of the PostgreSQL service (as defined in `docker-compose.yml`).
        *   `5432`: The port for PostgreSQL.
        *   `verversite_db`: The name of the database.
    *   `GOOGLE_CLIENT_ID`: Your Google OAuth 2.0 Client ID.
        *   Provided for testing: `293698260918-ll31bqfqtjppcmkvrssr65pss9k9hqtd.apps.googleusercontent.com`
    *   `GOOGLE_CLIENT_SECRET`: Your Google OAuth 2.0 Client Secret.
        *   Provided for testing: `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`
    *   `JWT_SECRET`: A strong, random secret key used for signing JSON Web Tokens (JWTs).
        *   **Important:** Generate a secure random string (e.g., using a password manager or `openssl rand -base64 32`).
    *   `PORT`: The port on which the backend server will listen.
        *   Default: `3001`
    *   `FRONTEND_URL`: The base URL of the frontend application, used for redirects after OAuth.
        *   Default: `http://localhost:3000`

4.  **Install Dependencies:**
    *(Typically handled by Docker, but if setting up locally without Docker for some reason)*
    ```bash
    npm install
    ```

5.  **Database Migrations:**
    Database migrations are designed to run automatically when the backend service starts up, as configured in `entrypoint.sh`.
    If you need to run migrations manually (e.g., for development outside Docker or troubleshooting), you can use:
    ```bash
    npm run db:migrate
    # (Ensure the backend container is running or that you have a local Postgres instance accessible)
    # Or, to run directly inside the Docker container:
    # docker-compose exec backend npm run db:migrate
    ```

## Frontend Setup

1.  **Navigate to Frontend Directory:**
    ```bash
    cd ../frontend
    # (Assuming you are in the backend directory, otherwise navigate from project root)
    ```

2.  **Create Environment File:**
    Copy the example environment file and customize it.
    ```bash
    cp .env.local.example .env.local
    ```
    *(Note: `.env.local.example` will be created in a later step of this subtask. For now, you would manually create `frontend/.env.local`)*

3.  **Configure Frontend Environment Variables (`frontend/.env.local`):**
    Ensure the following variable is set in your `frontend/.env.local` file:

    *   `NEXT_PUBLIC_BACKEND_URL`: The base URL of the backend API. This is used by the frontend to make API calls.
        *   Example: `http://localhost:3001` (This should be the URL accessible from the user's browser).

4.  **Install Dependencies:**
    *(Typically handled by Docker, but if setting up locally without Docker)*
    ```bash
    npm install
    ```

## Running the Application (Docker)

1.  **Build Docker Images:**
    From the project root directory:
    ```bash
    docker-compose build
    ```

2.  **Start Services:**
    Start all services in detached mode:
    ```bash
    docker-compose up -d
    ```

3.  **Access Services:**
    *   **Frontend:** Open your browser and navigate to `http://localhost:3000`
    *   **Backend API:** Accessible at `http://localhost:3001` (e.g., for testing with tools like Postman or curl)

## Stopping the Application

To stop all running services:
```bash
docker-compose down
```
To stop and remove volumes (like database data, use with caution):
```bash
docker-compose down -v
```

## Development Workflow

*   **Live Reloading:** Both backend (with `nodemon`) and frontend (Next.js dev server) are configured for live reloading within their Docker containers. Changes to source code should automatically restart the respective server.
*   **Viewing Logs:** To view logs from the running services:
    ```bash
    docker-compose logs -f backend frontend postgres
    ```
    Use `-f` to follow the logs in real-time. Press `Ctrl+C` to stop following.

## Updating the Application

1.  **Pull Latest Changes:**
    ```bash
    git pull origin main
    # Or the relevant branch you are working on
    ```

2.  **Rebuild Docker Images (if needed):**
    If `Dockerfile`s, application dependencies (`package.json`), or major configuration files have changed:
    ```bash
    docker-compose build
    ```

3.  **Restart Services:**
    ```bash
    docker-compose up -d
    ```
    New database migrations (if any) will run automatically when the backend service starts.

## Security Considerations

*   **HTTPS:** In a production environment, it is crucial to configure a reverse proxy (like Nginx) to enforce HTTPS connections and handle SSL/TLS termination.
*   **Secrets Management:** Ensure `JWT_SECRET`, `GOOGLE_CLIENT_SECRET`, and database credentials are kept secure and not hardcoded or exposed. Use environment variables stored in `.env` files that are not committed to version control.
*   **Error Handling:** The backend is configured to provide generic error messages in production environments to avoid leaking sensitive stack traces or other information. Detailed errors are logged server-side for debugging.
*   **CSRF Protection:** API authentication primarily relies on JWTs transmitted via Authorization headers. This method is generally not susceptible to Cross-Site Request Forgery (CSRF) attacks in the same way traditional cookie-based sessions are. Ensure no sensitive operations rely solely on cookies without additional CSRF protection.
*   **Rate Limiting:** The backend implements rate limiting on authentication routes and content creation (topics, comments) routes to help prevent abuse and denial-of-service attacks.
*   **Security Headers:** The `helmet` middleware is used in the backend to set various security-enhancing HTTP headers (e.g., `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`). For `Strict-Transport-Security` (HSTS), ensure HTTPS is correctly and permanently set up before enabling HSTS in `helmet` configuration.
*   **Input Sanitization:** Basic input sanitization (e.g., stripping HTML tags from titles) is applied on the backend. The frontend rendering with React/Next.js inherently protects against XSS by escaping string content by default. Avoid using `dangerouslySetInnerHTML` without proper sanitization.
*   **SQL Injection Prevention:** Parameterized queries (prepared statements) are used for all database interactions with the `pg` library, which is the standard defense against SQL injection vulnerabilities.
*   **Dependency Security:** Regularly run `npm audit` in both `backend` and `frontend` directories to check for known vulnerabilities in dependencies. Address any reported issues promptly.
*   **Nginx/WAF (Recommended for Production):**
    *   Use Nginx (or a similar robust web server/reverse proxy) in front of the Node.js application.
    *   Configure Nginx for basic security: enforce HTTPS by redirecting HTTP to HTTPS, set appropriate timeouts, buffer sizes, and client size limits.
    *   Disable directory listing and unnecessary server information disclosure (e.g., `server_tokens off;`).
    *   Implement additional rate limiting at the Nginx level as a first line of defense, especially for critical or computationally expensive paths.
    *   For enhanced protection, consider using a Web Application Firewall (WAF) like ModSecurity with the OWASP Core Rule Set.

## Project Structure Overview

*   `backend/`: Contains the Node.js (Express.js) backend application.
*   `frontend/`: Contains the Next.js frontend application.
*   `docs/`: Contains API documentation (`openapi.yaml`) and database schema information.
*   `postgres_data/`: (This is a Docker volume, not a Git-tracked directory) Stores persistent PostgreSQL data. Defined in `docker-compose.yml`.
*   `TESTING_GUIDE.md`: Manual testing steps for the application.
*   `README.md`: This file.
*   `docker-compose.yml`: Defines and configures the multi-container Docker application.
*   `.gitignore`: Specifies intentionally untracked files that Git should ignore (root .gitignore). Also, `backend/.gitignore` and `frontend/.gitignore` exist.

## Admin Panel Access

*   **Admin Email:** `WQSDBEW003@GMAIL.COM`
*   Further details regarding admin panel access and functionality will be added here once the admin panel is implemented.

## Technology Stack Notes
*   **Backend:** Express.js
*   **Frontend:** Next.js
*   **Database:** PostgreSQL
*   **Containerization:** Docker
---
*This README was last updated on YYYY-MM-DD.*
*(Consider adding a section for API Documentation if you have Swagger/OpenAPI setup, or a link to it in `docs/`)*
*(Consider adding a Contribution Guidelines section if relevant)*
