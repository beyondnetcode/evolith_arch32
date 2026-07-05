# Data Mesh — Flujos CLI

> **Navegación Bilingüe:** [English Version](./cli-flows.md)

**Validadores declarados:** `validate-architecture`, `validate-topology`

## Validate

```bash
evolith validate --topology data-mesh
evolith validate --topology data-mesh --arch-level F2
evolith validate --topology data-mesh --format json
```

## Inspect

```bash
evolith topology inspect data-mesh
evolith topology inspect data-mesh --include-domains
```

## Drift

```bash
evolith drift detect --topology data-mesh
evolith drift detect --topology data-mesh --format json
```

## Scaffold

```bash
evolith architecture scaffold --topology data-mesh
evolith architecture scaffold --topology data-mesh --dry-run
```

## Gate Evaluation

```bash
evolith gate evaluate --topology data-mesh
evolith gate evaluate --topology data-mesh --phase F1
```
