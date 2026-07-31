# Evolith Core — Evaluación de Madurez

> **Navegación Bilingüe:** [English Version](./maturity-assessment.md)

**Estado:** Evaluación Activa
**Responsable:** Evolith Architecture Board
**Creado:** 2026-06-10 (consolida los antiguos `maturity-matrix.es.md` y `maturity-evaluation.es.md`)
**Última Actualización:** 2026-07-28
**Documento compañero:** [Tablero de Seguimiento de Gaps](../gaps/gap-tracking.es.md) — la única superficie de tracking para todo gap referenciado aquí.

---

## 1. Propósito y Frameworks

Esta es la **única evaluación de madurez** de Evolith Core. Es una **evaluación bidimensional** que mide dos aspectos ortogonales de la plataforma:

**Dimensión A — Madurez de Calidad Interna:** Qué tan bien está construido Evolith Core. Medido contra TOGAF ACMM, Cloud WAF, catálogos internacionales de patrones y niveles de madurez de adaptadores (secciones 3–7).

**Dimensión B — Madurez de Alcance de Gobernanza:** Qué tan amplio es el alcance de gobernanza arquitectónica de Evolith Core. Medido contra su propio modelo dimensional multi-topológico en 5 dimensiones y 8 topologías componibles, más madurez AI-Augmented (secciones 8–10).

Esta visión dual previene un fallo de evaluación común: una plataforma con alta calidad interna pero alcance de gobernanza estrecho es fundamentalmente diferente de una con la misma calidad y cobertura topológica de espectro completo. Evolith Core es esta última.

Específicamente, la evaluación mide:

1. **Compatibilidad con estándares internacionales** — TOGAF ACMM para madurez de gobernanza de procesos enterprise, pilares Cloud WAF para madurez técnica (sección 3), catálogo enterprise de patrones/anti-patrones (secciones 6–7) y madurez de capacidades de adaptadores (sección 5).
2. **Alcance de gobernanza multi-topología** — cobertura a través de las 5 dimensiones topológicas (progressive-axis, execution, integration, data, ai) con 8 topologías componibles. La paridad dual-engine se reporta por artefacto en la sección 8 (corpus del repositorio, paquete publicado, gate bloqueante) en vez de afirmarse como una única cifra global.
3. **Madurez AI-Augmented** — posición contra la matriz de madurez AI de 3 niveles × 5 dimensiones (sección 10).
4. **Match con la visión del producto** — alineación pilar por pilar contra la [Visión Maestra del Producto](../../../../product/suite/vision/evolith-product-vision-master.es.md) (sección 9).
5. **Gaps abiertos** — toda desviación encontrada aquí se registra exclusivamente como ítem `GT-xx` en el [Tablero de Seguimiento de Gaps](../gaps/gap-tracking.es.md) (sección 12). Ningún gap se trackea en este documento.

**Cómo actualizar:** re-puntúa una sección cuando cambie su evidencia subyacente (ADR mergeado, gate cerrado, ítem GT completado), actualiza `Última Actualización`, y mantén el registro de gaps en el tablero — nunca aquí.

---

## 2. Definición de Niveles de Madurez y Estados con Evidencia

La evaluación usa los 5 niveles estándar del ACMM (1: Inicial a 5: Optimizante). Para evitar mezclar capacidades diseñadas con las validadas, cada capacidad declara su **Estado basado en Evidencia**:

* **Visionado** (Peso 0.0) — Concepto o estrategia únicamente. Sin diseño formal.
* **Diseñado** (Peso 0.2) — Architecture Decision Record (ADR) aprobado, sin implementación de código.
* **Prototipado** (Peso 0.5) — Prueba de concepto o PR en borrador. No apto para producción.
* **Implementado** (Peso 0.8) — Mergeado en `main` y ejecutable, pero sin métricas operacionales completas o tests automáticos.
* **Validado** (Peso 1.0) — Pasa todos los quality gates, tests y está activo en CI/CD.
* **Escalado** (Peso 1.2+) — Multi-región, auto-escalado dinámicamente, o endurecido por chaos engineering.

*Sólo los estados "Validado" o "Escalado" otorgan el puntaje total del Nivel ACMM. Los estados "Diseñado" o "Implementado" imponen una penalización de incertidumbre en el puntaje agregado.*

