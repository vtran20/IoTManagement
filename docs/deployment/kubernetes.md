# Kubernetes Deployment

Phase 12 prepares repeatable Kubernetes deployment for local validation, non-production, and production-like environments.

## Runtime Contract

Required API environment variables:

- `NODE_ENV`
- `API_PORT`
- `DATABASE_URL`
- `DATABASE_SCHEMA`
- `REDIS_URL`
- `JWT_SESSION_SECRET`
- `WEB_BASE_URL`

Required web environment variables:

- `PORT`
- `HOSTNAME`

Dashboard browser API calls are compiled with `NEXT_PUBLIC_API_BASE_URL`.
The Docker build default is `/api/v1`, which is correct when users access the dashboard through the Kubernetes Ingress that also routes `/api` to the API service. For a split-host deployment, build the web image with:

```bash
docker build \
  -f apps/web-dashboard/Dockerfile \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1 \
  -t iot-management/web-dashboard:<tag> .
```

Kubernetes resources use:

- `iot-management-config` ConfigMap for non-secret settings.
- `iot-management-secrets` Secret for database, Redis, PostgreSQL bootstrap, and JWT/session values.
- API health endpoint: `/api/v1/health`.
- Web health endpoint: `/login`.

`/api/v1/health` returns dependency status for the API, PostgreSQL, and Redis. PostgreSQL must be `ok` before the API is considered ready for product workflows; Redis can show `degraded` during local smoke tests if queues are not being exercised.

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
node apps/api/dist/seed-demo.js
```

## Migrations

Run migrations locally:

```bash
pnpm build
pnpm db:migrate
```

The API uses PostgreSQL persistence at runtime. The migration command is the same entrypoint used by the Kubernetes migration Job. It:

- Creates `schema_migrations` automatically.
- Applies migration files in lexical order.
- Stores a SHA-256 checksum for each applied migration.
- Skips matching already-applied migrations.
- Fails if a previously applied migration has a different checksum.
- Uses a PostgreSQL advisory lock so concurrent migration Jobs do not apply the same file twice.

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
4. Optionally run `node apps/api/dist/seed-demo.js` for local/demo environments.
5. Deploy API, worker, and web workloads.
6. Verify health endpoints, login, dashboard pages, and ingress routing.

## Rollback

Use image tags that map to immutable build artifacts. Roll back Deployments with:

```bash
kubectl -n <namespace> rollout undo deployment/api
kubectl -n <namespace> rollout undo deployment/web
kubectl -n <namespace> rollout undo deployment/worker
```

Migration rollback should be handled by explicit forward-fix migrations.
