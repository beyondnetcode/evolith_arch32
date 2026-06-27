# Edge Computing — Runbooks Guide

> **Bilingual Navigation:** [English](./runbooks.md) | [Español](./runbooks.es.md)

**Owner:** Platform Engineering
**Topology:** Edge Computing

## Runbook 1: Node Failure

Handle edge node failures gracefully to maintain service availability.

### Detection

```bash
# Detect node failure
edge-cli node status --node edge-node-01

# Alert triggers:
# - Node unreachable for > 30s
# - Health check failure > 3 consecutive
# - Resource exhaustion (CPU > 95%, Memory > 95%)
```

### Triage

1. **Check node status**: Is the node completely down or partially degraded?
2. **Check network connectivity**: Can we reach the node from the control plane?
3. **Check node logs**: What errors are being reported?
4. **Check origin status**: Is the origin healthy?

### Remediation

```bash
# Step 1: Check node health
edge-cli health check --node edge-node-01 --verbose

# Step 2: If node is unreachable, attempt restart
edge-cli node restart --node edge-node-01 --force

# Step 3: If restart fails, drain traffic
edge-cli traffic drain --node edge-node-01 --duration 30s

# Step 4: If node is unrecoverable, replace
edge-cli node replace \
  --old-node edge-node-01 \
  --new-node edge-node-01-new \
  --migrate-state
```

### Verification

```bash
# Verify node recovery
edge-cli health check --node edge-node-01-new --wait 60s

# Check traffic distribution
edge-cli traffic status --fleet-wide

# Verify sync status
edge-cli sync status --node edge-node-01-new
```

---

## Runbook 2: Content Invalidation

Invalidate stale or incorrect content across the edge fleet.

### When to Use

- Content update deployed but not reflected
- Security vulnerability in cached content
- Data corruption detected
- Compliance requirement to remove content

### Invalidation Process

```bash
# Step 1: Identify affected content
edge-cli cache search --pattern "/api/v1/products/*" --output affected.json

# Step 2: Preview invalidation
edge-cli cache invalidate --file affected.json --dry-run

# Step 3: Execute invalidation
edge-cli cache invalidate --file affected.json --confirm

# Step 4: Monitor invalidation progress
edge-cli cache invalidation status --watch
```

### Partial Invalidation

```bash
# Invalidate specific content types
edge-cli cache invalidate \
  --pattern "/static/js/*" \
  --reason "security-patch"

# Invalidate by tag
edge-cli cache invalidate \
  --tag "product-images" \
  --reason "content-update"
```

### Verification

```bash
# Verify invalidation completed
edge-cli cache stats --fleet-wide --content-type "js"

# Check for stale content
edge-cli cache audit --max-age 0 --pattern "/api/v1/products/*"
```

---

## Runbook 3: Sync Conflict Resolution

Handle synchronization conflicts between edge nodes and origin.

### Detection

```bash
# Monitor sync conflicts
edge-cli sync conflicts monitor --alert-threshold 10

# Check conflict details
edge-cli sync conflicts list --node edge-node-01 --output conflicts.json
```

### Analysis

```bash
# Analyze conflict patterns
edge-cli sync conflicts analyze --period 1h

# Output:
# TOTAL_CONFLICTS: 23
# BY_TYPE:
#   - write-write: 15
#   - delete-update: 5
#   - concurrent-create: 3
# BY_RESOURCE:
#   - user/preferences: 12
#   - cart/items: 8
#   - session/data: 3
```

### Resolution

```bash
# Auto-resolve simple conflicts
edge-cli sync conflicts resolve \
  --strategy last-write-wins \
  --filter "type:write-write"

# Manual resolution for complex conflicts
edge-cli sync conflicts resolve \
  --conflict-id conflict-123 \
  --resolution manual \
  --keep "origin" \
  --merge-strategy "deep-merge"

# Force resolution with audit trail
edge-cli sync conflicts force-resolve \
  --conflict-id conflict-123 \
  --resolution "user:admin@example.com" \
  --reason "manual-override" \
  --audit
```

### Prevention

```bash
# Enable optimistic locking
edge-cli sync config set --optimistic-locking true

# Configure conflict-free CRDTs for critical data
edge-cli sync config set \
  --resource "user/preferences" \
  --strategy crdt \
  --type lww-register
```

---

## Runbook 4: Node Recovery

Recover a failed or degraded edge node to full operation.

### Assessment

