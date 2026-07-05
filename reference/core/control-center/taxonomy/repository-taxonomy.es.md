# Politica de Taxonomia y Estructuracion del Repositorio

> **Estado:** Aceptado | **Version:** 4.2.1 | **Framework:** Docs-as-Code y Spec-driven AI-DD

Este documento establece la taxonomia oficial y los limites de autoridad de este repositorio de referencia arquitectonica.

## 1. Estructura Estandar de Directorios

```text
/ (raiz del repositorio)
  README.md                     # Portal publico y navegacion inicial
  MASTER_INDEX.md               # Ruteo exhaustivo por rol e intencion
  .bmad-core/                   # Implementacion opcional del metodo spec-driven AI-DD
  .claude/                      # Configuracion de Claude Code (requiere raiz)
  .github/                      # Workflows CI y plantillas de colaboracion
  .harness/                     # Reglas de validacion documental y de agentes
  .husky/                       # Git hooks (requiere raiz)
  .mimocode/                    # Configuracion de MiMoCode (requiere raiz)
  .obsidian/                    # Lente opcional de autoria/navegacion Obsidian
  .vscode/                      # Configuracion de VS Code (requiere raiz)
  sdk/                          # Tooling de acceso ejecutable, CLI y MCP
  rulesets/                     # Reglas arquitectonicas legibles por maquina
    topologies/                 # Rulesets ejecutables especificos por topologia
  reference/                    # Corpus de referencia arquitectonica
    getting-started/            # Rutas cortas de lectura
    architecture/               # Autoridad arquitectonica y guia de implementacion
      README.es.md              # Hub de arquitectura y orden de lectura
      blueprints/            # Baselines, topologia y perfiles de stack
      adrs/                  # Registros de decision y matriz de decisiones
      canonical-patterns/    # Patrones por runtime mapeados a ADRs
      topologies/            # Corpus multi-topologia legible por humanos
    governance/                 # Politicas, SDLC, terminologia y onboarding
    knowledge/                  # Evidencia aplicada, investigacion y aprendizaje
      demo/                     # Limite de referencia UMS, registro de migracion y ejemplos
    operations/                 # Guia operativa y activos de observabilidad
    infrastructure/             # Activos de referencia de plataforma e infraestructura
  apps/                         # Workspaces de aplicaciones (core-api, agent-sandbox)
  packages/                     # Workspaces de paquetes compartidos (core-domain, mcp-server)
  tests/                        # Tests de contrato e integracion
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
| Rulesets ejecutables | Codificar politica arquitectonica como reglas legibles por maquina gobernadas por Native y OPA | `rulesets/`, `rulesets/topologies/` | Gobernanza ejecutable |
| Guia de implementacion por runtime | Materializar decisiones aceptadas para un runtime declarado | `reference/core/architecture/patterns/`, blueprints y ADRs especificos | Reutilizable solo dentro del alcance declarado de runtime y ADR |
| Evidencia aplicada de producto | Demostrar adopcion y especializacion en un producto empresarial | `product/research/demo/`, codigo y docs externos de `beyondnetcode/ums` | Ilustrativa hasta su promocion a un artefacto canonico |

Reglas obligatorias de interpretacion:

- Una tecnologia seleccionada por UMS no constituye un mandato universal.
- UMS es la referencia aplicada ejecutable oficial; este repositorio no duplica su codigo de producto ni sus comandos de setup.
- Un aprendizaje de UMS solo se convierte en autoridad reutilizable mediante un ADR, estandar, blueprint o patron canonico aceptado.
- El corpus documental canonico vive en `reference/`; no se debe crear una jerarquia paralela `docs/` en la raiz.
- La guia multi-topologia escrita para humanos vive en `reference/core/architecture/topologies/`. Esta ruta es el corpus canonico para perfiles topologicos y guia de dimensiones topologicas; es distinta de las reglas ejecutables, que pertenecen bajo `rulesets/`.
- Las reglas multi-topologia ejecutables viven en `rulesets/topologies/`. Esta ruta es la ubicacion canonica de reglas topologicas legibles por maquina y debe preservar Dual-Engine Parity cuando una regla tenga evaluadores Native TypeScript y OPA/Rego.

## 5. Separacion entre Producto y Upstream

Este repositorio es propietario de la linea base arquitectonica y el mecanismo de promocion. Un repositorio de producto es propietario de su dominio, codigo, restricciones operativas y decisiones locales. UMS demuestra esa relacion como modelo aplicado oficial y puede aportar decisiones candidatas a este corpus.

## 6. Politica de la Raiz del Repositorio

La raiz debe mantenerse pequena y navegable. Las categorias permitidas son:

- Archivos publicos de navegacion y legales: `README.md`, `README.es.md`, `MASTER_INDEX.md`, `MASTER_INDEX.es.md`, `DOCUMENTATION_VERSIONS.md`, `DOCUMENTATION_VERSIONS.es.md`, `AGENTS.md`, `AGENTS.es.md` y `LICENSE`.
- Dot-folders de tooling y plataforma: `.github/`, `.harness/`, `.husky/`, `.vscode/`, `.bmad-core/`, `.mimocode/`, `.claude/`, `.obsidian/`, y configuracion de editores o automatizacion (`.editorconfig`, `.gitignore`, `.markdownlint.json`).
- **Convencion de carpetas de herramientas:** Cada herramienta de IA/IDE/autoria obtiene su propia carpeta con punto en la raiz del repositorio (`.claude/`, `.mimocode/`, `.obsidian/`, `.vscode/`). No se pueden anidar dentro de una carpeta padre porque cada runtime espera su configuracion en la raiz del workspace. NO crear carpetas de agrupacion como `.setup/` o similares — los contratos de las herramientas requieren ubicacion en la raiz.
- `reference/` para el corpus documental y arquitectonico.
- `sdk/` para tooling de acceso ejecutable, CLI y MCP.
- `rulesets/` para reglas de gobernanza legibles por maquina, incluyendo `rulesets/topologies/` para reglas ejecutables especificas por topologia.

No se mantienen directorios `src/` de aplicaciones en este repositorio; la implementacion ejecutable pertenece a UMS o a otro repositorio de producto con alcance explicito.

El directorio `/topologies/` en la raiz queda explicitamente prohibido. La gobernanza multi-topologia no crea una nueva area de contenido en la raiz del repositorio; debe permanecer dentro de los limites de autoridad existentes establecidos por [ADR-0048](../../architecture/adrs/core/0048-enterprise-taxonomy-reference-layout.es.md), [ADR-0070](../../architecture/adrs/core/0070-lean-root-repository-taxonomy.es.md) y [ADR-0079](../../architecture/adrs/core/0079-multi-topology-reference-corpus.es.md). Cualquier propuesta futura para crear `/topologies/` en la raiz del repositorio requiere un ADR reemplazante aceptado que modifique la taxonomia de raiz, actualice este estandar, actualice `rulesets/cross-cutting/repository-taxonomy.rules.json`, actualice `rulesets/opa/taxonomy.rego` y actualice `.harness/scripts/ci/03-validate-root-cleanliness.mjs` en el mismo cambio.

---
[Volver al Hub de Referencia](../../../README.es.md)
