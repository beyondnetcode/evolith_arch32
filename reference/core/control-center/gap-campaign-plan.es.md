# Plan de Campaña de Cierre de Gaps — Olas Paralelas

> **Bilingüe:** [English version](./gap-campaign-plan.md)
> **Responsable:** Winston (Arquitecto Principal) · **Fuente de verdad** de cómo se conduce el backlog de gaps abiertos hacia el cierre.
> Complementa a [`gaps/gap-tracking.es.md`](./gaps/gap-tracking.es.md) (estado) y [`opportunities/`](./opportunities). Este archivo es el **flujo**; el board es el **estado**.

Plan ordenado por dependencias y gateado por verificabilidad. Existe para que cualquier sesión o agente retome la campaña sin re-derivarla.

## Protocolo operativo (el contrato que obedece cada ola)

1. **Carril de verificabilidad primero.** Solo lo verificable *en este checkout* cuenta como `COMPLETADO` (core-domain / CLI / MCP / core-api `jest` + `tsc` + guard 08). Todo lo que requiera infra real (Docker/K8s/VPS/CI/sandbox/GitHub App/publish npm) es el **carril bloqueado** — se registra `EN-PROGRESO` nombrando la parte gated. **Nunca marcar un criterio de aceptación no cumplido.**
2. **Paralelismo por ficheros disjuntos.** Dentro de una ola, cada lane toca código separado → agentes worktree-aislados. El board (`gap-tracking`, catálogo, `gap-closure-evidence.json`) es **single-driver** (el orquestador), reconciliado secuencialmente tras recolectar los SHA.
3. **Protocolo de worktree.** Cada agente: `git merge --ff-only develop` (los worktrees nacen de una base VIEJA) → symlink `node_modules` del checkout principal → **reproducir el bug en develop primero** (muchos gaps son drift ya-resuelto) → arreglar solo si hace falta → verificar → commitear solo código. Orquestador: cherry-pick de SHA → **re-verificar combinado sobre develop** (atrapa drift de base) → reconciliar board → guard 08 → push → limpiar worktrees.
4. **Gate entre olas.** Ninguna ola avanza sin verde combinado.

## Las olas

### Ola 1 · Quick wins verificables — 3 lanes en paralelo *(en curso)*
- **Lane A** — `GT-475` HITL MCP: `mutative:true` en tools write-class + guard de paridad.
- **Lane B** — `GT-481` (e2e `mcp` muerto) · `GT-453` (`evolith.yaml.example` inválido) · `GT-454` (manifest root de `docs`).
- **Lane C** — `GT-457` (detalle en validate-table) · `GT-458` (routing de flags de agents) · `GT-459` (crash de DI en upgrade).
- **Gate:** CLI jest + MCP jest + guard 08.

### Ola 2 · Cluster de guards de gobernanza — el habilitador de máxima palanca
Este cluster gatea una cola grande de gaps "chicos". Secuencia: `GT-479` (hacer real el test cross-surface falso-verde) → promover los 22 bindings del envelope a `verified` → re-correr `test:exploration`; los verdes cierran **~22 gaps del envelope** (`GT-485…509`), los rojos se registran como hallazgos de paridad reales. En paralelo: `GT-476` (re-apuntar rutas del guard `.harness` + wiring CI) → `GT-477` (enforcement vivo del contador). Completar este cluster también destraba `GT-480` (criterio 2) y `GT-510` (criterio 3 = guard 09 / re-observación de madurez).
- **Gate:** `test:exploration` + guard 08 + guard 09 verde.

### Ola 3 · Completar EAG — 3 lanes + gate encadenado (respeta el DAG)
- `GT-516` PolicyCompiler + `enforce compile` (CLI · dep `GT-514` ✓) → `GT-518` gate PR/CI (dep `GT-516`; local = fallback comment+exit-code, no la GitHub App).
- `GT-519` paridad + observabilidad (Core · dep `GT-514` ✓).
- `GT-520` MCP endurecido OAuth/ABAC (MCP · dep `GT-513`).
- **Gate:** CLI/MCP jest + guard 08.

### Ola 4 · Terminar CLI en curso *(oportunista, paralelo)*
`GT-455` · `GT-456` · `GT-460` · `GT-461` — verificar contra develop, completar, cerrar.

## Ola 5 · Campaña de infra — handoff (entorno separado, NO este checkout)
La superficie verificable-aquí está **agotada**: cada gap de Core restante tiene su slice verificable HECHO en `develop` y está `EN-PROGRESO` con solo su cola de infra/deploy abierta. Este es el handoff ordenado — cada entrada nombra el substrato exacto que necesita. Corre donde exista un deploy/runtime real (K8s/VPS/Coolify/CI/secrets/sandbox/IdP).

### 5a · Runtime de sandbox/provisioning — la piedra angular
- **`GT-512`** (P0) — restore (`npm ci` / `dotnet restore+build` / `pip install`+grimp / `composer install`) + scoping Nx por proyecto + cache por SHA + **sandbox de shell-out** (sin egress, sin secretos, ulimits/cgroups, allowlist de binarios). Contratos/política/cache HECHOS; falta un `IProcessRunner` sandboxeado (cgroups/namespaces o contenedor). **Destraba →** `GT-515` (`depcruise -T json` real sobre el corpus de Core) + `GT-516` (`enforce run` + round-trip-0-FP).

