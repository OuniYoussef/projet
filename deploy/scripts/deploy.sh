#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-tuni-app}"
SECRETS_FILE="${SECRETS_FILE:-deploy/k8s/secrets.yaml}"

if [[ ! -f "${SECRETS_FILE}" ]]; then
  echo "Create ${SECRETS_FILE} from deploy/k8s/secrets.example.yaml before deploying." >&2
  exit 1
fi

: "${BACKEND_IMAGE:?Set BACKEND_IMAGE to your pushed backend image (e.g., docker.io/youruser/tuni-backend:tag)}"
: "${FRONTEND_IMAGE:?Set FRONTEND_IMAGE to your pushed frontend image (e.g., docker.io/youruser/tuni-frontend:tag)}"

echo "Creating namespace ${NAMESPACE}..."
kubectl apply -f deploy/k8s/namespace.yaml

echo "Applying secrets and config..."
kubectl apply -f "${SECRETS_FILE}"
kubectl apply -f deploy/k8s/backend-configmap.yaml

echo "Resetting Postgres (ephemeral DB; deletes any existing data)..."
kubectl delete statefulset/postgres -n "${NAMESPACE}" --ignore-not-found
kubectl delete pvc/postgres-data-postgres-0 -n "${NAMESPACE}" --ignore-not-found

echo "Deploying Postgres (StatefulSet)..."
kubectl apply -f deploy/k8s/postgres.yaml

echo "Deploying backend..."
BACKEND_IMAGE="${BACKEND_IMAGE}" envsubst < deploy/k8s/backend.yaml | kubectl apply -f -

echo "Deploying frontend..."
FRONTEND_IMAGE="${FRONTEND_IMAGE}" envsubst < deploy/k8s/frontend.yaml | kubectl apply -f -

echo "Forcing backend restart to pick up config/secret changes..."
kubectl rollout restart deployment/backend -n "${NAMESPACE}"

echo "Applying ingress..."
kubectl apply -f deploy/k8s/ingress.yaml

echo "Waiting for rollouts..."
kubectl rollout status deployment/backend -n "${NAMESPACE}"
kubectl rollout status deployment/frontend -n "${NAMESPACE}"
kubectl rollout status statefulset/postgres -n "${NAMESPACE}"

echo "Done. Ingress is namespace-scoped (${NAMESPACE})."
