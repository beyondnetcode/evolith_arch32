# Modular Monolith — Runbooks Guide

> **Bilingual Navigation:** [English](./runbooks.md) | [Español](./runbooks.es.md)

**Owner:** Architecture Board
**Topology:** Modular Monolith

---

## Runbook 1: Module Scaling

**Trigger:** Module CPU/memory utilization exceeds 80% for 5+ minutes; request latency p99 exceeds 300ms.

**Steps:**

1. Identify the affected module via aggregate health dashboard
2. Check module-specific metrics (query latency, connection pool usage, thread pool saturation)
3. If single module is hot: scale the monolith horizontally; all modules scale together
4. If module has database bottleneck: check for slow queries, missing indexes, connection pool exhaustion
5. If scaling is insufficient: evaluate module extraction to F2 for independent scaling

**Escalation:** If horizontal scaling does not resolve within 15 minutes, escalate to Architecture Board.

**Post-incident:** Document scaling limits; evaluate if module is extraction candidate.

## Runbook 2: Schema Migration

**Trigger:** Module schema migration fails or causes performance degradation.

**Steps:**

1. Check migration status: `npm run db:migration:status --module={module}`
2. If migration is stuck: verify database connectivity and lock status
3. If migration caused degradation: rollback migration using module-specific rollback script
4. If data corruption detected: activate point-in-time recovery for the affected module's database
5. Verify module health after recovery; check dependent modules for cascading issues

**Rollback procedure:**

```bash
# Rollback last migration for specific module
npm run db:migration:rollback --module={module} --target={previous_version}

# Verify rollback
npm run db:migration:status --module={module}
npm run health:module --module={module}
```

**Prevention:** Always test migrations in staging; use backward-compatible migrations; maintain rollback scripts.

## Runbook 3: Module Failure Isolation

**Trigger:** Single module reports repeated failures; other modules remain healthy.

**Steps:**

1. Confirm which module is failing via health endpoints
2. Check circuit breaker status for the failing module
3. If circuit breaker is open: verify dependent modules are degrading gracefully
4. If module is crash-looping: check logs for root cause; restart module process
5. If module database is down: failover to replica; check data consistency
6. If failure is persistent: isolate module; redirect traffic to degraded mode

**Degradation mode:** Non-critical features disabled; core operations continue; users notified of reduced functionality.

## Runbook 4: Database Recovery

**Trigger:** Module database becomes unavailable or corrupted.

**Steps:**

1. Identify affected module and database instance
2. Check database health: connectivity, replication lag, disk space
3. If primary is down: promote read replica to primary
4. If data corruption: restore from last known good backup
5. Verify module can connect to recovered database
6. Run data consistency checks for the affected module
7. Notify dependent modules of recovery; verify circuit breakers close

**Recovery time objective (RTO):** 30 minutes for module database recovery.
**Recovery point objective (RPO):** Maximum 5 minutes of data loss.

## Runbook 5: Deployment Rollback

**Trigger:** Production deployment causes failures; aggregate health degrades within 10-minute window.

**Steps:**

1. Monitor aggregate health dashboard for degradation pattern
2. If degradation detected within 10 minutes: trigger automated rollback
3. If automated rollback fails: manual rollback to previous version
4. Verify all module health endpoints return healthy status
5. Check deployment logs for root cause of failure
6. Notify Architecture Board; schedule post-mortem

**Rollback procedure:**

```bash
# Automated rollback (preferred)
npm run deploy:rollback --env=production

# Manual rollback (if automated fails)
npm run deploy:rollback --env=production --version={previous_version}

# Verify rollback
npm run health:aggregate
npm run test:smoke --env=production
```

**Post-rollback:** Block deployment until root cause identified and fixed; re-run full CI pipeline before re-attempting deployment.

---

[Back to Modular Monolith Profile](./README.md)
