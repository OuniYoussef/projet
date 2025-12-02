#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   TAG=$(date +%Y%m%d%H%M) API_BASE_URL="http://app.local" DOCKERHUB_USERNAME="youruser" ./deploy/scripts/build_and_push.sh

DOCKERHUB_USERNAME="${DOCKERHUB_USERNAME:-youssefouni}"
DOCKERHUB_REPO_PREFIX="${DOCKERHUB_REPO_PREFIX:-docker.io/${DOCKERHUB_USERNAME}}"
TAG="${TAG:-latest}"
API_BASE_URL="${API_BASE_URL:-http://app.local}"

if [[ -z "${DOCKERHUB_USERNAME}" ]]; then
  echo "Set DOCKERHUB_USERNAME before running (e.g., export DOCKERHUB_USERNAME=myuser)." >&2
  exit 1
fi

BACKEND_IMAGE="${DOCKERHUB_REPO_PREFIX}/tuni-backend"
FRONTEND_IMAGE="${DOCKERHUB_REPO_PREFIX}/tuni-frontend"

echo "Ensure you are logged in to Docker Hub: docker login -u ${DOCKERHUB_USERNAME}"

echo "Building backend image ${BACKEND_IMAGE}:${TAG}..."
docker build -t "${BACKEND_IMAGE}:${TAG}" Back-End

echo "Building frontend image ${FRONTEND_IMAGE}:${TAG} with API base ${API_BASE_URL}..."
docker build --build-arg VITE_API_BASE_URL="${API_BASE_URL}" -t "${FRONTEND_IMAGE}:${TAG}" Front-End/my-react-app

echo "Pushing images..."
docker push "${BACKEND_IMAGE}:${TAG}"
docker push "${FRONTEND_IMAGE}:${TAG}"

cat <<'EOF'
Postgres uses the official postgres:16 image; no custom build required.
Update deploy/k8s/backend.yaml and deploy/k8s/frontend.yaml to point to the pushed tags before applying manifests.
EOF
