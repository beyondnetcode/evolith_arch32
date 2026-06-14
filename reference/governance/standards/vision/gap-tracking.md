# Evolith Core — Gap Tracking Board

> **Bilingual Navigation:** [Versión en Español](./gap-tracking.es.md)

**Status:** Active Tracking
**Owner:** Evolith Architecture Board
**Last Updated:** 2026-06-14
**Gap Details:** [Gap Reference Catalog](./gap-reference-catalog.md)

This board is the single source of truth for gap priority and status. Select a gap ID to open its problem statement, purpose, evidence, closure criteria, and references.


| ID | Gap | Component | Phase | Criticality | Complexity | Status |
|---|---|:---:|:---:|:---:|:---:|:---:|
| [`GT-78`](./gap-reference-catalog.md#gt-78) | Eliminar scripts de debug de la raíz del repositorio | `governance` | Cross | P2 | S | `PENDING` |
| [`GT-77`](./gap-reference-catalog.md#gt-77) | CoreDomainModule extraído de AppModule | `core-api` | Cross | P2 | S | `PENDING` |
| [`GT-76`](./gap-reference-catalog.md#gt-76) | PhaseTransitionUseCase expuesto en Core API | `core-api` | F1 | P1 | M | `PENDING` |
| [`GT-75`](./gap-reference-catalog.md#gt-75) | Paquete @evolith/infra-providers compartido | `cross` | Cross | P2 | M | `PENDING` |
| [`GT-74`](./gap-reference-catalog.md#gt-74) | ConfigModule con validación de env vars (Zod) | `core-api` | Cross | P1 | S | `PENDING` |
| [`GT-73`](./gap-reference-catalog.md#gt-73) | Tests Unit + Integration + E2E del Core API | `core-api` | Cross | P0 | L | `PENDING` |
| [`GT-72`](./gap-reference-catalog.md#gt-72) | Eliminar @ts-nocheck del application layer | `core-domain` | Cross | P0 | L | `PENDING` |
| [`GT-71`](./gap-reference-catalog.md#gt-71) | Circuit Breaker para llamadas a servicios externos | `core-api` | F3 | P2 | M | `PENDING` |
| [`GT-70`](./gap-reference-catalog.md#gt-70) | Graceful Shutdown y manejo de señales OS | `core-api` | Cross | P1 | S | `PENDING` |
| [`GT-69`](./gap-reference-catalog.md#gt-69) | Richardson Level 2 — HTTP Verbs y Status Codes | `core-api` | Cross | P1 | S | `PENDING` |
| [`GT-68`](./gap-reference-catalog.md#gt-68) | Versionado de API con estrategia URI | `core-api` | F3 | P2 | S | `PENDING` |
| [`GT-67`](./gap-reference-catalog.md#gt-67) | Especificación OpenAPI 3.1 completa | `core-api` | F2 | P1 | M | `PENDING` |
| [`GT-66`](./gap-reference-catalog.md#gt-66) | Distributed Tracing con OpenTelemetry | `core-api` | F3 | P1 | L | `PENDING` |
| [`GT-65`](./gap-reference-catalog.md#gt-65) | Prometheus Metrics + Health checks liveness/readiness | `core-api` | F2 | P1 | M | `PENDING` |
| [`GT-64`](./gap-reference-catalog.md#gt-64) | Structured Logging con Correlation ID | `core-api` | Cross | P0 | M | `PENDING` |
| [`GT-63`](./gap-reference-catalog.md#gt-63) | Auditoría y logging de seguridad (OWASP API9) | `core-api` | Cross | P1 | S | `PENDING` |
| [`GT-62`](./gap-reference-catalog.md#gt-62) | Autenticación API Key + JWT (OWASP API1/2/5) | `core-api` | F2 | P0 | L | `PENDING` |
| [`GT-61`](./gap-reference-catalog.md#gt-61) | Manejo de errores RFC 9457 Problem Details | `core-api` | Cross | P1 | S | `PENDING` |
| [`GT-60`](./gap-reference-catalog.md#gt-60) | Validación Global DTOs con class-validator (OWASP API3) | `core-api` | Cross | P0 | M | `PENDING` |
| [`GT-59`](./gap-reference-catalog.md#gt-59) | Hardening HTTP — Helmet + CORS + Rate Limiting (OWASP API4/8) | `core-api` | Cross | P0 | S | `PENDING` |
| [`GT-58`](./gap-reference-catalog.md#gt-58) | Clean up TODO stubs injected by Hexagonal Scaffolder | `core-domain` | Cross | P2 | S | `DONE` |
| [`GT-57`](./gap-reference-catalog.md#gt-57) | Incomplete MCP tooling and validation implementation | `smart-cli` | F2 | P1 | L | `DONE` |
| [`GT-56`](./gap-reference-catalog.md#gt-56) | Silent failures and missing mocks in CLI E2E tests | `smart-cli` | Cross | P1 | M | `DONE` |
| [`GT-55`](./gap-reference-catalog.md#gt-55) | TypeScript strictness and implicit any elimination | `smart-cli` | Cross | P1 | M | `DONE` |
| [`GT-54`](./gap-reference-catalog.md#gt-54) | Complete strict hexagonal boundary enforcement | `cross` | Cross | P2 | L | `DONE` |
| [`GT-53`](./gap-reference-catalog.md#gt-53) | Repair migrated product-vision references | `governance` | Cross | P2 | S | `DONE` |
| [`GT-52`](./gap-reference-catalog.md#gt-52) | Remove dead dependency-injection container stubs | `smart-cli` | Cross | P2 | S | `DONE` |
| [`GT-51`](./gap-reference-catalog.md#gt-51) | Build-versus-Compose gate evidence validation | `smart-cli` | F3 | P1 | M | `DONE` |
| [`GT-50`](./gap-reference-catalog.md#gt-50) | Enforce coverage thresholds in Jest configuration | `smart-cli` | F0 | P2 | S | `DONE` |
| [`GT-49`](./gap-reference-catalog.md#gt-49) | Enforce TypeScript strict mode and typed filesystem ports | `smart-cli` | Cross | P1 | M | `DONE` |
| [`GT-48`](./gap-reference-catalog.md#gt-48) | Restore the normative CLI coverage threshold | `smart-cli` | F0 | P0 | L | `DONE` |
| [`GT-47`](./gap-reference-catalog.md#gt-47) | Product documentation and release synchronization | `governance` | Cross | P1 | S | `DONE` |
| [`GT-46`](./gap-reference-catalog.md#gt-46) | Core HTTP service ownership boundary | `smart-cli` | F2 | P1 | M | `DONE` |
| [`GT-45`](./gap-reference-catalog.md#gt-45) | MCP transport and tool conformance suite | `smart-cli` | F2 | P1 | M | `DONE` |
| [`GT-44`](./gap-reference-catalog.md#gt-44) | Deterministic release pipeline integrity | `smart-cli` | F5 | P0 | M | `DONE` |
| [`GT-42`](./gap-reference-catalog.md#gt-42) | Cross-repository contract conformance | `governance` | Cross | P1 | M | `DONE` |
| [`GT-41`](./gap-reference-catalog.md#gt-41) | Automated maturity reconciliation | `governance` | Cross | P0 | M | `DONE` |
| [`GT-37`](./gap-reference-catalog.md#gt-37) | Evidence-gated semantic gap closure | `governance` | Cross | P0 | M | `DONE` |
| [`GT-36`](./gap-reference-catalog.md#gt-36) | Machine-readable rules language coverage | `governance` | Cross | P2 | L | `DONE` |
| [`GT-35`](./gap-reference-catalog.md#gt-35) | Automated inventories and tracking validation | `governance` | Cross | P1 | M | `DONE` |
| [`GT-34`](./gap-reference-catalog.md#gt-34) | Roadmap reprioritization around governance proof | `governance` | Product | P1 | S | `DONE` |
| [`GT-33`](./gap-reference-catalog.md#gt-33) | Evidence-backed maturity scoring | `governance` | Product | P1 | M | `DONE` |
| [`GT-29`](./gap-reference-catalog.md#gt-29) | Native/OPA rule execution parity | `core-domain` | F1 | P0 | L | `DONE` |
| [`GT-28`](./gap-reference-catalog.md#gt-28) | Restore CLI build, test, and smoke baseline | `smart-cli` | F0 | P0 | M | `DONE` |
| [`GT-27`](./gap-reference-catalog.md#gt-27) | Canonical tracking semantic consistency | `governance` | Cross | P0 | S | `DONE` |
| [`GT-26`](./gap-reference-catalog.md#gt-26) | Zero-Downtime Release Playbook | `governance` | Cross | P2 | S | `DONE` |
| [`GT-25`](./gap-reference-catalog.md#gt-25) | First provider profiles | `governance` | Cross | P2 | L | `DONE` |
| [`GT-24`](./gap-reference-catalog.md#gt-24) | Execute declared documentation migrations | `governance` | Cross | P2 | M | `DONE` |
| [`GT-23`](./gap-reference-catalog.md#gt-23) | Spanish translation backfill | `governance` | Cross | P2 | L | `DONE` |
| [`GT-22`](./gap-reference-catalog.md#gt-22) | ADR ID uniqueness scheme | `governance` | Cross | P2 | S | `DONE` |
| [`GT-21`](./gap-reference-catalog.md#gt-21) | Placement review of tool-centric Core ADRs | `governance` | Cross | P2 | M | `DONE` |
| [`GT-20`](./gap-reference-catalog.md#gt-20) | ADR content backfill to authoring standard | `governance` | Cross | P1 | L | `DONE` |
| [`GT-19`](./gap-reference-catalog.md#gt-19) | Incremental hexagonal migration of `core/` | `smart-cli` | Cross | P1 | L | `DONE` |
| [`GT-18`](./gap-reference-catalog.md#gt-18) | Publish `@evolith/smart-cli` to npm | `smart-cli` | F5 | P1 | S | `DONE` |
| [`GT-17`](./gap-reference-catalog.md#gt-17) | DI consolidation and strict boundaries | `smart-cli` | F5 | P1 | M | `DONE` |
| [`GT-16`](./gap-reference-catalog.md#gt-16) | Documentation consolidation | `governance` | F5 | P2 | S | `DONE` |
| [`GT-14`](./gap-reference-catalog.md#gt-14) | Outbound webhook on gate completion | `smart-cli` | F4 | P1 | S | `DONE` |
| [`GT-13`](./gap-reference-catalog.md#gt-13) | `evolith-phase-advance` proposal runner | `smart-cli` | F4 | P1 | M | `DONE` |
| [`GT-12`](./gap-reference-catalog.md#gt-12) | `--dry-run` on all write operations | `smart-cli` | F3 | P1 | S | `DONE` |
| [`GT-11`](./gap-reference-catalog.md#gt-11) | Phase 5 observability and rollback validation | `smart-cli` | F3 | P1 | M | `DONE` |
| [`GT-10`](./gap-reference-catalog.md#gt-10) | Phase 4 security scan content validation | `smart-cli` | F3 | P1 | M | `DONE` |
| [`GT-09`](./gap-reference-catalog.md#gt-09) | Phase 3 real coverage enforcement | `smart-cli` | F3 | P1 | S | `DONE` |
| [`GT-08`](./gap-reference-catalog.md#gt-08) | Phase 2 real ADR registry validation | `smart-cli` | F3 | P1 | S | `DONE` |
| [`GT-07`](./gap-reference-catalog.md#gt-07) | MCP gate-evaluation release smoke | `smart-cli` | F2 | P1 | S | `DONE` |
| [`GT-06`](./gap-reference-catalog.md#gt-06) | MCP tool `evolith-gate-evaluate` | `smart-cli` | F2 | P0 | M | `DONE` |
| [`GT-05`](./gap-reference-catalog.md#gt-05) | MCP SDK Streamable HTTP transport | `smart-cli` | F2 | P1 | M | `DONE` |
| [`GT-04`](./gap-reference-catalog.md#gt-04) | Remove service locator from domain | `core-domain` | F1 | P1 | S | `DONE` |
| [`GT-03`](./gap-reference-catalog.md#gt-03) | `EvaluateGateUseCase` and `gate evaluate` command | `core-domain` | F1 | P0 | M | `DONE` |
| [`GT-02`](./gap-reference-catalog.md#gt-02) | `GateEvidence` modeled in the domain layer | `core-domain` | F1 | P0 | M | `DONE` |
| [`GT-01`](./gap-reference-catalog.md#gt-01) | Unified contract ADR | `governance` | F0 | P0 | S | `DONE` |

**Progress:** 50 / 70 done · 0 in progress · 20 pending · 0 deferred

**Ordering:** criticality (`P0` → `P1` → `P2`), active status (`IN-PROGRESS` → `DONE` → `DEFERRED`), then complexity (`S` → `M` → `L`). Completed gaps follow active work.

---
[Back to Vision Index](./README.md)
