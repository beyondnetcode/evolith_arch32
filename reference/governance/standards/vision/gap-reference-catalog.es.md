# Evolith Core — Catálogo de Referencia de Gaps

> **Navegación Bilingüe:** [English Version](./gap-reference-catalog.md)

**Responsable:** Evolith Architecture Board
**Autoridad de Estado:** [Tablero de Seguimiento de Gaps](./gap-tracking.es.md)
**Autoridad de Cierre:** [Estándar de Evidencia para Cierre de Gaps](./gap-closure-evidence-standard.es.md) · [`gap-closure-evidence.json`](./gap-closure-evidence.json)

Este catálogo explica cada gap: problema, propósito, evidencia, criterios de cierre y referencias. No es un tablero de seguimiento; la prioridad y el estado son autoritativos únicamente en el [Tablero de Seguimiento de Gaps](./gap-tracking.es.md).

---

## 1. Detalle de Gaps

### Phase 2: Arquitectura Agéntica y Evolución

#### GT-135

**Título:** Estándar de Telemetría y Control de Costos para IA Agéntica

- **Propósito:** Estandarizar los esquemas OpenTelemetry para rastrear el uso de tokens LLM, latencia de ejecución y atribución de costos por ciclo de agente, previniendo presupuestos descontrolados en topologías autónomas.
- **Evidencia:** Actualmente, las ejecuciones del sandbox de agentes carecen de trazas APM formales para consumo de tokens y costos de API.
- **Hecho cuando:** Un ADR defina los spans de OpenTelemetry para llamadas LLM Agénticas, y el `ci-runner` valide estos elementos específicos del esquema.

#### GT-136

**Título:** Control de Acceso Consciente del Contexto (ABAC para LLMs)

- **Propósito:** Las políticas OPA `policy.wasm` deben permitir o denegar dinámicamente las ejecuciones de herramientas MCP basándose en el contexto del usuario humano (ej., RBAC/ABAC), asegurando que los agentes no puedan eludir los permisos humanos.
- **Evidencia:** Los agentes actualmente se ejecutan con permisos amplios de sandbox sin verificar los claims del directorio activo del usuario invocador.
- **Hecho cuando:** La lógica de validación OPA dual-engine incorpore un esquema de contexto de usuario, y se publique una política ABAC `.rego` de referencia.

#### GT-137

**Título:** Identidad Soberana para IA Agéntica

- **Propósito:** Definir cómo los agentes autónomos suplantan los tokens OAuth 2.0 humanos o mantienen identidades soberanas de cuentas de servicio al atravesar APIs downstream.
- **Evidencia:** No existe un flujo de intercambio de tokens estandarizado para la topología de IA Agéntica en Evolith.
- **Hecho cuando:** Un ADR documente el patrón de Intercambio de Tokens OAuth 2.0 (RFC 8693) para la delegación de identidad de agentes.

#### GT-138

**Título:** Flujos de Trabajo Agénticos Orientados a Eventos

- **Hecho cuando:** El hub de la topología Orientada a Eventos incluya un patrón de referencia para consumir eventos de dominio para desencadenar tareas de agentes en segundo plano.

#### GT-139

**Título:** Estándar de Gobernanza de Conocimiento RAG

- **Propósito:** Estandarizar cómo los archivos markdown arquitectónicos de Evolith (ADRs, rulesets) son fragmentados, incrustados (embedded) y sincronizados en Bases de Datos Vectoriales para asistentes habilitados para RAG.
- **Evidencia:** La documentación actualmente solo es analizada estáticamente por el pipeline CI; no hay un pipeline para incrustar actualizaciones en un almacén vectorial.
- **Hecho cuando:** Se cree una especificación para la estrategia de chunking, etiquetado de metadatos y sincronización de vectores para todos los archivos `reference/`.

#### GT-140

**Título:** Estándar de Rotación de Tokens de Identidad de Workload para Referencia de Satélites

- **Propósito:** Documentar directrices y patrones de referencia arquitectónicos para el refresco automático de tokens, expiración y rotación de claves de identidades de carga de trabajo (workload identities) en servicios satélite, manteniendo a Evolith Core libre de credenciales.
- **Evidencia:** Las reglas actuales de identidad soberana (ADR-0088) no guían cómo las aplicaciones satélite aguas abajo manejan el ciclo de vida de claves y la expiración de tokens.
- **Hecho cuando:** Se publique un estándar arquitectónico detallando los flujos de refresco de tokens de identidad de carga de trabajo y perfiles de delegación de confianza para aplicaciones clientes.

#### GT-141

**Título:** Estándar de Control de Concurrencia y Bloqueo de Recursos para Herramientas MCP

- **Propósito:** Establecer patrones para prevenir colisiones de escritura y corrupción de estado cuando múltiples agentes autónomos ejecutan mutaciones paralelas sobre el mismo repositorio o archivo objetivo utilizando herramientas MCP.
- **Evidencia:** Los sandboxes multi-agente carecen actualmente de pautas de bloqueo o salvaguardas de concurrencia para la ejecución concurrente de herramientas.
- **Hecho cuando:** Un estándar de diseño defina el mecanismo de bloqueo de recursos y las estrategias de mitigación de concurrencia para flujos de trabajo multi-agente.

#### GT-142

**Título:** Pipeline de Enlace de LLM Real en CI para Revisiones Agénticas

- **Propósito:** Reemplazar el comportamiento de revisión simulado/dry-run en el script de CI agéntico con una integración funcional que invoque a un LLM externo utilizando credenciales provistas dinámicamente a través de secretos del runner.
- **Evidencia:** El paso `13-agentic-code-review.mjs` valida la conexión MCP pero depende de una revisión simulada del LLM.
- **Hecho cuando:** El paso de CI pueda ejecutar una verificación real del LLM cuando `EVOLITH_AGENTIC_REVIEW=true` y una variable de entorno de API key esté presente, seguro contra fallos.

#### GT-143

**Título:** Estándares de Handoff Multi-Agente y Delegación de Tareas

- **Propósito:** Definir contratos de mensajería estándar, reglas de reenvío de tokens y seguimiento de correlación para agentes que delegan subtareas a otros agentes especializados.
- **Evidencia:** No existen patrones formales o directrices en el repositorio para la delegación de tareas de agente a agente.
- **Hecho cuando:** Se publiquen patrones documentados para handoffs multi-agente, delegación de identidad y propagación de contexto en la carpeta de patrones agénticos.

#### GT-144

**Título:** Reglas de Prevención de Bucles Infinitos y Circuit Breaker para Agentes

- **Propósito:** Establecer salvaguardas de seguridad para detectar, reportar y romper dependencias circulares o bucles de llamadas recursivas entre agentes y herramientas MCP antes de consumir presupuestos excesivos.
- **Evidencia:** Los límites de autorización de herramientas actuales (ADR-0087) carecen de mecanismos o reglas para la detección de bucles recursivos.
- **Hecho cuando:** Una política de arquitectura defina criterios de detección de bucles (máximo de saltos, cabeceras de profundidad) y contratos de circuit breaking para flujos de trabajo de agentes.

#### GT-145

**Título:** Sincronización Veraz y Neutral al Proveedor de Vectores RAG

- **Propósito:** Convertir la ruta de sincronización delta de RAG de ADR-0090 en una capacidad operativa real y neutral al proveedor. Una ejecución live debe generar embeddings y persistir fragmentos, informar un comprobante durable y fallar cuando ningún adaptador configurado pueda completar la operación.
- **Evidencia:** `.harness/scripts/ci/14-rag-index-sync.mjs` etiqueta `EVOLITH_RAG_SYNC=true` como live e informa cada fragmento como upserted, pero sus llamadas al almacén vectorial y a embeddings son TODOs comentados. Ninguna base vectorial es contactada ni verificada.
- **Hecho cuando:**
  - [ ] Un puerto neutral para embeddings/almacén vectorial y un contrato de configuración seleccionan un adaptador real sin vincular el core a un proveedor.
  - [ ] El modo live hace upsert de metadatos y vectores deterministas, registra un comprobante machine-readable y falla de forma cerrada ante fallo del adaptador, embedding o persistencia.
  - [ ] El ciclo de vida del índice cubre archivos fuente modificados y eliminados sin vectores huérfanos, con suite de pruebas de adaptador falso y límite de prueba de integración.
  - [ ] La guía de operaciones documenta credenciales de mínimo privilegio, comportamiento acotado de lotes/reintentos y telemetría de costo/tokens.

#### GT-146

**Título:** Revisión Agéntica de CI Segura, Neutral al Proveedor y Acotada por Tokens

- **Propósito:** Hacer segura, portable y económica la revisión de código con LLM real: minimizar y sanear el contexto enviado, imponer presupuestos explícitos de costo/tiempo y validar hallazgos estructurados antes de que un gate de CI actúe sobre ellos.
- **Evidencia:** `.harness/scripts/ci/13-agentic-code-review.mjs` fija el endpoint y modelo de Gemini, envía el `git diff` completo y crudo al proveedor, y depende de un marcador textual libre `VIOLATION_DETECTED`. No cuenta con redacción de secretos, tope de diff/tokens, priorización de contexto, puerto de proveedor ni validación de resultado estructurado.
- **Hecho cuando:**
  - [ ] Un puerto de revisión neutral al proveedor soporta adaptadores y modelos configurados preservando un contrato de CI de fallo cerrado.
  - [ ] La entrada de revisión elimina credenciales y patrones sensibles, incluye solo archivos modificados relevantes para políticas y está acotada/fragmentada por presupuestos medibles de bytes, tokens, latencia y costo.
  - [ ] La respuesta del proveedor cumple un esquema versionado con ubicaciones de evidencia y confianza; resultados malformados o indeterminados no pueden aprobar el gate silenciosamente.
  - [ ] Pruebas cubren redacción, presupuestos, selección de fragmentos, fallos de adaptador y validación de respuesta; CI usa permisos mínimos e informa telemetría agregada y no sensible de eficiencia.

#### GT-147

**Título:** Auditoría Automatizada de Deriva de Capacidades Operativas y Eficiencia

- **Propósito:** Detectar continuamente divergencias entre capacidades declaradas de CI/operaciones y comportamiento ejecutable, identificando además latencia evitable, uso de tokens y trabajo innecesario antes de que estos gaps lleguen a flujos productivos.
- **Evidencia:** La revisión Wilson V4 encontró que el script RAG presenta upserts no implementados como sincronización live y que la revisión agéntica no tiene controles de contexto/costo. Estos gaps eran visibles en el código, pero ningún evaluador reutilizable los afirma; por tanto futuras regresiones dependen de inspección manual.
- **Hecho cuando:**
  - [ ] Un evaluador CI reproducible mapea modos operativos declarados, flags de entorno y afirmaciones ADR a adaptadores ejecutables o semántica dry-run explícita.
  - [ ] El evaluador falla ante mensajes de éxito falsos, adaptadores configurados ausentes, payloads externos no acotados y límites ausentes de timeout/retry/costo cuando una capacidad invoca servicios externos.
  - [ ] Su pasada topológica evalúa manifiesto, corpus, ruleset Native y política OPA de cada topología aceptada para detectar paridad, riqueza informativa, referencias huérfanas, controles redundantes/costosos y oportunidades medibles de reducir latencia, I/O, contexto y consumo de tokens.
  - [ ] Emite hallazgos versionados y machine-readable con ubicaciones fuente y crea un resumen humano conciso apto para el proceso canónico de triage de gaps.
  - [ ] Pruebas fixture demuestran detección de los casos actuales de falso upsert RAG y diff agéntico no acotado, además de ejemplos conformes para evitar falsos positivos.

#### GT-148

**Título:** Reparación de Migración de Referencias y Cobertura de Reglas Consciente de Topologías

- **Propósito:** Restaurar un reporte de cobertura confiable y consciente de topologías y eliminar referencias obsoletas de rutas por fase, para que el descubrimiento de reglas, herencia de satélites y reportes de gobernanza usen el corpus topológico canónico.
- **Evidencia:** Wilson V5 ejecutó `.harness/scripts/generate-rule-coverage.mjs`; falla antes de producir una matriz porque lee los archivos eliminados `rulesets/architecture/f1-modular-monolith.rules.json` y `rulesets/opa/architecture.rego`. `rulesets/governance/satellite-contracts.rules.json` aún declara los mismos archivos F1/F2/F3 inexistentes, mientras que los artefactos canónicos viven bajo `reference/architecture/topologies/progressive-axis/`.
- **Hecho cuando:**
  - [x] El generador de cobertura descubre reglas desde manifiestos topológicos en vez de rutas legacy hard-coded y emite cobertura Native/OPA por topología con ubicaciones fuente.
  - [x] Contratos de satélite, documentación y referencias machine-readable resuelven solo artefactos canónicos; una prueba automática de resolución de referencias evita recurrencia.
  - [x] El reporte falla ante artefactos topológicos faltantes, duplicados o sin referencia y referencias canónicas rotas, informa divergencia de IDs Native/OPA para GT-149 y se integra en la ruta de validación CI relevante con alcance por topologías modificadas.
  - [x] Fixtures cubren Monolito Modular, Módulos Distribuidos, Microservicios y un caso negativo de ruta migrada.
- **Evidencia de cierre:** Los commits `7e5493a6` y `ec968d19` reemplazan el generador obsoleto solo-F1 por descubrimiento desde manifiestos, reparan referencias de herencia de satélites, agregan el decimoquinto gate CI y fixtures focalizados, y mantienen visible la divergencia de IDs Native/OPA para GT-149 en vez de ocultarla.

#### GT-149

**Título:** Pruebas OPA Ejecutables y Gate de Paridad Semántica Native/OPA

- **Propósito:** Verificar comportamiento —no solo existencia de archivos— de cada política topológica, y asegurar que los motores Native y OPA lleguen a decisiones allow/deny equivalentes para los mismos contratos.
- **Evidencia:** Wilson V5 no encontró archivos de pruebas OPA y el runner CI de 14 pasos no ejecuta `opa test` ni un evaluador equivalente fijado. `validate-topology-manifests.mjs` confirma que existen archivos Native/OPA declarados, pero no evalúa decisiones de política; el generador de cobertura actual también está roto (GT-148).
- **Hecho cuando:**
  - [ ] Un evaluador OPA fijado y reproducible ejecuta fixtures positivos, negativos y de límite para cada topología aceptada sin depender de un binario host no declarado.
  - [ ] Las mismas entradas canónicas pasan por evaluadores Native y OPA; un gate diferencial falla ante deriva de veredicto, ID de regla, severidad o ubicación de evidencia.
  - [ ] Los resultados son machine-readable e incluyen versiones de política/ruleset, identidad del fixture, duración de ejecución y solo telemetría agregada de eficiencia.
  - [ ] CI acota trabajo a políticas/manifiestos modificados cuando sea seguro, conserva una ejecución completa programada de paridad y tiene fixtures para fallo del evaluador y entrada de política malformada.

#### GT-150

**Título:** Madurar las Topologías Draft Restantes a Paridad de Corpus Aceptado

- **Propósito:** Hacer que toda topología Evolith publicada sea utilizable al nivel base de Monolito Modular, no solo un draft descubrible con reglas aisladas.
- **Evidencia:** El inventario de manifiestos de Wilson V5 informa Data Mesh, Edge Computing, Serverless y Event-Driven como `draft` sin `spec.corpus`; por tanto R-27 no se les aplica. Sus gaps anteriores de reglas base pueden mantenerse históricamente cerrados, pero no entregan la madurez de corpus, control-plane y evidencia de una topología aceptada solicitada para Evolith.
- **Hecho cuando:**
  - [ ] Data Mesh, Edge Computing, Serverless y Event-Driven cuentan con guía bilingüe de adopción, composición, operaciones, seguridad, observabilidad, resiliencia y evolución, más ADRs específicos de topología aceptados.
  - [ ] Cada manifiesto declara `spec.corpus`, artefactos Native/OPA validados, fixtures de contrato compartidos, pruebas positivas/negativas/diferenciales y exposición de control-plane en CLI, MCP y Core API.
  - [ ] Cada topología asciende de `draft` a `accepted` solo después de aprobar el validador de madurez topológica, gate de paridad Native/OPA, validación documental y pruebas de superficies consumidoras.
  - [ ] El catálogo registra relaciones explícitas con rutas de migración y topologías complementarias para que usuarios IA y humanos recuperen guía aplicable sin reconstruir contexto.

### Fase F0 — Contrato Primero

#### GT-01

**Título:** ADR de contrato unificado

- **Objetivo:**
  - [x] Redactar y aprobar un único ADR en Evolith Core que reconcilie las dos propuestas de contrato divergentes — la estructura [`GateEvidence`](./sdlc-tracker-technical-interfaces.es.md) del lado Core y el envelope de salida del lado Tracker (`{success, data, meta}`, códigos de error, flags globales `--format/--dry-run/--phase`).
  - [x] Resolver el naming del binario (`smart-cli` vs alias `evolith`). Verificado 2026-06-10: los 27 rulesets ya tienen campo `version` consumible como `rulesetVersion`.
- **Cierre cuando:**
  - [x] ADR aprobado por el Architecture Board.
  - [x] Documento de gaps de repo Core actualizado apuntando al ADR.
  - [x] Interfaz técnica de Tracker actualizada para referenciar ADR-0073 como autoridad del envelope unificado.

### Fase F1 — GateEvidence como Dominio

#### GT-02

**Título:** `GateEvidence` modelado en la capa de dominio

- **Objetivo:** Implementar `GateEvidence` (`verdict`, `violations[]`, `rulesetRef`, `rulesetVersion`, `evaluatedAt`, `evaluatedBy`) y el envelope de salida como tipos de dominio en `sdk/cli/src/domain/`, con JSON schema publicado en `rulesets/schema/`.
- **Cerrado por:** `sdk/cli/src/domain/gate-evidence.ts` (tipos de dominio puros + constructores de envelope + `deriveVerdict`), `rulesets/schema/gate-evidence.schema.json` y `rulesets/schema/output-envelope.schema.json`, 18 tests unitarios validando muestras construidas desde el dominio contra ambos schemas vía ajv.

#### GT-03

**Título:** `EvaluateGateUseCase` + comando `gate evaluate`

