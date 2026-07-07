# Evolith Core API — Changelog

All notable changes to the Evolith Core API will be documented in this file. This project adheres to Semantic Versioning and matches the deprecation/sunset timelines defined by [ADR-0098](../../../reference/core/architecture/adrs/core/0098-rest-uri-versioning-deprecation-policy.md).

> **Bilingual Navigation:** [Versión en Español](./changelog.es.md)

---

## [1.1.0] - 2026-06-21

### Features
- **Envelope Conformance (GT-155):** Brought all REST controllers into conformance with the unified `{success, data, meta}` output envelope defined in [ADR-0073](../../../reference/core/architecture/adrs/core/0073-unified-cli-output-contract.md).
- **URI Versioning (GT-159):** Configured NestJS URI versioning and explicitly decorated all REST controllers to serve under `/api/v1/` routes.
- **Deprecation Lifecycle (GT-159):** Added a global `@Deprecated()` route decorator and interceptor that dynamically injects `Deprecation` and `Sunset` headers per RFC 8594 and RFC 9745.

---

## [1.0.0] - 2026-06-15

### Features
- **Initial Core REST Surface:** Exposed ruleset retrieval, gate evaluations, and phase transition use cases as versioned NestJS routes.
- **Global Pipes & Filters:** Wired up global validation pipes and RFC 9457 Problem Details error filtering.
