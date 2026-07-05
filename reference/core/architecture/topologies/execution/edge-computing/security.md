# Edge Computing — Security Guide

> **Bilingual Navigation:** [English](./security.md) | [Español](./security.es.md)

**Owner:** Platform Engineering
**Topology:** Edge Computing

## Edge Authentication

Edge nodes authenticate using a layered approach: node identity, workload identity, and client tokens.

### Node Identity

Each edge node holds a hardware-backed identity certificate issued during provisioning.

```bash
# Verify node identity
edge-cli auth node-identity verify \
  --node-id edge-node-01 \
  --check-cert-expiry

# Output:
# NODE: edge-node-01
# CERT_EXPIRY: 2027-06-23
# TRUST_CHAIN: root-ca → intermediate-ca → node-cert
# STATUS: valid
```

### Workload Identity

Workloads running on edge nodes use SPIFFE-based workload identities for service-to-service authentication.

```yaml
spiffe:
  trust_domain: "edge.example.com"
  workload:
    path: "/compute/worker"
    selector:
      - "k8s:ns=edge-workloads"
      - "k8s:sa=edge-worker"
```

## Data Residency

Edge deployments must respect data residency requirements based on node geographic location.

### Residency Policy Engine

```yaml
residency:
  rules:
    - region: "eu-west-*"
      restrictions:
        - data_type: "pii"
          allowed_destinations: ["eu-west-1", "eu-central-1"]
        - data_type: "telemetry"
          allowed_destinations: ["eu-west-*"]
    - region: "us-*"
      restrictions:
        - data_type: "pii"
          allowed_destinations: ["us-*"]
    - region: "ap-*"
      restrictions:
        - data_type: "pii"
          allowed_destinations: ["ap-*"]
```

### Enforcement

```bash
# Audit data residency compliance
edge-cli residency audit --fleet-wide --output report.json

# Violations trigger automated remediation:
# - Cross-border PII: block and alert
# - Telemetry leakage: redirect to allowed region
```

## Encryption at Rest

All persistent data on edge nodes is encrypted using AES-256-GCM.

### Encryption Architecture

| Data Category | Key Source | Rotation | Scope |
|---------------|------------|----------|-------|
| Cached content | Node-local KMS | 24 hours | Per-node |
| Configuration | Central KMS | 7 days | Fleet-wide |
| Logs | Node-local KMS | 24 hours | Per-node |
| Secrets | External vault | On-demand | Per-workload |

### Key Management

```bash
# Rotate edge encryption keys
edge-cli crypto rotate \
  --scope node-local \
  --algorithm aes-256-gcm \
  --grace-period 1h
```

## Network Security (EC-SEC-01)

Edge nodes enforce network security policies at the node level.

### Network Segmentation

```
┌─────────────────────────────────────────────┐
│  Edge Node Network                          │
│  ┌───────────┐  ┌───────────┐  ┌─────────┐ │
│  │ Compute   │  │ Storage   │  │ Control │ │
│  │ Segment   │  │ Segment   │  │ Segment │ │
│  │ (VLAN 10) │  │ (VLAN 20) │  │ (VLAN 30)│ │
│  └───────────┘  └───────────┘  └─────────┘ │
│         │              │             │       │
│         └──────────────┼─────────────┘       │
│                        │                     │
│                   ┌────┴────┐                │
│                   │ Firewall│                │
│                   └────┬────┘                │
│                        │                     │
└────────────────────────┼─────────────────────┘
                         │
                    ┌────┴────┐
                    │ Origin  │
                    └─────────┘
```

### Firewall Rules

```yaml
firewall:
  ingress:
    - port: 443
      source: "client-cidrs"
      action: allow
    - port: 8443
      source: "peer-nodes"
      action: allow
    - port: 9090
      source: "monitoring-subnet"
      action: allow
  egress:
    - port: 443
      destination: "origin-servers"
      action: allow
    - port: 443
      destination: "kms-endpoints"
      action: allow
    - all: deny
```

## Mutual TLS (EC-SEC-02)

All communication between edge nodes and between edge and origin uses mTLS.

### Certificate Configuration

```yaml
mtls:
  enabled: true
  min_version: "1.3"
  cipher_suites:
    - "TLS_AES_256_GCM_SHA384"
    - "TLS_CHACHA20_POLY1305_SHA256"
  client_auth:
    required: true
    ca_bundle: "/etc/edge/ca-bundle.pem"
  cert_rotation:
    interval: 24h
    overlap: 1h
```

### mTLS Verification

```bash
# Test mTLS connectivity between nodes
edge-cli mtls test \
  --source edge-node-01 \
  --target edge-node-02 \
  --verify-peer-cert

# Output:
# SOURCE: edge-node-01
# TARGET: edge-node-02
# TLS_VERSION: 1.3
# CIPHER: TLS_AES_256_GCM_SHA384
# PEER_CERT_VALID: true
# STATUS: passed
```

## Secret Rotation

Secrets on edge nodes are rotated automatically to limit exposure window.

### Rotation Schedule

| Secret Type | Rotation Interval | Grace Period | Failure Action |
|-------------|-------------------|--------------|----------------|
| Node identity cert | 90 days | 24 hours | Alert + degrade |
| API tokens | 1 hour | 5 minutes | Refresh background |
| Encryption keys | 24 hours | 1 hour | Queue new key |
| Database credentials | 7 days | 2 hours | Hold connection |

### Rotation Orchestration

```bash
# Trigger fleet-wide secret rotation
edge-cli secrets rotate \
  --scope fleet \
  --type all \
  --strategy rolling \
  --batch 10%
```

---
[Back to Edge Computing Profile](./README.md)
