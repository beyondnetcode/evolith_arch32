# [ADR 0073](0073-unified-cli-output-contract.md): Unified CLI/MCP Output Contract and Gate Evidence Schema

> **Bilingual Navigation:** [Versión en Español](./0073-unified-cli-output-contract.es.md)

## Status

Approved — Evolith Architecture Board, 2026-06-10. Closes [GT-01](../../../governance/standards/vision/gap-tracking.md#gt-01).

## Date

2026-06-10

## Context and Problem

Two design documents define how the Evolith CLI/MCP layer must expose results to machine consumers, and they diverge:

- The Core-side [SDLC Tracker Technical Interfaces](../../../governance/standards/vision/sdlc-tracker-technical-interfaces.md) specifies a structured `GateEvidence` payload (verdict, violations, ruleset reference and version) returned by gate evaluation.
- The Tracker-side gap analysis (`evolith_tracker` repository, `tracker-smart-cli-gap-analysis.md`) specifies a generic output envelope `{success, data, meta}` with machine-readable error codes, plus global flags (`--format`, `--dry-run`, context flags) and an `evolith <verb> <noun>` command naming convention.

Today the CLI implements neither contract: `--format json` exists on some commands but emits presentation-shaped JSON, each command shapes its own output, the binary is named `smart-cli`, and the Tracker cannot be built until one authoritative contract exists. Per the Upstream Immutability principle, that contract must be ratified in Evolith Core — the Tracker inherits it, never defines it.

## Objective and Scope

**Objective:** ratify a single output contract that every machine-facing surface of the Evolith CLI and MCP server emits, so the Tracker, CI pipelines, and AI agents can parse results uniformly.

**In scope:** the JSON output envelope; the `GateEvidence` schema as the gate-evaluation payload; the global flag set; the error-code registry; binary and MCP tool naming; the command-as-a-service execution model (remote invocation of registered operations via MCP/REST). **Out of scope:** the implementation of gate evaluation itself ([GT-02](../../../governance/standards/vision/gap-tracking.md#gt-02)/[GT-03](../../../governance/standards/vision/gap-tracking.md#gt-03)), transport selection ([GT-05](../../../governance/standards/vision/gap-tracking.md#gt-05)), webhook/event semantics ([GT-14](../../../governance/standards/vision/gap-tracking.md#gt-14)), and human-facing (table/markdown) rendering, which remains free-form.

## Options Considered

1. **GateEvidence only, no envelope (Core-side doc as-is).** Gate calls are structured but every other command stays ad-hoc; CI and agents still need per-command parsers. Rejected: solves one command, not the contract.
2. **Envelope only, no typed payloads (Tracker-side doc as-is).** Uniform wrapper but `data` stays schemaless; the Tracker would re-validate shapes defensively. Rejected: pushes schema discipline downstream, violating the ACL principle that non-compliant data is rejected at the boundary.
3. **Unified contract: envelope wrapping schema-typed payloads (chosen).** The Tracker-side envelope becomes the universal wrapper; the Core-side `GateEvidence` becomes the first schema-typed `data` payload, published as a JSON Schema in `rulesets/schema/`.
4. **Status quo (per-command ad-hoc JSON).** Rejected: blocks the Tracker, contradicts the vision's "structured gate evidence" requirement.

## Decision and Rationale

Adopt **option 3**. Every machine-readable output (`--format json` on the CLI; every MCP tool result) emits:

```json
{
  "success": true,
  "data": { },
  "meta": {
    "command": "evolith gate evaluate",
    "executedAt": "2026-06-10T00:00:00Z",
    "durationMs": 234,
    "correlationId": "uuid",
    "context": { "initiative": "opt", "tenant": "opt", "phase": "opt" }
  }
}
```

On failure, `success: false` and an `error` object replaces `data`:

```json
{ "success": false, "error": { "code": "GATE_BLOCKED", "message": "…", "details": { } }, "meta": { } }
```

**Ratified elements:**

1. **Envelope** as above. `meta.context` echoes caller-supplied context verbatim — the CLI stays stateless; `initiative`/`tenant` are opaque pass-through values, never CLI state.
2. **`GateEvidence`** is the `data` payload of gate evaluation: `{ gateId, phase, verdict: passed|failed|skipped, rulesetRef, rulesetVersion, violations: [{ ruleId, severity: error|warning, location, message }], evaluatedAt, evaluatedBy: human|agent|ci }`. Published as `rulesets/schema/gate-evidence.schema.json` (deliverable of GT-02). All 27 rulesets already carry the `version` field `rulesetVersion` requires (verified 2026-06-10).
3. **Global flags:** `--format <json|table|yaml|markdown>` on every command; `--dry-run` on every write command; `--phase <discovery|design|construction|qa|release>` on gate-scoped commands. Context flags `--initiative` / `--tenant` are accepted and echoed, never persisted.
4. **Initial error-code registry:** `GATE_BLOCKED`, `VALIDATION_FAILED`, `RULESET_NOT_FOUND`, `SCHEMA_INVALID`, `INVALID_PHASE`, `NOT_A_SATELLITE`, `IO_ERROR`, `INTERNAL_ERROR`. Codes are append-only; renaming or reusing a code is a breaking change requiring a superseding ADR.
5. **Naming:** the package adds an `evolith` bin alias alongside `smart-cli` (which remains for compatibility); documentation and new examples use `evolith <verb> <noun>`. MCP tool names mirror CLI commands with dash-joining (`evolith-gate-evaluate` ↔ `evolith gate evaluate`).
6. **Command-as-a-Service execution model:** every governed operation is implemented once as an application-layer use case and exposed through three thin adapters — the CLI command (terminal), an MCP tool (AI agents and the Tracker over stdio/HTTP), and, where the Tracker requires it, a REST endpoint. An external consumer sends the command through any surface, Evolith executes the same use case behind it, and returns the same envelope. Two constraints: (a) **no arbitrary command execution** — only explicitly registered operations are remotely invocable (the registry is the MCP tool list; a generic "run any shell/CLI string" endpoint is prohibited as an injection surface); (b) **surface parity** — a remotely invocable operation must accept the same parameters and return the same envelope as its CLI form, so behavior is testable once.

**Rationale:** the envelope gives the Tracker, CI, and agents one parser; schema-typed payloads keep the boundary strict (ACL rule: reject, don't normalize); statelessness is preserved by treating context as echo-only; naming converges on the product brand without breaking existing `smart-cli` consumers.

## Evidence and Evaluation Criteria

Criteria used to judge the options: (a) Tracker can consume gate results without bespoke parsing; (b) CLI remains stateless per the [Tracker interface invariants](../../../governance/standards/vision/sdlc-tracker-technical-interfaces.md); (c) zero breaking change for current human-facing output; (d) implementable incrementally per command.

Evidence: both source design documents; verified code state of 2026-06-10 — `--format json` is presentation-only today, all 27 rulesets are versioned, `--dry-run` already exists on 5 of 7 write commands (gap tracked as [GT-12](../../../governance/standards/vision/gap-tracking.md#gt-12)).

## Consequences, Risks, and Trade-offs

**Positive:** unblocks Tracker development (GT-02/03/06 implement against a ratified contract); one conformance test suite covers all commands; error codes make agent retry/branch logic deterministic.

**Negative / risks:** dual bin names (`smart-cli` + `evolith`) until a major version retires one; envelope adds nesting that existing ad-hoc JSON consumers (if any) must adapt to — mitigated by versioning the contract in `meta` if evolution demands it; `meta.durationMs` and `correlationId` add minor instrumentation cost per command.

**Trade-off accepted:** context flags as opaque echo (instead of validated tenant scoping) keeps the CLI stateless but defers tenant validation entirely to the Tracker.

## References

- [SDLC Tracker — Technical Interface Design](../../../governance/standards/vision/sdlc-tracker-technical-interfaces.md)
- Tracker-side analysis: `evolith_tracker/reference/specs/design/tracker-smart-cli-gap-analysis.md`
- [JSON Schema specification](https://json-schema.org/) (payload schema format)
- [MCP specification](https://modelcontextprotocol.io/) (tool result framing)

## Related Decisions and Standards

- [ADR 0069: MCP Server Protocol Implementation](./0069-mcp-server-protocol-implementation.md) — transport this contract rides on
- [ADR 0032: API Protocol Decision Matrix](./0032-api-protocol-decision-matrix-rest-grpc-graphql.md) — protocol selection principles
- [ADR Authoring Standard](../adr-authoring-standard.md) — this ADR's structure
- Gap items: [GT-01](../../../governance/standards/vision/gap-tracking.md#gt-01) (this decision), GT-02/GT-03/GT-06 (implementation), GT-12 (`--dry-run` completion), GT-18 (npm publication under the `evolith` alias)
- Rulesets: `rulesets/cli/core-parity.rules.json`, future `rulesets/schema/gate-evidence.schema.json`

---
[Back to ADR Registry](../README.md)
