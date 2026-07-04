# Event-Driven — Flujos CLI

> **Navegación Bilingüe:** [English Version](./cli-flows.md)

**Validadores declarados:** `validate-architecture`, `validate-topology`

## Validate

```bash
evolith validate --topology event-driven
evolith validate --topology event-driven --arch-level F2
evolith validate --topology event-driven --format json
```

## Inspect

```bash
evolith topology inspect event-driven
evolith topology inspect event-driven --include-channels
```

## Drift

```bash
evolith drift detect --topology event-driven
evolith drift detect --topology event-driven --format json
```

## Scaffold

```bash
evolith architecture scaffold --topology event-driven
evolith architecture scaffold --topology event-driven --dry-run
```

## Gate Evaluation

```bash
evolith gate evaluate --topology event-driven
evolith gate evaluate --topology event-driven --phase F1
```
