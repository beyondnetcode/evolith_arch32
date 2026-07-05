# Agentic AI — Flujos CLI

> **Navegación Bilingüe:** [English Version](./cli-flows.md)

**Validadores declarados:** `validate-topology`

## Validate

```bash
evolith validate --topology agentic-ai
evolith validate --topology agentic-ai --strict
evolith validate --topology agentic-ai --format json
```

## Inspect

```bash
evolith topology inspect agentic-ai
evolith topology inspect agentic-ai --include-budgets
```

## Drift

```bash
evolith drift detect --topology agentic-ai
evolith drift detect --topology agentic-ai --format json
```

## Scaffold

```bash
evolith architecture scaffold --topology agentic-ai
evolith architecture scaffold --topology agentic-ai --dry-run
evolith architecture scaffold --topology agentic-ai --format json
```
