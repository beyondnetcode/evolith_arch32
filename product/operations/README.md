# Operations & Observability

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

This directory contains the operational configuration and observability stack for the progressive architecture reference. All components are OSS, self-hosted, and vendor-neutral per [ADR-0028](../architecture/adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.md).

## Goal and Objectives

> **Goal:** make the reference platform observable and operable locally with a fully OSS, vendor-neutral stack.

**Objectives:**

- Provide a ready-to-run observability stack (OpenTelemetry, Grafana, Tempo, Loki) with one command.
- Keep every operational component traceable to the ADR that governs it.
- Document the verification path from an application request to its full distributed trace.

---

## Observability Stack

| Component | Role | Local Port |
| :--- | :--- | :--- |
| **OpenTelemetry Collector** | Receives traces and logs from all services, fans out to backends | — |
| **Grafana** | Dashboards, log queries (Loki), trace exploration | `3001` |
| **Tempo** | Distributed tracing backend (stores spans) | `3200` |
| **Loki** | Log aggregation backend | `3100` |

The full instrumentation strategy is defined in [ADR-0007](../architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.md).

---

## Starting the Observability Stack

```bash
# From repository root — starts OTel, Grafana, Tempo, Loki
docker-compose -f reference/infrastructure/docker-compose.yml up -d otel-collector grafana tempo loki

# Verify Grafana is reachable
open http://localhost:3001   # default credentials: admin / admin
```

To view distributed traces: open Grafana → Explore → select **Tempo** datasource → paste a `traceId` from application logs.

---

## Configuration Files

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [otel-collector-config.yaml](./otel/otel-collector-config.yaml) | OTel Collector pipeline: receivers, processors, exporters | Route telemetry to backends | Configuration file | Yes |
| [tempo.yaml](./tempo/tempo.yaml) | Tempo backend configuration | Configure the tracing backend | Configuration file | Yes |
| [datasources.yml](./grafana/provisioning/datasources/datasources.yml) | Auto-provisioned Grafana datasources (Tempo, Loki) | Provision dashboards automatically | Configuration file | Yes |
| [Agentic CI and RAG Support](./agentic-ci-rag-support.md) | Gemini/Winston review and RAG index support runbook | Operate AI-assisted CI safely | Support runbook | Yes |
| [Data Store Backup & DR](./data-store-backup-dr.md) | Backup and disaster-recovery procedures for PostgreSQL, MongoDB, MinIO, OpenBao | Recover from data loss without ad-hoc archeology | DR runbook | Yes |
| [Prometheus Alerting Rules](./alerts/prometheus-alerts.yml) | Infrastructure-level alert rules (service-down, CPU, disk, error rate) | Page on-call before problems reach users | Alert rules | Yes |
| [Core API SLO](./slo/core-api-slo.md) | Service-level objectives and error budgets for the Core API | Hold the Core API to explicit reliability targets | SLO definition | Yes |

---

## Verifying Traces

1. Run the API and make any authenticated request.
2. Copy the `traceId` from the structured JSON log output.
3. Open `http://localhost:3001` → Explore → Tempo → paste the `traceId`.
4. The full span tree (Traefik → BFF → CoreAPI → PostgreSQL) appears.

---

[Back to Repository Root](../README.md)
