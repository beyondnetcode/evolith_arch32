# Evolith Core — Preguntas y Respuestas

> **Navegación Bilingüe:** [English Version](./q-and-a.md)

**Estado:** Referencia Activa
**Responsable:** Evolith Architecture Board
**Creado:** 2026-07-23
**Última Actualización:** 2026-07-23

Este Q&A responde las preguntas más comunes sobre Evolith Core en lenguaje común, con ejemplos concretos y links a evidencia. Está organizado por tópicos y cubre tanto comprensión conceptual como uso práctico.

**Cómo usar este documento:** Navegue por categoría o busque una pregunta específica. Cada respuesta enlaza a su evidencia fuente (ADRs, secciones del assessment, schemas) para lectura profunda.

---

## Categoría 1: Sobre Evolith — ¿Qué es esto?

### T01-P01: ¿Qué es Evolith en una frase?

**Pregunta:** Si tuvieras que explicarle Evolith a alguien en 10 segundos, ¿qué dirías?

**Respuesta:** Evolith es un **framework ejecutable de gobernanza arquitectónica** — se asegura de que las decisiones de arquitectura realmente se cumplan, automáticamente, ya sea que el código lo escriba un humano o un agente AI.

Piensa en él como una "constitución" para tu software: define las reglas y luego verifica automáticamente que cada pieza de código, cada despliegue y cada decisión siga esas reglas.

**Ejemplo:** Imagina que tu equipo decide "todos los servicios deben usar schema-per-context." Evolith codifica esa decisión como una regla legible por máquina y luego bloquea automáticamente cualquier PR que comparta una tabla de base de datos entre contextos.

**Evidencia:** [ADR-0079 (Multi-Topology Reference Corpus)](../architecture/adrs/core/0079-multi-topology-reference-corpus.md), [README.md](../../README.md)

### T01-P02: ¿Para qué lo usaría yo?

**Pregunta:** Soy desarrollador. ¿Por qué me importaría Evolith?

**Respuesta:** Evolith te da tres cosas prácticas:

1. **Feedback instantáneo en decisiones arquitectónicas.** Ejecuta `evolith validate` y sabe en segundos si tu código sigue las reglas arquitectónicas de tu equipo — antes de siquiera hacer push.
2. **Sin más refactors sorpresa.** El drift arquitectónico se detecta en el gate, no seis meses después cuando alguien descubre que el sistema es un desorden.
3. **Gobernanza a prueba de AI.** Cuando un agente AI escribe código por ti, Evolith se asegura de que siga las mismas reglas que un arquitecto senior aplicaría.

**Ejemplo:** Estás trabajando en un monolito modular. Un agente AI genera un PR que accidentalmente importa un objeto de dominio de otro bounded context. La regla de boundaries de Evolith detecta esto inmediatamente — el PR se bloquea con una explicación clara de qué regla se violó y por qué.

**Evidencia:** [Gap Tracking Board](../control-center/gaps/gap-tracking.md), [ADR-0002 (Clean Architecture)](../architecture/adrs/nodejs/0002-clean-architecture-nestjs.md)

### T01-P03: ¿Qué beneficios me da como desarrollador?

**Pregunta:** ¿Qué gano yo personalmente, no solo el equipo?

**Respuesta:**

- **Onboarding más rápido.** En lugar de leer 50 páginas de wiki, ejecutas `evolith validate` y el sistema te dice exactamente qué está mal y cómo arreglarlo.
- **Confianza en PRs.** Sabes que si Evolith pasa, tu código sigue la arquitectura. Sin más adivinanzas.
- **Menos cambio de contexto.** Evolith consolida reglas de múltiples fuentes (ADRs, patrones, schemas) en un solo comando.
- **Integración AI.** Si usas Cursor, Claude Desktop o cualquier herramienta compatible con MCP, Evolith alimenta el contexto de gobernanza directamente a tu asistente AI.

**Ejemplo:** Un nuevo miembro del equipo ejecuta `evolith validate --topology modular-monolith` y obtiene un reporte claro: "3 violaciones encontradas: import cross-context (GT-19), plan de unit tests faltante (GT-42), dependencia sin versionar (GT-33)." Cada violación enlaza a la regla y al ADR que explica *por qué*.

**Evidencia:** [Evolith CLI hub](../../../product/products/smart-cli/README.md), [Using the CLI guide](../interfaces/using-the-cli.md)

### T01-P04: ¿Qué beneficios me da como arquitecto?

**Pregunta:** Soy el arquitecto. ¿Cómo me ayuda Evolith?

**Respuesta:**

- **Aplicar decisiones automáticamente.** Tus ADRs se convierten en reglas legibles por máquina, no documentos que la gente olvida leer.
- **Medir la salud arquitectónica.** El assessment de madurez te da un score (3.32/5) con claims respaldados por evidencia, no sensaciones.
- **Rastrear desviaciones.** 568 governance gaps trackeados, 554 cerrados — tienes un inventario preciso de lo que está hecho y lo que no.
- **Soporte multi-topología.** Ya sea que tu producto sea un monolito, event-driven, serverless, o una combinación, Evolith gobierna todos con el mismo framework.

**Ejemplo:** Apruebas ADR-0031 (Schema Per Context). Evolith crea automáticamente una regla que bloquea joins cross-schema en CI. Seis meses después, el assessment de madurez muestra "Schema Per Context: Validado" con evidencia de 121 tests E2E pasando.

**Evidencia:** [Maturity Assessment (Section 8)](../control-center/maturity-reports/maturity-assessment.md), [ADR Matrix](../architecture/adrs/adr-matrix.md)

### T01-P05: ¿Qué beneficios me da como líder de equipo o manager?

**Pregunta:** Administro el equipo. ¿Cuál es el valor de negocio?

**Respuesta:**

- **Entrega predecible.** Los gates de fase enfocan la calidad en cada etapa — las sorpresas se detectan temprano cuando son baratas de arreglar.
- **Auditoría.** Cada decisión arquitectónica está documentada (ADRs), cada gap está trackeado (ítems GT-xx), y cada cierre tiene evidencia verificable (commits git + comandos de validación).
- **Riesgo reducido.** Las inmunizaciones contra anti-patrones previenen los seis errores arquitectónicos de mayor riesgo (monolito distribuido, base de datos compartida, etc.).
- **Ahorro de costos.** El drift arquitectónico, el retrabajo y los refactors de emergencia son los costos ocultos del software. Evolith los previene sistemáticamente.

**Ejemplo:** Antes de Evolith, tu equipo pasó 3 semanas refactorizando un "monolito distribuido" que se había colado en 6 meses. Después de Evolith, la regla de bus de eventos asíncrono (ADR-0015) habría capturado la primera cadena síncrona cross-módulo en el estágio de PR.

**Evidencia:** [Anti-Pattern Immunization (Section 7)](../control-center/maturity-reports/maturity-assessment.md), [Product Vision Master](../../../product/suite/vision/evolith-product-vision-master.md)

### T01-P06: ¿Es lo mismo que un linter o un analyzer estático?

**Pregunta:** ¿Cómo se diferencia Evolith de ESLint, SonarQube o Checkstyle?

**Respuesta:** Los linters revisan estilo de código y patrones simples. Evolith revisa **decisiones arquitectónicas** — las elecciones de alto nivel que dan forma a tu sistema.

| | Linter (ESLint) | Analyzer (SonarQube) | Evolith |
|---|---|---|---|
| **Alcance** | Estilo, sintaxis | Calidad, bugs, vulnerabilidades | Reglas arquitectónicas, gobernanza, compliance topológico |
| **Enforcement** | IDE local, CI | Pipeline CI | CI + gates + MCP + agentes |
| **Fuente de reglas** | Config files | Built-in + plugins | ADRs, topologías, schemas (tus propias decisiones) |
| **Dual-engine** | No | No | Sí (TypeScript Nativo + OPA) |
| **Integración AI** | No | Limitada | Servidor MCP completo para agentes AI |

**Ejemplo:** SonarQube detecta un code smell. Evolith detecta que tu módulo está importando de un bounded context que no le pertenece — una violación a nivel de decisión que ningún linter vería.

