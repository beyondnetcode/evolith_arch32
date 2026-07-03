# Evolith Core Health Checklist

This checklist defines the non-negotiable architectural health gates for Evolith Core. It is used by both CI pipelines and `@winston` to validate that the Core remains stateless, model-agnostic, and dual-engine compliant.

## 1. Statelessness & Tenant Isolation
- [ ] **No Tenant State in Core:** Core modules MUST NOT store, cache, or track `tenant_id` or `workspaceRef`. Tenant context must be passed ephemerally via `EvaluationContext`.
- [ ] **No Product Lifecycle Memory:** Core MUST NOT persist the status of epics, stories, or gaps. It only evaluates and emits `EvaluationResult`.
- [ ] **State Injection:** All required state for evaluation must be injected by the orchestrator/tracker (e.g., `Evolith Tracker`).

## 2. Dual-Engine Parity
- [ ] **TypeScript / OPA Sync:** Every architectural rule defined in `Agent Runtime` MUST have an equivalent `.rego` file in the OPA rulesets.
- [ ] **Test Coverage:** Unit tests MUST assert that both the TypeScript evaluator and the OPA evaluator yield the identical `Verdict` for the same `EvaluationContext`.
- [ ] **No Divergent Schemas:** Schemas used for validation in TypeScript must match the inputs expected by OPA.

## 3. Harness Orchestration
- [ ] **Capabilities over Scripts:** All executable agent routines MUST be declared in `.harness/manifest.yaml`.
- [ ] **JSON Schema Contracts:** Agents MUST output structured JSON matching the registered schemas in `.harness/schemas/` to ensure model agnosticism.
- [ ] **Progress Audit Emitters:** The Agent Runtime MUST emit a valid `progress-audit.jsonl` record for every executed capability.

## 4. Bounded Context Integrity
- [ ] **No Repositories for Entities:** Core Domain entities MUST NOT depend on Repositories for data access. Use Data Mapper pattern.
- [ ] **Strict Inbound Ports:** The Core API MUST ONLY expose functionality via formal inbound ports (e.g., `ICoreEvaluationPort`), never direct service injections across boundaries.

## Audit Output
When `@winston` or CI evaluates this checklist, the output MUST be a JSON object mapping each checklist item to a `PASS` or `FAIL` status, with an optional `evidence` string.
