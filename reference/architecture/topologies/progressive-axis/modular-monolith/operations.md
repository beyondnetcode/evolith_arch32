# Modular Monolith — Operations Guide

> **Bilingual Navigation:** [English](./operations.md) | [Español](./operations.es.md)

**Owner:** Architecture Board
**Topology:** Modular Monolith

---

## Single Deployment Unit

The modular monolith deploys as a single artifact. All modules ship together, but runtime isolation ensures one module's failure does not cascade. The deployment pipeline treats the monolith as a cohesive unit while preserving module-level observability.

- **Artifact:** Single container image or binary containing all modules
- **Startup order:** Modules initialize independently; shared infrastructure (connection pools, caches) initializes first
- **Health check:** Application-level liveness probe validates all module endpoints; readiness probe validates external dependencies

## Module Health Checks

Each module exposes a health endpoint that reports its internal state. Aggregation occurs at the application boundary.

```
GET /health/modules/{module-id}  → { status, latency, dependencies }
GET /health/aggregate            → { overall, modules[] }
```

- Module health is **not** exposed externally; only the aggregate endpoint is public
- Circuit breakers trip when a module's health degrades beyond threshold
- Health checks include database connectivity, message broker reachability, and in-memory cache warmth

## Database-per-Module Monitoring

Each module owns its schema or database instance. Monitoring tracks per-module resource consumption.

- Query latency per module (p50, p95, p99)
- Connection pool utilization per module
- Migration status tracking (pending, applied, failed)
- Schema drift detection across environments

**Alerting thresholds:**

| Metric | Warning | Critical |
|--------|---------|----------|
| Query p99 latency | > 200ms | > 500ms |
| Connection pool usage | > 70% | > 90% |
| Migration lag | > 1 pending | > 3 pending |

## Deployment Pipeline

The pipeline enforces module-level quality gates before promoting to production.

1. **Build:** Compile all modules, run module-level unit tests in parallel
2. **Integration:** Run cross-module contract tests (MM-R05 boundaries)
3. **Staging:** Deploy to staging; run integration test suite
4. **Production:** Blue-green deployment; smoke test aggregate health
5. **Rollback:** Automated rollback if aggregate health degrades within 10-minute window

Each stage must pass for the pipeline to proceed. Module-level test failures block only that module's tests; cross-module failures block the entire pipeline.

## Structured Logging

All modules emit structured logs with a correlation ID that traces requests across module boundaries.

```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "level": "error",
  "module": "order-management",
  "correlation_id": "req-abc-123",
  "message": "Payment validation failed",
  "context": { "order_id": "ORD-456", "user_id": "USR-789" }
}
```

- Correlation IDs are generated at the API gateway and propagated through all module calls
- Log levels follow: DEBUG → INFO → WARN → ERROR → FATAL
- Sensitive data (PII, credentials) must never appear in structured logs (MM-R08)

## Incident Response

When an incident occurs, the modular monolith provides clear isolation boundaries.

- **Module-scoped incidents:** Isolate the affected module; other modules continue serving traffic
- **Cross-module incidents:** Escalate to architecture board; evaluate circuit breaker effectiveness
- **Data incidents:** Per-module data ownership simplifies blast radius assessment
- **Recovery:** Module-level restart without full application restart when possible

**Escalation path:** Module team → Platform team → Architecture Board → Incident Commander

---

[Back to Modular Monolith Profile](./README.md)
