#!/usr/bin/env bash
#
# Local Kubernetes smoke test for the three Evolith service charts on Docker
# Desktop's built-in Kubernetes (which shares the Docker daemon, so locally-built
# images work with imagePullPolicy: Never — no registry needed).
#
# Usage:
#   bash product/infra/helm/local-test.sh kind-apps-up # kind + build + load + install apps
#   bash product/infra/helm/local-test.sh kind-up      # kind + build + load + infra + apps
#   bash product/infra/helm/local-test.sh smoke        # port-forward + curl
#   bash product/infra/helm/local-test.sh kind-down    # uninstall + delete kind cluster
#
# Env:
#   EVOLITH_API_KEY   API key used for all three services (default: local-dev-key)
#   EVOLITH_IMAGE_TAG Local image tag to build/install (default: local-<epoch>)
#
# NOTE: on kind/minikube the daemon is NOT shared — load the images first
#   (`kind load docker-image evolith-core-api:<tag>`, etc.).
set -euo pipefail

NS=evolith-local
API_KEY="${EVOLITH_API_KEY:-local-dev-key}"
IMAGE_TAG="${EVOLITH_IMAGE_TAG:-local-$(date +%s)}"
ROOT="$(git rev-parse --show-toplevel)"
HELM="$ROOT/product/infra/helm"
CLUSTER="${KIND_CLUSTER:-evolith}"   # dedicated kind cluster name (kind-<name> context)

IMAGES=(evolith-core-api:"$IMAGE_TAG" evolith-mcp:"$IMAGE_TAG" evolith-agent-runtime:"$IMAGE_TAG")

kind_create() {
  if kind get clusters 2>/dev/null | grep -qx "$CLUSTER"; then
    echo "==> kind cluster '$CLUSTER' already exists"
  else
    echo "==> Creating kind cluster '$CLUSTER'"
    kind create cluster --name "$CLUSTER"
  fi
  kubectl config use-context "kind-$CLUSTER"
}

kind_load() {
  echo "==> Loading images into kind cluster '$CLUSTER'"
  for img in "${IMAGES[@]}"; do
    kind load docker-image "$img" --name "$CLUSTER"
  done
}

build() {
  echo "==> Building images (context = repo root, tag = $IMAGE_TAG)"
  docker build -f "$ROOT/src/apps/core-api/Dockerfile"          -t evolith-core-api:"$IMAGE_TAG"     "$ROOT"
  docker build -f "$ROOT/src/packages/mcp-server/Dockerfile"    -t evolith-mcp:"$IMAGE_TAG"   "$ROOT"
  docker build -f "$ROOT/src/apps/agent-runtime-api/Dockerfile" -t evolith-agent-runtime:"$IMAGE_TAG" "$ROOT"
}

secrets() {
  kubectl create namespace "$NS" --dry-run=client -o yaml | kubectl apply -f -
  kubectl -n "$NS" create secret generic core-api-auth \
    --from-literal=EVOLITH_API_KEY="$API_KEY" --dry-run=client -o yaml | kubectl apply -f -
  kubectl -n "$NS" create secret generic mcp-auth \
    --from-literal=EVOLITH_API_KEY="$API_KEY" --dry-run=client -o yaml | kubectl apply -f -
  kubectl -n "$NS" create secret generic agent-runtime-auth \
    --from-literal=AGENT_RUNTIME_API_KEY="$API_KEY" --dry-run=client -o yaml | kubectl apply -f -
}