Hasta [GT-596](../gaps/gap-reference-catalog.es.md#gt-596) esa escalera era toda la escala, y sus umbrales eran auto-fijados — así que nada impedía que un estado derivara hacia arriba, que es exactamente lo que [GT-576](../gaps/gap-reference-catalog.es.md#gt-576) tuvo que corregir a mano después de que dos pilares reclamaran `Validado` contra evidencia ausente del código. Los estados y sus pesos no cambian. Lo que cambia es que ahora se expresan contra una escala publicada con umbrales publicados, y que el logro detrás de una calificación lo **recalcula un gate** en vez de afirmarlo un autor.

### 2.1 Escala de calificación — ISO/IEC 33020:2019

*ISO/IEC 33020:2019, Information technology — Process assessment — Process measurement framework for assessment of process capability* (2ª edición, que reemplaza a la :2015) define la **escala de calificación de logro de atributos de proceso** que esta evaluación adopta. Cuatro calificaciones, cada una con su banda de logro publicada:

| Calificación | Nombre | Logro |
|:---:|---|---|
| `N` | Not achieved (No logrado) | 0% a 15% |
| `P` | Partially achieved (Parcialmente logrado) | más de 15% hasta 50% |
| `L` | Largely achieved (Ampliamente logrado) | más de 50% hasta 85% |
| `F` | Fully achieved (Completamente logrado) | más de 85% hasta 100% |

El estándar también define un refinamiento opcional que parte `P` y `L` en `P-`/`P+` y `L-`/`L+`. Esta evaluación **no** lo usa: cuatro bandas son tan finas como su evidencia puede sostener honestamente. El estándar es la autoridad sobre la escala; la tabla registra qué bandas se adoptaron para que un lector pueda revisar la aritmética sin tener una copia, y para que las bandas ya no puedan moverse en silencio.

### 2.2 Mapeo de los Estados basados en Evidencia sobre la escala

El peso que ya tenía cada estado es lo que lo ubica en una banda. El mapeo está fijado en código (`STATE_WEIGHT` e `ISO_33020_SCALE` en `.harness/scripts/ci/09-reconcile-maturity.mjs`), de modo que un estado no puede re-bandearse sólo en prosa.

| Estado basado en Evidencia | Peso | Logro que reclama | Calificación ISO/IEC 33020:2019 |
|---|:---:|:---:|:---:|
| **Visionado** | 0.0 | 0% | `N` — Not achieved |
| **Diseñado** | 0.2 | 20% | `P` — Partially achieved |
| **Prototipado** | 0.5 | 50% | `P` — Partially achieved |
| **Implementado** | 0.8 | 80% | `L` — Largely achieved |
| **Validado** | 1.0 | 100% | `F` — Fully achieved |
| **Escalado** | 1.2+ | 100% (tope) | `F` — Fully achieved |

`Prototipado` se apoya en el límite superior cerrado de `P`: 50% es `Partially achieved`, nunca `Largely achieved`. Ese límite es donde el sobre-reclamo ocurre con más facilidad, así que lo afirma un self-test en vez de dejarlo al criterio del lector.

### 2.3 Cómo se calcula el porcentaje de logro

> Una calificación no es una etiqueta. El porcentaje detrás de ella lo recalcula `.harness/scripts/ci/09-reconcile-maturity.mjs` desde la evidencia de la propia capacidad — nunca se escribe a mano.

La evidencia de una capacidad se lee como **indicadores**, uno por viñeta de evidencia (cuando una capacidad declara su evidencia en una sola línea, esa línea es su único indicador). Cada indicador se pondera por lo que lo respalda, reutilizando los pesos que este documento ya asigna a sus estados:

| Indicador respaldado por | Peso | Por qué ese peso |
|---|:---:|---|
| un `file:line` que un lector puede abrir, o un job de CI que puede ponerse rojo | 1.0 | el peso de `Validado` — la afirmación es ejecutable |
| un registro de decisión aprobado, y nada más | 0.2 | el peso de `Diseñado` — una decisión prueba intención, nunca implementación |
| prosa sin ninguna cita | 0.0 | el peso de `Visionado` |

**Logro = (suma de pesos de indicadores ÷ número de indicadores) × 100.** Los destinos de los enlaces markdown se eliminan antes de pesar un indicador, de modo que un enlace a un archivo de ADR nunca puede confundirse con una cita de archivo.

**La regla de umbral es de un solo lado.** Una calificación no puede afirmarse a menos que el logro recalculado **cruce el límite inferior de la banda que reclama**. Declarar una banda *por debajo* de lo que la evidencia sostiene siempre es legal — el sobre-reclamo es el fallo para el que existe esta regla, y el sub-reclamo es cómo una degradación conservadora como la de `GT-576` sigue siendo válida.

**Dónde aplica cada regla.** Ambas reglas — el mapeo estado-banda y el cruce de umbral — aplican a los bloques de capacidad de las secciones 3 y 4, que llevan viñetas de evidencia. Las tablas de estado de las secciones 6 y 9 llevan estado y calificación pero no viñetas de evidencia, así que allí sólo se verifica el mapeo; sus letras son consistencia, no medición.

**Cómo falla.** `node .harness/scripts/ci/09-reconcile-maturity.mjs` alimenta a la regla 12 entradas deliberadamente malas antes de mirar siquiera este documento — una `F` sobre evidencia sólo-ADR, una cita ejecutable entre cinco, exactamente 50% reclamando `L`, una letra por encima de su estado, una calificación ausente, los mismos defectos en la edición en inglés, una calificación sobre cero indicadores, una fila de tabla cuya letra contradice su estado — y sale con código distinto de cero si alguna es aceptada. Corre en el job `Validate documentation` en `.github/workflows/docs.yml:83`.

### 2.4 Niveles de capacidad

ISO/IEC 33020:2019 también define seis niveles de capacidad — 0 `Incomplete`, 1 `Performed`, 2 `Managed`, 3 `Established`, 4 `Predictable`, 5 `Innovating`. Esta evaluación califica **atributos de proceso** en la escala N/P/L/F de arriba y reporta el nivel TOGAF ACMM por separado. Deliberadamente **no** afirma ningún nivel de capacidad ISO/IEC 33020 por capacidad, porque derivarlo exige calificar todos los atributos de todos los niveles inferiores — trabajo que esta evaluación no hace. Leer un nivel ACMM de la sección 3 como un nivel de capacidad ISO/IEC 33020 sería un error de categoría, y por eso ambos vocabularios se mantienen separados.

### 2.5 Procedimiento de evaluación (ISO/IEC 25040:2024)

*ISO/IEC 25040:2024, Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — Quality evaluation framework* (2ª edición; la edición 2011 se titulaba *Evaluation process*) enmarca el ciclo de evaluación que esta evaluación venía haciendo ad hoc. Mapearlo la vuelve repetible por una segunda persona en vez de reproducible sólo por su autor:

| Actividad de evaluación | Qué es aquí | Dónde vive |
|---|---|---|
| Establecer los requisitos de evaluación | Propósito, las dos dimensiones medidas y el límite de alcance que excluye Tracker y Product Suite | Sección 1; sección 12 |
| Especificar la evaluación | Las medidas: nivel TOGAF ACMM, Estado basado en Evidencia, calificación ISO/IEC 33020, pesos de indicadores | Secciones 2.1–2.3 |
| Diseñar la evaluación | Los criterios de decisión: las cuatro bandas de logro más la regla de umbral de un solo lado, expresados como código | `.harness/scripts/ci/09-reconcile-maturity.mjs` |
| Ejecutar la evaluación | Correr el gate: se auto-testea, recalcula cada logro y regenera el snapshot | `node .harness/scripts/ci/09-reconcile-maturity.mjs`; [reconciliación de madurez](./maturity-reconciliation.json) |
| Concluir la evaluación | El veredicto bidimensional, y toda desviación registrada en el tablero de gaps en vez de aquí | Sección 12; [Tablero de Seguimiento de Gaps](../gaps/gap-tracking.es.md) |

Un lector que quiera repetir la evaluación necesita el repositorio y un comando; ningún paso depende de un juicio que sólo el autor pueda emitir.

---

## 3. Evaluación de la Arquitectura Runtime (Pilares Well-Architected)

### Pilar 1: Seguridad y Compliance — **Nivel 4 (Gestionado)**
* **Estado:** `Diseñado` — degradado desde `Validado` por [GT-576](../gaps/gap-reference-catalog.es.md#gt-576). Los dos controles sobre los que se puntuaba este pilar (aislamiento de tenant, auditoría inmutable) tienen ADR aprobado y cero código.
* **Calificación ISO/IEC 33020:2019:** `P` — Partially achieved (más de 15% hasta 50%). Logro recalculado 60%: dos de los cuatro indicadores son ejecutables, dos son sólo decisiones. La calificación queda deliberadamente por debajo de lo que la aritmética permite — ver la regla de umbral de un solo lado en la sección 2.3 — porque `Diseñado` es el estado honesto para los controles sobre los que se puntúa este pilar.
* **Evidencia — ejecutable (corre en CI):**
  * Pipeline de seguridad zero-cost vía CodeQL ([ADR-0005](../../architecture/adrs/core/0005-automated-sast-quality-gates.es.md)) — job `codeql-analysis` en `.github/workflows/sdk-cli-ci.yml:362`, junto a Trivy (`sdk-cli-ci.yml:389`) y detección de secretos con gitleaks (`sdk-cli-ci.yml:418`).
  * Gestión automatizada de vulnerabilidades ([ADR-0009](../../architecture/adrs/core/0009-strict-dependency-pinning-vulnerability-management.es.md)) — `npm audit --audit-level=high` en el job `security-audit` en `.github/workflows/sdk-cli-ci.yml:83`. La fijación exacta de versiones es la convención en cada manifiesto de workspace, pero ningún gate rechaza todavía un especificador de rango: el pinning se observa, no se impone.
* **Intención — ADR aprobado, sin implementación (no debe leerse como evidencia):**
  * Aislamiento de datos multi-tenant vía Row-Level Security ([ADR-0010](../../architecture/adrs/core/0010-multi-tenancy-architecture-strategy.es.md)) — **no implementado.** `grep -rniE 'row.level.security|current_setting\('` sobre `src/` solo matchea prosa de patrones de topología (`src/rulesets/topologies/event-driven/patterns.md`), y ningún workspace bajo `src/` declara driver de PostgreSQL ni ORM.
  * Audit trails inmutables vía CDC ([ADR-0016](../../architecture/adrs/core/0016-immutable-business-audit-trail.es.md)) — **no implementado.** No existe componente CDC, ni dependencia `debezium`, ni capa de persistencia desde la cual capturar cambios.
* **Camino a `Implementado`:** una capa de persistencia con la política RLS realmente aplicada y un almacén de auditoría append-only, cada uno cubierto por un test que falle cuando se retire el aislamiento.
* **Camino al Nivel 5:** penetration testing automatizado en CI; rotación dinámica de secretos.

### Pilar 2: Eficiencia de Rendimiento — **Nivel 4 (Gestionado)**
* **Estado:** `Diseñado` — degradado desde `Implementado` por [GT-596](../gaps/gap-reference-catalog.es.md#gt-596). Bajo la regla de umbral de ISO/IEC 33020:2019 las tres afirmaciones sobre las que se puntuaba este pilar recalculan a 20%, que es `P`; `Implementado` reclama `L`, y nada en el árbol cruza esa banda.
* **Calificación ISO/IEC 33020:2019:** `P` — Partially achieved (más de 15% hasta 50%). Logro recalculado 40%: uno de los cuatro indicadores es ejecutable, tres son sólo decisiones.
* **Evidencia — ejecutable (corre en CI):**
  * Caching de respuestas por proceso para las rutas de lectura caras — `CacheModule.registerAsync` en `src/apps/core-api/src/infrastructure/cache/in-memory-cache.module.ts:25`, aplicado vía `CacheInterceptor` en `src/apps/core-api/src/presentation/controllers/architecture.controller.ts:33`.
* **Intención — ADR aprobado, sin implementación (no debe leerse como evidencia):**
  * Compilación del grafo de auth bajo 5 ms usando Redis ([ADR-0021](../../architecture/adrs/nodejs/0021-high-performance-auth-and-graph-compilation.es.md)) — **no implementado.** No existe código de compilación de grafo de auth, y el cache distribuido Redis se eliminó en vez de repararse bajo `GT-560`: el store registrado hoy es local al proceso e ignora todo valor `REDIS_*`.
  * Estrategia dual-protocolo: REST público, gRPC interno ([ADR-0027](../../architecture/adrs/nodejs/0027-dual-protocol-rest-grpc-api-gateway.es.md)) — **no implementado.** Ningún workspace declara dependencia gRPC y ningún servicio se registra sobre un transporte gRPC; la única aparición de `grpc` bajo `src/` está dentro de una plantilla de scaffolding.
  * Payloads frontend optimizados vía BFF Gateway ([ADR-0008](../../architecture/adrs/nodejs/0008-progressive-multimodule-evolution-gateway-bff.es.md)) — **no implementado.** `src/apps/` contiene `core-api` y `agent-runtime-api`; no existe aplicación BFF ni gateway que modele payloads.
* **Camino a `Implementado`:** una ruta de rendimiento medida — la capa de caching bajo un load test que falle cuando se retire el cache — antes de reintroducir cualquier cache distribuido con su circuit breaker.
* **Camino al Nivel 5:** auto-escalado serverless; caching predictivo.

### Pilar 3: Confiabilidad y Resiliencia — **Nivel 3 (Definido)**
* **Estado:** `Diseñado` (ADRs aprobados, faltan pruebas de circuit breaker)
* **Calificación ISO/IEC 33020:2019:** `P` — Partially achieved (más de 15% hasta 50%). Logro recalculado 20%: los tres indicadores son decisiones aprobadas sin código, que es justamente el peso 0.2 de `Diseñado`.
* **Evidencia:**
  * Resiliencia offline de frontend vía React Query ([ADR-0004](../../architecture/adrs/nodejs/0004-frontend-offline-resilience.es.md)).
  * Circuit breakers (`opossum`) y retries ([ADR-0011](../../architecture/adrs/core/0011-fault-tolerance-resiliency-patterns.es.md)).
  * Topología DR multi-región propuesta ([ADR-0013](../../architecture/adrs/core/0013-cloud-infrastructure-topology-dr.es.md)).
* **Camino al Nivel 5:** drills regulares de chaos engineering; multi-región activo-activo.

### Pilar 4: Excelencia Operacional — **Nivel 4 (Gestionado)**
* **Estado:** `Implementado` — degradado desde `Validado` por [GT-576](../gaps/gap-reference-catalog.es.md#gt-576). La cita de orquestación de builds nombraba una herramienta que nunca se adoptó, y una capacidad de la lista no tiene código.
* **Calificación ISO/IEC 33020:2019:** `L` — Largely achieved (más de 50% hasta 85%). Logro recalculado 60%: dos de los cuatro indicadores son ejecutables, dos son sólo decisiones.
* **Evidencia — ejecutable (corre en CI):**
  * Quality gates aplican umbrales de coverage en CI ([ADR-0018](../../architecture/adrs/core/0018-testing-pyramid-quality-gates.es.md)) — el step `Check Coverage Threshold` en `.github/workflows/sdk-cli-ci.yml:195` hace fallar el job `unit-tests` por debajo del umbral.
  * Builds deterministas de monorepo ([ADR-0001](../../architecture/adrs/core/0001-monorepo-orchestration-principle.es.md)) — npm workspaces más project references de TypeScript (`npm run build` es `tsc -b tsconfig.json`) sobre un `package-lock.json` exacto. **La orquestación con Nx citada en revisiones anteriores de este documento no está adoptada:** no existe `nx.json` ni dependencia `nx` en todo el árbol.
  * Telemetría vía OpenTelemetry ([ADR-0007](../../architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.es.md)) — `NodeSDK` inicializado en `src/apps/core-api/src/tracing.ts:7`. El lado colector LGTM es un asunto de despliegue y no se evidencia aquí.
* **Intención — ADR aprobado, sin implementación (no debe leerse como evidencia):**
  * Feature flagging desacopla deployment de release ([ADR-0017](../../architecture/adrs/core/0017-feature-flagging-strategy.es.md)) — **no implementado.** No existe proveedor de flags, ni código de evaluación de flags, ni almacén de flags bajo `src/`.
* **Camino al Nivel 5:** deployments blue/green autónomos; detección de anomalías en logs con IA.

### Pilar 5: Mantenibilidad y Extensibilidad — **Nivel 4 (Gestionado)**
* **Estado:** `Validado`
* **Calificación ISO/IEC 33020:2019:** `F` — Fully achieved (más de 85% hasta 100%). Logro recalculado 100%: los tres indicadores son ejecutables.
* **Evidencia — ejecutable (corre en CI):**
  * Boundaries hexagonales desacoplando core de infraestructura ([ADR-0002](../../architecture/adrs/nodejs/0002-clean-architecture-nestjs.es.md)) — impuestos por `eslint-plugin-boundaries` y por el boundary guard del repositorio `.harness/scripts/ci/34-boundary-guard-repository.mjs`, ejecutado en el job `Validate documentation` en `.github/workflows/docs.yml:113`.
  * Patrones de diseño táctico ([ADR-0019](../../architecture/adrs/core/0019-tactical-design-patterns-future-proofing.es.md)) — los resultados viajan como value types explícitos que transportan el desenlace, `GateEvaluationResult` en `src/packages/core-domain/src/evaluation/contracts/evaluation-result.ts:108`, en lugar de como excepciones. Revisiones anteriores hablaban de una "monada Result": no existe tipo `Result<T, E>` ni dependencia `neverthrow`/`fp-ts` en el árbol, así que ese patrón concreto **no** está adoptado.
  * Desacoplamiento event-driven de módulos de dominio ([ADR-0015](../../architecture/adrs/core/0015-event-driven-architecture-intra-domain.es.md)) — puerto en `src/packages/core-domain/src/application/ports/event-bus.port.ts:10`, adapter en `src/packages/core-domain/src/infrastructure/events/in-memory-event-bus.ts:13`.
* **Camino al Nivel 5:** transición monolito-a-Dapr con cero cambios de dominio ([ADR-0006](../../architecture/adrs/core/0006-microservices-transition-sidecar-pattern.es.md)). Nota: el enforcement hexagonal estricto en el propio CLI sigue abierto — ver [GT-19](../gaps/gap-reference-catalog.es.md#gt-19).

---

## 4. Evaluación de la Exposición Tecnológica (CLI + MCP)

### Dimensión 1: Conformidad de Protocolo MCP y Transporte — **Nivel 4 (Gestionado)**
* **Estado:** `Validado`
* **Calificación ISO/IEC 33020:2019:** `F` — Fully achieved (más de 85% hasta 100%). Logro recalculado 100%: el único indicador es ejecutable.
* **Evidencia:** JSON-RPC 2.0 por stdio y Streamable HTTP oficial del SDK MCP; autenticación por API key; 29 casos E2E MCP; el smoke verifica initialize, discovery, métricas y evaluación de gates en ambos transportes. Ejecutado en CI por el job `e2e-tests` (`.github/workflows/sdk-cli-ci.yml:323`), cuyo step `npm run mcp:smoke` está en `.github/workflows/sdk-cli-ci.yml:357`. Ver la [reconciliación de madurez](./maturity-reconciliation.json) generada.
* **Camino al Nivel 5:** conformidad de protocolo automatizada contra las versiones soportadas de la especificación MCP.

### Dimensión 2: Cobertura de Tests y Quality Gates — **Nivel 4 (Gestionado)**
* **Estado:** `Validado`
* **Calificación ISO/IEC 33020:2019:** `F` — Fully achieved (más de 85% hasta 100%). Logro recalculado 100%: el único indicador es ejecutable.
* **Evidencia:** 1,206 tests unitarios y 121 E2E pasan desde un checkout limpio, y la cobertura de statements es 80,65% (4.979/6.173) frente al umbral normativo de 80%, restaurada bajo [GT-48](../gaps/gap-reference-catalog.es.md#gt-48) testeando los native rule handlers, validators y filesystem providers. El umbral se impone, no solo se reporta: el step `Check Coverage Threshold` en `.github/workflows/sdk-cli-ci.yml:195` hace fallar el build por debajo de él. La [reconciliación de madurez](./maturity-reconciliation.json) generada registra el resultado ejecutable y su origen.
* **Camino al Nivel 5:** umbrales de cobertura durables por-run en la configuración de Jest ([GT-50](../gaps/gap-reference-catalog.es.md#gt-50)) y mutation testing.

### Dimensión 3: Completitud de Exposición de Gobernanza — **Nivel 4 (Gestionado)**
* **Estado:** `Validado`
* **Calificación ISO/IEC 33020:2019:** `F` — Fully achieved (más de 85% hasta 100%). Logro recalculado 100%: el único indicador es ejecutable.
* **Evidencia:** los tools, resources y prompts MCP cubren validación, agentes, arquitectura, SDLC, priorización, métricas y evaluación de gates con checks de conformidad de schemas runtime. El inventario se mantiene honesto mediante el guard bidireccional de paridad de superficie `.harness/scripts/ci/24-check-surface-parity.mjs`, ejecutado en `.github/workflows/docs.yml:92`: toda operación del árbol de fuentes debe aparecer en la matriz, y toda referencia de la matriz debe resolver a código real. Las cifras absolutas no se repiten aquí de forma deliberada — revisiones anteriores citaban 47 en esta sección y 50 en la sección 10.1, y ningún gate reconciliaba ambas.
* **Camino al Nivel 5:** hot-reload de rulesets y adopción medida en repositorios satélite.

### Dimensión 4: Experiencia de Desarrollador CLI — **Nivel 4 (Gestionado)**
* **Estado:** `Validado`
* **Calificación ISO/IEC 33020:2019:** `F` — Fully achieved (más de 85% hasta 100%). Logro recalculado 100%: el único indicador es ejecutable.
* **Evidencia:** el paquete `@beyondnet/evolith-cli@1.1.0` se instala desde el lockfile canónico del workspace, verificado por el job `package-integrity` en `.github/workflows/sdk-cli-ci.yml:257`; lint, build, E2E y smoke MCP pasan desde un checkout limpio; shell completion y documentación bilingüe están disponibles. La documentación pública de producto y los hechos de release se sincronizan desde un [Inventario de Superficie del Producto](../../../../product/products/smart-cli/product-inventory.es.md) generado, con CI que rechaza drift y páginas placeholder ([GT-47](../gaps/gap-reference-catalog.es.md#gt-47)).
* **Camino al Nivel 5:** publicar el inventario como un manifiesto de capacidades descubrible consumido por repositorios satélite.

### Dimensión 5: Enforcement Runtime de Gobernanza Federada — **Nivel 3 (Definido)**
* **Estado:** `Diseñado` (Existen reglas, falta validación de contenido)
* **Calificación ISO/IEC 33020:2019:** `P` — Partially achieved (más de 15% hasta 50%). Logro recalculado 100% sobre un único indicador; la calificación se mantiene en `P` porque `Diseñado` es el estado honesto mientras la evidencia de phase gates siga siendo de sólo-existencia.
* **Evidencia:** modelo de herencia, contratos de satélites y reglas de boundary Open-Core definidos; `evolith-cli validate` ejecutable por cualquier satélite; el composite action de CI que consume un gate de PR satélite es `.github/actions/evolith-validate/action.yml`, dogfooded sobre un runner real por `.github/workflows/evolith-validate-dogfood.yml` (ambas mitades, bloqueante y no bloqueante, cerradas bajo [GT-577](../gaps/gap-reference-catalog.es.md#gt-577)).
* **Camino al Nivel 4:** evidencia de phase gates profundizada de chequeos de solo-existencia a validación de contenido/umbral ([GT-08](../gaps/gap-reference-catalog.es.md#gt-08)–[GT-11](../gaps/gap-reference-catalog.es.md#gt-11)); adapters ACL runtime (alcance Tracker).

---

## 5. Madurez de Capacidades de Adaptadores (Agent Runtime)

Esta dimensión mide la madurez de las superficies de interacción y los puertos de orquestación internos contra las reglas de límites stateless del Evolith Core.

**Niveles de Madurez:**
* **M0 — No identificado:** Capacidad conceptualizada pero no se ha definido puerto/interfaz.
* **M1 — Documentado:** Requisito o diseño documentado, sin código.
* **M2 — Puerto definido:** Existe interfaz de TypeScript (`IPort`).
* **M3 — Adaptador Stub/InMemory implementado:** La implementación existe pero simula el comportamiento (no listo para producción).
* **M4 — Adaptador de Producción implementado:** Integración real implementada (ej. HTTP, Redis).
* **M5 — Gobernado, observable y testeado:** Completamente cubierto por OPA, tracing, flujos de aprobación y gates de CI.

### 5.1 Adaptadores de Interacción (Evaluación M-Level)

Los 6 adaptadores de interacción han sido implementados como adaptadores de producción (M4). Ninguno ha alcanzado M5.

| Adaptador | Nivel-M | Tests | Prioridad | Gaps a M5 |
|---|:---:|:---|:---|:---|
| `McpInteractionAdapter` | **M4** | 11 tests unitarios | Alta | OPA guard, tracing, registro en manifest |
| `SmartCliCommandInteractionAdapter` | **M4** | Ninguno | Crítica | Tests unitarios, edge cases, registro en manifest |
| `SmartCliChatInteractionAdapter` | **M4** | Ninguno | Crítica | Tests unitarios, edge cases, registro en manifest |
| `HermesChatBoxInteractionAdapter` | **M4** | Ninguno | Alta | Tests unitarios, registro en manifest, docs standalone |
| `OpenCodeInteractionAdapter` | **M4** | Ninguno | Media | SourceInterface propio, tests, manifest |
| `ExternalTriggerInteractionAdapter` | **M4** | Ninguno | Alta | Validación de input, tests, registro en manifest |

**Distribución:** 0 M0-M3 · **6 M4** · 0 M5

**Gaps transversales a M5:** Solo `McpInteractionAdapter` tiene cobertura de tests. Los 5 adaptadores restantes comparten: tests unitarios faltantes, sin registro en manifest, sin referencias en definiciones de agentes, sin integración OPA/trace/HITL a nivel de adaptador (manejado downstream en el pipeline runtime pero no a nivel de adaptador).

### 5.2 Adaptadores de Puertos (Inventario de Capacidades)

| Capacidad / Puerto | Objetivo | Implementado Actualmente | Estado | Pendiente / Recomendado | Prioridad |
|---|---|---|---|---|---|
| **Agent Engine** | Razonamiento agentic reemplazable. | `StubAgentEngineAdapter`, `HermesAgentAdapter`, `SwarmsAgentAdapter`, `RoutingAgentAdapter` | `Implementado` | `OpenCodeAgentAdapter`, `OllamaLocalAgentAdapter`, `OpenAIAdapter`, `ClaudeAdapter`, `GeminiAdapter` | Media |
| **Engine Routing** | Elegir motor por contexto o intención. | `RoutingAgentAdapter` | `Parcial` | `PolicyBasedEngineRouter`, `RiskAwareEngineRouter`, `CostAwareEngineRouter`, `PrivacyAwareEngineRouter` | Alta |
| **Harness Execution** | Ejecutar capacidades `.harness` (simuladas o reales). | `InMemoryHarnessAdapter`, `HarnessProcessAdapter` | `Implementado` | `DockerHarnessAdapter`, `KubernetesJobHarnessAdapter`, `RemoteHarnessAdapter`, `GitHubActionsHarnessAdapter` | Media |
| **Core Evaluation** | Evaluar reglas, gaps y gobernanza. | `StubCoreEvaluationAdapter`, `InProcessCoreEvaluationAdapter`, `HttpCoreEvaluationAdapter` | `Implementado` | `GrpcCoreEvaluationAdapter`, `BatchCoreEvaluationAdapter`, `CachedCoreEvaluationAdapter` | Media |
| **Policy / OPA** | Validar políticas y bloquear acciones. | `StubPolicyValidationAdapter`, `OpaCliPolicyValidationAdapter` | `Implementado` | `OpaHttpAdapter`, `ConftestAdapter`, `KyvernoAdapter`, `PolicyBundleRegistryAdapter` | Alta |
| **Tracker Trace** | Publicar trazabilidad al Tracker o memoria. | `InMemoryTrackerTraceAdapter`, `HttpTrackerTraceAdapter` | `Implementado` | `EventBusTraceAdapter`, `KafkaTraceAdapter`, `OpenTelemetryTraceAdapter`, `AuditLogTraceAdapter` | Media |
| **Memory** | Memoria temporal o persistida. | `InMemoryMemoryAdapter`, `FileMemoryAdapter` | `Implementado` | `RedisMemoryAdapter`, `PostgresMemoryAdapter`, `VectorMemoryAdapter`, `ObsidianVaultMemoryAdapter` | Media |
| **Skill Registry** | Resolver intents a capacidades gobernadas. | `LocalSkillRegistryAdapter`, `DEFAULT_SKILLS` | `Implementado` | `RemoteSkillRegistryAdapter`, `GitSkillRegistryAdapter`, `MarketplaceSkillRegistryAdapter`, `TenantSkillBundleAdapter` | Alta |
| **Communication Gateway** | Adaptar superficies de comunicación. | `CliCommunicationGatewayAdapter` + 6 adaptadores de interacción (ver 5.1) | `Implementado` | `WebhookInteractionAdapter` | Crítica |
| **Scheduler** | Programar o diferir ejecuciones. | `InMemorySchedulerAdapter`, `FileSchedulerAdapter` | `Implementado` | `CronSchedulerAdapter`, `TemporalAdapter`, `BullMQSchedulerAdapter`, `KubernetesCronJobAdapter` | Baja |
| **Approval / HITL** | Flujo de aprobación humana en el loop. | `AutoApprovalAdapter`, `DenyByDefaultApprovalAdapter` | `Parcial` | `TrackerApprovalAdapter`, `GitHubApprovalAdapter`, `SlackApprovalAdapter`, `TeamsApprovalAdapter`, `EmailApprovalAdapter` | Alta |
| **Knowledge / RAG** | Consultar ADRs, reglas, manuales antes de actuar. | `PgVectorKnowledgeAdapter` (deploy-gated), `InMemoryMemoryAdapter` (default) | `Implementado (deploy-gated)` | Ejecución live pgvector + sidecar | Alta |
| **Observability** | Observar runtime, motores y latencias. | Parcial vía Tracker Trace. | `Parcial` | `OpenTelemetryAdapter`, `PrometheusMetricsAdapter`, `StructuredAuditAdapter` | Media |
| **GitHub Automation** | Crear repos, PRs y CI desde flujos gobernados. | No implementado como adaptador directo. | `No implementado` | `GitHubRepositoryAdapter`, `GitHubIssueAdapter`, `GitHubPullRequestAdapter`, `GitHubActionsAdapter` | Media |
| **Notifications / Collaboration** | Notificar puertas bloqueadas, aprobaciones, etc. | No implementado como adaptador directo. | `No implementado` | `SlackAdapter`, `TeamsAdapter`, `EmailNotificationAdapter`, `DiscordAdapter` | Media |
| **Secrets / Config** | Gestión de credenciales, selección de engine, config. | Parcial vía bootstrap/overrides. | `Parcial` | `VaultSecretAdapter`, `EnvConfigAdapter`, `RemoteConfigAdapter`, `PolicyBundleConfigAdapter` | Alta |

---

## 6. Matriz de Madurez de Patrones (Catálogo Internacional de Patrones)

| Cluster de Patrón | Patrón Específico | Aplicabilidad | Estado Basado en Evidencia | ISO 33020 | Justificación |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Integración** | **Strangler Fig** | Core Crítico | `Validado` | `F` | Estrategia fundacional: módulos lógicamente aislados para extracción incremental sin downtime. |
| **Composición** | **BFF (Backend for Frontend)** | Core Obligatorio | `Implementado` | `L` | Capas NestJS especializadas por dispositivo ([ADR-0008](../../architecture/adrs/nodejs/0008-progressive-multimodule-evolution-gateway-bff.es.md)). |
| **Confiabilidad** | **Circuit Breaker** | Operacional | `Diseñado` | `P` | Breakers distribuidos compartiendo estado vía Redis ([ADR-0011](../../architecture/adrs/core/0011-fault-tolerance-resiliency-patterns.es.md)) + healthchecks de edge. |
| **Base de Datos** | **Schema Per Context** | Core Obligatorio | `Diseñado` | `P` | Pensado para prevenir la contaminación de joins cross-dominio ([ADR-0031](../../architecture/adrs/core/0031-schema-per-context-domain-event-catalog.es.md)). Degradado desde `Validado` por [GT-576](../gaps/gap-reference-catalog.es.md#gt-576): ningún workspace bajo `src/` declara driver de base de datos ni ORM, así que no existe frontera de schema que validar. |
| **Escalabilidad** | **CQRS (Básico)** | Opcional | `Visionado` | `N` | Read-models solo cuando la contención de escritura lo exija. |
| **Consistencia** | **Patrón Saga** | Futuro Distribuido | `Visionado` | `N` | Reservado para transacciones distribuidas de Fase 3+. |
| **Mensajería** | **Transactional Outbox** | Fase 2+ | `Visionado` | `N` | Consistencia atómica estado-DB/eventos a escala asíncrona. |

**Leyenda:** *Adoptado* — completamente diseñado y verificado en specs. *Roadmap* — infraestructura lista, implementación diferida a demanda. *Incompatible* — ninguno identificado actualmente.

---

## 7. Inmunización contra Anti-Patrones

La arquitectura despliega "anticuerpos" explícitos contra los seis anti-patrones de mayor riesgo. Resumen (criticidad · defensa):

| Anti-Patrón | Criticidad | Defensa de Inmunización |
| :--- | :--- | :--- |
| **Monolito Distribuido** | EXTREMA | Bus de eventos asíncrono ([ADR-0015](../../architecture/adrs/core/0015-event-driven-architecture-intra-domain.es.md)) + aislamiento hexagonal ([ADR-0002](../../architecture/adrs/nodejs/0002-clean-architecture-nestjs.es.md)): mensajería fire-and-forget, sin cadenas síncronas cross-módulo. |
| **Entrelazamiento de BD Compartida** | MUY ALTA | *Defensa diseñada, aún no desplegada.* Schema PostgreSQL aislado por contexto ([ADR-0031](../../architecture/adrs/core/0031-schema-per-context-domain-event-catalog.es.md)) con joins cross-schema físicamente bloqueados — todavía no existe capa de persistencia, así que el anti-patrón está ausente, no inmunizado. |
| **Fat Controller / Smart Pipe** | ALTA | Dumb Pipes / Smart Endpoints: el gateway ejecuta solo políticas agnósticas (JWT, SSL, rate limit); toda decisión de negocio vive en el hexágono de aplicación testeado. |
| **Log Shards (Ceguera)** | ALTA | Tracing distribuido OTel ([ADR-0007](../../architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.es.md)): un TraceParent ID desde el inicio del request hasta la respuesta de BD. |
| **God Module** | ALTA | Auditorías regulares de boundaries contra el [Modelo de Referencia Aplicado UMS](../../../../product/research/demo/README.es.md); el playbook de extracción divide antes de que un módulo crezca demasiado. |
| **Leaky Shared Library** | ALTA | Libs compartidas restringidas a primitivas genéricas y utilidades DDD; objetos de dominio prohibidos, enforced vía `eslint-plugin-boundaries`. |

**Fortaleza de resiliencia: DISEÑADA** — circuit breakers + contract testing están especificados para blindar el backend contra fallas en cascada. El aislamiento de tenant de doble capa es solo intención de diseño: sin capa de persistencia en el árbol no hay nada que contener, y la contención que aquí se afirmaba antes no era demostrable (ver Pilar 1).
**Overhead de performance: BAJO** — caching de 4 niveles (Cliente → CDN → BFF → Core) y backbones internos gRPC.
**Controles de riesgo residual:** snapshots semanales de performance con K6 y verificación de contratos Pact JS en CI ([ADR-0037](../../architecture/adrs/core/0037-performance-concurrency-chaos-strategy.es.md)).

---

## 8. Alcance de Gobernanza Topológica (Cobertura Multi-Dimensional)

> *Esta es la dimensión que distingue a Evolith de los frameworks arquitectónicos convencionales: no solo calidad interna, sino amplitud de alcance de gobernanza.*

### 8.1 Modelo Dimensional

Evolith Core no trata las topologías arquitectónicas como etiquetas de madurez mutuamente excluyentes. El [Modelo de Dimensiones Topológicas](../../architecture/topologies/topology-dimensions.es.md) (gobernado por [ADR-0079](../../architecture/adrs/core/0079-multi-topology-reference-corpus.es.md)) define 5 dimensiones con 8 topologías componibles.

| Dimensión | Pregunta que Responde | Topologías |
|---|---|---|
| `progressive-axis` | ¿Cómo se decompone y evoluciona el sistema? | `modular-monolith`, `distributed-modules`, `microservices` |
| `execution` | ¿Dónde y cómo ejecuta código? | `serverless`, `edge-computing` |
| `integration` | ¿Cómo se coordinan los componentes? | `event-driven` |
| `data` | ¿Cómo se distribuye la propiedad de datos? | `data-mesh` |
| `ai` | ¿Cómo se gobiernan los agentes AI? | `agentic-ai` |

**Cobertura: 5/5 dimensiones (100%), 8/8 topologías (100%)**

### 8.2 Estado de Madurez por Topología

| Topología | Dimensión | Estado | Native Rules | OPA Policy | OPA Tests | WASM | Config Schema | Fixtures | Bilingüe | Budgets | ADRs |
|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **`Modular Monolith`** | progressive-axis | Accepted v1.0.0 | SI | SI | SI | SI | SI | SI | SI | — | 4 |
| **Distributed Modules** | progressive-axis | Accepted v1.0.0 | SI | SI | SI | SI | SI | SI | SI | — | 3 |
| **`Microservices`** | progressive-axis | Accepted v1.0.0 | SI | SI | SI | SI | SI | SI | SI | — | 4 |
| **Serverless** | execution | Accepted v1.0.0 | SI | SI | SI | SI | SI | SI | SI | SI | 2 |
| **Edge Computing** | execution | Accepted v1.0.0 | SI | SI | SI | SI | SI | SI | SI | SI | 2 |
| **Event-Driven** | integration | Accepted v1.0.0 | SI | SI | SI | SI | SI | SI | SI | — | 2 |
| **Data Mesh** | data | Accepted v1.0.0 | SI | SI | SI | SI | SI | SI | SI | — | 2 |
| **Agentic AI** | ai | Accepted v0.1.0 | SI | SI | SI | SI | SI | SI | SI | SI | 5 |

**La tabla anterior describe el corpus del repositorio, no el artefacto publicado.** Las 8 topologías sí tienen en el árbol Native `.rules.json` + OPA `.rego` + `.test.rego` + `.wasm`, repartidos en dos raíces: las 3 de progressive-axis bajo `reference/core/architecture/topologies/progressive-axis/`, las otras 5 bajo `src/rulesets/topologies/`. La paridad tal como se *publica* y tal como se *bloquea* es materialmente más estrecha — ver 8.6.

### 8.3 Matriz de Composición

Las topologías de diferentes dimensiones se componen vía `spec.compatibility.composableWith`. Dos topologías hub proporcionan máxima componibilidad:

| Topología Hub | Se Compone Con |
|---|---|
| **Event-Driven** | TODAS las 7 demás |
| **Agentic AI** | TODAS las 7 demás |

**Composición de referencia:** `modular-monolith + event-driven` (validado en CI vía `22-validate-topology-composition.mjs`).

### 8.4 Presupuestos Operacionales

Las topologías de ejecución y AI imponen contratos de presupuesto operacional:

| Topología | Campos de Budget |
|---|---|
| Serverless | `latencyBudgetMs=1500`, `coldStartCeilingMs=1000`, `costCeilingPerExecutionCents=1` |
| Edge Computing | `latencyBudgetMs=200`, `coldStartCeilingMs=300`, `costCeilingPerExecutionCents=1` |
| Agentic AI | `tokenBudgetPerExecution=100000`, `credentialRotationIntervalHours=24`, `sandboxTimeoutMs=30000` |

### 8.5 Infraestructura de Validación CI

| Script | Propósito |
|---|---|
| `validate-topology-manifests.mjs` | Valida todos los manifests contra schema, budgets, completitud R-27 |
| `22-validate-topology-composition.mjs` | Validación cross-topology, composability pairwise |
| `26-validate-topology-rule-coverage.mjs` | Cobertura Native/OPA por ID de regla según manifest |
| `28-test-topology-opa.mjs` | Suites de tests OPA — escanea solo `reference/core/architecture/topologies` (`28-test-topology-opa.mjs:15`), por lo que alcanza 3 de 8 topologías, y ningún workflow lo invoca |
| `30-validate-phase-topology-disjoint.mjs` | Anti-colisión de namespace (fases SDLC vs IDs de topología) |

Solo `22-validate-topology-composition.mjs` y `26-validate-topology-rule-coverage.mjs` corren por commit (despachados por la rama de topologías de `.harness/scripts/ci-runner.mjs`). El barrido completo de paridad semántica Native/OPA `27-opa-parity-gate.mjs` corre exclusivamente en el schedule diario de `.github/workflows/opa-parity.yml:36`; no es un check requerido en `main`.

### 8.6 Score de Alcance de Gobernanza

| Indicador | Valor |
|---|---|
| Dimensiones gobernadas | **5/5 (100%)** |
| Topologías gobernadas | **8/8 (100%)** |
| Paridad dual-engine — corpus del repositorio | **8/8 (100%)** (`.rules.json` + `.rego` + `.test.rego` + `.wasm` presentes en el árbol) |
| Paridad dual-engine — artefacto publicado `@beyondnet/evolith-cli@1.1.0` | **5/8 (63%)** — `rulesets/topologies/` publica política OPA + test + WASM para `agentic-ai`, `data-mesh`, `edge-computing`, `event-driven`, `serverless`. Las 3 topologías de progressive-axis publican solo `.rules.json` Native; el paquete no lleva `.rego` ni `.wasm` para ellas. |
| Paridad dual-engine — cubierta por un gate bloqueante | **0/8** — `28-test-topology-opa.mjs` (3 topologías en alcance) no lo invoca ningún workflow, y el barrido completo `27-opa-parity-gate.mjs` es solo por schedule. |
| Presupuestos operacionales ejecutados | **3/3 requeridos** |
| Composiciones validadas en CI | Infraestructura completa |
| ADRs específicos de topologías | 13 en 8 topologías |

**Alcance de Gobernanza: corpus COMPLETO, distribución y enforcement INCOMPLETOS.** Evolith Core redacta reglas para el espectro total de topologías de su modelo dimensional; todavía no publica, ni bloquea sobre, la mitad OPA de ese corpus para todas las topologías.

---

## 9. Alineación con la Visión del Producto

Match pilar por pilar contra la [Visión Maestra del Producto](../../../../product/suite/vision/evolith-product-vision-master.es.md). Los scores detallados por componente viven en el [Snapshot de Línea Base](../gaps/gap-reference-catalog.es.md#2-snapshot-histórico-de-línea-base) del Catálogo de Referencia de Gaps.

| Pilar de Visión | Requisito de Visión | Estado Basado en Evidencia | ISO 33020 | Notas |
|---|---|:---:|:---:|---|
| **Evolith Core** | Reference Corpus (Constitución): directivas, ADRs, estándares, rulesets, schemas | `Implementado` | `L` | Ver [Inventario del Corpus de Referencia](./inventory-summary.es.md) en vivo. Reglas de integración ACL definidas pero no ejecutadas (alcance Tracker). |
| **Evolith Tracker** | Orquestador SaaS del SDLC | `Visionado` | `N` | Repositorio aparte; la obligación del Core es el contrato API/MCP que consumirá. |
| **Exposición Tecnológica** | CLI + Core API + MCP sirviendo gobernanza como contexto en tiempo real | `Implementado` | `L` | Core API (NestJS) expone REST/GraphQL/MCP para orquestadores externos. |
| **5 Phase Gates** | Gates auditables con evidencia bloqueante | `Implementado` | `L` | Los 5 gates evalúan; los criterios bloqueantes son chequeos de solo-existencia. |
| **Gobernanza Federada** | Herencia hub-and-spoke, validación de satélites | `Diseñado` | `P` | Reglas de herencia + composite action de CI para satélites entregadas; ACLs runtime diferidas. |
| **Estrategia Open-Core** | Tier gratuito CLI+MCP públicamente disponible | `Prototipado` | `P` | Publicación bloqueada solo por logística de release ([GT-18](../gaps/gap-reference-catalog.es.md#gt-18)). |

---

## 10. Dimensión AI-Augmented

Evolith Core adopta la sección de ingeniería AI-Augmented. La [Matriz de Madurez de IA](../../foundations/common-rules/ai-augmented/07-maturity-model/ai-maturity-matrix.es.md) complementaria define 3 niveles en 5 dimensiones.

### 10.1 Evaluación por Dimensión

| Dimensión | Nivel | Evidencia Clave | Brecha a Nivel 3 |
|---|:---:|---|---|
| **Documentación** | **2 (AI-Integrated)** | AGENTS.md (132 líneas, actualizado regularmente), Catálogo de Tools MCP (51 tools), Catálogo de Modelos, Router Agent + 10 Discovery Agents con scope/inputs/outputs/handoff declarados | ADRs específicos de agentes, diagramas C4 de topología de orquestación |
| **Herramientas** | **3 (AI-Orchestrated)** | 51 MCP tools registrados, ciclo agentic recursive con propagación de budget (ADR-0002 §4), memoria semántica RAG vía pgvector + Qwen3 embedder, observabilidad OTel/Langfuse, `LangfuseEvidenceAdapter` mapeando traces/cost/latency | — (ya en Nivel 3) |
| **Verificación** | **2 (AI-Integrated)** | `.husky/pre-commit` (5 modos CI), 12 GitHub Actions workflows, validación OPA diaria, boundary guards de arquitectura, validación documentación, gates de coverage (80.65%) | Agentes de verificación autónomos patrullando continuamente (Winston audit existe pero requiere invocación manual) |
| **Modelos** | **2 (AI-Integrated)** | ADR-AI-003 governance formal, catálogo de modelos por tier (Large/Flash/Local), optimización cost-per-token objetivo 30-40%, infraestructura de tracking de costos Langfuse | Dashboard live de token cost por agent/feature, routing automático multi-model por rol |
| **Seguridad** | **2 (AI-Integrated)** | Autenticación OAuth/API key/JWT con comparación constant-time, ABAC dual-engine (OPA + TypeScript), filtrado de tools por rol, `AuditLogger` con redacción, política HITL para herramientas destructivas | Almacenamiento de audit inmutable, sandboxing de ejecución, rate limiting adaptativo basado en costo |

### 10.2 Resumen de Madurez AI

| Nivel | Dimensiones en este nivel |
|---|---|
| Nivel 1 (AI-Assisted) | 0 |
| Nivel 2 (AI-Integrated) | 4 (Documentación, Verificación, Modelos, Seguridad) |
| Nivel 3 (AI-Orchestrated) | 1 (Herramientas) |

**Madurez AI General: Nivel 2.2 (AI-Integrated → AI-Orchestrated)**

### 10.3 Evidencia de Certificación

| Nivel | Criterio | Estado |
|---|---|---|
| **Nivel 1** | Existe `.husky/pre-commit` | PASS |
| **Nivel 1** | `AGENTS.md` actualizado en últimos 30 días | PASS |
| **Nivel 2** | Catálogo de tools JSON Schema publicado | PASS (Catálogo MCP Tools) |
| **Nivel 2** | Logs de CI con model mocks | PASS (OPA parity + boundary guards) |
| **Nivel 2** | Backend no expone PII sin tokenizar al LLM | PASS (redacción SENSITIVE_ARG_KEYS) |
| **Nivel 3** | Dashboard de token cost por agent/feature | NO CUMPLIDO (infraestructura existe, dashboard live falta) |
| **Nivel 3** | Switch HITL bloqueando transacción simulada | PARCIAL (política definida, demo completa no evidenciada) |
| **Nivel 3** | Diagrama de arquitectura multi-agent aprobado | PARCIAL (agentes documentados, sin diagrama C4)

---

## 11. Actualización de Inteligencia BMAD (BMAD Intelligence Update)

Esta evaluación de madurez alimenta explícitamente el **Bucle de Retroalimentación de Inteligencia BMAD**. Los insights generados aquí instruyen las capacidades de los agentes internos, sus reglas de evaluación y listas de verificación estándar:

* **Agentes Actualizados:** `winston` (Auditoría), `architect` (Arquitectura) ahora evalúan el cumplimiento de puertos/adaptadores.
* **Nuevas Skills:** `adapter-maturity-analysis`, `interaction-adapter-gap-analysis`.
* **Nuevas Reglas:** `core-must-remain-stateless`, `external-tech-must-use-adapter`, `chat-interfaces-cannot-execute-critical-actions`.
* **Nuevos Checklists:** `Adapter Maturity Checklist`, `Interaction Adapter Readiness Checklist`.

Estos recursos de inteligencia se versionan dentro de `.bmad-core/agents/` y aplican continuamente a futuros PRs y auditorías de gobernanza.

---

## 12. Scoring Ejecutivo y Gaps Abiertos

### Dimensión A: Score de Calidad Interna (TOGAF ACMM)

| Capa | Peso | Score (Con Evidencia) |
|------|------|-----------------------|
| Arquitectura Runtime (pilares Well-Architected) | 60% | 3.4 ± 0.4 |
| Exposición Tecnológica (CLI + MCP) | 40% | 3.2 ± 0.4 |

**Calidad Interna: 3.32 ± 0.4 / 5.0 (Definido → Gestionado)**

### Dimensión A′: Calificaciones de atributos de proceso ISO/IEC 33020:2019

Recalculadas por el gate desde los indicadores de cada capacidad (sección 2.3), no escritas a mano. Los porcentajes son el logro que la evidencia sostiene; la calificación es la que reclama el estado declarado de la capacidad, y el gate rechaza cualquier calificación que el porcentaje no logre cruzar.

| Capacidad | Estado Basado en Evidencia | ISO 33020 | Logro | Indicadores |
|---|---|:---:|---:|:---:|
| Pilar 1 — Seguridad y Compliance | `Diseñado` | `P` | 60% | 4 |
| Pilar 2 — Eficiencia de Rendimiento | `Diseñado` | `P` | 40% | 4 |
| Pilar 3 — Confiabilidad y Resiliencia | `Diseñado` | `P` | 20% | 3 |
| Pilar 4 — Excelencia Operacional | `Implementado` | `L` | 60% | 4 |
| Pilar 5 — Mantenibilidad y Extensibilidad | `Validado` | `F` | 100% | 3 |
| Dimensión 1 — Conformidad de Protocolo MCP | `Validado` | `F` | 100% | 1 |
| Dimensión 2 — Cobertura de Tests y Quality Gates | `Validado` | `F` | 100% | 1 |
| Dimensión 3 — Completitud de Exposición de Gobernanza | `Validado` | `F` | 100% | 1 |
| Dimensión 4 — Experiencia de Desarrollador CLI | `Validado` | `F` | 100% | 1 |
| Dimensión 5 — Enforcement de Gobernanza Federada | `Diseñado` | `P` | 100% | 1 |

**Distribución: 5 `F` · 1 `L` · 4 `P` · 0 `N`.** Un estado se movió bajo esta regla: **el Pilar 2 se degradó de `Implementado` a `Diseñado`** ([GT-596](../gaps/gap-reference-catalog.es.md#gt-596)) porque sus tres afirmaciones — compilación de grafo de auth sobre Redis, gRPC interno, un gateway BFF — recalculan a 20%, e `Implementado` reclama `L` (más de 50%). Es la misma clase de defecto que `GT-576` tuvo que atrapar a mano; esta vez lo atrapó un gate.

> **Lo que esta tabla todavía no hace.** Los scores por capa ACMM de arriba (3.4 / 3.2 / 3.32) siguen siendo cifras escritas a mano, y **no** se han recalculado a partir de estos porcentajes de logro — ambas escalas conviven en paralelo, ninguna deriva de la otra. Leer `3.32 ± 0.4` como un número derivado de ISO sería incorrecto; es un juicio TOGAF ACMM con su incertidumbre declarada. Derivar el agregado desde los logros recalculados es el siguiente incremento, y es el residual de `GT-596`.

### Dimensión B: Score de Alcance de Gobernanza

| Indicador | Valor |
|---|---|
| Dimensiones topológicas gobernadas | 5/5 (100%) |
| Topologías con paridad dual-engine (corpus del repositorio) | 8/8 (100%) |
| Topologías con paridad dual-engine (publicado `@beyondnet/evolith-cli@1.1.0`) | 5/8 (63%) |
| Adaptadores de interacción en M4 | 6/6 (100%) |
| Anti-patrones inmunizados | 5/6 (83%) — Entrelazamiento de BD Compartida tiene solo defensa diseñada (sección 7) |
| Madurez AI (promedio en 5 dimensiones) | 2.2/3 (AI-Integrated) |

**Alcance de Gobernanza: COMPLETO en las 5 dimensiones topológicas**

### Veredicto Bidimensional Combinado

> **Evolith Core es una plataforma de gobernanza arquitectónica multi-dimensional con calidad interna nivel 3.32/5 (Definido → Gestionado).** Su alcance de gobernanza cubre el 100% de las topologías definidas (5 dimensiones × 8 topologías componibles) con paridad dual-engine en el corpus del repositorio, aunque solo 5 de esas 8 publican su mitad OPA en el paquete `@beyondnet/evolith-cli@1.1.0` y ninguna está cubierta por un gate OPA bloqueante en `main` (sección 8.6). Los 6 adaptadores de interacción están listos para producción (M4), 5 de los 6 anti-patrones críticos están inmunizados en código (el sexto tiene una defensa diseñada a la espera de una capa de persistencia), y la dimensión AI-Augmented tiene una capacidad (Tools) en Nivel 3 (AI-Orchestrated). Cada capacidad lleva ahora una calificación ISO/IEC 33020:2019 cuyo logro recalcula un gate en vez de afirmarlo un autor (secciones 2.1–2.3): 5 `F`, 1 `L`, 4 `P`. Brechas principales: pilar de seguridad reducido a `Diseñado` por falta de capa de persistencia, pilar de rendimiento reducido a `Diseñado` porque sus tres afirmaciones recalculan a 20%, pilar de confiabilidad (Nivel 3→4), progresión de adaptadores M4→M5 (tests, OPA guard, tracing), y AI Verification/Models/Security (Nivel 2→3).

### Reconciliación Actual

Los totales vigentes no se mantienen como texto narrativo. La [Reconciliación de Madurez](./maturity-reconciliation.json), legible por máquina, se genera desde el tablero canónico de Core, el registro de cierres, los inventarios y la metadata de release del CLI. `node .harness/scripts/ci/09-reconcile-maturity.mjs --check` falla cuando ese snapshot presenta drift.

La madurez de Tracker y Product Suite se excluye explícitamente del score de Core porque tienen ownership y ciclos de evidencia independientes. Su estado de producto no puede inflar esta evaluación.

---

*Esta es la única evaluación de madurez del Evolith Core. El seguimiento de gaps vive exclusivamente en el [Tablero de Seguimiento de Gaps](../gaps/gap-tracking.es.md).*

---
[Volver al Índice de Visión](../../README.es.md)
