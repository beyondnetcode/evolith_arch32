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

## Carril bloqueado — campaña de infra aparte (NO en este entorno)
Requiere Docker/K8s/VPS/Coolify/secrets/CI o acción del usuario; mantener `EN-PROGRESO` nombrando la parte gated.
- **Épico de producción:** `GT-435` · `GT-437`–`GT-448` · `GT-324` · `GT-446` · milestones `GT-447`/`GT-448`.
- **Ejecución real EAG:** `GT-512` ejecución sandbox/restore · `GT-515` AC3 (corrida real de `depcruise` sobre corpus) · `GT-513` endpoint vivo + paquete npm · `GT-518` gate con GitHub App.
- **Acción del usuario:** `GT-451` — publicar la CLI a npm (código listo aquí).

## Impacto proyectado
De 51 abiertos → ~11 (el carril bloqueado). Ola 1 ≈ 8, Ola 2 ≈ 24 (envelope + cluster de guards), Ola 3 ≈ 4 EAG, Ola 4 ≈ 4.

## Bitácora de estado
- 2026-07-12 — Plan redactado. Ola 1 lanzada (3 lanes). Se descubrió que `GT-480`/`GT-510` están gateados por el cluster de guards de la Ola 2, no son cierres libres — reubicados en consecuencia.
