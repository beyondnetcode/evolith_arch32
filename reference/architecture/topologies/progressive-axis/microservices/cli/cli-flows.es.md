# Microservices — Flujos CLI

> **Navegación Bilingüe:** [English Version](./cli-flows.md)

**Validadores declarados:** `validate-architecture`, `validate-topology`

## Validate

```bash
evolith validate --topology microservices
evolith validate --topology microservices --arch-level F3
evolith validate --topology microservices --format json
```

## Inspect

```bash
evolith topology inspect microservices
evolith topology inspect microservices --include-services
```

## Drift

```bash
evolith drift detect --topology microservices
evolith drift detect --topology microservices --format json
```

## Scaffold

```bash
evolith architecture scaffold --topology microservices
evolith architecture scaffold --topology microservices --dry-run
```

## Gate Evaluation

```bash
evolith gate evaluate --topology microservices
evolith gate evaluate --topology microservices --phase F3
```

## SDLC Handoff

```bash
evolith sdlc handoff --topology microservices
evolith sdlc handoff --topology microservices --phase F3
```
