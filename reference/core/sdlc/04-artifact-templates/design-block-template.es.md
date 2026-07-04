# Plantilla: Bloque de Diseño

> **Navegación bilingüe:** [English Version](./design-block-template.md)
> **Fase:** 2 — Design y Arquitectura
> **Gobierna:** ADR-0104 (blueprint como guía de desarrollo componible)

## Propósito

Un **bloque de diseño** es una unidad constructiva de un blueprint — un plan, matriz, catálogo o política (p. ej. `infrastructure-plan`, `performance-plan`, `event-contract-catalog`). El blueprint es la "caja de bloques": compones un diseño seleccionando y llenando bloques por concern (frontend/backend/services/mobile/data). El Core valida el blueprint compuesto y **mide su madurez** (advisory, no vinculante).

## Convention over Configuration

Cada bloque conforma [`design-block.schema.json`](../../../../src/rulesets/schema/design-block.schema.json) y se registra en el [block-type registry](../../../../src/rulesets/schema/design-block-registry.json). Un **nuevo blockKind se añade agregándolo al registry** — sin cambios en el motor. Las contribuciones de comunidad suben aguas arriba vía UP-NNN.

## Estructura

| Campo | Significado |
|---|---|
| `blockKind` | Tipo del registry (kebab-case), p. ej. `performance-plan` |
| `title` | Nombre legible |
| `scope` | `core` (corpus canónico) o `tenant` (colección privada del tenant, ADR-0104 §11) |
| `concern` | frontend / backend / services / mobile / data / … (opcional) |
| `status` | draft / proposed / accepted / deprecated |
| `sections[]` | Secciones de contenido del bloque (`id`, `title`, `content`) |
| `adrRefs[]` | ADRs de los que depende el bloque |
| `qualityAttributes[]` | `name` · `target` · `adrRef?` |
| `maturitySignals[]` | Señales que alimentan el score de madurez técnica (`name`, `value?`, `target?`) |
| `governance.tier` | official / certified / community |

## Reglas de autoría

- Un bloque = una unidad de diseño con alcance de concern; mantenlo componible y autocontenido.
- Declara `maturitySignals` para que el Core pueda medir la madurez del bloque.
- Un bloque es **advisory**: alimenta recomendaciones y el score de madurez; el gate del tenant decide cualquier bloqueo.
- Reutiliza un bloque canónico (`core`) antes de crear uno `tenant`; promueve los bloques `tenant` reutilizables aguas arriba (UP-NNN).

## Relacionado

- [Blueprint Schema](../../../../src/rulesets/schema/blueprint.schema.json)
- [Design Block Registry](../../../../src/rulesets/schema/design-block-registry.json)
- [ADR-0104](../../architecture/adrs/core/0104-topology-driven-advisory-design-governance.es.md)

---
[Volver a Plantillas de Artefactos](./README.md)
