#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Starting VerVerSite services (backend, frontend, db)..."
echo "Building images if they don't exist or if Dockerfiles have changed..."

# Bring up services in detached mode, building if necessary
docker-compose up --build -d

echo ""
echo "Services are starting up in the background."
echo "You can view logs using: docker-compose logs -f"
echo ""
echo "Once services are up:"
echo " - Frontend will be accessible at http://localhost:3000"
echo " - Backend API (if needed directly) at http://localhost:3001"
echo ""
echo "To stop all services, run: docker-compose down"
echo "To stop and remove volumes (e.g., database data), run: docker-compose down -v"
