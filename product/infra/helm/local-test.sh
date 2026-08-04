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
#   bash product/infra/helm/local-test.sh url          # cross-cluster URL, and proof it answers
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

KIND_CONFIG="$ROOT/product/infra/kind/core-cluster.yaml"
CORE_NODE_PORT=30080
# One entry per interface: "<label> <nodePort>". The Core is not one address —
# REST, MCP and the agent runtime are three surfaces at parity, and a check that
# covered only the first would report a parity it never exercised.
SURFACES=("core-api 30080" "mcp 30081" "agent-runtime 30082")
# The address ANOTHER cluster uses to reach this Core.
#
# Every kind cluster joins the same `kind` Docker network, so the consumer's pod
# reaches this cluster's NODE CONTAINER by name — Docker's embedded DNS resolves
# it and the NodePort is listening there. This path does NOT use the host port
# mapping, and it must not: that one is bound to 127.0.0.1 and is therefore
# unreachable from the Docker bridge.
#
# NOT `host.docker.internal`: that fails with `Could not resolve host` inside a
# kind pod, which resolves through CoreDNS in the node and never sees the Docker
# Desktop entry. Measured, after writing it the wrong way first.
CORE_CROSS_CLUSTER_URL="http://$CLUSTER-control-plane:$CORE_NODE_PORT"

kind_create() {
  if kind get clusters 2>/dev/null | grep -qx "$CLUSTER"; then
    echo "==> kind cluster '$CLUSTER' already exists"
    # A cluster created before core-cluster.yaml has no host port, and NOTHING
    # can add one to a running cluster — port mappings are fixed at creation.
    # Saying so is the whole point: otherwise the Tracker is configured against
    # a port that was never bound, and the failure surfaces later as a refused
    # connection with no obvious cause.
    if ! docker inspect "$CLUSTER-control-plane" --format '{{json .HostConfig.PortBindings}}' 2>/dev/null | grep -q "$CORE_NODE_PORT/tcp"; then
      echo "!!  This cluster has NO host mapping for $CORE_NODE_PORT — it predates product/infra/kind/core-cluster.yaml."
      echo "!!  CROSS-CLUSTER access is unaffected ($CORE_CROSS_CLUSTER_URL goes over the shared 'kind'"
      echo "!!  Docker network, not through this mapping). What you lose is reaching it from THIS machine"
      echo "!!  at http://localhost:$CORE_NODE_PORT — a browser, a curl, the CLI."
      echo "!!  To gain that, recreate the cluster (DESTRUCTIVE — everything in it is lost):"
      echo "!!      bash $0 kind-down && bash $0 kind-up"
    fi
  else
    echo "==> Creating kind cluster '$CLUSTER' with the host port mapping ($KIND_CONFIG)"
    kind create cluster --name "$CLUSTER" --config "$KIND_CONFIG"
  fi
  kubectl config use-context "kind-$CLUSTER"
}

