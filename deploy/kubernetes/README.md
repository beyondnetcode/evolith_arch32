# Evolith — Single-Cluster Kubernetes Deployment (ADR-0107)

Shared substrate for the whole suite: **one cluster**, namespace-per-product, a shared HA
**RabbitMQ** broker, and shared observability. Same manifests for local (kind) and production
(Coolify + Kubernetes). See Core **ADR-0107** and the canonical
[`mms/docs/architecture/tenant-master-data-projection.md`](../../../mms/docs/architecture/tenant-master-data-projection.md).

## Layout
```
deploy/kubernetes/
├── kind-cluster.yaml          # local cluster (kind)
├── namespaces.yaml            # evolith-messaging, observability, evolith-core, mms, ums, tracker
└── messaging/
    ├── rabbitmq-cluster.yaml  # RabbitmqCluster CR (3-node quorum + PVs)
    └── tenant-topology.yaml   # Exchange evolith.masterdata (x-consistent-hash) + queues + DLX + bindings
```

## Local bring-up (one time)
```bash
# 1. Cluster
kind create cluster --name evolith --config deploy/kubernetes/kind-cluster.yaml

# 2. Operators (RabbitMQ cluster + messaging topology)
kubectl apply -f https://github.com/rabbitmq/cluster-operator/releases/latest/download/cluster-operator.yml
kubectl apply -f https://github.com/rabbitmq/messaging-topology-operator/releases/latest/download/messaging-topology-operator-with-certmanager.yaml

# 3. Namespaces + broker + tenant topology
kubectl apply -f deploy/kubernetes/namespaces.yaml
kubectl apply -f deploy/kubernetes/messaging/rabbitmq-cluster.yaml
kubectl wait --for=condition=AllReplicasReady rabbitmqcluster/evolith-rabbitmq -n evolith-messaging --timeout=300s
kubectl apply -f deploy/kubernetes/messaging/tenant-topology.yaml

# 4. Products (Phase 2 — per-product Helm charts, e.g. ums-helm / mms-helm / tracker-helm)
#    helm upgrade --install mms   infra/mms-helm     -n mms
#    helm upgrade --install ums   infra/ums-helm     -n ums
#    helm upgrade --install tracker infra/tracker-helm -n tracker
```

## Production (Coolify + Kubernetes)
Same manifests; broker at `replicas: 3` with real PVs; secrets from the Coolify vault / OpenBao
(never in manifests); per-product Helm releases (independent deployability). The local umbrella
convenience is **not** the production release unit (ADR-0107 §6).

## Connection (apps)
- AMQP host: `evolith-rabbitmq.evolith-messaging.svc.cluster.local:5672`
- Credentials: the operator generates a `Secret` `evolith-rabbitmq-default-user` in
  `evolith-messaging`; product namespaces reference it via a synced `Secret`
  (`ConnectionStrings:RabbitMq`).

## Status
- ✅ Namespaces, RabbitMQ cluster, tenant topology (exchange/queues/DLX) — this dir.
- ⏳ Phase 2: per-product Helm charts (mms/ums/tracker), app wiring (MMS producer envelope +
  event-store; UMS/Tracker consumers), NetworkPolicies, ResourceQuotas, observability stack.
