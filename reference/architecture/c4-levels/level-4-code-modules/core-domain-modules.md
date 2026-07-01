# C4 Level 4: Core Domain Modules

> **Bilingual Navigation:** [Versión en Español](./core-domain-modules.es.md)

**Status:** Approved  
**Level:** 4 - Code / Modules  
**Parent:** [C4 Level 4: Code & Modules Hub](./README.md)

## 1. Domain Module Context

The Evolith Core Domain is where all stateless architectural governance logic lives. It consists of the TypeScript models (`@evolith/core-domain`), the JSON rulesets that declare architectural intent, the JSON schemas that validate them, and the OPA Rego files that enforce them.

## 2. Code Organization Map

```text
evolith/
├── packages/core-domain/           # The Core Domain Library
│   ├── src/domain/                 # Pure Entities & Value Objects
│   │   ├── gate-evidence.ts        # Evidence submission models
│   │   ├── execution-context.ts    # Opaque context (tenant, product, initiative)
│   │   └── gate-decision.ts        # Core's EvaluationResult (NOT Tracker's GateDecision)
│   └── src/ports/                  # Outbound Interfaces
│       └── i-gate-evaluator.ts
│
├── rulesets/                       # The Physical Source of Truth (Corpus)
│   ├── phase-gates/                # Declared Rulesets
│   │   └── phase-gates.rules.json
│   ├── schema/                     # Contracts for Rulesets
│   │   ├── sdlc-gate.schema.json
│   │   ├── sdlc-phase.schema.json
│   │   └── rule-definition.schema.json
│   └── opa/                        # WASM Policies
│       ├── phase-gates.rego        # Rego policy logic
│       └── policy.wasm             # Compiled WebAssembly for runtime execution
```

## 3. Key Relationships

1. **`core-domain` package:** Used universally by `apps/core-api`, `packages/agent-runtime`, and `packages/smart-cli`. It contains *zero* framework dependencies (no NestJS, no Traefik).
2. **`phase-gates.rego`:** The open-policy-agent file evaluates the conditions laid out in `phase-gates.rules.json` against the `gate-evidence` passed in at runtime.
3. **`execution-context.ts`:** Proves that the core is stateless. It handles the `workspaceRef` and opaque identifiers, never persisting tenant logic internally.

---
[Back to Level 4: Code & Modules Hub](./README.md)
