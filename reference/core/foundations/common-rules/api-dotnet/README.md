# API Standard - .NET

> Bilingual navigation: [Espanol](./README.es.md)

This section defines the Evolith enterprise standard for .NET-based backend APIs. It is normative for reusable API architecture, bootstrap rules, application boundaries, persistence governance, observability, security, quality gates, and promotion criteria.

UMS is treated as an applied reference only. Product modules, concrete endpoints, tenant header names, domain aggregates, seeding rules, and implementation-specific persistence switches must remain in UMS unless promoted here through an ADR, standard, or canonical pattern.

## Documents

| Document | Purpose |
|---|---|
| [.NET API Standard](./api-dotnet-standard.md) | Normative standard for enterprise .NET APIs. |

## Authority boundary

| Concern | Evolith authority | UMS authority |
|---|---|---|
| API principles | Defines reusable backend rules | Applies or specializes with ADRs |
| Boilerplate | Defines stable module and layer boundaries | Demonstrates one concrete implementation |
| Persistence | Defines governance and quality expectations | Owns concrete DbContext, repositories, migrations, and providers |
| API surface | Defines REST/GraphQL responsibility rules | Owns concrete endpoints, schemas, and domain routes |
| Observability and resilience | Defines mandatory capabilities | Owns concrete logging, tracing, metrics, and runtime values |

## Promotion rule

A UMS API practice becomes an Evolith standard only when it is reusable, validated, documented here, and approved through the correct promotion path: ADR, governance standard, or canonical pattern.

---
[Back to Engineering Standards](../README.md)
