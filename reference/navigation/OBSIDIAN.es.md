# Vault de Obsidian (Autoría y Navegación Interna)

> **Navegación bilingüe:** [English](./OBSIDIAN.md)  
> **Hub de navegación:** [README](./README.es.md)

Este repositorio incluye un **vault de Obsidian mínimo** como lente *interna* para autoría y navegación de los ~1.400 documentos markdown bajo `reference/`, `rulesets/` y `wiki/`. Es una comodidad opcional para mantenedores — **nada aquí forma parte de una superficie de producto entregable.**

## Qué es — y qué no es

| **Es** | **No es** |
|---|---|
| Una lente local de escritorio sobre los `.md` existentes | Una nueva superficie de documentación para publicar |
| Vista de grafo + backlinks sobre los **8.500+ enlaces markdown existentes** (sin migración) | Un reemplazo del render de GitHub, el wiki o los índices autogenerados |
| Búsqueda local rápida / quick-switcher sobre todos los docs | Algo que corra en CI o que "haga cumplir" la gobernanza |
| Config versionada (`app.json`, `core-plugins.json`, `graph.json`) | Obsidian Publish / Sync (ambos desactivados) |

> **No toca los productos.** La config del vault vive en `.obsidian/` en la raíz del repo y la ignora todo build. La **CLI, CORE-API, servidor MCP y Agent Runtime** compilan desde sus propias carpetas (`sdk/*`, `apps/*`, `packages/*`) y nunca leen `.obsidian/`. Cero cambios de código.

## Cómo abrirlo

1. Instala [Obsidian](https://obsidian.md) (gratis para uso personal y comercial).
2. **Open folder as vault** → selecciona la raíz del repositorio (`evolith/`).
3. Obsidian detecta la config `.obsidian/` versionada y la aplica automáticamente.

## Qué hace la config versionada

- **Excluye ruido** (`userIgnoreFilters`): `node_modules`, `.claude` (worktrees), `packages`, `apps`, carpetas de build/coverage. Ves ~730 docs de referencia, no 20.000 archivos.
- **Mantiene enlaces seguros para GitHub**: los enlaces nuevos se crean como **enlaces markdown relativos** (`useMarkdownLinks: true`, `newLinkFormat: relative`), nunca `[[wikilinks]]`. Esto preserva el render de GitHub y el estilo de enlaces existente.
- **Oculta el espejo en español en el grafo**: el filtro `-path:".es.md"` colapsa cada par EN/ES en un solo nodo, así el grafo muestra conceptos, no duplicados.
- **Colorea el grafo** por dominio: ADRs, gobernanza, rulesets, productos, hubs de navegación.

## Convenciones (por favor respetar)

- **No introducir `[[wikilinks]]` en docs versionados.** Rompen el render de GitHub. Usa enlaces markdown relativos — Obsidian está configurado para hacerlo por ti.
- `alwaysUpdateLinks` está **activado**: mover/renombrar un archivo dentro de Obsidian reescribe los enlaces entrantes en todo el repo. Revisa el diff antes de commitear.
- Los adjuntos pegados en notas van a `reference/governance/sdlc/assets/`.

## Versionado vs. ignorado

| Versionado | Ignorado (por usuario / churn) |
|---|---|
| `.obsidian/app.json` | `.obsidian/workspace.json` |
| `.obsidian/core-plugins.json` | `.obsidian/workspace-mobile.json` |
| `.obsidian/graph.json` | `.obsidian/cache`, escrituras de temas/plugins |

## Roadmap (aún no implementado)

Una **Fase 2** futura y opcional añadiría frontmatter YAML (`status`, `owner`, `created`, `lang`, `topology`) a los docs — migrado desde los campos de texto existentes `**Status:**` / `**Owner:**`. Ese frontmatter permitiría al plugin [Dataview](https://github.com/blacksmithgu/obsidian-dataview) generar índices vivos (reemplazando los hechos a mano) y, más importante, podría validarse en CI y consumirse por el generador de inventario independientemente de Obsidian. Esta fase **no** forma parte del cambio actual.

---

[Volver al Hub de Navegación](./README.es.md) · [Hub de Referencia](../README.es.md)
