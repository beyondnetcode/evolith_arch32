# Propuestas de Agentes

> **Navegación bilingüe:** [English Version](./README.md)

Este directorio contiene las **propuestas de auto-mejora de los agentes**: la salida
duradera del Mandato de Auto-Mejora y Optimización Proactiva definido en
[AGENTS.es.md §8](../AGENTS.es.md#8-mandato-de-auto-mejora-y-optimización-proactiva).

Cuando cualquier agente (`@winston`, `@architect`, `@po`, `@pm`, `@analyst`, `@devops`,
`@dev`, `@sm`, `@docs`, `@qa`, …) detecta una señal que amerita acción —un script
faltante, una brecha de regla, fricción en un flujo de trabajo o una optimización—
presenta una propuesta aquí en lugar de actuar en silencio. Esto mantiene `.bmad-core/`
como el hogar **solo de orquestación** para el estado y las salidas de los agentes,
distinto de:

- `reference/core/foundations/agent-skills/` — las **definiciones** de agentes y skills canónicas.
- `.harness/agents/` — los **contratos** operativos de los agentes.

## Formato de la Propuesta

Cada propuesta es un archivo Markdown que sigue el formato de
[AGENTS.es.md §8.3](../AGENTS.es.md#83-formato-de-propuesta):

```markdown
## Proposal: <Título>
**Agent:** <Tu Nombre>
**Trigger:** <Qué señal lo activó>
**Scope:** <Script / Regla / Flujo de trabajo / Definición de agente>
**Rationale:** <Por qué importa>
**Implementation:** <Enfoque técnico breve>
**Validation:** <Cómo verificar que funciona>
```

## Relación con el Tablero de Brechas

Las propuestas son **pre-triage**: una propuesta aceptada con significancia arquitectónica
se promueve a una brecha `GT-*` en el
[Tablero de Seguimiento de Brechas](../../reference/core/control-center/gaps/gap-tracking.md),
que sigue siendo la única fuente de verdad para el trabajo rastreado. Una propuesta puramente
local (un pequeño ajuste de script o regla) puede implementarse directamente y referenciarse
desde su commit.
