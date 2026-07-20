# C4 Level 4: Core Domain Modules

> **Bilingual Navigation:** [Versión en Español](./core-domain-modules.es.md)

**Status:** Approved  
**Level:** 4 - Code / Modules  
**Parent:** [C4 Level 4: Code & Modules Hub](./README.md)

## 1. Domain Module Context

The Evolith Core Domain is where the executable governance contracts and stateless architectural evaluation logic live. It consists of TypeScript domain/application/evaluation modules (`@beyondnet/evolith-core-domain`), JSON rulesets declaring architectural intent, JSON schemas validating payloads, and OPA Rego/WASM policy artifacts.

## 2. Code Organization Map

```text
evolith/
├── packages/core-domain/           # The Core Domain Library
│   ├── src/domain/                 # Pure entities, value objects, events, ports and tenant authority
│   │   ├── gate-evidence.ts        # Evidence submission and execution context models
│   │   ├── gates/decision/         # Non-binding Core gate recommendation model
│   │   ├── phases/transition/      # Phase transition model and state rules
│   │   ├── providers/              # Provider ports
│   │   └── tenancy/                # Tenant authority guardrails
│   ├── src/application/            # Use cases, services, validators, generators and sync flows
│   │   ├── use-cases/              # Validate/evaluate/sync/init/propose workflows
│   │   ├── validators/             # Native + OPA rule evaluators and validation modes
│   │   └── services/               # Gate registry, topology catalog and project services
│   ├── src/evaluation/             # Canonical EvaluationContext/EvaluationResult orchestrator
│   ├── src/evidence/               # Evidence graph support
│   └── src/schemas/                # Runtime schema helpers
│
├── rulesets/                       # The Physical Source of Truth (Corpus)
│   ├── phase-gates/                # Declared Rulesets
│   │   └── phase-gates.rules.json
│   ├── sdlc/                       # SDLC workflow and phase-gate rulesets
│   │   └── phase-gates.rules.json
│   ├── schema/                     # Contracts for Rulesets
│   │   ├── evaluation-context.schema.json
│   │   ├── evaluation-result.schema.json
│   │   ├── sdlc-gate.schema.json
│   │   ├── sdlc-phase.schema.json
│   │   └── rule-definition.schema.json
│   └── opa/                        # WASM Policies
│       ├── phase-gates.rego        # Rego policy logic
│       └── policy.wasm             # Compiled WebAssembly for runtime execution
```

## 3. Key Relationships

1. **`core-domain` package:** Used universally by `src/apps/core-api`, `src/packages/agent-runtime`, `src/packages/mcp-server` and `src/sdk/cli`. It keeps framework-specific NestJS/runtime wiring outside the domain contracts.
2. **Canonical evaluation:** `src/evaluation/` defines `EvaluationContext`, `EvaluationResult`, `EvaluationOrchestrator`, kind evaluators, and ports shared by Core API, MCP and CLI.
3. **Native + OPA parity:** `src/application/validators/evaluators/` and `src/rulesets/opa/` provide the dual-engine evaluation path required by repository governance.
4. **Opaque context:** Tenant/product/initiative identifiers are accepted as temporary context only. Core may reflect them in traces/results but does not own authorization, tenant persistence, or binding gate decisions.

---
[Back to Level 4: Code & Modules Hub](./README.md)
