#!/bin/bash
# ============================================
# EC2 Deployment Script
# Run this to deploy or update the app
# ============================================
# USAGE:
#   cd ~/ai-interview-app
#   chmod +x deploy.sh
#   ./deploy.sh
#
# This script pulls latest code, rebuilds containers,
# and deploys with zero understanding needed.

set -e  # Exit on any error

echo "=========================================="
echo "  AI Interview App - Deploy"
echo "=========================================="

APP_DIR=~/ai-interview-app

cd $APP_DIR

# 1. PULL LATEST CODE FROM GITHUB
echo "[1/4] Pulling latest code..."
git pull origin main

# 2. BUILD FRONTEND (for Nginx to serve)
# We need to build the React app so Nginx has static files
# VITE_API_URL is empty because Nginx serves everything on the same origin
echo "[2/4] Building frontend..."
cd frontend
npm install
VITE_API_URL="" npm run build
cd ..

# 3. REBUILD AND RESTART CONTAINERS
# --build    : Rebuild Docker images (picks up code changes)
# -d         : Detached mode (runs in background)
# --force-recreate : Recreate containers even if config hasn't changed
echo "[3/4] Rebuilding and restarting containers..."
docker compose down
docker compose up --build -d

# 4. CLEAN UP OLD IMAGES
# Over time, old Docker images pile up and waste disk space
# This removes dangling (untagged) images
echo "[4/4] Cleaning up old images..."
docker image prune -f

echo ""
echo "=========================================="
echo "  ✅ Deployment complete!"
echo "=========================================="
echo ""
echo "Verify:"
echo "  docker compose ps"
echo "  curl http://localhost/api/health"
echo ""
echo "View logs:"
echo "  docker compose logs -f"
