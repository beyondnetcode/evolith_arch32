# Mapa Actual de Taxonomía del Repositorio

> **Navegación Bilingüe:** [English Version](./repository-taxonomy-map.md)

Este documento mapea la estructura actual del repositorio para lectores que necesitan entender qué contiene cada área, cómo usarla y qué tan crítica es la data allí. Complementa la [Política de Taxonomía y Estructuración del Repositorio](../repository-taxonomy.es.md); no la reemplaza.

## Propósito

Usa este mapa cuando necesites decidir dónde leer, editar, agregar o auditar contenido en Evolith Core. El README raíz envía a los lectores al [Hub de Visión, Madurez y Gaps](./README.es.md); este mapa es la vista operativa de taxonomía dentro del hub.

## Modelo de Criticidad

| Nivel | Significado | Regla de manejo |
|---|---|---|
| C0 | Crítico para release, seguridad, cumplimiento o gobernanza ejecutable | Tratar como alto riesgo. Actualizar contrapartes bilingües, reglas, scripts de validación y evidencia juntas cuando aplique. |
| C1 | Arquitectura normativa, estándares, contratos o guía operativa | Requiere revisión cuidadosa, enlaces estables, paridad bilingüe y validación antes de completar. |
| C2 | Soporte navegacional, referencia, investigación, evidencia aplicada o planeamiento | Mantener enlaces correctos y evitar promover ejemplos a estándares sin autoridad aceptada. |
| C3 | Estado generado, local, cache, dependencias o transitorio | No tratar como fuente de verdad. Regenerar o limpiar en vez de editar a mano salvo que esté documentado explícitamente. |

## Reglas de Navegación

| Regla | Qué hacer |
|---|---|
| Comenzar por el portal | Usar el [README](../../../../README.es.md) raíz y luego el [Índice Maestro Global](../../../navigation/MASTER_INDEX.es.md) cuando ya conozcas la familia del artefacto. |
| Mantener estándares en `reference/` | Documentos de arquitectura, gobernanza, SDLC, operaciones y referencia de productos pertenecen bajo `reference/`. |
| Mantener reglas ejecutables en `rulesets/` | La política arquitectónica legible por máquina pertenece en `rulesets/`; las reglas específicas por topología pertenecen en `rulesets/topologies/`. |
| Mantener implementación de producto fuera del corpus | `apps/`, `packages/`, `sdk/` y `tests/` locales soportan superficies de gobernanza ejecutable; el código de producto de negocio permanece fuera de este repositorio salvo alcance explícito. |
| No crear áreas raíz casualmente | Nuevos directorios raíz requieren autoridad taxonómica aceptada y actualización sincronizada de reglas/scripts. |
| Preservar paridad bilingüe | Archivos Markdown individuales usan `.es.md`; contenido español agrupado usa `-es/` solo cuando el área ya sigue esa convención. |

## Capa Raíz

