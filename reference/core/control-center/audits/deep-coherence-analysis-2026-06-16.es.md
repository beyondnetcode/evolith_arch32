# Análisis Profundo de Coherencia - Evolith Core, CLI, BFF, MCP Deep Coherence Analysis - Evolith Core, CLI, BFF, MCP & Documentation Documentación

**Fecha:** 2026-06-16  
**Alcance:** Full repository analysis  
**Estado:** 34 hallazgos identificados

---

## Análisis de Código CLI - 14 Findings

### HIGH Severity

| # | Finding | Files | Impact |
|---|---------|-------|--------|
| 1 | **5 commands with 12-31% coverage** | `agents.command.ts`, `gate.command.ts`, `phase-advance.command.ts`, `init.wizard.ts` | User-facing commands unvalidated |
| 2 | **19 files with @ts-nocheck** | `server.ts`, `app.module.ts`, 8 MCP tools, 5 commands | Entire type system bypassed |
| 3 | **4 cross-boundary require() calls** | `architecture.ts`, `sdlc.ts`, `gate.ts`, `validate.ts` | Layer architecture violation |
| 4 | **6 files >300 lines** | `server.ts` (420L), `api.command.ts` (364L), `prompt.service.ts` (355L) | Mantenibilidad risk |

### MEDIUM Severity

| # | Finding | Files | Impact |
|---|---------|-------|--------|
| 5 | **27 require() instances bypassing TS** | 10 files | Prevents static analysis |
| 6 | **9 empty catch blocks** | `server.ts`, `update.command.ts`, `formatter`, `executor` | Silent error suppression |
| 7 | **15 files with zero tests** | `prompt.service.ts` (355L), `agents.command.ts` (330L) | Unvalidated code |
| 8 | **`any` types in public APIs** | `plugin-loader.ts`, `app.module.ts`, `auto-fix.ts` | Type safety gaps |
| 9 | **Linux-only shell paths** | `completion.command.ts`, `update.command.ts` | Windows incompatibility |

### LOW Severity

| # | Finding | Files | Impact |
|---|---------|-------|--------|
| 10 | **`Moscoww` typo (5 sites)** | `prompts/index.ts`, `resources/index.ts` | Naming inconsistency |
| 11 | **Import at file bottom** | `output-formatter.service.ts:242` | Style violation |
| 12 | **11-param constructor** | `server.ts` | Fragile design |
| 13 | **Hardcoded values** | `server.ts` (127.0.0.1, evolith.yaml x4) | Config coupling |
| 14 | **Chalk in infrastructure service** | `output-formatter.service.ts` | CLI lib in infra |

---

## Análisis de Documentación - 14 Findings

### HIGH Severity

