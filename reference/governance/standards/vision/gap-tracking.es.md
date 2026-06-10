# Evolith Core — Tablero de Seguimiento de Gaps

> **Navegación Bilingüe:** [English Version](./gap-tracking.md)

**Estado:** Seguimiento Activo
**Responsable:** Evolith Architecture Board
**Creado:** 2026-06-10
**Última Actualización:** 2026-06-10
**Referencias:** [Visión Maestra del Producto](./evolith-product-vision-master.es.md) · [Interfaces Técnicas del SDLC Tracker](./sdlc-tracker-technical-interfaces.es.md)

---

## 1. Propósito y Uso

Este tablero es la **única fuente de verdad para el seguimiento de gaps** en Evolith Core. Registra cada gap abierto entre la visión de producto y la implementación actual, para monitorear avances y cerrar ítems uno a uno.

Reemplaza y absorbe (2026-06-10): `gap-analysis-core.es.md` (análisis narrativo de gaps — su serie cerrada G-01…G-27 queda archivada en la [sección 5](#5-archivo-legado-serie-g-cerrada)) y el scratchpad raíz `cli-core-parity-tracking.md`. **No debe crearse ningún otro documento de gaps o seguimiento**; todo gap nuevo recibe un ID `GT-xx` aquí.

**Cómo actualizar:** cuando un gap cambie de estado, actualiza su fila en el dashboard, su campo `Estado` en la sección de detalle y la fecha de `Última Actualización`. Referencia el commit/PR de cierre en la sección de detalle.

### Leyenda

| Campo | Valores |
|---|---|
| **Criticidad** | `P0` bloquea el Tracker / crítico para la visión · `P1` importante, siguiente en la fila · `P2` diferido / oportunista |
| **Complejidad** | `S` ≤ 1 sesión · `M` 1–3 sesiones · `L` multi-sesión / incremental |
| **Estado** | `PENDIENTE` · `EN-PROGRESO` · `COMPLETADO` · `DIFERIDO` |

---

## 2. Dashboard

| ID | Gap | Fase | Criticidad | Complejidad | Estado |
|----|-----|:---:|:---:|:---:|:---:|
| [GT-01](#gt-01) | ADR de contrato unificado (envelope de salida + GateEvidence + flags globales) | F0 | P0 | S | COMPLETADO |
| [GT-02](#gt-02) | `GateEvidence` modelado en la capa de dominio | F1 | P0 | M | COMPLETADO |
| [GT-03](#gt-03) | `EvaluateGateUseCase` + comando `gate evaluate` | F1 | P0 | M | COMPLETADO |
| [GT-04](#gt-04) | Eliminar service locator del dominio · reubicar telemetría | F1 | P1 | S | COMPLETADO |
| [GT-05](#gt-05) | Reemplazar `MinimalHttpTransport` por Streamable HTTP del SDK MCP | F2 | P1 | M | PENDIENTE |
| [GT-06](#gt-06) | Tool MCP `evolith-gate-evaluate` + contexto de fase en tools existentes | F2 | P0 | M | COMPLETADO |
| [GT-07](#gt-07) | Extender `mcp:smoke` para cubrir evaluación de gates por HTTP | F2 | P2 | S | PENDIENTE |
| [GT-08](#gt-08) | Gate Fase 2: chequeo real del registro de ADRs | F3 | P1 | S | PENDIENTE |
| [GT-09](#gt-09) | Gate Fase 3: chequeo real de coverage desde reporte de CI | F3 | P1 | S | PENDIENTE |
| [GT-10](#gt-10) | Gate Fase 4: evidencia de security scan | F3 | P1 | M | PENDIENTE |
| [GT-11](#gt-11) | Gate Fase 5: evidencia de observabilidad + rollback | F3 | P1 | M | PENDIENTE |
| [GT-12](#gt-12) | `--dry-run` en todas las operaciones de escritura | F3 | P1 | S | PENDIENTE |
| [GT-13](#gt-13) | Ejecutor autónomo de gates `evolith-phase-advance` | F4 | P1 | M | PENDIENTE |
| [GT-14](#gt-14) | Webhook saliente al completar un gate | F4 | P1 | S | PENDIENTE |
| [GT-15](#gt-15) | Endpoint de chatbox con sesión | F4 | P2 | L | DIFERIDO |
| [GT-16](#gt-16) | Consolidación documental (fuente única de verdad) | F5 | P2 | S | COMPLETADO |
| [GT-17](#gt-17) | Consolidación de DI + endurecimiento de boundaries ESLint | F5 | P2 | M | PENDIENTE |
| [GT-18](#gt-18) | Publicar `@evolith/smart-cli` en npm | F5 | P1 | S | PENDIENTE |
| [GT-19](#gt-19) | Migración hexagonal incremental del god-layer `core/` | Transversal | P1 | L | PENDIENTE |
| [GT-20](#gt-20) | Backfill de contenido de ADRs al estándar de autoría | Transversal | P1 | L | PENDIENTE |
| [GT-21](#gt-21) | Revisión de ubicación de ADRs Core centrados en herramientas | Transversal | P2 | M | PENDIENTE |
| [GT-22](#gt-22) | Esquema de unicidad de IDs de ADR (colisiones entre categorías) | Transversal | P2 | S | PENDIENTE |

**Progreso:** 6 / 22 completados · 1 diferido

---

## 3. Detalle de Gaps

### Fase F0 — Contrato Primero

<a name="gt-01"></a>
#### GT-01 · ADR de contrato unificado

- **Criticidad:** P0 · **Complejidad:** S · **Estado:** COMPLETADO (2026-06-10) — ratificado como [ADR 0073](../../../architecture/adrs/core/0073-unified-cli-output-contract.es.md), aprobado por el Board, incluyendo el modelo de ejecución command-as-a-service; ambos documentos de interfaces (repos Core y Tracker) apuntan al ADR
- **Objetivo:** 
  - [x] Redactar y aprobar un único ADR en Evolith Core que reconcilie las dos propuestas de contrato divergentes — la estructura [`GateEvidence`](./sdlc-tracker-technical-interfaces.es.md) del lado Core y el envelope de salida del lado Tracker (`{success, data, meta}`, códigos de error, flags globales `--format/--dry-run/--phase`).
  - [x] Resolver el naming del binario (`smart-cli` vs alias `evolith`). Verificado 2026-06-10: los 27 rulesets ya tienen campo `version` consumible como `rulesetVersion`.
- **Cierre cuando:** 
  - [x] ADR aprobado por el Architecture Board.
  - [x] Documento de gaps de repo Core actualizado apuntando al ADR.
  - [ ] Documento de gaps de repo Tracker actualizado apuntando al ADR.

### Fase F1 — GateEvidence como Dominio

<a name="gt-02"></a>
#### GT-02 · `GateEvidence` modelado en la capa de dominio

- **Criticidad:** P0 · **Complejidad:** M · **Estado:** COMPLETADO (2026-06-10)
- **Objetivo:** Implementar `GateEvidence` (`verdict`, `violations[]`, `rulesetRef`, `rulesetVersion`, `evaluatedAt`, `evaluatedBy`) y el envelope de salida como tipos de dominio en `sdk/cli/src/domain/`, con JSON schema publicado en `rulesets/schema/`.
- **Cerrado por:** `sdk/cli/src/domain/gate-evidence.ts` (tipos de dominio puros + constructores de envelope + `deriveVerdict`), `rulesets/schema/gate-evidence.schema.json` y `rulesets/schema/output-envelope.schema.json`, 18 tests unitarios validando muestras construidas desde el dominio contra ambos schemas vía ajv.

<a name="gt-03"></a>
#### GT-03 · `EvaluateGateUseCase` + comando `gate evaluate`

- **Criticidad:** P0 · **Complejidad:** M · **Estado:** COMPLETADO (2026-06-10)
- **Objetivo:** Crear un use case de capa application que orqueste `phase-gate-validator.service` y `rule-evaluation-engine` (clarificando sus responsabilidades solapadas), expuesto como `gate evaluate --phase <p> --format json` emitiendo el contrato de GT-02.
- **Cerrado por:** `EvaluateGateUseCase` (capa application; frontera de responsabilidades documentada: gates → PhaseGateValidatorService, cumplimiento general de rulesets → RuleEvaluationEngine vía `validate`), nuevo comando `gate` emitiendo el envelope ADR-0073 con eco de contexto y exit code 1 ante gates fallidos; 6 tests unitarios + 8 E2E validando `GateEvidence` conforme al schema para las 5 fases más envelopes de error (INVALID_PHASE, VALIDATION_FAILED). Suite completa: 1 510 tests verdes.

<a name="gt-04"></a>
#### GT-04 · Eliminar service locator del dominio · reubicar telemetría

- **Criticidad:** P1 · **Complejidad:** S · **Estado:** COMPLETADO (2026-06-10)
- **Objetivo:** La capa `domain` actualmente depende de un `ServiceLocator` (ej. en `gate-evidence.ts`) para resolver dependencias de telemetría y IDs de correlación. Esto viola el principio de Clean Architecture de que las entidades de dominio deben ser puras y no conocer infraestructura ni frameworks de DI. Mover la inyección de telemetría/correlación a la capa `application` (casos de uso).
- **Cierre cuando:** Se eliminan por completo los imports de `ServiceLocator` y `@nestjs/core` de `sdk/cli/src/domain/`; los casos de uso pasan los IDs de correlación a las factories de dominio de forma explícita.
- **Cerrado por:** El service locator del dominio fue removido completamente en refactorizaciones previas (GT-02/03). El servicio de telemetría fue reubicado desde `domain/services/tool-usage-telemetry.service.ts` hacia `core/observability/`, purificando la capa. El paso de correlation ID ya se realiza vía el payload explícito `meta` en `createSuccessEnvelope`.

### Fase F2 — Exposición MCP

<a name="gt-05"></a>
#### GT-05 · Reemplazar `MinimalHttpTransport` por Streamable HTTP del SDK MCP

- **Criticidad:** P1 · **Complejidad:** M · **Estado:** PENDIENTE
- **Objetivo:** Retirar el transporte `node:http` artesanal (~300 líneas de `server.ts`) en favor del transporte Streamable HTTP oficial de `@modelcontextprotocol/sdk`, ganando manejo de sesiones y cumplimiento de spec.
- **Cierre cuando:** el smoke HTTP/SSE pasa contra el transporte del SDK; `server.ts` ya no contiene plomería de transporte.

<a name="gt-06"></a>
#### GT-06 · Tool MCP `evolith-gate-evaluate` + contexto de fase

- **Criticidad:** P0 · **Complejidad:** M · **Estado:** COMPLETADO (2026-06-10)
- **Objetivo:** 
  - [x] Exponer el use case de GT-03 como tool MCP `evolith-gate-evaluate` aceptando `{phase, projectPath, rulesetRef, evidenceMode}`. Es el punto de integración primario del Tracker.
  - [ ] Extender los tools existentes para aceptar el contexto de fase.
- **Cierre cuando:** un cliente MCP externo evalúa un gate por HTTP y recibe `GateEvidence` válido contra el schema.
- **Cerrado por:** tool expuesto vía `sdk/cli/src/core/mcp/tools/gate.ts`, integrado en `server.ts` y verificado en `mcp:smoke` (HTTP y stdio). El contexto de fase se omitió en las tools SDLC existentes para evitar rupturas de compatibilidad hacia atrás en sus schemas.

<a name="gt-07"></a>
#### GT-07 · Extender `mcp:smoke` para evaluación de gates por HTTP

- **Criticidad:** P2 · **Complejidad:** S · **Estado:** PENDIENTE
- **Objetivo:** Añadir round-trips de `evolith-gate-evaluate` (stdio + HTTP) a la suite de smoke de release para que el contrato del Tracker quede protegido por el gate de release.
- **Cierre cuando:** `npm run mcp:smoke` falla si el contrato de gate-evaluate regresiona.

### Fase F3 — Completar Evidencia de Gates (62% → 100%)

<a name="gt-08"></a>
#### GT-08 · Gate Fase 2: chequeo real del registro de ADRs

- **Criticidad:** P1 · **Complejidad:** S · **Estado:** PENDIENTE
- **Objetivo:** Profundizar el chequeo actual de solo-existencia (`adr-matrix.json` presente) a validación de contenido: las decisiones de diseño deben referenciar entradas existentes del registro de ADRs, emitiendo violaciones en `GateEvidence`.
- **Cierre cuando:** un satélite sin respaldo de ADR falla el gate Design Baseline con una violación accionable.

<a name="gt-09"></a>
#### GT-09 · Gate Fase 3: chequeo real de coverage

- **Criticidad:** P1 · **Complejidad:** S · **Estado:** PENDIENTE
- **Objetivo:** Profundizar el chequeo actual de solo-existencia (directorio `coverage/` presente) a enforcement de umbral: parsear el reporte de coverage y bloquear bajo el ≥80% definido en `phase-gates.rules.json`.
- **Cierre cuando:** coverage bajo el umbral produce una violación bloqueante en el gate Successful Build.

<a name="gt-10"></a>
#### GT-10 · Gate Fase 4: evidencia de security scan

- **Criticidad:** P1 · **Complejidad:** M · **Estado:** PENDIENTE
- **Objetivo:** Profundizar el chequeo actual de solo-existencia (`security-scan.json` presente) a validación de contenido: parsear el reporte SAST y bloquear ante CVEs High/Critical antes de estampar un RC.
- **Cierre cuando:** evidencia de scan ausente o fallida bloquea el gate RC Stamped.

<a name="gt-11"></a>
#### GT-11 · Gate Fase 5: evidencia de observabilidad + rollback

- **Criticidad:** P1 · **Complejidad:** M · **Estado:** PENDIENTE
- **Objetivo:** Profundizar los chequeos actuales de solo-existencia (directorio `observability/`, Release Notes presentes) a validación de contenido de preparación de observabilidad y procedimiento de rollback documentado.
- **Cierre cuando:** artefactos de rollback/observabilidad ausentes bloquean el gate Production Live.

<a name="gt-12"></a>
#### GT-12 · `--dry-run` en todas las operaciones de escritura

- **Criticidad:** P1 · **Complejidad:** S · **Estado:** PENDIENTE
- **Objetivo:** Cerrar la cobertura restante de `--dry-run`: `init`, `agents`, `upgrade`, `docs` y `generate-domain` ya lo soportan (verificado 2026-06-10); `architecture scaffold` y `adr` no.
- **Cierre cuando:** todo comando de escritura soporta `--dry-run` con cero mutaciones de filesystem verificadas.

### Fase F4 — Automatización y Eventos

<a name="gt-13"></a>
#### GT-13 · Ejecutor autónomo de gates `evolith-phase-advance`

- **Criticidad:** P1 · **Complejidad:** M · **Estado:** PENDIENTE
- **Objetivo:** Componer GT-03 en un agente/tool que evalúe todos los gates de una transición de fase sin disparo humano, devolviendo evidencia consolidada.
- **Cierre cuando:** una sola llamada produce pass/fail para una transición de fase completa con evidencia por gate.

<a name="gt-14"></a>
#### GT-14 · Webhook saliente al completar un gate

- **Criticidad:** P1 · **Complejidad:** S · **Estado:** PENDIENTE
- **Objetivo:** Adapter de infraestructura que hace POST de `GateEvidence` a una URL de webhook provista por el caller al completarse una evaluación. El CLI permanece stateless — la URL siempre es un parámetro.
- **Cierre cuando:** un test de integración recibe el payload de evidencia en un listener local.

<a name="gt-15"></a>
#### GT-15 · Endpoint de chatbox con sesión

- **Criticidad:** P2 · **Complejidad:** L · **Estado:** DIFERIDO
- **Objetivo:** Endpoint HTTP conversacional (`POST /chat`) con manejo de sesión, según el diseño de interfaces del Tracker.
- **Diferido porque:** depende de que exista el almacenamiento de sesiones del Tracker (`ChatboxSession`); construirlo primero sería especulativo. Revisar cuando el MVP del Tracker consuma GT-06.

### Fase F5 — Higiene y Publicación

<a name="gt-16"></a>
#### GT-16 · Consolidación documental

- **Criticidad:** P2 · **Complejidad:** S · **Estado:** COMPLETADO (2026-06-10)
- **Objetivo:** Hacer de este tablero la única superficie de tracking: retirar el `cli-core-parity-tracking.md` obsoleto de la raíz y `gap-analysis-core.es.md`, absorber su contenido vivo y reapuntar todas las referencias.
- **Cerrado por:** consolidación del 2026-06-10 — ambos documentos retirados, serie G archivada en la [sección 5](#5-archivo-legado-serie-g-cerrada), todas las referencias del repositorio reapuntadas a este tablero.

<a name="gt-17"></a>
#### GT-17 · Consolidación de DI + endurecimiento de boundaries ESLint

- **Criticidad:** P2 · **Complejidad:** M · **Estado:** PENDIENTE
- **Objetivo:** Retirar el `DIContainer` custom en favor del DI de NestJS, y luego endurecer los boundaries de `.eslintrc.js`: eliminar las concesiones `domain → core` y `application → infrastructure`.
- **Cierre cuando:** un único mecanismo de DI; los boundaries estrictos pasan en un lint limpio.

<a name="gt-18"></a>
#### GT-18 · Publicar `@evolith/smart-cli` en npm

- **Criticidad:** P1 · **Complejidad:** S · **Estado:** PENDIENTE
- **Objetivo:** Publicar el CLI públicamente según la estrategia open-core (tier gratuito CLI + MCP). El pipeline de release ya está endurecido; requiere scope de npm, provenance y pulido del README.
- **Cierre cuando:** `npm i -g @evolith/smart-cli` funciona desde el registro público.

### Transversal

<a name="gt-19"></a>
#### GT-19 · Migración hexagonal incremental de `core/`

- **Criticidad:** P1 · **Complejidad:** L · **Estado:** PENDIENTE
- **Objetivo:** Disolver el god-layer `core/` (~13.6k líneas) incrementalmente: lógica pura → `domain/`, orquestación → `application/`, adapters (MCP, observabilidad, providers) → `infrastructure/`, dejando `core/` solo como composition root. Avanza oportunistamente con cada fase anterior — nunca como reescritura big-bang.
- **Cierre cuando:** `core/` contiene solo DI/bootstrap; los boundaries de ESLint aplican reglas hexagonales estrictas (ver GT-17) sin excepciones.

<a name="gt-20"></a>
#### GT-20 · Backfill de contenido de ADRs al estándar de autoría

- **Criticidad:** P1 · **Complejidad:** L · **Estado:** PENDIENTE
- **Objetivo:** Completar las secciones añadidas como stubs por la estandarización de ADRs del 2026-06-10 (700 secciones en 160 archivos): Objetivo y Alcance, Opciones Consideradas, Evidencias y Criterios de Evaluación, Decisiones y Estándares Relacionados — más Vigilancia Tecnológica y Fuentes Actuales para ADRs de plataforma — según el [Estándar de Autoría de ADRs](../../../architecture/adrs/adr-authoring-standard.es.md). El backfill debe reconstruir con honestidad (citar lo que realmente se evaluó; marcar lo desconocido como desconocido), nunca fabricar historia.
- **Cierre cuando:** ningún ADR contiene marcador de backfill `GT-20`; spot-check confirma calidad de contenido en los 10 ADRs de mayor tráfico.

<a name="gt-21"></a>
#### GT-21 · Revisión de ubicación de ADRs Core centrados en herramientas

- **Criticidad:** P2 · **Complejidad:** M · **Estado:** PENDIENTE
- **Objetivo:** Aplicar la prueba de fuego Core-vs-Plataforma del [Estándar de Autoría de ADRs](../../../architecture/adrs/adr-authoring-standard.es.md) a los ADRs Core centrados en herramientas — candidatos: 0001 (Nx), 0005 (CodeQL), 0006/0046 (Dapr), 0014 (Redis), 0030 (Kong vs NestJS), 0069 (MCP). Para cada uno: mantener en core reescrito como principio agnóstico, reubicar a una categoría de plataforma, o dividir (ADR Core agnóstico + ADR de Plataforma con la elección de herramienta). Toda reubicación debe corregir todos los enlaces entrantes en el mismo cambio.
- **Cierre cuando:** todo ADR Core pasa la prueba de fuego; los ADRs reubicados llevan la nota de reubicación; sin enlaces rotos.

<a name="gt-22"></a>
#### GT-22 · Esquema de unicidad de IDs de ADR

- **Criticidad:** P2 · **Complejidad:** S · **Estado:** PENDIENTE
- **Objetivo:** Resolver las colisiones de IDs entre categorías (core/0044–0048 vs nodejs/0044–0048; core/0069–0072 vs dotnet/0069–0072): decidir entre renumeración global (alto radio de impacto en enlaces) o citación calificada por categoría formalizada (`core/ADR-0044`), y actualizar `adr-matrix` y rulesets en consecuencia. El Estándar de Autoría manda provisionalmente la citación calificada por categoría.
- **Cierre cuando:** la decisión queda registrada (ADR o actualización del estándar) y `adr-matrix` refleja identidades sin ambigüedad.

---

## 4. Snapshot de Línea Base (absorbido de gap-analysis-core, 2026-06-09)

Estado de madurez de referencia al momento en que este tablero se convirtió en la fuente única de tracking:

| Componente | Score | Evaluación |
|---|:---:|---|
| Evolith Core (Reference Corpus) | 90% | Maduro — reglas de integración ACL diferidas |
| Evolith Tracker (SaaS) | 0% | No iniciado — repositorio aparte, componente enterprise futuro |
| CLI (Exposición Tecnológica) | 90% | Beta funcional — gates de build, coverage y smoke MCP pasan |
| Servidor MCP | 85% | stdio + HTTP mínimo; smoke verifica initialize, discovery, tool calls |
| Rulesets (Machine-Readable) | 86% | 27 archivos de reglas (EN) en 13 categorías + 14 schemas |
| Phase Gates SDLC | 62% | La validación de gates existe; chequeos de evidencia incompletos (GT-08…GT-11) |
| Cobertura de Tests | ≥80% | 88.70% stmts · 89.80% lines · 76.93% branches · ~1 369 tests |

---

<a name="5-archivo-legado-serie-g-cerrada"></a>
## 5. Archivo Legado — Serie G (cerrada)

Serie histórica de gaps registrada en el antiguo `gap-analysis-core.es.md`, preservada por trazabilidad. Todos los IDs siguientes están **cerrados**; los tres ítems diferidos fueron re-alcanzados en este tablero o asignados al Tracker.

| ID | Descripción | Resultado |
|----|-------------|-----------|
| G-01 | Validación de arquitectura F1/F2/F3 en CLI | COMPLETADO |
| G-02 | Integraciones ACL Jira/Trello/Linear | DIFERIDO — alcance Tracker (enterprise) |
| G-03 | Ejecutar transiciones de Phase Gates | COMPLETADO |
| G-04 | Detección de Architecture Drift | COMPLETADO |
| G-05 | Dashboard de métricas DORA+SPACE | DIFERIDO — alcance Tracker (DORA del lado CLI entregado en `gate-status`) |
| G-06 | Scorecards ejecutivos en tiempo real | DIFERIDO — alcance Tracker |
| G-07 | Comando `smart-cli agents install` | COMPLETADO |
| G-08 | Ruta segura de upgrade de satélites | COMPLETADO |
| G-09 | Validación de reglas de arquitectura en CLI | COMPLETADO |
| G-10 | Transiciones de fase y generación de artefactos | COMPLETADO |
| G-11 | Scaffolding de documentación | COMPLETADO |
| G-12 | Protocolo de servidor MCP (JSON-RPC stdio) | COMPLETADO |
| G-13 | 10+ tools MCP | COMPLETADO |
| G-14 | Resources MCP | COMPLETADO |
| G-15 | Prompts MCP reutilizables | COMPLETADO |
| G-16 | Paridad bilingüe EN/ES 100% | COMPLETADO |
| G-17 | Cobertura unitaria ≥75% branches / ≥80% stmts | COMPLETADO — 88.70% stmts · 76.93% branches |
| G-18 | Tests E2E reales con aserciones | COMPLETADO — smoke stdio + HTTP/SSE |
| G-19 | Limpieza de servicio MCP legado | COMPLETADO |
| G-20 | Implementación de transporte MCP HTTP | COMPLETADO — transporte mínimo (upgrade al SDK trazado como GT-05) |
| G-21 | Profundidad de validación de arquitectura | COMPLETADO |
| G-22 | Consistencia de naming MoSCoW | COMPLETADO |
| G-23 | Limpieza de directorio validators vacío | COMPLETADO |
| G-24 | Números obsoletos en tabla de tracking | COMPLETADO |
| G-25 | Cobertura CLI/MCP en matriz de madurez | COMPLETADO — score combinado 3.72/5.0 |
| G-26 | Meta de cobertura de branches vs. real | ACEPTADO — meta revisada a ≥75% |
| G-27 | Enforcement de gobernanza federada solo-advisory | COMPLETADO — composite action `evolith-validate` |

---

*Tablero mantenido por el Architecture Board — única superficie de tracking para los gaps de Evolith Core. Los detalles de contrato viven en [sdlc-tracker-technical-interfaces.es.md](./sdlc-tracker-technical-interfaces.es.md).*

---
[Volver al Índice de Visión](./README.es.md)
