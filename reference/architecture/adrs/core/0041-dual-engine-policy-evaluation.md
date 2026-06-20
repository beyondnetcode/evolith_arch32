# ADR 0041: Dual-Engine Policy Evaluation (Native + OPA)

## Status
Accepted

## Context
Evolith's architectural governance currently relies on JSON files containing rules and a custom TypeScript CLI (`RuleEvaluationEngine`) to parse these files and evaluate the physical workspace of satellite repositories against them. This model is optimal for GitOps and AI agent consumption (via JSON schemas). However, as rules become more complex, writing imperative TypeScript code for every new architectural invariant becomes a bottleneck and restricts interoperability with standard cloud-native policy ecosystems.

Open Policy Agent (OPA) with its policy language, Rego, is the industry standard for declarative policy enforcement. We want to adopt OPA to standardize policy evaluations without sacrificing the simplicity and debuggability of the current Native TypeScript evaluator.

## Decision
We will implement a **Dual-Engine Policy Evaluation Strategy** using a Strategy Pattern (`IRuleEvaluatorStrategy`).
1. **Native Engine (TypeScript)**: Maintains the existing custom logic for baseline rules.
2. **OPA Engine (Wasm)**: A new evaluator utilizing `@open-policy-agent/opa-wasm` to execute `.rego` files locally within the Node.js CLI process, avoiding external CLI dependencies for satellites.

To guarantee that AI Agents and the Evolith core remain synchronized, we institute the **Dual-Engine Parity Rule**: Any new architectural validation logic must be implemented simultaneously in both the Native Evaluator and a corresponding `.rego` file. The CLI will feature an `--engine <native|opa>` switch to determine which backend is used for validation during the CI/CD pipeline.

## Consequences
### Positive
- **Smooth Transition**: Satellites can continue using the default Native engine without disruption while the OPA engine matures.
- **Agent Interoperability**: AI Agents can read declarative `.rego` rules to understand constraints deeply, while still maintaining the structural JSON metadata for context.
- **Zero External Dependencies**: Using `opa-wasm` means satellite pipelines do not need the `opa` binary installed; Node.js is sufficient.

### Negative
- **Maintenance Overhead**: Dual-Engine Parity requires maintaining validation logic in two distinct languages (TypeScript and Rego) until one engine is completely deprecated in the future.
- **Learning Curve**: Architecture teams and Agents must understand Rego syntax to contribute new governance rules.

> **Agent Signature:** Architect Agent
