# Evolith Core — Gap Tracking Board

> **Bilingual Navigation:** [Versión en Español](./gap-tracking.es.md)

**Status:** Active Tracking
**Owner:** Evolith Architecture Board
**Last Updated:** 2026-06-26 (GT-283-GT-311 opened from intelligent data audit)
**Gap Details:** [Gap Reference Catalog](./gap-reference-catalog.md)

This board is the single source of truth for technical debt, gaps, opportunities, enablers, priority, and status. Select a gap ID to open its problem statement, purpose, evidence, closure criteria, and references.

> One table with every gap and tracked activity. `GT-*` IDs link to their full detail in the catalog; `MT-A*` IDs link to the supporting Multi-Topology implementation plan, but this table remains the canonical status source. Order: pending first (by criticality P0→P3, then complexity XS→XL), then completed (same criteria). GitHub renders Markdown statically (no interactive sorting or search): the **Component** column categorizes and GitHub file search (`/`) finds an ID or term.

| ID | Gap | Component | Phase | Criticality | Complexity | Status |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| [`GT-312`](./gap-reference-catalog.md#gt-312) | SDLC validation orchestration: phase → gate → artifacts → schemas → rulesets → topology → ADRs → OPA → blocking criteria | `Core Domain` | Cross | P0 | XL | `OPEN` |
| [`GT-286`](./gap-reference-catalog.md#gt-286) | compliance-baseline ruleset exists — rulesets/compliance-baseline | `Rulesets` | Cross | P0 | S | `OPEN` |
| [`GT-287`](./gap-reference-catalog.md#gt-287) | definition-of-done ruleset exists — rulesets/definition-of-done | `Rulesets` | Cross | P0 | S | `OPEN` |
| [`GT-288`](./gap-reference-catalog.md#gt-288) | engineering-manifesto ruleset exists — rulesets/engineering-manifesto | `Rulesets` | Cross | P0 | S | `OPEN` |
| [`GT-289`](./gap-reference-catalog.md#gt-289) | repository-taxonomy ruleset exists — rulesets/repository-taxonomy | `Rulesets` | Cross | P0 | S | `OPEN` |
| [`GT-290`](./gap-reference-catalog.md#gt-290) | phase-gates ruleset exists — rulesets/phase-gates | `Rulesets` | Cross | P0 | S | `OPEN` |
| [`GT-291`](./gap-reference-catalog.md#gt-291) | quality-thresholds ruleset exists — rulesets/quality-thresholds | `Rulesets` | Cross | P0 | S | `OPEN` |
| [`GT-292`](./gap-reference-catalog.md#gt-292) | satellite-contracts ruleset exists — rulesets/satellite-contracts | `Rulesets` | Cross | P0 | S | `OPEN` |
| [`GT-293`](./gap-reference-catalog.md#gt-293) | executive-scorecards ruleset exists — rulesets/executive-scorecards | `Rulesets` | Cross | P0 | S | `OPEN` |
| [`GT-294`](./gap-reference-catalog.md#gt-294) | OPA policies for architecture — rulesets/architecture/opa | `Architecture` | Cross | P0 | S | `OPEN` |
| [`GT-283`](./gap-reference-catalog.md#gt-283) | f1-modular-monolith ruleset exists — rulesets/topologies/progressive-axis/modular-monolith | `Rulesets` | Cross | P0 | M | `OPEN` |
| [`GT-284`](./gap-reference-catalog.md#gt-284) | f2-distributed-modules ruleset exists — rulesets/topologies/progressive-axis/distributed-modules | `Rulesets` | Cross | P0 | M | `OPEN` |
| [`GT-285`](./gap-reference-catalog.md#gt-285) | f3-microservices ruleset exists — rulesets/topologies/progressive-axis/microservices | `Rulesets` | Cross | P0 | M | `OPEN` |
| [`GT-295`](./gap-reference-catalog.md#gt-295) | Gate evaluation logic exists — packages/core-domain/src/gates | `Core Domain` | Cross | P0 | M | `OPEN` |
| [`GT-296`](./gap-reference-catalog.md#gt-296) | Phase transition logic exists — packages/core-domain/src/phases | `Core Domain` | Cross | P0 | M | `OPEN` |
| [`GT-297`](./gap-reference-catalog.md#gt-297) | MCP resources for corpus — packages/mcp-server/src/resources | `MCP` | Cross | P0 | M | `OPEN` |
| [`GT-298`](./gap-reference-catalog.md#gt-298) | WatcherService integration — packages/mcp-server/src/watcher | `MCP` | Cross | P0 | M | `OPEN` |
| [`GT-299`](./gap-reference-catalog.md#gt-299) | OpenAPI specification — apps/core-api/src/openapi | `BFF API` | Cross | P1 | M | `OPEN` |
| [`GT-300`](./gap-reference-catalog.md#gt-300) | agents command exists — sdk/cli/src/commands/agents | `CLI` | Cross | P1 | M | `OPEN` |
| [`GT-301`](./gap-reference-catalog.md#gt-301) | upgrade command exists — sdk/cli/src/commands/upgrade | `CLI` | Cross | P1 | M | `OPEN` |
| [`GT-303`](./gap-reference-catalog.md#gt-303) | Evidence Graph implementation — packages/core-domain/src/evidence | `Core Domain` | Cross | P1 | M | `OPEN` |
| [`GT-304`](./gap-reference-catalog.md#gt-304) | Gate Decision model — packages/core-domain/src/gates/decision | `Core Domain` | Cross | P1 | M | `OPEN` |
| [`GT-305`](./gap-reference-catalog.md#gt-305) | Phase Transition model — packages/core-domain/src/phases/transition | `Core Domain` | Cross | P1 | M | `OPEN` |
| [`GT-306`](./gap-reference-catalog.md#gt-306) | Provider ports model — packages/core-domain/src/providers | `Core Domain` | Cross | P1 | M | `OPEN` |
| [`GT-307`](./gap-reference-catalog.md#gt-307) | Tenant authority model — packages/core-domain/src/tenancy | `Core Domain` | Cross | P1 | M | `OPEN` |
| [`GT-310`](./gap-reference-catalog.md#gt-310) | Test suite exists — sdk/cli/src/__tests__ | `Governance` | Cross | P1 | M | `OPEN` |
| [`GT-311`](./gap-reference-catalog.md#gt-311) | E2E tests exist — sdk/cli/src/__tests__/e2e | `Governance` | Cross | P1 | M | `OPEN` |
| [`GT-302`](./gap-reference-catalog.md#gt-302) | scaffold command exists — sdk/cli/src/commands/architecture/scaffold | `CLI` | Cross | P1 | L | `OPEN` |
| [`GT-308`](./gap-reference-catalog.md#gt-308) | Plugin system for commands — sdk/cli/src/plugins | `CLI` | Cross | P2 | M | `OPEN` |
| [`GT-309`](./gap-reference-catalog.md#gt-309) | Contribution validation — sdk/cli/src/contributions | `CLI` | Cross | P2 | M | `OPEN` |
| [`GT-280`](./gap-reference-catalog.md#gt-280) | SDLC phases como datos consultables (JSON/YAML) — mapeo gate → artefactos → reglas Rego | `Governance` | Cross | P0 | M | `DONE` |
| [`GT-281`](./gap-reference-catalog.md#gt-281) | Pipeline de evaluación end-to-end: cliente → topología → reglas → veredicto | `Core Domain` | Cross | P0 | XL | `DONE` |
| [`GT-282`](./gap-reference-catalog.md#gt-282) | Reporte accionable con evidencia detallada (qué regla falló, qué artefacto falta, por qué) | `Core Domain` | Cross | P1 | M | `DONE` |
| [`GT-277`](./gap-reference-catalog.md#gt-277) | Topology OpenAPI specs — framework interfaces ausentes en las 8 topologías | `Architecture` | Cross | P1 | M | `DONE` |
| [`GT-278`](./gap-reference-catalog.md#gt-278) | Topology MCP manifests — framework interfaces ausentes en las 8 topologías | `Architecture` | Cross | P1 | M | `DONE` |
| [`GT-279`](./gap-reference-catalog.md#gt-279) | Topology CLI flows — framework interfaces ausentes en las 8 topologías | `Architecture` | Cross | P1 | M | `DONE` |
| [`GT-274`](./gap-reference-catalog.md#gt-274) | Harden cleanup-temp-files against tracked-file deletion | `Harness` | Cross | P0 | S | `DONE` |
| [`GT-267`](./gap-reference-catalog.md#gt-267) | Restore workspace build/test after Redis cache integration | `Core API/MCP` | Cross | P0 | M | `DONE` |
| [`GT-275`](./gap-reference-catalog.md#gt-275) | Reconcile closure evidence registry with canonical tracking semantics | `Governance` | Cross | P0 | M | `DONE` |
| [`GT-272`](./gap-reference-catalog.md#gt-272) | Secure OPA sidecar bundle distribution and verification | `Rulesets` | Cross | P1 | M | `DONE` |
| [`GT-276`](./gap-reference-catalog.md#gt-276) | Correct bilingual coverage dashboard area pairing logic | `Governance CI` | Cross | P2 | S | `DONE` |
| [`GT-250`](./gap-reference-catalog.md#gt-250) | Fix MCP auth bypass when no API key configured | `Security` | Cross | P0 | S | `DONE` |
| [`GT-251`](./gap-reference-catalog.md#gt-251) | Fix command injection in update command via execSync | `Security` | Cross | P0 | S | `DONE` |
| [`GT-253`](./gap-reference-catalog.md#gt-253) | Pin trivy-action to specific version tag instead of master branch | `CI/CD` | Cross | P0 | S | `DONE` |
| [`GT-268`](./gap-reference-catalog.md#gt-268) | Restore missing CI validator scripts referenced by workflows and rules | `Governance CI` | Cross | P0 | S | `DONE` |
| [`GT-252`](./gap-reference-catalog.md#gt-252) | Wire all 19 orphaned OPA policies into main.rego aggregator | `Rulesets` | Cross | P0 | M | `DONE` |
| [`GT-269`](./gap-reference-catalog.md#gt-269) | Restore ADR-0073 contract roundtrip reproducibility | `Contracts` | Cross | P0 | M | `DONE` |
| [`GT-233`](./gap-reference-catalog.md#gt-233) | Add rate limiting middleware to Core API | `Security` | Cross | P1 | S | `DONE` |
| [`GT-254`](./gap-reference-catalog.md#gt-254) | Add path traversal protection to MCP resource resolution | `Security` | Cross | P1 | S | `DONE` |
| [`GT-255`](./gap-reference-catalog.md#gt-255) | Add Content-Security-Policy headers to MCP HTTP transport | `Security` | Cross | P1 | S | `DONE` |
| [`GT-256`](./gap-reference-catalog.md#gt-256) | Fix Traefik healthcheck by adding --ping=true to command | `Infrastructure` | Cross | P1 | S | `DONE` |
| [`GT-257`](./gap-reference-catalog.md#gt-257) | Pin MongoDB image version instead of using latest | `Infrastructure` | Cross | P1 | S | `DONE` |
| [`GT-259`](./gap-reference-catalog.md#gt-259) | Fix ci-cd.yml publish trigger to use tag-based instead of string match | `CI/CD` | Cross | P1 | S | `DONE` |
| [`GT-260`](./gap-reference-catalog.md#gt-260) | Create PO agent Spanish language file and add to workflows | `BMAD Agents` | Cross | P1 | S | `DONE` |
| [`GT-258`](./gap-reference-catalog.md#gt-258) | Add concurrency controls to all GitHub Actions workflows | `CI/CD` | Cross | P1 | M | `DONE` |
| [`GT-270`](./gap-reference-catalog.md#gt-270) | Pin mutable infrastructure images and disable dev-only exposed defaults | `Infrastructure` | Cross | P1 | M | `DONE` |
| [`GT-271`](./gap-reference-catalog.md#gt-271) | Add Kubernetes workload hardening to Helm charts | `Infrastructure` | Cross | P1 | M | `DONE` |
| [`GT-20`](./gap-reference-catalog.md#gt-20) | ADR content backfill to authoring standard | `Governance` | Cross | P1 | L | `DONE` |
| [`GT-228`](./gap-reference-catalog.md#gt-228) | Create agent orchestration engine for BMAD workflows | `Governance` | Cross | P1 | XL | `DONE` |
| [`GT-229`](./gap-reference-catalog.md#gt-229) | Complete Dual-Engine TypeScript evaluator (R-25 compliance) | `Core Domain` | Cross | P1 | XL | `DONE` |
| [`GT-261`](./gap-reference-catalog.md#gt-261) | Add resource limits to all Docker containers | `Infrastructure` | Cross | P2 | S | `DONE` |
| [`GT-263`](./gap-reference-catalog.md#gt-263) | Add infrastructure-level Prometheus alerts | `Observability` | Cross | P2 | S | `DONE` |
| [`GT-264`](./gap-reference-catalog.md#gt-264) | Fix DAST scan to target real server or remove | `CI/CD` | Cross | P2 | S | `DONE` |
| [`GT-273`](./gap-reference-catalog.md#gt-273) | Restore DAST scan against staging or ephemeral environment | `CI/CD` | Cross | P3 | S | `DONE` |
| [`GT-265`](./gap-reference-catalog.md#gt-265) | Add secret detection (gitleaks) to CI pipeline | `Security` | Cross | P2 | S | `DONE` |
| [`GT-262`](./gap-reference-catalog.md#gt-262) | Add backup/DR procedures for data stores | `Infrastructure` | Cross | P2 | M | `DONE` |
| [`GT-266`](./gap-reference-catalog.md#gt-266) | Create API key provisioning service for MCP HTTP transport | `Security` | Cross | P2 | M | `DONE` |
| [`GT-226`](./gap-reference-catalog.md#gt-226) | Wire Dependabot/Renovate config (ADR-0009 compliance) | `Governance` | Cross | P0 | S | `DONE` |
| [`GT-152`](./gap-reference-catalog.md#gt-152) | External Knowledge Contract and Source Registry Schema | `Governance` | Cross | P0 | S | `DONE` |
| [`GT-59`](./gap-reference-catalog.md#gt-59) | Hardening HTTP — Helmet + CORS + Rate Limiting (OWASP API4/8) | `BFF API` | Cross | P0 | S | `DONE` |
| [`GT-27`](./gap-reference-catalog.md#gt-27) | Canonical tracking semantic consistency | `Governance` | Cross | P0 | S | `DONE` |
| [`GT-01`](./gap-reference-catalog.md#gt-01) | Unified contract ADR | `Governance` | F0 | P0 | S | `DONE` |
| [`MT-A01`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Ratify the Multi-Topology Reference Corpus ADR | `Governance` | Cross | P0 | S | `DONE` |
| [`MT-A02`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Freeze the root-taxonomy decision: no root `/topologies/` without superseding ADR | `Governance` | Cross | P0 | S | `DONE` |
| [`MT-A04`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Authorize `rulesets/topologies/` as the canonical executable topology rules location | `Rulesets` | Cross | P0 | S | `DONE` |
| [`MT-A03`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Authorize `reference/architecture/topologies/` as the canonical human-readable topology corpus | `Taxonomy` | Cross | P0 | S | `DONE` |
| [`GT-227`](./gap-reference-catalog.md#gt-227) | Add CodeQL + Trivy SAST/SCA to CI workflows | `Security` | Cross | P0 | M | `DONE` |
| [`GT-209`](./gap-reference-catalog.md#gt-209) | Create agnostic baseline (`agnostic-baseline.md` missing) | `Architecture` | Cross | P0 | M | `DONE` |
| [`GT-153`](./gap-reference-catalog.md#gt-153) | Knowledge Lifecycle Governance by Winston | `Governance` | Cross | P0 | M | `DONE` |
| [`GT-154`](./gap-reference-catalog.md#gt-154) | RAG Projection and Native/OPA Parity for External Knowledge | `Governance` | Cross | P0 | M | `DONE` |
| [`GT-151`](./gap-reference-catalog.md#gt-151) | Complete Native/OPA Rule-ID Coverage for Accepted Topologies | `Rulesets` | Cross | P0 | M | `DONE` |
| [`GT-60`](./gap-reference-catalog.md#gt-60) | Validación Global DTOs con class-validator (OWASP API3) | `BFF API` | Cross | P0 | M | `DONE` |
| [`GT-64`](./gap-reference-catalog.md#gt-64) | Structured Logging con Correlation ID | `BFF API` | Cross | P0 | M | `DONE` |
| [`GT-155`](./gap-reference-catalog.md#gt-155) | REST Core API envelope conformance with ADR-0073 | `BFF API` | Cross | P0 | M | `DONE` |
| [`GT-44`](./gap-reference-catalog.md#gt-44) | Deterministic release pipeline integrity | `CLI` | F5 | P0 | M | `DONE` |
| [`GT-28`](./gap-reference-catalog.md#gt-28) | Restore CLI build, test, and smoke baseline | `CLI` | F0 | P0 | M | `DONE` |
| [`GT-06`](./gap-reference-catalog.md#gt-06) | MCP tool `evolith-gate-evaluate` | `CLI` | F2 | P0 | M | `DONE` |
| [`GT-03`](./gap-reference-catalog.md#gt-03) | `EvaluateGateUseCase` and `gate evaluate` command | `Core Domain` | F1 | P0 | M | `DONE` |
| [`GT-02`](./gap-reference-catalog.md#gt-02) | `GateEvidence` modeled in the domain layer | `Core Domain` | F1 | P0 | M | `DONE` |
| [`MT-A07`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Define the dimensional topology model | `Architecture` | Cross | P0 | M | `DONE` |
| [`MT-A08`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Preserve F1/F2/F3 as the `progressive-axis` compatibility model | `Architecture` | Cross | P0 | M | `DONE` |
| [`MT-A06`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Add manifest validation to documentation and ruleset gates | `Harness` | Cross | P0 | M | `DONE` |
| [`GT-41`](./gap-reference-catalog.md#gt-41) | Automated maturity reconciliation | `Governance` | Cross | P0 | M | `DONE` |
| [`GT-37`](./gap-reference-catalog.md#gt-37) | Evidence-gated semantic gap closure | `Governance` | Cross | P0 | M | `DONE` |
| [`MT-A05`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Create `topology-manifest.schema.json` | `Schema` | Cross | P0 | M | `DONE` |
| [`GT-146`](./gap-reference-catalog.md#gt-146) | Secure, Provider-Neutral, and Token-Bounded Agentic CI Review | `Governance` | Cross | P0 | L | `DONE` |
| [`GT-62`](./gap-reference-catalog.md#gt-62) | Autenticación API Key + JWT (OWASP API1/2/5) | `BFF API` | F2 | P0 | L | `DONE` |
| [`GT-73`](./gap-reference-catalog.md#gt-73) | Tests Unit + Integration + E2E del Core API | `BFF API` | Cross | P0 | L | `DONE` |
| [`GT-48`](./gap-reference-catalog.md#gt-48) | Restore the normative CLI coverage threshold | `CLI` | F0 | P0 | L | `DONE` |
| [`GT-72`](./gap-reference-catalog.md#gt-72) | Eliminar @ts-nocheck del application layer | `Core Domain` | Cross | P0 | L | `DONE` |
| [`GT-29`](./gap-reference-catalog.md#gt-29) | Native/OPA rule execution parity | `Core Domain` | F1 | P0 | L | `DONE` |
| [`GT-110`](./gap-reference-catalog.md#gt-110) | Migrate ingress off the abandoned Kong OSS to Traefik/NGINX | `Platform` | Cross | P0 | L | `DONE` |
| [`GT-112`](./gap-reference-catalog.md#gt-112) | Replace HashiCorp commercial binaries with OpenTofu + OpenBao | `Platform` | Cross | P0 | L | `DONE` |
| [`GT-156`](./gap-reference-catalog.md#gt-156) | Core API product hub, API reference, and deployment runbook | `Product` | Cross | P0 | L | `DONE` |
| [`GT-212`](./gap-reference-catalog.md#gt-212) | Resolve ADR-0049/0056 status ambiguity | `Docs` | Cross | P1 | XS | `DONE` |
| [`GT-234`](./gap-reference-catalog.md#gt-234) | Fix R-27 bilingual parity gap in global-rules.es.md | `Docs` | Cross | P1 | XS | `DONE` |
| [`GT-213`](./gap-reference-catalog.md#gt-213) | Add governance metadata to topology manifests | `Architecture` | Cross | P1 | S | `DONE` |
| [`GT-232`](./gap-reference-catalog.md#gt-232) | Create Wilson and PO full personas in .bmad-core/agents | `Governance` | Cross | P1 | S | `DONE` |
| [`GT-235`](./gap-reference-catalog.md#gt-235) | Resolve CI script numbering collisions (05/15/16) | `CI` | Cross | P1 | S | `DONE` |
| [`MT-A09`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Create the English and Spanish Topology Hub | `Documentation` | Cross | P1 | S | `DONE` |
| [`GT-165`](./gap-reference-catalog.md#gt-165) | Concrete SLO and cost budgets for serverless and edge topologies | `Documentation` | Cross | P1 | S | `DONE` |
| [`GT-61`](./gap-reference-catalog.md#gt-61) | Manejo de errores RFC 9457 Problem Details | `BFF API` | Cross | P1 | S | `DONE` |
| [`GT-63`](./gap-reference-catalog.md#gt-63) | Auditoría y logging de seguridad (OWASP API9) | `BFF API` | Cross | P1 | S | `DONE` |
| [`GT-69`](./gap-reference-catalog.md#gt-69) | Richardson Level 2 — HTTP Verbs y Status Codes | `BFF API` | Cross | P1 | S | `DONE` |
| [`GT-70`](./gap-reference-catalog.md#gt-70) | Graceful Shutdown y manejo de señales OS | `BFF API` | Cross | P1 | S | `DONE` |
| [`GT-74`](./gap-reference-catalog.md#gt-74) | ConfigModule con validación de env vars (Zod) | `BFF API` | Cross | P1 | S | `DONE` |
| [`GT-159`](./gap-reference-catalog.md#gt-159) | REST API URI versioning and deprecation policy | `BFF API` | Cross | P1 | S | `DONE` |
| [`GT-79`](./gap-reference-catalog.md#gt-79) | Restore the green CLI CI validation pipeline | `Governance` | Cross | P1 | S | `DONE` |
| [`GT-18`](./gap-reference-catalog.md#gt-18) | Publish `@evolith/smart-cli` to npm | `CLI` | F5 | P1 | S | `DONE` |
| [`GT-14`](./gap-reference-catalog.md#gt-14) | Outbound webhook on gate completion | `CLI` | F4 | P1 | S | `DONE` |
| [`GT-12`](./gap-reference-catalog.md#gt-12) | `--dry-run` on all write operations | `CLI` | F3 | P1 | S | `DONE` |
| [`GT-09`](./gap-reference-catalog.md#gt-09) | Phase 3 real coverage enforcement | `CLI` | F3 | P1 | S | `DONE` |
| [`GT-08`](./gap-reference-catalog.md#gt-08) | Phase 2 real ADR registry validation | `CLI` | F3 | P1 | S | `DONE` |
| [`GT-07`](./gap-reference-catalog.md#gt-07) | MCP gate-evaluation release smoke | `CLI` | F2 | P1 | S | `DONE` |
| [`GT-04`](./gap-reference-catalog.md#gt-04) | Remove service locator from domain | `Core Domain` | F1 | P1 | S | `DONE` |
| [`GT-47`](./gap-reference-catalog.md#gt-47) | Product documentation and release synchronization | `Governance` | Cross | P1 | S | `DONE` |
| [`GT-34`](./gap-reference-catalog.md#gt-34) | Roadmap reprioritization around governance proof | `Governance` | Product | P1 | S | `DONE` |
| [`GT-175`](./gap-reference-catalog.md#gt-175) | Fix ADR-0076 duplicate (renumber OPA bundle to next free Core ID) | `Docs` | Cross | P1 | S | `DONE` |
| [`GT-176`](./gap-reference-catalog.md#gt-176) | Remove duplicate `patterns/es/` subdirectory (Pattern A/B mix) | `Docs` | Cross | P1 | S | `DONE` |
| [`GT-177`](./gap-reference-catalog.md#gt-177) | Complete `core/README.md` with all missing Core ADRs | `Docs` | Cross | P1 | S | `DONE` |
| [`MT-A10`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Create the English and Spanish Rulesets Topologies Hub | `Rulesets` | Cross | P1 | S | `DONE` |
| [`GT-216`](./gap-reference-catalog.md#gt-216) | Close OPA input-schema parity gap (17 native rulesets uncovered) | `Rulesets` | Cross | P1 | M | `DONE` |
| [`GT-231`](./gap-reference-catalog.md#gt-231) | Wire 10 unlinked CI scripts to GitHub Actions workflows | `CI` | Cross | P1 | M | `DONE` |
| [`GT-237`](./gap-reference-catalog.md#gt-237) | Author 5 proposed AI ADRs (ADR-AI-001 through 005) | `Architecture` | Cross | P1 | M | `DONE` |
| [`GT-249`](./gap-reference-catalog.md#gt-249) | Add Redis caching layer for Core API, MCP, and Tracker consumption | `Architecture` | Cross | P1 | M | `DONE` |
| [`GT-164`](./gap-reference-catalog.md#gt-164) | Event-driven and data-mesh ruleset richness | `Rulesets` | Cross | P1 | M | `DONE` |
| [`GT-147`](./gap-reference-catalog.md#gt-147) | Automated Operational Capability and Efficiency Drift Audit | `Governance` | Cross | P1 | M | `DONE` |
| [`GT-140`](./gap-reference-catalog.md#gt-140) | Workload Identity Token Rotation Standard for Satellite Reference | `Architecture` | Cross | P1 | M | `DONE` |
| [`GT-144`](./gap-reference-catalog.md#gt-144) | Infinite Loop Prevention and Circuit Breaker Rules for Agents | `Governance` | Cross | P1 | M | `DONE` |
| [`GT-148`](./gap-reference-catalog.md#gt-148) | Topology-Aware Rule Reference and Coverage Migration Repair | `Rulesets` | Cross | P1 | M | `DONE` |
| [`GT-135`](./gap-reference-catalog.md#gt-135) | Agentic AI Telemetry & Cost Control Standard | `Architecture` | Cross | P1 | M | `DONE` |
| [`GT-132`](./gap-reference-catalog.md#gt-132) | Autonomous Agentic Code Reviews in CI | `Governance` | Cross | P1 | M | `DONE` |
| [`GT-130`](./gap-reference-catalog.md#gt-130) | CI pipeline validation for BMAD Agent signatures on ADRs and Technical Specs | `Governance` | Cross | P1 | M | `DONE` |
| [`GT-117`](./gap-reference-catalog.md#gt-117) | Read/query (GET) endpoints on Core API for Tracker BFF composition | `BFF API` | F2 | P1 | M | `DONE` |
| [`MT-A23`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Preserve CLI `--arch-level F1/F2/F3` compatibility | `Smart CLI` | Cross | P1 | M | `DONE` |
| [`GT-166`](./gap-reference-catalog.md#gt-166) | Missing SDLC phase runbooks for Phases 1, 2, and 4 | `Documentation` | Cross | P1 | M | `DONE` |
| [`GT-167`](./gap-reference-catalog.md#gt-167) | Phase-gate evidence templates and acceptance checklists | `Documentation` | Cross | P1 | M | `DONE` |
| [`GT-65`](./gap-reference-catalog.md#gt-65) | Prometheus Metrics + Health checks liveness/readiness | `BFF API` | F2 | P1 | M | `DONE` |
| [`GT-67`](./gap-reference-catalog.md#gt-67) | Especificación OpenAPI 3.1 completa | `BFF API` | F2 | P1 | M | `DONE` |
| [`GT-76`](./gap-reference-catalog.md#gt-76) | PhaseTransitionUseCase expuesto en Core API | `BFF API` | F1 | P1 | M | `DONE` |
| [`GT-80`](./gap-reference-catalog.md#gt-80) | Type-check the CLI test suite | `CLI` | Cross | P1 | M | `DONE` |
| [`GT-97`](./gap-reference-catalog.md#gt-97) | Multiple CLI profiles | `CLI` | Cross | P1 | M | `DONE` |
| [`GT-114`](./gap-reference-catalog.md#gt-114) | Human-in-the-Loop for Mutative MCP Tools | `CLI` | Transversal | P1 | M | `DONE` |
| [`GT-56`](./gap-reference-catalog.md#gt-56) | Silent failures and missing mocks in CLI E2E tests | `CLI` | Cross | P1 | M | `DONE` |
| [`GT-55`](./gap-reference-catalog.md#gt-55) | TypeScript strictness and implicit any elimination | `CLI` | Cross | P1 | M | `DONE` |
| [`GT-51`](./gap-reference-catalog.md#gt-51) | Build-versus-Compose gate evidence validation | `CLI` | F3 | P1 | M | `DONE` |
| [`GT-49`](./gap-reference-catalog.md#gt-49) | Enforce TypeScript strict mode and typed filesystem ports | `CLI` | Cross | P1 | M | `DONE` |
| [`GT-180`](./gap-reference-catalog.md#gt-180) | Replace cross-boundary `require()` with ES imports / dynamic `import()` | `CLI` | Cross | P1 | M | `DONE` |
| [`GT-181`](./gap-reference-catalog.md#gt-181) | Split large files into smaller modules | `CLI` | Cross | P1 | M | `DONE` |
| [`GT-182`](./gap-reference-catalog.md#gt-182) | Add tests for Core Domain SDK | `SDK` | Cross | P1 | M | `DONE` |
| [`GT-185`](./gap-reference-catalog.md#gt-185) | Fix MCP tool stubs | `MCP Services` | Cross | P1 | M | `DONE` |
| [`GT-184`](./gap-reference-catalog.md#gt-184) | Remove `@ts-nocheck` from 19 files | `CLI` | Cross | P1 | M | `DONE` |
| [`GT-210`](./gap-reference-catalog.md#gt-210) | Complete SDLC Phase 05 (missing phase) | `SDLC` | Cross | P1 | M | `DONE` |
| [`GT-46`](./gap-reference-catalog.md#gt-46) | Core HTTP service ownership boundary | `CLI` | F2 | P1 | M | `DONE` |
| [`GT-45`](./gap-reference-catalog.md#gt-45) | MCP transport and tool conformance suite | `CLI` | F2 | P1 | M | `DONE` |
| [`GT-17`](./gap-reference-catalog.md#gt-17) | DI consolidation and strict boundaries | `CLI` | F5 | P1 | M | `DONE` |
| [`GT-13`](./gap-reference-catalog.md#gt-13) | `evolith-phase-advance` proposal runner | `CLI` | F4 | P1 | M | `DONE` |
| [`GT-11`](./gap-reference-catalog.md#gt-11) | Phase 5 observability and rollback validation | `CLI` | F3 | P1 | M | `DONE` |
| [`GT-10`](./gap-reference-catalog.md#gt-10) | Phase 4 security scan content validation | `CLI` | F3 | P1 | M | `DONE` |
| [`GT-05`](./gap-reference-catalog.md#gt-05) | MCP SDK Streamable HTTP transport | `CLI` | F2 | P1 | M | `DONE` |
| [`GT-113`](./gap-reference-catalog.md#gt-113) | Clean Architecture Purification in core-domain | `Core Domain` | Transversal | P1 | M | `DONE` |
| [`MT-A11`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Create the modular-monolith topology profile | `Architecture` | Cross | P1 | M | `DONE` |
| [`MT-A12`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Create the distributed-modules topology profile | `Architecture` | Cross | P1 | M | `DONE` |
| [`MT-A13`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Create the microservices topology profile | `Architecture` | Cross | P1 | M | `DONE` |
| [`MT-A14`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Create draft profiles for serverless and edge computing | `Architecture` | Cross | P1 | M | `DONE` |
| [`MT-A15`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Create draft profiles for event-driven and data mesh | `Architecture` | Cross | P1 | M | `DONE` |
| [`MT-A16`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Create draft profile for agentic AI | `Architecture` | Cross | P1 | M | `DONE` |
| [`GT-42`](./gap-reference-catalog.md#gt-42) | Cross-repository contract conformance | `Governance` | Cross | P1 | M | `DONE` |
| [`GT-35`](./gap-reference-catalog.md#gt-35) | Automated inventories and tracking validation | `Governance` | Cross | P1 | M | `DONE` |
| [`GT-33`](./gap-reference-catalog.md#gt-33) | Evidence-backed maturity scoring | `Governance` | Product | P1 | M | `DONE` |
| [`GT-162`](./gap-reference-catalog.md#gt-162) | Aggregator `main.rego` unit tests and parity follow-through | `Rulesets` | Cross | P1 | M | `DONE` |
| [`GT-163`](./gap-reference-catalog.md#gt-163) | Topology manifest CI validation for referenced artifacts | `Rulesets` | Cross | P1 | M | `DONE` |
| [`GT-161`](./gap-reference-catalog.md#gt-161) | Formal JSON input schemas for core OPA policies | `Schema` | Cross | P1 | M | `DONE` |
| [`GT-170`](./gap-reference-catalog.md#gt-170) | UMS reference product hub | `Product` | Cross | P1 | M | `DONE` |
| [`GT-157`](./gap-reference-catalog.md#gt-157) | MCP authentication and authorization parity with REST | `MCP Services` | Cross | P1 | M | `DONE` |
| [`GT-158`](./gap-reference-catalog.md#gt-158) | Human-in-the-loop and ABAC scoping for mutative MCP tools | `MCP Services` | Cross | P1 | M | `DONE` |
| [`GT-160`](./gap-reference-catalog.md#gt-160) | Cross-surface correlation-ID and request-context propagation | `Cross` | Cross | P1 | M | `DONE` |
| [`GT-217`](./gap-reference-catalog.md#gt-217) | Backfill topology operational guidance corpus (7 topologies) | `Architecture` | Cross | P1 | L | `DONE` |
| [`GT-230`](./gap-reference-catalog.md#gt-230) | Create skills directory and composable skill framework | `Governance` | Cross | P1 | L | `DONE` |
| [`GT-236`](./gap-reference-catalog.md#gt-236) | Implement knowledge intake pipeline automation | `Governance` | Cross | P1 | L | `DONE` |
| [`GT-169`](./gap-reference-catalog.md#gt-169) | Agentic AI operational budgets, credential lifecycle, and runbooks | `Architecture` | Cross | P1 | L | `DONE` |
| [`GT-150`](./gap-reference-catalog.md#gt-150) | Mature Remaining Draft Topologies to Accepted Corpus Parity | `Architecture` | Cross | P1 | L | `DONE` |
| [`GT-168`](./gap-reference-catalog.md#gt-168) | Cross-topology composition reference application | `Architecture` | Cross | P1 | L | `DONE` |
| [`GT-145`](./gap-reference-catalog.md#gt-145) | Truthful Provider-Neutral RAG Vector Synchronization | `Operations` | Cross | P1 | L | `DONE` |
| [`GT-149`](./gap-reference-catalog.md#gt-149) | Executable OPA Tests and Native/OPA Semantic Parity Gate | `Rulesets` | Cross | P1 | L | `DONE` |
| [`GT-142`](./gap-reference-catalog.md#gt-142) | Real LLM Bridge Pipeline in CI for Agentic Reviews | `Governance` | Cross | P1 | L | `DONE` |
| [`GT-136`](./gap-reference-catalog.md#gt-136) | Context-Aware Access Control (ABAC for LLMs) | `Governance` | Cross | P1 | L | `DONE` |
| [`GT-118`](./gap-reference-catalog.md#gt-118) | Remote/SaaS consumption model — decouple Core API from local filesystem paths | `BFF API` | F3 | P1 | L | `DONE` |
| [`MT-A17`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Move or mirror current F1/F2/F3 rules into topology-aware ruleset discovery | `Core Domain` | Cross | P1 | L | `DONE` |
| [`MT-A18`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Add Native + OPA starter rules for serverless | `Rulesets` | Cross | P1 | L | `DONE` |
| [`MT-A19`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Add Native + OPA starter rules for event-driven | `Rulesets` | Cross | P1 | L | `DONE` |
| [`MT-A20`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Add Native + OPA starter rules for agentic AI | `Rulesets` | Cross | P1 | L | `DONE` |
| [`MT-A21`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Add shared topology catalog and manifest resolver in Core Domain | `Core Domain` | Cross | P1 | L | `DONE` |
| [`MT-A22`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Add CLI `--topology` support to validation | `Smart CLI` | Cross | P1 | L | `DONE` |
| [`MT-A24`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Add MCP topology resources and tools | `MCP Services` | Cross | P1 | L | `DONE` |
| [`MT-A25`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Add Service CORE API topology discovery and validation endpoints | `Core API` | Cross | P1 | L | `DONE` |
| [`GT-66`](./gap-reference-catalog.md#gt-66) | Distributed Tracing con OpenTelemetry | `BFF API` | F3 | P1 | L | `DONE` |
| [`GT-123`](./gap-reference-catalog.md#gt-123) | CLI does not build — pre-existing TypeScript errors block `tsc` (init.wizard, progress.service, alias, old MCP auto-fix) | `CLI` | Cross | P1 | L | `DONE` |
| [`GT-179`](./gap-reference-catalog.md#gt-179) | Add tests for 5 low-coverage CLI commands | `CLI` | Cross | P1 | L | `DONE` |
| [`GT-98`](./gap-reference-catalog.md#gt-98) | CLI extension/plugin system | `CLI` | Cross | P1 | L | `DONE` |
| [`GT-57`](./gap-reference-catalog.md#gt-57) | Incomplete MCP tooling and validation implementation | `CLI` | F2 | P1 | L | `DONE` |
| [`GT-19`](./gap-reference-catalog.md#gt-19) | Incremental hexagonal migration of `core/` | `CLI` | Cross | P1 | L | `DONE` |
| [`GT-111`](./gap-reference-catalog.md#gt-111) | Plan the MassTransit v9 commercial pivot (stay v8 OSS or move to Rebus) | `Platform` | Cross | P1 | L | `DONE` |
| [`GT-125`](./gap-reference-catalog.md#gt-125) | Maturation of Agentic AI Topology — modular-monolith maturity parity | `Architecture` | Cross | P1 | L | `DONE` |
| [`GT-218`](./gap-reference-catalog.md#gt-218) | Author Phase 05 rollback rehearsal + on-call handoff templates | `SDLC` | F5 | P2 | S | `DONE` |
| [`GT-219`](./gap-reference-catalog.md#gt-219) | Add `operationalBudgets` to agentic-ai topology manifest | `Architecture` | Cross | P2 | S | `DONE` |
| [`GT-240`](./gap-reference-catalog.md#gt-240) | Tighten CORS by environment (dev/staging/prod) | `Security` | Cross | P2 | S | `DONE` |
| [`GT-241`](./gap-reference-catalog.md#gt-241) | Add SBOM generation (CycloneDX) to CI pipeline | `Security` | Cross | P2 | S | `DONE` |
| [`GT-190`](./gap-reference-catalog.md#gt-190) | Add logging to 9 empty catch blocks | `CLI` | Cross | P2 | S | `DONE` |
| [`GT-191`](./gap-reference-catalog.md#gt-191) | Fix ADR matrix label mismatch | `Docs` | Cross | P2 | S | `DONE` |
| [`GT-192`](./gap-reference-catalog.md#gt-192) | Fix MASTER_INDEX EN links `.es.md` → `.md` | `Docs` | Cross | P2 | S | `DONE` |
| [`GT-193`](./gap-reference-catalog.md#gt-193) | Remove TODO placeholders from governance docs | `Docs` | Cross | P2 | S | `DONE` |
| [`GT-195`](./gap-reference-catalog.md#gt-195) | Fix Linux-only shell paths for Windows compat | `CLI` | Cross | P2 | S | `DONE` |
| [`GT-211`](./gap-reference-catalog.md#gt-211) | Create EN counterparts for 3 orphan ES-only ADRs | `Docs` | Cross | P2 | S | `DONE` |
| [`GT-119`](./gap-reference-catalog.md#gt-119) | Reconcile ADR-0074 §5 (MCP in NestJS) with the standalone `@evolith/mcp-server` | `Governance` | Cross | P2 | S | `DONE` |
| [`GT-68`](./gap-reference-catalog.md#gt-68) | Versionado de API con estrategia URI | `BFF API` | F3 | P2 | S | `DONE` |
| [`GT-77`](./gap-reference-catalog.md#gt-77) | CoreDomainModule extraído de AppModule | `BFF API` | Cross | P2 | S | `DONE` |
| [`GT-106`](./gap-reference-catalog.md#gt-106) | CLI command aliases | `CLI` | Cross | P2 | S | `DONE` |
| [`GT-108`](./gap-reference-catalog.md#gt-108) | CLI fixtures/test data | `CLI` | Cross | P2 | S | `DONE` |
| [`GT-109`](./gap-reference-catalog.md#gt-109) | CLI shell integration | `CLI` | Cross | P2 | S | `DONE` |
| [`GT-103`](./gap-reference-catalog.md#gt-103) | CLI subcommand depth | `CLI` | Cross | P2 | S | `DONE` |
| [`GT-105`](./gap-reference-catalog.md#gt-105) | CLI Docker image | `CLI` | Cross | P2 | S | `DONE` |
| [`GT-52`](./gap-reference-catalog.md#gt-52) | Remove dead dependency-injection container stubs | `CLI` | Cross | P2 | S | `DONE` |
| [`GT-82`](./gap-reference-catalog.md#gt-82) | Revive or remove the dead gate-status spec | `CLI` | Cross | P2 | S | `DONE` |
| [`GT-50`](./gap-reference-catalog.md#gt-50) | Enforce coverage thresholds in Jest configuration | `CLI` | F0 | P2 | S | `DONE` |
| [`GT-58`](./gap-reference-catalog.md#gt-58) | Clean up TODO stubs injected by Hexagonal Scaffolder | `Core Domain` | Cross | P2 | S | `DONE` |
| [`GT-78`](./gap-reference-catalog.md#gt-78) | Eliminar scripts de debug de la raíz del repositorio | `Governance` | Cross | P2 | S | `DONE` |
| [`GT-53`](./gap-reference-catalog.md#gt-53) | Repair migrated product-vision references | `Governance` | Cross | P2 | S | `DONE` |
| [`GT-26`](./gap-reference-catalog.md#gt-26) | Zero-Downtime Release Playbook | `Governance` | Cross | P2 | S | `DONE` |
| [`GT-22`](./gap-reference-catalog.md#gt-22) | ADR ID uniqueness scheme | `Governance` | Cross | P2 | S | `DONE` |
| [`GT-16`](./gap-reference-catalog.md#gt-16) | Documentation consolidation | `Governance` | F5 | P2 | S | `DONE` |
| [`GT-174`](./gap-reference-catalog.md#gt-174) | Envelope `meta.schemaVersion` and producer/consumer compatibility matrix | `Cross` | Cross | P2 | S | `DONE` |
| [`GT-220`](./gap-reference-catalog.md#gt-220) | Raise gate-status branch coverage (40% → ≥80%) and lift CLI branches threshold | `CLI` | Cross | P2 | M | `DONE` |
| [`GT-221`](./gap-reference-catalog.md#gt-221) | Add structured audit logging to MCP HTTP transport | `MCP Services` | Cross | P2 | M | `DONE` |
| [`GT-222`](./gap-reference-catalog.md#gt-222) | Add OPA test cases for under-covered topologies (modular-monolith 2/12, distributed-modules 4/8, agentic-ai 4/9) | `Rulesets` | Cross | P2 | M | `DONE` |
| [`GT-223`](./gap-reference-catalog.md#gt-223) | Add cross-surface parity e2e tests for core operations | `Cross` | Cross | P2 | M | `DONE` |
| [`GT-238`](./gap-reference-catalog.md#gt-238) | Add Prometheus/Mimir metrics to observability stack | `Operations` | Cross | P2 | M | `DONE` |
| [`GT-239`](./gap-reference-catalog.md#gt-239) | Define SLOs per service with alerting rules | `Operations` | Cross | P2 | M | `DONE` |
| [`GT-243`](./gap-reference-catalog.md#gt-243) | Implement k6 load tests (3 ADR-0037 scenarios) | `QA` | Cross | P2 | M | `DONE` |
| [`GT-244`](./gap-reference-catalog.md#gt-244) | Create incident response playbooks and templates | `Operations` | Cross | P2 | M | `DONE` |
| [`GT-178`](./gap-reference-catalog.md#gt-178) | Rebuild `core/README.es.md` with all ADRs | `Docs` | Cross | P2 | M | `DONE` |
| [`GT-186`](./gap-reference-catalog.md#gt-186) | Remove `@ts-nocheck` from 19 files (phased) | `CLI` | Cross | P2 | M | `DONE` |
| [`GT-187`](./gap-reference-catalog.md#gt-187) | Enable strict mode in tsconfig | `CLI` | Cross | P2 | M | `DONE` |
| [`GT-189`](./gap-reference-catalog.md#gt-189) | Replace `require()` with ES imports | `CLI` | Cross | P2 | M | `DONE` |
| [`GT-194`](./gap-reference-catalog.md#gt-194) | Eliminate `any` types in public APIs | `CLI` | Cross | P2 | M | `DONE` |
| [`GT-196`](./gap-reference-catalog.md#gt-196) | Add E2E tests for MCP HTTP transport | `MCP Services` | Cross | P2 | M | `DONE` |
| [`GT-173`](./gap-reference-catalog.md#gt-173) | OpenTelemetry export parity across CLI, MCP, and REST | `Cross` | Cross | P2 | M | `DONE` |
| [`GT-141`](./gap-reference-catalog.md#gt-141) | Concurrency Control and Resource Locking Standard for MCP Tools | `Architecture` | Cross | P2 | M | `DONE` |
| [`GT-137`](./gap-reference-catalog.md#gt-137) | Sovereign Identity for Agentic AI | `Architecture` | Cross | P2 | M | `DONE` |
| [`GT-138`](./gap-reference-catalog.md#gt-138) | Event-Driven Agentic Workflows | `Architecture` | Cross | P2 | M | `DONE` |
| [`GT-134`](./gap-reference-catalog.md#gt-134) | Standardized MCP Tools Registry | `Architecture` | Cross | P2 | M | `DONE` |
| [`GT-120`](./gap-reference-catalog.md#gt-120) | GraphQL exposure for the Core API (ADR-0074 scope) | `BFF API` | F3 | P2 | M | `DONE` |
| [`GT-121`](./gap-reference-catalog.md#gt-121) | Decommission the in-process MCP subsystem in the Smart CLI (post-delegation, ADR-0074/0075 Phase 3) | `CLI` | Cross | P2 | M | `DONE` |
| [`GT-122`](./gap-reference-catalog.md#gt-122) | Consolidate duplicated infrastructure adapters across sdk/cli, apps/core-api and packages/infra-providers | `Cross` | Cross | P2 | M | `DONE` |
| [`GT-124`](./gap-reference-catalog.md#gt-124) | CLI e2e suite broken — missing fixtures (SDLC templates, shell hooks) and stale old-MCP prompt naming | `CLI` | Cross | P2 | M | `DONE` |
| [`MT-A26`](./multi-topology-reference-corpus-implementation-plan.md#6-tracking-authority) | Update navigation, indexes, validation evidence, and tracker status | `Documentation` | Cross | P2 | M | `DONE` |
| [`GT-71`](./gap-reference-catalog.md#gt-71) | Circuit Breaker para llamadas a servicios externos | `BFF API` | F3 | P2 | M | `DONE` |
| [`GT-100`](./gap-reference-catalog.md#gt-100) | CLI API browser/explorer | `CLI` | Cross | P2 | M | `DONE` |
| [`GT-101`](./gap-reference-catalog.md#gt-101) | CLI auto-update mechanism | `CLI` | Cross | P2 | M | `DONE` |
| [`GT-102`](./gap-reference-catalog.md#gt-102) | CLI real-time progress/streaming | `CLI` | Cross | P2 | M | `DONE` |
| [`GT-104`](./gap-reference-catalog.md#gt-104) | CLI package-manager distribution | `CLI` | Cross | P2 | M | `DONE` |
| [`GT-107`](./gap-reference-catalog.md#gt-107) | CLI interactive wizards | `CLI` | Cross | P2 | M | `DONE` |
| [`GT-81`](./gap-reference-catalog.md#gt-81) | Raise CLI branch coverage to the statement floor | `CLI` | F0 | P2 | M | `DONE` |
| [`GT-116`](./gap-reference-catalog.md#gt-116) | Elimination of Blocking I/O Operations in the CLI | `CLI` | Transversal | P2 | M | `DONE` |
| [`GT-75`](./gap-reference-catalog.md#gt-75) | Paquete @evolith/infra-providers compartido | `Cross` | Cross | P2 | M | `DONE` |
| [`GT-24`](./gap-reference-catalog.md#gt-24) | Execute declared documentation migrations | `Governance` | Cross | P2 | M | `DONE` |
| [`GT-21`](./gap-reference-catalog.md#gt-21) | Placement review of tool-centric Core ADRs | `Governance` | Cross | P2 | M | `DONE` |
| [`GT-126`](./gap-reference-catalog.md#gt-126) | Maturation of Serverless Topology | `Architecture` | Cross | P2 | M | `DONE` |
| [`GT-127`](./gap-reference-catalog.md#gt-127) | Maturation of Event-Driven Topology | `Architecture` | Cross | P2 | M | `DONE` |
| [`GT-128`](./gap-reference-catalog.md#gt-128) | Baseline Ruleset for Data Mesh | `Architecture` | Cross | P2 | M | `DONE` |
| [`GT-129`](./gap-reference-catalog.md#gt-129) | Baseline Ruleset for Edge Computing | `Architecture` | Cross | P2 | M | `DONE` |
| [`GT-242`](./gap-reference-catalog.md#gt-242) | Complete OPA parity for 17 uncovered native rulesets | `Rulesets` | Cross | P2 | L | `DONE` |
| [`GT-188`](./gap-reference-catalog.md#gt-188) | Add tests for 15 zero-coverage files | `CLI` | Cross | P2 | L | `DONE` |
| [`GT-171`](./gap-reference-catalog.md#gt-171) | Command-as-a-service surface parity audit (CLI vs MCP vs REST) | `Cross` | Cross | P2 | L | `DONE` |
| [`GT-172`](./gap-reference-catalog.md#gt-172) | Cross-surface contract roundtrip test suite | `Cross` | Cross | P2 | L | `DONE` |
| [`GT-143`](./gap-reference-catalog.md#gt-143) | Multi-Agent Handoff and Task Delegation Standards | `Governance` | Cross | P2 | L | `DONE` |
| [`GT-139`](./gap-reference-catalog.md#gt-139) | RAG Knowledge Governance Standard | `Governance` | Cross | P2 | L | `DONE` |
| [`GT-133`](./gap-reference-catalog.md#gt-133) | Centralized Agnostic OPA Wasm Distribution Architecture | `Architecture` | Cross | P2 | L | `DONE` |
| [`GT-131`](./gap-reference-catalog.md#gt-131) | Create Sandbox/Reference App for Agentic AI Topology with live MCP | `Architecture` | Cross | P2 | L | `DONE` |
| [`GT-115`](./gap-reference-catalog.md#gt-115) | Auto-fix of Architectural Failures via MCP Tools | `CLI` | Transversal | P2 | L | `DONE` |
| [`GT-54`](./gap-reference-catalog.md#gt-54) | Complete strict hexagonal boundary enforcement | `Cross` | Cross | P2 | L | `DONE` |
| [`GT-36`](./gap-reference-catalog.md#gt-36) | Machine-readable rules language coverage | `Governance` | Cross | P2 | L | `DONE` |
| [`GT-25`](./gap-reference-catalog.md#gt-25) | First provider profiles | `Governance` | Cross | P2 | L | `DONE` |
| [`GT-23`](./gap-reference-catalog.md#gt-23) | Spanish translation backfill | `Governance` | Cross | P2 | L | `DONE` |
| [`GT-197`](./gap-reference-catalog.md#gt-197) | Fix intermittent release pipeline failures | `CI` | Cross | P2 | XL | `DONE` |
| [`GT-225`](./gap-reference-catalog.md#gt-225) | Revive or document 4 `it.skip` cases in `wizard.service.spec` | `CLI` | Cross | P3 | XS | `DONE` |
| [`GT-224`](./gap-reference-catalog.md#gt-224) | Add `--format json` to `drift`/`scaffold`/`docs` CLI commands (ADR-0073 envelope) | `CLI` | Cross | P3 | S | `DONE` |
| [`GT-247`](./gap-reference-catalog.md#gt-247) | Replace hardcoded Docker-compose credentials | `Platform` | Cross | P3 | S | `DONE` |
| [`GT-248`](./gap-reference-catalog.md#gt-248) | Create ADR freshness monitor and weekly review script | `Governance` | Cross | P3 | S | `DONE` |
| [`GT-198`](./gap-reference-catalog.md#gt-198) | Fix `Moscoww` typo (5 sites) | `CLI` | Cross | P3 | S | `DONE` |
| [`GT-199`](./gap-reference-catalog.md#gt-199) | Move import to top of file | `CLI` | Cross | P3 | S | `DONE` |
| [`GT-200`](./gap-reference-catalog.md#gt-200) | Convert 11-param constructor to options object | `CLI` | Cross | P3 | S | `DONE` |
| [`GT-201`](./gap-reference-catalog.md#gt-201) | Extract hardcoded values to constants | `CLI` | Cross | P3 | S | `DONE` |
| [`GT-202`](./gap-reference-catalog.md#gt-202) | Add README to `governance/adr/` directory | `Docs` | Cross | P3 | S | `DONE` |
| [`GT-203`](./gap-reference-catalog.md#gt-203) | Remove or populate empty `kubernetes/` dir | `Docs` | Cross | P3 | S | `DONE` |
| [`GT-204`](./gap-reference-catalog.md#gt-204) | Add READMEs to infra directories | `Docs` | Cross | P3 | S | `DONE` |
| [`GT-205`](./gap-reference-catalog.md#gt-205) | Add README to SDLC playbooks dir | `Docs` | Cross | P3 | S | `DONE` |
| [`GT-206`](./gap-reference-catalog.md#gt-206) | Formalize BILINGUAL_INDEX nesting rule | `Docs` | Cross | P3 | S | `DONE` |
| [`GT-207`](./gap-reference-catalog.md#gt-207) | Standardize ADR heading format | `Docs` | Cross | P3 | S | `DONE` |
| [`GT-208`](./gap-reference-catalog.md#gt-208) | Schedule ADR-0077 re-evaluation reminder | `Docs` | Cross | P3 | S | `DONE` |
| [`GT-245`](./gap-reference-catalog.md#gt-245) | Add DAST (OWASP ZAP) to security pipeline | `Security` | Cross | P3 | L | `DONE` |
| [`GT-246`](./gap-reference-catalog.md#gt-246) | Implement Chaos Mesh/Litmus experiments | `QA` | Cross | P3 | L | `DONE` |


**Progress:** 282 / 312 done · 0 in progress · 30 pending · 0 deferred

**Wave 2026-06-23 (Wilson deep audit III):** Added 14 new gaps `GT-212`…`GT-225` from the Wilson Audit Playbook covering: ADR status hygiene (GT-212), topology manifest metadata + operational budgets + guidance corpus (GT-213, GT-217, GT-219), REST controller observability + OpenAPI (GT-214, GT-215), OPA input-schema parity + per-topology test density (GT-216, GT-222), SDLC Phase 05 rollback + on-call templates (GT-218), CLI branch coverage + envelope format coverage + skip-list cleanup (GT-220, GT-224, GT-225), MCP HTTP audit logging (GT-221), and cross-surface parity e2e tests (GT-223).

**Wave 2026-06-23 (Wilson BMAD agent evolution analysis):** Added 23 new gaps `GT-226`…`GT-248` covering agent orchestration (GT-228), Dual-Engine completion (GT-229), skills framework (GT-230), CI wiring gaps (GT-231, GT-235), agent persona completeness (GT-232), API security hardening (GT-233, GT-240), SAST/SCA tooling (GT-227, GT-241), dependency automation (GT-226), bilingual parity repair (GT-234), knowledge pipeline (GT-236), AI ADR authorship (GT-237), observability gaps (GT-238, GT-239), OPA coverage expansion (GT-242), performance testing (GT-243), incident response (GT-244), DAST/chaos (GT-245, GT-246), infrastructure hardening (GT-247), and governance automation (GT-248).

**Wave 2026-06-22 (Wilson deep audit):** Added 3 new gaps `GT-209`…`GT-211`: missing agnostic baseline, incomplete SDLC Phase 05, and orphan Spanish-only ADRs without English counterparts.

**Wave 2026-06-21 (Wilson deep audit):** Added 20 new gaps `GT-155`…`GT-174` covering Core API envelope conformance, command-as-a-service surface parity, MCP authn/authz, OPA schemas/aggregator tests, topology manifest validation, SDLC runbooks/templates, Core API and UMS product hubs, agentic-AI operational budgets, OpenTelemetry parity, and envelope schema versioning.

**Wave 2026-06-22 (NXT backlog integration):** Added 34 new gaps `GT-175`…`GT-208` from the Deep Coherence Analysis covering CLI code quality, documentation completeness, test coverage, infrastructure READMEs, and ADR standardization.

**Wave 2026-06-23 (deep architectural audit):** Added 16 new gaps `GT-250`…`GT-265` covering: MCP auth bypass (GT-250), command injection (GT-251), 19 orphaned OPA policies (GT-252), trivy version pinning (GT-253), path traversal (GT-254), CSP headers (GT-255), Traefik healthcheck (GT-256), MongoDB version pinning (GT-257), GH Actions concurrency (GT-258), publish trigger (GT-259), PO agent ES file (GT-260), Docker resource limits (GT-261), backup/DR (GT-262), Prometheus alerts (GT-263), DAST target fix (GT-264), and secret detection (GT-265). All 16 code-verified by Winston deep audit 2026-06-24.

**Wave 2026-06-24 (architectural discovery):** Added `GT-266` — API key provisioning service for MCP HTTP transport, discovered while analyzing GT-250 external-consumption requirements.

**Wave 2026-06-25 (Wilson production-readiness audit):** Added 6 new gaps `GT-267`…`GT-272` covering red workspace build/test after Redis cache integration (GT-267), missing CI validator scripts referenced by workflows/rules (GT-268), ADR-0073 contract roundtrip failure (GT-269), mutable/insecure infrastructure defaults (GT-270), Helm workload hardening (GT-271), and OPA bundle integrity for sidecars (GT-272).

**Wave 2026-06-25 (SDLC Deep Audit):** Added 3 new gaps `GT-280`…`GT-282` from the SDLC Deep Audit playbook (`.harness/playbooks/sdlc-deep-audit.mjs`) — registered as `run-evolith-deep.mjs`. Evaluated Evolith Core against the 8-dimensional executable SDLC vision (Corpus, SDLC Modelo, Motor OPA, Ingesta Cliente, Tres Interfaces, Reporte, Gobernanza, Verificaciones). Score: 3/8 SÓLIDO, 2 PARCIAL, 3 AUSENTE. The 3 AUSENTE dimensions became GT-280 (SDLC phases as data), GT-281 (end-to-end evaluation pipeline), and GT-282 (actionable evaluation reports).

**Wave 2026-06-25 (GT-280 closure):** Created `reference/governance/sdlc/phases/phase-f1.json`…`phase-f5.json` with structured phase data, `reference/governance/sdlc/gates/gate-f1.json`…`gate-f5.json` with `requiredArtifacts[]` and `rules[]` referencing 26 Rego files, `.harness/playbooks/sdlc-phase-gate-validator.mjs` cross-reference checker, and Rego rules `rulesets/opa/sdlc/coverage.rego` + `rulesets/opa/sdlc/pyramid-distribution.rego`. Updated `sdlc-deep-audit.mjs` to detect structured data. Score evolved from 3/8→4/8 SÓLIDO. GT-280 closed.

**Wave 2026-06-25 (GT-281 closure):** Created `SatelliteEvaluationPipeline` (`packages/core-domain/src/application/services/satellite-evaluation-pipeline.service.ts`) — composite service that orchestrates manifest → topology resolution → GT-280 gate loading → Rego rule execution → structured verdict. Created `SdlcDataLoaderService` for GT-280 runtime data loading. Created `SatelliteManifest` type (`domain/satellite-manifest.ts`). Updated `ValidateSatelliteUseCase` to accept `manifest?: SatelliteManifest`. Wired CLI `evolith validate --manifest/--phase`, MCP `evolith-validate` manifest/topology/phase params. Added end-to-end test (`satellite-evaluation-pipeline.spec.ts`) with 3 cases. Updated `sdlc-deep-audit.mjs` to detect pipeline and report SÓLIDO. Score evolved from 4/8→5/8 SÓLIDO. GT-281 closed.

**Wave 2026-06-25 (GT-282 closure):** Enhanced `RuleEvaluation` type with `severity`, `remediation`, `gateRef` for actionable output. Added ADR-0073 `outputEnvelope` to `EvaluationVerdict`. Updated `SatelliteEvaluationPipeline` to produce detailed evidence (remediation text for missing artifacts, severity derived from blocking criteria, gate cross-reference). Updated CLI to display `severity`, `remediation`, and `gateRef` per evaluation. Updated MCP `evolith-validate` to include `severity`, `remediation`, `gateRef` in pipeline output. Added 5 test cases for GT-282 (severity/remediation/gateRef in failures, severity derivation, passing evaluation fields, outputEnvelope, remediation content). Fixed `auditActionableReports` in deep audit to use direct file checks instead of broken `globFiles`. Score evolved from 5/8→6/8 SÓLIDO. GT-282 closed.

**Wave 2026-06-25 (Topology compliance audit):** Added 3 new gaps `GT-277`…`GT-279` from the automated topology compliance audit playbook (`.harness/playbooks/topology-compliance-audit.mjs`). All 8 accepted topologies scored 18/21 (86%) — missing the 3 mandatory framework interfaces: OpenAPI specs, MCP tool manifests, and CLI flow files. The audit script is now executable standalone and registered as a Wilson-executable tool via `run-wilson-audit.mjs --topology`.

**Wave 2026-06-25 (Wilson control-plane audit):** Added 3 new gaps `GT-274`…`GT-276`, reopened `GT-267` because current Core API/MCP/CLI tests still fail, and reopened `GT-272` because the Helm defaults still fetch unsigned HTTP OPA bundles. The audit explicitly covered all accepted topologies (`modular-monolith`, `distributed-modules`, `microservices`, `serverless`, `event-driven`, `data-mesh`, `edge-computing`, `agentic-ai`) and both rule engines: topology manifests passed, Native/OPA rule coverage passed, topology OPA tests passed, and `EVOLITH_PARITY_FULL=true node .harness/scripts/ci/27-opa-parity-gate.mjs` evaluated 16 fixtures with 0 drift.

**Ordering:** one table, ordered by status (pending then completed), then criticality (`P0` → `P1` → `P2` → `P3`), then complexity (`XS` → `S` → `M` → `L` → `XL`). `GT-*` IDs link to the [Gap Reference Catalog](./gap-reference-catalog.md); `MT-A*` IDs link to the supporting [Multi-Topology implementation plan](./multi-topology-reference-corpus-implementation-plan.md).

---
[Back to Vision Index](./README.md)
