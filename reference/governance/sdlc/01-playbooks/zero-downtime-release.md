# Zero-Downtime Release Playbook

> **Bilingual Navigation:** [Versión en Español](./zero-downtime-release.es.md)

**Phase:** [05 — Delivery and Operations](../README.md#phase-05-delivery-and-operations)
**Primary Audience:** DevOps, SRE, Tech Leads
**Status:** Approved

This playbook defines the mandatory operational procedures for deploying release candidates (RCs) into production environments with zero perceived downtime for end-users. All Evolith satellites must adhere to these practices during SDLC Phase 5.

---

## 1. Zero-Downtime Constraints

A release is only considered "zero-downtime" if no end-user requests are dropped, timed out, or served with unexpected error codes during the transition.

### 1.1 Database Backward Compatibility (The Two-Phase Deployment)
Database schemas must not break existing application instances that are currently processing traffic.
- **Phase 1 (Schema Only):** Apply additive schema migrations (new columns, new tables, new indexes). No dropping of columns or renaming of tables in use.
- **Phase 2 (Code Deployment):** Deploy the new application version that uses the new schema.
- **Phase 3 (Cleanup):** *Optional, in a subsequent release.* Remove abandoned columns or tables once all old application instances are terminated.

### 1.2 Backward-Compatible API Contracts
APIs must accept both old and new payload structures during the transition window.
- Never introduce breaking contract changes (e.g., removing a required field) without versioning the endpoint first.
- If a client relies on an existing endpoint, the new deployment must support the legacy schema for the duration of the deployment window.

### 1.3 Graceful Shutdowns
Applications must gracefully handle `SIGTERM` signals from the orchestration platform.
- Stop accepting new requests immediately.
- Drain existing requests (allow them to finish processing up to a defined timeout, e.g., 30 seconds).
- Close database connections safely before exiting.

---

## 2. Deployment Strategies

Evolith mandates one of two deployment strategies for zero-downtime operations: Blue-Green or Canary.

### 2.1 Blue-Green Deployment
The safest strategy for comprehensive updates, swapping traffic entirely from the old version to the new version at the load balancer or service mesh level.
1. **Provision Green:** Spin up the completely new environment ("Green") alongside the current production environment ("Blue").
2. **Smoke Test:** Run automated smoke tests against the Green environment (internal traffic only).
3. **Traffic Cutover:** Switch 100% of the production load balancer traffic from Blue to Green.
4. **Validation:** Monitor Green for anomalies.
5. **Decommission Blue:** If Green is stable after the defined monitoring window, destroy the Blue environment.

### 2.2 Canary Deployment
The preferred strategy for high-throughput or highly-sensitive endpoints, minimizing blast radius by bleeding traffic gradually.
1. **Deploy Canary:** Deploy a small subset of new pods/instances (e.g., 5% capacity).
2. **Traffic Bleed:** Route a small percentage of real user traffic (e.g., 1-5%) to the Canary.
3. **Validation Window:** Monitor the Canary's error rates, latency, and logs against the baseline for a set period (e.g., 10 minutes).
4. **Scale Up:** Incrementally increase traffic (e.g., 10% → 25% → 50% → 100%) as confidence grows.
5. **Full Cutover:** Terminate the old instances once 100% of traffic is successfully served by the Canary.

---

## 3. Observability Checkpoints

The outcome of these checkpoints is recorded in the [Observability Validation artifact](../04-artifact-templates/observability-validation-template.md) (mandatory evidence for the Production Live gate). Before, during, and after the traffic cutover, the following telemetry must be monitored using the stack mandated by `core/ADR-0046` and `nodejs/ADR-0007`:

- **Error Rates (HTTP 5xx):** Must not spike above the pre-deployment baseline.
- **Latency (p95 and p99):** Must remain within the agreed-upon Service Level Objectives (SLOs).
- **Log Anomalies:** Watch for `ERROR` or `FATAL` severity logs containing stack traces or unhandled exceptions unique to the new release.
- **System Health:** CPU, memory, and database connection pools must remain stable without aggressive throttling or OOM (Out of Memory) kills.

---

## 4. Rollback Triggers

Rollbacks must be instantaneous and non-destructive. If any of the following triggers are met during the observation window, the release must be immediately aborted, and traffic routed back to the old instances.

### 4.1 Automated Triggers
- **Error Budget Burn:** HTTP 5xx errors increase by >1% over a 2-minute rolling window.
- **Latency Spikes:** p95 latency degrades by >20% for more than 3 consecutive minutes.
- **Health Check Failures:** The orchestration platform detects failing liveness/readiness probes on >10% of the new instances.

### 4.2 Manual Triggers
- **Critical Business Alerts:** Drop in successful business transactions (e.g., login success rate drops abruptly).
- **Data Corruption:** Suspected data poisoning or invalid payloads being written to the persistent store.
- **Security Incidents:** Discovery of an exposed vulnerability or active exploit path during the rollout.

If a rollback is triggered, the release is considered failed. A blameless post-mortem must be conducted before the RC can be rebuilt and redeployed.

---
[Back to SDLC Governance Center](../README.md)
