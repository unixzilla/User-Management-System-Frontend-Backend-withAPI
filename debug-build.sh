#!/bin/bash
# Debug frontend build issues - builds only frontend and shows logs

set -e

echo "===== Building frontend only (no daemon) ====="
echo "This will show real-time build output..."
echo ""

# Build just the frontend service
docker-compose build frontend

echo ""
echo "===== Build completed ====="
echo ""
echo "To see frontend logs after running deploy:"
echo "  docker-compose logs -f frontend --tail 100"