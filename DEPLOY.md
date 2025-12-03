# Deployment Guide (AWS Academy, Docker Hub, EKS)

This walks you through building/pushing images on an EC2 box (fast bandwidth) and deploying to EKS from your Windows laptop with `kubectl`. No AWS load balancer is required; ingress runs as NodePort + port-forward.

## What you need
- EC2 instance with Docker installed and internet access.
- Docker Hub account.
- EKS cluster reachable from your Windows laptop.
- On Windows: `kubectl`, `helm`, `envsubst`, working kubeconfig for the EKS cluster.

## Build & Push Images on EC2
1) SSH to EC2 and get the code there (e.g., `git clone <repo> projet && cd projet`).
2) Verify files exist:
   - `ls deploy/scripts` should show `build_and_push.sh`.
   - `ls Back-End/requirements.txt` should exist.
3) Make scripts executable (one-time): `sudo chmod +x deploy/scripts/build_and_push.sh`.
4) Ensure Docker works without sudo; if not: `sudo usermod -aG docker $USER && exit` then re-SSH and check `docker ps`.
5) Login to Docker Hub: `docker login -u <DOCKERHUB_USERNAME>`.
6) Build & push (single line, replace `<user>`):
   ```
   TAG=latest API_BASE_URL=http://app.local DOCKERHUB_USERNAME=youssefouni ./deploy/scripts/build_and_push.sh
   ```
   If sudo is required, use `sudo -E` in front to preserve env vars.
7) Note pushed tags for later:
   - Backend: `docker.io/<user>/tuni-backend:<TAG>`
   - Frontend: `docker.io/<user>/tuni-frontend:<TAG>`

## Prep on Windows (kubectl side)
1) Confirm kubeconfig points to your EKS cluster: `kubectl get nodes`.
2) Create secrets file: copy `deploy/k8s/secrets.example.yaml` to `deploy/k8s/secrets.yaml` and fill `DJANGO_SECRET_KEY`, DB creds, optional email creds.
3) EKS Auto Mode note: skip node labels/taints that use restricted prefixes (e.g., `node-role.kubernetes.io/*`). The Postgres manifest no longer sets a nodeSelector so it can land on any schedulable node. If you later add isolation on self-managed nodes, use a custom key like `db=true` (not a restricted domain) and add a matching nodeSelector/toleration.
4) Install ingress-nginx in NodePort mode (no AWS LB):
   ```
   ./deploy/scripts/install_ingress_nginx.sh
   ```
   Ensure metrics-server is installed for HPAs.
5) Backend pods are restarted automatically during deploy to pick up ConfigMap/Secret changes.

## Deploy to EKS
1) From repo root on Windows, set the images to the tags pushed from EC2:
   ```
   BACKEND_IMAGE=docker.io/youssefouni/tuni-backend:202512021909 FRONTEND_IMAGE=docker.io/youssefouni/tuni-frontend:202512021909 ./deploy/scripts/deploy.sh
   ```
   (PowerShell uses backticks for line continuation; or put everything on one line.)
2) The script applies namespace, secrets/config, Postgres StatefulSet (PVC), backend/frontend Deployments + Services + HPAs, and ingress.
3) Wait for rollouts (script blocks on rollout status).

## Access without a Load Balancer
1) Port-forward ingress:
   ```
   kubectl -n ingress-nginx port-forward svc/ingress-nginx-controller 8080:80
   ```
2) Add to Windows hosts file `C:\Windows\System32\drivers\etc\hosts`:
   ```
   127.0.0.1 app.local
   ```
3) Open:
   - Frontend: `http://app.local:8080/`
   - Backend/admin/API: `http://app.local:8080/admin` and `http://app.local:8080/api/...`

## Common issues
- “Permission denied” running script: run `chmod +x deploy/scripts/build_and_push.sh`.
- Docker needs sudo: use `sudo -E` before the build command, or add your user to the docker group and re-login.
- File not found during build: ensure you are in the repo root and `Back-End/requirements.txt` exists.
- Scheduling errors mentioning restricted labels: avoid `node-role.kubernetes.io/*` or other restricted domains when labeling nodes; leave the default manifests as-is on EKS Auto Mode.
- Postgres data is ephemeral (no PersistentVolume). The deploy script deletes and recreates the StatefulSet/PVC each run, so data resets on every deploy.
- If the DB pod can’t schedule on AWS Academy (Insufficient CPU/Memory), lower requests are already set to 500m/512Mi with limits at 2 vCPU/2Gi. Ensure the cluster has at least one general-purpose node without restricted taints and enough free IPs.
- Backend liveness/readiness returning 400: `ALLOWED_HOSTS` in `deploy/k8s/backend-configmap.yaml` is set to `*` to allow cluster IP probes. If you tighten it, include the pod IP range or service DNS names.
- If backend keeps restarting after a config change, rerun the deploy script (it now forces a backend rollout) or manually: `kubectl -n tuni-app rollout restart deployment/backend && kubectl -n tuni-app rollout status deployment/backend`.
- Admin UI missing CSS/JS: ingress now routes `/static` and `/media` to the backend service. Reapply ingress or rerun the deploy script if you still see unstyled admin.



- kubectl -n tuni-app exec -it deploy/backend -- python manage.py createsuperuser