### 5b · Pipeline CD + registry + deploy
- **`GT-324`** (P1) — build+push GHCR de core-api & mcp-server + deploy Coolify guardado. Código completo; falta el `GITHUB_TOKEN`/secrets + una corrida CD.
- **`GT-437`** (P1) — mismo CD para `agent-runtime-api` (GHCR + Coolify).
- **`GT-442`** (P1) — secrets productivos + conectividad DB (Coolify vault / K8s secrets) — prerrequisito de todo deploy.

### 5c · Wiring productivo (necesita los servicios desplegados + sistemas externos)
- **`GT-438`** (P1) — bootstrap cablea los adapters REALES: Core-eval (HTTP a un Core corriendo), engine (Hermes/routing), memoria durable+scheduler. Adapters existen; faltan los endpoints vivos de Core + Hermes vía env.
- **`GT-439`** (P1) — issuer JWT JWKS/asimétrico vivo + deploy multi-tenant real (slice HS256 + `TenantCorpusGuard` HECHO).
- **`GT-441`** (P1) — transporte HITL Tracker/Slack real detrás de `IApprovalTransport` (gate pending/approve/expire HECHO).
- **`GT-520`** (P1) — bearer OAuth 2.1 vía IdP externo + Streamable HTTP (ABAC per-identidad + audit + resources HECHO).

### 5d · Superficies externas
- **`GT-513`** (P1) — desplegar el endpoint vivo `GET /api/v1/capabilities` + publicar el paquete npm `@beyondnet/evolith-contracts` (builder del manifiesto + guard de drift HECHO).
- **`GT-518`** (P1) — gate de drift PR/CI en la Checks API de GitHub: una GitHub App con `checks:write` + GHAS (exporter SARIF + manifiesto de evidencia HECHO).

### 5e · Validación & observabilidad
- **`GT-443`** (P2) — reliability: tests de integración de circuit-breaker (opossum) contra un sistema corriendo antes de cualquier claim de HA.
- **`GT-444`** (P2) — pen-test externo (SAST/SCA ya automatizados).
- **`GT-519`** (P2) — imágenes CI componibles por-runtime (con vuln-scan + Renovate) + wiring OTel a un collector real (la capa de métricas OTel del enforcer está HECHA).

### 5f · Milestones & acción del usuario
- **`GT-435`** (P0, umbrella) / **`GT-447`** (P0) — Objetivo 1: stack funcional en local (Docker/K8s), UI en URLs locales. Cierra cuando aterricen 5a–5e.
- **`GT-451`** (P0) — **acción del usuario:** `npm publish` de la CLI (`@beyondnet/evolith-cli`, código bumpeado listo).

**Cross-repo (excluido — board del Tracker):** `GT-446` (piloto prod Tracker) · `GT-448` (Objetivo 2 producción).

## Carril de sesiones concurrentes (no este driver)
`GT-460` (task regen api-catalog), `GT-476`/`GT-477`/`GT-480`/`GT-523`/`GT-445` (guard de gobernanza/madurez/doc-count) los manejan las sesiones concurrentes que lanzó el usuario — regla de un solo driver, este driver no los toca.

## Impacto proyectado
De 51 abiertos → ~11 (el carril bloqueado). Ola 1 ≈ 8, Ola 2 ≈ 24 (envelope + cluster de guards), Ola 3 ≈ 4 EAG, Ola 4 ≈ 4.

## Bitácora de estado
- 2026-07-12 — Plan redactado. Ola 1 lanzada (3 lanes). Se descubrió que `GT-480`/`GT-510` están gateados por el cluster de guards de la Ola 2, no son cierres libres — reubicados en consecuencia.
- 2026-07-12 — **`GT-481` → COMPLETADO** (`83545d36`). Los reds e2e restantes NO eran deuda de fixtures legacy (los fixtures v1 no pusieron ningún test en verde). Causas reales: el split de taxonomía `98a20dca` (`reference/`@raíz vs `rulesets/`@src → REPO_ROOT de `gate.e2e` + resolución de `reference/` en `gate-status`) y 5 tests `validate`/arch verificando un `passed|warning` inalcanzable contra un fixture vacío. Resuelto solo-tests (fixtures v1 + fix de REPO_ROOT + contrato ADR-0073 real + Core mock para gate-status); suite e2e del CLI en verde (18 suites / 132 tests). El defecto de fondo del path `reference/` del CLI standalone queda con `GT-451` (F-007). Board 465/523 · 12 IP · 43 pendientes.
- 2026-07-12 — **Olas 2–5 ejecutadas por este driver vía fleets paralelos.** Cerrados **29 gaps de Core** en una reconciliación de worktree aislado — el batch envelope `GT-485…509` (destrabado por el habilitador cross-surface `GT-479`: los 24 bindings de ops-envelope promovidos a `verified`, `test:exploration` findings=0), más `GT-455`/`GT-456`/`GT-461` y (antes) `GT-478`/`GT-482`/`GT-483`. Avanzados **8 slices EAG + seguridad a EN-PROGRESO** con solo su cola de infra: `GT-512`/`GT-513`/`GT-515`/`GT-516`/`GT-518`/`GT-519`/`GT-520`/`GT-439`/`GT-441` — ver **Ola 5** para el handoff por gap. Board **494/523 · 14 IP · 12 pendientes · 3 diferidos**. **La superficie verificable-aquí de Core está AGOTADA** — lo que queda es infra de Ola 5, propiedad de sesiones concurrentes, o el `npm publish` de `GT-451`. Sobrevivió a múltiples drivers concurrentes reseteando el árbol compartido (cero pérdida) vía: worktrees aislados para toda reconciliación de board, staging de archivos explícito (nunca `git add -A`), recálculo del contador desde ground-truth, y exclusión de gaps concurrent-owned.
