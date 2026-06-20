# Topology Corpus Standard

> **Bilingual Navigation:** [Version en Espanol](./topology-corpus-standard.es.md)

## Purpose

Every topology is a reusable architectural product; a manifest or README alone is not implementation.

## Required Corpus

| Area | Required evidence |
|---|---|
| Guidance | Bilingual profile plus adoption, operations, security, resilience, patterns, and evolution guidance |
| Decisions | Accepted topology-specific ADRs linked from manifest and ADR matrix |
| Executable governance | JSON ruleset, equivalent Rego, Native evaluator, and positive/negative tests |
| Contract | Provider-neutral configuration contract and valid/invalid fixtures |
| Control plane | Shared CLI, MCP, and Core API discovery and validation |
| Closure | Reproducible commands and canonical evidence |

## Acceptance Rule

An `accepted` topology MUST provide every declared corpus artifact, bilingual guidance, and no R-27 validator failure. Draft profiles remain draft until their gaps are tracked and closed.

---
[Back to Topology Hub](./README.md)
