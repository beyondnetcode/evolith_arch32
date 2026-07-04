# Serverless Adoption, Operations, and Evolution Guide

> **Bilingual Navigation:** [Version en Espanol](./maturity.es.md)

## Adoption

Adopt this topology when isolated capabilities benefit from managed scaling, event triggers, or bursty workloads without introducing a separately owned service topology. Start with stateless handlers, explicit contracts, and bounded deployment packages.

## Operations

Operate one or more managed runtime environments. Monitor cold-start distribution, deployment package size, invocation rates, and concurrency limits as part of normal architecture validation.

## Security

Authorize access at the handler boundary. Enforce provider-neutral identity and secret management. Never embed credentials in deployment packages; use environment-injected, rotation-capable secrets.

## Resilience

Design handlers for idempotent retry, graceful degradation under concurrency pressure, and bounded initialization time. Prefer durable integration mechanisms before adding stateful infrastructure.

## Patterns and Anti-Patterns

Use stateless handlers, explicit input/output contracts, provider-neutral interfaces, and bounded cold-start initialization. Do not assume persistent local state, unbounded execution duration, or provider-specific runtime features.

## Evolution

Move a capability to serverless only when the operational profile (burst, event-driven, async) justifies the platform dependency. Preserve domain contracts and extraction readiness so that migration back or to another topology remains deliberate.

## Validation Checklist

- Validate the topology configuration against `topology.config.schema.json` and both fixtures.
- Run Native and OPA policy evaluation through the shared control plane.
- Confirm approved ADRs, bilingual guidance, and reproducible positive and negative tests.

---
[Back to Serverless Profile](./README.md)
