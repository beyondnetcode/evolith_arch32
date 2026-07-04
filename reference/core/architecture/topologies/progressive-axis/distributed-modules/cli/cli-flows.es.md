# Distributed Modules — Flujos CLI

> **Navegación Bilingüe:** [English Version](./cli-flows.md)

**Validadores declarados:** `validate-architecture`, `validate-topology`

## Validate

```bash
evolith validate --topology distributed-modules
evolith validate --topology distributed-modules --arch-level F2
evolith validate --topology distributed-modules --format json
```

## Inspect

```bash
evolith topology inspect distributed-modules
evolith topology inspect distributed-modules --include-services
```

## Drift

```bash
evolith drift detect --topology distributed-modules
evolith drift detect --topology distributed-modules --format json
```

## Scaffold

```bash
evolith architecture scaffold --topology distributed-modules
evolith architecture scaffold --topology distributed-modules --dry-run
```

## Gate Evaluation

```bash
evolith gate evaluate --topology distributed-modules
evolith gate evaluate --topology distributed-modules --phase F2
```
