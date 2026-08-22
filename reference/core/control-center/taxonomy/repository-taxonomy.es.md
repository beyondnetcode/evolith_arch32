# Politica de Taxonomia y Estructuracion del Repositorio

> **Estado:** Aceptado | **Version:** 4.2.1 | **Framework:** Docs-as-Code y Spec-driven AI-DD

Este documento establece la taxonomia oficial y los limites de autoridad de este repositorio de referencia arquitectonica.

## 1. Estructura Estandar de Directorios

```text
/ (raíz del repositorio)
  README.md                     # Portal público y navegación inicial
  MASTER_INDEX.md               # Enrutamiento exhaustivo por rol e intención
  action.yml                    # La GitHub Action publicada (puerta de PR)
  evolith.yaml                  # La configuración de satélite de este mismo repositorio
  .bmad-core/                   # Implementación opcional del método spec-driven AI-DD
  .claude-plugin/               # Manifiesto del plugin de Claude Code
  .github/                      # Workflows de CI y plantillas de colaboración
  .harness/                     # Reglas de validación de documentos y agentes, y los guards de CI
  .husky/                       # Git hooks (requerido en la raíz)
  .mimocode/                    # Configuración de MiMoCode (requerido en la raíz)
  .obsidian/                    # Lente opcional de autoría/navegación de Obsidian
  .vscode/                      # Configuración de VS Code (requerido en la raíz)
  docs/                         # Guías para el lector y evidencia publicada
    guides/                     # Guía rápida y guías por tarea
    evidence/                   # Ejecuciones capturadas que la portada cita
  src/                          # Todos los workspaces ejecutables
    rulesets/                   # Reglas de arquitectura legibles por máquina
      topologies/               # Rulesets ejecutables por topología
      opa/                      # Políticas Rego y el bundle compilado
      schema/                   # Schemas de phase-gate y de artefactos
    sdk/                        # CLI y herramientas de acceso ejecutables
    packages/                   # Workspaces compartidos (core-domain, mcp-server,
                                #   agent-runtime, contracts, infra-providers,
                                #   repo-facts, sdk-client, core)
    apps/                       # Workspaces de aplicación (core-api, agent-runtime-api)
    tests/                      # Tests de contrato e integración
  reference/                    # Corpus de referencia arquitectónica
    core/                       # La constitución del Core
      architecture/             # Autoridad arquitectónica y guía de implementación
        adrs/                   # Decision records y matriz de decisiones
        blueprints/             # Líneas base, topología y perfiles de stack
        topologies/             # Corpus de referencia multi-topología legible
        foundations/            # Documentación del Agent Runtime y Puertos y Adaptadores
      sdlc/                     # Fases, compuertas, estándares, glosario y Q&A
      foundations/              # Principios, reglas comunes y modelo de herencia
      control-center/           # Seguimiento de gaps, madurez, auditorías y taxonomía
      interfaces/               # Hub de how-to de CLI, MCP y REST
    knowledge/                  # Evidencia aplicada, investigación y aprendizaje
    governance/                 # Propuestas upstream y registro de decisiones
  product/                      # Corpus de producto
    products/                   # Evolith CLI, Core API, MCP Services, Tracker
    operations/                 # SRE, infraestructura y compuertas de calidad
    suite/                      # Visión y narrativa comercial
    research/                   # Referencias de demo e investigación aplicada
    infra/                      # Ficheros de compose y activos de despliegue
```

