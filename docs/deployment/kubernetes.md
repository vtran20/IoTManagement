# Kubernetes Deployment

Phase 12 prepares repeatable Kubernetes deployment for local validation, non-production, and production-like environments.

## Runtime Contract

Required API environment variables:

- `NODE_ENV`
- `API_PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SESSION_SECRET`

Required web environment variables:

- `PORT`
- `HOSTNAME`

Kubernetes resources use:

- `iot-management-config` ConfigMap for non-secret settings.
- `iot-management-secrets` Secret for database, Redis, PostgreSQL bootstrap, and JWT/session values.
- API health endpoint: `/api/v1/health`.
- Web health endpoint: `/login`.

## Images

Build local images from the repository root:

```bash
pnpm docker:build:api
pnpm docker:build:web
```

The API image serves three commands:

```bash
node apps/api/dist/main.js
node apps/api/dist/worker.js
node apps/api/dist/migrate.js
```

## Migrations

Run migration asset validation locally:

```bash
pnpm build
pnpm db:migrate
```

The current MVP still uses in-memory persistence at runtime. The migration command validates the ordered SQL migration assets and environment contract now, and is the stable Kubernetes Job entrypoint where the future PostgreSQL-backed migration executor will run.

## Kustomize Overlays

Local:

```bash
kubectl apply --dry-run=client -k deploy/kubernetes/overlays/local
```

Non-production:

```bash
kubectl apply --dry-run=client -k deploy/kubernetes/overlays/non-production
```

Production:

```bash
kubectl apply --dry-run=client -k deploy/kubernetes/overlays/production
```

Before applying non-production or production, create a real `iot-management-secrets` Secret in the target namespace using the keys documented in `deploy/kubernetes/base/secret.example.yaml`.

## Rollout Order

1. Build and push API and web images.
2. Apply namespace, ConfigMap, Secret, PostgreSQL/Redis or managed-service references.
3. Run the migration Job.
4. Deploy API, worker, and web workloads.
5. Verify health endpoints and ingress routing.

## Rollback

Use image tags that map to immutable build artifacts. Roll back Deployments with:

```bash
kubectl -n <namespace> rollout undo deployment/api
kubectl -n <namespace> rollout undo deployment/web
kubectl -n <namespace> rollout undo deployment/worker
```

Migration rollback should be handled by explicit forward-fix migrations once PostgreSQL persistence is active.
