# Kubernetes Manifests

This directory contains Kustomize manifests for the smart utilities SaaS.

Current workloads:

- PostgreSQL and Redis for local validation.
- API Deployment and Service.
- Web dashboard Deployment and Service.
- Worker Deployment.
- Migration Job.
- Ingress routing `/api` to the API and `/` to the dashboard.
- NetworkPolicies limiting PostgreSQL and Redis ingress to application workloads.

Validate locally:

```bash
kubectl apply --dry-run=client -k deploy/kubernetes/overlays/local
```

Render non-production or production:

```bash
kubectl kustomize deploy/kubernetes/overlays/non-production
kubectl kustomize deploy/kubernetes/overlays/production
```

The file `base/secret.example.yaml` documents the required Secret shape. Do not commit real secrets.

Deployment notes:

- Run the `migrate` Job before rolling out API, worker, or web workloads.
- The API image includes compiled `main.js`, `worker.js`, `migrate.js`, and `seed-demo.js` entrypoints.
- The web image defaults `NEXT_PUBLIC_API_BASE_URL` to `/api/v1`, so use the Ingress path routing for dashboard/API smoke tests.
- `/api/v1/health` reports API, PostgreSQL, and Redis dependency status.