# Print every surface's address and PROVE each one, rather than asserting them.
#
# Three surfaces x two paths, and they fail INDEPENDENTLY: the host mapping is
# fixed at cluster creation, the cross-cluster path depends only on the shared
# Docker network, and each service has its own pinned port. One aggregate check
# would let a green core-api vouch for an MCP nobody reached.
url() {
  local rc=0 peer=""

  echo "cross-cluster base (configure the Tracker with this): http://$CLUSTER-control-plane:<port>"
  echo "from this machine:                                    http://localhost:<port>"
  for s in "${SURFACES[@]}"; do
    set -- $s
    printf "  %-14s %s\n" "$1" "$2"
  done

  echo
  echo "== GET /health from THIS MACHINE =="
  for s in "${SURFACES[@]}"; do
    set -- $s
    if curl -fsS --max-time 5 "http://localhost:$2/health" >/dev/null 2>&1; then
      printf "   %-14s OK   (localhost:%s)\n" "$1" "$2"
    else
      printf "!! %-14s FAIL (localhost:%s)\n" "$1" "$2"
      rc=1
    fi
  done
  if [ "$rc" -ne 0 ]; then
    echo "!! In order: does the cluster carry the mappings (docker inspect $CLUSTER-control-plane),"
    echo "!! are the services NodePort on those ports (kubectl -n $NS get svc), are the pods ready?"
  fi

  echo
  echo "== GET /health FROM ANOTHER CLUSTER =="
  # Any other RUNNING kind cluster will do. `kind get clusters` also lists
  # stopped ones, and the first version of this picked one: the probe failed,
  # blamed the Docker network, and the real cause was a node container that had
  # been dead for two days. A peer that cannot answer is not evidence.
  for c in $(kind get clusters 2>/dev/null | grep -vx "$CLUSTER"); do
    if docker inspect "$c-control-plane" --format '{{.State.Running}}' 2>/dev/null | grep -qx true; then
      peer="$c"; break
    fi
  done
  if [ -z "$peer" ]; then
    echo "   skipped: no OTHER RUNNING kind cluster to call from."
    echo "   This is NOT a pass — the cross-cluster path is simply unexercised."
    return $rc
  fi

  for s in "${SURFACES[@]}"; do
    set -- $s
    # Declared separately: under `set -u`, a single `local a=1 b=$a` does not see
    # `a` yet and dies with "unbound variable".
    local label="$1" port="$2"
    local pod="xcluster-probe-$label-$$"
    local out=""
    # NOT `kubectl run -i --rm`. That attaches to the pod AFTER creating it, so a
    # container which has already exited loses its stdout — and the result moves
    # between runs for reasons that have nothing to do with the thing under test.
    # Observed directly: two consecutive runs disagreed about WHICH surface was
    # reachable. Create, wait, read the logs, delete.
    #
    # stderr is kept throughout: discarding it is how a failed image pull reads
    # as "the Docker network is broken".
    kubectl --context "kind-$peer" run "$pod" --restart=Never \
      --image=curlimages/curl:8.10.1 --command -- \
      curl -fsS --max-time 10 "http://$CLUSTER-control-plane:$port/health" >/dev/null 2>&1
    kubectl --context "kind-$peer" wait --for=jsonpath='{.status.phase}'=Succeeded \
      "pod/$pod" --timeout=60s >/dev/null 2>&1 \
      || kubectl --context "kind-$peer" wait --for=jsonpath='{.status.phase}'=Failed \
           "pod/$pod" --timeout=5s >/dev/null 2>&1 || true
    out="$(kubectl --context "kind-$peer" logs "$pod" 2>&1)$(kubectl --context "kind-$peer" get pod "$pod" -o jsonpath='{.status.containerStatuses[*].state.waiting.reason}' 2>&1)"
    kubectl --context "kind-$peer" delete pod "$pod" --now >/dev/null 2>&1 || true

    # Case-INSENSITIVE and whitespace-tolerant, because the three surfaces do not
    # agree on the shape: core-api answers in the ADR-0073 envelope with
    # `"status":"OK"` nested under `data`, mcp and agent-runtime return a bare
    # object with `"status":"ok"`. The first version matched only the former, so
    # two healthy services were reported unreachable and the printed remedy
    # blamed the network. A probe that cannot read the answer manufactures a defect.
    if printf '%s' "$out" | grep -qiE '"status"[[:space:]]*:[[:space:]]*"ok"'; then
      printf "   %-14s OK   (from cluster '%s')\n" "$label" "$peer"
    elif printf '%s' "$out" | grep -qiE "ErrImagePull|ImagePullBackOff|failed to pull"; then
      printf "!! %-14s INCONCLUSIVE — the probe pod could not start (curlimages/curl did not pull).\n" "$label"
      echo   "!! That says nothing about the cross-cluster path. Check registry connectivity."
      rc=1
    else
      printf "!! %-14s FAIL at http://%s-control-plane:%s\n" "$label" "$CLUSTER" "$port"
      printf '%s\n' "$out" | tail -2 | sed 's/^/!!   /'
      rc=1
    fi
  done
  return $rc
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
  url)   url ;;
  down)  down ;;
  kind-down)
         down
         kind delete cluster --name "$CLUSTER" ;;
  *) echo "usage: $0 {kind-apps-up|kind-up|apps-up|up|build|smoke|url|down|kind-down}"; exit 1 ;;
esac
