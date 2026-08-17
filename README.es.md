<div align="center">

# Evolith Core

> **Navegación Bilingüe:** [English](./README.md)

[![npm](https://img.shields.io/npm/v/@beyondnet/evolith-cli?label=%40beyondnet%2Fevolith-cli)](https://www.npmjs.com/package/@beyondnet/evolith-cli)
[![CI](https://img.shields.io/github/actions/workflow/status/beyondnetcode/evolith_arch32/ci-cd.yml?branch=main&label=CI)](https://github.com/beyondnetcode/evolith_arch32/actions/workflows/ci-cd.yml)
[![License](https://img.shields.io/badge/license-MIT-informational)](./LICENSE)

**Gobernanza de arquitectura ejecutable. Una regla que no se evaluó no es una regla que pasó.**

</div>

```bash
npm install -g @beyondnet/evolith-cli
evolith init --name my-sat --yes
evolith validate --engine opa
```

[Inicio Rápido](#inicio-rápido) · [Atlas interactivo de arquitectura](https://beyondnetcode.github.io/evolith_arch32/) · [Cómo auditamos nuestras propias afirmaciones](./reference/core/control-center/adoption/pending-2026-08-16.md)

---

## Qué acaba de pasar

Ese tercer comando evaluó el corpus de reglas de este propio repositorio contra un satélite
recién inicializado, usando el bundle Rego compilado. Esto es lo que imprimió
`@beyondnet/evolith-cli@1.3.0` en un contenedor con nada más que Node instalado:

```
**Status:** failed
**Rules Checked:** 133
**Rules Skipped:** 26
**Rules Errored:** 0
**Rules Total:** 159

### Issues
| Rule Id | Severity | Category | Title | Blocking |
| --- | --- | --- | --- | --- |
| ACL-01 | MUST | anti-corruption | Schema Validation Before Ingestion | YES |
...
| SEC-INJ-01 | MUST | security | Blocking rule did not run: No shell exec with user input | YES |
| SEC-INJ-02 | MUST | security | Blocking rule did not run: Parameter allowlists for scaffold tools | YES |
| SEC-PATH-01 | MUST | security | Blocking rule did not run: Path input sanitization | YES |
...
└  ❌ Validation failed. See the errors above.

$ echo $?
2
```

Cada línea de arriba es la de la herramienta, carácter por carácter. Los `...` marcan filas de
issues recortadas por longitud y nada más -- hay 72 en total, 37 de ellas bloqueantes. La
ejecución además abre con tres líneas `[Nest] WARN Skipping non-standard ruleset`: tres ficheros
de ruleset viajan en el tarball y el propio esquema del validador publicado los rechaza. Eso es
un defecto real, y un README que sostiene que *no evaluado* no es lo mismo que *pasó* no tiene
derecho a borrarlo de la captura.

El Core carga **412 reglas**; el 159 de arriba es lo que la ejecución de este satélite
seleccionó de ellas. Dos denominadores distintos, y un informe que los mezclara sería el
defecto exacto que este proyecto existe para evitar.

**Nueve de esos 37 issues bloqueantes son reglas que se saltaron.** No reglas que fallaron:
reglas que el motor no pudo decidir, reportadas como fallo porque una regla bloqueante sin
decidir no es una regla que pasa. Entre ellas están `SEC-INJ-01`, `SEC-INJ-02` y `SEC-PATH-01`.

Esta es la idea entera. Todo linter de arquitectura y de políticas pasa en silencio las reglas
que nunca evaluó, con lo que *cobertura* y *cumplimiento* producen el mismo verde. Evolith
publica el denominador y se niega a redondearlo hacia arriba:

- El bundle compilado declara qué ids de regla puede decidir, y `skipped` es un resultado de
  primera clase, no la ausencia de una violación.
- Una regla bloqueante que termina `skipped` hace fallar la ejecución. Ese invariante tiene su
  propio test, escrito contra el código que no lo tenía:
  [`blocking-skipped-invariant.spec.ts`](./src/packages/core-domain/src/application/validators/blocking-skipped-invariant.spec.ts).
- Dos motores -- un evaluador nativo en TypeScript y Rego/WASM -- deben coincidir sobre
  fixtures, o el CI falla.

Los códigos de salida son una taxonomía, no un booleano: `0` pasa, `1` la herramienta falló,
`2` la puerta bloqueó, `3` la invocaste mal. Una ejecución que no pudo producir un veredicto
nunca reporta uno.

---

## Úsalo como puerta de PR

```yaml
- uses: beyondnetcode/evolith_arch32@v1
  with:
    fail-on-violation: true
```

Expone `compliance-status`, `violations-count`, `issues-count`, `exit-code` y `report-path`.
`error` e `invalid-input` significan que el repositorio **no fue evaluado** -- no son formas
más débiles de no-conforme, y el resumen del job lo dice con palabras.

Como contexto vivo para un agente de IA, sobre stdio:

```json
{ "mcpServers": { "evolith": { "command": "npx", "args": ["-y", "@beyondnet/evolith-mcp"] } } }
```

---

## Por qué no ArchUnit, Conftest o dependency-cruiser

Úsalos. Son buenos, y Evolith no sustituye a ninguno.

| Herramienta | Qué hace bien | En qué difiere Evolith |
|---|---|---|
| **ArchUnit / ts-arch** | Reglas de capas y dependencias como tests unitarios, en tu lenguaje | Las reglas viven fuera del código como datos, así que un mismo corpus gobierna muchos repositorios y un agente puede leerlo |
| **Conftest / OPA** | Rego contra cualquier entrada estructurada | Evolith *es* OPA por debajo. Lo que añade es el corpus, la derivación de ADR a regla, y la contabilidad de cobertura |
| **dependency-cruiser** | Reglas sobre el grafo de dependencias, rápido y enfocado | Corpus más amplio (gates SDLC, topologías, estándares de seguridad) y un rastro de evidencia por veredicto |
| **Backstage Scorecards** | Chequeos de salud sobre todo el catálogo, con UI | Corre offline en CI sin catálogo que mantener, y bloquea un PR en vez de colorear un panel |

**En qué es genuinamente distinto:** reporta lo que no pudo evaluar. Ninguna de las
herramientas de arriba distingue "esta regla pasó" de "esta regla nunca corrió" en su código
de salida.

**Qué NO está construido todavía, para que no lo descubras tú:** la mitad de "el LLM propone,
un verificador determinista dispone" es una dirección documentada, no comportamiento
publicado. Ningún comando del CLI instalado alcanza un LLM. Ver
[Egreso de Red y Manejo de Datos](#egreso-de-red-y-manejo-de-datos).

---

## Menú

- [¿Qué es Evolith?](#qué-es-evolith)
- [¿Por qué Evolith?](#por-qué-evolith)
- [Conceptos Clave](#conceptos-clave)
- [Ecosistema de Productos](#ecosistema-de-productos)
- [Cómo Funciona](#cómo-funciona)
- [Visión de Arquitectura](#visión-de-arquitectura)
- [Componentes Principales](#componentes-principales)
- [Inicio Rápido](#inicio-rápido)
- [Preguntas y Respuestas](#preguntas-y-respuestas)
- [Egreso de Red y Manejo de Datos](#egreso-de-red-y-manejo-de-datos)
- [Documentación](#documentación)
- [Casos de Uso](#casos-de-uso)
- [Roadmap](#roadmap)
- [Contribución](#contribución)
- [Licencia](#licencia)

---

## ¿Qué es Evolith?

Evolith es un **framework de gobernanza arquitectónica ejecutable**. Codifica cómo se construye el software — a través de múltiples estilos de arquitectura — como reglas verificables, ADRs y compuertas de fase que equipos, plataformas y agentes de IA pueden ejecutar de verdad.

La gobernanza en Evolith no es un documento. Es una capacidad operativa expuesta a través de una CLI, un servidor MCP y una API REST.

---

## ¿Por qué Evolith?

La mayoría de proyectos acumulan ADRs y documentos de arquitectura que nadie lee y nadie aplica. Los sistemas se desvían. Las decisiones se olvidan. La consistencia se rompe en silencio.

Evolith hace que la gobernanza sea **ejecutable**:

- Las reglas se validan automáticamente, no se revisan manualmente.
- Las compuertas de fase bloquean el avance hasta que se cumplen los criterios de calidad.
- Los agentes de IA y los pipelines de CI consumen los mismos artefactos de gobernanza que los humanos.
- Las decisiones de arquitectura son trazables desde el ADR hasta el código en producción.

---

## Conceptos Clave

| Concepto | Qué es |
|---|---|
| **Fases SDLC** | Las cinco etapas de la idea a producción: Discovery → Design → Construction → QA → Delivery |
| **Compuertas** | Puntos de control automatizados que cierran cada fase antes de pasar a la siguiente |
| **Topologías** | Estilos de arquitectura (ej. monolito modular, microservicios, event-driven, agentic-AI) |
| **ADRs** | Architecture Decision Records — el registro autoritativo de decisiones arquitectónicas |
| **Blueprints** | Plantillas de diseño canónicas para cada topología |
| **Rulesets** | Reglas legibles por máquina aplicadas por la CLI y la Core API |
| **Políticas OPA** | Políticas de Open Policy Agent para controles de gobernanza granulares |
| **Artefactos** | Salidas estructuradas en cada fase: specs, schemas, manifests, contratos |
| **Agentes de IA** | Agentes especializados (Winston y otros) que participan en el SDLC como colaboradores de primer nivel |

Detalles completos: [Conceptos Core](./reference/core/README.es.md) · [Topologías](./reference/core/architecture/topologies/README.es.md)

---

## Ecosistema de Productos

Evolith se distribuye como una suite de productos coordinados sobre una base común.

| Producto                | Rol                                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **[Evolith Core](reference/README.es.md)**        | Constitución neutral al proveedor: principios, ADRs, rulesets, topologías y contratos                                        |
| **[Evolith CLI](product/products/smart-cli/README.es.md)**           | Aplicación local — valida código, ejecuta compuertas, gestiona ADRs, sirve MCP                                               |
| **[Core API](product/products/core-api/README.es.md)**            | Servicio REST para consultas y evaluación de gobernanza de forma remota                                                      |
| **[MCP Services](product/products/mcp-services/README.es.md)**        | Gobernanza como contexto en vivo para LLMs y agentes de IA (52 tools, 12 resources, 8 prompts)                                |
| **[Agent Runtime](reference/core/architecture/foundations/README.es.md)**       | Capa de mediación agéntica — orquesta el Core mediante Puertos y Adaptadores; Hermes es uno de los adaptadores reemplazables |
| **[Evolith Tracker](product/products/evolith-tracker/README.es.md)**     | Gobernanza del ciclo de vida del negocio — fases, propietarios, financiación y ROI                                           |
| **[Narrativa Comercial](product/suite/vision/evolith-commercial-brochure.es.md)** | Estrategia de producto y monetización empresarial (Despliegue Hub & Spoke)                                                   |
| **[Rulesets](src/rulesets/README.es.md)**            | Reglas de aplicación legibles por máquina por topología                                                                      |
| **[Políticas OPA](src/rulesets/opa/README.es.md)**       | Controles de política granulares integrados en el pipeline                                                                   |
| **[Schemas y Manifests](src/rulesets/schema/README.es.md)** | Contratos estructurados para artefactos y definiciones de topología                                                          |

---

## Cómo Funciona

```
Desarrollador / Agente de IA / Disparador Externo
        │
        ▼
  Evolith CLI  ──────────────────────────────► Servidor MCP
  (aplicación local)                         (contexto para agentes de IA)
        │
        ▼
   Core API  ────────────────────────────►  Evolith Tracker
  (gobernanza remota)                        (ciclo de vida del negocio)
        │
        ▼
  Agent Runtime ───────────────────────────► Hermes (adaptador)
  (mediación agéntica, Puertos y Adaptadores) (.harness · OPA · Tracker · Memoria)
        │
        ▼
  Rulesets · Políticas OPA · ADRs · Blueprints
  (los artefactos de gobernanza compartidos)
```

1. **Evolith CLI** valida el código localmente contra los rulesets y ejecuta las compuertas de fase.
2. **Core API** expone la misma gobernanza de forma remota para pipelines de CI y orquestadores.
3. **Servidor MCP** entrega contexto de gobernanza a LLMs y agentes de IA en tiempo real.
4. **Agent Runtime** orquesta las capacidades del Core mediante Puertos y Adaptadores — Hermes es uno de los adaptadores reemplazables.
5. **Evolith Tracker** coordina el lado del negocio — quién es responsable, qué está financiado, qué se entrega cuándo.

Todos los productos comparten los mismos artefactos definidos en **Evolith Core**.

---

<div align="center">

<a href="https://beyondnetcode.github.io/evolith_arch32/master-view.html" title="Abrir el diagrama interactivo - desplazar y hacer zoom">
  <img src="./reference/core/sdlc/assets/master-view.svg"
       alt="Visión General del Producto Evolith E2E - Composición Gobernada, Core de evaluación stateless, SDLC federado de cinco fases"
       width="880" />
</a>

<sub>Visión General del Producto Evolith E2E - <b><a href="https://beyondnetcode.github.io/evolith_arch32/master-view.html">Abrir visor interactivo</a></b> - arrastra para desplazar, rueda para zoom, pantalla completa</sub>

</div>

## Visión de Arquitectura

Evolith gobierna **8 topologías** en cuatro ejes:

| Eje | Topologías |
|---|---|
| Progresivo | `modular-monolith` · `distributed-modules` · `microservices` |
| Integración | `event-driven` |
| Ejecución | `serverless` · `edge-computing` |
| Datos | `data-mesh` |
| IA | `agentic-ai` |

Cada topología tiene sus propios ADRs, políticas OPA, rulesets de IA y contratos UMS. Los sistemas migran entre topologías a medida que el negocio escala — esto es **Arquitectura Progresiva**.

Referencia completa: [Hub de Arquitectura](./reference/core/architecture/README.es.md) · [Arquitectura Maestra C4](./reference/core/architecture/demos/C4-MASTER-ARCHITECTURE.es.md)

---

## Componentes Principales

```
evolith/
├── packages/agent-runtime/  # @beyondnet/evolith-agent-runtime — capa agéntica Puertos y Adaptadores
├── apps/agent-runtime-api/  # Servicio HTTP NestJS que envuelve el runtime (POST /v1/agent/handle)
├── reference/core/          # Constitución de ingeniería y principios
├── reference/core/architecture/  # Topologías, blueprints, ADRs y docs del agent-runtime
├── reference/core/sdlc/    # Fases SDLC, compuertas, estándares y glosario
├── product/products/      # Evolith CLI, Core API, MCP, Tracker, UMS
└── product/operations/    # SRE, infra, compuertas de calidad
```

Punto de entrada para cada área: [Índice Maestro Global](./reference/core/control-center/taxonomy/MASTER_INDEX.es.md)

---

## Inicio Rápido

El paquete npm es `@beyondnet/evolith-cli`; instala dos bins equivalentes, **`evolith`** (el nombre documentado) y `evolith-cli` (compatibilidad). Ambos se identifican como `evolith` en `--help`.

```bash
# 1. Instala la CLI
npm install -g @beyondnet/evolith-cli

# 2. Inicializa el directorio ACTUAL como satélite de Evolith.
#    --name fija el nombre del proyecto que se escribe en evolith.yaml.
#    --yes corre sin preguntas (también implícito con stdin sin TTY o --format json).
evolith init --name my-sat --yes

# 3. Valida el satélite que acabas de crear — mismo directorio, sin `cd`
evolith validate

# Valida una fase específica del SDLC
evolith validate --phase qa

# Gestiona Architecture Decision Records
evolith adr create
evolith adr list

# Sirve la gobernanza como contexto en vivo para agentes de IA — el servidor MCP
# es un paquete aparte (@beyondnet/evolith-mcp) con su propio bin:
evolith-mcp serve
```

Para generar el satélite en un directorio **nuevo** en lugar del actual, pásalo como argumento posicional (o con `--dir`); `--name` solo nombra el proyecto, nunca crea un directorio:

```bash
evolith init my-sat --yes && cd my-sat && evolith validate
```

Las corridas legibles por máquina (`--format json`) nunca preguntan e imprimen exactamente un envelope en stdout; un `init` fallido sale con código distinto de cero. `evolith init --dry-run` no escribe nada.

> **Espera hallazgos en el primer `validate`.** Un satélite recién inicializado es una línea base, no un aprobado: algunas reglas siguen asumiendo un layout de repositorio más completo y reportan hallazgos bloqueantes en un proyecto en fase 0. Llevar eso a cero se sigue en el [Tablero de Gaps](./reference/core/control-center/gaps/gap-tracking.md) (GT-571).

Evolith CLI se configura mediante **`evolith.yaml`**; ejecuta `evolith --help` para la lista vigente de comandos. Referencia completa: [Hub de Evolith CLI](./product/products/smart-cli/README.es.md)

---

## Preguntas y Respuestas

<details>
<summary><b>¿Qué es Evolith en una frase?</b></summary>
<br/>
Evolith es un <b>framework ejecutable de gobernanza arquitectónica</b> — se asegura de que las decisiones de arquitectura realmente se cumplan, automáticamente, ya sea que el código lo escriba un humano o un agente AI.
</details>

<details>
<summary><b>¿Para qué lo usaría?</b></summary>
<br/>
<ol>
<li><b>Feedback instantáneo</b> en decisiones arquitectónicas — ejecuta <code>evolith validate</code> y sabe en segundos si tu código cumple.</li>
<li><b>Sin refactors sorpresa</b> — el drift arquitectónico se detecta en el gate, no seis meses después.</li>
<li><b>Gobernanza a prueba de AI</b> — cuando un agente AI escribe código, Evolith asegura que siga las mismas reglas que un arquitecto senior.</li>
</ol>
</details>

<details>
<summary><b>¿Cuánto cuesta?</b></summary>
<br/>
La plataforma core es <b>completamente gratis</b> (licencia MIT): CLI, servidor MCP, Core API, Agent Runtime, 142 ADRs, 181 ficheros de ruleset con 412 reglas, 50 schemas de phase-gate. El único producto de pago es <b>Evolith Tracker</b> (gobernanza enterprise multi-tenant — aún no lanzado).
</details>

<details>
<summary><b>¿Cómo empiezo?</b></summary>
<br/>

```bash
npm install -g @beyondnet/evolith-cli
evolith init --name my-sat --yes   # inicializa el directorio ACTUAL
evolith validate                   # mismo directorio, sin `cd`
```

Sin base de datos, sin servidor, sin Docker.
</details>

<details>
<summary><b>¿Qué topologías cubre?</b></summary>
<br/>
Evolith gobierna <b>8 topologías</b> en 5 dimensiones: Modular Monolith, Distributed Modules, Microservices (progressive-axis), Serverless, Edge Computing (execution), Event-Driven (integration), Data Mesh (data) y Agentic AI. Todas componibles.
</details>

<details>
<summary><b>¿Cómo funciona con herramientas AI como Cursor o Claude?</b></summary>
<br/>
Evolith envía un servidor MCP dentro del CLI. Agrégalo a la configuración de tu herramienta AI y tu agente puede consultar reglas, validar código y evaluar gates — todo gobernado.
</details>

**[Q&A completo: 64 preguntas en 12 categorías →](./reference/core/sdlc/q-and-a.es.md)**

---

## Egreso de Red y Manejo de Datos

Evolith es local-first: la CLI, los rulesets, las políticas OPA y el Core de evaluación stateless corren en tu máquina, y tu código fuente nunca se sube — la evaluación ocurre donde está el código. Existe exactamente **una** integración de salida en todo el corpus, está **desactivada por defecto**, y esta es su divulgación completa.

| Ítem | Divulgación |
|---|---|
| **Componente** | `GeminiProvider`, export público de `@beyondnet/evolith-agent-runtime` |
| **Endpoint** | un `POST` HTTPS a `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent`, modelo por defecto `gemini-2.5-flash`. El paquete no contacta ningún otro host. |
| **Sub-procesador** | **Google LLC (Gemini API)**. El contenido enviado por esta vía lo procesa Google bajo sus términos para esa API. No interviene ningún otro sub-procesador. |
| **Estado por defecto** | **DESACTIVADO.** Sin configuración el provider no abre ningún socket: registra el intento rechazado y lanza `LlmEgressDisabledError`. De fábrica el paquete no hace ninguna llamada de red. |
| **Opt-in** | `EVOLITH_LLM_EGRESS=true` (o `1`), o un explícito `new GeminiProvider({ enabled: true })`. No hay forma implícita de activarlo. |
| **Credencial** | `EVOLITH_LLM_API_KEY`, con respaldo en `GEMINI_API_KEY`. Viaja en el header `x-goog-api-key` de la petición y nunca en la URL. Sin clave la llamada se rechaza antes de abrir un socket. |
| **Límites** | timeout de 30.000 ms con `AbortController`; 60.000 bytes / ~15.000 tokens estimados. Por encima del presupuesto la petición **falla cerrado** — nada se trunca para enviarse igual. |

**Qué sale de la máquina**

- Por la costura gobernada `IAssistantTransport`: el intent de la petición, el id opcional de la herramienta, los parámetros, el flag `dryRun` y el catálogo gobernado de skills (solo id y descripción).
- Por la costura deprecada `ILLMProvider` (`generateStructuredJson`): el system prompt y el user prompt del llamador, textuales.
- Ambos se redactan antes de serializarse, sobre 8 clases de patrones: claves privadas PEM, JWTs, access key ids de AWS, API keys de Google, PATs de GitHub, tokens de Slack, tokens `Bearer` y asignaciones genéricas de `KEY`/`SECRET`/`TOKEN`/`PASSWORD`.

**Qué no sale de la máquina**

El id de tenant, de producto, de iniciativa, la referencia al workspace y la identidad del solicitante quedan excluidos del payload por construcción (minimización de datos), igual que el contenido del repositorio.

**Observabilidad**

Cada intento — incluidos los rechazos — emite una línea JSON sin contenido, prefijada `[evolith:llm-egress]`, con provider, endpoint, propósito, resultado, conteo de bytes y tokens, número de redacciones, status HTTP, duración y correlation id. El contenido de prompts y respuestas nunca se registra.

**Human-in-the-loop**

El cableado previsto inyecta `GeminiProvider` como `IAssistantTransport` de `SupervisedAssistantClient`, que a su vez está desactivado por defecto y exige una aprobación humana explícita antes de llegar al transporte.

**Otro tráfico de salida**

- La **exportación OpenTelemetry** de la CLI está apagada salvo que `OTEL_ENABLED=true`, y entonces va solo al colector que configures.
- La **Core API** y el **transporte HTTP del MCP** son servidores que tú alojas; la CLI contacta un Core remoto solo si lo configuras.
- Ninguna superficie envía telemetría, analítica ni verificación de licencia a casa.

**Estado real, sin adornos**

- La redacción es por patrones, no un control DLP: reduce materialmente el egreso accidental de credenciales, no garantiza su ausencia.
- Los controles de header, timeout, presupuesto, redacción y validación de schema están cubiertos por tests unitarios con un `fetch` inyectado; **no** se han ejercitado contra el endpoint real de Google.
- Los valores de timeout y presupuesto se heredan del revisor de CI del propio repositorio y no están afinados para prompts interactivos grandes, que fallan cerrado en lugar de degradar.
- Hoy ningún comando registrado en la CLI publicada alcanza este provider, así que una instalación por defecto de la CLI no hace egreso a LLM alguno.
- Los tarballs npm publicados actualmente son anteriores a este endurecimiento; los controles descritos están en `develop` y llegan al registry con la próxima release, seguido como GT-570 en el [Tablero de Gaps](./reference/core/control-center/gaps/gap-tracking.md).

Reporta cualquier defecto de egreso o de divulgación por la [Política de Seguridad](./SECURITY.md), nunca en un issue público.

---

## Documentación

| Área | Enlace |
|---|---|
| Constitución Core | [Hub de Evolith Core](./reference/core/README.es.md) |
| Corpus de producto | [Hub de Producto](./product/README.es.md) |
| Arquitectura Maestra | [Arquitectura Maestra C4](./reference/core/architecture/demos/C4-MASTER-ARCHITECTURE.es.md) |
| Gobernanza SDLC | [Centro de Gobernanza SDLC](./reference/core/sdlc/README.es.md) |
| Topologías | [Hub de Topologías](./reference/core/architecture/topologies/README.es.md) |
| Evolith CLI | [Hub de Evolith CLI](./product/products/smart-cli/README.es.md) |
| Core API | [Hub de Core API](./product/products/core-api/README.es.md) |
| MCP Services | [Hub de MCP Services](./product/products/mcp-services/README.es.md) |
| Agent Runtime | [Hub de Agent Runtime](./reference/core/architecture/foundations/README.es.md) |
| Evolith Tracker | [Hub de Tracker](./product/products/evolith-tracker/README.es.md) |
| Operaciones y SRE | [Hub de Operaciones](./product/operations/README.es.md) |
| Onboarding por rol | Inicio por Rol |
| Glosario del ecosistema | [Glosario](./reference/core/sdlc/glossary/glossary-ecosystem.es.md) |
| Seguimiento de gaps | [Tablero de Gaps](./reference/core/control-center/gaps/gap-tracking.md) |
| Oportunidades | [Tablero de Oportunidades](./reference/core/control-center/opportunities/README.es.md) |
| Todos los artefactos | [Índice Maestro Global](./reference/core/control-center/taxonomy/MASTER_INDEX.es.md) |

---

## Casos de Uso

**Para equipos de ingeniería**
Aplica decisiones de arquitectura automáticamente. Ejecuta compuertas de fase en CI. Mantén los ADRs vivos y trazables.

**Para equipos de plataforma**
Consulta la gobernanza de forma remota vía Core API. Integra rulesets en pipelines de despliegue. Bloquea artefactos no conformes antes de que lleguen a producción.

**Para desarrollo asistido por IA**
Entrega contexto de gobernanza a LLMs a través de MCP. Permite que los agentes de IA validen sus propias salidas contra los rulesets de arquitectura antes de hacer commit.

**Para productos en crecimiento**
Empieza con un monolito modular. Migra a módulos distribuidos o microservicios cuando el negocio lo exija — Evolith rastrea la transición y aplica consistencia en cada paso.

---

## Roadmap

Consulta el tablero de seguimiento de gaps para prioridades actuales y elementos abiertos:

- [Tablero de Gaps](./reference/core/control-center/gaps/gap-tracking.md)
- [Tablero de Oportunidades](./reference/core/control-center/opportunities/README.es.md)
- [Hub de Madurez y Gaps](./reference/core/control-center/README.md)

---

## Contribución

Lee esto antes de abrir un PR:

- [Guía de Contribución](./CONTRIBUTING.es.md)
- [Política de Seguridad](./SECURITY.md)
- [AGENTS.es.md](./AGENTS.es.md) — convenciones para contribuidores agentes de IA
- [Taxonomía del Repositorio](./reference/core/control-center/taxonomy/repository-taxonomy.md) — qué va dónde

---

## Licencia

Publicado bajo la [Licencia MIT](./LICENSE).

---

<div align="center">
  <sub>Evolith — Framework de Gobernanza Arquitectónica Ejecutable | Corpus de Referencia Multi-Topología | Spec-driven AI-DD</sub>
</div>
