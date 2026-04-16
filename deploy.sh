#!/bin/bash
# rebuild and redeploy frontend and backend to docker

set -e

echo "===== Stopping and removing existing containers ====="
docker-compose down --remove-orphans

echo ""
echo "===== Building and starting all services ====="
docker-compose up -d --build

echo ""
echo "===== Waiting for services to be healthy ====="
sleep 5

echo ""
echo "===== Container status ====="
docker-compose ps

echo ""
echo "===== Backend health check ====="
curl -s http://localhost:8000/health || echo "Backend not ready yet (may take a few more seconds)"

echo ""
echo "===== Frontend health check ====="
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "Frontend not ready yet"

echo ""
echo "===== Deployment complete ====="
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f api      # backend logs"
echo "  docker-compose logs -f frontend # frontend logs"
