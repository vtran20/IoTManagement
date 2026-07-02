# Local Product Test Runbook

Use this runbook to test the Smart Utilities SaaS product locally with:

- Rancher Desktop Kubernetes for PostgreSQL and Redis.
- Local NestJS API for fast logs and debugging.
- Local Next.js dashboard at `http://127.0.0.1:3000`.

This is the recommended first manual test path before running the full API and web workloads inside Kubernetes.

## 1. Open The Project

```bash
cd /Users/vutran/Projects/IoTManagement
git status --short
```

If you want the Phase 10 deployment verification branch:

```bash
git switch codex/phase-10-deployment-verification
```

## 2. Install And Build

```bash
pnpm install
pnpm build
```

Expected result: all workspace builds finish without errors.

## 3. Start PostgreSQL And Redis In Local Kubernetes

```bash
kubectl apply -k deploy/kubernetes/overlays/local
kubectl -n iot-management get pods,svc
```

Wait until these pods are `Running`:

```text
postgres-...
redis-...
```

## 4. Port-Forward PostgreSQL And Redis

Keep these terminals open.

Terminal 1:

```bash
kubectl -n iot-management port-forward svc/postgres 5432:5432
```

Terminal 2:

```bash
kubectl -n iot-management port-forward svc/redis 6379:6379
```

## 5. Run Database Migrations

In a new terminal:

```bash
DATABASE_URL=postgresql://iot_local:iot_local_password@127.0.0.1:5432/iot_management \
REDIS_URL=redis://127.0.0.1:6379 \
JWT_SESSION_SECRET=local-development-session-secret \
WEB_BASE_URL=http://127.0.0.1:3000 \
pnpm db:migrate
```

Expected result:

```text
migrations-complete
```

The migration runner is safe to rerun. Already-applied migrations with matching checksums are skipped.

## 6. Seed Demo Data

```bash
DATABASE_URL=postgresql://iot_local:iot_local_password@127.0.0.1:5432/iot_management \
REDIS_URL=redis://127.0.0.1:6379 \
JWT_SESSION_SECRET=local-development-session-secret \
WEB_BASE_URL=http://127.0.0.1:3000 \
NODE_ENV=development \
pnpm seed:demo
```

Expected result:

```text
demo-seed-complete
```

Demo seed creates deterministic test data for North Properties:

- 3 demo buildings.
- 10 floors.
- 40 units.
- 43 meters.
- Water and electric readings.
- Usage aggregates.
- Alert rules and alert events.
- Device health states.

Demo accounts all use password `password123`:

| Role | Email |
| --- | --- |
| Owner | `owner@north.example` |
| Manager | `manager@north.example` |
| Viewer | `viewer@north.example` |
| Tenant isolation owner | `owner@south.example` |

## 7. Start The API

In a new terminal:

```bash
API_PORT=3001 \
DATABASE_URL=postgresql://iot_local:iot_local_password@127.0.0.1:5432/iot_management \
REDIS_URL=redis://127.0.0.1:6379 \
JWT_SESSION_SECRET=local-development-session-secret \
WEB_BASE_URL=http://127.0.0.1:3000 \
pnpm dev:api
```

Verify health from another terminal:

```bash
curl -s http://127.0.0.1:3001/api/v1/health
```

Expected response:

```json
{"dependencies":{"api":{"status":"ok"},"postgres":{"status":"ok"},"redis":{"status":"ok"}},"service":"iot-management-api","status":"ok"}
```

If Redis is not port-forwarded, `redis.status` may be `degraded`. PostgreSQL should be `ok` before testing product workflows.

## 8. Start The Web Dashboard

In a new terminal:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3001/api/v1 \
pnpm dev:web
```

Open:

```text
http://127.0.0.1:3000/login
```

Log in with:

```text
owner@north.example
password123
```

## 9. Manual Product Checks

Visit these pages:

```text
http://127.0.0.1:3000/dashboard
http://127.0.0.1:3000/buildings
http://127.0.0.1:3000/units
http://127.0.0.1:3000/meters
http://127.0.0.1:3000/alerts
http://127.0.0.1:3000/reports
http://127.0.0.1:3000/settings/users
http://127.0.0.1:3000/settings/rates
http://127.0.0.1:3000/settings/security
```

Expected behavior:

- Dashboard shows water usage, electric usage, cost, device health, alerts, and trends.
- Buildings, units, and meters show demo portfolio data.
- Alerts page shows seeded alert events and rules.
- Reports page shows June 2026 usage data.
- Settings pages allow owner workflows.
- Viewer account can read data but should not see mutation actions.

## 10. Optional Regression Checks

Run these after local infrastructure is available:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @iot-management/api test:e2e
pnpm --filter @iot-management/web-dashboard test:e2e
```

The API e2e suite requires PostgreSQL and Redis port-forwards to stay open.

## 11. Optional Full Kubernetes Test

Build local images:

```bash
pnpm docker:build:api
pnpm docker:build:web
```

Apply workloads:

```bash
kubectl apply -k deploy/kubernetes/overlays/local
kubectl -n iot-management get pods
```

Check migration job:

```bash
kubectl -n iot-management get jobs
kubectl -n iot-management logs job/migrate
```

Port-forward services:

```bash
kubectl -n iot-management port-forward service/api 3301:3001
kubectl -n iot-management port-forward service/web 3000:3000
```

Open:

```text
http://127.0.0.1:3000/login
```

## 12. Reset Local Demo Data

To reset only local demo data for the North Properties demo tenant:

```bash
DATABASE_URL=postgresql://iot_local:iot_local_password@127.0.0.1:5432/iot_management \
REDIS_URL=redis://127.0.0.1:6379 \
JWT_SESSION_SECRET=local-development-session-secret \
WEB_BASE_URL=http://127.0.0.1:3000 \
NODE_ENV=development \
pnpm --filter @iot-management/api seed:reset-demo
```

Then rerun:

```bash
DATABASE_URL=postgresql://iot_local:iot_local_password@127.0.0.1:5432/iot_management \
REDIS_URL=redis://127.0.0.1:6379 \
JWT_SESSION_SECRET=local-development-session-secret \
WEB_BASE_URL=http://127.0.0.1:3000 \
NODE_ENV=development \
pnpm seed:demo
```

To remove all local Kubernetes data, delete the namespace:

```bash
kubectl delete namespace iot-management
```

Then recreate it:

```bash
kubectl apply -k deploy/kubernetes/overlays/local
```
