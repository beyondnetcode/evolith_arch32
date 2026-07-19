# Propuesta de Templates de Diseño

> **Navegación Bilingüe:** [English Version](./design-template-proposal.md)

## Propósito

Proponer proactivamente **templates de diseño** reutilizables — composiciones de bloques que guían un diseño — en tres niveles de complejidad (**simple / medio / complejo**) para una necesidad dada. Alimenta la inteligencia de diseño del tenant (ADR-0104 §9); el tenant elige y adapta.

## Contrato

| Campo | Valor |
|-------|-------|
| ID | `design-template-proposal` |
| Dueño | `@architect` (Winston revisa) |
| Versión | `1.0.0` |
| Entradas | Contexto de iniciativa, composición de topología recomendada/confirmada, block-type registry, colección privada del tenant (si se provee) |
| Salidas | Hasta tres propuestas `design-template` (simple/medio/complejo) conformes a `design-template.schema.json` |

## Algoritmo

1. Resolver la composición de topología recomendada/confirmada (vía el recomendador, GT-430).
2. Derivar los bloques esperados (unión de los `designProfile` de la composición + bloques universales).
3. Producir tres templates para la misma necesidad:
   - **simple** — la composición mínima viable (bloques universales + el set derivado más pequeño);
   - **medio** — añade los bloques condicionales que la composición recomienda;
   - **complejo** — cobertura total incl. profundidad de resiliencia/observabilidad/rendimiento.
4. Preferir bloques canónicos (`core`); introducir bloques `tenant` solo cuando ningún canónico encaje.
5. Emitir cada uno como propuesta `scope: core` (catálogo) o `scope: tenant` con `provenance.proposedBy: agent`.

## Uso

Invocada por `@architect`/`@winston` durante la asesoría de Design (D-002). Las propuestas son sugerencias **no vinculantes**; el tenant compone el blueprint real. Los templates tenant reutilizables se pueden promover aguas arriba vía la skill [`template-promotion`](./template-promotion.es.md).

## Referencias

- [Design Template Schema](../../../../src/rulesets/schema/design-template.schema.json)
- [Design Block Registry](../../../../src/rulesets/schema/design-block-registry.json)
- [ADR-0104](../../architecture/adrs/core/0104-topology-driven-advisory-design-governance.es.md)
