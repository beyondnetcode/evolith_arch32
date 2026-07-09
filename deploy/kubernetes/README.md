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
    └── broker-rbac.yaml       # per-product broker Users/Permissions only (ADR-0108)
```

> **Message topology is owned by MassTransit, not by CRDs (ADR-0108).** The fanout type-exchange,
> per-consumer endpoint queues, and `<queue>_error` poison queues are auto-declared by the apps at
> startup. The Topology Operator carries only the broker RBAC that MassTransit cannot self-declare.
> The previous `tenant-topology.yaml` (consistent-hash exchange + DLX + bindings) was **retired**
> (GT-462): it split traffic instead of fanning out and collided with MassTransit's redeclare (`406`).

## Local bring-up (one time)
```bash
# 1. Cluster
kind create cluster --name evolith --config deploy/kubernetes/kind-cluster.yaml

# 2. Operators (RabbitMQ cluster + messaging topology)
kubectl apply -f https://github.com/rabbitmq/cluster-operator/releases/latest/download/cluster-operator.yml
kubectl apply -f https://github.com/rabbitmq/messaging-topology-operator/releases/latest/download/messaging-topology-operator-with-certmanager.yaml

# 3. Namespaces + broker + per-product broker RBAC (message topology is auto-declared by the apps)
kubectl apply -f deploy/kubernetes/namespaces.yaml
kubectl apply -f deploy/kubernetes/messaging/rabbitmq-cluster.yaml
kubectl wait --for=condition=AllReplicasReady rabbitmqcluster/evolith-rabbitmq -n evolith-messaging --timeout=300s
# Provision per-product broker credential secrets first (mms|ums|tracker-broker-user), then:
kubectl apply -f deploy/kubernetes/messaging/broker-rbac.yaml

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
- Credentials: each product authenticates with its **own** broker user (`mms`/`ums`/`tracker`,
  ADR-0108 · deployment strategy §6), backed by a per-product secret (`<product>-broker-user`).
  The operator's shared `evolith-rabbitmq-default-user` is **not** used by products (one leaked
  credential must not be a whole-suite blast radius).

## Status
- ✅ Namespaces, RabbitMQ cluster, per-product broker RBAC (ADR-0108) — this dir.
- ⏳ Phase 2: per-product Helm charts (mms/ums/tracker), app wiring (MMS producer envelope +
  event-store; UMS/Tracker consumers), NetworkPolicies, ResourceQuotas, observability stack.
