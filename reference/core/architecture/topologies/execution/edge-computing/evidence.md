# Edge Computing — Evidence Guide

> **Bilingual Navigation:** [English](./evidence.md) | [Español](./evidence.es.md)

**Owner:** Platform Engineering
**Topology:** Edge Computing

## Validation Commands

Execute these commands to validate edge computing performance and compliance.

### Health Check

```bash
# Validate edge node health
edge-cli health check --node edge-node-01 --verbose

# Output:
# NODE: edge-node-01
# STATUS: healthy
# UPTIME: 14d 6h 32m
# CPU: 45%
# MEMORY: 62%
# DISK: 38%
# NETWORK: 12ms avg latency
# LAST_SYNC: 2s ago
```

### Fleet Status

```bash
# Check fleet-wide status
edge-cli fleet status --format table

# Output:
# NODE           STATUS    UPTIME    CPU    MEMORY  DISK    LATENCY
# edge-node-01   healthy   14d       45%    62%     38%     12ms
# edge-node-02   healthy   7d        52%    71%     45%     15ms
# edge-node-03   degraded  3d        78%    85%     62%     28ms
# edge-node-04   healthy   14d       38%    55%     41%     11ms
```

## Latency Validation (200ms Budget)

Validate that all requests complete within the 200ms latency budget.

### Latency Test

```bash
# Run latency validation test
edge-cli latency test \
  --samples 1000 \
  --target 200ms \
  --percentile p99 \
  --output results.json

# Output:
# SAMPLES: 1000
# TARGET: 200ms
# P50: 45ms
# P90: 120ms
# P95: 165ms
# P99: 185ms
# MAX: 198ms
# STATUS: PASS
```

### Latency Breakdown

```bash
# Analyze latency breakdown
edge-cli latency breakdown --sample last-1000

# Output:
# SEGMENT                P50     P90     P95     P99
# DNS Resolution         8ms     12ms    15ms    18ms
# TLS Handshake          25ms    35ms    40ms    45ms
# Edge Processing        12ms    25ms    35ms    48ms
# Cache Miss (p95)       0ms     0ms     0ms     0ms
# Transfer               5ms     8ms     10ms    12ms
# TOTAL                  50ms    80ms    100ms   123ms
```

### Continuous Monitoring

```bash
# Set up continuous latency monitoring
edge-cli latency monitor \
  --interval 60s \
  --alert-threshold 180ms \
  --page-threshold 200ms \
  --notify slack
```

## Cache Hit Rates

Validate cache efficiency across the edge fleet.

### Cache Statistics

```bash
# Check cache hit rates
edge-cli cache stats --fleet-wide

# Output:
# NODE           HIT_RATE  MISS_RATE  EVICTIONS  SIZE
# edge-node-01   94.2%     5.8%       12,450     2.3Gi
# edge-node-02   91.8%     8.2%       15,230     2.1Gi
# edge-node-03   88.5%     11.5%      18,920     1.8Gi
# edge-node-04   95.1%     4.9%       10,840     2.4Gi
# FLEET AVG      92.4%     7.6%       14,360     2.15Gi
```

### Cache Performance

```bash
# Analyze cache performance by content type
edge-cli cache analysis --content-type --period 24h

# Output:
# CONTENT_TYPE      HIT_RATE  AVG_SIZE  EVICTION_RATE
# static/assets     98.5%     45KB      2.1%
# api/responses     85.2%     12KB      8.5%
# dynamic/pages     72.8%     28KB      15.2%
# media/images      96.3%     150KB     3.8%
```

## Offline Availability

Validate that edge nodes continue operating when disconnected from origin.

### Offline Test

```bash
# Simulate origin disconnection
edge-cli offline test \
  --node edge-node-01 \
  --duration 300s \
  --check-availability

# Output:
# NODE: edge-node-01
# DURATION: 300s (5 minutes)
# AVAILABILITY: 99.98%
# REQUESTS_SERVED: 12,847
# ERRORS: 3
# CACHE_HITS: 12,844
# CACHE_MISSES: 0
# STATUS: PASS
```

### Offline Duration Test

```bash
# Test extended offline operation
edge-cli offline stress-test \
  --node edge-node-01 \
  --duration 3600s \
  --traffic-rate 1000rps

# Output:
# NODE: edge-node-01
# DURATION: 3600s (1 hour)
# AVAILABILITY: 99.95%
# REQUESTS_SERVED: 3,600,000
# ERRORS: 1,800
# CACHE_HITS: 3,598,200
# CACHE_MISSES: 0
# MEMORY_USAGE: 78% (stable)
# DISK_USAGE: 42% (stable)
# STATUS: PASS
```

## Sync Success Rate

Validate that synchronization between edge nodes and origin succeeds consistently.

### Sync Statistics

```bash
# Check sync success rates
edge-cli sync stats --fleet-wide --period 24h

# Output:
# NODE           SYNC_ATTEMPTS  SUCCESS  FAILED  CONFLICTS  SUCCESS_RATE
# edge-node-01   1,245          1,243    2       1          99.84%
# edge-node-02   1,180          1,175    5       3          99.58%
# edge-node-03   980            975      5       2          99.49%
# edge-node-04   1,320          1,318    2       0          99.85%
# FLEET TOTAL    4,725          4,711    14      6          99.70%
```

### Sync Performance

```bash
# Analyze sync performance metrics
edge-cli sync performance --period 7d

# Output:
# METRIC                  VALUE
# AVG_SYNC_TIME           2.3s
# P95_SYNC_TIME           5.8s
# P99_SYNC_TIME           12.4s
# AVG_CONFLICT_RESOLVE    45ms
# SYNC_QUEUE_DEPTH        23 (avg)
# SYNC_FAILURE_RATE       0.3%
# RETRY_SUCCESS_RATE      98.5%
```

### Conflict Resolution Success

```bash
# Check conflict resolution success rates
edge-cli sync conflicts stats --period 24h

# Output:
# TOTAL_CONFLICTS: 47
# AUTO_RESOLVED: 44
# MANUAL_REQUIRED: 3
# RESOLUTION_RATE: 93.6%
# AVG_RESOLUTION_TIME: 120ms
# STRATEGIES_USED:
#   - last-write-wins: 28
#   - version-vector: 12
#   - crdt-merge: 4
#   - custom: 3
```

## Compliance Validation

### Data Residency Compliance

```bash
# Validate data residency compliance
edge-cli compliance residency --fleet-wide

# Output:
# REGION         COMPLIANCE  VIOLATIONS  REMEDIATED
# eu-west-1      100%        0           -
# us-west-2      100%        0           -
# ap-southeast-1 100%        0           -
# FLEET          100%        0           -
```

### Security Compliance

```bash
# Validate security compliance
edge-cli compliance security --fleet-wide

# Output:
# CHECK                          STATUS
# mTLS Enabled                  PASS
# Certificates Valid            PASS
# Firewall Rules Enforced       PASS
# Secrets Rotated               PASS
# Encryption at Rest            PASS
# Network Segmentation          PASS
# OVERALL                       PASS
```

---
[Back to Edge Computing Profile](./README.md)
