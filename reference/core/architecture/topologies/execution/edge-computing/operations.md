# Edge Computing — Operations Guide

> **Bilingual Navigation:** [English](./operations.md) | [Español](./operations.es.md)

**Owner:** Platform Engineering
**Topology:** Edge Computing

## Node Lifecycle Management

Edge nodes follow a defined lifecycle: provisioning, registration, activation, monitoring, maintenance, and decommissioning.

### Provisioning

```bash
# Register a new edge node
edge-cli node register \
  --node-id edge-node-01 \
  --region us-west-2 \
  --zone us-west-2a \
  --role compute \
  --capacity "cpu=4,memory=8Gi,storage=50Gi"
```

### Health Monitoring

Each node reports health metrics every 15 seconds:

| Metric | Threshold | Action on Breach |
|--------|-----------|------------------|
| Latency to origin | > 200ms | Trigger failover |
| CPU utilization | > 85% | Shed non-critical workloads |
| Memory usage | > 90% | Evict least-recently-used cache |
| Disk usage | > 80% | Purge stale content |
| Sync lag | > 30s | Escalate to operations |

## Content Sync Monitoring (Ref: EC-R01)

The sync strategy ensures content consistency across the edge fleet.

### Sync Health Dashboard

```bash
# Check sync status across all nodes
edge-cli sync status --fleet-wide --format table

# Output:
# NODE           LAST_SYNC    LAG     STATUS
# edge-node-01   2026-06-23   2s      healthy
# edge-node-02   2026-06-23   45s     degraded
# edge-node-03   2026-06-22   4h      offline
```

### Sync Strategies

| Strategy | Use Case | Consistency | Performance |
|----------|----------|-------------|-------------|
| Push-based | Static assets | Strong | High bandwidth |
| Pull-based | Dynamic content | Eventual | On-demand |
| Hybrid | Mixed workloads | Tunable | Balanced |

## Latency Measurement (200ms Budget)

End-to-end latency is measured from client request to response delivery.

### Measurement Points

1. **Client → Edge Node**: DNS resolution + TCP handshake + TLS
2. **Edge Processing**: Function execution time
3. **Edge → Origin** (on miss): Cache miss penalty
4. **Response Delivery**: Serialization + transfer

### Latency Budget Breakdown

| Segment | Budget | Current | Status |
|---------|--------|---------|--------|
| DNS resolution | 20ms | 12ms | [PASS] |
| TLS handshake | 40ms | 35ms | [PASS] |
| Edge processing | 50ms | 42ms | [PASS] |
| Cache miss (p95) | 80ms | 78ms | [PASS] |
| Transfer overhead | 10ms | 8ms | [PASS] |
| **Total** | **200ms** | **175ms** | **[PASS]** |

### Alerting Rules

```yaml
alerts:
  - name: edge-latency-p99
    condition: latency_p99 > 200ms
    severity: critical
    action: page-oncall
  - name: edge-latency-p95
    condition: latency_p95 > 180ms
    severity: warning
    action: notify-slack
```

## Offline Operations (Ref: EC-R02)

Edge nodes must continue serving cached content when disconnected from origin.

### Offline Capability Matrix

| Capability | Available Offline | Sync Required |
|------------|-------------------|---------------|
| Read cached content | Yes | No |
| Serve static assets | Yes | No |
| Execute edge functions | Yes (cached) | On reconnect |
| Write operations | Queued locally | Background sync |
| Authentication | Cached tokens | Refresh on reconnect |

### Offline Detection

```bash
# Monitor origin connectivity
edge-cli connectivity monitor \
  --interval 5s \
  --threshold 3 failures \
  --action enter-offline-mode
```

## Fleet Management

### Rolling Updates

```bash
# Update fleet in 10% increments
edge-cli fleet update \
  --image edge-runtime:2.4.1 \
  --strategy rolling \
  --batch-size 10% \
  --pause-on-failure-rate 5%
```

### Capacity Planning

```bash
# View fleet capacity summary
edge-cli fleet capacity --format json

# Key metrics:
# - Total nodes: 24
# - Active compute capacity: 96 vCPUs
# - Storage capacity: 1.2Ti
# - Current utilization: 62%
```

---
[Back to Edge Computing Profile](./README.md)
