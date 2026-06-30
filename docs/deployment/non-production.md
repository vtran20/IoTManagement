# Non-Production Deployment

Use this environment for integration testing before production.

## Prerequisites

- Kubernetes cluster access.
- Ingress controller installed.
- Image registry access.
- PostgreSQL and Redis available. Managed services are preferred outside local development.
- `iot-management-secrets` created in the target namespace.

## Secret Shape

Use `deploy/kubernetes/base/secret.example.yaml` as the template. Required keys:

- `DATABASE_URL`
- `REDIS_URL`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `JWT_SESSION_SECRET`

Use a strong `JWT_SESSION_SECRET` with at least 24 characters.

## Deploy

```bash
kubectl apply --dry-run=server -k deploy/kubernetes/overlays/non-production
kubectl apply -k deploy/kubernetes/overlays/non-production
kubectl -n iot-management-non-production rollout status deployment/api
kubectl -n iot-management-non-production rollout status deployment/web
kubectl -n iot-management-non-production rollout status deployment/worker
```

## Verify

```bash
kubectl -n iot-management-non-production get pods
kubectl -n iot-management-non-production logs job/migrate
kubectl -n iot-management-non-production port-forward service/api 3301:3001
curl -s http://127.0.0.1:3301/api/v1/health
```

Expected health response:

```json
{ "status": "ok", "service": "iot-management-api" }
```

## Production Notes

Before production:

- Replace local PostgreSQL and Redis manifests with managed-service endpoints.
- Require TLS at ingress.
- Enable image vulnerability scanning.
- Store secrets in an external secret manager.
- Add metrics, centralized logs, backup checks, and alerting.
- Run server-side dry-run validation against the target cluster before applying.
