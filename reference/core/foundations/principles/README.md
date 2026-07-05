# Evolith Core — Architecture Principles

> **Bilingual navigation:** [Versión en Español](./README.es.md)

**Classification:** Core Architecture Principles  
**Owner:** Evolith Architecture Board

This area contains universal, provider-neutral architecture principles that apply across all Evolith products and satellite implementations.

## Current Migration Targets

- Provider Abstraction and Plugin Model
- Anti-Corruption Layer principles
- Evidence integrity and lineage principles
- Human accountability and agent-boundary principles
- Tenant isolation and provider-neutrality principles

## Boundary

A Core principle must remain valid if any named product, provider, model, or tool is replaced. Product implementation details belong in `product/products/`; named technologies belong in `product/infra/`.

[Back to Architecture](../README.md)
