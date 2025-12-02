#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-ingress-nginx}"

echo "Installing ingress-nginx (NodePort mode, no AWS load balancer)..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx >/dev/null
helm repo update >/dev/null
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace "${NAMESPACE}" \
  --create-namespace \
  -f deploy/k8s/ingress-nginx-values.yaml

kubectl -n "${NAMESPACE}" get svc ingress-nginx-controller
echo "Use: kubectl -n ${NAMESPACE} port-forward svc/ingress-nginx-controller 8080:80"
