#!/bin/bash
# Rebuild and redeploy the full project stack.
#
#   ./deploy.sh         Full clean rebuild — removes containers, images, volumes, data.
#                       Pulls latest base images (postgres, mongo, python, node, nginx).
#   ./deploy.sh -k      Keep existing data — reuses volumes (PostgreSQL + MongoDB data).
#   ./deploy.sh -r      Rebuild only — skip pulling base images, use cached ones.
#                       Implies -k (keeps data volumes).
#   ./deploy.sh -k -r   Combined: keep data + skip base image pulls.

set -e

KEEP_DATA=false
SKIP_PULL=false

usage() {
  echo "Usage: $0 [-k] [-r]"
  echo "  -k   Keep existing data (skip volume removal)"
  echo "  -r   Rebuild only — skip pulling base images (use local cache)"
  exit 1
}

while getopts "kr" opt; do
  case "$opt" in
    k) KEEP_DATA=true ;;
    r) SKIP_PULL=true ; KEEP_DATA=true ;;  # -r implies keep data
    *) usage ;;
  esac
done

# Detect compose command (plugin or standalone)
if docker compose version &>/dev/null; then
  COMPOSE="docker compose"
else
  COMPOSE="docker-compose"
fi

PROJECT_NAME="${COMPOSE_PROJECT_NAME:-$(basename "$PWD")}"

echo "===== Project: $PROJECT_NAME ====="
echo ""

if $SKIP_PULL; then
  echo "===== [-r] Rebuild only — skipping base image pulls ====="
  echo ""
fi

if $KEEP_DATA; then
  echo "===== [-k] Keeping existing data volumes ====="
  echo ""
fi

# ──────────────────────────────────────────────────────
# Step 1 — Stop and remove containers
# ──────────────────────────────────────────────────────
echo "===== Stopping and removing containers ====="
$COMPOSE down --remove-orphans --timeout 10
echo ""

# ──────────────────────────────────────────────────────
# Step 2 — Cleanup
# ──────────────────────────────────────────────────────
if $KEEP_DATA; then
  echo "===== Removing project images only (keeping volumes) ====="
  $COMPOSE down --rmi local --remove-orphans --timeout 10 2>/dev/null || true
else
  echo "===== Removing all project containers, images, volumes, and orphaned networks ====="

  echo "  → Removing project images…"
  $COMPOSE down --rmi all --volumes --remove-orphans --timeout 10 2>/dev/null || true

  echo "  → Pruning dangling images…"
  docker image prune -f 2>/dev/null || true

  echo "  → Pruning build cache…"
  docker builder prune -f 2>/dev/null || true

  echo "  → Removing project volumes…"
  docker volume ls -q --filter "name=${PROJECT_NAME}" 2>/dev/null | while read -r vol; do
    docker volume rm -f "$vol" 2>/dev/null || true
  done

  echo "  → Removing project networks…"
  docker network ls -q --filter "name=${PROJECT_NAME}" 2>/dev/null | while read -r net; do
    docker network rm "$net" 2>/dev/null || true
  done

  echo ""
  echo "===== Clean state confirmed ====="
fi

echo ""

# ──────────────────────────────────────────────────────
# Step 3 — Build images
# ──────────────────────────────────────────────────────
if $SKIP_PULL; then
  echo "===== Building project images (no base image pull) ====="
  $COMPOSE build --no-cache
else
  echo "===== Building images (pulling latest base images) ====="
  $COMPOSE build --no-cache --pull
fi
echo ""

# ──────────────────────────────────────────────────────
# Step 4 — Start services
# ──────────────────────────────────────────────────────
echo "===== Starting all services ====="
$COMPOSE up -d
echo ""

# ──────────────────────────────────────────────────────
# Step 5 — Wait for services to be healthy
# ──────────────────────────────────────────────────────
echo "===== Waiting for services to be ready ====="
ATTEMPTS=0
MAX_ATTEMPTS=60
while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  if curl -s -o /dev/null http://localhost:8000/health 2>/dev/null; then
    echo "  Backend is healthy!"
    break
  fi
  ATTEMPTS=$((ATTEMPTS + 1))
  sleep 2
done

if [ $ATTEMPTS -ge $MAX_ATTEMPTS ]; then
  echo "  WARNING: Backend did not become healthy within 120 seconds."
  echo "  Check logs: $COMPOSE logs api"
fi

echo ""

# ──────────────────────────────────────────────────────
# Step 6 — Status
# ──────────────────────────────────────────────────────
echo "===== Container status ====="
$COMPOSE ps
echo ""

echo "===== Backend health check ====="
curl -s http://localhost:8000/health 2>/dev/null || echo "Backend not reachable"
echo ""

echo "===== Frontend check ====="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
echo "  Frontend HTTP status: $HTTP_CODE"
echo ""

echo "===== Deployment complete ====="
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "  API docs: http://localhost:8000/docs"
echo ""
echo "To view logs:"
echo "  $COMPOSE logs -f api      # backend logs"
echo "  $COMPOSE logs -f frontend # frontend logs"
