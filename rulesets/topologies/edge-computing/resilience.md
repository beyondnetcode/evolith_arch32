# Edge Computing — Resilience Guide

> **Bilingual Navigation:** [English](./resilience.md) | [Español](./resilience.es.md)

**Owner:** Platform Engineering
**Topology:** Edge Computing

## Offline-First Persistence

Edge nodes must serve requests even when disconnected from the origin. The offline-first architecture ensures continuous operation.

### Storage Architecture

```
┌─────────────────────────────────────────┐
│  Edge Node Storage                      │
│  ┌─────────────────────────────────┐   │
│  │  Read-Write Store (SQLite)      │   │
│  │  - Active workloads             │   │
│  │  - Local state                  │   │
│  │  - Pending writes               │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Read-Only Cache (KV Store)     │   │
│  │  - Static assets                │   │
│  │  - Frequently accessed data     │   │
│  │  - Pre-fetched content          │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Write-Ahead Log (WAL)          │   │
│  │  - Pending sync operations      │   │
│  │  - Conflict resolution queue    │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Offline Detection

```bash
# Monitor origin connectivity
edge-cli resilience monitor \
  --check-interval 5s \
  --failure-threshold 3 \
  --recovery-threshold 2 \
  --notify on-state-change
```

## Conflict Resolution (Ref: EC-R03)

When multiple edge nodes or the origin modify the same data, conflicts must be resolved deterministically.

### Resolution Strategies

| Strategy | Use Case | Trade-off |
|----------|----------|-----------|
| Last-write-wins (LWW) | Non-critical state | Simple, may lose updates |
| Version vectors | Collaborative editing | Complex, full history |
| CRDTs | Counter/set operations | Convergent, memory overhead |
| Custom resolver | Business-specific logic | Flexible, must implement |

### Conflict Resolution Engine

```yaml
conflict_resolution:
  default_strategy: "version-vector"
  rules:
    - resource: "user-profile"
      strategy: "merge-fields"
      priority_fields:
        - name: "email"
          strategy: "origin-wins"
        - name: "preferences"
          strategy: "deep-merge"
    - resource: "shopping-cart"
      strategy: "crdt-set"
      merge_on_reconnect: true
    - resource: "audit-log"
      strategy: "append-only"
      conflict_action: "reject-duplicate"
```

### Resolution Flow

```bash
# Detect and resolve conflicts
edge-cli sync conflicts resolve \
  --node edge-node-01 \
  --strategy auto \
  --dry-run

# Output:
# CONFLICTS_FOUND: 3
# RESOLVED: 2
# REQUIRES_MANUAL: 1
# DETAILS:
#   - user:123 email → origin-wins (auto)
#   - cart:456 items → crdt-merge (auto)
#   - config:789 timeout → manual-review
```

## Fallback to Origin

When an edge node cannot serve a request locally, it falls back to the origin with degraded performance.

### Fallback Hierarchy

```
Request → Edge Node
  ├── 1. Local Cache Hit → Serve immediately (< 5ms)
  ├── 2. Edge Peer Hit → Fetch from peer (< 20ms)
  ├── 3. Origin Fallback → Fetch from origin (< 200ms)
  └── 4. Static Fallback → Serve stale content (offline)
```

### Fallback Configuration

```yaml
fallback:
  levels:
    - name: "local-cache"
      timeout: 0ms
      on_miss: "edge-peer"
    - name: "edge-peer"
      timeout: 50ms
      on_miss: "origin"
    - name: "origin"
      timeout: 150ms
      on_miss: "stale-content"
    - name: "stale-content"
      max_staleness: 24h
      on_miss: "error"
```

### Stale-While-Revalidate

```bash
# Configure stale-while-revalidate policy
edge-cli cache policy set \
  --resource "/api/products/*" \
  --stale-while-revalidate 60s \
  --stale-if-error 300s
```

## Local-First Reads/Writes

All operations are performed locally first, then synchronized to the origin.

### Write Flow

```
Client Write → Local WAL → Acknowledge to Client
                              ↓
                         Background Sync
                              ↓
                         Origin Update
                              ↓
                         Confirm Sync
```

### Read Flow

```
Client Read → Local Store → Return to Client
                ↓ (async)
          Sync Check → Update if newer
```

### Implementation

```javascript
// Local-first write operation
async function localFirstWrite(key, value) {
  // 1. Write to local WAL
  const walEntry = await localDB.writeToWAL(key, value);
  
  // 2. Acknowledge to client immediately
  acknowledgeToClient(walEntry.id);
  
  // 3. Queue for background sync
  syncQueue.enqueue({
    type: 'write',
    key,
    value,
    timestamp: Date.now(),
    walEntryId: walEntry.id
  });
}
```

## Background Synchronization

Synchronization runs continuously in the background to reconcile local changes with the origin.

### Sync Strategies

| Strategy | When to Use | Bandwidth | Latency Impact |
|----------|-------------|-----------|----------------|
| Opportunistic | Low connectivity periods | Low | None |
| Scheduled | Predictable patterns | Medium | Low |
| Continuous | High-consistency needs | High | None |
| On-demand | Manual triggers | Variable | None |

### Sync Queue Management

```bash
# Monitor sync queue
edge-cli sync queue status --node edge-node-01

# Output:
# PENDING: 45
# IN_PROGRESS: 3
# COMPLETED: 12,847
# FAILED: 12
# OLDEST_PENDING: 2026-06-23T10:15:00Z
# ESTIMATED_COMPLETION: 2026-06-23T10:25:00Z
```

### Conflict Prevention

```bash
# Enable optimistic locking for concurrent writes
edge-cli sync config set \
  --node edge-node-01 \
  --optimistic-locking true \
  --retry-on-conflict 3
```

---
[Back to Edge Computing Profile](./README.md)
