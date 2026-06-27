# Agentic AI Validation Evidence

> **Bilingual Navigation:** [Version en Espanol](./evidence.es.md)

## Reproducible Commands

Run these commands from the repository root:

```bash
node .harness/scripts/validate-topology-manifests.mjs
node .harness/scripts/ci/04-check-bilingual-parity.mjs
node .harness/scripts/ci/01-validate-docs.mjs
npm test -- --runInBand architecture-rule.handler.spec.ts
```

## Expected Evidence

The valid fixture satisfies the contract and AAI-R01 through AAI-R07. The invalid fixture is intentionally rejected by the configuration schema and represents blocking sandbox, trust, authorization, audit, and resource-limit failures. The Native evaluator tests include passing and blocking cases; the corresponding Rego policy must produce the same disposition for the same normalized input.

## Evidence Boundary

This file documents reproducible topology validation. It is not a GT closure record and does not replace the canonical governance evidence required before a gap is marked done.

---
[Back to Agentic AI Profile](./README.md)
