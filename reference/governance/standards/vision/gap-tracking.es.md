# Evolith Core — Tablero de Seguimiento de Gaps

> **Navegación Bilingüe:** [English Version](./gap-tracking.md)

**Estado:** Seguimiento Activo
**Responsable:** Evolith Architecture Board
**Creado:** 2026-06-10
**Última Actualización:** 2026-06-12
**Referencias:** [Visión Maestra del Producto](./evolith-product-vision-master.es.md) · [Interfaces Técnicas del SDLC Tracker](./sdlc-tracker-technical-interfaces.es.md) · [Evaluación de Madurez](./maturity-assessment.es.md) · [Estándar de Autoría de ADRs](../../../architecture/adrs/adr-authoring-standard.es.md)

---

## 1. Propósito y Uso

Este tablero es la **única fuente de verdad para el seguimiento de gaps** en Evolith Core. Registra cada gap abierto entre la visión de producto y la implementación actual, para monitorear avances y cerrar ítems uno a uno.

Reemplaza y absorbe (2026-06-10): `gap-analysis-core.es.md` (análisis narrativo de gaps — su serie cerrada G-01…G-27 queda archivada en la [sección 5](#5-archivo-legado-serie-g-cerrada)) y el scratchpad raíz `cli-core-parity-tracking.md`. **No debe crearse ningún otro documento de gaps o seguimiento**; todo gap nuevo recibe un ID `GT-xx` aquí.

**Cómo actualizar:** todo gap debe declarar un problema claro, propósito de producto, evidencia o ejemplo actual, criterios de cierre y referencias. Cuando un gap cambie de estado, actualiza su fila en el dashboard, su campo `Estado` en la sección de detalle, los totales de progreso y la fecha de `Última Actualización`. Un gap solo queda `COMPLETADO` cuando su evidencia de cierre está comiteada y pasan los gates aplicables de build, tests, smoke, documentación o validación de producto.

### Leyenda

| Campo | Valores |
|---|---|
| **Criticidad** | `P0` bloquea el kernel de gobernanza, el baseline de release o la prueba de producto · `P1` limita materialmente adopción o integridad · `P2` diferido / oportunista |
| **Complejidad** | `S` ≤ 1 sesión · `M` 1–3 sesiones · `L` multi-sesión / incremental |
| **Estado** | `PENDIENTE` · `EN-PROGRESO` · `COMPLETADO` · `DIFERIDO` |

**Regla de ordenamiento:** criticidad (`P0` → `P1` → `P2`), estado activo (`EN-PROGRESO` → `PENDIENTE` → `DIFERIDO`) y luego complejidad (`S` → `M` → `L`). Los gaps completados se listan después del trabajo activo para conservar trazabilidad.

---

## 2. Dashboard

### 2.1 Orden de Ejecución Recomendado (cola de trabajo pendiente)

La cola contiene únicamente trabajo activo o diferido. Sigue la regla de la sección 1 y respeta dependencias adicionales, especialmente GT-28 antes del trabajo orientado a release, GT-30 antes de GT-31 y GT-22 antes de GT-21.

| # | ID | Gap y propósito de producto | Evidencia o ejemplo actual | Crit. | Compl. | Estado | Refs |
|:-:|----|----------------------------|----------------------------|:---:|:---:|:---:|------|
| 1 | [GT-27](#gt-27) | Reparar la integridad del tracking canónico para confiar en la priorización | Existían GT-19 duplicado, estados contradictorios y totales obsoletos | P0 | S | EN-PROGRESO | [Evaluación de Madurez](./maturity-assessment.es.md) |
| 2 | [GT-28](#gt-28) | Restaurar un baseline de CLI apto para release | `npm run build`, `npm test` y `npm run mcp:smoke` fallan actualmente | P0 | M | EN-PROGRESO | [Smart CLI](../../../../sdk/cli/README.es.md) |
| 3 | [GT-29](#gt-29) | Garantizar la paridad Native/OPA requerida por R-25 | OPA contiene placeholders y las nuevas reglas F1 no tienen comportamiento Native equivalente probado | P0 | L | EN-PROGRESO | [Reglas Globales](../../../../.harness/rules/global-rules.es.md) |
| 4 | [GT-32](#gt-32) | Validar la hipótesis de cliente y comprador antes de escalar construcción | La visión declara pendientes entrevistas y experimentos controlados | P0 | M | PENDIENTE | [Visión de Producto](./evolith-product-vision-master.es.md) |
| 5 | [GT-30](#gt-30) | Implementar el kernel mínimo de gobernanza del Tracker | Tracker tiene especificaciones extensas pero ninguna implementación ejecutable | P0 | L | PENDIENTE | [Diseño de Producto Tracker](../../../products/evolith-tracker/README.es.md) |
| 6 | [GT-31](#gt-31) | Probar un producto a través de los cinco gates gobernados | No existe una demostración operativa tenant-a-producción del Evidence Graph | P0 | L | PENDIENTE | [Producto Mínimo Comprobable](./evolith-product-vision-master.es.md#10-producto-mínimo-comprobable) |
| 7 | [GT-07](#gt-07) | Proteger por release la evaluación de gates en stdio y HTTP | El smoke contiene ambas rutas, pero no pasa mientras GT-28 siga abierto | P1 | S | EN-PROGRESO | [Reglas MCP](../../../../rulesets/mcp/README.es.md) |
| 8 | [GT-08](#gt-08) | Rechazar Design Baselines sin respaldo ADR real | El working tree contiene validación de contenido, pero carece de baseline verde | P1 | S | EN-PROGRESO | [Quality Gates](../../sdlc/quality-gates.es.md) |
| 9 | [GT-09](#gt-09) | Bloquear Successful Build bajo el umbral de cobertura | Existe parsing de `coverage-summary.json`, pero no está verificado para release | P1 | S | EN-PROGRESO | [Quality Gates](../../sdlc/quality-gates.es.md) |
| 10 | [GT-12](#gt-12) | Permitir previsualización segura en todos los comandos de escritura | `adr` y `architecture scaffold` incluyen dry-run dentro de la refactorización rota | P1 | S | EN-PROGRESO | [ADR 0073](../../../architecture/adrs/core/0073-unified-cli-output-contract.es.md) |
| 11 | [GT-14](#gt-14) | Enviar GateEvidence al Tracker u otro consumidor autorizado | Existe adapter webhook en el working tree; la suite completa no está verde | P1 | S | EN-PROGRESO | [Interfaces del Tracker](./sdlc-tracker-technical-interfaces.es.md) |
| 12 | [GT-05](#gt-05) | Adoptar Streamable HTTP del SDK MCP con sesiones soportadas | Existe wrapper SDK; los tests HTTP están skipped y el build falla | P1 | M | EN-PROGRESO | [Reglas MCP](../../../../rulesets/mcp/README.es.md) |
| 13 | [GT-10](#gt-10) | Bloquear RC ante evidencia High/Critical ausente o fallida | La lógica actual verifica existencia del archivo, no contenido de vulnerabilidades | P1 | M | EN-PROGRESO | [Quality Gates](../../sdlc/quality-gates.es.md) |
| 14 | [GT-11](#gt-11) | Bloquear Production Live sin observabilidad y rollback verificados | La lógica actual verifica presencia, no preparación operativa | P1 | M | EN-PROGRESO | [Modelo de Trazabilidad](../../sdlc/traceability-model.es.md) |
| 15 | [GT-17](#gt-17) | Consolidar DI y aplicar boundaries arquitectónicos estrictos | La refactorización introduce BaseCommand/DI pero rompe resolución de Nest | P1 | M | EN-PROGRESO | [Playbook de Evolución Modular](../../../../.harness/playbooks/modular-monolith-evolution-playbook.es.md) |
| 16 | [GT-19](#gt-19) | Reducir el god-layer `core/` a composición | `core/` tiene unas 17k líneas TypeScript y ports de dominio aún importan tipos de core | P1 | L | EN-PROGRESO | [Estándar de Autoría ADR](../../../architecture/adrs/adr-authoring-standard.es.md) |
| 17 | [GT-18](#gt-18) | Hacer instalable el CLI open-core desde npm | Aún no se verifica instalación pública desde un entorno limpio | P1 | S | PENDIENTE | [Smart CLI](../../../../sdk/cli/README.es.md) |
| 18 | [GT-34](#gt-34) | Repriorizar el roadmap alrededor de la prueba de gobernanza | Las ambiciones multi-cloud/Dapr anteceden a la validación del producto | P1 | S | PENDIENTE | [Roadmap Evolutivo](./evolutionary-strategy-roadmap.es.md) |
| 19 | [GT-13](#gt-13) | Evaluar una propuesta completa de transición en una llamada | No existe implementación de `evolith-phase-advance` | P1 | M | PENDIENTE | [Interfaces del Tracker](./sdlc-tracker-technical-interfaces.es.md) |
| 20 | [GT-33](#gt-33) | Medir madurez desde evidencia operativa y no volumen documental | La evaluación declara Managed/Adopted mientras build y tests fallan | P1 | M | PENDIENTE | [Evaluación de Madurez](./maturity-assessment.es.md) |
| 21 | [GT-35](#gt-35) | Generar automáticamente inventarios y totales del dashboard | Los conteos publicados están detrás de los 47 JSON, 17 schemas y 9 Rego actuales | P1 | M | PENDIENTE | [Hub de Rulesets](../../../../rulesets/README.es.md) |
| 22 | [GT-20](#gt-20) | Completar evidencia de decisiones ADR sin fabricar historia | 162 archivos ADR contienen aproximadamente 697 marcadores GT-20 | P1 | L | PENDIENTE | [Estándar de Autoría](../../../architecture/adrs/adr-authoring-standard.es.md) |
| 23 | [GT-22](#gt-22) | Hacer inequívocas las identidades ADR entre runtimes | Core, Node.js y .NET reutilizan varios IDs numéricos | P2 | S | PENDIENTE | [Matriz ADR](../../../architecture/adrs/adr-matrix.es.md) |
| 24 | [GT-26](#gt-26) | Reemplazar el placeholder de Fase 5 por un playbook operativo | La navegación SDLC aún anuncia un runbook futuro | P2 | S | PENDIENTE | [Centro SDLC](../../sdlc/README.es.md) |
| 25 | [GT-21](#gt-21) | Separar principios universales de elecciones de herramientas | Nx, Dapr, Redis, Kong, CodeQL y MCP requieren revisión de clasificación | P2 | M | PENDIENTE | [Estándar de Autoría](../../../architecture/adrs/adr-authoring-standard.es.md) |
| 26 | [GT-24](#gt-24) | Alinear ubicaciones físicas con la taxonomía declarada | Permanecen seis marcadores de migración en documentación de producto y SDK | P2 | M | PENDIENTE | [Taxonomía Documental](../../../documentation-taxonomy.es.md) |
| 27 | [GT-23](#gt-23) | Reemplazar esqueletos españoles por traducciones utilizables | Permanecen 76 marcadores de esqueleto bajo `reference/` y `rulesets/` | P2 | L | PENDIENTE | [Índice Bilingüe](../../../navigation/BILINGUAL_INDEX.es.md) |
| 28 | [GT-25](#gt-25) | Poblar las guías de plataforma con perfiles reales | Las categorías contienen hubs/catálogos, pero no perfiles de proveedor | P2 | L | PENDIENTE | [Hub de Plataformas](../../../platforms/README.es.md) |
| 29 | [GT-36](#gt-36) | Definir autoridad lingüística y cobertura de reglas machine-readable | Existen 27 rulesets EN y solo 3 contrapartes JSON ES | P2 | L | PENDIENTE | [Gobernanza Bilingüe](../../../../.harness/rules/global-rules.es.md) |
| 30 | [GT-15](#gt-15) | Añadir sesiones conversacionales gobernadas después de existir el estado Tracker | El almacenamiento de chat y la autoridad dependen del kernel Tracker | P2 | L | DIFERIDO | [Diseño de Producto Tracker](../../../products/evolith-tracker/README.es.md) |

### 2.2 Dashboard Completo

| ID | Gap | Fase | Criticidad | Complejidad | Estado |
|----|-----|:---:|:---:|:---:|:---:|
| [GT-27](#gt-27) | Consistencia semántica del tracking canónico | Transversal | P0 | S | EN-PROGRESO |
| [GT-28](#gt-28) | Restaurar baseline de build, tests y smoke del CLI | F0 | P0 | M | EN-PROGRESO |
| [GT-29](#gt-29) | Paridad de ejecución de reglas Native/OPA | F1 | P0 | L | EN-PROGRESO |
| [GT-32](#gt-32) | Validación de hipótesis de cliente y comprador | Producto | P0 | M | PENDIENTE |
| [GT-30](#gt-30) | Kernel mínimo de gobernanza Tracker | Producto | P0 | L | PENDIENTE |
| [GT-31](#gt-31) | Vertical slice del Producto Mínimo Comprobable | Producto | P0 | L | PENDIENTE |
| [GT-07](#gt-07) | Smoke de release para evaluación de gates MCP | F2 | P1 | S | EN-PROGRESO |
| [GT-08](#gt-08) | Validación real del registro ADR en Fase 2 | F3 | P1 | S | EN-PROGRESO |
| [GT-09](#gt-09) | Enforcement real de coverage en Fase 3 | F3 | P1 | S | EN-PROGRESO |
| [GT-12](#gt-12) | `--dry-run` en todas las operaciones de escritura | F3 | P1 | S | EN-PROGRESO |
| [GT-14](#gt-14) | Webhook saliente al completar un gate | F4 | P1 | S | EN-PROGRESO |
| [GT-05](#gt-05) | Transporte Streamable HTTP del SDK MCP | F2 | P1 | M | EN-PROGRESO |
| [GT-10](#gt-10) | Validación de contenido del security scan en Fase 4 | F3 | P1 | M | EN-PROGRESO |
| [GT-11](#gt-11) | Validación de observabilidad y rollback en Fase 5 | F3 | P1 | M | EN-PROGRESO |
| [GT-17](#gt-17) | Consolidación DI y boundaries estrictos | F5 | P1 | M | EN-PROGRESO |
| [GT-19](#gt-19) | Migración hexagonal incremental de `core/` | Transversal | P1 | L | EN-PROGRESO |
| [GT-18](#gt-18) | Publicar `@evolith/smart-cli` en npm | F5 | P1 | S | PENDIENTE |
| [GT-34](#gt-34) | Repriorización del roadmap alrededor de la prueba de gobernanza | Producto | P1 | S | PENDIENTE |
| [GT-13](#gt-13) | Ejecutor de propuestas `evolith-phase-advance` | F4 | P1 | M | PENDIENTE |
| [GT-33](#gt-33) | Scoring de madurez basado en evidencia | Producto | P1 | M | PENDIENTE |
| [GT-35](#gt-35) | Inventarios automáticos y validación del tracking | Transversal | P1 | M | PENDIENTE |
| [GT-20](#gt-20) | Backfill de ADRs al estándar de autoría | Transversal | P1 | L | PENDIENTE |
| [GT-22](#gt-22) | Esquema de unicidad de IDs ADR | Transversal | P2 | S | PENDIENTE |
| [GT-26](#gt-26) | Playbook de Zero-Downtime Release | Transversal | P2 | S | PENDIENTE |
| [GT-21](#gt-21) | Revisión de ubicación de ADRs Core tool-céntricos | Transversal | P2 | M | PENDIENTE |
| [GT-24](#gt-24) | Ejecutar migraciones documentales declaradas | Transversal | P2 | M | PENDIENTE |
| [GT-23](#gt-23) | Backfill de traducciones españolas | Transversal | P2 | L | PENDIENTE |
| [GT-25](#gt-25) | Primeros perfiles de proveedor | Transversal | P2 | L | PENDIENTE |
| [GT-36](#gt-36) | Cobertura lingüística de reglas machine-readable | Transversal | P2 | L | PENDIENTE |
| [GT-15](#gt-15) | Endpoint de chatbox con sesión | F4 | P2 | L | DIFERIDO |
| [GT-01](#gt-01) | ADR de contrato unificado (envelope de salida + GateEvidence + flags globales) | F0 | P0 | S | COMPLETADO |
| [GT-02](#gt-02) | `GateEvidence` modelado en la capa de dominio | F1 | P0 | M | COMPLETADO |
| [GT-03](#gt-03) | `EvaluateGateUseCase` + comando `gate evaluate` | F1 | P0 | M | COMPLETADO |
| [GT-06](#gt-06) | Tool MCP `evolith-gate-evaluate` + contexto de fase en tools existentes | F2 | P0 | M | COMPLETADO |
| [GT-04](#gt-04) | Eliminar service locator del dominio · reubicar telemetría | F1 | P1 | S | COMPLETADO |
| [GT-16](#gt-16) | Consolidación documental (fuente única de verdad) | F5 | P2 | S | COMPLETADO |

**Progreso:** 6 / 36 completados · 13 en progreso · 16 pendientes · 1 diferido

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

- **Criticidad:** P1 · **Complejidad:** M · **Estado:** EN-PROGRESO
- **Objetivo:** Retirar el transporte `node:http` artesanal (~300 líneas de `server.ts`) en favor del transporte Streamable HTTP oficial de `@modelcontextprotocol/sdk`, ganando manejo de sesiones y cumplimiento de spec.
- **Evidencia actual:** `StreamableHTTPServerTransport` y un wrapper existen en el working tree, pero el CLI no compila y tres bloques de tests orientados a HTTP permanecen skipped.
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

- **Criticidad:** P1 · **Complejidad:** S · **Estado:** EN-PROGRESO
- **Objetivo:** Añadir round-trips de `evolith-gate-evaluate` (stdio + HTTP) a la suite de smoke de release para que el contrato del Tracker quede protegido por el gate de release.
- **Evidencia actual:** el script smoke contiene llamadas de gate por stdio y Streamable HTTP, pero `npm run mcp:smoke` se detiene en el build TypeScript fallido.
- **Cierre cuando:** `npm run mcp:smoke` falla si el contrato de gate-evaluate regresiona.

### Fase F3 — Completar Evidencia de Gates (62% → 100%)

<a name="gt-08"></a>
#### GT-08 · Gate Fase 2: chequeo real del registro de ADRs

- **Criticidad:** P1 · **Complejidad:** S · **Estado:** EN-PROGRESO
- **Objetivo:** Profundizar el chequeo actual de solo-existencia (`adr-matrix.json` presente) a validación de contenido: las decisiones de diseño deben referenciar entradas existentes del registro de ADRs, emitiendo violaciones en `GateEvidence`.
- **Evidencia actual:** el working tree parsea `adr-matrix.json` y rechaza un registro vacío, pero el cambio no constituye evidencia de cierre hasta que build y tests pasen.
- **Cierre cuando:** un satélite sin respaldo de ADR falla el gate Design Baseline con una violación accionable.

<a name="gt-09"></a>
#### GT-09 · Gate Fase 3: chequeo real de coverage

- **Criticidad:** P1 · **Complejidad:** S · **Estado:** EN-PROGRESO
- **Objetivo:** Profundizar el chequeo actual de solo-existencia (directorio `coverage/` presente) a enforcement de umbral: parsear el reporte de coverage y bloquear bajo el ≥80% definido en `phase-gates.rules.json`.
- **Evidencia actual:** el parsing de `coverage/coverage-summary.json` y el umbral de 80% statements existen en el working tree; la verificación de release sigue bloqueada por GT-28.
- **Cierre cuando:** coverage bajo el umbral produce una violación bloqueante en el gate Successful Build.

<a name="gt-10"></a>
#### GT-10 · Gate Fase 4: evidencia de security scan

- **Criticidad:** P1 · **Complejidad:** M · **Estado:** EN-PROGRESO
- **Objetivo:** Profundizar el chequeo actual de solo-existencia (`security-scan.json` presente) a validación de contenido: parsear el reporte SAST y bloquear ante CVEs High/Critical antes de estampar un RC.
- **Evidencia actual:** el validador solo comprueba si existe `security-scan.json`; no inspecciona severidades, estado del scanner ni excepciones aceptadas.
- **Cierre cuando:** evidencia de scan ausente o fallida bloquea el gate RC Stamped.

<a name="gt-11"></a>
#### GT-11 · Gate Fase 5: evidencia de observabilidad + rollback

- **Criticidad:** P1 · **Complejidad:** M · **Estado:** EN-PROGRESO
- **Objetivo:** Profundizar los chequeos actuales de solo-existencia (directorio `observability/`, Release Notes presentes) a validación de contenido de preparación de observabilidad y procedimiento de rollback documentado.
- **Evidencia actual:** los checks aceptan presencia de directorio/documento sin validar indicadores de salud, ownership de alertas, comandos y triggers de rollback ni evidencia de ensayo.
- **Cierre cuando:** artefactos de rollback/observabilidad ausentes bloquean el gate Production Live.

<a name="gt-12"></a>
#### GT-12 · `--dry-run` en todas las operaciones de escritura

- **Criticidad:** P1 · **Complejidad:** S · **Estado:** EN-PROGRESO
- **Objetivo:** Cerrar la cobertura restante de `--dry-run`: `init`, `agents`, `upgrade`, `docs` y `generate-domain` ya lo soportan (verificado 2026-06-10); `architecture scaffold` y `adr` no.
- **Evidencia actual:** ambos comandos restantes contienen código y tests de dry-run en el working tree, pero el baseline completo del CLI está rojo.
- **Cierre cuando:** todo comando de escritura soporta `--dry-run` con cero mutaciones de filesystem verificadas.

### Fase F4 — Automatización y Eventos

<a name="gt-13"></a>
#### GT-13 · Ejecutor autónomo de gates `evolith-phase-advance`

- **Criticidad:** P1 · **Complejidad:** M · **Estado:** PENDIENTE
- **Objetivo:** Componer GT-03 en un agente/tool que evalúe una transición de fase propuesta sin disparo humano y devuelva evidencia consolidada.
- **Guardrail de autoridad:** esta tool puede recomendar `pass` o `fail`, pero solo Evolith Tracker puede mutar el estado canónico de fase.
- **Ejemplo:** `evolith-phase-advance --from design --to construction` evalúa cada criterio de Design Baseline y retorna una propuesta de transición más evidencia por gate.
- **Cierre cuando:** una sola llamada produce una propuesta conforme al schema con evidencia por gate y sin mutación directa del estado canónico.

<a name="gt-14"></a>
#### GT-14 · Webhook saliente al completar un gate

- **Criticidad:** P1 · **Complejidad:** S · **Estado:** EN-PROGRESO
- **Objetivo:** Adapter de infraestructura que hace POST de `GateEvidence` a una URL de webhook provista por el caller al completarse una evaluación. El CLI permanece stateless — la URL siempre es un parámetro.
- **Evidencia actual:** `WebhookAdapter` y el port notifier existen en el working tree; el cierre de integración depende del baseline verde y un test con listener receptor.
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

- **Criticidad:** P1 · **Complejidad:** M · **Estado:** EN-PROGRESO
- **Objetivo:** Retirar el `DIContainer` custom en favor del DI de NestJS, y luego endurecer los boundaries de `.eslintrc.js`: eliminar las concesiones `domain → core` y `application → infrastructure`.
- **Evidencia actual:** lint pasa y el working tree introduce abstracciones compartidas de comandos, pero los tests del módulo Nest fallan resolución de dependencias y el build productivo tiene errores de DI/tipos.
- **Cierre cuando:** un único mecanismo de DI; los boundaries estrictos pasan en un lint limpio.

<a name="gt-18"></a>
#### GT-18 · Publicar `@evolith/smart-cli` en npm

- **Criticidad:** P1 · **Complejidad:** S · **Estado:** PENDIENTE
- **Objetivo:** Publicar el CLI públicamente según la estrategia open-core (tier gratuito CLI + MCP) con ownership del scope npm, provenance, versionado, smoke de instalación limpia y documentación de release.
- **Dependencia:** GT-28, GT-05 y GT-07 deben cerrarse primero.
- **Cierre cuando:** `npm i -g @evolith/smart-cli` funciona desde el registro público.

### Transversal

<a name="gt-19"></a>
#### GT-19 · Migración hexagonal incremental de `core/`

- **Criticidad:** P1 · **Complejidad:** L · **Estado:** EN-PROGRESO
- **Objetivo:** Disolver el god-layer `core/` (~17k líneas) incrementalmente: lógica pura → `domain/`, orquestación → `application/`, adapters (MCP, observabilidad, providers) → `infrastructure/`, dejando `core/` solo como composition root. Avanza oportunistamente con cada fase anterior — nunca como reescritura big-bang.
- **Evidencia actual:** ports de `domain` y adapters de infraestructura aún importan `NormalizedRule` desde `core/validators`, señal de ownership invertido.
- **Cierre cuando:** `core/` contiene solo DI/bootstrap; los boundaries de ESLint aplican reglas hexagonales estrictas (ver GT-17) sin excepciones.

<a name="gt-20"></a>
#### GT-20 · Backfill de contenido de ADRs al estándar de autoría

- **Criticidad:** P1 · **Complejidad:** L · **Estado:** PENDIENTE
- **Objetivo:** Completar las secciones añadidas como stubs por la estandarización de ADRs del 2026-06-10 (aproximadamente 697 marcadores en 162 archivos): Objetivo y Alcance, Opciones Consideradas, Evidencias y Criterios de Evaluación, Decisiones y Estándares Relacionados — más Vigilancia Tecnológica y Fuentes Actuales para ADRs de plataforma — según el [Estándar de Autoría de ADRs](../../../architecture/adrs/adr-authoring-standard.es.md). El backfill debe reconstruir con honestidad, nunca fabricar historia.
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

<a name="gt-23"></a>
#### GT-23 · Backfill de traducciones al español del corpus de referencia

- **Criticidad:** P2 · **Complejidad:** L · **Estado:** PENDIENTE
- **Meta:** que todo documento bajo `reference/` y `rulesets/` sea legible en español sin marcadores de esqueleto declarados.
- **Objetivo:** Traducir los 76 archivos actualmente marcados como "esqueleto inicial / pendiente de traducción", concentrados en `governance/standards/ai-augmented/*`, `knowledge/architecture-intelligence/patterns` y cuerpos ADR seleccionados. El inglés sigue siendo la fuente que decide; el español espeja la estructura. Los esqueletos consumidos por herramientas bajo `.harness/` y `.bmad-core/` quedan fuera de alcance salvo promoción al corpus de referencia.
- **Cierre cuando:** `grep -rl "pendiente de traducción" reference/ rulesets/` devuelve cero archivos y `check-bilingual-parity.mjs` pasa.
- **Referencias:** [Índice Bilingüe](../../../navigation/BILINGUAL_INDEX.es.md) · [Glosario de Terminología](../../../../.harness/scripts/bilingual-terminology-glossary.es.md)

<a name="gt-24"></a>
#### GT-24 · Ejecutar las migraciones documentales declaradas

- **Criticidad:** P2 · **Complejidad:** M · **Estado:** PENDIENTE
- **Meta:** que la ubicación física de cada documento coincida con su clasificación taxonómica declarada — sin más notas de "migración pendiente".
- **Objetivo:** Ejecutar las migraciones que los hubs ya declaran: (1) mover los documentos de visión/estrategia/posicionamiento de la suite desde la ruta legacy `governance/standards/vision/` a sus áreas de `product-suite/`; (2) migrar la documentación de Smart CLI y MCP Services a `reference/products/`; (3) promover el [Modelo de Abstracción de Proveedores y Plugins](./evolith-provider-abstraction-plugin-model.es.md) a principio de arquitectura Core; (4) mover las [Interfaces Técnicas del Tracker](./sdlc-tracker-technical-interfaces.es.md) al diseño de producto del Tracker. Cada movimiento deja un stub de compatibilidad en la ruta antigua y corrige todos los enlaces entrantes en el mismo cambio.
- **Cierre cuando:** no queda ningún marcador de "migration pending / migración pendiente" en `reference/` ni `sdk/`; `validate-docs.mjs` pasa.
- **Referencias:** [Hub de Product Suite](../../../product-suite/README.es.md) · [Hub de Diseños de Producto](../../../products/README.es.md) · [Taxonomía Documental](../../../documentation-taxonomy.es.md)

<a name="gt-25"></a>
#### GT-25 · Primeros perfiles de proveedor para las categorías de plataforma

- **Criticidad:** P2 · **Complejidad:** L · **Estado:** PENDIENTE
- **Meta:** que el dominio de Guías de Plataforma deje de ser una promesa vacía — cada categoría planificada tiene al menos un perfil de proveedor real.
- **Objetivo:** Redactar perfiles de proveedor siguiendo el checklist de contenido requerido del [Hub de Plataformas](../../../platforms/README.es.md) (capacidades, limitaciones, licencias, aislamiento de tenants, mapeo de adapters, reemplazabilidad, fuentes actuales), empezando por las categorías de las que los productos ya dependen: `scm/` (GitHub), `ci-cd/` (GitHub Actions), `observability/` (stack OTel), `security/` (CodeQL/Trivy).
- **Cierre cuando:** cada directorio de categoría existe con ≥1 perfil (EN+ES) enlazado desde la tabla del hub de plataformas.
- **Referencias:** [Hub de Plataformas](../../../platforms/README.es.md) · [Catálogo de Herramientas Validadas](../../../platforms/validated-tool-catalog.es.md)

<a name="gt-26"></a>
#### GT-26 · Playbook de Zero-Downtime Release

- **Criticidad:** P2 · **Complejidad:** S · **Estado:** PENDIENTE
- **Meta:** que la Fase 5 del SDLC enlace un runbook operativo real en lugar de un marcador "Próximamente".
- **Objetivo:** Escribir el playbook de despliegues blue-green y canary anunciado en la tabla de la Fase 5 del [Centro de Gobernanza SDLC](../../sdlc/README.es.md) (EN+ES), cubriendo restricciones de zero-downtime, disparadores de rollback y checkpoints de observabilidad, y enlazarlo desde la tabla de artefactos de la Fase 5.
- **Cierre cuando:** la fila de la Fase 5 enlaza el playbook y no queda ningún marcador "Coming Soon / Próximamente" en el centro SDLC.
- **Referencias:** [Centro de Gobernanza SDLC](../../sdlc/README.es.md) · [Quality Gates](../../sdlc/quality-gates.es.md)

### Integridad del Tracking

<a name="gt-27"></a>
#### GT-27 · Consistencia semántica del tracking canónico

- **Criticidad:** P0 · **Complejidad:** S · **Estado:** EN-PROGRESO
- **Gap:** El tablero canónico contenía un GT-19 duplicado, trabajo completado en la cola activa, estados EN/ES contradictorios y totales que ya no coincidían con los registros detallados.
- **Propósito:** Hacer que la priorización, el reporting y las decisiones de inversión dependan de una única superficie confiable de gobernanza de producto.
- **Evidencia actual / ejemplo:** Esta revisión normaliza IDs únicos, estados activos, orden y totales. La consistencia semántica seguirá manteniéndose manualmente hasta implementar GT-35.
- **Cierre cuando:** cada GT tiene exactamente una fila de dashboard y un registro detallado; criticidad, complejidad y estado coinciden entre EN/ES; los completados quedan fuera de la cola activa; los totales se derivan o validan automáticamente.
- **Referencias:** [Evaluación de Madurez](./maturity-assessment.es.md) · [Taxonomía Documental](../../../documentation-taxonomy.es.md)

<a name="gt-35"></a>
#### GT-35 · Inventarios automatizados y validación del tracking

- **Criticidad:** P1 · **Complejidad:** M · **Estado:** PENDIENTE
- **Gap:** Los inventarios del repositorio y los totales de salud de producto se mantienen manualmente y quedan obsoletos. Por ejemplo, el snapshot histórico reporta 14 schemas mientras el árbol actual contiene 17, y no puede detectar IDs GT duplicados ni estados bilingües divergentes.
- **Propósito:** Generar evidencia de decisión desde el repositorio en vez de depender de afirmaciones sincronizadas manualmente.
- **Evidencia actual / ejemplo:** La validación documental comprueba enlaces, anchors, encoding y diagramas, pero no valida la semántica del tablero ni regenera inventarios de rulesets, ADRs, traducciones e implementación.
- **Cierre cuando:** un comando de validación falla ante IDs duplicados, fichas faltantes, metadata EN/ES diferente, completados en la cola activa, totales incorrectos o inventarios obsoletos; su resumen generado se referencia desde el reporte de madurez.
- **Referencias:** [Hub de Rulesets](../../../../rulesets/README.es.md) · [Evaluación de Madurez](./maturity-assessment.es.md) · [Tracking de Gaps](./gap-tracking.es.md)

### Línea Base de Release y Ejecución de Políticas

<a name="gt-28"></a>
#### GT-28 · Restaurar la línea base de build, tests y smoke del CLI

- **Criticidad:** P0 · **Complejidad:** M · **Estado:** EN-PROGRESO
- **Gap:** El refactor actual del CLI pasa lint pero no compila, lo que también impide ejecutar el smoke MCP y deja suites unitarias en rojo.
- **Propósito:** Restablecer una línea base ejecutable de release antes de tratar capacidades de CLI, MCP o policy engine como evidencia de producto completado.
- **Evidencia actual / ejemplo:** `npm run build` reporta errores de contratos TypeScript en carga de catálogo, history, tools MCP, prompts e infraestructura de comandos. `npm test` reporta actualmente 10 suites fallidas y 58 tests fallidos; `npm run mcp:smoke` se detiene en el build fallido.
- **Cierre cuando:** desde un checkout limpio pasan lint, build, tests unitarios y smoke MCP stdio/HTTP; ninguna ruta crítica de release se satisface solo con tests omitidos.
- **Referencias:** [Smart CLI](../../../../sdk/cli/README.es.md) · [ADR-0073 Contrato Unificado de Salida del CLI](../../../architecture/adrs/core/0073-unified-cli-output-contract.es.md) · [Quality Gates](../../sdlc/quality-gates.es.md)

<a name="gt-29"></a>
#### GT-29 · Paridad de policy engines Native y OPA

- **Criticidad:** P0 · **Complejidad:** L · **Estado:** EN-PROGRESO
- **Gap:** R-25 exige cada regla arquitectónica en ambos evaluadores, pero la política de arquitectura OPA aún contiene rutas placeholder y el evaluador Native no cubre todas las categorías F1. Por ello todavía no se puede confiar en que inputs equivalentes produzcan veredictos equivalentes.
- **Propósito:** Convertir los rulesets en un contrato de gobernanza real y portable, no en dos implementaciones parcialmente superpuestas.
- **Evidencia actual / ejemplo:** F1-R09 a F1-R11 tienen implementaciones Rego, mientras la cobertura de dependency injection, static analysis y separation of concerns sigue incompleta entre engines. F1-R10 también declara enforcement basado en AST mientras su ruta Rego actual usa coincidencia textual.
- **Cierre cuando:** una matriz de cobertura generada mapea cada regla arquitectónica activa a implementaciones Native y OPA; tests de equivalencia comparan findings y severidad para fixtures conformes y no conformes; el engine OPA/WASM empaquetado pasa el mismo gate de release.
- **Referencias:** [Reglas Globales R-25](../../../../.harness/rules/global-rules.es.md) · [Ruleset F1](../../../../rulesets/architecture/f1-modular-monolith.rules.json) · [Política de Arquitectura OPA](../../../../rulesets/opa/architecture.rego)

<a name="gt-36"></a>
#### GT-36 · Política de cobertura lingüística para reglas machine-readable

- **Criticidad:** P2 · **Complejidad:** L · **Estado:** PENDIENTE
- **Gap:** El repositorio tiene 27 rulesets en inglés pero solo 3 rulesets JSON en español, sin una decisión explícita sobre si las reglas consumidas por máquinas son artefactos canónicos en inglés o requieren contrapartes bilingües completas.
- **Propósito:** Preservar un único significado autoritativo de las políticas y hacer explícitas y exigibles sus obligaciones lingüísticas.
- **Evidencia actual / ejemplo:** Los documentos narrativos de referencia exigen paridad bilingüe, pero la localización de rulesets es parcial y su frontera de excepción no está codificada en la validación.
- **Cierre cuando:** la gobernanza declara paridad JSON bilingüe completa o una exención explícita de canon inglés con descripciones legibles localizadas; la validación exige el modelo seleccionado y reporta artefactos no cubiertos.
- **Referencias:** [Reglas Globales](../../../../.harness/rules/global-rules.es.md) · [Hub de Rulesets](../../../../rulesets/README.es.md) · [Glosario de Terminología](../../../../.harness/scripts/bilingual-terminology-glossary.es.md)

### Prueba de Producto

<a name="gt-30"></a>
#### GT-30 · Kernel mínimo de gobernanza del Tracker

- **Criticidad:** P0 · **Complejidad:** L · **Estado:** PENDIENTE
- **Gap:** Tracker es un target design detallado, pero no un producto ejecutable; el repositorio público auditado contiene actualmente documentación y ningún código fuente de implementación.
- **Propósito:** Implementar el runtime autoritativo más pequeño capaz de poseer proceso, evidencia, decisiones de gate, aprobaciones, excepciones y estado de auditoría.
- **Evidencia actual / ejemplo:** Las interfaces técnicas definen contratos tenant-aware y ownership de agregados, pero no existe un servicio que persista un proceso, acepte evidencia normalizada o registre un `GateDecision` inmutable.
- **Cierre cuando:** un servicio Tracker ejecutable autentica un tenant, persiste un proceso de producto, evalúa y almacena el linaje de evidencia, registra una decisión de gate inmutable y expone su audit trail mediante una interfaz aprobada.
- **Referencias:** [Interfaces Técnicas del Tracker](./sdlc-tracker-technical-interfaces.es.md) · [Target Design de Composición Gobernada](./evolith-governed-composition-target-design.es.md)

<a name="gt-31"></a>
#### GT-31 · Vertical slice del Producto Mínimo Comprobable

- **Criticidad:** P0 · **Complejidad:** L · **Estado:** PENDIENTE
- **Gap:** Ninguna implementación end-to-end demuestra actualmente la tesis de Evolith desde el contexto de tenant y producto, a través de cinco gates gobernados, hasta evidencia de producción y aprendizaje.
- **Propósito:** Probar o refutar que Evolith puede componer proveedores reemplazables preservando gobernanza canónica, linaje de evidencia y valor de entrega medible.
- **Evidencia actual / ejemplo:** Un slice representativo debe conectar un tenant, un producto, un proveedor de trabajo, repositorio y CI, un agente, observabilidad, analytics y los cinco gates, manteniendo al Tracker como única autoridad para decisiones canónicas.
- **Cierre cuando:** el slice completa un flujo real de entrega gobernada; cada decisión enlaza evidencia fuente y versión de política; al menos un proveedor puede reemplazarse mediante su port; se miden tiempo transcurrido, cantidad de intervenciones y calidad de decisión.
- **Referencias:** [Producto Mínimo Comprobable](./evolith-product-vision-master.es.md#10-producto-mínimo-comprobable) · [Framework de Validación Estratégica y Composición](./evolith-strategic-validation-and-composition-framework.es.md)

<a name="gt-32"></a>
#### GT-32 · Validación de hipótesis de cliente y comprador

- **Criticidad:** P0 · **Complejidad:** M · **Estado:** PENDIENTE
- **Gap:** El cliente objetivo, el dolor operativo, el comprador y la disposición a adoptar siguen siendo hipótesis narrativas sin entrevistas registradas, pilotos controlados ni evidencia de compra.
- **Propósito:** Evitar construir una plataforma internamente coherente cuyo modelo de gobernanza, costo de integración o proceso de compra no resuelva un problema de cliente suficientemente valioso.
- **Evidencia actual / ejemplo:** La visión identifica líderes de producto e ingeniería como usuarios y compradores probables, pero el repositorio no contiene un paquete de evidencia que relacione supuestos con frecuencia observada del problema, costo actual, bloqueadores de adopción y autoridad de compra.
- **Cierre cuando:** al menos ocho entrevistas estructuradas cubren tres roles relevantes; un piloto controlado ejercita el flujo gobernado; un registro de supuestos documenta evidencia y confianza; el Architecture Board toma una decisión explícita de continuar, revisar o detener.
- **Referencias:** [Hipótesis de Cliente](./evolith-product-vision-master.es.md#13-problema-objetivo-e-hipótesis-de-cliente) · [Workflow de Validación Estratégica con IA](./evolith-strategic-validation-and-composition-framework.es.md)

<a name="gt-33"></a>
#### GT-33 · Scoring de madurez respaldado por evidencia

- **Criticidad:** P1 · **Complejidad:** M · **Estado:** PENDIENTE
- **Gap:** Los scores actuales de madurez pueden confundir una capacidad diseñada con una capacidad implementada, validada, adoptada o gestionada operacionalmente.
- **Propósito:** Hacer que el reporte de madurez sirva para decisiones de inversión y release vinculando cada score con evidencia observable.
- **Evidencia actual / ejemplo:** Tracker tiene documentación extensa de diseño pero ninguna implementación ejecutable, mientras la línea base histórica del CLI reporta gates de release verdes que actualmente fallan bajo GT-28.
- **Cierre cuando:** cada capacidad puntuada declara un estado como Visionada, Diseñada, Prototipada, Implementada, Validada o Escalada; cada estado no visionario enlaza evidencia calificadora; los scores agregados se recalculan desde esos estados y exponen incertidumbre.
- **Referencias:** [Evaluación de Madurez](./maturity-assessment.es.md) · [Métricas y Madurez de Capacidades](./evolith-product-vision-master.es.md#11-métricas-y-madurez-de-capacidades)

<a name="gt-34"></a>
#### GT-34 · Repriorización del roadmap alrededor de la prueba de gobernanza

- **Criticidad:** P1 · **Complejidad:** S · **Estado:** PENDIENTE
- **Gap:** El roadmap adelanta preocupaciones amplias de plataforma como abstracción multi-cloud, Dapr y arquitectura zero-trust antes de que el kernel de gobernanza y el Producto Mínimo Comprobable produzcan evidencia de cliente y operación.
- **Propósito:** Secuenciar la inversión alrededor de la tesis central y postergar opcionalidad costosa hasta que la evidencia la justifique.
- **Evidencia actual / ejemplo:** El próximo horizonte de planificación debe priorizar línea base de release, kernel del Tracker, vertical slice y aprendizaje del piloto; el runtime distribuido y la amplitud de proveedores deben tener disparadores explícitos de evidencia.
- **Cierre cuando:** el roadmap ordena el trabajo como línea base → kernel de gobernanza → vertical slice → piloto controlado → escala; las tecnologías diferidas nombran disparadores medibles de adopción, carga, compliance o presión de proveedores; las dependencias mapean a este tablero.
- **Referencias:** [Roadmap de Estrategia Evolutiva](./evolutionary-strategy-roadmap.es.md) · [Producto Mínimo Comprobable](./evolith-product-vision-master.es.md#10-producto-mínimo-comprobable) · [Framework de Validación Estratégica y Composición](./evolith-strategic-validation-and-composition-framework.es.md)

---

## 4. Snapshot de Línea Base (absorbido de gap-analysis-core, 2026-06-09)

Estado de madurez de referencia al momento en que este tablero se convirtió en la fuente única de tracking:

> Este snapshot es evidencia histórica, no salud actual. El estado ejecutable vigente del release se registra en [GT-28](#gt-28), y el drift de inventarios en [GT-35](#gt-35).

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
