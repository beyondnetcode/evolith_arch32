<div align="center">

# Evolith Core

> **Navegación Bilingüe:** [English](./README.md)

[![npm](https://img.shields.io/npm/v/@beyondnet/evolith-cli?label=%40beyondnet%2Fevolith-cli)](https://www.npmjs.com/package/@beyondnet/evolith-cli)
[![node](https://img.shields.io/node/v/@beyondnet/evolith-cli)](https://www.npmjs.com/package/@beyondnet/evolith-cli)
[![CI](https://img.shields.io/github/actions/workflow/status/beyondnetcode/evolith_arch32/ci-cd.yml?branch=main&label=CI)](https://github.com/beyondnetcode/evolith_arch32/actions/workflows/ci-cd.yml)
[![License](https://img.shields.io/badge/license-MIT-informational)](./LICENSE)

**Tus reglas de arquitectura, ejecutándose en cada PR. Una regla que no se evaluó no es una regla que pasó.**

</div>

Evolith corre reglas de arquitectura —capas, dependencias, seguridad, CI/CD, ADRs— contra tu repositorio desde CI y falla el PR. A diferencia del resto, te dice cuántas reglas **no pudo evaluar**, y si alguna era bloqueante, falla igual.

```bash
npx -y @beyondnet/evolith-cli init --name my-sat --yes   # escribe evolith.yaml aquí mismo
npx -y @beyondnet/evolith-cli validate --engine opa      # espera hallazgos: esto es una línea base
```

Esto es lo que imprime, sin recortes en las cifras:

```
**Status:** failed
**Rules Checked:** 133
**Rules Skipped:** 26
**Rules Errored:** 0
**Rules Total:** 159
...
| SEC-INJ-01 | MUST | security | Blocking rule did not run: No shell exec with user input | YES |
...
| GOV-RULE-NOT-APPLICABLE | COULD | governance | 253 corpus rules do not apply to this repository | no |
**Selection:** {"source":"core-default","rulesSelected":412,"corpusTotal":412}
$ echo $?
2
```

72 filas de issues, 37 bloqueantes, **9 de ellas reglas que el motor no pudo decidir** — reportadas como fallo porque una bloqueante sin decidir no es una regla que pasa. Medido el 2026-08-21 con `@beyondnet/evolith-cli@1.3.2`; tarda ~2 s. [Captura íntegra, 72 filas y los dos denominadores](./docs/evidence/first-run-capture.es.md).

[Inicio Rápido](#inicio-rápido) · [Puerta de PR](#úsalo-como-puerta-de-pr) · [Qué gobierna](#qué-gobierna) · [Documentación](#documentación) · [Contribuir](#contribución) · [Atlas interactivo](https://beyondnetcode.github.io/evolith_arch32/)

---

## La idea, en una línea

Todo linter de arquitectura pinta de verde las reglas que nunca llegó a ejecutar: *cobertura* y *cumplimiento* acaban del mismo color. Evolith publica el denominador y se niega a redondearlo. `skipped` es un resultado de primera clase; una regla bloqueante que acaba `skipped` **hace fallar la ejecución** ([invariante con test propio](./src/packages/core-domain/src/application/validators/blocking-skipped-invariant.spec.ts)); y los códigos de salida son una taxonomía: `0` pasa · `1` falló la herramienta · `2` bloqueó la puerta · `3` mala invocación.

Y lo aplicamos a nosotros. Tres cosas que esta portada podría callar y no calla:

- **Los dos motores no cubren lo mismo hoy.** `--engine opa` evalúa 133 de 159 reglas; el evaluador nativo por defecto evalúa 41 y salta 118, sobre el mismo repo. CI exige que coincidan sobre hechos, no sobre cobertura — eso es por diseño; que el comando por defecto no lo diga, no ([#628](https://github.com/beyondnetcode/evolith_arch32/issues/628)). Esta portada usa `--engine opa` en todas partes.
- **Dos reglas de infraestructura no están en ningún denominador.** El cargador rechaza tres ficheros del propio corpus, y desde 1.3.2 ya ni lo avisa por stderr ([#575](https://github.com/beyondnetcode/evolith_arch32/issues/575)).
- **El conteo de ficheros y el de reglas responden a preguntas distintas.** El árbol lleva 182 ficheros `*.rules.json`, de los cuales cuatro declaran un esquema que no es de ruleset y no aportan reglas por diseño — se nombran en cada informe, no se descartan en silencio. Quedan 178 packs con 413 reglas. El CLI publicado lleva su propia foto: 177 packs, 412 reglas. `evolith rulesets` imprime lo que carga *tu* instalación, pack por pack.

Auditoría completa de nuestras propias afirmaciones: [pendientes 2026-08-16](./reference/core/control-center/adoption/pending-2026-08-16.md).

---

## Inicio Rápido

**Requisitos:** Node ≥ 18 para la CLI, ≥ 20 para el servidor MCP · sin base de datos, sin servidor, sin Docker. La instalación se verifica en CI sobre Linux; macOS y Windows no están cubiertos por esa puerta.

```bash
npm install -g @beyondnet/evolith-cli   # o usa `npx -y @beyondnet/evolith-cli` sin instalar nada

evolith init --name my-sat --yes        # configura el directorio ACTUAL; --name solo nombra el proyecto
evolith validate --engine opa           # mismo directorio, sin `cd`

evolith rulesets                        # qué reglas carga TU instalación, pack por pack
evolith validate --engine opa --select rulesets/acl/anti-corruption-layer.rules.json
evolith validate --engine opa --phase qa
evolith adr create                      # gestiona Architecture Decision Records
```

`--engine opa` evalúa con el bundle Rego compilado; sin la bandera corre el evaluador nativo, que hoy cubre menos. Para crear un directorio nuevo, pásalo como argumento: `evolith init my-sat --yes`. Con `--format json` nunca pregunta e imprime un único objeto JSON en stdout; `--dry-run` no escribe nada.

> **Espera hallazgos en la primera ejecución.** Un repo recién configurado es una línea base, no un aprobado: muchas reglas asumen un layout más completo. Para empezar por lo que sí has adoptado, usa `--select` con los refs que imprime `evolith rulesets`; llevar el default a cero se sigue como GT-571 en el [Tablero de Gaps](./reference/core/control-center/gaps/gap-tracking.es.md).

Configuración en **`evolith.yaml`**, que `init` escribe por ti:

```yaml
coreRef: { version: "1.0.0", path: "../evolith" }
product: { name: my-sat, type: enterprise-application, phase: phase-0 }
tools:   { runtime: nodejs, architecture: clean, ci: github-actions }
```

**Qué inspecciona:** estructura del repositorio, workflows de CI, manifiestos y artefactos de gobernanza — no el AST de tu código. Eso lo hace en su mayoría agnóstico al lenguaje; el subconjunto que mira dependencias y linters asume un repo Node/TypeScript. Referencia: [Hub de Evolith CLI](./product/products/smart-cli/README.es.md) · [Guía rápida](./docs/guides/evolith-quickstart.es.md)

---

## Úsalo como puerta de PR

```yaml
- uses: beyondnetcode/evolith_arch32@v1
  with:
    fail-on-violation: true
```

Expone `compliance-status`, `violations-count`, `issues-count`, `exit-code` y `report-path`. `error` e `invalid-input` significan que el repositorio **no fue evaluado** — no son formas más débiles de no-conforme, y el resumen del job lo dice con palabras.

Como contexto vivo para un agente de IA, sobre stdio:

```json
{ "mcpServers": { "evolith": { "command": "npx", "args": ["-y", "@beyondnet/evolith-mcp"] } } }
```

---

## Por qué no ArchUnit, Conftest o dependency-cruiser

Úsalos. Son buenos, y Evolith no sustituye a ninguno.

| Herramienta | Qué hace bien | En qué difiere Evolith |
|---|---|---|
| **ArchUnit / ts-arch** | Reglas de capas y dependencias como tests unitarios, en tu lenguaje | Las reglas viven fuera del código como datos: una misma biblioteca gobierna muchos repos y un agente puede leerla |
| **Conftest / OPA** | Rego contra cualquier entrada estructurada | Evolith *es* OPA por debajo. Añade la biblioteca de reglas, la derivación de ADR a regla y la contabilidad de cobertura |
| **Backstage Scorecards** | Chequeos de salud sobre todo el catálogo, con UI | Corre offline en CI sin catálogo que mantener, y bloquea un PR en vez de colorear un panel |

Frente a **dependency-cruiser**, el alcance es más amplio (controles de fase, estilos de arquitectura, estándares de seguridad) y guarda por qué falló cada regla.

**Qué NO está construido todavía, para que no lo descubras tú:** la mitad de «el LLM propone, un verificador determinista dispone» es una dirección documentada, no comportamiento publicado. Ningún comando de la CLI instalada alcanza un LLM.

---

## Qué gobierna

Ocho **estilos de arquitectura** (aquí los llamamos *topologías*) repartidos en cinco ejes. Las mismas reglas te siguen cuando el monolito se parte en servicios.

| Eje | Topologías |
|---|---|
| Progresivo | `modular-monolith` · `distributed-modules` · `microservices` |
| Integración | `event-driven` |
| Ejecución | `serverless` · `edge-computing` |
| Datos | `data-mesh` |
| IA | `agentic-ai` |

Encima corre una biblioteca **gratis y MIT**: en este árbol, 142 ADRs, 178 packs de reglas con 413 reglas repartidas en 182 ficheros, y 50 schemas de fase, más las cinco fases del SDLC (Discovery → Design → Construction → QA → Delivery) y los controles que bloquean el paso de una a la siguiente. Esos tres conteos los mide y los verifica CI en cada PR. Lo que evalúa tu instalación lo imprime `evolith rulesets`: hoy, 177 packs con 412 reglas, 188 de ellas capaces de hacer fallar una ejecución. El único producto de pago será **Evolith Tracker**, aún no lanzado.

<div align="center"><a href="https://beyondnetcode.github.io/evolith_arch32/master-view.html" title="Abrir el diagrama interactivo"><img src="./reference/core/sdlc/assets/master-view.svg" alt="Cómo encajan CLI, Core y las cinco fases del SDLC" width="820" /></a><br/><sub><b><a href="https://beyondnetcode.github.io/evolith_arch32/master-view.html">Abrir visor interactivo</a></b> — arrastra para desplazar, rueda para zoom</sub></div>

---

## Ecosistema de productos

| Producto | Rol |
|---|---|
| **Evolith Core** | Las reglas en sí: ficheros que puedes leer, editar y versionar |
| **Evolith CLI** | Aplicación local — valida el repo, ejecuta controles de fase, gestiona ADRs |
| **Core API** | Servicio REST para consultar y evaluar gobernanza en remoto |
| **MCP Services** | Gobernanza como contexto en vivo para agentes (52 tools, 12 resources, 8 prompts) |
| **Agent Runtime** | Ejecuta el Core desde un agente, por Puertos y Adaptadores. Experimental |
| **Evolith Tracker** | Producto comercial de gobernanza del ciclo de vida. Aún no lanzado |

**Para quién es:**

- Equipos de ingeniería que quieren sus ADRs aplicados en CI, no revisados a mano.
- Equipos de plataforma que bloquean artefactos no conformes antes de producción.
- Desarrollo asistido por IA que necesita que el agente valide su salida contra las mismas reglas.

**Adopción, sin adornos:** 1.109 descargas en npm el último mes (21-07 → 19-08), ninguna adopción externa confirmada. El repositorio se gobierna a sí mismo y esa es toda la evidencia que hay.

---

## Egreso de red

Local-first: la CLI, las reglas, las políticas OPA y el Core de evaluación corren en tu máquina, y tu código nunca se sube. Existe exactamente **una** integración de salida (`GeminiProvider`, Google Gemini API), está **desactivada por defecto**, y hoy ningún comando de la CLI publicada la alcanza. Los tarballs que hay en el registro son anteriores a ese endurecimiento: **trata el `GeminiProvider` publicado como no gobernado y no lo armes.**

Divulgación completa —sub-encargados, credencial, límites, redacción, qué sale y qué no, y las limitaciones conocidas de estos controles—: [Salida de Red y Tratamiento de Datos](./SECURITY.es.md#salida-de-red-y-tratamiento-de-datos). Reporta un defecto de egreso por ahí, nunca en un issue público.

---

## Documentación

| Para… | Ve a |
|---|---|
| Empezar según tu rol | [Inicio por Rol](./reference/core/foundations/inheritance-model/product-quick-start.es.md) |
| Entender las reglas y ADRs | [Hub de Evolith Core](./reference/core/README.es.md) |
| Ver el corpus ejecutable | [Rulesets](./src/rulesets/README.es.md) · [Políticas OPA](./src/rulesets/opa/README.es.md) · [Schemas](./src/rulesets/schema/README.es.md) |
| Elegir o migrar de topología | [Hub de Topologías](./reference/core/architecture/topologies/README.es.md) |
| Usar CLI, MCP o REST | [Hub de Interfaces](./reference/core/interfaces/README.es.md) |
| Ver el estado real del proyecto | [Tablero de Gaps](./reference/core/control-center/gaps/gap-tracking.es.md) · [Madurez](./reference/core/control-center/README.es.md) |
| Resolver una duda concreta | [Q&A — 43 preguntas en 12 categorías](./reference/core/sdlc/q-and-a.es.md) · [Glosario](./reference/core/sdlc/glossary/glossary-ecosystem.es.md) |
| Saber qué va dónde | [Taxonomía del Repositorio](./reference/core/control-center/taxonomy/repository-taxonomy.es.md) |
| Recorrer todo el corpus | [Índice Maestro](./MASTER_INDEX.es.md) · [Hub de Producto](./product/README.es.md) · [Operaciones](./product/operations/README.es.md) |

---

## Contribución

**Empieza por aquí:** [issues buenos para una primera contribución](https://github.com/beyondnetcode/evolith_arch32/issues?q=is%3Aopen+label%3A%22good+first+issue%22) — la mayoría toca un solo fichero. ¿Dudas antes de abrir un PR? [Discussions](https://github.com/beyondnetcode/evolith_arch32/discussions).

**Tres formas de aportar sin escribir TypeScript:** corregir una divergencia de conteo entre docs y código · traducir un hub al español · añadir una regla a `src/rulesets/`.

Antes del PR: [Guía de Contribución](./CONTRIBUTING.es.md) · [Política de Seguridad](./SECURITY.es.md) · [AGENTS.es.md](./AGENTS.es.md) · [CHANGELOG](./CHANGELOG.md) (EN)

---

## Licencia

Publicado bajo la [Licencia MIT](./LICENSE).
