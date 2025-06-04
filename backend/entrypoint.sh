#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Waiting for PostgreSQL to be ready..."
# This is a simple check. A more robust solution might use pg_isready or wait-for-it.sh
# This requires netcat (nc) to be available in the container.
# The node:18-alpine image might not have it by default.
# For now, we'll assume a simple sleep or that Postgres is quick enough for local dev.
# If using nc: while ! nc -z postgres 5432; do sleep 1; done
sleep 5 # Simple wait, adjust as needed or implement a more robust check

echo "Running database migrations..."
npm run db:migrate

echo "Starting server..."
# Use 'npm run dev' for development with nodemon, or 'npm start' for production
exec npm run dev
