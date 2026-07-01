# Local Kubernetes Validation

These steps assume Rancher Desktop is already running with Kubernetes enabled.

## Build

```bash
pnpm install
pnpm build
pnpm docker:build:api
pnpm docker:build:web
```

If Rancher Desktop uses the same container runtime as Docker, Kubernetes can use the local image tags directly. Otherwise, push the images to a local registry and update the local overlay image tags.

## Validate Manifests

```bash
kubectl apply --dry-run=client -k deploy/kubernetes/overlays/local
```

Expected result: Kubernetes prints rendered resources ending with `configured (dry run)` or `created (dry run)` messages.

## Apply Locally

```bash
kubectl apply -k deploy/kubernetes/overlays/local
kubectl -n iot-management get pods
```

Expected pods:

- `api-*`
- `web-*`
- `worker-*`
- `migrate-*`
- `postgres-*`
- `redis-*`

## Check Health

Port-forward API:

```bash
kubectl -n iot-management port-forward service/api 3301:3001
curl -s http://127.0.0.1:3301/api/v1/health
```

Expected:

```json
{ "status": "ok", "service": "iot-management-api" }
```

Port-forward web:

```bash
kubectl -n iot-management port-forward service/web 3000:3000
```

Open:

```text
http://127.0.0.1:3000/login
```

## Local Database Commands

When using Rancher Desktop Kubernetes, port-forward PostgreSQL before running local API migration, seed, or e2e commands from the host:

```bash
kubectl -n iot-management port-forward svc/postgres 5432:5432
```

In another terminal:

```bash
DATABASE_URL=postgresql://iot_local:iot_local_password@127.0.0.1:5432/iot_management pnpm --filter @iot-management/api db:migrate
DATABASE_URL=postgresql://iot_local:iot_local_password@127.0.0.1:5432/iot_management pnpm --filter @iot-management/api seed:demo
```

`db:migrate` creates `schema_migrations` automatically, applies pending SQL files in lexical order, stores SHA-256 checksums, skips already-applied matching migrations, and fails if an applied migration file changes.

## Demo Data

`pnpm seed:demo` and `pnpm --filter @iot-management/api seed:demo` load deterministic product-review data for the North Properties tenant:

- 3 demo buildings.
- 10 floors.
- 40 units.
- 43 meters, including building-shared meters.
- 90 days of daily readings.
- Hourly, daily, and monthly usage aggregates.
- Stale and offline meter states.
- 3 alert rules and 3 open alert events.

The seed is idempotent. Running it again should report `acceptedReadingCount: 0` and `duplicateReadingCount: 3870`, with no duplicate buildings, units, meters, rules, or events.

For local reset only, run:

```bash
DATABASE_URL=postgresql://iot_local:iot_local_password@127.0.0.1:5432/iot_management pnpm --filter @iot-management/api seed:reset-demo
```

The reset command removes only demo-prefixed/demo-named data for the North Properties demo tenant. It is blocked when `NODE_ENV=production`.

Demo accounts all use `password123`:

| Role                   | Email                   |
| ---------------------- | ----------------------- |
| Owner                  | `owner@north.example`   |
| Manager                | `manager@north.example` |
| Viewer                 | `viewer@north.example`  |
| Tenant isolation owner | `owner@south.example`   |

## Manual Phase 12 Verification

1. `pnpm build` succeeds.
2. `pnpm db:migrate` prints `migrations-complete`.
3. `pnpm seed:demo` prints `demo-seed-complete`.
4. `kubectl apply --dry-run=client -k deploy/kubernetes/overlays/local` succeeds.
5. API and web images build with `pnpm docker:build:api` and `pnpm docker:build:web`.