| # | Finding | Files | Impact |
|---|---------|-------|--------|
| 15 | **ADR-0076 numerical duplicate** | `0076-domain-oriented-*` vs `0076-opa-bundle-*` | Registry conflict |
| 16 | **core/README.md missing 6 ADRs** | ADRs 0073-0077 not listed | Navigation gap |
| 17 | **core/README.es.md missing 30+ ADRs** | Only shows ADRs to 0056 | Bilingual parity failure |
| 18 | **Pattern A/B mix in patterns/** | 4 files duplicated in both `.es.md` and `es/` | Convention violation |

### MEDIUM Severity

| # | Finding | Files | Impact |
|---|---------|-------|--------|
| 19 | **ADR matrix: dotnet/ADR-0057 = wrong number** | `adr-matrix.md:12` points to 0071 file but says 0057 | Reference error |
| 20 | **Missing README in governance/adr/** | `adr-0090-*` has no README/BILINGUAL_INDEX | Navigation gap |
| 21 | **EN MASTER_INDEX links to .es.md** | Lines 27,48 link Spanish from English | Language confusion |
| 22 | **TODO placeholders in governance** | `mcp-security.md` rate limiting/sandbox TODOs | Normative doc weakness |

### LOW Severity

| # | Finding | Files | Impact |
|---|---------|-------|--------|
| 23 | **Empty kubernetes/ directory** | `product/infra/kubernetes/` | Confusion risk |
| 24 | **Missing READMEs in infra/** | `docker/`, `helm/`, `kubernetes/` | Documentation gap |
| 25 | **Missing README in SDLC playbooks** | `01-playbooks/` | Navigation gap |
| 26 | **Inconsistent BILINGUAL_INDEX nesting** | Deep directories lack indexes | Coverage gap |
| 27 | **ADR heading format inconsistent** | 3 different formats across core ADRs | Style drift |
| 28 | **Time-sensitive ADR-0077** | MassTransit v8 EOL end-2026 | Maintenance needed |

---

## Hallazgos Adicionales (Cross-Area)

### HIGH Severity

| # | Finding | Detail |
|---|---------|--------|
| 29 | **Evolith Core SDK has no tests** | `packages/core-domain/` has zero test coverage despite being shared |
| 30 | **No BFF implementation code found** | 4 ADRs reference NestJS BFF but no code exists |
| 31 | **MCP tools: 3 implemented as stubs** | `phase-advance.ts` 19.44% coverage; `validate.ts` 90% but fragile |

### MEDIUM Severity

| # | Finding | Detail |
|---|---------|--------|
| 32 | **tsconfig strictness globally disabled** | `strictNullChecks: false`, `noImplicitAny: false`, `strict: false` |
| 33 | **No E2E tests for MCP HTTP transport** | `mcp-serve.command.spec.ts` exists but HTTP transport untested |
| 34 | **Release pipeline still failing intermittently** | 9 automated failure issues closed; root cause not fixed |

---

## Matriz Resumen

| Category | HIGH | MEDIUM | LOW | TOTAL |
|----------|------|--------|-----|-------|
| CLI Code | 4 | 5 | 5 | 14 |
| Documentation | 4 | 4 | 6 | 14 |
| Cross-Area | 3 | 3 | 0 | 6 |
| **TOTAL** | **11** | **12** | **11** | **34** |

---

## Plan de Acción Prioritario

### Iteración 1 (HIGH - 11 hora, ~40h)

| Order | # | Acción | Horas |
|-------|---|--------|-------|
| 1 | 15 | Fix ADR-0076 duplicate (renumber OPA to 0078) | 1h |
| 2 | 18 | Remove `patterns/es/` subdirectory (Pattern A/B mix) | 1h |
| 3 | 16 | Complete core/README.md with missing ADRs 0073-0077 | 1h |
| 4 | 17 | Rebuild core/README.es.md with all ADRs | 3h |
| 5 | 1 | Add tests for 5 low-coverage commands | 10h |
| 6 | 3 | Replace cross-boundary require() with DI | 4h |
| 7 | 4 | Split server.ts (420L → 3 files) | 6h |
| 8 | 29 | Add tests for Core Domain SDK | 6h |
| 9 | 30 | Build minimal BFF scaffolding (NestJS) | 8h |

### Iteración 2 (MEDIUM - 12 hora, ~30h)

| Order | # | Acción | Horas |
|-------|---|--------|-------|
| 10 | 2 | Remove @ts-nocheck from 19 files (phased) | 8h |
| 11 | 32 | Enable strict mode in tsconfig (phased) | 4h |
| 12 | 7 | Add tests for 15 zero-coverage files | 8h |
| 13 | 5 | Replace 27 require() with imports | 4h |
| 14 | 6 | Add logging to 9 empty catch blocks | 2h |
| 15 | 19 | Fix ADR matrix label (0057 → 0071) | 1h |
| 16 | 21 | Fix MASTER_INDEX EN links (.es.md → .md) | 1h |
| 17 | 22 | Remove TODO placeholders from governance | 2h |

### Iteración 3 (LOW - 11 hora, ~15h)

| Order | # | Acción | Horas |
|-------|---|--------|-------|
| 18 | 10 | Fix Moscoww typo | 1h |
| 19 | 11 | Move import to top of file | 1h |
| 20 | 12 | Convert constructor to options object | 2h |
| 21 | 13 | Extract hardcoded values to constants | 1h |
| 22 | 20 | Add README to governance/adr/ | 1h |
| 23 | 23 | Remove or populate empty kubernetes/ dir | 1h |
| 24 | 24 | Add READMEs to docker/ helm/ kubernetes/ | 2h |
| 25 | 25 | Add README to SDLC 01-playbooks/ | 1h |
| 26 | 26 | Formalize BILINGUAL_INDEX nesting rule | 2h |
| 27 | 27 | Standardize ADR heading format | 2h |
| 28 | 28 | Schedule ADR-0077 re-evaluation reminder | 1h |

---

## Resumen de Métricas

| Metric | Current | Target |
|--------|---------|--------|
| CLI Line Coverage | 81.79% | 85% |
| CLI Branch Coverage | 67.75% | 75% |
| @ts-nocheck Files | 19 | 0 |
| require() Instances | 27 | 0 |
| Empty Catch Blocks | 9 | 0 |
| Files >300 Lines | 6 | 0 |
| Zero-Coverage Files | 15 | 0 |
| ADR Duplicates | 1 (0076) | 0 |
| Missing READMEs | 5 areas | 0 |
| BILINGUAL_INDEX Gaps | 8 dirs | 0 |
| **Total Findings** | **34** | **0** |

---

## Creación de Items del Backlog

This analysis identifies **28 new actionable hora** for the next sprint. Items can be organized as:

| Prefix | Type | Count |
|--------|------|-------|
| **NXT-001 to NXT-011** | HIGH severity (Iteración 1) | 11 |
| **NXT-012 to NXT-023** | MEDIUM severity (Iteración 2) | 12 |
| **NXT-024 to NXT-034** | LOW severity (Iteración 3) | 11 |

**Nuevo backlog total:** 28 hora  
**Esfuerzo estimado:** ~85 hours across 3 sprints

---

[Volver al indice](../README.md)