infra() {
  echo "==> Installing Dapr Control Plane"
  helm repo add dapr https://dapr.github.io/helm-charts/ 2>/dev/null || true
  helm repo update 2>/dev/null || true
  helm upgrade --install dapr dapr/dapr --version=1.13.0 --namespace dapr-system --create-namespace --wait

  echo "==> Applying Dapr Secret Store Component"
  cat <<EOF | kubectl apply -f -
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kubernetes-secret-store
  namespace: $NS
spec:
  type: secretstores.kubernetes
  version: v1
  metadata: []
EOF

  echo "==> Installing MinIO (Official)"
  kubectl -n "$NS" apply -f - <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minio
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: minio
  template:
    metadata:
      labels:
        app.kubernetes.io/name: minio
    spec:
      containers:
      - name: minio
        image: minio/minio:latest
        args: ["server", "/data", "--console-address", ":9001"]
        env:
        - name: MINIO_ROOT_USER
          value: "admin"
        - name: MINIO_ROOT_PASSWORD
          value: "admin123"
        ports:
        - containerPort: 9000
        - containerPort: 9001
---
apiVersion: v1
kind: Service
metadata:
  name: minio
spec:
  ports:
  - port: 9000
    targetPort: 9000
    name: api
  - port: 9001
    targetPort: 9001
    name: console
  selector:
    app.kubernetes.io/name: minio
EOF

  echo "==> Waiting for MinIO to be ready"
  kubectl -n "$NS" wait --for=condition=ready pod -l app.kubernetes.io/name=minio --timeout=300s || true

  echo "==> Creating opa-bundles bucket"
  kubectl -n "$NS" run minio-mc-bucket --rm -i --image=minio/mc --restart='Never' --command -- sh -c "mc alias set myminio http://minio:9000 admin admin123 && mc mb myminio/opa-bundles --ignore-existing"

  echo "==> Uploading OPA bundle to MinIO"
  tar -czf bundle.tar.gz rulesets reference
  kubectl -n "$NS" run minio-mc --rm -i --image=minio/mc --restart='Never' --command -- sh -c "cat > /tmp/bundle.tar.gz && mc alias set myminio http://minio:9000 admin admin123 && mc cp /tmp/bundle.tar.gz myminio/opa-bundles/bundle.tar.gz" < bundle.tar.gz
  rm bundle.tar.gz

  echo "==> Installing Observability Stack"
  helm repo add grafana https://grafana.github.io/helm-charts 2>/dev/null || true
  helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts 2>/dev/null || true
  helm repo update 2>/dev/null || true
  helm upgrade --install tempo grafana/tempo -n "$NS" --wait
  helm upgrade --install grafana grafana/grafana -n "$NS" --set "adminPassword=admin" --wait
  helm upgrade --install otel open-telemetry/opentelemetry-collector -n "$NS" --wait \
    --set mode=daemonset \
    --set image.repository="otel/opentelemetry-collector-contrib" \
    --set config.exporters.otlp.endpoint="tempo:4317"
}

install() {
  helm upgrade --install evolith-core-api "$HELM/evolith-core-api"      -n "$NS" -f "$HELM/evolith-core-api/values-local.yaml"      --set image.tag="$IMAGE_TAG"
  helm upgrade --install evolith-mcp      "$HELM/evolith-mcp"           -n "$NS" -f "$HELM/evolith-mcp/values-local.yaml"           --set image.tag="$IMAGE_TAG"
  helm upgrade --install evolith-runtime  "$HELM/evolith-agent-runtime" -n "$NS" -f "$HELM/evolith-agent-runtime/values-local.yaml" --set image.tag="$IMAGE_TAG"
  echo "==> Waiting for rollouts"
  kubectl -n "$NS" rollout status deploy/evolith-core-api-evolith-core-api --timeout=180s
  kubectl -n "$NS" rollout status deploy/evolith-mcp-evolith-mcp --timeout=180s
  kubectl -n "$NS" rollout status deploy/evolith-runtime-evolith-agent-runtime --timeout=180s
}

# port-forward a service, run a command, then tear the forward down.
_pf() {
  local svc="$1" lport="$2"; shift 2
  kubectl -n "$NS" port-forward "svc/$svc" "$lport:80" >/dev/null 2>&1 &
  local pid=$!
  sleep 3
  "$@" || true
  kill "$pid" >/dev/null 2>&1 || true
  wait "$pid" 2>/dev/null || true
}

smoke() {
  echo "== CORE-API /health =="
  _pf evolith-core-api-evolith-core-api 18080 curl -fsS http://localhost:18080/health
  echo; echo "== MCP /health =="
  _pf evolith-mcp-evolith-mcp 18081 curl -fsS http://localhost:18081/health
  echo; echo "== Agent Runtime /health =="
  _pf evolith-runtime-evolith-agent-runtime 18082 curl -fsS http://localhost:18082/health
  echo; echo "== Agent Runtime POST /v1/agent/handle (with key) =="
  _pf evolith-runtime-evolith-agent-runtime 18082 curl -fsS -X POST http://localhost:18082/v1/agent/handle \
    -H "Authorization: Bearer $API_KEY" -H "content-type: application/json" \
    -d '{"intent":"validate_discovery_gate","tool":"validate-discovery-gate","gate":"prd_readiness","parameters":{"requiredArtifacts":["prd"],"presentArtifacts":["prd"]}}'
  echo
}

down() {
  helm -n "$NS" uninstall evolith-runtime evolith-core-api evolith-mcp 2>/dev/null || true
  kubectl delete namespace "$NS" --ignore-not-found
}

case "${1:-kind-up}" in
  build) build ;;
  apps-up)
         build; secrets; install
         echo "==> Done. Run: bash $0 smoke" ;;
  up)    build; secrets; infra; install
         echo "==> Done. Run: bash $0 smoke" ;;
  kind-up)
         kind_create; build; kind_load; secrets; infra; install
         echo "==> Done. Run: bash $0 smoke" ;;
  kind-apps-up)
         kind_create; build; kind_load; secrets; install
         echo "==> Done. Run: bash $0 smoke" ;;
  smoke) smoke ;;
  down)  down ;;
  kind-down)
         down
         kind delete cluster --name "$CLUSTER" ;;
  *) echo "usage: $0 {kind-apps-up|kind-up|apps-up|up|build|smoke|down|kind-down}"; exit 1 ;;
esac
