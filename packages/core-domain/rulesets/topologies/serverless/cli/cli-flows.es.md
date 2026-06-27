# Serverless — Flujos CLI

> **Navegación Bilingüe:** [English Version](./cli-flows.md)

**Validadores declarados:** `validate-architecture`, `validate-topology`

## Validate

```bash
evolith validate --topology serverless
evolith validate --topology serverless --arch-level F2
evolith validate --topology serverless --format json
```

## Inspect

```bash
evolith topology inspect serverless
evolith topology inspect serverless --include-functions
```

## Drift

```bash
evolith drift detect --topology serverless
evolith drift detect --topology serverless --format json
```

## Scaffold

```bash
evolith architecture scaffold --topology serverless
evolith architecture scaffold --topology serverless --dry-run
```

## Gate Evaluation

```bash
evolith gate evaluate --topology serverless
evolith gate evaluate --topology serverless --phase F1
```
