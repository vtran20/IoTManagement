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

## Manual Phase 12 Verification

1. `pnpm build` succeeds.
2. `pnpm db:migrate` prints `migration-assets-validated`.
3. `pnpm seed:demo` prints `demo-seed-complete`.
4. `kubectl apply --dry-run=client -k deploy/kubernetes/overlays/local` succeeds.
5. API and web images build with `pnpm docker:build:api` and `pnpm docker:build:web`.