El repositorio contiene artefactos arquitectonicos, no una aplicacion local de producto. La evidencia ejecutable de producto se mantiene externamente en [UMS](https://github.com/beyondnetcode/ums).

## 2. Convenciones de Naming y Artefactos

- Los directorios y archivos base usan `kebab-case`.
- Los ADRs usan `[id-4-digitos]-[titulo-descriptivo].md`.
- Un documento especifico de runtime debe identificar el runtime en su carpeta propietaria, titulo o declaracion de alcance.
- Los patrones canonicos son artefactos de implementacion mapeados a ADRs aceptados y permanecen condicionados por su alcance de runtime.
- No se deben crear carpetas sin alcance como `utils`, `misc`, `temp`, `common` o `shared`.

## 3. Estrategia de Navegacion

1. `README.es.md` explica la vision y enruta las intenciones comunes.
2. `reference/getting-started/README.es.md` ofrece rutas cortas por rol; `MASTER_INDEX.es.md` es el mapa de navegacion completo.
3. `reference/core/architecture/README.es.md` ordena la lectura de baseline, ADR, patrones canonicos y evidencia UMS.
4. `reference/core/sdlc/glossary/glossary.es.md` controla la terminologia, incluyendo referencia de arquitectura progresiva, Evolith, BMAD-METHOD, modelo aplicado UMS, ADR y patron canonico.
5. `reference/core/architecture/adrs/adr-matrix.es.md` relaciona necesidades con decisiones controladoras.
6. Los documentos profundos enlazan a un hub propietario o al indice maestro.

## 4. Capas de Autoridad Documental

| Capa | Proposito | Ubicaciones canonicas | Autoridad |
|---|---|---|---|
| Orientacion | Ayudar al lector a navegar el corpus | `README.es.md`, `MASTER_INDEX.es.md`, `reference/getting-started/` | Navegacional |
| Referencia canonica | Definir politica reutilizable, criterios de decision y trade-offs aceptados | `reference/core/architecture/blueprints/`, `reference/core/architecture/adrs/`, `reference/core/sdlc/` | Normativa o decisoria segun estado del documento |
| Corpus de referencia topologica | Definir perfiles topologicos legibles por humanos, dimensiones, vinculos ADR, restricciones operativas y guia de adopcion para familias topologicas | `reference/core/architecture/topologies/` | Normativa cuando esta respaldada por un ADR o estandar aceptado; draft hasta su ratificacion |
| Rulesets ejecutables | Codificar politica arquitectonica como reglas legibles por maquina gobernadas por Native y OPA | `rulesets/`, `src/rulesets/topologies/` | Gobernanza ejecutable |
| Guia de implementacion por runtime | Materializar decisiones aceptadas para un runtime declarado | `reference/core/architecture/patterns/`, blueprints y ADRs especificos | Reutilizable solo dentro del alcance declarado de runtime y ADR |
| Evidencia aplicada de producto | Demostrar adopcion y especializacion en un producto empresarial | `product/research/demo/`, codigo y docs externos de `beyondnetcode/ums` | Ilustrativa hasta su promocion a un artefacto canonico |

Reglas obligatorias de interpretacion:

- Una tecnologia seleccionada por UMS no constituye un mandato universal.
- UMS es la referencia aplicada ejecutable oficial; este repositorio no duplica su codigo de producto ni sus comandos de setup.
- Un aprendizaje de UMS solo se convierte en autoridad reutilizable mediante un ADR, estandar, blueprint o patron canonico aceptado.
- El corpus documental canonico vive en `reference/`; no se debe crear una jerarquia paralela `docs/` en la raiz.
- La guia multi-topologia escrita para humanos vive en `reference/core/architecture/topologies/`. Esta ruta es el corpus canonico para perfiles topologicos y guia de dimensiones topologicas; es distinta de las reglas ejecutables, que pertenecen bajo `rulesets/`.
- Las reglas multi-topologia ejecutables viven en `src/rulesets/topologies/`. Esta ruta es la ubicacion canonica de reglas topologicas legibles por maquina y debe preservar Dual-Engine Parity cuando una regla tenga evaluadores Native TypeScript y OPA/Rego.

## 5. Separacion entre Producto y Upstream

Este repositorio es propietario de la linea base arquitectonica y el mecanismo de promocion. Un repositorio de producto es propietario de su dominio, codigo, restricciones operativas y decisiones locales. UMS demuestra esa relacion como modelo aplicado oficial y puede aportar decisiones candidatas a este corpus.

## 6. Politica de la Raiz del Repositorio

La raiz debe mantenerse pequena y navegable. Las categorias permitidas son:

- Archivos publicos de navegacion y legales: `README.md`, `README.es.md`, `MASTER_INDEX.md`, `MASTER_INDEX.es.md`, `AGENTS.md`, `AGENTS.es.md`, `CONTRIBUTING`, `SECURITY`, `CODE_OF_CONDUCT` (cada uno bilingue), `CHANGELOG.md` y `LICENSE`.
- Dot-folders de tooling y plataforma: `.github/`, `.harness/`, `.husky/`, `.vscode/`, `.bmad-core/`, `.mimocode/`, `.claude/`, `.obsidian/`, y configuracion de editores o automatizacion (`.editorconfig`, `.gitignore`, `.markdownlint.json`, `.nvmrc`).
- **Pines de toolchain que se leen desde la raiz:** `.nvmrc` fija la version de Node que nvm, fnm, asdf y volta leen de la raiz del repositorio y a las que no se les puede indicar otra ubicacion. Declara el mismo Node 20 que usan los workflows y que declara el rango `engines` de la raiz.
- **Convencion de carpetas de herramientas:** Cada herramienta de IA/IDE/autoria obtiene su propia carpeta con punto en la raiz del repositorio (`.claude/`, `.mimocode/`, `.obsidian/`, `.vscode/`). No se pueden anidar dentro de una carpeta padre porque cada runtime espera su configuracion en la raiz del workspace. NO crear carpetas de agrupacion como `.setup/` o similares — los contratos de las herramientas requieren ubicacion en la raiz.
- `reference/` para el corpus documental y arquitectonico.
- `src/` para todos los workspaces ejecutables: `src/sdk/` (CLI y tooling de acceso), `src/packages/`, `src/apps/`, `src/tests/`, y `src/rulesets/` para reglas de gobernanza legibles por maquina incluyendo `src/rulesets/topologies/`.
- `product/` para el corpus de producto, y `docs/` para guias de lectura y evidencia publicada.

El directorio `/topologies/` en la raiz queda explicitamente prohibido. La gobernanza multi-topologia no crea una nueva area de contenido en la raiz del repositorio; debe permanecer dentro de los limites de autoridad existentes establecidos por [ADR-0048](../../architecture/adrs/core/0048-enterprise-taxonomy-reference-layout.es.md), [ADR-0070](../../architecture/adrs/core/0070-lean-root-repository-taxonomy.es.md) y [ADR-0079](../../architecture/adrs/core/0079-multi-topology-reference-corpus.es.md). Cualquier propuesta futura para crear `/topologies/` en la raiz del repositorio requiere un ADR reemplazante aceptado que modifique la taxonomia de raiz, actualice este estandar, actualice `src/rulesets/cross-cutting/repository-taxonomy.rules.json`, actualice `src/rulesets/opa/taxonomy.rego` y actualice `.harness/scripts/ci/03-validate-root-cleanliness.mjs` en el mismo cambio.

---
[Volver al Hub de Referencia](../../../README.es.md)
