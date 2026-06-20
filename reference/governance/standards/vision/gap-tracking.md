# Evolith Core — Gap Tracking Board

> **Bilingual Navigation:** [Versión en Español](./gap-tracking.es.md)

**Status:** Active Tracking
**Owner:** Evolith Architecture Board
**Last Updated:** 2026-06-19
**Gap Details:** [Gap Reference Catalog](./gap-reference-catalog.md)

This board is the single source of truth for technical debt, gaps, opportunities, enablers, priority, and status. Select a gap ID to open its problem statement, purpose, evidence, closure criteria, and references.

> One table with every gap and tracked activity. `GT-*` IDs link to their full detail in the catalog; `MT-A*` IDs link to the supporting Multi-Topology implementation plan, but this table remains the canonical status source. Order: status (active on top) → criticality → complexity; completed gaps sit at the end grouped by component. GitHub renders Markdown statically (no interactive sorting or search): the **Component** column categorizes and GitHub file search (`/`) finds an ID or term.

| ID | Gap | Component | Phase | Criticality | Complexity | Status |
|---|---|---|:---:|:---:|:---:|:---:|
| [`GT-117`](./gap-reference-catalog.md#gt-117) | Read/query (GET) endpoints on Core API for Tracker BFF composition | `BFF API` | F2 | P1 | M | `DONE` |
| [`GT-118`](./gap-reference-catalog.md#gt-118) | Remote/SaaS consumption model — decouple Core API from local filesystem paths | `BFF API` | F3 | P1 | L | `DONE` |
| [`MT-A23`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Preserve CLI `--arch-level F1/F2/F3` compatibility | `Smart CLI` | Cross | P1 | M | `DONE` |
| [`MT-A17`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Move or mirror current F1/F2/F3 rules into topology-aware ruleset discovery | `Core Domain` | Cross | P1 | L | `PENDING` |
| [`MT-A18`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Add Native + OPA starter rules for serverless | `Rulesets` | Cross | P1 | L | `DONE` |
| [`MT-A19`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Add Native + OPA starter rules for event-driven | `Rulesets` | Cross | P1 | L | `DONE` |
| [`MT-A20`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Add Native + OPA starter rules for agentic AI | `Rulesets` | Cross | P1 | L | `DONE` |
| [`MT-A21`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Add shared topology catalog and manifest resolver in Core Domain | `Core Domain` | Cross | P1 | L | `DONE` |
| [`MT-A22`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Add CLI `--topology` support to validation | `Smart CLI` | Cross | P1 | L | `DONE` |
| [`MT-A24`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Add MCP topology resources and tools | `MCP Services` | Cross | P1 | L | `PENDING` |
| [`MT-A25`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Add Service CORE API topology discovery and validation endpoints | `Core API` | Cross | P1 | L | `PENDING` |
| [`GT-119`](./gap-reference-catalog.md#gt-119) | Reconcile ADR-0074 §5 (MCP in NestJS) with the standalone `@evolith/mcp-server` | `Governance` | Cross | P2 | S | `DONE` |
| [`GT-120`](./gap-reference-catalog.md#gt-120) | GraphQL exposure for the Core API (ADR-0074 scope) | `BFF API` | F3 | P2 | M | `DONE` |
| [`GT-121`](./gap-reference-catalog.md#gt-121) | Decommission the in-process MCP subsystem in the Smart CLI (post-delegation, ADR-0074/0075 Phase 3) | `CLI` | Cross | P2 | M | `DONE` |
| [`GT-122`](./gap-reference-catalog.md#gt-122) | Consolidate duplicated infrastructure adapters across sdk/cli, apps/core-api and packages/infra-providers | `Cross` | Cross | P2 | M | `DONE` |
| [`GT-124`](./gap-reference-catalog.md#gt-124) | CLI e2e suite broken — missing fixtures (SDLC templates, shell hooks) and stale old-MCP prompt naming | `CLI` | Cross | P2 | M | `DONE` |
| [`MT-A26`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Update navigation, indexes, validation evidence, and tracker status | `Documentation` | Cross | P2 | M | `PENDING` |
| [`MT-A09`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Create the English and Spanish Topology Hub | `Documentation` | Cross | P1 | S | `DONE` |
| [`GT-59`](./gap-reference-catalog.md#gt-59) | Hardening HTTP — Helmet + CORS + Rate Limiting (OWASP API4/8) | `BFF API` | Cross | P0 | S | `DONE` |
| [`GT-60`](./gap-reference-catalog.md#gt-60) | Validación Global DTOs con class-validator (OWASP API3) | `BFF API` | Cross | P0 | M | `DONE` |
| [`GT-64`](./gap-reference-catalog.md#gt-64) | Structured Logging con Correlation ID | `BFF API` | Cross | P0 | M | `DONE` |
| [`GT-62`](./gap-reference-catalog.md#gt-62) | Autenticación API Key + JWT (OWASP API1/2/5) | `BFF API` | F2 | P0 | L | `DONE` |
| [`GT-73`](./gap-reference-catalog.md#gt-73) | Tests Unit + Integration + E2E del Core API | `BFF API` | Cross | P0 | L | `DONE` |
| [`GT-61`](./gap-reference-catalog.md#gt-61) | Manejo de errores RFC 9457 Problem Details | `BFF API` | Cross | P1 | S | `DONE` |
| [`GT-63`](./gap-reference-catalog.md#gt-63) | Auditoría y logging de seguridad (OWASP API9) | `BFF API` | Cross | P1 | S | `DONE` |
| [`GT-69`](./gap-reference-catalog.md#gt-69) | Richardson Level 2 — HTTP Verbs y Status Codes | `BFF API` | Cross | P1 | S | `DONE` |
| [`GT-70`](./gap-reference-catalog.md#gt-70) | Graceful Shutdown y manejo de señales OS | `BFF API` | Cross | P1 | S | `DONE` |
| [`GT-74`](./gap-reference-catalog.md#gt-74) | ConfigModule con validación de env vars (Zod) | `BFF API` | Cross | P1 | S | `DONE` |
| [`GT-65`](./gap-reference-catalog.md#gt-65) | Prometheus Metrics + Health checks liveness/readiness | `BFF API` | F2 | P1 | M | `DONE` |
| [`GT-67`](./gap-reference-catalog.md#gt-67) | Especificación OpenAPI 3.1 completa | `BFF API` | F2 | P1 | M | `DONE` |
| [`GT-76`](./gap-reference-catalog.md#gt-76) | PhaseTransitionUseCase expuesto en Core API | `BFF API` | F1 | P1 | M | `DONE` |
| [`GT-66`](./gap-reference-catalog.md#gt-66) | Distributed Tracing con OpenTelemetry | `BFF API` | F3 | P1 | L | `DONE` |
| [`GT-68`](./gap-reference-catalog.md#gt-68) | Versionado de API con estrategia URI | `BFF API` | F3 | P2 | S | `DONE` |
| [`GT-77`](./gap-reference-catalog.md#gt-77) | CoreDomainModule extraído de AppModule | `BFF API` | Cross | P2 | S | `DONE` |
| [`GT-71`](./gap-reference-catalog.md#gt-71) | Circuit Breaker para llamadas a servicios externos | `BFF API` | F3 | P2 | M | `DONE` |
| [`GT-44`](./gap-reference-catalog.md#gt-44) | Deterministic release pipeline integrity | `CLI` | F5 | P0 | M | `DONE` |
| [`GT-28`](./gap-reference-catalog.md#gt-28) | Restore CLI build, test, and smoke baseline | `CLI` | F0 | P0 | M | `DONE` |
| [`GT-06`](./gap-reference-catalog.md#gt-06) | MCP tool `evolith-gate-evaluate` | `CLI` | F2 | P0 | M | `DONE` |
| [`GT-48`](./gap-reference-catalog.md#gt-48) | Restore the normative CLI coverage threshold | `CLI` | F0 | P0 | L | `DONE` |
| [`GT-123`](./gap-reference-catalog.md#gt-123) | CLI does not build — pre-existing TypeScript errors block `tsc` (init.wizard, progress.service, alias, old MCP auto-fix) | `CLI` | Cross | P1 | L | `DONE` |
| [`GT-79`](./gap-reference-catalog.md#gt-79) | Restore the green CLI CI validation pipeline | `Governance` | Cross | P1 | S | `DONE` |
| [`GT-18`](./gap-reference-catalog.md#gt-18) | Publish `@evolith/smart-cli` to npm | `CLI` | F5 | P1 | S | `DONE` |
| [`GT-14`](./gap-reference-catalog.md#gt-14) | Outbound webhook on gate completion | `CLI` | F4 | P1 | S | `DONE` |
| [`GT-12`](./gap-reference-catalog.md#gt-12) | `--dry-run` on all write operations | `CLI` | F3 | P1 | S | `DONE` |
| [`GT-09`](./gap-reference-catalog.md#gt-09) | Phase 3 real coverage enforcement | `CLI` | F3 | P1 | S | `DONE` |
| [`GT-08`](./gap-reference-catalog.md#gt-08) | Phase 2 real ADR registry validation | `CLI` | F3 | P1 | S | `DONE` |
| [`GT-07`](./gap-reference-catalog.md#gt-07) | MCP gate-evaluation release smoke | `CLI` | F2 | P1 | S | `DONE` |
| [`GT-80`](./gap-reference-catalog.md#gt-80) | Type-check the CLI test suite | `CLI` | Cross | P1 | M | `DONE` |
| [`GT-97`](./gap-reference-catalog.md#gt-97) | Multiple CLI profiles | `CLI` | Cross | P1 | M | `DONE` |
| [`GT-100`](./gap-reference-catalog.md#gt-100) | CLI API browser/explorer | `CLI` | Cross | P2 | M | `DONE` |
| [`GT-101`](./gap-reference-catalog.md#gt-101) | CLI auto-update mechanism | `CLI` | Cross | P2 | M | `DONE` |
| [`GT-102`](./gap-reference-catalog.md#gt-102) | CLI real-time progress/streaming | `CLI` | Cross | P2 | M | `DONE` |
| [`GT-104`](./gap-reference-catalog.md#gt-104) | CLI package-manager distribution | `CLI` | Cross | P2 | M | `DONE` |
| [`GT-107`](./gap-reference-catalog.md#gt-107) | CLI interactive wizards | `CLI` | Cross | P2 | M | `DONE` |
| [`GT-81`](./gap-reference-catalog.md#gt-81) | Raise CLI branch coverage to the statement floor | `CLI` | F0 | P2 | M | `DONE` |
| [`GT-116`](./gap-reference-catalog.md#gt-116) | Elimination of Blocking I/O Operations in the CLI | `CLI` | Transversal | P2 | M | `DONE` |
| [`GT-115`](./gap-reference-catalog.md#gt-115) | Auto-fix of Architectural Failures via MCP Tools | `CLI` | Transversal | P2 | L | `DONE` |
| [`GT-114`](./gap-reference-catalog.md#gt-114) | Human-in-the-Loop for Mutative MCP Tools | `CLI` | Transversal | P1 | M | `DONE` |
| [`GT-56`](./gap-reference-catalog.md#gt-56) | Silent failures and missing mocks in CLI E2E tests | `CLI` | Cross | P1 | M | `DONE` |
| [`GT-55`](./gap-reference-catalog.md#gt-55) | TypeScript strictness and implicit any elimination | `CLI` | Cross | P1 | M | `DONE` |
| [`GT-51`](./gap-reference-catalog.md#gt-51) | Build-versus-Compose gate evidence validation | `CLI` | F3 | P1 | M | `DONE` |
| [`GT-49`](./gap-reference-catalog.md#gt-49) | Enforce TypeScript strict mode and typed filesystem ports | `CLI` | Cross | P1 | M | `DONE` |
| [`GT-46`](./gap-reference-catalog.md#gt-46) | Core HTTP service ownership boundary | `CLI` | F2 | P1 | M | `DONE` |
| [`GT-45`](./gap-reference-catalog.md#gt-45) | MCP transport and tool conformance suite | `CLI` | F2 | P1 | M | `DONE` |
| [`GT-17`](./gap-reference-catalog.md#gt-17) | DI consolidation and strict boundaries | `CLI` | F5 | P1 | M | `DONE` |
| [`GT-13`](./gap-reference-catalog.md#gt-13) | `evolith-phase-advance` proposal runner | `CLI` | F4 | P1 | M | `DONE` |
| [`GT-11`](./gap-reference-catalog.md#gt-11) | Phase 5 observability and rollback validation | `CLI` | F3 | P1 | M | `DONE` |
| [`GT-10`](./gap-reference-catalog.md#gt-10) | Phase 4 security scan content validation | `CLI` | F3 | P1 | M | `DONE` |
| [`GT-05`](./gap-reference-catalog.md#gt-05) | MCP SDK Streamable HTTP transport | `CLI` | F2 | P1 | M | `DONE` |
| [`GT-98`](./gap-reference-catalog.md#gt-98) | CLI extension/plugin system | `CLI` | Cross | P1 | L | `DONE` |
| [`GT-57`](./gap-reference-catalog.md#gt-57) | Incomplete MCP tooling and validation implementation | `CLI` | F2 | P1 | L | `DONE` |
| [`GT-19`](./gap-reference-catalog.md#gt-19) | Incremental hexagonal migration of `core/` | `CLI` | Cross | P1 | L | `DONE` |
| [`GT-106`](./gap-reference-catalog.md#gt-106) | CLI command aliases | `CLI` | Cross | P2 | S | `DONE` |
| [`GT-108`](./gap-reference-catalog.md#gt-108) | CLI fixtures/test data | `CLI` | Cross | P2 | S | `DONE` |
| [`GT-109`](./gap-reference-catalog.md#gt-109) | CLI shell integration | `CLI` | Cross | P2 | S | `DONE` |
| [`GT-103`](./gap-reference-catalog.md#gt-103) | CLI subcommand depth | `CLI` | Cross | P2 | S | `DONE` |
| [`GT-105`](./gap-reference-catalog.md#gt-105) | CLI Docker image | `CLI` | Cross | P2 | S | `DONE` |
| [`GT-52`](./gap-reference-catalog.md#gt-52) | Remove dead dependency-injection container stubs | `CLI` | Cross | P2 | S | `DONE` |
| [`GT-82`](./gap-reference-catalog.md#gt-82) | Revive or remove the dead gate-status spec | `CLI` | Cross | P2 | S | `DONE` |
| [`GT-50`](./gap-reference-catalog.md#gt-50) | Enforce coverage thresholds in Jest configuration | `CLI` | F0 | P2 | S | `DONE` |
| [`GT-03`](./gap-reference-catalog.md#gt-03) | `EvaluateGateUseCase` and `gate evaluate` command | `Core Domain` | F1 | P0 | M | `DONE` |
| [`GT-02`](./gap-reference-catalog.md#gt-02) | `GateEvidence` modeled in the domain layer | `Core Domain` | F1 | P0 | M | `DONE` |
| [`GT-72`](./gap-reference-catalog.md#gt-72) | Eliminar @ts-nocheck del application layer | `Core Domain` | Cross | P0 | L | `DONE` |
| [`GT-29`](./gap-reference-catalog.md#gt-29) | Native/OPA rule execution parity | `Core Domain` | F1 | P0 | L | `DONE` |
| [`GT-113`](./gap-reference-catalog.md#gt-113) | Clean Architecture Purification in core-domain | `Core Domain` | Transversal | P1 | M | `DONE` |
| [`GT-04`](./gap-reference-catalog.md#gt-04) | Remove service locator from domain | `Core Domain` | F1 | P1 | S | `DONE` |
| [`GT-58`](./gap-reference-catalog.md#gt-58) | Clean up TODO stubs injected by Hexagonal Scaffolder | `Core Domain` | Cross | P2 | S | `DONE` |
| [`MT-A07`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Define the dimensional topology model | `Architecture` | Cross | P0 | M | `DONE` |
| [`MT-A08`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Preserve F1/F2/F3 as the `progressive-axis` compatibility model | `Architecture` | Cross | P0 | M | `DONE` |
| [`MT-A11`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Create the modular-monolith topology profile | `Architecture` | Cross | P1 | M | `DONE` |
| [`MT-A12`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Create the distributed-modules topology profile | `Architecture` | Cross | P1 | M | `DONE` |
| [`MT-A13`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Create the microservices topology profile | `Architecture` | Cross | P1 | M | `DONE` |
| [`MT-A14`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Create draft profiles for serverless and edge computing | `Architecture` | Cross | P1 | M | `DONE` |
| [`MT-A15`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Create draft profiles for event-driven and data mesh | `Architecture` | Cross | P1 | M | `DONE` |
| [`MT-A16`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Create draft profile for agentic AI | `Architecture` | Cross | P1 | M | `DONE` |
| [`GT-75`](./gap-reference-catalog.md#gt-75) | Paquete @evolith/infra-providers compartido | `Cross` | Cross | P2 | M | `DONE` |
| [`GT-54`](./gap-reference-catalog.md#gt-54) | Complete strict hexagonal boundary enforcement | `Cross` | Cross | P2 | L | `DONE` |
| [`GT-27`](./gap-reference-catalog.md#gt-27) | Canonical tracking semantic consistency | `Governance` | Cross | P0 | S | `DONE` |
| [`GT-01`](./gap-reference-catalog.md#gt-01) | Unified contract ADR | `Governance` | F0 | P0 | S | `DONE` |
| [`MT-A01`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Ratify the Multi-Topology Reference Corpus ADR | `Governance` | Cross | P0 | S | `DONE` |
| [`MT-A02`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Freeze the root-taxonomy decision: no root `/topologies/` without superseding ADR | `Governance` | Cross | P0 | S | `DONE` |
| [`MT-A06`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Add manifest validation to documentation and ruleset gates | `Harness` | Cross | P0 | M | `DONE` |
| [`GT-41`](./gap-reference-catalog.md#gt-41) | Automated maturity reconciliation | `Governance` | Cross | P0 | M | `DONE` |
| [`GT-37`](./gap-reference-catalog.md#gt-37) | Evidence-gated semantic gap closure | `Governance` | Cross | P0 | M | `DONE` |
| [`GT-47`](./gap-reference-catalog.md#gt-47) | Product documentation and release synchronization | `Governance` | Cross | P1 | S | `DONE` |
| [`GT-34`](./gap-reference-catalog.md#gt-34) | Roadmap reprioritization around governance proof | `Governance` | Product | P1 | S | `DONE` |
| [`GT-42`](./gap-reference-catalog.md#gt-42) | Cross-repository contract conformance | `Governance` | Cross | P1 | M | `DONE` |
| [`GT-35`](./gap-reference-catalog.md#gt-35) | Automated inventories and tracking validation | `Governance` | Cross | P1 | M | `DONE` |
| [`GT-33`](./gap-reference-catalog.md#gt-33) | Evidence-backed maturity scoring | `Governance` | Product | P1 | M | `DONE` |
| [`GT-20`](./gap-reference-catalog.md#gt-20) | ADR content backfill to authoring standard | `Governance` | Cross | P1 | L | `DONE` |
| [`GT-78`](./gap-reference-catalog.md#gt-78) | Eliminar scripts de debug de la raíz del repositorio | `Governance` | Cross | P2 | S | `DONE` |
| [`GT-53`](./gap-reference-catalog.md#gt-53) | Repair migrated product-vision references | `Governance` | Cross | P2 | S | `DONE` |
| [`GT-26`](./gap-reference-catalog.md#gt-26) | Zero-Downtime Release Playbook | `Governance` | Cross | P2 | S | `DONE` |
| [`GT-22`](./gap-reference-catalog.md#gt-22) | ADR ID uniqueness scheme | `Governance` | Cross | P2 | S | `DONE` |
| [`GT-16`](./gap-reference-catalog.md#gt-16) | Documentation consolidation | `Governance` | F5 | P2 | S | `DONE` |
| [`GT-24`](./gap-reference-catalog.md#gt-24) | Execute declared documentation migrations | `Governance` | Cross | P2 | M | `DONE` |
| [`GT-21`](./gap-reference-catalog.md#gt-21) | Placement review of tool-centric Core ADRs | `Governance` | Cross | P2 | M | `DONE` |
| [`GT-36`](./gap-reference-catalog.md#gt-36) | Machine-readable rules language coverage | `Governance` | Cross | P2 | L | `DONE` |
| [`GT-25`](./gap-reference-catalog.md#gt-25) | First provider profiles | `Governance` | Cross | P2 | L | `DONE` |
| [`GT-23`](./gap-reference-catalog.md#gt-23) | Spanish translation backfill | `Governance` | Cross | P2 | L | `DONE` |
| [`GT-110`](./gap-reference-catalog.md#gt-110) | Migrate ingress off the abandoned Kong OSS to Traefik/NGINX | `Platform` | Cross | P0 | L | `DONE` |
| [`GT-112`](./gap-reference-catalog.md#gt-112) | Replace HashiCorp commercial binaries with OpenTofu + OpenBao | `Platform` | Cross | P0 | L | `DONE` |
| [`GT-111`](./gap-reference-catalog.md#gt-111) | Plan the MassTransit v9 commercial pivot (stay v8 OSS or move to Rebus) | `Platform` | Cross | P1 | L | `DONE` |
| [`MT-A04`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Authorize `rulesets/topologies/` as the canonical executable topology rules location | `Rulesets` | Cross | P0 | S | `DONE` |
| [`MT-A10`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Create the English and Spanish Rulesets Topologies Hub | `Rulesets` | Cross | P1 | S | `DONE` |
| [`MT-A05`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Create `topology-manifest.schema.json` | `Schema` | Cross | P0 | M | `DONE` |
| [`MT-A03`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Authorize `reference/architecture/topologies/` as the canonical human-readable topology corpus | `Taxonomy` | Cross | P0 | S | `DONE` |

**Progress:** 123 / 127 done · 0 in progress · 4 pending · 0 deferred

**Ordering:** one table, ordered by status (pending then deferred then completed), then criticality (`P0` → `P1` → `P2`) then complexity (`S` → `M` → `L`); completed gaps are grouped by component. `GT-*` IDs link to the [Gap Reference Catalog](./gap-reference-catalog.md); `MT-A*` IDs link to the supporting [Multi-Topology implementation plan](./multi-topology-reference-corpus-implementation-plan.md).

---
[Back to Vision Index](./README.md)
