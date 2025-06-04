# Architecture Document

## 1. Overview
This document outlines the high-level architecture for the project.

## 2. Technology Stack
*   **Backend Framework:** Node.js with Express.js
*   **Frontend Framework:** Next.js (React)
*   **Database:** PostgreSQL
*   **API Style:** REST APIs

## 3. Repository Structure
*   **Monorepo:**
    *   `backend/`: Node.js/Express.js application.
    *   `frontend/`: Next.js application.
    *   `docs/`: Documentation.
    *   Root: Docker files, `docker-compose.yml`.

## 4. Service Communication
*   **Backend-Frontend:** REST APIs.
*   **Authentication:** Google OAuth 2.0 with JWTs.
