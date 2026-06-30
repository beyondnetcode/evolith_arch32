#!/usr/bin/env bash
#
# Local Kubernetes smoke test for the three Evolith service charts on Docker
# Desktop's built-in Kubernetes (which shares the Docker daemon, so locally-built
# images work with imagePullPolicy: Never — no registry needed).
#
# Usage:
#   bash reference/infrastructure/helm/local-test.sh up      # build + install
#   bash reference/infrastructure/helm/local-test.sh smoke   # port-forward + curl
#   bash reference/infrastructure/helm/local-test.sh down     # uninstall + delete ns
#
# Env:
#   EVOLITH_API_KEY   API key used for all three services (default: local-dev-key)
#
# NOTE: on kind/minikube the daemon is NOT shared — load the images first
#   (`kind load docker-image evolith-core-api:local`, etc.).
set -euo pipefail

NS=evolith-local
API_KEY="${EVOLITH_API_KEY:-local-dev-key}"
ROOT="$(git rev-parse --show-toplevel)"
HELM="$ROOT/reference/infrastructure/helm"
CLUSTER="${KIND_CLUSTER:-evolith}"   # dedicated kind cluster name (kind-<name> context)

IMAGES=(evolith-core-api:local evolith-mcp-server:local evolith-agent-runtime:local)

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
  echo "==> Building images (context = repo root)"
  docker build -f "$ROOT/apps/core-api/Dockerfile"          -t evolith-core-api:local     "$ROOT"
  docker build -f "$ROOT/packages/mcp-server/Dockerfile"    -t evolith-mcp-server:local   "$ROOT"
  docker build -f "$ROOT/apps/agent-runtime-api/Dockerfile" -t evolith-agent-runtime:local "$ROOT"
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

install() {
  helm upgrade --install coreapi "$HELM/evolith-core-api"     -n "$NS" -f "$HELM/evolith-core-api/values-local.yaml"
  helm upgrade --install mcp     "$HELM/evolith-mcp"          -n "$NS" -f "$HELM/evolith-mcp/values-local.yaml"
  helm upgrade --install runtime "$HELM/evolith-agent-runtime" -n "$NS" -f "$HELM/evolith-agent-runtime/values-local.yaml"
  echo "==> Waiting for rollouts"
  kubectl -n "$NS" rollout status deploy/coreapi-evolith-core-api --timeout=180s
  kubectl -n "$NS" rollout status deploy/mcp-evolith-mcp --timeout=180s
  kubectl -n "$NS" rollout status deploy/runtime-evolith-agent-runtime --timeout=180s
}

# port-forward a service, run a command, then tear the forward down.
_pf() {
  local svc="$1" lport="$2"; shift 2
  kubectl -n "$NS" port-forward "svc/$svc" "$lport:80" >/dev/null 2>&1 &
  local pid=$!
  sleep 3
  "$@" || true
  kill "$pid" >/dev/null 2>&1 || true
}

smoke() {
  echo "== CORE-API /health =="
  _pf coreapi-evolith-core-api 18080 curl -fsS http://localhost:18080/health
  echo; echo "== MCP /health =="
  _pf mcp-evolith-mcp 18081 curl -fsS http://localhost:18081/health
  echo; echo "== Agent Runtime /health =="
  _pf runtime-evolith-agent-runtime 18082 curl -fsS http://localhost:18082/health
  echo; echo "== Agent Runtime POST /v1/agent/handle (with key) =="
  _pf runtime-evolith-agent-runtime 18082 curl -fsS -X POST http://localhost:18082/v1/agent/handle \
    -H "Authorization: Bearer $API_KEY" -H "content-type: application/json" \
    -d '{"intent":"validate_discovery_gate","tool":"validate-discovery-gate","gate":"prd_readiness","parameters":{"requiredArtifacts":["prd"],"presentArtifacts":["prd"]}}'
  echo
}

down() {
  helm -n "$NS" uninstall runtime coreapi mcp 2>/dev/null || true
  kubectl delete namespace "$NS" --ignore-not-found
}

case "${1:-kind-up}" in
  build) build ;;
  up)    build; secrets; install
         echo "==> Done. Run: bash $0 smoke" ;;
  kind-up)
         kind_create; build; kind_load; secrets; install
         echo "==> Done. Run: bash $0 smoke" ;;
  smoke) smoke ;;
  down)  down ;;
  kind-down)
         down
         kind delete cluster --name "$CLUSTER" ;;
  *) echo "usage: $0 {kind-up|up|build|smoke|down|kind-down}"; exit 1 ;;
esac