| Ruta | Criticidad | Qué encuentras | Qué hacer allí | No hacer |
|---|---|---|---|---|
| `README.md`, `README.es.md` | C1 | Portal público, ruteo de dominios y puntos de entrada principales | Enrutar lectores a hubs, no a documentos dispersos | Convertirlo en un manual profundo de implementación |
| `MASTER_INDEX.md`, `MASTER_INDEX.es.md` | C1 | Navegación raíz exhaustiva | Mantener el ruteo de alto nivel completo y alineado con `reference/navigation/` | Agregar enlaces huérfanos o duplicar estándares detallados |
| `AGENTS.md`, `AGENTS.es.md` | C0 | Instrucciones vinculantes para agentes y reglas de ejecución del repositorio | Actualizar cuando cambie materialmente el stack o la conducta de gobernanza | Debilitar reglas de validación, bilingüismo o arquitectura |
| `DOCUMENTATION_VERSIONS.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `LICENSE` | C1 | Metadatos de release, contribución, versionado y legales | Mantener correcta la gobernanza pública del repositorio | Guardar decisiones arquitectónicas aquí |
| `package.json`, `package-lock.json` | C0 | Grafo de dependencias del workspace, scripts y lockfile | Actualizar mediante flujos de package manager y validar impacto en build/tests | Editar estado de dependencias a mano casualmente |
| `.env` | C0 | Configuración local de entorno cuando existe | Tratar como estado local sensible | Citar valores en documentación o usarlo como default autoritativo |

## Corpus de Referencia

| Ruta | Criticidad | Qué encuentras | Qué hacer allí | No hacer |
|---|---|---|---|---|
| `reference/core/` | C1 | Identidad, alcance y límites de Core | Usar para entender qué posee Evolith Core | Poner aquí elecciones de implementación específicas de producto |
| `reference/getting-started/` | C2 | Rutas cortas de lectura por rol | Mejorar onboarding por rol | Agregar decisiones normativas sin enlazar autoridad |
| `reference/navigation/` | C1 | Índice maestro global y activos de navegación | Mantener el ruteo completo del repositorio | Divergir del modelo de navegación raíz |
| `reference/architecture/` | C0 | Hub de arquitectura, ADRs, blueprints, patrones canónicos, principios y corpus topológico | Agregar autoridad arquitectónica, decisiones aceptadas y patrones reutilizables | Tratar decisiones específicas de UMS como universales sin autoridad de ADR/estándar |
| `reference/core/architecture/adrs/` | C0 | Registros de decisión arquitectónica aceptados, propuestos o reemplazados | Registrar decisiones arquitectónicas durables y actualizar enlaces entrantes | Ocultar decisiones en archivos de planeamiento o reportes |
| `reference/core/architecture/topologies/` | C1 | Guía topológica legible por humanos y reportes de madurez | Mantener guía de adopción, operación, evolución y madurez por topología | Poner reglas ejecutables aquí; usar `rulesets/topologies/` |
| `reference/governance/` | C0 | SDLC, estándares, gobernanza ADR, terminología y onboarding | Mantener reglas de gobernanza, gates de ciclo de vida y estándares | Crear gobernanza paralela bajo `docs/` raíz |
| `product/suite/` | C1 | Visión de portafolio, estrategia de suite, posicionamiento y comunicaciones | Alinear dirección de producto con gobernanza Core | Guardar artefactos de delivery que pertenecen a un producto específico |
| `product/products/` | C1 | Documentos internos de referencia para productos Evolith como Core API, Tracker, servicios MCP, Smart CLI y referencia UMS | Mantener documentación de producto alineada con estándares Core | Mezclar código fuente ejecutable con documentación de referencia |
| `product/research/` | C2 | Investigación, PoCs, evidencia aplicada, límite demo UMS e inteligencia arquitectónica | Capturar aprendizaje y promover lecciones reutilizables mediante ADRs/estándares | Promover investigación directamente a política obligatoria |
| `product/operations/` | C1 | SLOs, runbooks, observabilidad, alertas, pruebas de carga, experimentos de caos, Grafana, OTel y Tempo | Mantener readiness operativo y guía de respuesta a incidentes | Poner runbooks específicos de producto sin alcance reutilizable |
| `product/infra/` | C0 | Activos de referencia Docker, Helm, Kubernetes y plataforma | Tratar como referencia de infraestructura con riesgo productivo | Dejar defaults mutables o solo-dev sin documentar |
| `product/infra/` | C1 | Guía de plataformas CI/CD, observabilidad, SCM y seguridad | Mantener prácticas de plataforma consistentes entre productos | Codificar política ejecutable aquí en vez de `rulesets/` o workflows |
| `reference/quick-access/` | C2 | Navegación rápida | Enlazar lectores a hubs canónicos | Duplicar contenido autoritativo |

## Hub de Gobernanza y Reportes

| Ruta | Criticidad | Qué encuentras | Qué hacer allí | No hacer |
|---|---|---|---|---|
| `reference/core/control-center/README.es.md` | C1 | Hub de madurez, gaps, auditorías, oportunidades, evidencia y mapa de taxonomía | Agregar enlaces ordenados a superficies de revisión | Enlazar reportes solo desde secciones dispersas del README |
| `gap-tracking.es.md` | C0 | Backlog autoritativo y ordenado de gaps y oportunidades | Actualizar prioridad, estado y orden solo con evidencia | Trackear un gap en otro sitio como fuente de verdad |
| `gap-reference-catalog.es.md` | C0 | Problema, evidencia, criterios de cierre y referencias detalladas por `GT-*` | Agregar contexto detallado para nuevos gaps | Poner estado vivo aquí en vez del tablero |
| `maturity-assessment.es.md` | C1 | Evaluación consolidada de madurez | Actualizar evidencia de evaluación y enlazar desviaciones a ítems `GT-*` | Trackear gaps abiertos directamente en la evaluación |
| `gap-closure-evidence-standard.es.md`, `gap-closure-evidence.json` | C0 | Evidencia requerida de cierre y registro | Registrar evidencia de cierre reproducible | Marcar gaps semánticos como done sin evidencia en registro |
| `executive-summary.es.md`, `maturity-reconciliation.json`, `inventory-summary.es.md` | C2 | Evidencia ejecutiva, de madurez e inventario generada | Usar como evidencia de validación | Editar a mano salidas generadas sin proceso |
| `repository-taxonomy-map.es.md` | C1 | Mapa operativo actual de áreas del repositorio y criticidad | Usar durante navegación, auditorías, onboarding y decisiones de ubicación | Tratarlo como reemplazo de la política taxonómica aceptada |

## Gobernanza Ejecutable

| Ruta | Criticidad | Qué encuentras | Qué hacer allí | No hacer |
|---|---|---|---|---|
| `rulesets/` | C0 | Hub de gobernanza arquitectónica legible por máquina | Mantener reglas descubribles, versionadas y validadas | Guardar estándares solo-prosa aquí |
| `rulesets/opa/` | C0 | Políticas OPA/Rego transversales y schemas | Mantener paridad con evaluadores nativos cuando cambien reglas | Agregar Rego sin tests o paridad nativa cuando sea requerida |
| `rulesets/topologies/` | C0 | Reglas ejecutables específicas por topología | Preservar paridad de topologías aceptadas entre Native y OPA donde aplique | Poner guía topológica legible por humanos aquí |
| `rulesets/cross-cutting/` | C0 | Restricciones transversales y taxonomía del repositorio | Actualizar con cambios de reglas taxonómicas | Cambiar política sin validadores correspondientes |
| `rulesets/contracts/` | C0 | Reglas de contrato y fixtures | Mantener reproducibles ADR-0073 y contratos de superficie | Dejar que fixtures deriven del comportamiento CLI/MCP/API |
| `rulesets/sdlc/`, `rulesets/evidence/`, `rulesets/governance/`, `rulesets/adr/` | C0 | Reglas de validación de ciclo de vida, evidencia, gobernanza y ADR | Mantener la gobernanza exigida por CI sincronizada con estándares | Declarar una regla documental que ningún evaluador aplica |
| `rulesets/cli/`, `rulesets/mcp/`, `rulesets/architecture/`, `rulesets/infrastructure/`, `rulesets/observability/`, `rulesets/schema/`, `rulesets/acl/` | C0 | Dominios de validación por superficie | Actualizar cuando cambie la arquitectura o conducta runtime correspondiente | Mezclar dominios de reglas no relacionados |

## Workspaces de Producto y Runtime

| Ruta | Criticidad | Qué encuentras | Qué hacer allí | No hacer |
|---|---|---|---|---|
| `apps/core-api/` | C0 | Workspace del Service CORE API | Validar conducta API, contratos, auth, cache y endpoints de gobernanza | Tratarlo como código genérico de negocio de producto |
| `apps/agent-sandbox/` | C1 | Workspace de aplicación sandbox agéntica | Probar patrones de interacción agéntica de forma segura | Guardar secretos productivos o data de tenant |
| `packages/core-domain/` | C0 | Modelo de dominio Core y casos de uso | Preservar aislamiento DDD y lógica de dominio de gobernanza ejecutable | Agregar preocupaciones de infraestructura a la capa de dominio |
| `packages/core/` | C1 | Implementación de paquete core compartido | Mantener lógica runtime reutilizable con alcance y pruebas | Crear utilidades compartidas ambiguas sin ownership |
| `packages/infra-providers/` | C1 | Adaptadores de proveedores de infraestructura | Encapsular lógica de integración con plataforma/proveedor | Filtrar supuestos de proveedor hacia código de dominio |
| `packages/mcp-server/` | C0 | Implementación del servidor MCP | Mantener herramientas MCP, auth, contratos y transporte alineados con ADRs | Duplicar comportamiento solo-CLI sin paridad contractual |
| `packages/mcp-tools/` | C1 | Superficie del paquete de herramientas MCP | Mantener herramientas descubribles y alineadas a contratos | Mezclar workflows de producto no relacionados |
| `sdk/cli/` | C0 | Workspace y superficie de distribución de Smart CLI | Mantener CLI, plantillas, integración shell, validación local y paridad contractual | Usar `dist/` generado como fuente de verdad |
| `tests/contract/` | C0 | Tests contractuales entre superficies | Validar contratos roundtrip CLI/MCP/API | Deshabilitar cobertura contractual fallida sin gap registrado |

## Automatización y Tooling

| Ruta | Criticidad | Qué encuentras | Qué hacer allí | No hacer |
|---|---|---|---|---|
| `.harness/rules/` | C0 | Reglas vinculantes de repositorio y agentes | Actualizar con cambios de reglas y mantener paridad bilingüe/global cuando aplique | Cambiar conducta sin soporte en scripts de validación |
| `.harness/scripts/ci/` | C0 | Scripts de validación CI | Mantener ejecutables los gates documentados | Referenciar scripts inexistentes |
| `.harness/playbooks/` | C1 | Playbooks repetibles de auditoría e ingeniería | Usar para auditorías y workflows recurrentes | Tratar playbooks como opcionales cuando el alcance los requiere |
| `.harness/schemas/`, `.harness/templates/`, `.harness/agents/`, `.harness/adr/` | C1 | Schemas, plantillas, personas de agentes y activos de soporte ADR | Mantener consistentes los flujos generados y humanos | Agregar placeholders sin reglas de terminación |
| `.github/workflows/` | C0 | Workflows de GitHub Actions | Mantener CI alineado con gates documentados | Apuntar a scripts faltantes o actions de seguridad mutables |
| `.github/actions/`, `.github/ISSUE_TEMPLATE/` | C1 | Actions reutilizables y plantillas de colaboración | Mantener flujos de colaboración del repositorio | Codificar política arquitectónica solo en templates de issue |
| `.husky/` | C0 | Hooks Git locales | Mantener validación pre-commit consistente con CI | Omitir gates de validación documentados |
| `.bmad-core/` | C1 | Activos del método Spec-driven AI-DD, agentes, workflows y skills | Mantener activos de soporte del método | Poner estándares canónicos de Evolith solo dentro de activos BMAD |
| `.claude/`, `.mimocode/`, `.vscode/` | C2 | Configuración raíz específica de herramientas | Mantener contratos de herramienta requeridos en raíz | Mover a una carpeta agrupadora de setup |

## Estado Generado o Local

| Ruta | Criticidad | Qué encuentras | Qué hacer allí | No hacer |
|---|---|---|---|---|
| `node_modules/` y `node_modules/` de workspaces | C3 | Dependencias instaladas | Regenerar mediante install del package manager | Editar o citar como fuente |
| `dist/` bajo workspaces | C3 | Salida compilada | Limpiar/regenerar durante build y evitar contaminación de tests | Tratar como fuente autorada |
| `coverage/` y reportes generados | C3 | Salidas de tests y cobertura | Regenerar desde tests o scripts del harness | Editar métricas a mano |
| `.harness/tmp/` | C3 | Estado temporal del harness | Limpiar antes de auditorías cuando se requiera | Preservar como evidencia salvo promoción explícita |
| `.harness/reports/` | C2 | Reportes generados por harness como cobertura | Enlazar como evidencia cuando esté vigente | Asumir que reemplaza comandos de validación |
| `.release-please-manifest.json`, `release-please-config.json` | C1 | Estado y configuración de automatización de releases | Mantener determinística la automatización de release | Cambiar sin revisar impacto de release |

## Decisiones de Ubicación

| Si vas a agregar... | Ponlo aquí | Checks requeridos |
|---|---|---|
| Un gap, riesgo u oportunidad nueva | `gap-tracking.es.md` y `gap-reference-catalog.es.md` | Par bilingüe, validador de tracking, validador documental |
| Una superficie de navegación de madurez o auditoría | `reference/core/control-center/README.es.md` | Par bilingüe y validación de enlaces |
| Un estándar arquitectónico normativo | `reference/governance/standards/` o área arquitectónica aceptada | Par bilingüe, referencias autoritativas y reglas afectadas si es exigible |
| Una decisión arquitectónica | `reference/core/architecture/adrs/` | Actualizaciones de registro/índice ADR y enlaces entrantes |
| Guía topológica legible por humanos | `reference/core/architecture/topologies/` | Paridad de madurez topológica y guía bilingüe |
| Política topológica ejecutable | `rulesets/topologies/` y evaluador OPA/native correspondiente cuando aplique | Paridad dual-engine y validación de reglas topológicas |
| Planeamiento o estado específico de producto | `product/products/<producto>/` | Mantener alcance de producto explícito |
| Evidencia aplicada UMS | `product/research/demo/` | No promover como universal sin autoridad aceptada |
| Implementación runtime de superficies de gobernanza | `apps/`, `packages/`, `sdk/` o `tests/` | Build, tests, contratos y documentación afectada |
| Evidencia generada o temporal | Ubicación existente de salida generada | Comando reproducible y sin edición manual salvo documentación explícita |

## Validación

Después de cambiar este mapa o agregar enlaces relacionados con taxonomía, ejecutar:

```bash
node .harness/scripts/ci/01-validate-docs.mjs
node .harness/scripts/ci/04-check-bilingual-parity.mjs
node .harness/scripts/ci/23-check-orphan-bilingual.mjs
git diff --check
```

Ejecutar cobertura de reglas topológicas y checks de paridad dual-engine cuando cambios taxonómicos afecten manifiestos de topología, reglas topológicas o políticas arquitectónicas ejecutables.

---
[Volver al Hub de Visión, Madurez y Gaps](./README.es.md)
