# Core API SLO

<!-- doc-check: ignore -->
<!-- eslint-disable -->

> **Status:** Draft | **Owner:** Platform Engineering | **Last Updated:** 2026-06-23

## Overview

Service Level Objectives for Evolith Core API services. These SLOs define the reliability and performance targets that the platform commits to.

## SLO Definitions

### Availability SLO

| Metric | Target | Window | Measurement |
|--------|--------|--------|-------------|
| Availability | 99.9% | Rolling 30 days | `sum(evolith_http_requests_total{status!~"5.."}[30d]) / sum(evolith_http_requests_total[30d])` |
| Error Budget | 0.1% (43.8 min/month) | Rolling 30 days | Derived from availability |

### Latency SLO

| Metric | Target | Window | Measurement |
|--------|--------|--------|-------------|
| p99 Latency | < 200ms | Rolling 30 days | `histogram_quantile(0.99, sum by (le) (rate(evolith_http_request_duration_seconds_bucket[5m])))` |
| p95 Latency | < 100ms | Rolling 30 days | `histogram_quantile(0.95, sum by (le) (rate(evolith_http_request_duration_seconds_bucket[5m])))` |
| p50 Latency | < 50ms | Rolling 30 days | `histogram_quantile(0.50, sum by (le) (rate(evolith_http_request_duration_seconds_bucket[5m])))` |

### Error Rate SLO

| Metric | Target | Window | Measurement |
|--------|--------|--------|-------------|
| 5xx Error Rate | < 0.1% | Rolling 30 days | `sum(rate(evolith_http_requests_total{status=~"5.."}[5m])) / sum(rate(evolith_http_requests_total[5m]))` |
| 4xx Error Rate | < 5% | Rolling 30 days | `sum(rate(evolith_http_requests_total{status=~"4.."}[5m])) / sum(rate(evolith_http_requests_total[5m]))` |

## Error Budget Policy

| Budget Remaining | Action |
|------------------|--------|
| > 25% | Normal operations, feature releases proceed |
| 10% - 25% | Increased review scrutiny, additional testing required |
| < 10% | Freeze on non-critical changes, incident review mandatory |
| 0% | Hard freeze, all effort toward reliability improvement |


## Tenant dimension (GT-548)

Governance metrics (`evolith_gate_evaluations_total`, `evolith_agent_runs_total`) carry a
**bounded** `tenant` label. Only tenants listed in `EVOLITH_METRICS_TENANT_ALLOWLIST`
(comma-separated, hard-capped at 100) get their own series; every other tenant — and any
unset one — collapses to `tenant="other"`. Cardinality is therefore bounded to
`|allowlist| + 1`, so per-tenant scorecards are derivable without unbounded TSDB growth.
The "Gate evaluations /s by tenant" panel (Governance Health dashboard) filters on the
`$tenant` template variable.

## Alerting Integration

Alerts are defined in `product/operations/alerts/prometheus-alerts.yml`. Key alerts:

- `HighErrorRate` — triggers when 5xx rate exceeds 1% for 5 minutes
- `HighLatency` — triggers when p99 exceeds 500ms for 5 minutes
- `PodRestart` — triggers when a pod restarts more than 3 times in 1 hour

## Dashboards

SLO dashboards are provisioned via Grafana and should track:

- Burn rate (1h, 6h, 24h windows)
- Error budget remaining
- SLI trend graphs per service

---

[Back to Upper Level](../README.md)
