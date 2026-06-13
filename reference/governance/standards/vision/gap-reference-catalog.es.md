# Evolith Core — Catálogo de Referencia de Gaps

> **Navegación Bilingüe:** [English Version](./gap-reference-catalog.md)

**Responsable:** Evolith Architecture Board
**Autoridad de Estado:** [Tablero de Seguimiento de Gaps](./gap-tracking.es.md)
**Autoridad de Cierre:** [Estándar de Evidencia para Cierre de Gaps](./gap-closure-evidence-standard.es.md) · [`gap-closure-evidence.json`](./gap-closure-evidence.json)

Este catálogo explica cada gap: problema, propósito, evidencia, criterios de cierre y referencias. No es un tablero de seguimiento; la prioridad y el estado son autoritativos únicamente en el [Tablero de Seguimiento de Gaps](./gap-tracking.es.md).

---

## 1. Detalle de Gaps

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
- **Evidencia actual:** `WebhookAdapter` y el port notifier existen en el working tree; el cierre de integración depende del baseline verde y un test con listener receptor.
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
- **Referencias:** [Reglas Globales R-25](../../../../.harness/rules/global-rules.es.md) · [Ruleset F1](../../../../rulesets/architecture/f1-modular-monolith.rules.json) · [Política de Arquitectura OPA](../../../../rulesets/opa/architecture.rego)

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
- **Referencias:** [Estándar de Evidencia para Cierre de Gaps](./gap-closure-evidence-standard.es.md) · [Registro de Cierres](./gap-closure-evidence.json) · [Validador de Tracking](../../../../.harness/scripts/validate-tracking.mjs) · [Tracking de Gaps](./gap-tracking.es.md)

#### GT-41

**Título:** Reconciliación automática de madurez