**Evidencia:** [ADR-0041 (Dual-Engine Policy Evaluation)](../architecture/adrs/core/0041-dual-engine-policy-evaluation.md), [Maturity Assessment (Section 4)](../control-center/maturity-reports/maturity-assessment.md)

### T01-P07: ¿Necesito ser experto en arquitectura para usarlo?

**Pregunta:** Suena complejo. ¿Puede usarlo un desarrollador junior?

**Respuesta:** Sí. Evolith está diseñado para consumirse en diferentes niveles:

- **Como desarrollador:** Ejecuta `evolith validate` y arregla lo que reporta. No necesitas entender la arquitectura completa — solo seguir el feedback.
- **Como tech lead:** Usa `evolith gate` para verificar la preparación de fases. El sistema te dice exactamente qué falta.
- **Como arquitecto:** Usa `evolith drift` para detectar drift arquitectónico en el tiempo. Aquí es donde el conocimiento profundo importa.

El CLI, las herramientas MCP y la integración AI proporcionan complejidad graduada — comandos simples para necesidades simples, análisis profundo cuando lo necesitas.

**Ejemplo:** Un desarrollador junior ejecuta `evolith validate` y obtiene: "PASS — sin violaciones encontradas." Hace push con confianza. Un arquitecto senior ejecuta `evolith drift --topology modular-monolith` y obtiene un reporte detallado sobre tendencias de compliance de boundaries.

**Evidencia:** [Using the CLI guide](../interfaces/using-the-cli.md), [Evolith CLI hub](../../../product/products/smart-cli/README.md)

---

## Categoría 2: Productos y Costos

### T02-P01: ¿Qué productos tiene Evolith?

**Pregunta:** ¿Cuáles son las diferentes partes de Evolith?

**Respuesta:** Evolith tiene estos productos:

| Producto | Qué es | Costo |
|---|---|---|
| **Evolith Core** | La base: reglas, ADRs, estándares, schemas, rulesets, políticas OPA | Gratis (MIT) |
| **Evolith CLI** | Gobernanza desde línea de comandos: validate, scaffold, drift, gates | Gratis (MIT, npm) |
| **Core API** | Servicio REST para consultas de gobernanza remotas | Gratis (open source) |
| **MCP Services** | Integración de herramientas AI vía Model Context Protocol | Gratis (dentro del CLI) |
| **Agent Runtime** | Capa de orquestación hexagonal para agentes AI | Gratis (open source) |
| **UMS Reference** | Proyecto satélite de ejemplo mostrando adopción | Gratis (open source) |
| **Evolith Tracker** | Orquestador SDLC enterprise con gobernanza multi-tenant | Pago (Enterprise) |

**Evidencia:** [Product hub](../../../product/README.md), [Ecosystem and Communication](../../../product/products/ecosystem-and-communication.md)

### T02-P02: ¿Cuánto cuesta? ¿Es de pago?

**Pregunta:** ¿Tengo que pagar por Evolith?

**Respuesta:** La plataforma core es **completamente gratis** bajo licencia MIT. Esto incluye:

- Los 137 ADRs, 163 rulesets, 45 schemas, 34+ políticas OPA
- El CLI (`npm install -g @beyondnet/evolith-cli`)
- El servidor MCP (integrado en el CLI)
- El Core API (servicio REST)
- El Agent Runtime
- La implementación de referencia UMS

El único producto de pago es **Evolith Tracker**, que es la capa de orquestación enterprise (aún no lanzada).

**Ejemplo:** Un startup de 5 personas puede usar el stack completo de gobernanza Evolith por $0. Una empresa de 500 personas que necesita gobernanza multi-tenant, audit trails inmutables y packs de compliance pagaría por Tracker.

**Evidencia:** [Open-Core Strategy (Section 9)](../control-center/maturity-reports/maturity-assessment.md), [Product Vision Master](../../../product/suite/vision/evolith-product-vision-master.md)

### T02-P03: ¿Qué es "Open-Core" y qué cubre el tier gratuito?

**Pregunta:** ¿Qué significa "open-core" en la práctica?

**Respuesta:** Open-Core significa que la plataforma fundacional es open source y gratis, mientras que las funcionalidades enterprise se monetizan por separado.

**Tier gratuito (Core + CLI + MCP + API):**
- Motor completo de gobernanza arquitectónica
- Todas las reglas, schemas y políticas OPA
- CLI de validación y scaffolding
- Integración MCP para herramientas AI
- API REST para consultas remotas
- SDK de adaptadores comunitario

**Tier pago (Tracker):**
- Gobernanza multi-tenant
- Audit trail inmutable
- Gates, políticas, excepciones, aprobaciones configurables
- Integraciones certificadas
- Soporte enterprise y SLA

**Ejemplo:** Tu equipo usa el CLI y MCP tools gratis diariamente. Cuando necesites probar compliance a un auditor across 20 repositorios con trails de evidencia inmutables, ahí es donde Tracker agrega valor.

**Evidencia:** [Product Vision Master](../../../product/suite/vision/evolith-product-vision-master.md), [Tracker hub](../../../product/products/evolith-tracker/README.md)

### T02-P04: ¿Qué es Evolith Tracker y por qué es de pago?

**Pregunta:** ¿Qué hace Tracker que Core no hace?

**Respuesta:** Core es el **motor** — evalúa reglas, gates y políticas. Tracker es la **sala de control** — orquesta quién ejecuta qué, cuándo, y registra la evidencia permanentemente.

| Capacidad | Core (Gratis) | Tracker (Pago) |
|---|---|---|
| Evaluación de reglas | Sí | Sí (vía Core API) |
| Gobernanza multi-tenant | No | Sí |
| Audit trail inmutable | No | Sí |
| Gates/políticas configurables | Básico | Completo |
| Flujos de excepción/aprobación | No | Sí |
| Packs de compliance (SOC2, ISO) | No | Sí |
| Dashboards ejecutivos | No | Sí |

**Nota:** Tracker aún está en etapa de diseño — no existe código fuente. La obligación de Core es el contrato API/MCP que consumirá.

**Evidencia:** [Tracker hub](../../../product/products/evolith-tracker/README.md), [Maturity Assessment (Section 9)](../control-center/maturity-reports/maturity-assessment.md)

### T02-P05: ¿Necesito infraestructura especial para usarlo?

**Pregunta:** ¿Necesito Kubernetes, una base de datos o un servidor?

**Respuesta:** No. El flujo de trabajo core es:

```bash
npm install -g @beyondnet/evolith-cli
evolith init
evolith validate
```

Eso es todo. Sin base de datos, sin servidor, sin Docker. El CLI corre localmente y valida tu repositorio.

El servidor MCP también viene dentro del CLI — sin despliegue separado. El Core API es opcional y solo se necesita si quieres consultas de gobernanza remotas.

**Evidencia:** [Using the CLI guide](../interfaces/using-the-cli.md), [MCP Services hub](../../../product/products/mcp-services/README.md)

### T02-P06: ¿Cómo se compara con herramientas como SonarQube o Checkstyle?

**Pregunta:** Ya usamos SonarQube. ¿Por qué agregaríamos Evolith?

**Respuesta:** Resuelven problemas diferentes y se complementan:

| | SonarQube | Evolith |
|---|---|---|
| **Enfoque** | Calidad de código, bugs, vulnerabilidades | Gobernanza arquitectónica, compliance topológico |
| **Granularidad** | Análisis línea por línea | A nivel de módulo, topología, sistema |
| **Fuente de reglas** | Built-in + plugins | Tus propios ADRs y decisiones |
| **Integración AI** | Limitada | Servidor MCP completo para agentes AI |
| **Gate enforcement** | Quality gate de CI | Gates de fase SDLC (5 gates, basados en evidencia) |

**Ejemplo:** SonarQube detecta un potencial null pointer. Evolith detecta que tu nuevo servicio está importando de tres bounded contexts diferentes — creando acoplamiento que causará problemas en 6 meses.

**Evidencia:** [Maturity Assessment (Section 4)](../control-center/maturity-reports/maturity-assessment.md), [ADR-0005 (Automated SAST)](../architecture/adrs/core/0005-automated-sast-quality-gates.md)

---

## Categoría 3: Cómo Empezar (How-to)

### T03-P01: ¿Cómo instalo el Evolith CLI?

**Pregunta:** ¿Cuál es la forma más rápida de empezar?