```bash
# Assess node state
edge-cli node assess --node edge-node-01

# Output:
# NODE: edge-node-01
# STATE: degraded
# ISSUES:
#   - disk_usage: 92% (critical)
#   - sync_lag: 45s (warning)
#   - cert_expiry: 2026-07-15 (ok)
# RECOMMENDATION: cleanup disk, force sync
```

### Recovery Steps

```bash
# Step 1: Clean up disk space
edge-cli node cleanup \
  --node edge-node-01 \
  --purge-stale-cache \
  --remove-old-logs \
  --compact-database

# Step 2: Force sync with origin
edge-cli sync force \
  --node edge-node-01 \
  --full \
  --timeout 300s

# Step 3: Restart node services
edge-cli node restart \
  --node edge-node-01 \
  --services all \
  --grace-period 30s

# Step 4: Verify recovery
edge-cli health check --node edge-node-01 --wait 120s
```

### Post-Recovery Validation

```bash
# Run full validation suite
edge-cli validate node --node edge-node-01 --comprehensive

# Check traffic routing
edge-cli traffic status --node edge-node-01

# Monitor for 15 minutes
edge-cli monitor --node edge-node-01 --duration 900s --alert-on-anomaly
```

---

## Runbook 5: Offline Mode Operations

Handle extended offline periods when edge nodes cannot reach origin.

### Detection

```bash
# Monitor origin connectivity
edge-cli connectivity status --node edge-node-01

# Output:
# NODE: edge-node-01
# ORIGIN_STATUS: unreachable
# LAST_CONTACT: 2026-06-23T10:15:00Z
# DURATION: 45 minutes
# MODE: offline
# CACHED_CONTENT: 98.5% available
```

### Offline Mode Activation

```bash
# Verify offline mode is active
edge-cli offline status --node edge-node-01

# Check cached content availability
edge-cli cache availability --node edge-node-01

# Output:
# TOTAL_CONTENT: 1,245 items
# CACHED: 1,226 items (98.5%)
# MISSING: 19 items (1.5%)
# STALE: 234 items (18.8%)
```

### Operations During Offline

```bash
# Serve cached content
edge-cli offline serve --node edge-node-01 --mode degraded

# Queue writes for later sync
edge-cli offline queue-status --node edge-node-01

# Output:
# QUEUED_WRITES: 45
# QUEUED_SIZE: 128KB
# ESTIMATED_SYNC_TIME: 30s (when online)
```

### Recovery from Offline

```bash
# Detect origin recovery
edge-cli connectivity monitor --watch

# Sync queued writes
edge-cli sync process-queue --node edge-node-01

# Verify all writes synced
edge-cli sync queue-status --node edge-node-01
```

---

## Runbook 6: Origin Failover

Handle origin server failures by routing traffic to fallback origins.

### Detection

```bash
# Monitor origin health
edge-cli origin health --watch

# Alert triggers:
# - Origin response time > 500ms
# - Origin error rate > 5%
# - Origin connection failures > 3
```

### Failover Process

```bash
# Step 1: Verify origin failure
edge-cli origin test --target primary --timeout 10s

# Step 2: Activate failover
edge-cli origin failover activate --reason "primary-origin-down"

# Step 3: Verify failover routing
edge-cli origin status --fleet-wide

# Output:
# PRIMARY: primary-origin.example.com (DOWN)
# FAILOVER: failover-origin.example.com (ACTIVE)
# TRAFFIC: 100% to failover
# STATUS: degraded (reduced capacity)
```

### Monitoring During Failover

```bash
# Monitor failover performance
edge-cli origin monitor --interval 30s

# Check cache hit rates during failover
edge-cli cache stats --fleet-wide --period 5m

# Verify no data loss
edge-cli sync verify --period 5m
```

### Recovery

```bash
# Verify primary origin recovery
edge-cli origin test --target primary --continuous --duration 300s

# Switch back to primary
edge-cli origin failover deactivate --confirm

# Verify normal routing
edge-cli origin status --fleet-wide
```

---

## Emergency Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| Edge Platform Lead | platform-lead@example.com | 24/7 |
| On-Call Engineer | oncall-edge@example.com | 24/7 |
| Security Team | security@example.com | Business hours |
| Network Operations | netops@example.com | 24/7 |

## Escalation Path

```
P1 (Service Down):
  → On-Call Engineer (5 min)
  → Platform Lead (15 min)
  → VP Engineering (30 min)

P2 (Degraded Performance):
  → On-Call Engineer (15 min)
  → Platform Lead (1 hour)
  → VP Engineering (4 hours)

P3 (Minor Issue):
  → On-Call Engineer (1 hour)
  → Platform Lead (next business day)
```

---
[Back to Edge Computing Profile](./README.md)
