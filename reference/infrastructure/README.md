# Infrastructure & Orchestration

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

This directory contains Docker Compose configuration and gateway declarative config for local development. Infrastructure complexity scales with the architectural phase — do not start all services on Phase 1.

## Goal and Objectives

> **Goal:** let any engineer run the reference platform locally with exactly the infrastructure their architectural phase requires — no more, no less.

**Objectives:**

- Map every local service (database, cache, broker, gateway, secrets) to the phase that justifies it.
- Provide copy-paste startup commands for Phase 1 minimal and Phase 2+ full stacks.
- Keep each service decision traceable to its governing ADR.

---

## Phase-Based Service Map

| Service | Phase Required | Role |
| :--- | :--- | :--- |
| **PostgreSQL** | Phase 1 (mandatory) | Primary relational database |
| **Redis** | Phase 1 (optional, add when latency demands it) | Distributed cache — [ADR-0014](../architecture/adrs/core/0014-multi-layer-distributed-caching-strategy.md) |
| **RabbitMQ** | Phase 2+ | Async message broker — [ADR-0015](../architecture/adrs/core/0015-event-driven-architecture-intra-domain.md) |
| **Traefik Proxy** | Phase 2+ | Edge API gateway — [ADR-0030](../architecture/adrs/core/0030-two-tier-distributed-gateway-model.md) |
| **HashiCorp Vault** | Phase 2+ | Secrets management — [ADR-0028](../architecture/adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.md) |

> **Phase 1 rule:** Start with PostgreSQL only. Add Redis when a specific P95 latency threshold is breached. Add Kong and RabbitMQ only when a second client channel or cross-service async delivery is needed.

---

## Phase 1 — Minimal Startup

```bash
# Start only the Phase 1 minimum
docker-compose -f reference/infrastructure/docker-compose.yml up -d postgres

# Optional: add Redis if cache is needed
docker-compose -f reference/infrastructure/docker-compose.yml up -d postgres redis
```

## Phase 2+ — Full Stack

```bash
# Start all services
docker-compose -f reference/infrastructure/docker-compose.yml up -d
```

## Verify Running Services

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

---

## Service Ports

| Service | Port |
| :--- | :--- |
| PostgreSQL | `5432` |
| Redis | `6379` |
| RabbitMQ (AMQP) | `5672` |
| RabbitMQ (Management UI) | `15672` |
| Traefik (Proxy) | `8000` |
| Traefik (Dashboard) | `8080` |
| HashiCorp Vault | `8200` |

---

## Configuration Files

| File | Purpose |
| :--- | :--- |
| `docker-compose.yml` | Main orchestration file |
| `traefik-dynamic.yml` | Traefik Proxy declarative (db-less) configuration |

---

[Back to Repository Root](../README.md)
