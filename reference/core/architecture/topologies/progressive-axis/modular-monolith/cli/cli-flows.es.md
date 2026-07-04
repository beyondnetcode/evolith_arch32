# Monolito Modular — Flujos CLI

> **Navegación Bilingüe:** [English Version](./cli-flows.md)

**Validadores declarados:** `validate-architecture`, `validate-topology`

## Validate

```bash
evolith validate --topology modular-monolith
evolith validate --topology modular-monolith --arch-level F1
evolith validate --topology modular-monolith --format json
```

## Inspect

```bash
evolith topology inspect modular-monolith
evolith topology inspect modular-monolith --include-modules
```

## Drift

```bash
evolith drift detect --topology modular-monolith
evolith drift detect --topology modular-monolith --format json
```

## Scaffold

```bash
evolith architecture scaffold --topology modular-monolith
evolith architecture scaffold --topology modular-monolith --dry-run
evolith architecture scaffold --topology modular-monolith --format json
```

## Gate Evaluation

```bash
evolith gate evaluate --topology modular-monolith
evolith gate evaluate --topology modular-monolith --phase F1
```

## SDLC Handoff

```bash
evolith sdlc handoff --topology modular-monolith
evolith sdlc handoff --topology modular-monolith --phase F1
```
