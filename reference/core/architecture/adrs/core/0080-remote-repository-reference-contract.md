# ADR-0080: Remote Repository Reference Contract

> **Bilingual Navigation:** [Versión en Español](./0080-remote-repository-reference-contract.es.md)

## Status

Approved — Evolith Architecture Board, 2026-06-19.

## Date

2026-06-19

## Context and Problem

The Core API currently receives filesystem paths for satellite evaluation and project commands. That works only when the caller and the API share a host filesystem. A hosted Core API consumed by Evolith Tracker cannot trust a client-supplied path, and must not receive repository credentials in an API request.

## Objective and Scope

**Objective:** provide a provider-neutral remote repository contract that lets a hosted Core API acquire a bounded snapshot for governance operations.

**In scope:** repository identity, immutable revision selection, credential references, ephemeral workspaces, audit data, and tenant isolation.

**Out of scope:** Git-provider selection, credential-vault implementation, long-lived source-code storage, and Tracker BFF implementation.

## Options Considered

1. **Caller-supplied filesystem path.** Rejected: it is not portable or safe across tenants.
2. **Upload an archive with every command.** Rejected: it duplicates large source trees, weakens revision traceability, and complicates secret scanning.
3. **Repository reference with server-side ephemeral checkout.** Selected: it keeps credentials server-side, preserves Git revision provenance, and supports a later provider adapter.

## Decision and Rationale

Commands that require satellite content must accept a `repositoryRef`, not `satellitePath` or `corePath`:

```json
{
  "repository": { "url": "https://scm.example/org/product.git", "revision": "immutable-commit-sha" },
  "workspaceRef": "tracker-issued-opaque-reference",
  "operationId": "uuid"
}
```

Evolith Tracker's BFF validates the UMS Bearer token and authorization graph, authorizes repository access, resolves credentials, and creates the read-only ephemeral workspace. It then invokes Core with the immutable repository metadata and opaque `workspaceRef`. Core executes the governance use case without receiving a user token, credential, tenant identity, or absolute workspace path.

Application-layer tenant scoping in the Tracker BFF is primary. Workspace namespacing, process isolation, read-only mounts, cleanup, and retention controls are a secondary failsafe. Core remains reusable by any open-source consumer and does not implement an authentication subsystem.

## Evidence and Evaluation Criteria

The selected model is evaluated by: no caller filesystem dependency; immutable and reproducible input; credentials and UMS tokens never crossing into Core; authorization at the BFF boundary; deterministic cleanup; and replaceable SCM and vault adapters.

## Consequences, Risks, and Trade-offs

**Positive:** hosted consumption becomes possible; evaluations are reproducible; SCM and secret providers remain replaceable.

**Risks:** checkout latency, provider outages, and malicious repository content. Mitigate with shallow pinned checkouts, time/resource limits, network restrictions, malware/secret scanning where required, and audit events for acquisition and cleanup.

**Trade-off:** remote commands are more operationally expensive than local paths. The Tracker BFF owns this product integration; Core remains an open standard and engine without CLI, MCP, or authentication dependencies.

## References

- [ADR-0010: Multi-Tenancy Architecture Strategy](./0010-multi-tenancy-architecture-strategy.md)
- [ADR-0016: Immutable Audit Trail](./0016-immutable-business-audit-trail.md)
- [ADR-0074: Evolith Core API Native Exposure Layer](./0074-evolith-core-api-exposure-layer.md)
- [GT-118](../../../control-center/gaps/gap-reference-catalog.md#gt-118)

## Related Decisions and Standards

- [API Gateway Guidelines](../../../foundations/common-rules/gateway-guidelines.md)
- [ADR Authoring Standard](../adr-authoring-standard.md)

---
[Back to ADR Registry](../README.md)

> **Agent Signature:** Architect Agent
