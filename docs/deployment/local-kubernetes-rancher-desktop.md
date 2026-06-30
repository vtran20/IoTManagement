# Local Kubernetes With Rancher Desktop

Use this guide to run the project's local Kubernetes dependencies on Rancher Desktop.

## Prerequisites

- Rancher Desktop is running.
- Rancher Desktop Kubernetes is enabled.
- `kubectl config current-context` returns `rancher-desktop`.

## Verify Cluster

```bash
kubectl config current-context
kubectl get nodes -o wide
kubectl version --client=true
```

Expected:

- Context is `rancher-desktop`.
- At least one node is `Ready`.
- Client output includes a Kustomize version.

## Validate Manifests

```bash
kubectl apply --dry-run=client -k deploy/kubernetes/overlays/local
```

## Apply Local Infrastructure

```bash
kubectl apply -k deploy/kubernetes/overlays/local
kubectl -n iot-management get pods,svc
```

Wait for:

```text
pod/postgres-...               Running
pod/redis-...                  Running
service/postgres               ClusterIP
service/redis                  ClusterIP
```

The local PostgreSQL manifest uses ephemeral `emptyDir` storage. This is intentional for local tests; deleting the namespace or restarting the pod can remove local database data.

## Image Pull Troubleshooting

The Rancher Desktop Docker runtime must be able to pull:

```bash
docker pull postgres:16-alpine
docker pull redis:7.2-alpine
```

If those commands time out, fix Rancher Desktop networking, VPN, proxy, or firewall access to Docker Hub. Kubernetes pods will remain in `ImagePullBackOff` until the images are available.

After image access is fixed, restart the workloads:

```bash
kubectl -n iot-management rollout restart deployment/postgres deployment/redis
kubectl -n iot-management get pods,svc
```

## Connect From Local Development Tools

Run these in separate terminals when the local API needs database or Redis access:

```bash
kubectl -n iot-management port-forward svc/postgres 5432:5432
kubectl -n iot-management port-forward svc/redis 6379:6379
```

Use:

```text
DATABASE_URL=postgresql://iot_local:iot_local_password@localhost:5432/iot_management
REDIS_URL=redis://localhost:6379
```

## Reset Local Data

Deleting the namespace removes local PostgreSQL and Redis data:

```bash
kubectl delete namespace iot-management
```

Recreate it with:

```bash
kubectl apply -k deploy/kubernetes/overlays/local
```

Do not use the local secret values for non-local environments.