**Respuesta:**

```bash
npm install -g @beyondnet/evolith-cli
evolith --version
```

Requisitos: Node.js >= 20.0.0. Eso es todo.

**Evidencia:** [Evolith CLI hub](../../../product/products/smart-cli/README.md)

### T03-P02: ¿Cómo inicializo un proyecto con Evolith?

**Pregunta:** Tengo un proyecto existente. ¿Cómo lo conecto a Evolith?

**Respuesta:**

```bash
cd tu-proyecto
evolith init
```

Esto crea un manifiesto `evolith.yaml` que declara tu topología, reglas heredadas y configuración de fases. El sistema valida tu proyecto contra las reglas desde ese punto.

**Ejemplo:** Para un monolito modular: `evolith init --topology modular-monolith`. Para un proyecto event-driven: `evolith init --topology modular-monolith --compose event-driven`.

**Evidencia:** [Topology Dimensions Model](../architecture/topologies/topology-dimensions.md), [ADR-0079](../architecture/adrs/core/0079-multi-topology-reference-corpus.md)

### T03-P03: ¿Cómo valido que mi código cumple las reglas?

**Pregunta:** ¿Qué comando verifica si mi código es compliant?

**Respuesta:**

```bash
evolith validate
```

Esto ejecuta todas las reglas aplicables contra tu proyecto y reporta violaciones con explicaciones claras. Puedes acotar el alcance:

```bash
evolith validate --topology modular-monolith    # Reglas específicas de topología
evolith validate --phase construction            # Reglas de fase SDLC
evolith validate --adr 0031                      # Compliance con ADR específico
```

**Evidencia:** [Using the CLI guide](../interfaces/using-the-cli.md)

### T03-P04: ¿Cómo conecto Evolith a mi CI/CD?

**Pregunta:** ¿Cómo hago que Evolith corra automáticamente en mi pipeline?

**Respuesta:** Usa el composite action en tu workflow de GitHub Actions:

```yaml
- uses: beyondnetcode/evolith-validate@v1
  with:
    topology: modular-monolith
    phase: construction
```

O ejecuta el CLI directamente:

```bash
evolith validate --fail-on-violation
```

Esto sale con código distinto de cero si hay violaciones, lo que bloquea el pipeline de CI.

**Evidencia:** [CI scripts taxonomy](../../../reference/harness/scripts-taxonomy.md), [ADR-0018 (Testing Pyramid)](../architecture/adrs/core/0018-testing-pyramid-quality-gates.md)

### T03-P05: ¿Cómo integro Evolith con Cursor o Claude Desktop?

**Pregunta:** Uso herramientas de coding AI. ¿Cómo funciona Evolith con ellas?

**Respuesta:** Evolith envía un servidor MCP dentro del CLI. Agrégalo a la configuración de tu herramienta AI:

```json
{
  "mcpServers": {
    "evolith": {
      "command": "evolith",
      "args": ["mcp"]
    }
  }
}
```

Una vez conectado, tu agente AI puede:
- Consultar reglas arquitectónicas antes de generar código
- Validar su output contra reglas de topología
- Evaluar la preparación de gates de fase
- Detectar drift arquitectónico

**Ejemplo:** Le pides a Cursor: "Crea un nuevo módulo de servicio." Cursor consulta Evolith MCP: "¿Qué reglas aplican a un nuevo módulo en un monolito modular?" Evolith retorna: "Schema-per-context requerido (ADR-0031), reglas de boundaries aplican (eslint-plugin-boundaries), plan de unit tests requerido (GT-42)." Cursor genera código que sigue las tres reglas.

**Evidencia:** [MCP Services hub](../../../product/products/mcp-services/README.md), [ADR-0069 (AI Agent Context Protocol)](../architecture/adrs/core/0069-ai-agent-context-protocol-integration.md)

---

## Categoría 4: Arquitectura y Topologías

### T04-P01: ¿Qué son las 5 dimensiones topológicas?

**Pregunta:** Mencionan "5 dimensiones." ¿Cuáles son?

**Respuesta:** Evolith organiza la arquitectura en 5 dimensiones independientes, cada una respondiendo una pregunta diferente:

| Dimensión | Pregunta | Topologías |
|---|---|---|
| **Progressive Axis** | ¿Cómo se decompone el sistema? | Modular Monolith, Distributed Modules, Microservices |
| **Execution** | ¿Dónde corre el código? | Serverless, Edge Computing |
| **Integration** | ¿Cómo se comunican los componentes? | Event-Driven |
| **Data** | ¿Cómo se distribuye la propiedad de datos? | Data Mesh |
| **AI** | ¿Cómo se gobiernan los agentes AI? | Agentic AI |

Un producto puede combinar topologías de diferentes dimensiones. Por ejemplo: `modular-monolith + event-driven + serverless` es una combinación válida.

**Evidencia:** [Topology Dimensions Model](../architecture/topologies/topology-dimensions.md), [ADR-0079](../architecture/adrs/core/0079-multi-topology-reference-corpus.md)

### T04-P02: ¿Qué topologías cubre y qué hace cada una?

**Pregunta:** ¿Cuáles son las 8 topologías?

**Respuesta:**

| Topología | Dimensión | Qué significa |
|---|---|---|
| **Modular Monolith** | Progressive | Una unidad desplegable con boundaries internos estrictos |
| **Distributed Modules** | Progressive | Múltiples módulos desplegables con extracción controlada |
| **Microservices** | Progressive | Servicios independientemente desplegables |
| **Serverless** | Execution | Código corre en infraestructura gestionada (AWS Lambda, etc.) |
| **Edge Computing** | Execution | Código corre cerca de los usuarios (CDN edge, IoT) |
| **Event-Driven** | Integration | Componentes se comunican vía eventos async |
| **Data Mesh** | Data | Propiedad de datos distribuida por dominio |
| **Agentic AI** | AI | Agentes AI gobernados por boundaries de confianza y sandboxes |

Las 8 topologías tienen paridad dual-engine (reglas Native + OPA), validación CI y documentación bilingüe.

**Evidencia:** [Maturity Assessment (Section 8)](../control-center/maturity-reports/maturity-assessment.md)

### T04-P03: ¿Por qué Evolith cubre múltiples topologías y no solo una?

**Pregunta:** La mayoría de frameworks eligen un estilo. ¿Por qué Evolith soporta todos?

**Respuesta:** Porque los productos reales no caben en una caja. Un producto enterprise típico puede ser:

- Un **monolito modular** para su dominio core
- Usando integración **event-driven** entre módulos
- Con funciones **serverless** para cargas de trabajo específicas
- Ejecutando **agentes AI** para gobernanza automatizada

El modelo dimensional de Evolith te permite componer libremente. La regla clave: **las topologías de diferentes dimensiones se componen** vía `spec.compatibility.composableWith`.

**Ejemplo:** Tu producto es un monolito modular (progressive-axis) que usa integración event-driven (dimensión integration) y despliega algunas funciones como serverless (dimensión execution). Evolith gobierna las tres dimensiones simultáneamente con un solo manifiesto `evolith.yaml`.

