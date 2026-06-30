# Local Kubernetes Setup

This directory contains Kubernetes manifests for local and future environment deployments.

The current local overlay targets Rancher Desktop's Kubernetes cluster and starts the shared infrastructure needed by the SaaS:

- Namespace: `iot-management`
- PostgreSQL service: `postgres` with ephemeral `emptyDir` storage for local testing
- Redis service: `redis`

Application workloads for the API, dashboard, workers, and migration Job will be added after the app scaffolds exist.

## Validate

```bash
kubectl apply --dry-run=client -k deploy/kubernetes/overlays/local
```

## Apply

```bash
kubectl apply -k deploy/kubernetes/overlays/local
kubectl -n iot-management get pods,svc
```

## Local Ports

Use port-forwarding from another terminal when local tools need database or Redis access:

```bash
kubectl -n iot-management port-forward svc/postgres 5432:5432
kubectl -n iot-management port-forward svc/redis 6379:6379
```

Local development connection values:

```text
PostgreSQL host: localhost
PostgreSQL port: 5432
PostgreSQL database: iot_management
PostgreSQL user: iot_local
PostgreSQL password: iot_local_password

Redis host: localhost
Redis port: 6379
```

These credentials are for local development only.

## Image Pull Troubleshooting

Rancher Desktop must be able to pull these images, or they must already exist in its Docker runtime:

```bash
docker pull postgres:16-alpine
docker pull redis:7.2-alpine
```

If these commands time out, check Rancher Desktop networking, VPN, proxy, or firewall settings before retrying the Kubernetes rollout.

After image access is fixed, restart the local workloads:

```bash
kubectl -n iot-management rollout restart deployment/postgres deployment/redis
kubectl -n iot-management get pods,svc
```
