# Operations & Observability

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

This directory contains the operational configuration and observability stack for the progressive architecture reference. All components are OSS, self-hosted, and vendor-neutral per [ADR-0028](../architecture/adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.md).

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

| File | Purpose |
| :--- | :--- |
| [otel/otel-collector-config.yaml](./otel/otel-collector-config.yaml) | OTel Collector pipeline: receivers, processors, exporters |
| [tempo/tempo.yaml](./tempo/tempo.yaml) | Tempo backend configuration |
| [grafana/provisioning/datasources/datasources.yml](./grafana/provisioning/datasources/datasources.yml) | Auto-provisioned Grafana datasources (Tempo, Loki) |

---

## Verifying Traces

1. Run the API and make any authenticated request.
2. Copy the `traceId` from the structured JSON log output.
3. Open `http://localhost:3001` → Explore → Tempo → paste the `traceId`.
4. The full span tree (Kong → BFF → CoreAPI → PostgreSQL) appears.

---

[Back to Repository Root](../README.md)