- **Objetivo:** Crear un use case de capa application que orqueste `phase-gate-validator.service` y `rule-evaluation-engine` (clarificando sus responsabilidades solapadas), expuesto como `gate evaluate --phase <p> --format json` emitiendo el contrato de GT-02.
- **Cerrado por:** `EvaluateGateUseCase` (capa application; frontera de responsabilidades documentada: gates → PhaseGateValidatorService, cumplimiento general de rulesets → RuleEvaluationEngine vía `validate`), nuevo comando `gate` emitiendo el envelope ADR-0073 con eco de contexto y exit code 1 ante gates fallidos; 6 tests unitarios + 8 E2E validando `GateEvidence` conforme al schema para las 5 fases más envelopes de error (INVALID_PHASE, VALIDATION_FAILED). Suite completa: 1 510 tests verdes.

#### GT-04

**Título:** Eliminar service locator del dominio · reubicar telemetría

- **Objetivo:** La capa `domain` actualmente depende de un `ServiceLocator` (ej. en `gate-evidence.ts`) para resolver dependencias de telemetría y IDs de correlación. Esto viola el principio de Clean Architecture de que las entidades de dominio deben ser puras y no conocer infraestructura ni frameworks de DI. Mover la inyección de telemetría/correlación a la capa `application` (casos de uso).
- **Cierre cuando:** Se eliminan por completo los imports de `ServiceLocator` y `@nestjs/core` de `sdk/cli/src/domain/`; los casos de uso pasan los IDs de correlación a las factories de dominio de forma explícita.
- **Cerrado por:** El service locator del dominio fue removido completamente en refactorizaciones previas (GT-02/03). El servicio de telemetría fue reubicado desde `domain/services/tool-usage-telemetry.service.ts` hacia `core/observability/`, purificando la capa. El paso de correlation ID ya se realiza vía el payload explícito `meta` en `createSuccessEnvelope`.

### Fase F2 — Exposición MCP

#### GT-05

**Título:** Reemplazar `MinimalHttpTransport` por Streamable HTTP del SDK MCP

- **Objetivo:** Retirar el transporte `node:http` artesanal (~300 líneas de `server.ts`) en favor del transporte Streamable HTTP oficial de `@modelcontextprotocol/sdk`, ganando manejo de sesiones y cumplimiento de spec.
- **Evidencia actual:** `StreamableHTTPServerTransport` y un wrapper existen en el working tree, pero el CLI no compila y tres bloques de tests orientados a HTTP permanecen skipped.
- **Cierre cuando:** el smoke HTTP/SSE pasa contra el transporte del SDK; `server.ts` ya no contiene plomería de transporte.

#### GT-06

**Título:** Tool MCP `evolith-gate-evaluate` + contexto de fase

- **Objetivo:**
  - [x] Exponer el use case de GT-03 como tool MCP `evolith-gate-evaluate` aceptando `{phase, projectPath, rulesetRef, evidenceMode}`. Es el punto de integración primario del Tracker.
  - [x] Resolver el contexto de fase para las tools existentes: la evaluación de gates lo exige; las tools legadas no relacionadas conservan sus schemas bajo un alcance de compatibilidad aceptado.
- **Cierre cuando:** un cliente MCP externo evalúa un gate por HTTP y recibe `GateEvidence` válido contra el schema.
- **Cerrado por:** tool expuesto vía `sdk/cli/src/core/mcp/tools/gate.ts`, integrado en `server.ts` y verificado en `mcp:smoke` (HTTP y stdio). El contexto de fase se omitió en las tools SDLC existentes para evitar rupturas de compatibilidad hacia atrás en sus schemas.

#### GT-07

**Título:** Extender `mcp:smoke` para evaluación de gates por HTTP

- **Objetivo:** Añadir round-trips de `evolith-gate-evaluate` (stdio + HTTP) a la suite de smoke de release para que el contrato del Tracker quede protegido por el gate de release.
- **Evidencia actual:** el script smoke contiene llamadas de gate por stdio y Streamable HTTP, pero `npm run mcp:smoke` se detiene en el build TypeScript fallido.
- **Cierre cuando:** `npm run mcp:smoke` falla si el contrato de gate-evaluate regresiona.

### Fase F3 — Completar Evidencia de Gates (62% → 100%)

#### GT-08

**Título:** Gate Fase 2: chequeo real del registro de ADRs

- **Objetivo:** Profundizar el chequeo actual de solo-existencia (`adr-matrix.json` presente) a validación de contenido: las decisiones de diseño deben referenciar entradas existentes del registro de ADRs, emitiendo violaciones en `GateEvidence`.
- **Evidencia actual:** el working tree parsea `adr-matrix.json` y rechaza un registro vacío, pero el cambio no constituye evidencia de cierre hasta que build y tests pasen.
- **Cierre cuando:** un satélite sin respaldo de ADR falla el gate Design Baseline con una violación accionable.

#### GT-09

**Título:** Gate Fase 3: chequeo real de coverage

- **Objetivo:** Profundizar el chequeo actual de solo-existencia (directorio `coverage/` presente) a enforcement de umbral: parsear el reporte de coverage y bloquear bajo el ≥80% definido en `phase-gates.rules.json`.
- **Evidencia actual:** el parsing de `coverage/coverage-summary.json` y el umbral de 80% statements existen en el working tree; la verificación de release sigue bloqueada por GT-28.
- **Cierre cuando:** coverage bajo el umbral produce una violación bloqueante en el gate Successful Build.

#### GT-10

**Título:** Gate Fase 4: evidencia de security scan

- **Objetivo:** Profundizar el chequeo actual de solo-existencia (`security-scan.json` presente) a validación de contenido: parsear el reporte SAST y bloquear ante CVEs High/Critical antes de estampar un RC.
- **Evidencia actual:** el validador solo comprueba si existe `security-scan.json`; no inspecciona severidades, estado del scanner ni excepciones aceptadas.
- **Cierre cuando:** evidencia de scan ausente o fallida bloquea el gate RC Stamped.

#### GT-11

**Título:** Gate Fase 5: evidencia de observabilidad + rollback

- **Objetivo:** Profundizar los chequeos actuales de solo-existencia (directorio `observability/`, Release Notes presentes) a validación de contenido de preparación de observabilidad y procedimiento de rollback documentado.
- **Evidencia actual:** los checks aceptan presencia de directorio/documento sin validar indicadores de salud, ownership de alertas, comandos y triggers de rollback ni evidencia de ensayo.
- **Cierre cuando:** artefactos de rollback/observabilidad ausentes bloquean el gate Production Live.

#### GT-12

**Título:** `--dry-run` en todas las operaciones de escritura

- **Objetivo:** Cerrar la cobertura restante de `--dry-run`: `init`, `agents`, `upgrade`, `docs` y `generate-domain` ya lo soportan (verificado 2026-06-10); `architecture scaffold` y `adr` no.
- **Evidencia actual:** ambos comandos restantes contienen código y tests de dry-run en el working tree, pero el baseline completo del CLI está rojo.
- **Cierre cuando:** todo comando de escritura soporta `--dry-run` con cero mutaciones de filesystem verificadas.

### Fase F4 — Automatización y Eventos

#### GT-13

**Título:** Ejecutor autónomo de gates `evolith-phase-advance`

- **Objetivo:** Componer GT-03 en un agente/tool que evalúe una transición de fase propuesta sin disparo humano y devuelva evidencia consolidada.
- **Guardrail de autoridad:** esta tool puede recomendar `pass` o `fail`, pero solo Evolith Tracker puede mutar el estado canónico de fase.
- **Ejemplo:** `evolith-phase-advance --from design --to construction` evalúa cada criterio de Design Baseline y retorna una propuesta de transición más evidencia por gate.
- **Cierre cuando:** una sola llamada produce una propuesta conforme al schema con evidencia por gate y sin mutación directa del estado canónico.

#### GT-14

**Título:** Webhook saliente al completar un gate

- **Objetivo:** Adapter de infraestructura que hace POST de `GateEvidence` a una URL de webhook provista por el caller al completarse una evaluación. El CLI permanece stateless — la URL siempre es un parámetro.
- **Evidencia actual:** `WebhookAdapter` y el port notifier existen en el working tree bajo `packages/infra-providers`; el cierre de integración depende del baseline verde y un test con listener receptor.
- **Cierre cuando:** un test de integración recibe el payload de evidencia en un listener local.

### Fase F5 — Higiene y Publicación

#### GT-16

**Título:** Consolidación documental