**Evidencia:** [Topology Composition](../architecture/topologies/topology-dimensions.md#3-composition-rule), [Composition Schema](../../../src/rulesets/schema/topology-composition.schema.json)

### T04-P04: ¿Qué significa que las topologías sean "componibles"?

**Pregunta:** ¿Qué es la composición de topologías?

**Respuesta:** Composición significa que puedes combinar topologías de diferentes dimensiones en una sola configuración de producto. Dos topologías se componen cuando:

1. Pertenecen a **diferentes dimensiones** (ej. progressive-axis + integration)
2. Sus manifiestos declaran explícitamente `composableWith` la una para la otra

Dos topologías "hub" se componen con todo:
- **Event-Driven** se compone con las 7 topologías restantes
- **Agentic AI** se compone con las 7 topologías restantes

**Ejemplo:** `modular-monolith + event-driven` es una composición válida. `modular-monolith + microservices` NO es válida (ambas son progressive-axis — debes evolucionar de una a la otra, no ejecutar ambas).

**Evidencia:** [Composition Matrix](../control-center/maturity-reports/maturity-assessment.md), [Composition Validation Script](../../../.harness/scripts/ci/22-validate-topology-composition.mjs)

### T04-P05: ¿Cuál es la diferencia entre F1/F2/F3 y las topologías?

**Pregunta:** Veo "F1" y "modular-monolith" usados indistintamente. ¿Son lo mismo?

**Respuesta:** F1, F2 y F3 son **aliases legacy** solo para la dimensión progressive-axis:

| Alias Legacy | Topología Canónica |
|---|---|
| F1 | `modular-monolith` |
| F2 | `distributed-modules` |
| F3 | `microservices` |

La palabra "phase" fue eliminada del contrato de topología. F1-F5 NO son fases SDLC — son posiciones en el eje de arquitectura progresiva.

**Ejemplo:** "Estamos en F1" significa "nuestra arquitectura es un monolito modular." NO significa "estamos en la fase 1 del SDLC."

**Evidencia:** [Glossary Ecosystem (F1-F5 definition)](./glossary/glossary-ecosystem.md#terms), [ADR-0079](../architecture/adrs/core/0079-multi-topology-reference-corpus.md)

### T04-P06: ¿Por qué debo empezar con "monolito modular" y no con microservicios?

**Pregunta:** Los microservicios son modernos. ¿Por qué empezar simple?

**Respuesta:** Porque la distribución prematura es el error #1 que Evolith previene. La progresión es:

1. **Empezar con monolito modular** — boundaries internos estrictos, una unidad desplegable
2. **Extraer a módulos distribuidos** — cuando un módulo necesita escalado, despliegue u ownership independiente
3. **Migrar a microservicios** — solo cuando la madurez operacional justifica el costo

Cada paso requiere evidencia (criterios de readiness de extracción ADR-0045). Evolith trackea tu posición en este eje y aplica las reglas en cada nivel.

**Ejemplo:** Un startup comienza como monolito modular (F1). Después de 18 meses, el módulo de billing necesita escalado independiente. Presentan evidencia de que cumple los criterios de extracción (ADR-0045) y Evolith actualiza su configuración de topología a distributed-modules (F2).

**Evidencia:** [ADR-0045 (Extraction Readiness Criteria)](../architecture/adrs/core/0045-microservice-extraction-readiness-criteria.md), [ADR-0047 (Architectural Patterns)](../architecture/adrs/core/0047-architectural-patterns-monolith-soa-microservices.md)

---

## Categoría 5: Madurez y Medición

### T05-P01: ¿Qué significa el score 3.32/5 en palabras simples?

**Pregunta:** Dicen que el score es 3.32 de 5. ¿Qué significa para mí?

**Respuesta:** En una escala donde:
- **1 = Inicial** (caótico, sin procesos)
- **2 = Entendido** (procesos básicos existen)
- **3 = Definido** (procesos documentados y estandarizados)
- **4 = Gestionado** (procesos medidos y controlados)
- **5 = Optimizando** (mejora continua)

Evolith está en **3.3** — en transición de "tenemos procesos documentados" a "automáticamente medimos y controlamos."

**En términos prácticos:** La arquitectura está bien definida, las decisiones están documentadas (137 ADRs), las reglas son ejecutables por máquina (163 rulesets), y CI valida compliance. Lo que falta: algunos pilares necesitan más automatización (testing de confiabilidad, chaos engineering) y la capa AI necesita integración más profunda.

**Evidencia:** [Maturity Assessment (Section 12)](../control-center/maturity-reports/maturity-assessment.md)

### T05-P02: ¿Por qué tiene dos dimensiones de madurez y no una?

**Pregunta:** ¿Por qué no solo un score?

**Respuesta:** Porque una plataforma puede ser internamente excelente pero inútil en la práctica, o ampliamente aplicable pero mal construida. Las dos dimensiones miden:

- **Dimensión A (Calidad Interna):** ¿Está bien construido Evolith? (Score: 3.32/5)
- **Dimensión B (Alcance de Gobernanza):** ¿Cuánto gobierna? (5/5 dimensiones, 8/8 topologías)

Un framework con Dimensión A = 4 pero Dimensión B = 1 sería "perfectamente construido pero solo gobierna monolitos." Evolith tiene Dimensión B = 5 porque cubre el espectro topológico completo.

**Evidencia:** [Maturity Assessment (Section 1)](../control-center/maturity-reports/maturity-assessment.md)

### T05-P03: ¿Qué significa "Level 4 (Managed)" en la práctica?

**Pregunta:** Varios pilares están en "Level 4." ¿Qué significa día a día?

**Respuesta:** Level 4 significa que el proceso se **mide y controla automáticamente**, no solo está documentado. Concretamente:

- **Seguridad (Level 4):** CodeQL corre en cada PR, las dependencias están fijadas a versiones exactas, las vulnerabilidades se trackean automáticamente — no solo "tenemos una política de seguridad."
- **Excelencia Operacional (Level 4):** Los builds son deterministas (Nx), la telemetría es automática (LGTM + OTel), feature flags desacoplan deployment de release — no solo "tenemos CI."
- **Mantenibilidad (Level 4):** Los boundaries hexagonales se aplican vía `eslint-plugin-boundaries`, el desacoplamiento event-driven se valida — no solo "seguimos clean architecture."

**Evidencia:** [Maturity Assessment (Section 3)](../control-center/maturity-reports/maturity-assessment.md)

### T05-P04: ¿Qué tan seguro está el sistema?

**Pregunta:** ¿Qué nivel de seguridad alcanza Evolith?

**Respuesta:** Seguridad está en **Level 4 (Gestionado), Validado** — el pilar con mayor puntuación.

Las defensas incluyen:
- **SAST automatizado** vía CodeQL en cada PR (ADR-0005)
- **Fijación de dependencias** con lockfiles exactos + gestión automatizada de vulnerabilidades (ADR-0009)
- **Aislamiento multi-tenant** vía Row-Level Security (ADR-0010)
- **Audit trails inmutables** vía CDC (ADR-0016)
- **Políticas ABAC** en dual-engine (OPA + TypeScript) para acceso MCP

**Camino al Level 5:** Penetration testing automatizado en CI, rotación dinámica de secretos.

**Evidencia:** [Maturity Assessment (Section 3, Pillar 1)](../control-center/maturity-reports/maturity-assessment.md)

### T05-P05: ¿Qué tan rápido es?

**Pregunta:** ¿Qué hay de la performance?

**Respuesta:** Performance está en **Level 4 (Gestionado), Implementado** (requiere validación por load testing).

Afirmaciones clave de performance:
- Compilación del grafo de auth bajo 5ms usando Redis (ADR-0021)
- Dual-protocolo: REST público, gRPC interno (ADR-0027)
- Caching de 4 niveles: Cliente → CDN → BFF → Core

**Camino al Level 5:** Auto-escalado serverless, caching predictivo.

**Evidencia:** [Maturity Assessment (Section 3, Pillar 2)](../control-center/maturity-reports/maturity-assessment.md)

### T05-P06: ¿Qué está roto o en riesgo?

**Pregunta:** ¿Cuáles son los puntos débiles?

**Respuesta:** Dos áreas necesitan atención:

1. **Confiabilidad y Resiliencia (Level 3):** Los circuit breakers están diseñados (ADR-0011) pero no testeados. El DR multi-región está propuesto (ADR-0013) pero no implementado. Falta: chaos engineering, multi-región activo-activo.

2. **Gobernanza Federada Runtime (Level 3):** Las reglas de herencia existen, pero falta la validación de contenido. La evidencia de phase gates es "solo-existencia" — verifica que los artefactos existan, no que cumplan umbrales de calidad.

**Evidencia:** [Maturity Assessment (Section 3, Pillar 3)](../control-center/maturity-reports/maturity-assessment.md), [Maturity Assessment (Section 4, Dimension 5)](../control-center/maturity-reports/maturity-assessment.md)

---

## Categoría 6: Dual-Engine y Reglas

### T06-P01: ¿Qué es "Dual-Engine Parity" y por qué existen dos motores?

**Pregunta:** ¿Por qué las reglas existen en TypeScript y OPA?

**Respuesta:** Dual-Engine Parity (R-25) significa que cada regla ejecutable debe existir en dos formas:

1. **TypeScript Nativo** (`.rules.json`) — evaluado por el motor Core
2. **OPA Rego** (`.rego`) — compilado a WASM, evaluado por Open Policy Agent

Esto asegura:
- **Correctitud:** Ambos motores deben estar de acuerdo. Si discrepan, el parity gate falla en CI.
- **Flexibilidad:** Las reglas TypeScript se integran con tu app; las reglas OPA se integran con Kubernetes, CI y motores de política externos.
- **Confianza:** Dos implementaciones independientes de la misma regla capturan bugs de implementación.

**Ejemplo:** La regla `MODMON-001` (sin imports cross-context) existe como `modular-monolith.rules.json` (Native) y `modular-monolith.rego` (OPA). CI ejecuta ambas contra los mismos fixtures. Si una pasa y la otra falla, el parity gate bloquea el merge.

**Evidencia:** [ADR-0041 (Dual-Engine Policy Evaluation)](../architecture/adrs/core/0041-dual-engine-policy-evaluation.md), [Maturity Assessment (Section 8.2)](../control-center/maturity-reports/maturity-assessment.md)

### T06-P02: ¿Qué pasa si una regla falla en un motor pero no en el otro?

**Pregunta:** ¿Qué si TypeScript dice "pass" pero OPA dice "fail"?

**Respuesta:** El pipeline de CI **falla**. El parity gate (`ci/27-opa-parity-gate.mjs`) compila OPA a WASM y evalúa los mismos fixtures que las reglas Nativas. Cualquier drift entre motores se trata como un build failure.

Esto se aplica con los parity fixtures: `parity-fixtures/compliant.json` (debe pasar ambos motores) y `parity-fixtures/violation.json` (debe fallar ambos motores).

**Evidencia:** [OPA Parity Gate script](../../../.harness/scripts/ci/27-opa-parity-gate.mjs), [ADR-0041](../architecture/adrs/core/0041-dual-engine-policy-evaluation.md)

### T06-P03: ¿Cómo se ejecutan las reglas en mi CI?

**Pregunta:** ¿Qué ejecuta realmente las reglas?

**Respuesta:** Múltiples caminos:

1. **CLI (local):** `evolith validate` ejecuta evaluación Nativa TypeScript localmente
2. **CI (GitHub Actions):** `evolith validate --fail-on-violation` o el composite action `evolith-validate`
3. **Core API (remoto):** `POST /api/v1/architecture/validate` ejecuta ambos motores remotamente
4. **MCP (agentes AI):** Herramienta `evolith-validate` disponible para cualquier agente AI conectado

Todos los caminos usan las mismas definiciones de reglas y producen el mismo output envelope (ADR-0073).

**Evidencia:** [Using the CLI guide](../interfaces/using-the-cli.md), [Core API hub](../../../product/products/core-api/README.md)

### T06-P04: ¿Qué son los 45 JSON schemas y qué validan?

**Pregunta:** Mencionan 45 schemas. ¿Qué cubren?

**Respuesta:** Los schemas validan cada artefacto estructurado del sistema:

| Dominio | Schemas | Ejemplos |
|---|---|---|
| Arquitectura | 5 | ADR, Blueprint, Design Block, Design Template, Pattern |
| Artefactos SDLC | 8 | PRD, Functional Story, Technical Story, Test Summary, Release Notes |
| Topología | 3 | Topology Manifest, Composition, Recommendation |
| Configuración | 4 | evolith.yaml, Workspace, Tenant, Tenant Override |
| Evaluación | 5 | Evaluation Context, Result, Gate Evidence, SDLC Gate, SDLC Phase |
| Sistema de Reglas | 3 | Rule Definition, Ruleset Standard, Ruleset SDLC |
| Violación y Evidencia | 4 | Violation, Enforcer Evidence, Maturity Evidence, Integration Evidence |
| Planeación | 4 | Ballpark Estimation, Build vs Compose, CLI Impact, Technical Feasibility |
| Seguridad | 2 | Security Scan Report, Waiver |
| Knowledge | 3 | Knowledge Intake, Knowledge Projection, Source Registry |
| Otros | 4+ | Output Envelope, Observability, Rollback, On-Call Handoff |

**Evidencia:** [Schema directory](../../../src/rulesets/schema/), [ADR-0073 (Unified Output Envelope)](../architecture/adrs/core/0073-unified-cli-output-contract.md)

### T06-P05: ¿Puedo crear mis propias reglas?

**Pregunta:** ¿Puedo agregar reglas específicas para mi proyecto?

**Respuesta:** Sí. Puedes:

1. **Agregar reglas a `evolith.yaml`** — declarar qué rulesets hereda tu proyecto
2. **Crear rulesets custom** — agregar archivos `.rules.json` siguiendo el estándar de ruleset schema
3. **Escribir políticas OPA** — agregar archivos `.rego` con IDs de regla coincidentes para parity dual-engine
4. **Usar el servidor MCP** — los agentes AI pueden consultar y evaluar reglas custom en runtime

El modelo de herencia significa que las reglas a nivel de proyecto extienden (no reemplazan) las reglas de Core.

**Evidencia:** [Ruleset Standard Schema](../../../src/rulesets/schema/ruleset-standard.schema.json), [Inheritance Model](../foundations/inheritance-model/)

---

## Categoría 7: Anti-Patrones

### T07-P01: ¿Qué problemas previene Evolith?

**Pregunta:** ¿Qué errores arquitectónicos detecta Evolith?

**Respuesta:** Evolith tiene defensas explícitas contra los 6 anti-patrones de mayor riesgo:

| Anti-Patrón | Riesgo | Cómo Evolith lo previene |
|---|---|---|
| Monolito Distribuido | EXTREMO | Bus de eventos async + aislamiento hexagonal (ADR-0015, ADR-0002) |
| Entrelazamiento BD Compartida | MUY ALTO | Schema-per-context, joins cross-schema bloqueados (ADR-0031) |
| Fat Controller / Smart Pipe | ALTO | Patrón Dumb Pipes / Smart Endpoints |
| Log Shards (Ceguera) | ALTO | Tracing distribuido OTel (ADR-0007) |
| God Module | ALTO | Auditorías de boundaries + playbook de extracción |
| Leaky Shared Library | ALTO | Enforcement vía eslint-plugin-boundaries |

**Evidencia:** [Anti-Pattern Immunization (Section 7)](../control-center/maturity-reports/maturity-assessment.md)

### T07-P02: ¿Qué es un "monolito distribuido" y cómo se evita?

**Pregunta:** He oído el término. ¿Qué significa realmente?

**Respuesta:** Un monolito distribuido es cuando divides tu sistema en múltiples servicios, pero están tan acoplados que no puedes desplegar, escalar o modificarlos independientemente. Obtienes toda la complejidad de microservicios sin ninguno de los beneficios.

Evolith previene esto con dos defensas:
1. **Bus de eventos async** (ADR-0015): Los módulos se comunican vía eventos fire-and-forget, no llamadas síncronas
2. **Aislamiento hexagonal** (ADR-0002): Cada módulo tiene boundaries estrictos de port/adapter

**Ejemplo:** Si el Módulo A llama al Módulo B síncronamente y el Módulo B llama de vuelta al Módulo A, eso es un patrón de monolito distribuido. Las reglas de Evolith bloquean esto en el estágio de PR.

**Evidencia:** [ADR-0015 (Event-Driven Architecture)](../architecture/adrs/core/0015-event-driven-architecture-intra-domain.md), [ADR-0002 (Clean Architecture)](../architecture/adrs/nodejs/0002-clean-architecture-nestjs.md)

### T07-P03: ¿Qué es "Strangler Fig" y cómo se aplica?

**Pregunta:** ¿Qué es el patrón strangler fig?

**Respuesta:** Strangler Fig es un patrón de migración donde reemplazas incrementalmente partes de un sistema legacy con nuevos componentes, sin un rewrite de big-bang. El sistema viejo se "estrangula" a medida que los nuevos componentes toman control.

En Evolith, esta es la estrategia fundacional para la evolución de topologías. Los módulos están lógicamente aislados desde el día uno (monolito modular), de modo que cuando es hora de extraer uno, puedes hacerlo incrementalmente.

**Ejemplo:** Tu monolito tiene un módulo legacy de autenticación. En lugar de reescribirlo, construyes un nuevo módulo con la misma interfaz, enrutas el tráfico gradualmente y eventualmente eliminas el viejo. Evolith trackea esto como una transición de topología (F1 → F2).

**Evidencia:** [Pattern Maturity Matrix (Section 6)](../control-center/maturity-reports/maturity-assessment.md)

### T07-P04: ¿Cómo funciona la defensa contra "base de datos compartida"?

**Pregunta:** ¿Qué hay de malo en compartir una base de datos entre servicios?

**Respuesta:** Las bases de datos compartidas crean acoplamiento oculto: cambios al schema de un servicio rompen otro servicio. Evolith aplica **Schema Per Context** (ADR-0031): cada bounded context posee su propio schema PostgreSQL, y los joins cross-schema están físicamente bloqueados.

**Ejemplo:** El Servicio A posee el schema `users`. El Servicio B posee el schema `orders`. Si el Servicio B intenta `JOIN users.orders`, la regla lo bloquea. El Servicio B debe llamar a la API del Servicio A — que es auditable, versionada y puede evolucionar independientemente.

**Evidencia:** [ADR-0031 (Schema Per Context)](../architecture/adrs/core/0031-schema-per-context-domain-event-catalog.md)

### T07-P05: ¿Qué es "arquitectura hexagonal" y por qué importa?

**Pregunta:** Sigo escuchando sobre arquitectura hexagonal. ¿Qué es?

**Respuesta:** La arquitectura hexagonal (también llamada "ports and adapters") separa la lógica de negocio core de las preocupaciones de infraestructura (bases de datos, APIs, UIs). El core define **ports** (interfaces) y la infraestructura provee **adapters** (implementaciones).

En Evolith, esto significa:
- El motor Core evalúa reglas pero nunca decide por ti (`binding: false` en resultados de evaluación)
- Los adaptadores hacen el sistema extensible (cambia Redis por PostgreSQL sin cambiar la lógica de negocio)
- Los agentes AI interactúan a través de ports gobernados, no ejecutando comandos shell directamente

**Ejemplo:** El MCP Interaction Adapter define un port para acceso de herramientas AI. Puedes cambiar el transporte stdio por HTTP sin cambiar la lógica de gobernanza core.

**Evidencia:** [ADR-0002 (Clean Architecture)](../architecture/adrs/nodejs/0002-clean-architecture-nestjs.md), [Adapter Maturity (Section 5)](../control-center/maturity-reports/maturity-assessment.md)

---

## Categoría 8: AI y Agentes

### T08-P01: ¿Cómo funciona Evolith con herramientas AI como Cursor o Claude?

**Pregunta:** Uso asistentes de coding AI. ¿Cómo se integra Evolith?

**Respuesta:** A través del **Model Context Protocol (MCP)**. Evolith envía un servidor MCP dentro del CLI que provee a los agentes AI con:

- **Tools:** 50 herramientas gobernadas (validate, gate-evaluate, drift-detect, etc.)
- **Resources:** 11 fuentes de datos live (ADRs, reglas, topologías, gaps)
- **Prompts:** 8 workflows guiados para tareas comunes de gobernanza

Los agentes AI usan estas herramientas para consultar reglas arquitectónicas, validar código y evaluar preparación de gates — todo sin saltarse la gobernanza.

**Ejemplo:** Le pides a Cursor: "Revisa si este módulo sigue nuestras reglas arquitectónicas." Cursor llama a `evolith-validate` vía MCP. Evolith retorna: "3 violaciones: import cross-context, plan de tests faltante, dependencia sin versionar." Cursor ofrece arreglarlas.

**Evidencia:** [MCP Services hub](../../../product/products/mcp-services/README.md), [ADR-0069](../architecture/adrs/core/0069-ai-agent-context-protocol-integration.md)

### T08-P02: ¿Qué es MCP y por qué Evolith lo usa?

**Pregunta:** ¿Qué es MCP?

**Respuesta:** MCP (Model Context Protocol) es un estándar para conectar modelos AI con herramientas y datos externos. Piensa en él como un "puerto USB" para agentes AI — define cómo se exponen tools, resources y prompts a los LLMs.

Evolith usa MCP porque:
1. **Integración estándar:** Funciona con Cursor, Claude Desktop y cualquier herramienta compatible con MCP
2. **Acceso gobernado:** Las tools se validan contra schemas antes de la ejecución
3. **Seguridad fail-closed:** Autenticación API-key, sin acceso anónimo

**Evidencia:** [MCP Services hub](../../../product/products/mcp-services/README.md), [ADR-0069](../architecture/adrs/core/0069-ai-agent-context-protocol-integration.md)

### T08-P03: ¿Qué nivel de madurez AI tiene Evolith?

**Pregunta:** ¿Qué tan maduro es en AI?

**Respuesta:** Evolith está en **Nivel 2.2 (AI-Integrated → AI-Orchestrated)** en su propia matriz de madurez AI de 3 niveles × 5 dimensiones:

| Dimensión | Nivel | Qué significa |
|---|---|---|
| Documentación | 2 | Catálogo de tools, catálogo de modelos, patrones multi-agent documentados |
| Herramientas | **3** | Ciclo agentic recursive, propagación de budget, memoria semántica RAG |
| Verificación | 2 | Pipelines CI, parity OPA, boundary guards (pero sin agentes de patrulla autónomos) |
| Modelos | 2 | Selección formal vía ADR, catálogo por tier, optimización de costos |
| Seguridad | 2 | OAuth + ABAC + filtrado por rol + audit logging (pero sin audit inmutable) |

**Evidencia:** [AI-Augmented Maturity (Section 10)](../control-center/maturity-reports/maturity-assessment.md)

### T08-P04: ¿Qué faltaría para alcanzar "AI-Orchestrated" (Nivel 3)?

**Pregunta:** ¿Qué falta para Level 3 completo?

**Respuesta:** Tres cosas:

1. **Agentes de verificación autónomos** — Actualmente Winston audit requiere invocación manual. Nivel 3 necesita agentes en background que patrullen continuamente.
2. **Dashboard live de token cost por agent/feature** — La infraestructura existe (adaptador Langfuse) pero no hay dashboard en tiempo real.
3. **Almacenamiento de audit inmutable** — El AuditLogger actual es in-memory con cap de 1000 entries. Nivel 3 necesita registros inmutables estilo blockchain.

**Evidencia:** [AI-Augmented Maturity (Section 10.3)](../control-center/maturity-reports/maturity-assessment.md)

### T08-P05: ¿Puede un agente AI saltarse las reglas de gobernanza de Evolith?

**Pregunta:** ¿Qué impide que un AI ignore las reglas?

**Respuesta:** Múltiples capas:

1. **Las tools MCP están gobernadas:** Los agentes AI solo pueden usar las 50 tools que Evolith expone — no pueden ejecutar comandos shell arbitrarios.
2. **Políticas ABAC:** Cada llamada a tool se evalúa contra restricciones de rol, tenant y fase.
3. **HITL (Human-in-the-Loop):** Las herramientas destructivas requieren aprobación explícita.
4. **Audit logging:** Cada llamada a tool se registra con nombre de tool, args (redactados), contexto, duración y estado.
5. **Binding = false:** El motor de evaluación de Evolith recomienda pero nunca decide — el humano o el pipeline CI hace la llamada final.

**Ejemplo:** Un agente AI intenta ejecutar `evolith-phase-advance` para saltarse un gate. La política ABAC lo bloquea: "phase-advance requiere rol de arquitecto en fase de producción." El intento se registra.

**Evidencia:** [ADR-0081 (Sandbox Isolation)](../architecture/adrs/core/0081-agentic-ai-sandbox-isolation.md), [ADR-0083 (Action Authorization Audit)](../architecture/adrs/core/0083-agentic-ai-action-authorization-audit.md)

---

## Categoría 9: Gobernanza Federada

### T09-P01: ¿Qué es un "satellite" y cómo hereda de Core?

**Pregunta:** ¿Cuál es la relación entre Core y mi proyecto?

**Respuesta:** Un satellite es cualquier proyecto que adopta las reglas de Evolith Core. La relación es unidireccional: Core gobierna, los satellites consumen.

```yaml
# evolith.yaml en tu satellite
apiVersion: evolith.dev/v1
kind: SatelliteManifest
spec:
  inherits:
    - core-rules@1.0.0
    - modular-monolith@1.0.0
  topology: modular-monolith
```

Esto declara: "Sigo las reglas de Core v1.0.0 y las reglas de modular-monolith v1.0.0." Evolith valida tu proyecto contra estas reglas heredadas.

**Evidencia:** [Satellite Definitions](../foundations/satellite-definitions/), [Inheritance Model](../foundations/inheritance-model/)

### T09-P02: ¿Cómo conecto mi repositorio existente a Evolith?

**Pregunta:** Tengo un proyecto existente. ¿Cómo empiezo a usar Evolith?

**Respuesta:**

```bash
cd tu-repo
evolith init --topology modular-monolith
evolith validate
```

Esto crea `evolith.yaml`, ejecuta la validación inicial y reporta cualquier violación. Desde ahí, cada `evolith validate` o ejecución de CI verifica compliance.

**Evidencia:** [Using the CLI guide](../interfaces/using-the-cli.md)

### T09-P03: ¿Qué pasa cuando un gate de calidad falla?

**Pregunta:** Si un gate falla, ¿qué hago?

**Respuesta:** Cuando un gate falla, tienes tres opciones:

1. **Arreglar las violaciones** — aborda los problemas y re-ejecuta el gate
2. **Solicitar un waiver** — una excepción de gobernanza explícita (requiere aprobación)
3. **Diferir el gap** — si la violación es aceptable, trackéalo como un ítem GT-xx con justificación

Un gate mandatorio fallado **no puede** ser sobreescrito por aprobación informal. Solo aplica un waiver explícito de gobernanza.

**Ejemplo:** `gate-f3 (Successful Build)` falla porque el coverage de tests es 74% y el umbral es 80%. O agregas tests para llegar a 80%, o solicitas un waiver para ese módulo específico con una justificación.

**Evidencia:** [Glossary Ecosystem (Gate definition)](./glossary/glossary-ecosystem.md#terms), [Quality Gates](../sdlc/quality-gates.es.md)

### T09-P04: ¿Puedo personalizar las reglas para mi equipo?

**Pregunta:** ¿Qué si algunas reglas no aplican a mi proyecto?

**Respuesta:** Sí, a través del modelo de herencia:

1. **Sobreescribir reglas específicas** — en tu `evolith.yaml`, puedes configurar parámetros de regla por contexto
2. **Diferir gaps** — marcar violaciones como DEFERRED con justificación en el Gap Tracking Board
3. **Solicitar waivers** — excepciones formales de gobernanza para gates específicos

Sin embargo, no puedes **eliminar** reglas de Core — solo puedes sobreescribir parámetros o diferir con justificación. El boundary de gobernanza se preserva.

**Evidencia:** [Waiver Schema](../../../src/rulesets/schema/waiver.schema.json), [Gap Tracking Board](../control-center/gaps/gap-tracking.md)

### T09-P05: ¿Cómo mantiene Evolith la consistencia entre repositorios?

**Pregunta:** Tenemos 10 repositorios. ¿Cómo los mantienen consistentes?

**Respuesta:** A través del modelo de herencia hub-and-spoke:

- **Core** define reglas universales (ADR-0001 a ADR-0133)
- **Cada satellite** declara qué reglas de Core hereda vía `evolith.yaml`
- **CI valida** cada satellite contra su herencia declarada
- **El CLI** (`evolith validate`) puede correr localmente en cualquier repositorio

Las mismas reglas, los mismos schemas, los mismos motores de evaluación — en todas partes.

**Ejemplo:** El Repositorio A hereda `core-rules@1.0.0`. El Repositorio B hereda `core-rules@1.0.0`. Ambos son validados por las mismas reglas. Si Core agrega una nueva regla en v1.1.0, cada satellite la adopta explícitamente.

**Evidencia:** [Inheritance Model](../foundations/inheritance-model/), [Satellite Definitions](../foundations/satellite-definitions/)

---

## Categoría 10: Adaptadores e Integración

### T10-P01: ¿Con qué sistemas se integra Evolith?

**Pregunta:** ¿A qué puede conectarse Evolith?

**Respuesta:**

| Sistema | Método de Integración |
|---|---|
| GitHub | Composite action de CI, gates de PR |
| Cursor, Claude Desktop | Servidor MCP (stdio) |
| Cualquier herramienta compatible con MCP | Servidor MCP (HTTP o stdio) |
| Pipelines CI/CD | Comandos CLI, API REST |
| Kubernetes | Políticas OPA WASM |
| Orquestadores externos | Core API (REST) |
| Agentes AI | Agent Runtime (ports hexagonales) |

**Evidencia:** [MCP Services hub](../../../product/products/mcp-services/README.md), [Core API hub](../../../product/products/core-api/README.md)

### T10-P02: ¿Cómo funciona el Communication Gateway?

**Pregunta:** ¿Qué es el gateway?

**Respuesta:** El Communication Gateway es un port hexagonal que adapta múltiples superficies de interacción (CLI, chat, MCP, HTTP) en un solo pipeline runtime gobernado. En lugar de duplicar la lógica de gobernanza para cada interfaz, todas las interacciones fluyen por el mismo gateway.

Actualmente implementado: comandos CLI, chat CLI, MCP, Hermes Chat Box, OpenCode, triggers externos.

**Evidencia:** [Adapter Maturity (Section 5.1)](../control-center/maturity-reports/maturity-assessment.md)

### T10-P03: ¿Qué es un "port/adapter" en arquitectura hexagonal?

**Pregunta:** Mencionan ports y adapters. ¿Qué son?

**Respuesta:** Un **port** es una interfaz que define qué hace una capacidad. Un **adapter** es una implementación que conecta el port con una tecnología específica.

- **Port:** "Necesito validar políticas" (interfaz)
- **Adapter:** "Usaré OPA CLI para hacerlo" (implementación)

Puedes intercambiar adapters sin cambiar el port. Así es como Evolith soporta múltiples motores AI, múltiples transportes y múltiples motores de política.

**Evidencia:** [ADR-0002 (Clean Architecture)](../architecture/adrs/nodejs/0002-clean-architecture-nestjs.md)

### T10-P04: ¿Por qué todos los adaptadores están en M4 pero ninguno en M5?

**Pregunta:** El assessment dice que los adaptadores están "listos para producción" pero no "gobernados." ¿Cuál es la diferencia?

**Respuesta:** M4 significa que el adaptador funciona en producción (llamadas HTTP reales, integraciones reales). M5 requiere capas de gobernanza adicionales:

| M4 (Actual) | M5 (Objetivo) |
|---|---|
| Integración real | Integración real |
| Pasa tests básicos | Cobertura completa de unit tests |
| Funciona | OPA policy guard a nivel de adaptador |
| Funciona | Emisión de trace al stack de observabilidad |
| Funciones | Integración de flujos de aprobación |

El gap principal: solo `McpInteractionAdapter` tiene unit tests (11 tests). Los otros 5 adaptadores necesitan tests, registro en manifest e integración OPA/trace a nivel de adaptador.

**Evidencia:** [Adapter Maturity (Section 5.1)](../control-center/maturity-reports/maturity-assessment.md)

### T10-P05: ¿Cómo observo lo que Evolith está haciendo?

**Pregunta:** ¿Puedo ver qué reglas se están evaluando y cuándo?

**Respuesta:** Sí, a través de múltiples superficies de observabilidad:

1. **Output del CLI:** `evolith validate --verbose` muestra resultados detallados de evaluación
2. **OpenTelemetry:** El dispatch de tools MCP emite spans vía `@opentelemetry/api`
3. **Langfuse:** Costo, latencia y versión de prompt trackeados vía `LangfuseEvidenceAdapter`
4. **AuditLogger:** Cada llamada a tool registrada con nombre de tool, contexto, duración y estado

**Evidencia:** [ADR-0007 (Observability Telemetry)](../architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.md)

---

## Categoría 11: Gaps y Mejora Continua

### T11-P01: ¿Qué son los "governance gaps" (GT-xx)?

**Pregunta:** Veo GT-540, GT-562, etc. ¿Qué son estos?

**Respuesta:** Un governance gap (GT-xx) es una desviación trackeada del estado deseado. Cada gap tiene:
- **ID:** GT-xxx (secuencial)
- **Descripción:** Qué falta o está roto
- **Criticalidad:** P0 (urgente) a P3 (nice-to-have)
- **Estado:** DONE, IN-PROGRESS, PENDING o DEFERRED

Estado actual: **568 gaps totales, 554 DONE** (97.5% cerrados).

**Evidencia:** [Gap Tracking Board](../control-center/gaps/gap-tracking.md), [Gap Reference Catalog](../control-center/gaps/gap-reference-catalog.md)

### T11-P02: ¿Cómo se cierra un gap formalmente?

**Pregunta:** ¿Qué significa "DONE" realmente?

**Respuesta:** Un gap es DONE solo cuando:

1. El fix está mergeado a `main` (SHA real de git commit)
2. Los archivos de evidencia existen en el repositorio
3. Los comandos de validación pasan (`node .harness/scripts/ci/08-validate-tracking.mjs`)
4. Existe un registro de cierre en `gap-closure-evidence.json`

No puedes simplemente marcar un gap como DONE — CI verifica la evidencia.

**Evidencia:** [Gap Closure Evidence Standard](../control-center/evidence/gap-closure-evidence-standard.md)

### T11-P03: ¿Cómo evitan que alguien marque DONE sin evidencia?

**Pregunta:** ¿Puede alguien hacer truco y marcar un gap como done?

**Respuesta:** No. El script de CI `08-validate-tracking.mjs` verifica:

- El registro de cierre referencia un **commit git real** (existe en el repo)
- Los archivos de evidencia **existen** en las rutas referenciadas
- Los comandos de validación **pasan**
- Los checkboxes del catálogo del gap están **marcados**
- Los tableros EN y ES **coinciden**

Si falla alguna verificación, CI falla.

**Evidencia:** [Gap Closure Evidence Standard](../control-center/evidence/gap-closure-evidence-standard.md), [CI Script 08](../../../.harness/scripts/ci/08-validate-tracking.mjs)

### T11-P04: ¿Cómo contribuyo al proyecto?

**Pregunta:** Quiero ayudar. ¿Cómo contribuyo?

**Respuesta:**

1. **Elige un gap PENDING** del [Gap Tracking Board](../control-center/gaps/gap-tracking.md)
2. **Implementa la solución** siguiendo la solución propuesta del gap
3. **Agrega evidencia de cierre** — SHA de commit, archivos de evidencia, comandos de validación
4. **Envía un PR** — CI validará todo automáticamente

Empieza con gaps P3 (nice-to-have) si eres nuevo. Los gaps P0 son urgentes y típicamente asignados.

**Evidencia:** [Gap Tracking Board](../control-center/gaps/gap-tracking.md)

---

## Categoría 12: Visión y Futuro

### T12-P01: ¿Hacia dónde va Evolith?

**Pregunta:** ¿Cuál es la hoja de ruta?

**Respuesta:** La evolución sigue el modelo de arquitectura progresiva:

1. **Actual:** Monolito modular (F1) con gobernanza completa
2. **Siguiente:** Extraer a módulos distribuidos (F2) cuando se cumplan los criterios de readiness de extracción
3. **Futuro:** Microservicios (F3) solo cuando la madurez operacional justifique el costo

Simultáneamente:
- **Tracker** (producto enterprise) está en etapa de diseño
- **Madurez AI** está pasando de Nivel 2 a Nivel 3 (agentes de verificación autónomos)
- **Confiabilidad** está pasando de Nivel 3 a Nivel 4 (chaos engineering, activo-activo)

**Evidencia:** [Product Vision Master](../../../product/suite/vision/evolith-product-vision-master.md)

### T12-P02: ¿Qué es la "arquitectura progresiva" y por qué importa?

**Pregunta:** ¿Por qué no elegir microservicios desde el día uno?

**Respuesta:** La arquitectura progresiva es la filosofía de empezar simple y evolucionar solo cuando la evidencia lo justifica. Importa porque:

- **Microservicios prematuros** agregan costo de sistemas distribuidos sin beneficios
- **Monolito-first** permite iteración rápida mientras los boundaries se forman
- **Extracción basada en evidencia** asegura que cada split esté justificado por necesidades operacionales reales

Evolith aplica esto rastreando tu posición en el eje progresivo y requiriendo evidencia (ADR-0045) antes de cada transición.

**Evidencia:** [ADR-0045 (Extraction Readiness)](../architecture/adrs/core/0045-microservice-extraction-readiness-criteria.md), [ADR-0047 (Architectural Patterns)](../architecture/adrs/core/0047-architectural-patterns-monolith-soa-microservices.md)

### T12-P03: ¿Qué significa "democratizar la ingeniería de software elite"?

**Pregunta:** Suena ambicioso. ¿Qué significa en la práctica?

**Respuesta:** Significa hacer que las prácticas de equipos de ingeniería elite (gobernanza arquitectónica de nivel FAANG) sean accesibles para todos — no solo para equipos con presupuestos de consultoría de $1M.

En la práctica:
- **Open source** — el motor de gobernanza es gratis (MIT)
- **Potenciado por AI** — los agentes AI reciben el mismo contexto de gobernanza que un arquitecto senior
- **Automatizado** — las reglas se aplican solas, no vía wiki pages que la gente olvida
- **Basado en evidencia** — los claims están respaldados por datos verificables, no opiniones

**Evidencia:** [Product Vision Master](../../../product/suite/vision/evolith-product-vision-master.md)

### T12-P04: ¿Cómo mantiene Evolith la calidad a medida que crece?

**Pregunta:** Con 137 ADRs y 568 gaps, ¿cómo evitan que todo se desordene?

**Respuesta:** A través de múltiples loops de retroalimentación:

1. **Validación CI** — 7 gates mandatorios corren en cada commit
2. **Assessment de madurez** — scoring trimestral con claims respaldados por evidencia
3. **Tracking de gaps** — 568 ítems trackeados, 554 cerrados, con evidencia verificable
4. **BMAD Intelligence** — los insights de madurez retroalimentan agentes, reglas y skills
5. **Paridad dual-engine** — dos implementaciones independientes capturan bugs de implementación
6. **Enforcement bilingüe** — cada documento EN debe tener su contraparte ES

**Evidencia:** [Maturity Assessment (Section 11)](../control-center/maturity-reports/maturity-assessment.md)

### T12-P05: ¿Qué es el "BMAD Intelligence Feedback Loop"?

**Pregunta:** ¿Qué es BMAD y cómo mejora el sistema?

**Respuesta:** BMAD (Business-aligned Multi-Agent Development) es el sistema de orquestación de agentes. El "intelligence feedback loop" significa que los insights de assessments de madurez, análisis de gaps y auditorías de gobernanza retroalimentan:

- **Agentes actualizados:** Winston (Auditoría) y Architect ahora evalúan compliance de ports/adaptadores
- **Nuevas skills:** `adapter-maturity-analysis`, `interaction-adapter-gap-analysis`
- **Nuevas reglas:** `core-must-remain-stateless`, `external-tech-must-use-adapter`
- **Nuevos checklists:** Adapter Maturity Checklist, Interaction Adapter Readiness Checklist

El sistema aprende de sus propios datos de gobernanza.

**Evidencia:** [BMAD Intelligence Update (Section 11)](../control-center/maturity-reports/maturity-assessment.md)

---

## Documentos Relacionados

| Documento | Propósito |
|---|---|
| [Glossary Ecosystem](./glossary/glossary-ecosystem.md) | Definiciones canónicas de términos |
| [Maturity Assessment](../control-center/maturity-reports/maturity-assessment.md) | Evaluación de madurez bidimensional |
| [ADR Matrix](../architecture/adrs/adr-matrix.md) | Buscar decisiones por concern |
| [Gap Tracking Board](../control-center/gaps/gap-tracking.md) | Rastrear desviaciones de gobernanza |
| [Using the CLI](../interfaces/using-the-cli.md) | Guía práctica del CLI |
| [MCP Services](../../../product/products/mcp-services/README.md) | Guía de integración AI |

---

*Este Q&A es un documento vivo. Actualízalo cuando surjan nuevas preguntas o cambien las respuestas existentes.*

---
[Volver al Hub SDLC](./README.md)