- **Gap:** Los reportes de madurez, inventarios y el tablero vivo de gaps pueden divergir porque sus estados y totales se mantienen como afirmaciones narrativas separadas.
- **Propósito:** Mantener decisiones de prioridad e inversión alineadas con evidencia actual del repositorio, releases y producto.
- **Evidencia actual / ejemplo:** La evaluación de madurez aún referencia gaps abiertos y conteos reemplazados mientras el tablero reporta su cierre, creando visiones contradictorias de readiness.
- **Límite de ownership:** Core reconcilia únicamente la evidencia que posee. La madurez de Tracker y Product Suite permanece como input externo y nunca debe inflar el score de Core.
- **Cierre cuando:** un reporte generado o reconciliado consume el tablero canónico de Core, inventarios y evidencia de tests y releases; expone timestamps de vigencia, separa Core de la madurez externa de productos y falla ante estados, conteos o enlaces de evidencia obsoletos.
- **Evidencia de cierre:** El commit Core `154aadf` incorporó reconciliación machine-readable generada, tests de regresión, checks de drift en pre-commit y CI, y eliminó los totales vigentes mantenidos manualmente en la evaluación narrativa. La madurez de productos externos se excluye explícitamente.
- **Evidencia de reapertura (2026-06-13):** El snapshot generado reporta todos los gaps completos mientras cuatro workflows del mismo commit de `main` están rojos. Registra nombres de comandos, no resultados de tests, release, npm, suites omitidas o CI, y la evaluación narrativa conserva estados de capacidad reemplazados.
- **Verificación post-push (2026-06-13):** El run [Documentation Validation 27467157149](https://github.com/beyondnetcode/evolith_arch32/actions/runs/27467157149) valida 823 documentos y la paridad bilingüe, pero falla la reconciliación semántica porque el checkout superficial no contiene los commits de cierre registrados. La reconciliación todavía no modela la disponibilidad ni el resultado de esa evidencia en CI. Estado: `PENDIENTE`.
- **Referencias:** [Evaluación de Madurez](./maturity-assessment.es.md) · [Reconciliación de Madurez](./maturity-reconciliation.json) · [Resumen de Inventario](./inventory-summary.es.md) · [Validador de Reconciliación](../../../../.harness/scripts/reconcile-maturity.mjs)

#### GT-42

**Título:** Conformidad contractual entre repositorios

- **Gap:** Core, CLI y Tracker pueden evolucionar sus contratos de evidencia y decisión independientemente sin probar compatibilidad entre productores y consumidores.
- **Propósito:** Asegurar que las evaluaciones técnicas sigan siendo consumibles por el Tracker autoritativo durante releases independientes de los repositorios.
- **Evidencia actual / ejemplo:** Existen ADRs contractuales y schemas JSON, pero no una matriz de compatibilidad entre repositorios ni una suite CI que ejecute juntas las versiones soportadas de productores y consumidores.
- **Cierre cuando:** schemas versionados compartidos o referencias contractuales fijadas definen la política de compatibilidad; contract tests de productor y consumidor se ejecutan entre Core, CLI y Tracker; CI verifica la matriz de últimas versiones soportadas y bloquea cambios incompatibles.
- **Evidencia de cierre:** El commit Core `154aadf` incorporó el manifiesto versionado, digests inmutables de schemas, fixtures, tests de conformidad y enforcement en CI. El commit Tracker `4256e7b` fijó el contrato soportado y agregó su workflow consumidor contra Core.
- **Referencias:** [ADR-0073 Contrato Unificado de Salida del CLI](../../../architecture/adrs/core/0073-unified-cli-output-contract.es.md) · [Manifiesto Contractual](../../../../rulesets/contracts/evolith-machine-contracts.json) · [Política de Conformidad](../../../../rulesets/contracts/README.es.md) · [Validador de Conformidad](../../../../.harness/scripts/validate-contract-conformance.mjs)

#### GT-44

**Título:** Integridad determinista del pipeline de release

- **Gap:** Los workflows aplican checks de versión exclusivos de release a merges ordinarios, referencian `pkg.bin.evolith` aunque el paquete expone `smart-cli`, descargan artefactos binarios que nunca se suben y ocultan un fallo del smoke de init con `|| true`.
- **Propósito:** Hacer los releases npm y binarios reproducibles, bloqueantes y confiables.
- **Evidencia actual / ejemplo:** El run [27451600153](https://github.com/beyondnetcode/evolith_arch32/actions/runs/27451600153) falló en `4a30a85`; npm confirma que `@evolith/smart-cli@1.1.0` existe, pero el camino de release actual no está saludable.
- **Verificación post-push (2026-06-13):** El run [Release Pipeline 27467157147](https://github.com/beyondnetcode/evolith_arch32/actions/runs/27467157147) vuelve a fallar en `main`; además, su notificación intenta crear un issue sin permiso `issues: write` y termina con HTTP 403. Estado: `PENDIENTE`.
- **Cierre cuando:** los checks de release respetan el evento; la identidad del paquete y binarios proviene de `package.json`; cada target se sube, descarga, ejecuta y adjunta; los smoke failures no se ignoran; la notificación tiene permisos válidos o degrada con seguridad.
- **Referencias:** [Workflow de Release del CLI](../../../../.github/workflows/sdk-cli-release.yml) · [CI/CD General](../../../../.github/workflows/ci-cd.yml)

#### GT-45

**Título:** Suite de conformidad de transporte y tools MCP

- **Gap:** El smoke de Streamable HTTP está activo, pero suites de HTTP, API key, routing de mensajes y múltiples tools MCP permanecen deshabilitadas con `describe.skip`; algunas aún apuntan al transporte mínimo eliminado.
- **Propósito:** Probar exposición consistente de Core por stdio y Streamable HTTP, incluyendo autenticación, errores, resources, prompts y tools registradas.
- **Cierre cuando:** tests obsoletos se eliminan o reescriben; ninguna suite MCP relevante para release está omitida; casos negativos de protocolo corren en CI; tools y schemas runtime coinciden con el inventario generado.
- **Evidencia de cierre:** El commit `b07460d` eliminó 547 líneas de tests obsoletos del transporte mínimo, activó 47 tests de tools de agentes/arquitectura/SDLC, agregó un gate de conformidad de schemas runtime y ausencia de suites omitidas, corrigió la inyección runtime de filesystem/config parser, y validó 29 casos E2E MCP más smoke stdio/Streamable HTTP para 21 tools, 7 resources y 7 prompts.
- **Verificación post-push (2026-06-13):** Los workflows rojos del commit de cierre fallan durante checkout, cache o instalación, antes de ejecutar la conformidad MCP. No existe evidencia contradictoria con las suites locales de cierre; los bloqueos de reproducibilidad y release permanecen asignados a GT-28, GT-41 y GT-44. Estado: `COMPLETADO`.
- **Referencias:** [Servidor MCP](../../../../sdk/cli/src/infrastructure/mcp/server.ts) · [Tests E2E MCP](../../../../sdk/cli/test/e2e/mcp-e2e.test.ts)

#### GT-46

**Título:** Límite de ownership del servicio HTTP de Core

- **Gap:** `smart-cli api` expone un mock en memoria de “Evolith Tracker Assistant” con CORS irrestricto y sin contrato gobernado de Core, aunque este repositorio solo debe contener servicios que exponen Core.
- **Propósito:** Evitar que comportamiento de producto Tracker se filtre en la distribución Core, preservando una API stateless válida de Core si esa superficie se conserva.
- **Cierre cuando:** una decisión explícita elimina la API mock o la reemplaza por un contrato documentado, autenticado y stateless de exposición de Core; CORS es configurable y los endpoints retenidos tienen schemas y tests.
- **Evidencia de cierre:** El commit `b07460d` eliminó el comando `api`, el mock Tracker Assistant, sesiones chat en memoria, controller, módulo, repositorio e interfaces de dominio. El servicio de red retenido es la exposición MCP Streamable HTTP autenticada y cubierta por contract tests de Evolith Core.
- **Verificación post-push (2026-06-13):** La revisión de los fallos de CI no identifica regresiones ni una reintroducción de superficies Tracker en Core; todos ocurren antes de la validación funcional. El límite de ownership implementado permanece vigente. Estado: `COMPLETADO`.
- **Referencias:** [Composition Root del CLI](../../../../sdk/cli/src/app.module.ts) · [Servicio HTTP MCP](../../../../sdk/cli/src/infrastructure/mcp/server.ts)

#### GT-47

**Título:** Sincronización de documentación de producto y release

- **Gap:** Las docs de Smart CLI anuncian `0.0.3-beta`, MCP Services es un placeholder y el reporte de madurez dice que trabajo ya completado de transporte, contratos, gates y publicación continúa faltando.
- **Propósito:** Mantener la narrativa pública sincronizada con las superficies instalables Core/CLI/MCP.
- **Cierre cuando:** un inventario generado suministra versión del paquete, comandos, tools, resources, prompts, transportes, schemas y evidencia de tests a docs EN/ES y madurez; CI rechaza drift y páginas placeholder.
- **Referencias:** [Producto Smart CLI](../../../products/smart-cli/README.es.md) · [Producto MCP Services](../../../products/mcp-services/README.es.md)

#### GT-48

**Título:** Restaurar el umbral normativo de cobertura del CLI

- **Gap:** Al restaurar la instalación limpia del workspace, el gate bloqueante de cobertura expuso 66.14% de statements frente al umbral normativo de 80%. La evidencia histórica de madurez todavía afirma 88.70%, por lo que el resultado ejecutable y la narrativa de producto divergen.
- **Propósito:** Recuperar protección significativa contra regresiones sin reducir el umbral aceptado ni excluir código productivo solo para mejorar la métrica.
- **Evidencia actual / ejemplo:** `npm run test:cov --workspace @evolith/smart-cli -- --coverageReporters=json-summary` pasa 1,087 tests, pero reporta 4,083 de 6,173 statements cubiertos. El gate de CI ahora lee `.total.statements.pct`, alineado con el contrato del phase gate.
- **Cierre cuando:** la cobertura de statements alcanza al menos 80% desde un checkout limpio; los nuevos tests priorizan validators críticos de release, handlers de políticas, comandos CLI, rutas runtime MCP y providers de filesystem; CI bloquea regresiones y la evidencia de madurez se regenera desde el reporte vigente.
- **Referencias:** [Workflow CI del CLI](../../../../.github/workflows/sdk-cli-ci.yml) · [Configuración Jest](../../../../sdk/cli/jest.config.js) · [Estrategia de Testing](../../../products/smart-cli/docs/planning/testing-strategy.md)

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

---
[Volver al Tablero de Seguimiento](./gap-tracking.es.md) · [Volver al Índice de Visión](./README.es.md)