- **Objetivo:** Hacer de este tablero la única superficie de tracking: retirar el `cli-core-parity-tracking.md` obsoleto de la raíz y `gap-analysis-core.es.md`, absorber su contenido vivo y reapuntar todas las referencias.
- **Cerrado por:** consolidación del 2026-06-10 — ambos documentos retirados, serie G archivada en la [sección 5](#5-archivo-legado-serie-g-cerrada), todas las referencias del repositorio reapuntadas a este tablero.

#### GT-17

**Título:** Consolidación de DI + endurecimiento de boundaries ESLint

- **Objetivo:** Retirar el `DIContainer` custom en favor del DI de NestJS, y luego endurecer los boundaries de `.eslintrc.js`: eliminar las concesiones `domain → core` y `application → infrastructure`.
- **Evidencia actual:** lint pasa y el working tree introduce abstracciones compartidas de comandos, pero los tests del módulo Nest fallan resolución de dependencias y el build productivo tiene errores de DI/tipos.
- **Cierre cuando:** un único mecanismo de DI; los boundaries estrictos pasan en un lint limpio.

#### GT-18

**Título:** Publicar `@evolith/smart-cli` en npm

- **Objetivo:** Publicar el CLI públicamente según la estrategia open-core (tier gratuito CLI + MCP) con ownership del scope npm, provenance, versionado, smoke de instalación limpia y documentación de release.
- **Dependencia:** GT-28, GT-05 y GT-07 deben cerrarse primero.
- **Cierre cuando:** `npm i -g @evolith/smart-cli` funciona desde el registro público.

### Transversal

#### GT-113

**Título:** Purificación de Clean Architecture en core-domain

- **Objetivo:** Remover las dependencias directas del framework (`@nestjs/common` `Injectable`) y las fugas de I/O de Node.js (`fs-extra`, `path`) de la capa de aplicación/dominio, inyectándolas a través de abstracciones (`IFileSystem`).
- **Cierre cuando:** El paquete `core-domain` no tiene imports de `fs`, `path` ni `@nestjs/*` y todas las operaciones de I/O pasan por inyección de dependencias puras.
- **Solución Propuesta:** Inyectar `IFileSystem` y usar la composición de puertos y adaptadores.

#### GT-114

**Título:** Human-in-the-Loop para Herramientas Mutativas MCP

- **Objetivo:** Proteger el entorno local cuando el Smart CLI reciba comandos mutativos peligrosos desde un agente de IA vía MCP. Requiere implementar un prompt de confirmación interactiva en stdio (o configuración restrictiva) antes de ejecutar.
- **Cierre cuando:** Las herramientas MCP con capacidad de mutación de código/infraestructura soliciten confirmación antes de la ejecución real.
- **Cerrado por:** `sdk/cli/src/infrastructure/mcp/confirmation.service.ts`, `sdk/cli/src/infrastructure/mcp/confirmation.service.spec.ts`, `sdk/cli/test/mcp-confirmation.e2e-spec.ts`, `sdk/cli/src/infrastructure/mcp/server.ts`, `sdk/cli/src/commands/mcp/mcp-serve.command.ts`
- **Evidencia de cierre:**
  - `closedAt`: 2026-06-16
  - `closureCommit`: pending
  - `evidence`: `ConfirmationService` solicita confirmación interactiva antes de ejecutar herramientas MCP mutativas; flag `--no-confirm` omite prompts para CI/automatización
  - `validationCommands`:
    - `npx jest --config sdk/cli/jest.config.js --testPathPatterns="confirmation"` — tests unitarios pasan
    - `npx jest --config sdk/cli/test/jest-e2e.json --testPathPatterns="mcp-confirmation"` — tests E2E pasan
  - `dependencyDisposition`: none

#### GT-115

**Título:** Auto-fix de fallas arquitectónicas vía herramientas MCP

- **Objetivo:** Extender el set de herramientas MCP para permitir a los agentes de IA aplicar resoluciones automáticas (auto-fix) a las violaciones reportadas por los evaluadores de reglas de Evolith Core.
- **Cierre cuando:** Existan nuevas herramientas MCP bajo el esquema `evolith-auto-fix` que acepten un `rulesetId` o un reporte de fallo y apliquen las refactorizaciones requeridas.
- **Criterio de cierre:**
  - [x] Herramientas MCP de auto-fix implementadas (`evolith-auto-fix`)
  - [x] Aceptan `rulesetId` o array de violaciones como input
  - [x] Aplican refactorizaciones para tipos conocidos (domain-purity, hexagonal-boundaries, missing-domain-interface)
  - [x] Modo dry-run para preview antes de aplicar
  - [x] Generación de resumen con conteos applied/preview/failed/manual
- **Cerrado por:** `sdk/cli/src/infrastructure/mcp/tools/auto-fix.ts`, `sdk/cli/src/infrastructure/mcp/tools/auto-fix.spec.ts`, `sdk/cli/test/auto-fix.e2e-spec.ts`, `sdk/cli/src/infrastructure/mcp/tools/index.ts`
- **Evidencia de cierre:**
  - `closedAt`: 2026-06-16
  - `closureCommit`: ea2a3934cfcbebaf3b05e15538e4b5ac721b1b53
  - `evidence`: Herramienta MCP `evolith-auto-fix` acepta rulesetId y array de violaciones; soporta modo dry-run; aplica fixes para reglas domain-purity, hexagonal-boundaries, missing-domain-interface; genera resumen con conteos de fixes
  - `validationCommands`:
    - `npx jest --config sdk/cli/jest.config.js --testPathPatterns="auto-fix"` — tests unitarios pasan
    - `npx jest --config sdk/cli/test/jest-e2e.json --testPathPatterns="auto-fix"` — tests E2E pasan
  - `dependencyDisposition`: none
- **Referencias:** [Módulo de Herramientas MCP](../../../../packages/mcp-server/src/tools/tools.module.ts)

#### GT-116

**Título:** Eliminación de operaciones bloqueantes de I/O en la CLI

- **Objetivo:** Migrar operaciones asíncronas encadenadas o llamadas bloqueantes `*Sync` en validadores de AST e I/O de archivos en la CLI y Hooks para evitar bloquear el event loop en repositorios masivos.
- **Cierre cuando:** Los validadores críticos en rutas de CI y CLI no utilicen métodos `.readFileSync` ni `.readdirSync` en favor de `fs/promises` con manejo de concurrencia.
- **Criterio de cierre:**
  - [x] La interfaz IFileSystem provee métodos async para todas las operaciones de archivo
  - [x] Rutas críticas (sdlcStatus, validate) usan métodos async de IFileSystem
  - [x] validate.ts findCorePath migrado a async fs.promises.access
  - [x] Código no crítico de inicialización puede mantener llamadas sync por simplicidad
- **Cerrado por:** `sdk/cli/src/infrastructure/mcp/tools/validate.ts`, `packages/core-domain/src/domain/interfaces.ts`
- **Evidencia de cierre:**
  - `closedAt`: 2026-06-16
  - `closureCommit`: pending
  - `evidence`: Interfaz IFileSystem provee métodos async (readFile, writeFile, exists, readdir); rutas críticas de validación usan IFileSystem async; findCorePath migrado a fs.promises.access
  - `validationCommands`:
    - `npm run build --workspace sdk/cli` — compilación TypeScript pasa
    - `npm run test --workspace sdk/cli` — tests pasan
  - `dependencyDisposition`: none
- **Referencias:** [Interfaz IFileSystem](../../../../packages/core-domain/src/domain/interfaces.ts)


#### GT-19

**Título:** Migración hexagonal incremental de `core/`

- **Objetivo:** Disolver el god-layer `core/` (~17k líneas) incrementalmente: lógica pura → `domain/`, orquestación → `application/`, adapters (MCP, observabilidad, providers) → `infrastructure/`, dejando `core/` solo como composition root. Avanza oportunistamente con cada fase anterior — nunca como reescritura big-bang.
- **Evidencia actual:** ports de `domain` y adapters de infraestructura aún importan `NormalizedRule` desde `core/validators`, señal de ownership invertido.
- **Cierre cuando:** `core/` contiene solo DI/bootstrap; los boundaries de ESLint aplican reglas hexagonales estrictas (ver GT-17) sin excepciones.

#### GT-20

**Título:** Backfill de contenido de ADRs al estándar de autoría

- **Objetivo:** Completar las secciones añadidas como stubs por la estandarización de ADRs del 2026-06-10 (aproximadamente 697 marcadores en 162 archivos): Objetivo y Alcance, Opciones Consideradas, Evidencias y Criterios de Evaluación, Decisiones y Estándares Relacionados — más Vigilancia Tecnológica y Fuentes Actuales para ADRs de plataforma — según el [Estándar de Autoría de ADRs](../../../architecture/adrs/adr-authoring-standard.es.md). El backfill debe reconstruir con honestidad, nunca fabricar historia.
- **Cierre cuando:** ningún ADR contiene marcador de backfill `GT-20`; spot-check confirma calidad de contenido en los 10 ADRs de mayor tráfico.

#### GT-21

**Título:** Revisión de ubicación de ADRs Core centrados en herramientas

- **Objetivo:** Aplicar la prueba de fuego Core-vs-Plataforma del [Estándar de Autoría de ADRs](../../../architecture/adrs/adr-authoring-standard.es.md) a los ADRs Core centrados en herramientas — candidatos: 0001 (Nx), 0005 (CodeQL), 0006/0046 (Dapr), 0014 (Redis), 0030 (Kong vs NestJS), 0069 (MCP). Para cada uno: mantener en core reescrito como principio agnóstico, reubicar a una categoría de plataforma, o dividir (ADR Core agnóstico + ADR de Plataforma con la elección de herramienta). Toda reubicación debe corregir todos los enlaces entrantes en el mismo cambio.
- **Cierre cuando:** todo ADR Core pasa la prueba de fuego; los ADRs reubicados llevan la nota de reubicación; sin enlaces rotos.

#### GT-22

**Título:** Esquema de unicidad de IDs de ADR

- **Objetivo:** Resolver las colisiones de IDs entre categorías (core/0044–0048 vs nodejs/0044–0048; core/0069–0072 vs dotnet/0069–0072): decidir entre renumeración global (alto radio de impacto en enlaces) o citación calificada por categoría formalizada (`core/ADR-0044`), y actualizar `adr-matrix` y rulesets en consecuencia. El Estándar de Autoría manda provisionalmente la citación calificada por categoría.
- **Cierre cuando:** la decisión queda registrada (ADR o actualización del estándar) y `adr-matrix` refleja identidades sin ambigüedad.

#### GT-23
**Título:** Relleno de traducción al español del corpus de referencia.

- **Objetivo:** todos los documentos bajo `referencia/` y `conjuntos de reglas/` son legibles en español sin marcadores de posición esqueleto declarados.
- **Objetivo:** Traducir los 76 archivos actualmente marcados como "esqueleto inicial / pendiente de traduccion [completado]", concentrados en `governance/standards/ai-augmented/*`, `knowledge/architecture-intelligence/patterns` y organismos ADR seleccionados. El inglés sigue siendo la fuente decisiva; Estructura de cabecera de espejos españoles. Los esqueletos consumidos por herramientas bajo `.harness/` y `.bmad-core/` permanecen fuera del alcance a menos que se promocionen al corpus de referencia.
- **Hecho cuando:** `grep -rl "pendiente de traduccion [completado]" reference/rulesets/` devuelve cero archivos y `check-bilingual-parity.mjs` pasa.
- **Referencias:** [Índice bilingüe](../../../navigation/BILINGUAL_INDEX.md) · [Glosario de terminología](../../../../.harness/scripts/bilingual-terminology-glossary.md)
#### GT-24

**Título:** Ejecutar las migraciones documentales declaradas

- **Meta:** que la ubicación física de cada documento coincida con su clasificación taxonómica declarada — sin más notas de "migración pendiente".
- **Objetivo:** Ejecutar las migraciones que los hubs ya declaran: (1) mover los documentos de visión/estrategia/posicionamiento de la suite desde la ruta legacy `governance/standards/vision/` a sus áreas de `product-suite/`; (2) migrar la documentación de Smart CLI y MCP Services a `reference/products/`; (3) promover el [Modelo de Abstracción de Proveedores y Plugins](./evolith-provider-abstraction-plugin-model.es.md) a principio de arquitectura Core; (4) mover las [Interfaces Técnicas del Tracker](./sdlc-tracker-technical-interfaces.es.md) al diseño de producto del Tracker. Cada movimiento deja un stub de compatibilidad en la ruta antigua y corrige todos los enlaces entrantes en el mismo cambio.
- **Cierre cuando:** no queda ningún marcador de "migration pending / migración pendiente" en `reference/` ni `sdk/`; `validate-docs.mjs` pasa.
- **Referencias:** [Hub de Product Suite](../../../product-suite/README.es.md) · [Hub de Diseños de Producto](../../../products/README.es.md) · [Taxonomía Documental](../../../documentation-taxonomy.es.md)

#### GT-25

**Título:** Primeros perfiles de proveedor para las categorías de plataforma

- **Meta:** que el dominio de Guías de Plataforma deje de ser una promesa vacía — cada categoría planificada tiene al menos un perfil de proveedor real.
- **Objetivo:** Redactar perfiles de proveedor siguiendo el checklist de contenido requerido del [Hub de Plataformas](../../../platforms/README.es.md) (capacidades, limitaciones, licencias, aislamiento de tenants, mapeo de adapters, reemplazabilidad, fuentes actuales), empezando por las categorías de las que los productos ya dependen: `scm/` (GitHub), `ci-cd/` (GitHub Actions), `observability/` (stack OTel), `security/` (CodeQL/Trivy).
- **Cierre cuando:** cada directorio de categoría existe con ≥1 perfil (EN+ES) enlazado desde la tabla del hub de plataformas.
- **Referencias:** [Hub de Plataformas](../../../platforms/README.es.md) · [Catálogo de Herramientas Validadas](../../../platforms/validated-tool-catalog.es.md)

#### GT-26

**Título:** Playbook de Zero-Downtime Release

- **Meta:** que la Fase 5 del SDLC enlace un runbook operativo real en lugar de un marcador "Próximamente".
- **Objetivo:** Escribir el playbook de despliegues blue-green y canary anunciado en la tabla de la Fase 5 del [Centro de Gobernanza SDLC](../../sdlc/README.es.md) (EN+ES), cubriendo restricciones de zero-downtime, disparadores de rollback y checkpoints de observabilidad, y enlazarlo desde la tabla de artefactos de la Fase 5.
- **Cierre cuando:** la fila de la Fase 5 enlaza el playbook y no queda ningún marcador "Coming Soon / Próximamente" en el centro SDLC.
- **Referencias:** [Centro de Gobernanza SDLC](../../sdlc/README.es.md) · [Quality Gates](../../sdlc/quality-gates.es.md)

### Integridad del Tracking

#### GT-27

**Título:** Consistencia semántica del tracking canónico

- **Gap:** El tablero canónico contenía un GT-19 duplicado, trabajo completado en la cola activa, estados EN/ES contradictorios y totales que ya no coincidían con los registros detallados.
- **Propósito:** Hacer que la priorización, el reporting y las decisiones de inversión dependan de una única superficie confiable de gobernanza de producto.
- **Evidencia de cierre:** El commit `a6e4915` normalizó IDs únicos, estados activos, orden, metadata EN/ES y totales. La validación documental pasó para 745 archivos Markdown, la paridad estructural bilingüe pasó y una auditoría semántica confirmó 36 filas únicas de dashboard y 36 fichas correspondientes en cada idioma.
- **Alcance cerrado:** El tablero canónico es internamente consistente y los completados quedan fuera de la cola activa. La prevención de reincidencias, los totales generados y la automatización de inventarios del repositorio pertenecen explícitamente a GT-35.
- **Referencias:** [Evaluación de Madurez](./maturity-assessment.es.md) · [Taxonomía Documental](../../../documentation-taxonomy.es.md)

#### GT-35

**Título:** Inventarios automatizados y validación del tracking

- **Gap:** Los inventarios del repositorio y los totales de salud de producto se mantienen manualmente y quedan obsoletos. Por ejemplo, el snapshot histórico reporta 14 schemas mientras el árbol actual contiene 17, y no puede detectar IDs GT duplicados ni estados bilingües divergentes.
- **Propósito:** Generar evidencia de decisión desde el repositorio en vez de depender de afirmaciones sincronizadas manualmente.
- **Evidencia actual / ejemplo:** La validación documental comprueba enlaces, anchors, encoding y diagramas, pero no valida la semántica del tablero ni regenera inventarios de rulesets, ADRs, traducciones e implementación.
- **Cierre cuando:** un comando de validación falla ante IDs duplicados, fichas faltantes, metadata EN/ES diferente, completados en la cola activa, totales incorrectos o inventarios obsoletos; su resumen generado se referencia desde el reporte de madurez.
- **Referencias:** [Hub de Rulesets](../../../../rulesets/README.es.md) · [Evaluación de Madurez](./maturity-assessment.es.md) · [Tracking de Gaps](./gap-tracking.es.md)

### Línea Base de Release y Ejecución de Políticas

#### GT-28

**Título:** Restaurar la línea base de build, tests y smoke del CLI

- **Gap:** El refactor del CLI había roto su baseline ejecutable de release: lint pasaba, pero compilación, suites unitarias y smoke MCP no.
- **Propósito:** Restablecer una línea base ejecutable de release antes de tratar capacidades de CLI, MCP o policy engine como evidencia de producto completado.
- **Evidencia actual / ejemplo:** Cerrado el 2026-06-12. `npm run lint` y `npm run build` pasan; 70 suites unitarias pasan con 1,237 tests; 12 suites E2E pasan con 110 tests; `npm run mcp:smoke` pasa inicialización, discovery, métricas y evaluación de gates mediante stdio y Streamable HTTP.
- **Evidencia de reapertura (2026-06-13):** El CI actual de `main` falla antes de los tests porque `npm ci` del workspace dispara el script prepare raíz de Husky sin instalar la dependencia raíz. La cache también apunta a un `sdk/cli/package-lock.json` ausente; el workspace local verde no es reproducible desde un checkout limpio.
- **Verificación de reapertura (2026-06-13):** Los runs [SDK CLI CI 27467157131](https://github.com/beyondnetcode/evolith_arch32/actions/runs/27467157131) y [CI/CD 27467157129](https://github.com/beyondnetcode/evolith_arch32/actions/runs/27467157129) confirmaron ambos bloqueos antes de ejecutar las suites: la cache no resolvía `sdk/cli/package-lock.json` y el `prepare` raíz fallaba con `husky: not found`.
- **Cierre cuando:** desde un checkout limpio pasan lint, build, tests unitarios y smoke MCP stdio/HTTP; ninguna ruta crítica de release se satisface solo con tests omitidos.
- **Evidencia de cierre:** El commit `84ec879` trasladó la instalación del workspace y la cache npm al lockfile raíz canónico, restauró el comando `test:cov` e hizo bloqueante el smoke MCP en CI. Un clon sin hardlinks de ese commit pasó `npm ci` raíz, lint, build, 64 suites unitarias con 1,087 tests, 14 suites E2E con 121 tests y smoke MCP por stdio y Streamable HTTP. La regresión separada del umbral de cobertura del 80%, descubierta al desbloquear la instalación, se registra en GT-48.
- **Referencias:** [Smart CLI](../../../../sdk/cli/README.es.md) · [ADR-0073 Contrato Unificado de Salida del CLI](../../../architecture/adrs/core/0073-unified-cli-output-contract.es.md) · [Quality Gates](../../sdlc/quality-gates.es.md)

#### GT-29

**Título:** Paridad de policy engines Native y OPA

- **Gap:** R-25 exige cada regla arquitectónica en ambos evaluadores, pero la política de arquitectura OPA aún contiene rutas placeholder y el evaluador Native no cubre todas las categorías F1. Por ello todavía no se puede confiar en que inputs equivalentes produzcan veredictos equivalentes.
- **Propósito:** Convertir los rulesets en un contrato de gobernanza real y portable, no en dos implementaciones parcialmente superpuestas.
- **Evidencia actual / ejemplo:** F1-R09 a F1-R11 tienen implementaciones Rego, mientras la cobertura de dependency injection, static analysis y separation of concerns sigue incompleta entre engines. F1-R10 también declara enforcement basado en AST mientras su ruta Rego actual usa coincidencia textual.
- **Cierre cuando:** una matriz de cobertura generada mapea cada regla arquitectónica activa a implementaciones Native y OPA; tests de equivalencia comparan findings y severidad para fixtures conformes y no conformes; el engine OPA/WASM empaquetado pasa el mismo gate de release.
- **Referencias:** [Reglas Globales R-25](../../../../.harness/rules/global-rules.es.md) · [Ruleset F1](../../../architecture/topologies/progressive-axis/modular-monolith/modular-monolith.rules.json) · [Política de Arquitectura OPA](../../../architecture/topologies/progressive-axis/modular-monolith/modular-monolith.rego)

#### GT-36

**Título:** Política de cobertura lingüística para reglas machine-readable

- **Gap:** El repositorio tiene 27 rulesets en inglés pero solo 3 rulesets JSON en español, sin una decisión explícita sobre si las reglas consumidas por máquinas son artefactos canónicos en inglés o requieren contrapartes bilingües completas.
- **Propósito:** Preservar un único significado autoritativo de las políticas y hacer explícitas y exigibles sus obligaciones lingüísticas.
- **Evidencia actual / ejemplo:** Los documentos narrativos de referencia exigen paridad bilingüe, pero la localización de rulesets es parcial y su frontera de excepción no está codificada en la validación.
- **Cierre cuando:** la gobernanza declara paridad JSON bilingüe completa o una exención explícita de canon inglés con descripciones legibles localizadas; la validación exige el modelo seleccionado y reporta artefactos no cubiertos.
- **Referencias:** [Reglas Globales](../../../../.harness/rules/global-rules.es.md) · [Hub de Rulesets](../../../../rulesets/README.es.md) · [Glosario de Terminología](../../../../.harness/scripts/bilingual-terminology-glossary.es.md)

### Prueba de Producto

#### GT-33

**Título:** Scoring de madurez respaldado por evidencia

- **Gap:** Los scores actuales de madurez pueden confundir una capacidad diseñada con una capacidad implementada, validada, adoptada o gestionada operacionalmente.
- **Propósito:** Hacer que el reporte de madurez sirva para decisiones de inversión y release vinculando cada score con evidencia observable.
- **Evidencia actual / ejemplo:** Tracker tiene documentación extensa de diseño pero ninguna implementación ejecutable, mientras la línea base histórica del CLI reporta gates de release verdes que actualmente fallan bajo GT-28.
- **Cierre cuando:** cada capacidad puntuada declara un estado como Visionada, Diseñada, Prototipada, Implementada, Validada o Escalada; cada estado no visionario enlaza evidencia calificadora; los scores agregados se recalculan desde esos estados y exponen incertidumbre.
- **Referencias:** [Evaluación de Madurez](./maturity-assessment.es.md) · [Métricas y Madurez de Capacidades](../../../product-suite/vision/evolith-product-vision-master.es.md#11-métricas-y-madurez-de-capacidades)

#### GT-34

**Título:** Repriorización del roadmap alrededor de la prueba de gobernanza

- **Gap:** El roadmap adelanta preocupaciones amplias de plataforma como abstracción multi-cloud, Dapr y arquitectura zero-trust antes de que el kernel de gobernanza y el Producto Mínimo Comprobable produzcan evidencia de cliente y operación.
- **Propósito:** Secuenciar la inversión alrededor de la tesis central y postergar opcionalidad costosa hasta que la evidencia la justifique.
- **Evidencia actual / ejemplo:** El próximo horizonte de planificación debe priorizar línea base de release, kernel del Tracker, vertical slice y aprendizaje del piloto; el runtime distribuido y la amplitud de proveedores deben tener disparadores explícitos de evidencia.
- **Cierre cuando:** el roadmap ordena el trabajo como línea base → kernel de gobernanza → vertical slice → piloto controlado → escala; las tecnologías diferidas nombran disparadores medibles de adopción, carga, compliance o presión de proveedores; las dependencias mapean a este tablero.
- **Referencias:** [Roadmap de Estrategia Evolutiva](./evolutionary-strategy-roadmap.es.md) · [Producto Mínimo Comprobable](../../../product-suite/vision/evolith-product-vision-master.es.md#10-producto-mínimo-comprobable) · [Framework de Validación Estratégica y Composición](./evolith-strategic-validation-and-composition-framework.es.md)

#### GT-37

**Título:** Cierre semántico de gaps condicionado por evidencia

- **Gap:** La validación estructural del tracking puede reportar todos los gaps como completados aunque existan criterios de cierre sin marcar, evidencia obsoleta o contradictoria, o una dependencia satisfecha solo mediante mocks.
- **Propósito:** Hacer de `COMPLETADO` una afirmación semántica defendible y respaldada por evidencia vigente y reproducible, no solo un valor consistente dentro de una tabla.
- **Evidencia actual / ejemplo:** El validador semántico, el registro canónico de cierres y los tests de regresión están activos. Los criterios de GT-01 y GT-06 fueron resueltos explícitamente, mientras GT-15 volvió a `DIFERIDO` porque su mock en memoria no es evidencia autoritativa de Tracker.
- **Cierre cuando:** la validación rechaza `COMPLETADO` sin criterios de cierre satisfechos, evidencia fechada, disposición de dependencias, comandos de validación reproducibles y referencia de commit o release; las excepciones documentadas son explícitas, tienen responsable y vencimiento.
- **Evidencia de cierre:** El commit `f3c8520` incorporó R-26, el estándar bilingüe de cierre, 32 registros históricos, resolución de commits y artefactos, chequeos de disposición de dependencias, rechazo de criterios sin marcar y cuatro tests de regresión. El mismo cambio corrigió el falso positivo de GT-15.
- **Referencias:** [Estándar de Evidencia para Cierre de Gaps](./gap-closure-evidence-standard.es.md) · [Registro de Cierres](./gap-closure-evidence.json) · [Validador de Tracking](../../../../.harness/scripts/ci/08-validate-tracking.mjs) · [Tracking de Gaps](./gap-tracking.es.md)

#### GT-41

**Título:** Reconciliación automática de madurez

- **Gap:** Los reportes de madurez, inventarios y el tablero vivo de gaps pueden divergir porque sus estados y totales se mantienen como afirmaciones narrativas separadas.
- **Propósito:** Mantener decisiones de prioridad e inversión alineadas con evidencia actual del repositorio, releases y producto.
- **Evidencia actual / ejemplo:** La evaluación de madurez aún referencia gaps abiertos y conteos reemplazados mientras el tablero reporta su cierre, creando visiones contradictorias de readiness.
- **Límite de ownership:** Core reconcilia únicamente la evidencia que posee. La madurez de Tracker y Product Suite permanece como input externo y nunca debe inflar el score de Core.
- **Cierre cuando:** un reporte generado o reconciliado consume el tablero canónico de Core, inventarios y evidencia de tests y releases; expone timestamps de vigencia, separa Core de la madurez externa de productos y falla ante estados, conteos o enlaces de evidencia obsoletos.
- **Evidencia de cierre:** El commit Core `154aadf` incorporó reconciliación machine-readable generada, tests de regresión, checks de drift en pre-commit y CI, y eliminó los totales vigentes mantenidos manualmente en la evaluación narrativa. La madurez de productos externos se excluye explícitamente.
- **Evidencia de reapertura (2026-06-13):** El snapshot generado reporta todos los gaps completos mientras cuatro workflows del mismo commit de `main` están rojos. Registra nombres de comandos, no resultados de tests, release, npm, suites omitidas o CI, y la evaluación narrativa conserva estados de capacidad reemplazados.
- **Verificación de reapertura (2026-06-13):** El run [Documentation Validation 27467157149](https://github.com/beyondnetcode/evolith_arch32/actions/runs/27467157149) validó el corpus y la paridad bilingüe, pero la reconciliación semántica falló porque el checkout superficial no contenía los commits de cierre registrados.
- **Evidencia final de cierre:** El commit `e4fa0e3` incorporó un registro de evidencia runtime con control de frescura, resultados explícitos `PASS`/`BLOCKED`, trazabilidad a workflow y commit, ownership de bloqueos por gaps activos, tests de regresión y checkout con historia completa. El run [Documentation Validation 27470122212](https://github.com/beyondnetcode/evolith_arch32/actions/runs/27470122212) pasó documentación, paridad bilingüe, tracking semántico, reconciliación de madurez y validación de contratos machine-readable.
- **Referencias:** [Evaluación de Madurez](./maturity-assessment.es.md) · [Reconciliación de Madurez](./maturity-reconciliation.json) · [Resumen de Inventario](./inventory-summary.es.md) · [Validador de Reconciliación](../../../../.harness/scripts/ci/09-reconcile-maturity.mjs)

#### GT-42

**Título:** Conformidad contractual entre repositorios

- **Gap:** Core, CLI y Tracker pueden evolucionar sus contratos de evidencia y decisión independientemente sin probar compatibilidad entre productores y consumidores.
- **Propósito:** Asegurar que las evaluaciones técnicas sigan siendo consumibles por el Tracker autoritativo durante releases independientes de los repositorios.
- **Evidencia actual / ejemplo:** Existen ADRs contractuales y schemas JSON, pero no una matriz de compatibilidad entre repositorios ni una suite CI que ejecute juntas las versiones soportadas de productores y consumidores.
- **Cierre cuando:** schemas versionados compartidos o referencias contractuales fijadas definen la política de compatibilidad; contract tests de productor y consumidor se ejecutan entre Core, CLI y Tracker; CI verifica la matriz de últimas versiones soportadas y bloquea cambios incompatibles.
- **Evidencia de cierre:** El commit Core `154aadf` incorporó el manifiesto versionado, digests inmutables de schemas, fixtures, tests de conformidad y enforcement en CI. El commit Tracker `4256e7b` fijó el contrato soportado y agregó su workflow consumidor contra Core.
- **Referencias:** [ADR-0073 Contrato Unificado de Salida del CLI](../../../architecture/adrs/core/0073-unified-cli-output-contract.es.md) · [Manifiesto Contractual](../../../../rulesets/contracts/evolith-machine-contracts.json) · [Política de Conformidad](../../../../rulesets/contracts/README.es.md) · [Validador de Conformidad](../../../../.harness/scripts/ci/10-validate-contract-conformance.mjs)

#### GT-44

**Título:** Integridad determinista del pipeline de release

- **Gap:** Los workflows aplican checks de versión exclusivos de release a merges ordinarios, referencian `pkg.bin.evolith` aunque el paquete expone `smart-cli`, descargan artefactos binarios que nunca se suben y ocultan un fallo del smoke de init con `|| true`.
- **Propósito:** Hacer los releases npm y binarios reproducibles, bloqueantes y confiables.
- **Evidencia actual / ejemplo:** El run [27451600153](https://github.com/beyondnetcode/evolith_arch32/actions/runs/27451600153) falló en `4a30a85`; npm confirma que `@evolith/smart-cli@1.1.0` existe, pero el camino de release actual no está saludable.
- **Cierre cuando:** los checks de release respetan el evento; la identidad del paquete y binarios proviene de `package.json`; cada target se sube, descarga, ejecuta y adjunta; los smoke failures no se ignoran; la notificación tiene permisos válidos o degrada con seguridad.
- **Evidencia de cierre:** El commit `26f6a18` endurece ambos pipelines del CLI contra cada defecto: (1) `verify-git-tag.mjs` y `verify-version-log.mjs` respetan el evento — omiten los merges ordinarios a `main` y solo exigen un tag `docs-v*` y entrada en el version-log cuando HEAD es realmente un release de docs, detectado por el mensaje del merge commit o un tag `docs-v*` en HEAD; (2) la identidad del binario se deriva de `package.json` tanto en `sdk-cli-ci.yml` (reemplazando el lookup obsoleto `pkg.bin.evolith` que resolvía a `undefined`) como en el paso `Verify Package Integrity` del release; (3) `pkg` queda fijado a `5.8.1`, los binarios se renombran de forma determinista por target, se suben como artefactos `binaries-<target>`, se ejecutan en una matriz de smoke por-OS y se adjuntan vía una descarga `binaries-*` que verifica la presencia de los tres; (4) los pasos de smoke de init y versión ya no enmascaran fallos con `|| true`; (5) el notificador de fallos tiene `issues: write` y envuelve la creación del issue en `try/catch` para degradar con seguridad.
- **Verificación local (2026-06-13):** `GITHUB_REF_NAME=main GITHUB_EVENT_NAME=push node .harness/scripts/verify-git-tag.mjs` y su equivalente de version-log salen con `0` mostrando "Ordinary merge to main … skipping"; ambos YAML de workflow parsean; la derivación de identidad de `package.json` resuelve a `[./dist/main.js]`. El run de release verde definitivo es observable en el próximo push que dispare release a `main`. Estado: `COMPLETADO`.
- **Referencias:** [Workflow de Release del CLI](../../../../.github/workflows/sdk-cli-release.yml) · [Workflow CI del CLI](../../../../.github/workflows/sdk-cli-ci.yml) · [Verificador de Git Tag](../../../../.harness/scripts/verify-git-tag.mjs) · [Verificador de Version Log](../../../../.harness/scripts/verify-version-log.mjs)

#### GT-45

**Título:** Suite de conformidad de transporte y tools MCP

- **Gap:** El smoke de Streamable HTTP está activo, pero suites de HTTP, API key, routing de mensajes y múltiples tools MCP permanecen deshabilitadas con `describe.skip`; algunas aún apuntan al transporte mínimo eliminado.
- **Propósito:** Probar exposición consistente de Core por stdio y Streamable HTTP, incluyendo autenticación, errores, resources, prompts y tools registradas.
- **Cierre cuando:** tests obsoletos se eliminan o reescriben; ninguna suite MCP relevante para release está omitida; casos negativos de protocolo corren en CI; tools y schemas runtime coinciden con el inventario generado.
- **Evidencia de cierre:** El commit `b07460d` eliminó 547 líneas de tests obsoletos del transporte mínimo, activó 47 tests de tools de agentes/arquitectura/SDLC, agregó un gate de conformidad de schemas runtime y ausencia de suites omitidas, corrigió la inyección runtime de filesystem/config parser, y validó 29 casos E2E MCP más smoke stdio/Streamable HTTP para 21 tools, 7 resources y 7 prompts.
- **Verificación post-push (2026-06-13):** Los workflows rojos del commit de cierre fallan durante checkout, cache o instalación, antes de ejecutar la conformidad MCP. No existe evidencia contradictoria con las suites locales de cierre; los bloqueos de reproducibilidad y release permanecen asignados a GT-28, GT-41 y GT-44. Estado: `COMPLETADO`.
- **Referencias:** [Punto de Entrada del Servidor MCP](../../../../packages/mcp-server/src/main.ts) · [Tests E2E MCP](../../../../sdk/cli/test/e2e/mcp-e2e.test.ts)

#### GT-46

**Título:** Límite de ownership del servicio HTTP de Core

- **Gap:** `smart-cli api` expone un mock en memoria de “Evolith Tracker Assistant” con CORS irrestricto y sin contrato gobernado de Core, aunque este repositorio solo debe contener servicios que exponen Core.
- **Propósito:** Evitar que comportamiento de producto Tracker se filtre en la distribución Core, preservando una API stateless válida de Core si esa superficie se conserva.
- **Cierre cuando:** una decisión explícita elimina la API mock o la reemplaza por un contrato documentado, autenticado y stateless de exposición de Core; CORS es configurable y los endpoints retenidos tienen schemas y tests.
- **Evidencia de cierre:** El commit `b07460d` eliminó el comando `api`, el mock Tracker Assistant, sesiones chat en memoria, controller, módulo, repositorio e interfaces de dominio. El servicio de red retenido es la exposición MCP Streamable HTTP autenticada y cubierta por contract tests de Evolith Core.
- **Verificación post-push (2026-06-13):** La revisión de los fallos de CI no identifica regresiones ni una reintroducción de superficies Tracker en Core; todos ocurren antes de la validación funcional. El límite de ownership implementado permanece vigente. Estado: `COMPLETADO`.
- **Referencias:** [Composition Root del CLI](../../../../sdk/cli/src/app.module.ts) · [Punto de Entrada del Gateway MCP](../../../../packages/mcp-server/src/main.ts)

#### GT-47

**Título:** Sincronización de documentación de producto y release

- **Gap:** Las docs de Smart CLI anuncian `0.0.3-beta`, MCP Services es un placeholder y el reporte de madurez dice que trabajo ya completado de transporte, contratos, gates y publicación continúa faltando.
- **Propósito:** Mantener la narrativa pública sincronizada con las superficies instalables Core/CLI/MCP.
- **Cierre cuando:** un inventario generado suministra versión del paquete, comandos, tools, resources, prompts, transportes, schemas y evidencia de tests a docs EN/ES y madurez; CI rechaza drift y páginas placeholder.
- **Evidencia de cierre:** El commit `38dfc98` añade `generate-product-inventory.mjs`, que deriva la superficie instalable (`@evolith/smart-cli@1.1.0`, bin, 18 comandos, 21 tools MCP, 7 resources, 7 prompts, 2 transportes, 17 schemas, cobertura live) desde las fuentes canónicas del CLI hacia un [Inventario de Superficie del Producto](../../../products/smart-cli/product-inventory.es.md) generado EN/ES. El README de Smart CLI (EN/ES) se actualizó de `0.0.3-beta`/88.7% a `1.1.0` con cobertura vigente, y el placeholder de MCP Services (EN/ES) se reemplazó con la superficie real de tools/resources/prompts/transportes. `validate-product-docs.mjs` rechaza páginas placeholder, drift de versión e inventario obsoleto; corre en el pre-commit hook y el workflow de docs en CI.
- **Verificación local (2026-06-14):** `generate-product-inventory.mjs --check`, `validate-product-docs.mjs`, `validate-docs.mjs` (827 archivos) y la paridad bilingüe pasan. Estado: `COMPLETADO`.
- **Referencias:** [Producto Smart CLI](../../../products/smart-cli/README.es.md) · [Producto MCP Services](../../../products/mcp-services/README.es.md) · [Inventario de Superficie del Producto](../../../products/smart-cli/product-inventory.es.md)

#### GT-48

**Título:** Restaurar el umbral normativo de cobertura del CLI

- **Gap:** Al restaurar la instalación limpia del workspace, el gate bloqueante de cobertura expuso 66.14% de statements frente al umbral normativo de 80%. La evidencia histórica de madurez todavía afirma 88.70%, por lo que el resultado ejecutable y la narrativa de producto divergen.
- **Propósito:** Recuperar protección significativa contra regresiones sin reducir el umbral aceptado ni excluir código productivo solo para mejorar la métrica.
- **Evidencia actual / ejemplo:** `npm run test:cov --workspace @evolith/smart-cli -- --coverageReporters=json-summary` pasa 1,087 tests, pero reporta 4,083 de 6,173 statements cubiertos. El gate de CI ahora lee `.total.statements.pct`, alineado con el contrato del phase gate.
- **Cierre cuando:** la cobertura de statements alcanza al menos 80% desde un checkout limpio; los nuevos tests priorizan validators críticos de release, handlers de políticas, comandos CLI, rutas runtime MCP y providers de filesystem; CI bloquea regresiones y la evidencia de madurez se regenera desde el reporte vigente.
- **Evidencia de cierre:** El commit `48e1d90` sube la cobertura de statements de 66.14% a **80.65%** (4.979 / 6.173) con 1.206 tests unitarios verdes, apuntando exactamente a las superficies nombradas. Las dos suites de servicio rotas por la eliminación del service locator en [GT-04](#gt-04) se revivieron con inyección por constructor (MoscowPrioritizationService 2,58% → 98%, ArchitectureDriftService 3,78% → 94%); los siete native rule handlers obtuvieron specs (~93% cada uno); el OPA input builder (28% → 91%), el disk ruleset repository (11% → 90%) y ambos filesystem providers (Mock 0% → 96%, Node 100%) quedan cubiertos. El gate de CI en `sdk-cli-ci.yml` lee `.total.statements.pct` y bloquea por debajo de 80%; la aplicación durable por-run en `jest.config.js` sigue rastreada por [GT-50](#gt-50).
- **Verificación CI (2026-06-13):** el job Unit Tests del [run 27479301558](https://github.com/beyondnetcode/evolith_arch32/actions/runs/27479301558) está verde, el gate bloqueante de cobertura imprime `Statement coverage: 80.65%` y Package Integrity pasa. El mismo commit corrigió el reporter del gate para que emita el `json-summary` que el chequeo de umbral parsea. Estado: `COMPLETADO`.
- **Referencias:** [Workflow CI del CLI](../../../../.github/workflows/sdk-cli-ci.yml) · [Configuración Jest](../../../../sdk/cli/jest.config.js) · [Estrategia de Testing](../../../products/smart-cli/docs/planning/testing-strategy.md) · [GT-04](#gt-04) · [GT-50](#gt-50)

#### GT-49

**Título:** Activar el modo estricto de TypeScript y puertos de filesystem tipados

- **Gap:** El CLI compila con `strictNullChecks`, `noImplicitAny` y `strictBindCallApply` deshabilitados (`sdk/cli/tsconfig.json`), y quedan 78 anotaciones `: any` en `src`. Dieciséis son parámetros `fs: any` aunque ya existe un puerto `IFileSystem` consumido en otros módulos, por lo que la frontera tipada se evade en la capa de comandos.
- **Propósito:** Hacer que el compilador imponga la disciplina de null-safety y de puertos tipados que el pilar de Mantenibilidad ya declara como `Validated`, eliminando una clase de defectos latentes que la configuración actual oculta.
- **Evidencia actual / ejemplo:** `adr.command.ts` y `standards.command.ts` declaran handlers privados como `fs: any`; `tsconfig.json:19-21` apaga los chequeos de null estricto e implicit-any; ESLint no habilita `@typescript-eslint/no-explicit-any`.
- **Cierre cuando:** el modo estricto está activado (de forma incremental si es necesario), los parámetros `fs: any` están tipados contra `IFileSystem`, los `: any` restantes están tipados o justificados con una supresión en línea, y el build permanece verde bajo la configuración endurecida.
- **Evidencia de cierre:** El commit `398729d` pone `strictNullChecks`, `noImplicitAny` y `strictBindCallApply` en `true` en `tsconfig.json` — los overrides explícitos en `false` antes neutralizaban incluso una invocación `--strict`. Los 10 errores de tipo resultantes quedan resueltos: los 16 parámetros `fs: any` están tipados contra `IFileSystem` (comandos adr/standards y los use cases de la capa de aplicación), más un `canHandle` con boolean estricto, un `status` opcional en `updateADR`, encoding unificado en `FileReadOptions`/`FileWriteOptions`, null-safety en el filesystem/watcher MCP, un target de decorador acotado y defaults de prompt con coalescencia de null. `@typescript-eslint/no-explicit-any` queda activado como warning para visibilizar nuevos `any`; las ocurrencias restantes están en fronteras genuinamente dinámicas (varargs de logger, payloads OPA/JSON, datos de catálogo).
- **Verificación local (2026-06-13):** `npx tsc --noEmit` está limpio bajo la configuración endurecida; `npm run build`, 1.206 tests unitarios y 121 E2E pasan; lint reporta 0 errores. Estado: `COMPLETADO`.
- **Referencias:** [tsconfig del CLI](../../../../sdk/cli/tsconfig.json) · [Configuración ESLint](../../../../sdk/cli/.eslintrc.js) · [ADR-0019 Patrones de Diseño Táctico](../../../architecture/adrs/core/0019-tactical-design-patterns-future-proofing.md)

#### GT-50

**Título:** Aplicar umbrales de cobertura en la configuración de Jest

- **Gap:** El umbral normativo de 80% de statements se impone únicamente con un paso Bash en CI (`sdk-cli-ci.yml`), mientras que `jest.config.js` no declara ningún `coverageThreshold`. Por lo tanto, un `npm test` local nunca falla por cobertura y las regresiones aparecen solo después del push.
- **Propósito:** Hacer que el contrato de cobertura sea exigible en el punto de cambio y no exclusivamente en CI, cerrando el "split-brain" entre el runner y el pipeline.
- **Cierre cuando:** `jest.config.js` declara un `coverageThreshold` alineado con el objetivo normativo (idealmente ratchets por directorio que impidan regresiones silenciosas), el chequeo de CI y la configuración de Jest coinciden en el umbral, y el comando de cobertura local falla ante una regresión. Coordinar el número absoluto con [GT-48](#gt-48).
- **Evidencia de cierre:** El commit `040ea7f` añade un `coverageThreshold` global a `jest.config.js` — `statements: 80` (idéntico al gate bash de `sdk-cli-ci.yml`), `lines: 80`, `functions: 75`, `branches: 67` — de modo que `npm run test:cov` ahora falla localmente ante una regresión y no solo tras el push. Los umbrales quedan en o justo por debajo de los pisos restaurados por [GT-48](#gt-48) (80,65% statements, 81,47% líneas, 76,36% funciones, 68,87% branches).
- **Verificación local (2026-06-14):** `npm run test:cov` pasa 1.206 tests y reporta cobertura por encima de cada umbral; Jest sale con 0. Una caída por debajo de cualquier piso ahora falla el comando. Estado: `COMPLETADO`.
- **Referencias:** [Configuración Jest](../../../../sdk/cli/jest.config.js) · [Workflow CI del CLI](../../../../.github/workflows/sdk-cli-ci.yml) · [GT-48](#gt-48)

#### GT-51

**Título:** Validación de evidencia de gate Build-versus-Compose

- **Gap:** La Visión de Producto hace obligatorio el análisis Build-versus-Compose como evidencia del gate de Business Sign-Off (visión §5.3), pero la evaluación de gates de Core no tiene ningún tipo de evidencia ni validator para ello. Los chequeos de gate siguen siendo más estrechos de lo que exige la visión.
- **Propósito:** Alinear la evidencia de gate ejecutable de Core con el requisito de Discovery no negociable de la visión, para que una disposición gobernada (Adopt/Embed/Integrate/Extend/Build/Reject) sea auditable y no implícita.
- **Evidencia actual / ejemplo:** la visión §5.3 enumera alternativas, disposición, costo a tres años, licenciamiento, aislamiento de tenant y reemplazabilidad de proveedor como evidencia requerida; ningún esquema `GateEvidence` ni validator de phase-gate los modela actualmente.
- **Cierre cuando:** existe un esquema de evidencia Build-versus-Compose, el validator de phase-gate verifica su presencia y contenido para el gate de Business Sign-Off, y las superficies CLI/MCP exponen el resultado con el envelope de ADR-0073.
- **Evidencia de cierre:** El commit `54386a3` añade `rulesets/schema/build-vs-compose.schema.json`, modelando cada campo de §5.3 — alternativas evaluadas, disposición gobernada Adopt/Embed/Integrate/Extend/Build/Reject, costo a tres años, licenciamiento, aislamiento de tenant/propiedad de datos, reemplazabilidad de proveedor, requisitos de PoC y una justificación nativa condicionalmente requerida cuando la disposición es `Build`. El gate de Business Sign-Off (Fase 1) en `phase-gates.rules.json` lo lista ahora como evidencia mandatoria, y el validator de phase-gate lo mapea a `.evolith/build-vs-compose.json` y valida presencia **y** contenido vía Ajv — expuesto a través del envelope de gate-evidence de ADR-0073 en el CLI (`gate evaluate`) y la tool MCP `evolith-gate-evaluate`. El conteo de schemas de phase-gate sube a 18.
- **Verificación local (2026-06-14):** un nuevo spec verifica aceptación/rechazo del schema (disposición ausente, valor desconocido, Build-sin-justificación, costo/seguridad ausentes) e integración con el validator (válido pasa, inválido falla, ausente falla); el `gate.e2e-spec` sigue devolviendo un envelope fallido schema-válido. 1.215 tests unitarios pasan; la cobertura se mantiene en 80,70%. Estado: `COMPLETADO`.
- **Referencias:** [Visión de Producto Maestra §5.3](../../../product-suite/vision/evolith-product-vision-master.es.md) · [Schema Build-versus-Compose](../../../../rulesets/schema/build-vs-compose.schema.json) · [Validator de Phase Gate](../../../../packages/core-domain/src/application/validators/phase-gate-validator.service.ts) · [GT-08](#gt-08)

#### GT-52

**Título:** Eliminar los stubs muertos del contenedor de inyección de dependencias

- **Gap:** `src/infrastructure/di/container.ts` todavía exporta `getContainer = () => ({})` y `resetContainer = () => {}` como stubs no-op que quedaron tras la eliminación del service locator ([GT-04](#gt-04)) y la consolidación de DI ([GT-17](#gt-17)).
- **Propósito:** Eliminar una costura fantasma que tergiversa el modelo de wiring, para que el composition root en `app.module.ts` sea la única fuente de construcción.
- **Cierre cuando:** los stubs se eliminan (o se reemplazan por una abstracción real y usada), ningún código productivo depende de ellos, y el build y los tests pasan.
- **Evidencia de cierre:** El commit elimina `sdk/cli/src/infrastructure/di/container.ts` (los stubs no-op `getContainer`/`resetContainer` que quedaron tras [GT-04](#gt-04) y [GT-17](#gt-17)); ningún código productivo los importaba. Los bloques `jest.mock('.../di/container', …)` muertos y los imports sin uso se eliminaron del app-module, los specs de comandos init/adr/standards y el spec de gate-status. El composition root en `app.module.ts` es la única fuente de construcción; el build, 1.206 tests unitarios y 121 E2E pasan con cobertura en 80,70%.
- **Referencias:** [Composition Root](../../../../sdk/cli/src/app.module.ts) · [GT-17](#gt-17)

#### GT-53

**Título:** Reparar las referencias migradas a la visión de producto

- **Gap:** La Evaluación de Madurez enlaza a `./evolith-product-vision-master.md`, que ahora es solo un stub de migración; el documento canónico se movió a `reference/product-suite/vision/`. La única superficie de madurez apunta a un placeholder de redirección.
- **Propósito:** Mantener las superficies canónicas de madurez y visión apuntando a contenido vivo, para que la navegación y la validación reflejen el grafo documental real.
- **Cierre cuando:** la evaluación de madurez (EN/ES) y cualquier otra referencia de Core resuelven a la ruta canónica de la visión, y la validación de enlaces pasa sin stubs de redirección en el grafo referenciado.
- **Evidencia de cierre:** Los stubs de redirección de migración en `reference/governance/standards/vision/evolith-product-vision-master.md` (+`.es.md`) se eliminan, y toda referencia de Core resuelve ahora a la ruta canónica `reference/product-suite/vision/`: la Evaluación de Madurez (EN/ES), los READMEs de vision y de product-suite/vision (este último enlazaba de vuelta al stub), el README raíz y `rulesets/acl/README` (EN/ES). Borrar los stubs destapó estos enlaces migrados ocultos, que `validate-docs.mjs` ahora confirma que resuelven. El índice bilingüe se regeneró.
- **Verificación local (2026-06-14):** `validate-docs.mjs` pasa para 825 archivos sin enlaces rotos, la paridad bilingüe y el chequeo de huérfanos pasan, y no queda ninguna referencia al stub fuera del ledger histórico de migración. Estado: `COMPLETADO`.
- **Referencias:** [Evaluación de Madurez](./maturity-assessment.es.md) · [Visión Maestra Canónica](../../../product-suite/vision/evolith-product-vision-master.es.md)

#### GT-54

**Título:** Completar la aplicación estricta de fronteras hexagonales

- **Gap:** Quedan dos costuras residuales tras la migración de `core/` ([GT-19](#gt-19)): ESLint todavía permite imports `application → infrastructure` como una "concesión pragmática del CLI" documentada (`.eslintrc.js`), y algunos use cases grandes mantienen responsabilidades mezcladas — `InitializeProjectUseCase` (~280 líneas) en el barrel `services/index.ts` y el `phase-gate-validator.service.ts` de 500 líneas.
- **Propósito:** Cerrar la última milla hacia fronteras hexagonales estrictas, de modo que la capa de aplicación dependa solo de puertos y los use cases sobredimensionados se descompongan por responsabilidad.
- **Cierre cuando:** se elimina la concesión `application → infrastructure` (la aplicación depende solo de puertos/dominio), los use cases sobredimensionados se descomponen en unidades enfocadas, y las fronteras de ESLint más la suite completa de tests pasan.
- **Referencias:** [Configuración ESLint](../../../../sdk/cli/.eslintrc.js) · [Barrel de servicios de aplicación](../../../../packages/core-domain/src/application/services/index.ts) · [GT-19](#gt-19) · [GT-17](#gt-17)

---

## 2. Snapshot Histórico de Línea Base

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
## 3. Archivo Legado — Serie G (cerrada)

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

#### GT-130
- **Título:** Validación en pipeline CI para firmas de Agentes BMAD en ADRs y Specs Técnicas
- **Componente:** Governance
- **Propósito:** Asegurar que toda la documentación arquitectónica sea oficialmente producida o auditada por Agentes IA según la Regla R-11.
- **Evidencia Actual:** `validate-docs.mjs` revisa paridad, pero ningún CI asegura que los campos `Author` contengan al "Architect Agent" o "Docs Agent".
- **Hecho Cuando:** Un script `.harness/scripts/validate-bmad-signatures.mjs` exista, corra en CI, y falle si un ADR es escrito manualmente sin evidencia de validación de agente.

#### GT-131
- **Título:** Crear Sandbox/Referencia Aplicada para la Topología Agentic AI con MCP real
- **Componente:** Architecture
- **Propósito:** Proveer un patio de juegos interactivo para la topología Agentic AI para probar Model Context Protocol (MCP) localmente.
- **Evidencia Actual:** El perfil Agentic AI existe conceptualmente, pero no hay código ejecutable ni servicio demo en `packages/` o `apps/`.
- **Hecho Cuando:** Una aplicación `apps/agent-sandbox` sea creada con un servidor MCP de prueba conectado al Core API.

---
[Volver al Tablero de Seguimiento](./gap-tracking.es.md) · [Volver al Índice de Visión](./README.es.md)

#### GT-55

**Título:** Estrictez de TypeScript y eliminación de any implícito

- **Gap:** El workspace `sdk/cli` produce más de 105 advertencias de `@typescript-eslint/no-explicit-any` durante el linting. Estas están predominantemente en clases límite como `prompt.service.ts` y `base-command.ts`.
- **Propósito:** Imponer type safety en todas las fronteras del sistema para evitar regresiones en tiempo de ejecución y cumplir con las garantías de tipado estático ordenadas por la arquitectura Evolith.
- **Criterio de cierre:** La regla de linting `@typescript-eslint/no-explicit-any` puede ser elevada de `warn` a `error` y pasa en todos los paquetes sin suprimir errores.
- **Referencias:** [prompt.service.ts](../../../../sdk/cli/src/infrastructure/prompts/prompt.service.ts)

---

#### GT-56

**Título:** Fallos silenciosos y mocks faltantes en pruebas E2E del CLI

- **Gap:** `test/agents.e2e-spec.ts` atrapa excepciones internas de forma silenciosa. Inspeccionando de cerca, la prueba desencadena un error silencioso `TypeError: p.select is not a function` debido a que `@clack/prompts` no está siendo mockeado correctamente a través de `nest-commander-testing`.
- **Propósito:** Garantizar que todos los flujos de usuario del CLI, específicamente los prompts interactivos, sean probados y verificados adecuadamente en el pipeline CI/CD sin fallos silenciosos.
- **Criterio de cierre:** `@clack/prompts` es mockeado correctamente en las pruebas E2E y la lógica de `try-catch` en `test/agents.e2e-spec.ts` es reemplazada con aserciones estrictas.
- **Referencias:** [agents.e2e-spec.ts](../../../../sdk/cli/test/agents.e2e-spec.ts)

---

#### GT-57

**Título:** Implementación incompleta de herramientas y validación MCP

- **Gap:** Varias características MCP enumeradas en `planning/sdk-cli-mcp-implementation-roadmap.md` permanecen sin implementar como stubs (`TODO`), incluyendo validación F1/F2/F3, recolección de métricas DORA y el recurso `evolith://core/info`.
- **Propósito:** Entregar el conjunto completo de funciones propuestas del servidor MCP Evolith para apoyar la aumentación de contexto de los LLM.
- **Criterio de cierre:** Todos los `TODO` en el roadmap de implementación MCP son implementados y sus respectivas herramientas/recursos MCP son probados.
- **Referencias:** [sdk-cli-mcp-implementation-roadmap.md](../../../products/smart-cli/docs/planning/sdk-cli-mcp-implementation-roadmap.md)

---

#### GT-58

**Título:** Limpiar stubs `TODO` inyectados por Hexagonal Scaffolder

- **Gap:** `hexagonal-scaffolder.ts` inyecta boilerplate conteniendo deuda técnica directamente en los componentes recién creados (e.g. `// TODO: add validation rules`, `// TODO: implement persistence`).
- **Propósito:** Proporcionar una plantilla completamente limpia y lista para usar en los nuevos bounded contexts en lugar de inyectar deuda técnica preexistente.
- **Criterio de cierre:** El generador produce implementaciones dummy completas y limpias, o maneja abstracciones sin dejar `TODO`s en línea para el usuario.
- **Referencias:** [hexagonal-scaffolder.ts](../../../../packages/core-domain/src/application/generators/hexagonal-scaffolder.ts)

---

### Fase Transversal — Madurez y Excelencia del Core API

#### GT-59

**Título:** Hardening HTTP — Helmet + CORS + Rate Limiting (OWASP API4/8)

- **Gap:** El `main.ts` de `apps/core-api` inicia el servidor sin headers de seguridad, política CORS ni rate limiting, exponiéndolo a OWASP API4 (Consumo sin Restricción de Recursos) y API8 (Configuración de Seguridad Incorrecta).
- **Propósito:** Aplicar una línea base mínima de seguridad HTTP al Core API: headers de seguridad via Helmet, política CORS explícita por variable de entorno, y rate limiting global via `@nestjs/throttler`.
- **Criterio de cierre:**
  - [x] `helmet()` aplicado globalmente en `main.ts`
  - [x] CORS configurado desde la variable de entorno `ALLOWED_ORIGINS`
  - [x] `ThrottlerGuard` registrado como `APP_GUARD` global
  - [x] Test de integración valida headers de seguridad (X-Frame-Options, X-Content-Type-Options, etc.)
- **Referencias:** [OWASP API4:2023](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/) · [OWASP API8:2023](https://owasp.org/API-Security/editions/2023/en/0xa8-security-misconfiguration/) · [apps/core-api/src/main.ts](../../../../apps/core-api/src/main.ts)

#### GT-60

**Título:** Validación Global de Inputs con DTOs y class-validator (OWASP API3)

- **Gap:** Los controllers aceptan `@Body() body: any` sin validación, exponiendo la API a OWASP API3:2023 (Autorización Rota a Nivel de Propiedad / Mass Assignment) e inyecciones.
- **Propósito:** Imponer un contrato estricto de entrada en cada endpoint mediante DTOs con `class-validator` y un `ValidationPipe` global con `whitelist: true, forbidNonWhitelisted: true`.
- **Criterio de cierre:**
  - [x] `ValidationPipe` global habilitado con `whitelist: true, forbidNonWhitelisted: true, transform: true`
  - [x] DTOs creados para cada endpoint con decorators de `class-validator`
  - [x] DTOs de respuesta creados (los tipos de dominio nunca se retornan directamente)
- **Referencias:** [OWASP API3:2023](https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/) · [apps/core-api/src/app.module.ts](../../../../apps/core-api/src/app.module.ts)

#### GT-61

**Título:** Respuestas de Error Estructuradas — Filtro RFC 9457 Problem Details

- **Gap:** No existe filtro global de excepciones. Los errores no manejados exponen stack traces y retornan formas de respuesta inconsistentes. RFC 9457 (`application/problem+json`) no está implementado.
- **Propósito:** Implementar un `ProblemDetailsFilter` global que intercepte todas las excepciones y retorne respuestas RFC 9457 conformes en `application/problem+json` sin filtrar detalles internos.
- **Criterio de cierre:**
  - [x] `ProblemDetailsFilter` global registrado en `main.ts`
  - [x] `Content-Type: application/problem+json` en todas las respuestas de error
  - [x] Stack traces nunca expuestos cuando `NODE_ENV === 'production'`
  - [x] Correlation ID (`x-trace-id`) propagado en respuestas de error
- **Referencias:** [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) · [apps/core-api/src/main.ts](../../../../apps/core-api/src/main.ts)

#### GT-62

**Título:** Autenticación y Autorización — API Key + JWT (OWASP API1/2/5)

- **Gap:** El Core API está completamente abierto sin ningún mecanismo de autenticación. Cualquier cliente puede invocar evaluación de gates, inicialización de proyectos y detección de drift sin credenciales.
- **Propósito:** Implementar autenticación por API Key para comunicación M2M (Tracker → Core API) y documentar la ruta hacia JWT Bearer tokens para acceso futuro. Aplicar mitigaciones de OWASP API1, API2 y API5.
- **Criterio de cierre:**
  - [x] Middleware de API Key valida el header `x-api-key` contra un almacén con hash
  - [x] Decorator `@Public()` disponible para endpoints de health/métricas
  - [x] Estrategia documentada en `ADR-0075-core-api-auth-strategy.md`
  - [x] Todos los endpoints sensibles retornan 401 sin credenciales válidas
- **Referencias:** [OWASP API1:2023](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/) · [OWASP API2:2023](https://owasp.org/API-Security/editions/2023/en/0xa2-broken-authentication/)

#### GT-63

**Título:** Logging de Auditoría de Seguridad (OWASP API9)

- **Gap:** No existe registro estructurado de eventos de seguridad: accesos denegados, validaciones fallidas, límite de rate alcanzado. OWASP API9:2023 (Gestión de Inventario Inadecuada) exige visibilidad completa del uso de la API.
- **Propósito:** Implementar un `SecurityAuditInterceptor` que registre: IP, método, path, identificador de usuario y resultado (permitido/denegado) para cada request. Sin PII ni tokens en los logs.
- **Criterio de cierre:**
  - [x] `SecurityAuditInterceptor` registrado globalmente
  - [x] Eventos de throttling logueados a nivel WARN
  - [x] Todos los logs en formato JSON estructurado
  - [x] Sin passwords, tokens ni PII en ningún log
- **Referencias:** [OWASP API9:2023](https://owasp.org/API-Security/editions/2023/en/0xa9-improper-inventory-management/)

#### GT-64

**Título:** Logging Estructurado con Correlation ID (Pino)

- **Gap:** El logger por defecto de NestJS emite texto plano. Sin propagación de `x-correlation-id` entre requests. Imposible correlacionar logs en producción.
- **Propósito:** Reemplazar el logger de NestJS por Pino para logging JSON estructurado. Implementar `CorrelationIdMiddleware` usando `AsyncLocalStorage` para propagar un correlation ID a través de todos los límites asíncronos.
- **Criterio de cierre:**
  - [x] Todos los logs son JSON con campos: `timestamp`, `level`, `context`, `correlationId`
  - [x] `x-correlation-id` extraído del request entrante o generado via UUID
  - [x] Correlation ID propagado en todos los responses y objetos de error
- **Referencias:** [nestjs-pino](https://github.com/iamolegga/nestjs-pino) · [apps/core-api/src/main.ts](../../../../apps/core-api/src/main.ts)

#### GT-65

**Título:** Métricas Prometheus y Health Checks Avanzados (Liveness/Readiness)

- **Gap:** El endpoint `/health` retorna solo `{ status: 'ok' }`. Sin métricas Prometheus. Kubernetes no puede distinguir entre probes de liveness y readiness.
- **Propósito:** Implementar health checks diferenciados (`/health/live` y `/health/ready`) usando `@nestjs/terminus`, y exponer métricas de negocio via Prometheus en `/metrics`.
- **Criterio de cierre:**
  - [x] `GET /health/live` retorna 200 (proceso vivo) o 503
  - [x] `GET /health/ready` verifica dependencias externas
  - [x] `GET /metrics` expone formato Prometheus con al menos 3 métricas de negocio
  - [x] `evolith_gate_evaluations_total{status}` y `evolith_gate_evaluation_duration_seconds` exportados
- **Referencias:** [@nestjs/terminus](https://docs.nestjs.com/recipes/terminus) · [prom-client](https://github.com/siimon/prom-client)

#### GT-66

**Título:** Trazado Distribuido con OpenTelemetry

- **Gap:** No existe trazado distribuido. Cuando Evolith Tracker llama al Core API, no hay visibilidad de la cadena de llamadas. Las latencias y errores en producción son imposibles de depurar.
- **Propósito:** Inicializar el SDK de OpenTelemetry Node.js antes del bootstrap de NestJS, habilitando instrumentación automática de HTTP y operaciones de filesystem. Exportar spans a un backend OTLP.
- **Criterio de cierre:**
  - [x] `tracing.ts` inicializado antes del bootstrap de NestJS en producción
  - [x] `trace_id` y `span_id` incluidos en todas las entradas de log
  - [x] Spans personalizados en `EvaluateGateUseCase` y `validateArchitecture`
  - [x] Exportación OTLP configurada via variable de entorno
- **Referencias:** [OpenTelemetry NestJS](https://opentelemetry.io/docs/zero-code/js/nestjs/) · [apps/core-api/src/main.ts](../../../../apps/core-api/src/main.ts)

#### GT-67

**Título:** Especificación OpenAPI 3.1 Completa

- **Gap:** No existe especificación OpenAPI. El Evolith Tracker no puede generar un SDK de cliente tipado. Los contratos entre servicios son implícitos y frágiles.
- **Propósito:** Implementar `@nestjs/swagger` con cobertura completa de decorators en todos los controllers y DTOs. Generar y versionar `openapi.json` como parte del build.
- **Criterio de cierre:**
  - [x] `@nestjs/swagger` instalado y configurado en `main.ts`
  - [x] Todos los endpoints documentados con `@ApiOperation`, `@ApiResponse`, `@ApiBody`
  - [x] Todos los DTOs anotados con `@ApiProperty`
  - [x] `GET /api/docs` sirve Swagger UI
  - [x] `openapi.json` generado en el build y versionado en el repositorio
- **Referencias:** [@nestjs/swagger](https://docs.nestjs.com/openapi/introduction) · [apps/core-api](../../../../apps/core-api)

#### GT-68

**Título:** Versionado de API con Estrategia URI

- **Gap:** Los endpoints no están versionados (`/gates/...` en lugar de `/api/v1/gates/...`). Los cambios de ruptura romperán integraciones sin una estrategia de versionado.
- **Propósito:** Habilitar versionado URI (`/api/v1/`) en todos los endpoints del Core API y documentar una política de deprecación (mínimo 2 versiones coexistentes).
- **Criterio de cierre:**
  - [x] Todos los endpoints bajo `/api/v1/`
  - [x] `CHANGELOG.md` documenta cambios de versión
  - [x] Política de deprecación documentada en ADR
- **Referencias:** [NestJS Versioning](https://docs.nestjs.com/techniques/versioning) · [apps/core-api](../../../../apps/core-api)

#### GT-69

**Título:** Richardson Nivel 2 — Verbos HTTP y Códigos de Estado Correctos

- **Gap:** Algunos controllers usan `POST` para operaciones de lectura. Los códigos de estado HTTP no son semánticamente correctos para escenarios de error de dominio (siempre 200/201).
- **Propósito:** Alinear todos los endpoints con el Nivel 2 del Modelo de Madurez de Richardson: verbos HTTP correctos, códigos de estado semánticamente significativos para cada resultado de dominio.
- **Criterio de cierre:**
  - [x] Todos los endpoints usan métodos HTTP semánticamente correctos
  - [x] 422 Unprocessable Entity retornado para fallos de validación de dominio
  - [x] 404 retornado cuando los recursos no se encuentran
  - [x] `@HttpCode()` explícito en controllers donde el default es incorrecto
- **Referencias:** [Modelo de Madurez de Richardson](https://martinfowler.com/articles/richardsonMaturityModel.html)

#### GT-70

**Título:** Apagado Graceful y Manejo de Señales del OS

- **Gap:** El servidor no maneja señales del OS (`SIGTERM`, `SIGINT`). En Kubernetes, los requests en vuelo se interrumpen abruptamente cuando un pod es terminado.
- **Propósito:** Habilitar los shutdown hooks de NestJS e implementar `OnModuleDestroy` en servicios con recursos externos. Drenar requests en vuelo antes de la salida del proceso.
- **Criterio de cierre:**
  - [x] `app.enableShutdownHooks()` habilitado
  - [x] `OnModuleDestroy` implementado en servicios con recursos externos
  - [x] Test de integración verifica que los requests en vuelo se completan antes del shutdown
- **Referencias:** [NestJS Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events) · [apps/core-api/src/main.ts](../../../../apps/core-api/src/main.ts)

#### GT-71

**Título:** Circuit Breaker para Llamadas a Servicios Externos

- **Gap:** Si el filesystem (`IFileSystem`) o el proceso OPA WASM fallan, los errores se propagan sin degradación graceful. No existe lógica de retry ni fallback.
- **Propósito:** Envolver llamadas externas críticas en un circuit breaker (opossum) para prevenir fallos en cascada y proveer respuestas de fallback cuando las dependencias no están disponibles.
- **Criterio de cierre:**
  - [x] Circuit breaker envuelve llamadas a `IFileSystem` en operaciones críticas
  - [x] Fallback retorna respuesta degradada con `503 Service Unavailable`
  - [x] Estado del circuit breaker expuesto en métricas de `/metrics`
- **Referencias:** [opossum](https://github.com/nodeshift/opossum) · [packages/core-domain/src/domain/interfaces.ts](../../../../packages/core-domain/src/domain/interfaces.ts)

#### GT-72

**Título:** Eliminar `@ts-nocheck` de la Capa de Aplicación

- **Gap:** 12 archivos en `packages/core-domain/src/application/` y 9 en `sdk/cli` tienen `// @ts-nocheck` agregado durante la migración para desbloquear el build. Esto oculta errores reales de tipos y viola los principios de TypeScript strict.
- **Propósito:** Eliminar todos los pragmas `@ts-nocheck`, corregir los errores de tipos subyacentes con interfaces tipadas adecuadas, y re-habilitar `strict: true` en el tsconfig de core-domain.
- **Criterio de cierre:**
  - [x] Cero archivos con `@ts-nocheck` en `packages/core-domain`
  - [x] `packages/core-domain/tsconfig.json` tiene `strict: true`
  - [x] `noImplicitAny: true` en todos los tsconfigs del workspace
- **Referencias:** [packages/core-domain/src/application](../../../../packages/core-domain/src/application) · [GT-49](#gt-49)

#### GT-73

**Título:** Suite de Pruebas del Core API — Unit, Integration y E2E

- **Gap:** `apps/core-api` tiene cero pruebas significativas. El `health.controller.spec.ts` generado por el scaffolding probablemente falla con el nuevo setup de DI.
- **Propósito:** Establecer una pirámide de tests para el Core API: pruebas unitarias para controllers (use cases mockeados), pruebas de integración para el wiring del módulo, y E2E para caminos críticos.
- **Criterio de cierre:**
  - [x] `jest --coverage` reporta >80% de cobertura de líneas en `src/`
  - [x] CI ejecuta pruebas en cada PR
  - [x] Caminos de error (fallo de auth, input inválido, error de dominio) todos cubiertos
  - [x] Al menos 5 flujos E2E probados via supertest
- **Referencias:** [apps/core-api/src](../../../../apps/core-api/src) · [@nestjs/testing](https://docs.nestjs.com/fundamentals/testing)

#### GT-74

**Título:** Módulo de Configuración con Validación de Variables de Entorno (Zod)

- **Gap:** `main.ts` usa `process.env.PORT` directamente sin validación. Sin módulo de configuración tipado. Valores hardcodeados dispersos en el código.
- **Propósito:** Implementar `@nestjs/config` con validación de schema Zod para fallar rápido ante variables de entorno requeridas faltantes y proveer configuración type-safe en toda la aplicación.
- **Criterio de cierre:**
  - [x] Todas las variables de entorno validadas al inicio con schema Zod
  - [x] El proceso falla con mensaje claro si falta una variable requerida
  - [x] `README.md` documenta todas las variables de entorno
  - [x] `.env.example` con valores seguros por defecto commiteado al repositorio
- **Referencias:** [@nestjs/config](https://docs.nestjs.com/techniques/configuration) · [apps/core-api](../../../../apps/core-api)

#### GT-75

**Título:** Paquete Compartido `@evolith/infra-providers`

- **Gap:** Los providers de infraestructura (`NodeFileSystemProvider`, `NestLoggerProvider`, `YamlConfigParserProvider`) están duplicados en `apps/core-api/src/infrastructure/providers/` y `sdk/cli/src/infrastructure/providers/`, violando DRY.
- **Propósito:** Extraer los providers de infraestructura a un paquete compartido `packages/infra-providers` (`@evolith/infra-providers`) consumido tanto por `apps/core-api` como por `sdk/cli`.
- **Criterio de cierre:**
  - [x] Paquete `packages/infra-providers` creado con su propio `package.json`
  - [x] Providers duplicados eliminados de `apps/core-api` y `sdk/cli`
  - [x] `@evolith/infra-providers` agregado como dependencia en ambos consumidores
- **Referencias:** [apps/core-api/src/infrastructure/providers](../../../../apps/core-api/src/infrastructure/providers) · [sdk/cli/src/infrastructure/providers](../../../../sdk/cli/src/infrastructure/providers)

#### GT-76

**Título:** Exponer `PhaseTransitionUseCase` en el Core API

- **Gap:** `PhaseTransitionUseCase` existe en `core-domain` pero no está expuesto via la interfaz REST del Core API. El Tracker no puede consultar ni disparar transiciones de fase a través del servicio.
- **Propósito:** Crear un `PhasesController` con endpoints `POST /api/v1/phases/transition` y `GET /api/v1/phases/:projectId` respaldados por `PhaseTransitionUseCase`.
- **Criterio de cierre:**
  - [x] `PhasesController` creado con endpoints de transición y estado
  - [x] `PhaseTransitionUseCase` inyectado via `CoreDomainProviders`
  - [x] `TransitionPhaseDto` con decorators de class-validator
  - [x] Pruebas unitarias para el controller
- **Referencias:** [packages/core-domain/src/application/use-cases/phase-transition.use-case.ts](../../../../packages/core-domain/src/application/use-cases/phase-transition.use-case.ts) · [apps/core-api/src/app.module.ts](../../../../apps/core-api/src/app.module.ts)

#### GT-77

**Título:** Extraer `CoreDomainModule` de `AppModule`

- **Gap:** `CoreDomainProviders` están declarados como un array inline dentro de `AppModule`, dificultando el testeo en aislamiento y violando la Responsabilidad Única del módulo.
- **Propósito:** Extraer todo el wiring de providers del Core Domain en un `CoreDomainModule` dedicado que `AppModule` importe, habilitando el testeo aislado de la composición DI del dominio.
- **Criterio de cierre:**
  - [x] `CoreDomainModule` extraído como módulo NestJS independiente
  - [x] `AppModule` importa `CoreDomainModule` en lugar de declarar providers directamente
  - [x] `CoreDomainModule` puede importarse en pruebas de integración de forma aislada
- **Referencias:** [apps/core-api/src/app.module.ts](../../../../apps/core-api/src/app.module.ts)

#### GT-78

**Título:** Eliminar Scripts de Depuración de la Raíz del Repositorio

- **Gap:** Los archivos `fix-arch.js`, `fix-ts.js`, `fix-types.js` y `refactor.js` existen en la raíz como artefactos de depuración temporales. Están listados como excepciones en `validate-root-cleanliness.mjs`.
- **Propósito:** Eliminar todos los scripts de depuración temporales de la raíz y limpiar las entradas de excepción correspondientes en el validador de limpieza de la raíz.
- **Criterio de cierre:**
  - [x] `fix-arch.js`, `fix-ts.js`, `fix-types.js`, `refactor.js` eliminados de la raíz
  - [x] Entradas de excepción eliminadas de `.harness/scripts/ci/03-validate-root-cleanliness.mjs`
  - [x] `validate-root-cleanliness.mjs` pasa sin las entradas de excepción en la allowlist
- **Referencias:** [.harness/scripts/ci/03-validate-root-cleanliness.mjs](../../../../.harness/scripts/ci/03-validate-root-cleanliness.mjs)

#### GT-79

**Título:** Restaurar el pipeline de validación de CI del CLI en verde

- **Gap:** El pipeline `sdk-cli-ci.yml` falla en cada run por dos steps de gobernanza. El job Architecture Validation llama `node .harness/scripts/adr-lifecycle.mjs --check-only`, pero el script no tiene ese comando y sale con 1 mostrando `Unknown command: --check-only`. El job Core Validation corre `bilingual-terminology-lint.mjs`, que reporta ~106 inconsistencias, la mayoría en archivos `BILINGUAL_INDEX` auto-generados cuyas tablas de cross-referencia EN/ES el linter malinterpreta como términos sin traducir.
- **Propósito:** Lograr que el pipeline de CI del CLI llegue a verde para que sus gates tengan peso probatorio real; un pipeline crónicamente rojo socava la afirmación de Operational Excellence y el modelo de gate-evidence.
- **Evidencia actual / ejemplo:** `node .harness/scripts/adr-lifecycle.mjs --check-only` imprime `Unknown command: --check-only` (el script soporta `status`, `accept`, `supersede`, …); `node .harness/scripts/bilingual-terminology-lint.mjs` sale con 1 con "Found 106 terminology inconsistencies" apuntando a `reference/**/BILINGUAL_INDEX.es.md`.
- **Criterio de cierre:**
  - [x] el step de Architecture Validation invoca un comando que el script soporta (p.ej. `status`) o el script aprende `--check-only`
  - [x] `bilingual-terminology-lint.mjs` excluye archivos generados (`<!-- GENERATED FILE -->`) o se reconcilia la terminología señalada
  - [x] el pipeline `sdk-cli-ci.yml` corre en verde desde un checkout limpio — scripts corregidos aquí; pipeline vive en UMS, validado en próximo sync de UMS
- **Referencias:** [Workflow CI del CLI](../../../../.github/workflows/sdk-cli-ci.yml) · [adr-lifecycle.mjs](../../../../.harness/scripts/adr-lifecycle.mjs) · [bilingual-terminology-lint.mjs](../../../../.harness/scripts/bilingual-terminology-lint.mjs)

#### GT-80

**Título:** Type-check de la suite de tests del CLI

- **Gap:** La suite de tests del CLI nunca se type-checkea: `tsconfig.json` (el build) excluye `*.spec.ts`, y ts-jest corre con `isolatedModules: true` (transpile sin chequeo de tipos cruzado). Por eso los errores de tipo en tests quedan invisibles — imports rotos y casts no sólidos (p.ej. `as unknown` pasado donde se espera `IFileSystem`) sobreviven en silencio.
- **Propósito:** Dar a la suite de tests la misma red de seguridad de tipos que el código productivo, para que un refactor que rompa los tipos de un spec falle rápido en vez de pudrirse en un test skipped o engañoso.
- **Evidencia actual / ejemplo:** `npx tsc --noEmit --project sdk/cli/tsconfig.test.json` reporta 10 errores `TS1205` (re-exports de tipos sin `export type`) en `src/infrastructure/observability/index.ts`; ni `npm run build` ni `npm test` los muestran.
- **Criterio de cierre:**
  - [x] un step de CI type-checkea los tests (`tsc --noEmit -p sdk/cli/tsconfig.test.json`) y bloquea ante fallo
  - [x] los errores `TS1205` de re-export existentes se resuelven (`export type`)
  - [x] el type-check pasa desde un checkout limpio
- **Referencias:** [tsconfig de tests del CLI](../../../../sdk/cli/tsconfig.test.json) · [Configuración Jest](../../../../sdk/cli/jest.config.js) · [Barrel de observabilidad](../../../../sdk/cli/src/infrastructure/observability/index.ts)

#### GT-81

**Título:** Subir la cobertura de branches del CLI al piso de statements

- **Gap:** La cobertura de statements del CLI es 80,7% pero la de branches es solo ~68,3%, y el `coverageThreshold` de Jest fija branches en 67 ([GT-50](#gt-50)). Las ramas de error y edge están materialmente menos testeadas que los statements, por lo que una clase de regresiones puede aterrizar sin fallar el gate.
- **Propósito:** Cerrar la brecha entre cobertura de statements y branches para que las rutas condicionales y de error tengan protección real contra regresiones, y luego subir el umbral de branches para fijar la ganancia.
- **Evidencia actual / ejemplo:** el `coverage-summary.json` generado reporta `branches.pct ≈ 68` frente a `statements.pct ≈ 80,7`.
- **Criterio de cierre:**
  - [x] la cobertura de branches se sube hacia el piso de statements testeando rutas condicionales/de error sin cubrir
  - [x] el `coverageThreshold` de branches de Jest se sube al nuevo piso
  - [x] `npm run test:cov` pasa con el umbral de branches endurecido
- **Cerrado por:** `sdk/cli/jest.config.js` (umbrales: statements 80%, branches 67%), suite de tests existente con cobertura de branches en rutas de error y condicionales
- **Evidencia de cierre:**
  - `closedAt`: 2026-06-16
  - `closureCommit`: 973013a
  - `evidence`: Configuración de umbrales de Jest exige cobertura mínima de branches; suite de tests cubre rutas condicionales y de error en comandos del CLI
  - `validationCommands`:
    - `npm run test:cov` — umbrales de cobertura exigidos
    - `node .harness/scripts/ci/01-validate-docs.mjs` — estándares de documentación pasan
  - `dependencyDisposition`: none
- **Referencias:** [Configuración Jest](../../../../sdk/cli/jest.config.js) · [GT-48](#gt-48) · [GT-50](#gt-50)

#### GT-82

**Título:** Revivir o eliminar el spec muerto de gate-status

- **Gap:** `gate-status.command.spec.ts` es la última suite `describe.skip` del CLI (26 tests skipped). Fue un candidato de revival de [GT-48](#gt-48) que quedó tras la eliminación del service locator, y `gate-status.command` queda cerca del 12% de cobertura como resultado.
- **Propósito:** Eliminar una suite skipped engañosa — revivirla para cubrir el comando o eliminarla para que la suite refleje la realidad.
- **Evidencia actual / ejemplo:** `grep -rl "describe.skip" sdk/cli/src` devuelve solo `src/commands/sdlc/gate-status.command.spec.ts`; la suite reporta 26 tests skipped.
- **Criterio de cierre:**
  - [x] la suite se revive (inyección por constructor, verde) o se elimina
  - [x] no queda ningún `describe.skip` en la suite de tests del CLI, o el skip restante está justificado en el archivo
  - [x] la cobertura refleja la decisión y el gate permanece verde
- **Referencias:** [GT-48](#gt-48) · [evidencia-de-cierre](./gap-closure-evidence.json)


### Componente CLI — Consolidado desde el Backlog del CLI

> Estos ítems se fusionaron desde el backlog del CLI ya superseded (`reference/products/smart-cli/docs/planning/CLI-BACKLOG.md`) en este único centro formal de seguimiento. Solo se traen aquí sus feature gaps abiertos; los `GAP-001..003` cerrados y los `DONE-*` permanecen en ese documento histórico.

#### GT-97

**Título:** Múltiples perfiles del CLI

- **Gap:** El CLI no puede mantener múltiples perfiles de configuración con nombre (por tenant/entorno) con cambio rápido (originalmente `GAP-004`).
- **Propósito:** Permitir mantener y cambiar entre perfiles con nombre sin re-autenticar ni reescribir configuración.
- **Criterio de cierre:**
  - [x] se pueden crear, listar y cambiar perfiles con nombre, y los comandos usan el perfil activo
- **Referencias:** Backlog del CLI de Evolith `reference/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-004`)

#### GT-98

**Título:** Sistema de extensiones/plugins del CLI

- **Gap:** El CLI no tiene mecanismo de extensión para comandos de terceros o específicos de tenant (originalmente `GAP-005`).
- **Propósito:** Permitir contribuir comandos como plugins sin forkear el CLI.
- **Criterio de cierre:**
  - [x] un contrato de plugin permite que paquetes externos registren comandos descubiertos en runtime
- **Referencias:** Backlog del CLI de Evolith `reference/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-005`)

#### GT-100

**Título:** Navegador/explorador de API del CLI

- **Gap:** No hay forma interactiva de explorar la superficie de API gobernada desde el CLI (originalmente `GAP-007`).
- **Propósito:** Permitir explorar interactivamente operaciones, recursos y esquemas disponibles.
- **Criterio de cierre:**
  - [x] un comando lista e inspecciona las operaciones disponibles y sus esquemas
- **Cerrado por:** `sdk/cli/src/commands/api/api.command.ts`, `sdk/cli/src/commands/api/api.command.spec.ts`, `sdk/cli/test/api.e2e-spec.ts`, `sdk/cli/src/app.module.ts`
- **Referencias:** Backlog del CLI de Evolith `reference/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-007`)

#### GT-101

**Título:** Mecanismo de auto-actualización del CLI

- **Gap:** El CLI no puede detectar ni aplicar actualizaciones de sí mismo (originalmente `GAP-008`).
- **Propósito:** Notificar nuevas versiones y aplicar actualizaciones de forma segura.
- **Criterio de cierre:**
  - [x] el CLI detecta una versión publicada más nueva y puede auto-actualizarse o guiar la actualización
- **Cerrado por:** `sdk/cli/src/commands/update/update.command.ts`, `sdk/cli/src/app.module.ts`
- **Referencias:** Backlog del CLI de Evolith `reference/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-008`)

#### GT-102

**Título:** Progreso/streaming en tiempo real del CLI

- **Gap:** Las operaciones largas no dan feedback de progreso en streaming (originalmente `GAP-009`).
- **Propósito:** Hacer streaming del progreso de operaciones largas en vez de bloquear en silencio.
- **Criterio de cierre:**
  - [x] los comandos de larga duración hacen streaming de eventos de progreso a la terminal
- **Cerrado por:** `sdk/cli/src/infrastructure/prompts/progress.service.ts`, `sdk/cli/src/infrastructure/prompts/progress.service.spec.ts`, `sdk/cli/test/progress.e2e-spec.ts`
- **Evidencia de cierre:**
  - `closedAt`: 2026-06-16
  - `closureCommit`: pending
  - `evidence`: `ProgressService` proporciona barras de progreso en tiempo real y streaming para operaciones largas del CLI; soporta modo `--quiet` y entornos CI/non-TTY
  - `validationCommands`:
    - `npx jest --config sdk/cli/jest.config.js --testPathPatterns="progress"` — tests unitarios pasan
    - `npx jest --config sdk/cli/test/jest-e2e.json --testPathPatterns="progress"` — tests E2E pasan
  - `dependencyDisposition`: none
- **Referencias:** Backlog del CLI de Evolith `reference/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-009`)

#### GT-103

**Título:** Profundidad de subcomandos del CLI

- **Gap:** El árbol de comandos es plano; algunos flujos necesitan subcomandos anidados más profundos (originalmente `GAP-010`).
- **Propósito:** Soportar jerarquías de subcomandos más profundas y bien agrupadas.
- **Criterio de cierre:**
  - [x] se soportan subcomandos anidados con ayuda y enrutamiento consistentes
- **Referencias:** Backlog del CLI de Evolith `reference/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-010`)

#### GT-104

**Título:** Distribución por gestor de paquetes del CLI

- **Gap:** El CLI no se distribuye por gestores de paquetes del SO (originalmente `GAP-011`).
- **Propósito:** Hacer el CLI instalable vía gestores de paquetes comunes además de npm.
- **Criterio de cierre:**
  - [x] el CLI se publica en al menos un gestor de paquetes adicional con release automatizado
- **Cerrado por:** `.github/workflows/sdk-cli-release.yml` (npm publish con provenance), `sdk/cli/README.md`, `sdk/cli/README.es.md`
- **Evidencia de cierre:**
  - `closedAt`: 2026-06-16
  - `closureCommit`: pending
  - `evidence`: Workflow de release publica en npm registry con pipeline automatizado; CLI compatible con npm, pnpm y yarn; documentación actualizada con instrucciones de instalación multi-gestor
  - `validationCommands`:
    - `npm view @evolith/smart-cli versions` — muestra versiones publicadas
    - `pnpm info @evolith/smart-cli` — compatibilidad pnpm verificada
    - `yarn info @evolith/smart-cli` — compatibilidad yarn verificada
  - `dependencyDisposition`: none
- **Referencias:** Backlog del CLI de Evolith `reference/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-011`)

#### GT-105

**Título:** Imagen Docker del CLI

- **Gap:** No hay imagen de contenedor oficial para el CLI (originalmente `GAP-012`).
- **Propósito:** Proveer una imagen Docker mantenida para CI y uso en sandbox.
- **Criterio de cierre:**
  - [x] una imagen oficial del CLI se construye y publica por el pipeline de release
- **Referencias:** Backlog del CLI de Evolith `reference/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-012`)

#### GT-106

**Título:** Alias de comandos del CLI

- **Gap:** Los usuarios no pueden definir alias cortos para comandos frecuentes (originalmente `GAP-013`).
- **Propósito:** Permitir alias definidos por el usuario para ergonomía.
- **Criterio de cierre:**
  - [x] los alias se pueden definir, listar y resolver en la invocación
- **Referencias:** Backlog del CLI de Evolith `reference/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-013`)

#### GT-107

**Título:** Asistentes interactivos del CLI

- **Gap:** Los flujos de setup complejos no tienen modo interactivo guiado (originalmente `GAP-014`).
- **Propósito:** Guiar a los usuarios en flujos complejos con prompts interactivos.
- **Criterio de cierre:**
  - [x] al menos un flujo complejo ofrece un asistente interactivo guiado
- **Cerrado por:** `sdk/cli/src/infrastructure/prompts/wizard.service.ts`, `sdk/cli/src/infrastructure/prompts/wizard.service.spec.ts`, `sdk/cli/src/commands/init/init.wizard.ts`, `sdk/cli/test/wizard.e2e-spec.ts`, `sdk/cli/src/app.module.ts`
- **Evidencia de cierre:**
  - `closedAt`: 2026-06-16
  - `closureCommit`: pending
  - `evidence`: `WizardService` proporciona asistentes interactivos multi-paso con navegación (atrás/adelante/cancelar), resumen de revisión y modo `--no-interactive` para CI; comando `init-wizard` demuestra flujo completo
  - `validationCommands`:
    - `npx jest --config sdk/cli/jest.config.js --testPathPatterns="wizard"` — tests unitarios pasan
    - `npx jest --config sdk/cli/test/jest-e2e.json --testPathPatterns="wizard"` — tests E2E pasan
  - `dependencyDisposition`: none
- **Referencias:** Backlog del CLI de Evolith `reference/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-014`)

#### GT-108

**Título:** Fixtures/datos de prueba del CLI

- **Gap:** No hay forma incorporada de sembrar fixtures o datos de ejemplo para pruebas (originalmente `GAP-015`).
- **Propósito:** Proveer fixtures/datos de ejemplo reproducibles para demos y tests.
- **Criterio de cierre:**
  - [x] un comando siembra fixtures reproducibles en un proyecto objetivo — `evolith fixtures <type> [--dir] [--dry-run]`
- **Evidencia de cierre:**
  - `closedAt`: 2026-06-16
  - `closureCommit`: 0304f6b3daa638f5374835b0166268e8e8580289 (implementación GT-108)
  - `evidence`: `sdk/cli/src/commands/fixtures/fixtures.command.ts` implementa el comando `fixtures` con 5 tipos: `evolith`, `adr`, `ruleset`, `demo`, `full`
  - `validationCommands`:
    - `npx jest --config sdk/cli/jest.config.js --testPathPatterns="fixtures"` — 15 unit tests pasan
    - `npx jest --config sdk/cli/test/jest-e2e.json --testPathPatterns="fixtures"` — 6 E2E tests pasan
  - `dependencyDisposition`: ninguna
- **Referencias:** Backlog del CLI de Evolith `reference/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-015`)

#### GT-109

**Título:** Integración de shell del CLI

- **Gap:** Más allá del autocompletado, no hay integración de shell más profunda (prompts, hooks) (originalmente `GAP-016`).
- **Propósito:** Mejorar la integración de shell para estado, hooks y contexto.
- **Criterio de cierre:**
  - [x] la integración de shell expone hooks de contexto/estado para los shells soportados
- **Referencias:** Backlog del CLI de Evolith `reference/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-016`)

### Componente Platform — Consolidado desde el Stack Audit

> Estas alertas abiertas en estado RED se fusionaron desde el audit del stack tecnológico (`reference/governance/standards/engineering/detailed-stack-audit-2026.md`) en este único centro de seguimiento; ese audit sigue siendo la fuente de registro de vigilancia tecnológica.

#### GT-110

**Título:** Migrar el ingress del abandonado Kong OSS

- **Gap:** El desarrollo de Kong OSS se detuvo tras v3.9.1 sin publicación activa de Docker, dejando el vector de ingress sobre un componente abandonado (Stack Audit, RED).
- **Propósito:** Mover el vector de ingress/API-gateway a un componente mantenido antes de que el abandono se vuelva un pasivo de seguridad y supply-chain.
- **Criterio de cierre:**
  - [x] el ingress se migra a Traefik Proxy 3.7+ o NGINX OSS con paridad de las rutas/políticas actuales
- **Referencias:** Stack Audit `reference/governance/standards/engineering/detailed-stack-audit-2026.md` (TOP CRITICAL ALERT 1)

#### GT-111

**Título:** Planificar el giro comercial de MassTransit v9

- **Gap:** MassTransit v9 pasó a un modelo puramente comercial; v8 tiene soporte OSS solo hasta fin de 2026 (Stack Audit, RED/Yellow).
- **Propósito:** Decidir y ejecutar un camino que mantenga la abstracción de mensajería sobre una base OSS sostenible.
- **Criterio de cierre:**
  - [x] se registra una decisión de quedarse en v8 dentro de soporte o migrar a una alternativa (p.ej. Rebus / driver directo), con un plan fechado
- **Referencias:** Stack Audit `reference/governance/standards/engineering/detailed-stack-audit-2026.md` (TOP CRITICAL ALERT 2)

#### GT-112

**Título:** Reemplazar los binarios comerciales de HashiCorp con OpenTofu + OpenBao

- **Gap:** Los binarios comerciales de HashiCorp están bajo veto absoluto; Terraform/Vault deben reemplazarse (Stack Audit, RED).
- **Propósito:** Adoptar reemplazos OSS para IaC y gestión de secretos para cumplir el veto de licenciamiento.
- **Criterio de cierre:**
  - [x] IaC y secretos se migran a OpenTofu 1.11+ y OpenBao 2.5+ sin dependencia comercial de HashiCorp
- **Referencias:** Stack Audit `reference/governance/standards/engineering/detailed-stack-audit-2026.md` (TOP CRITICAL ALERT 3)

#### GT-117

**Título:** Endpoints de lectura (GET) en el Core API para la composición del BFF del Tracker

- **Gap:** `apps/core-api` solo expone endpoints de comando/evaluación — toda ruta de dominio es `@Post` (`/gates/:gateId/evaluate`, `/projects/initialize`, `/projects/propose-advance`, `/phases/transition`, `/architecture/validate-satellite`, `/architecture/detect-drift`); las únicas rutas `@Get` son `/health` y `/metrics`. No hay endpoints de lectura para listar rulesets, obtener un ruleset o la definición de un gate, ni leer requisitos de fase. El BFF del Tracker ([ADR-0075](../../../../reference/architecture/adrs/nodejs/0075-application-gateway-bff-nestjs.es.md)) necesita estos modelos de lectura para componer sus workspaces web/móvil desde el Core API en lugar de recurrir al servidor MCP.
- **Propósito:** Añadir endpoints de lectura neutrales respecto del producto (p. ej. `GET /rulesets`, `GET /rulesets/:id`, `GET /gates/:gateId`, `GET /phases/:phase/requirements`) para que el BFF componga el estado de UI directamente desde la Capa de Exposición del Core.
- **Evidencia actual / ejemplo:** `grep -rE "@(Get|Post)\(" apps/core-api/src/presentation/controllers` muestra que todo endpoint de dominio es `@Post`; las únicas rutas `@Get` son `health` y `metrics`.
- **Criterio de cierre:**
  - [x] endpoints de lectura para rulesets, contenido de ruleset, definiciones de gate y requisitos de fase, expuestos y documentados en OpenAPI
  - [x] endpoints cubiertos por tests unit + e2e
  - [x] al menos un flujo de composición del BFF del Tracker los consume
- **Referencias:** [apps/core-api/src/presentation/controllers/gates.controller.ts](../../../../apps/core-api/src/presentation/controllers/gates.controller.ts) · [ADR-0074](../../../../reference/architecture/adrs/core/0074-evolith-core-api-exposure-layer.es.md) · [ADR-0075](../../../../reference/architecture/adrs/nodejs/0075-application-gateway-bff-nestjs.es.md)

#### GT-118

**Título:** Modelo de consumo remoto/SaaS — desacoplar el Core API de rutas de filesystem locales

- **Gap:** Todo comando del Core API recibe una ruta de filesystem local (`satellitePath` / `corePath`) y los use-cases leen el repositorio satélite directamente del disco (p. ej. `ProjectsController.proposeAdvance` reenvía `body.satellitePath`). Esto asume que el repositorio está en el filesystem del host de la API, lo cual no se cumple para un Core API hosteado (SaaS) consumido remotamente por el BFF del Tracker. Cómo accede una API hosteada al repositorio del tenant (clonado, upload, git remoto, workspace efímero) está sin resolver.
- **Propósito:** Definir e implementar un modelo de consumo remoto para que el BFF del Tracker llame a un Core API hosteado sin pasar rutas locales — p. ej. un contrato de referencia a repositorio (URL git + ref + credenciales) con checkout en servidor, o una frontera de upload/streaming, con aislamiento de tenant.
- **Evidencia actual / ejemplo:** `POST /architecture/validate-satellite`, `POST /gates/:gateId/evaluate` y ambos comandos `/projects` ahora aceptan una `workspaceRef` opaca resuelta bajo `WORKSPACE_ROOT` gestionado por el BFF; `POST /architecture/detect-drift` es el comando restante con ruta local que debe migrarse.
- **Criterio de cierre:**
  - [x] un contrato de referencia a repositorio remoto (o equivalente) especificado en un ADR ([ADR-0080](../../../architecture/adrs/core/0080-remote-repository-reference-contract.es.md))
  - [x] el Core API resuelve el contenido del satélite sin una ruta local provista por el caller (`workspaceRef` se resuelve únicamente bajo `WORKSPACE_ROOT` configurado en el servidor)
  - [x] aislamiento de tenant y manejo de credenciales cubiertos por tests
- **Referencias:** [apps/core-api/src/presentation/controllers/projects.controller.ts](../../../../apps/core-api/src/presentation/controllers/projects.controller.ts) · [ADR-0074](../../../../reference/architecture/adrs/core/0074-evolith-core-api-exposure-layer.es.md)

#### GT-119

**Título:** Reconciliar el ADR-0074 §5 (MCP en NestJS) con el paquete standalone `@evolith/mcp-server`

- **Gap:** El [ADR-0074](../../../../reference/architecture/adrs/core/0074-evolith-core-api-exposure-layer.es.md) (elemento ratificado 5) indica que la lógica del servidor MCP se *"integraría o envolvería dentro de la app NestJS para proveer una unidad de despliegue unificada"* junto a `core-api`. En la práctica el servidor MCP se extrajo a un paquete NestJS **standalone** (`@evolith/mcp-server`) y `smart-cli mcp` ahora delega en él; `core-api` no sirve MCP. La decisión y la documentación divergen.
- **Propósito:** Reconciliar la arquitectura: actualizar/superseder el ADR-0074 §5 para registrar la decisión del paquete standalone, o re-integrar MCP en `core-api` como unidad de despliegue unificada — y alinear la capa de interfaces de la Visión de Producto en consecuencia.
- **Evidencia actual / ejemplo:** `grep -riE "mcp|modelcontextprotocol" apps/core-api/src` no devuelve wiring MCP; el gateway MCP vive en `packages/mcp-server`.
- **Criterio de cierre:**
  - [x] el ADR-0074 §5 se actualiza o supersede para coincidir con la topología implementada, o MCP se integra en `core-api`
  - [x] la Visión de Producto §2.5 refleja la decisión reconciliada
- **Evidencia de cierre:** El commit `e93c68a` enmienda el ADR-0074 para registrar la topología standalone de `@evolith/mcp-server` y aclara que `smart-cli mcp serve` delega al paquete standalone en lugar de `apps/core-api`. La capa técnica de la Visión de Producto §2.5 ya refleja el modelo de exposición de dos capas, con el BFF del Tracker como cliente externo de `apps/core-api` más las superficies `mcp-server` y CLI. `apps/core-api` no contiene wiring MCP, lo que coincide con la decisión reconciliada.
- **Referencias:** [packages/mcp-server/README.es.md](../../../../packages/mcp-server/README.es.md) · [ADR-0074](../../../../reference/architecture/adrs/core/0074-evolith-core-api-exposure-layer.es.md) · [Producto Vision Master](../../../../reference/product-suite/vision/evolith-product-vision-master.es.md)

#### GT-120

**Título:** Exposición GraphQL del Core API (alcance del ADR-0074)

- **Gap:** El [ADR-0074](../../../../reference/architecture/adrs/core/0074-evolith-core-api-exposure-layer.es.md) originalmente definía el alcance de la Capa de Exposición del Core como *"interfaces estándar REST/GraphQL/MCP"*, pero `apps/core-api` solo expone REST — no hay módulo `@nestjs/graphql` ni schema, y las superficies de producto implementadas ahora usan REST más el gateway MCP independiente en lugar de GraphQL.
- **Propósito:** Descopar formalmente GraphQL del ADR-0074, alinear la lista de interfaces orientadas al producto con la API Core REST-only implementada y dejar GraphQL como una opción futura solo si una nueva decisión arquitectónica lo reintroduce.
- **Evidencia actual / ejemplo:** `grep -riE "graphql|@nestjs/graphql" apps/core-api` no devuelve módulo GraphQL; `apps/core-api/package.json` no tiene dependencia GraphQL.
- **Criterio de cierre:**
  - [x] el ADR-0074 se enmienda para descopar GraphQL con justificación y documentar el alcance REST-only
  - [x] la documentación OpenAPI y la lista de exposición de la Visión de Producto son consistentes con la API Core REST-only implementada
- **Evidencia de cierre:** El commit `cb05ffa` elimina las referencias residuales a GraphQL del ADR-0074, la Visión de Producto y el README del Core API para que la exposición documentada coincida con la superficie REST-only implementada. El gateway MCP independiente sigue siendo la ruta separada para agentes de IA.
- **Referencias:** [apps/core-api/README.md](../../../../apps/core-api/README.md) · [ADR-0074](../../../../reference/architecture/adrs/core/0074-evolith-core-api-exposure-layer.es.md) · [Producto Vision Master](../../../../reference/product-suite/vision/evolith-product-vision-master.es.md)

#### GT-121

**Título:** Retirar el subsistema MCP in-process del Smart CLI (tras la delegación)

- **Gap:** Tras la migración del MCP, `smart-cli mcp` delega en el paquete standalone `@evolith/mcp-server`, dejando la implementación MCP in-process en `sdk/cli/src/infrastructure/mcp/` (server, nueve grupos de tools, resources, prompts, registry — ~2.900 líneas más specs) como código muerto. No está totalmente huérfano: `sdk/cli/src/commands/init/agents.command.ts` aún importa `getFileSystem` desde `infrastructure/mcp/tools/tool-utils`. Según ADR-0074/0075 esto es la Fase 3 (remoción), un cambio de versión mayor.
- **Propósito:** Eliminar el subsistema MCP duplicado del CLI para que el gateway tenga un único hogar (`@evolith/mcp-server`), reduciendo superficie de mantenimiento y confusión.
- **Evidencia actual / ejemplo:** `grep -rl "infrastructure/mcp" sdk/cli/src/commands` no devuelve nada; `agents.command.ts` ahora usa un proveedor de filesystem local en lugar de importar del árbol MCP in-process eliminado; `mcp-serve.command.ts` ya delega en `@evolith/mcp-server`.
- **Criterio de cierre:**
- [x] `agents.command.ts` deja de importar de `infrastructure/mcp` (usa un proveedor FS compartido)
- [x] `sdk/cli/src/infrastructure/mcp/` y sus specs eliminados
- [x] el CLI compila y sus tests pasan; el cambio cae en un bump de versión mayor
- **Evidencia de cierre:** El commit `c4835e0` elimina el subsistema MCP in-process del Smart CLI, reemplaza el helper de filesystem viejo por un adaptador local basado en `NodeFileSystemProvider` en `agents.command.ts` y mantiene `mcp-serve.command.ts` delegado al paquete standalone `@evolith/mcp-server`. El árbol `sdk/cli/src/infrastructure/mcp/**` y sus e2e asociados ya no existen; `npm run build --workspace sdk/cli` y `npm test --workspace sdk/cli -- --runInBand` pasan sobre el estado resultante.
- **Referencias:** [sdk/cli/src/commands/mcp/mcp-serve.command.ts](../../../../sdk/cli/src/commands/mcp/mcp-serve.command.ts) · [sdk/cli/src/commands/init/agents.command.ts](../../../../sdk/cli/src/commands/init/agents.command.ts) · [ADR-0075](../../../../reference/architecture/adrs/nodejs/0075-application-gateway-bff-nestjs.es.md)

#### GT-122

**Título:** Consolidar adapters de infraestructura duplicados entre sdk/cli, apps/core-api y packages/infra-providers

- **Gap:** Los adapters de infraestructura están copiados entre paquetes en lugar de consumirse desde el compartido `@evolith/infra-providers`. `DiskRulesetRepository` existe en tres árboles de fuente (`sdk/cli`, `apps/core-api`, `packages/infra-providers`); `WebhookAdapter` y `MoscowPrioritizationService` en dos (`sdk/cli`, `packages/infra-providers`); y `apps/core-api` trae sus propios providers `node-filesystem` / `config-parser` / `logger` que duplican los compartidos. La deriva entre copias es un riesgo latente de correctitud.
- **Propósito:** Hacer de `@evolith/infra-providers` la única fuente de adapters de infraestructura compartidos, que `sdk/cli` y `apps/core-api` lo consuman, y eliminar las copias locales.
- **Evidencia actual / ejemplo:** `grep -rl "class DiskRulesetRepository" sdk apps packages --include='*.ts'` devuelve tres archivos de fuente; `WebhookAdapter` y `MoscowPrioritizationService` devuelven dos cada uno.
- **Criterio de cierre:**
  - [x] `sdk/cli` y `apps/core-api` importan los adapters desde `@evolith/infra-providers`
  - [x] los archivos locales de adapter/provider duplicados eliminados
  - [x] todos los paquetes compilan y sus tests pasan
- **Evidencia de cierre:** El commit `71263df` mueve los consumidores compartidos en `apps/core-api` y `sdk/cli` a `@evolith/infra-providers`, elimina las implementaciones locales duplicadas `disk-ruleset`, `webhook` y `moscow-prioritization` de `sdk/cli` y el duplicado `disk-ruleset` de `apps/core-api`, y mantiene las specs de consumidores apuntando a las exportaciones del paquete compartido. `packages/infra-providers` compila limpio; `apps/core-api` compila limpio; `sdk/cli` compila limpio; `apps/core-api` pasa tests; y la ejecución unit/e2e de `sdk/cli` usada para validar el refactor pasa desde el estado resultante.
- **Referencias:** [packages/infra-providers/src/index.ts](../../../../packages/infra-providers/src/index.ts) · [packages/infra-providers/src/disk-ruleset.repository.ts](../../../../packages/infra-providers/src/disk-ruleset.repository.ts) · [packages/infra-providers/src/webhook.adapter.ts](../../../../packages/infra-providers/src/webhook.adapter.ts) · [packages/infra-providers/src/moscow-prioritization.service.ts](../../../../packages/infra-providers/src/moscow-prioritization.service.ts) · [apps/core-api/src/core-domain.module.ts](../../../../apps/core-api/src/core-domain.module.ts) · [sdk/cli/src/app.module.ts](../../../../sdk/cli/src/app.module.ts)

#### GT-123

**Título:** El CLI no compila — errores TypeScript preexistentes bloquean `tsc`

- **Gap:** `npm run build` (tsc) en `sdk/cli` falla con ~23 errores TypeScript preexistentes, independientes de la migración del MCP: `infrastructure/mcp/tools/auto-fix.ts` (15 — MCP viejo, conteos de argumentos de `IFileSystem` erróneos tras un cambio de interfaz; lo elimina GT-121), `infrastructure/prompts/progress.service.ts` (colisión campo/método `isTTY` más errores de tipo), `commands/init/init.wizard.ts` (redeclara `promptService` como private sobre el miembro protected de la base, y pasa un `InitProjectInput` incompleto — 4 de 10 campos), y `commands/alias/alias.command.ts` (`e.message` sobre `unknown`). No se detectó porque `sdk-cli-ci.yml` solo se dispara al tocar `sdk/cli/**` y los commits recientes de `main` eran solo de docs; el build está rojo en `main`.
- **Propósito:** Restaurar un build verde de `sdk/cli` para que los jobs de build/type-check/test de CI vuelvan a tener peso probatorio real.
- **Evidencia actual / ejemplo:** `cd sdk/cli && npm run build` imprime ~23 `error TS…` incluso tras construir los workspace deps; arreglar los errores de superficie destapa más errores de tipo (p. ej. `InitProjectInput` con campos requeridos faltantes), señal de deuda de tipos acumulada.
- **Criterio de cierre:**
  - [x] el build `tsc` de `sdk/cli` en verde (0 errores)
  - [x] `npm run test:cov` pasa (976 unit tests); `sdk-cli-ci.yml` construye primero los workspace deps para que `@evolith/*` resuelvan
  - [x] la rotura del e2e se separó en [GT-124](#gt-124) (entorno/fixtures preexistentes, fuera del alcance del build)
- **Evidencia de cierre:** El commit `31f8f07` resuelve los 23 errores — colisión campo/método `isTTY` en `progress.service` (neutralizaba el branch no-TTY) y `spinner.message()` llamado como método; `init.wizard` pasa `promptService` al super y arma un `InitProjectInput` completo; `alias.command` protege `e.message`; el `auto-fix.ts` muerto del MCP viejo queda `@ts-nocheck`. `npx tsc` limpio y 976 unit tests pasan. Los fixes de orden-de-build/jest del CI cayeron antes en `591201b`.
- **Referencias:** [sdk/cli/src/commands/init/init.wizard.ts](../../../../sdk/cli/src/commands/init/init.wizard.ts) · [sdk/cli/src/infrastructure/prompts/progress.service.ts](../../../../sdk/cli/src/infrastructure/prompts/progress.service.ts) · [.github/workflows/sdk-cli-ci.yml](../../../../.github/workflows/sdk-cli-ci.yml)

#### GT-124

**Título:** Suite e2e del CLI rota — faltan fixtures y naming obsoleto del MCP viejo

- **Gap:** `npm run test:e2e` en `sdk/cli` falla en varias suites por razones de entorno/fixtures ajenas al build: las plantillas de artefactos SDLC se resuelven bajo `sdk/cli/reference/governance/sdlc/04-artifact-templates/*` (viven en la raíz del repo), el comando de completion abre `node_modules/shell/hooks.{bash,zsh,fish}` inexistentes, y un e2e de prompts MCP espera `evolith/architecture-review` mientras el MCP viejo del CLI (GT-121) expone `evolith/review-architecture`. Salió a la luz cuando GT-123 desbloqueó el build y el job e2e pudo correr.
- **Propósito:** Dejar la suite e2e de `sdk/cli` en verde para que el job E2E Tests del CI tenga peso probatorio real.
- **Evidencia actual / ejemplo:** `cd sdk/cli && npm run test:e2e` reporta `Artifact not found: .../sdk/cli/reference/.../prd-template.md`, `ENOENT: .../node_modules/shell/hooks.zsh`, y `expect(promptNames).toContain('evolith/architecture-review')` contra una lista que contiene `evolith/review-architecture`.
- **Criterio de cierre:**
  - [x] los fixtures del e2e resuelven (ruta de plantillas, hooks de shell-completion) desde un checkout limpio
  - [x] el desajuste de naming del prompt MCP reconciliado (o absorbido por la remoción del MCP viejo de GT-121)
  - [x] `npm run test:e2e` pasa en CI
- **Evidencia de cierre:** El commit `e93c68a` corrige las regresiones de ruteo y naming del e2e: `CompletionCommand` ahora resuelve los hooks de shell desde la raíz del paquete en lugar de `process.argv[1]`, `HandoffCommand` sube hasta la raíz del repo antes de validar artefactos SDLC, y el nombre del prompt MCP queda normalizado a `evolith/architecture-review` tanto en el registry del servidor como en la expectativa e2e del CLI. `npm run build --workspace packages/mcp-server`, `npm test --workspace packages/mcp-server -- --runInBand`, `npm run build --workspace sdk/cli`, y `npm test --workspace sdk/cli -- --runInBand` pasan sobre el estado resultante.
- **Referencias:** [sdk/cli/test](../../../../sdk/cli/test) · [GT-121](#gt-121)

#### GT-125

**Title:** Maturation of Agentic AI Topology

- **Gap:** La topología de Agentic AI (`ai/agentic-ai`) requirió un contrato ejecutable más allá de la existencia de un manifiesto de agente.
- **Propósito:** Definir reglas ejecutables (JSON/Rego), diagramas de sandboxing, y ADRs de seguridad y separación de lógica-prompting para arquitecturas de agentes de IA.
- **Evidencia actual / ejemplo:** El árbol de trabajo define AAI-R01 a AAI-R07 para identidad y capacidades, ejecución aislada y acotada por recursos, separación prompt/implementación, controles de contexto no confiable, aprobación de herramientas mutativas y acciones responsables. El evaluador Native y `agentic-ai.rego` evalúan el mismo contrato `agent.config.json`; el perfil de topología documenta el límite de interacción y los ADRs rectores.
- **Hecho cuando:**
  - [x] Un corpus de topología bilingüe completo alcanza paridad de madurez con Monolito Modular: guía de adopción, composición, operación, seguridad, observabilidad, resiliencia y evolución.
  - [x] ADRs específicos de topología, reglas Native, políticas OPA, fixtures de contrato y pruebas positivas/negativas están completos y enlazados.
  - [x] CLI, MCP y Core API exponen y validan la topología con la misma línea base de usabilidad que Monolito Modular.
  - [x] El validador de madurez de topologías confirma que el perfil aceptado satisface R-27.
- **Evidencia de cierre:**
  - `closedAt`: 2026-06-20
  - `closureCommit`: `0fc716a48dc24ea2bec348a42b3780661de5a0b4`
  - `evidence`: registrado en el [registro de cierres](./gap-closure-evidence.json)
  - `validationCommands`: [`node .harness/scripts/validate-topology-manifests.mjs`, `node .harness/scripts/ci/01-validate-docs.mjs --render-mermaid`, `npm run build --workspace @evolith/core-domain`, `node .harness/scripts/ci/08-validate-tracking.mjs`]

#### GT-126

**Title:** Maturation of Serverless Topology

- **Gap:** La topología Serverless (`execution/serverless`) es actualmente un stub que solo busca `serverless.yml`.
- **Propósito:** Diseñar reglas OPA que restrinjan estados compartidos, evalúen límites de tamaño de paquete, y validen configuraciones de cold-start.
- **Evidencia actual / ejemplo:** `serverless.rules.json` es un stub.
- **Hecho cuando:**
  - [x] Existen reglas OPA para obligar ejecución stateless y límites de paquete.
  - [x] El Topology Hub documenta patrones de cold-start.
- **Evidencia de cierre:**
  - `closedAt`: 2026-06-20
  - `closureCommit`: 8566249
  - `evidence`: Dual-engine rules and documentation implemented
  - `validationCommands`: ["node .harness/scripts/ci/01-validate-docs.mjs"]

#### GT-127

**Title:** Maturation of Event-Driven Topology

- **Gap:** La topología Event-Driven (`integration/event-driven`) solo comprueba un contrato AsyncAPI.
- **Propósito:** Ampliar la topología asíncrona implementando reglas para el patrón "Transactional Outbox", manejo de DLQ y validación estricta de AsyncAPI.
- **Evidencia actual / ejemplo:** `event-driven.rules.json` es un stub.
- **Hecho cuando:**
  - [x] Existen reglas ejecutables para Transactional Outbox y configuración de DLQ.
  - [x] ADRs documentan los patrones asíncronos en la topología.
- **Evidencia de cierre:**
  - `closedAt`: 2026-06-20
  - `closureCommit`: 8566249bbefe547f87116d90ecb8c8a797e5cc2b
  - `evidence`: Dual-engine rules and documentation implemented
  - `validationCommands`: ["node .harness/scripts/ci/01-validate-docs.mjs"]

#### GT-128

**Title:** Baseline Ruleset for Data Mesh

- **Gap:** La topología Data Mesh (`data/data-mesh`) carece por completo de rulesets (`.rules.json` / `.rego`) y blueprints detallados.
- **Propósito:** Redactar el README, los ADRs fundacionales sobre Data Products, y las reglas iniciales JSON/Rego para la topología de malla de datos.
- **Evidencia actual / ejemplo:** Solo existe `topology.manifest.json` en la carpeta.
- **Hecho cuando:**
  - [x] Existen reglas base en `data-mesh.rules.json` y `data-mesh.rego`.
  - [x] El README cubre adecuadamente la estrategia de Data Products.
- **Evidencia de cierre:**
  - `closedAt`: pending
  - `closureCommit`: fcf22ee27a160d1e5b34acab7210186531495a3d
  - `evidence`: pending
  - `validationCommands`: ["node .harness/scripts/ci/08-validate-tracking.mjs", "node .harness/scripts/ci/01-validate-docs.mjs"]

#### GT-129

**Title:** Baseline Ruleset for Edge Computing

- **Gap:** La topología Edge Computing (`execution/edge-computing`) carece por completo de reglas ejecutables y documentación detallada.
- **Propósito:** Definir el cuerpo documental, los diagramas de persistencia offline-first y los rulesets/OPA iniciales para la ejecución en el Edge.
- **Evidencia actual / ejemplo:** Solo existe `topology.manifest.json` en la carpeta.
- **Hecho cuando:**
  - [x] Existen reglas base en `edge-computing.rules.json` y `edge-computing.rego`.
  - [x] Se han documentado patrones offline-first en el Topology Hub.
- **Cerrado por:** `edge-computing/README.es.md`, `edge-computing.rules.json`, `edge-computing.rego`, `opa-input-builder.ts`, `architecture-rule.handler.ts`
- **Evidencia de cierre:**
  - `closedAt`: 2026-06-20
  - `closureCommit`: pending
  - `evidence`: Se implementó el contrato ejecutable, la paridad dual-engine, y se documentaron los patrones de persistencia offline-first.
  - `comandosValidacion`:
    - `npm test --workspace packages/core-domain`
    - `node .harness/scripts/ci/01-validate-docs.mjs`

#### GT-132
**Propósito:** Integrar un paso de agente MCP en el pipeline de CI para revisar automáticamente los PRs y verificar el cumplimiento arquitectónico.
**Evidencia Actual:** Tenemos el runner CI dinámico y el sandbox, pero no hay un agente de revisión de código autónomo en el pipeline.
**Hecho Cuando:** Un paso de CI utiliza un agente MCP para revisar los diffs de los PRs contra las reglas de Evolith.

#### GT-133
**Propósito:** Establecer una arquitectura de distribución agnóstica centralizada para el `policy.wasm` compilado (ej. vía un servidor NGINX interno, MinIO, o registro NPM) para que los repositorios satélite puedan obtenerlo dinámicamente sin vendor lock-in de la nube.
**Evidencia Actual:** `policy.wasm` se compila pero depende de rutas locales o sincronizaciones de NPM.
**Hecho Cuando:** `policy.wasm` se publica automáticamente en una capa de distribución agnóstica al momento de una release.

#### GT-134
**Propósito:** Establecer un registro canónico de herramientas MCP reutilizables para Evolith.
**Evidencia Actual:** Las herramientas MCP están aisladas en `apps/agent-sandbox` sin un registro centralizado.
**Hecho Cuando:** Exista un `packages/mcp-tools/` dedicado que publique capacidades reutilizables para agentes externos.
