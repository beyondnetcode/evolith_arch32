# Edge Computing — Flujos CLI

> **Navegación Bilingüe:** [English Version](./cli-flows.md)

**Validadores declarados:** `validate-architecture`, `validate-topology`

## Validate

```bash
evolith validate --topology edge-computing
evolith validate --topology edge-computing --arch-level F2
evolith validate --topology edge-computing --format json
```

## Inspect

```bash
evolith topology inspect edge-computing
evolith topology inspect edge-computing --include-targets
```

## Drift

```bash
evolith drift detect --topology edge-computing
evolith drift detect --topology edge-computing --format json
```

## Scaffold

```bash
evolith architecture scaffold --topology edge-computing
evolith architecture scaffold --topology edge-computing --dry-run
```

## Gate Evaluation

```bash
evolith gate evaluate --topology edge-computing
evolith gate evaluate --topology edge-computing --phase F1
```
