# Evolith Core — Gap Tracking Board

> **Bilingual Navigation:** [Versión en Español](./gap-tracking.es.md)

**Status:** Active Tracking
**Owner:** Evolith Architecture Board
**Last Updated:** 2026-06-14
**Gap Details:** [Gap Reference Catalog](./gap-reference-catalog.md)

This board is the single source of truth for gap priority and status. Select a gap ID to open its problem statement, purpose, evidence, closure criteria, and references.


| ID | Gap | Component | Phase | Criticality | Complexity | Status |
|---|---|:---:|:---:|:---:|:---:|:---:|
| [`GT-70`](./gap-reference-catalog.md#gt-70) | Graceful Shutdown y manejo de señales OS | `BFF API` | Cross | P1 | S | `PENDING` |
| [`GT-69`](./gap-reference-catalog.md#gt-69) | Richardson Level 2 — HTTP Verbs y Status Codes | `BFF API` | Cross | P1 | S | `PENDING` |
| [`GT-63`](./gap-reference-catalog.md#gt-63) | Auditoría y logging de seguridad (OWASP API9) | `BFF API` | Cross | P1 | S | `PENDING` |
| [`GT-61`](./gap-reference-catalog.md#gt-61) | Manejo de errores RFC 9457 Problem Details | `BFF API` | Cross | P1 | S | `PENDING` |
| [`GT-76`](./gap-reference-catalog.md#gt-76) | PhaseTransitionUseCase expuesto en Core API | `BFF API` | F1 | P1 | M | `PENDING` |
| [`GT-67`](./gap-reference-catalog.md#gt-67) | Especificación OpenAPI 3.1 completa | `BFF API` | F2 | P1 | M | `PENDING` |
| [`GT-65`](./gap-reference-catalog.md#gt-65) | Prometheus Metrics + Health checks liveness/readiness | `BFF API` | F2 | P1 | M | `PENDING` |
| [`GT-66`](./gap-reference-catalog.md#gt-66) | Distributed Tracing con OpenTelemetry | `BFF API` | F3 | P1 | L | `PENDING` |
| [`GT-68`](./gap-reference-catalog.md#gt-68) | Versionado de API con estrategia URI | `BFF API` | F3 | P2 | S | `PENDING` |
| [`GT-75`](./gap-reference-catalog.md#gt-75) | Paquete @evolith/infra-providers compartido | `Cross` | Cross | P2 | M | `PENDING` |
| [`GT-71`](./gap-reference-catalog.md#gt-71) | Circuit Breaker para llamadas a servicios externos | `BFF API` | F3 | P2 | M | `PENDING` |
| [`GT-59`](./gap-reference-catalog.md#gt-59) | Hardening HTTP — Helmet + CORS + Rate Limiting (OWASP API4/8) | `BFF API` | Cross | P0 | S | `DONE` |
| [`GT-27`](./gap-reference-catalog.md#gt-27) | Canonical tracking semantic consistency | `Governance` | Cross | P0 | S | `DONE` |
| [`GT-01`](./gap-reference-catalog.md#gt-01) | Unified contract ADR | `Governance` | F0 | P0 | S | `DONE` |
| [`GT-60`](./gap-reference-catalog.md#gt-60) | Validación Global DTOs con class-validator (OWASP API3) | `BFF API` | Cross | P0 | M | `DONE` |
| [`GT-64`](./gap-reference-catalog.md#gt-64) | Structured Logging con Correlation ID | `BFF API` | Cross | P0 | M | `DONE` |
| [`GT-44`](./gap-reference-catalog.md#gt-44) | Deterministic release pipeline integrity | `CLI` | F5 | P0 | M | `DONE` |
| [`GT-41`](./gap-reference-catalog.md#gt-41) | Automated maturity reconciliation | `Governance` | Cross | P0 | M | `DONE` |
| [`GT-37`](./gap-reference-catalog.md#gt-37) | Evidence-gated semantic gap closure | `Governance` | Cross | P0 | M | `DONE` |
| [`GT-28`](./gap-reference-catalog.md#gt-28) | Restore CLI build, test, and smoke baseline | `CLI` | F0 | P0 | M | `DONE` |
| [`GT-06`](./gap-reference-catalog.md#gt-06) | MCP tool `evolith-gate-evaluate` | `CLI` | F2 | P0 | M | `DONE` |
| [`GT-03`](./gap-reference-catalog.md#gt-03) | `EvaluateGateUseCase` and `gate evaluate` command | `Core Domain` | F1 | P0 | M | `DONE` |
| [`GT-02`](./gap-reference-catalog.md#gt-02) | `GateEvidence` modeled in the domain layer | `Core Domain` | F1 | P0 | M | `DONE` |
| [`GT-62`](./gap-reference-catalog.md#gt-62) | Autenticación API Key + JWT (OWASP API1/2/5) | `BFF API` | F2 | P0 | L | `DONE` |
| [`GT-73`](./gap-reference-catalog.md#gt-73) | Tests Unit + Integration + E2E del Core API | `BFF API` | Cross | P0 | L | `DONE` |
| [`GT-72`](./gap-reference-catalog.md#gt-72) | Eliminar @ts-nocheck del application layer | `Core Domain` | Cross | P0 | L | `DONE` |
| [`GT-48`](./gap-reference-catalog.md#gt-48) | Restore the normative CLI coverage threshold | `CLI` | F0 | P0 | L | `DONE` |
| [`GT-29`](./gap-reference-catalog.md#gt-29) | Native/OPA rule execution parity | `Core Domain` | F1 | P0 | L | `DONE` |
| [`GT-74`](./gap-reference-catalog.md#gt-74) | ConfigModule con validación de env vars (Zod) | `BFF API` | Cross | P1 | S | `DONE` |
| [`GT-47`](./gap-reference-catalog.md#gt-47) | Product documentation and release synchronization | `Governance` | Cross | P1 | S | `DONE` |
| [`GT-34`](./gap-reference-catalog.md#gt-34) | Roadmap reprioritization around governance proof | `Governance` | Product | P1 | S | `DONE` |
| [`GT-18`](./gap-reference-catalog.md#gt-18) | Publish `@evolith/smart-cli` to npm | `CLI` | F5 | P1 | S | `DONE` |
| [`GT-14`](./gap-reference-catalog.md#gt-14) | Outbound webhook on gate completion | `CLI` | F4 | P1 | S | `DONE` |
| [`GT-12`](./gap-reference-catalog.md#gt-12) | `--dry-run` on all write operations | `CLI` | F3 | P1 | S | `DONE` |
| [`GT-09`](./gap-reference-catalog.md#gt-09) | Phase 3 real coverage enforcement | `CLI` | F3 | P1 | S | `DONE` |
| [`GT-08`](./gap-reference-catalog.md#gt-08) | Phase 2 real ADR registry validation | `CLI` | F3 | P1 | S | `DONE` |
| [`GT-07`](./gap-reference-catalog.md#gt-07) | MCP gate-evaluation release smoke | `CLI` | F2 | P1 | S | `DONE` |
| [`GT-04`](./gap-reference-catalog.md#gt-04) | Remove service locator from domain | `Core Domain` | F1 | P1 | S | `DONE` |
| [`GT-56`](./gap-reference-catalog.md#gt-56) | Silent failures and missing mocks in CLI E2E tests | `CLI` | Cross | P1 | M | `DONE` |
| [`GT-55`](./gap-reference-catalog.md#gt-55) | TypeScript strictness and implicit any elimination | `CLI` | Cross | P1 | M | `DONE` |
| [`GT-51`](./gap-reference-catalog.md#gt-51) | Build-versus-Compose gate evidence validation | `CLI` | F3 | P1 | M | `DONE` |
| [`GT-49`](./gap-reference-catalog.md#gt-49) | Enforce TypeScript strict mode and typed filesystem ports | `CLI` | Cross | P1 | M | `DONE` |
| [`GT-46`](./gap-reference-catalog.md#gt-46) | Core HTTP service ownership boundary | `CLI` | F2 | P1 | M | `DONE` |
| [`GT-45`](./gap-reference-catalog.md#gt-45) | MCP transport and tool conformance suite | `CLI` | F2 | P1 | M | `DONE` |
| [`GT-42`](./gap-reference-catalog.md#gt-42) | Cross-repository contract conformance | `Governance` | Cross | P1 | M | `DONE` |
| [`GT-35`](./gap-reference-catalog.md#gt-35) | Automated inventories and tracking validation | `Governance` | Cross | P1 | M | `DONE` |
| [`GT-33`](./gap-reference-catalog.md#gt-33) | Evidence-backed maturity scoring | `Governance` | Product | P1 | M | `DONE` |
| [`GT-17`](./gap-reference-catalog.md#gt-17) | DI consolidation and strict boundaries | `CLI` | F5 | P1 | M | `DONE` |
| [`GT-13`](./gap-reference-catalog.md#gt-13) | `evolith-phase-advance` proposal runner | `CLI` | F4 | P1 | M | `DONE` |
| [`GT-11`](./gap-reference-catalog.md#gt-11) | Phase 5 observability and rollback validation | `CLI` | F3 | P1 | M | `DONE` |
| [`GT-10`](./gap-reference-catalog.md#gt-10) | Phase 4 security scan content validation | `CLI` | F3 | P1 | M | `DONE` |
| [`GT-05`](./gap-reference-catalog.md#gt-05) | MCP SDK Streamable HTTP transport | `CLI` | F2 | P1 | M | `DONE` |
| [`GT-57`](./gap-reference-catalog.md#gt-57) | Incomplete MCP tooling and validation implementation | `CLI` | F2 | P1 | L | `DONE` |
| [`GT-20`](./gap-reference-catalog.md#gt-20) | ADR content backfill to authoring standard | `Governance` | Cross | P1 | L | `DONE` |
| [`GT-19`](./gap-reference-catalog.md#gt-19) | Incremental hexagonal migration of `core/` | `CLI` | Cross | P1 | L | `DONE` |
| [`GT-78`](./gap-reference-catalog.md#gt-78) | Eliminar scripts de debug de la raíz del repositorio | `Governance` | Cross | P2 | S | `DONE` |
| [`GT-77`](./gap-reference-catalog.md#gt-77) | CoreDomainModule extraído de AppModule | `BFF API` | Cross | P2 | S | `DONE` |
| [`GT-58`](./gap-reference-catalog.md#gt-58) | Clean up TODO stubs injected by Hexagonal Scaffolder | `Core Domain` | Cross | P2 | S | `DONE` |
| [`GT-53`](./gap-reference-catalog.md#gt-53) | Repair migrated product-vision references | `Governance` | Cross | P2 | S | `DONE` |
| [`GT-52`](./gap-reference-catalog.md#gt-52) | Remove dead dependency-injection container stubs | `CLI` | Cross | P2 | S | `DONE` |
| [`GT-50`](./gap-reference-catalog.md#gt-50) | Enforce coverage thresholds in Jest configuration | `CLI` | F0 | P2 | S | `DONE` |
| [`GT-26`](./gap-reference-catalog.md#gt-26) | Zero-Downtime Release Playbook | `Governance` | Cross | P2 | S | `DONE` |
| [`GT-22`](./gap-reference-catalog.md#gt-22) | ADR ID uniqueness scheme | `Governance` | Cross | P2 | S | `DONE` |
| [`GT-16`](./gap-reference-catalog.md#gt-16) | Documentation consolidation | `Governance` | F5 | P2 | S | `DONE` |
| [`GT-24`](./gap-reference-catalog.md#gt-24) | Execute declared documentation migrations | `Governance` | Cross | P2 | M | `DONE` |
| [`GT-21`](./gap-reference-catalog.md#gt-21) | Placement review of tool-centric Core ADRs | `Governance` | Cross | P2 | M | `DONE` |
| [`GT-54`](./gap-reference-catalog.md#gt-54) | Complete strict hexagonal boundary enforcement | `Cross` | Cross | P2 | L | `DONE` |
| [`GT-36`](./gap-reference-catalog.md#gt-36) | Machine-readable rules language coverage | `Governance` | Cross | P2 | L | `DONE` |
| [`GT-25`](./gap-reference-catalog.md#gt-25) | First provider profiles | `Governance` | Cross | P2 | L | `DONE` |
| [`GT-23`](./gap-reference-catalog.md#gt-23) | Spanish translation backfill | `Governance` | Cross | P2 | L | `DONE` |

**Progress:** 59 / 70 done · 0 in progress · 11 pending · 0 deferred

**Ordering:** criticality (`P0` → `P1` → `P2`), active status (`IN-PROGRESS` → `DONE` → `DEFERRED`), then complexity (`S` → `M` → `L`). Completed gaps follow pending.

---
[Back to Vision Index](./README.md)
