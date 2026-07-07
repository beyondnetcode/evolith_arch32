> **Bilingual Navigation:** [Ver versión en Español](./0098-rest-uri-versioning-deprecation-policy.es.md)

# ADR-0098: REST URI Versioning and Deprecation Policy

> **Agent Signature:** Architect Agent (Winston)

## Status
Accepted

## Date
2026-06-21

## Context and Problem
GT-155 unified every REST response under the ADR-0073 envelope. The next obvious failure mode is contract evolution: a Core API change can silently break Tracker or any satellite that consumes a stable route. Today the Core API enables NestJS URI versioning (`api/v1/...` via `defaultVersion`), but several controllers rely on the implicit default rather than declaring a version, and there is no published deprecation policy — no minimum notice, no `Sunset`/`Deprecation` headers, no changelog requirement. The contract can therefore drift without any consumer-visible signal until a request returns the wrong shape.

The CLI and MCP surfaces accept the same problem (GT-174 will define `meta.schemaVersion` and a producer/consumer compatibility matrix). REST is the surface that needs versioning **first** because external consumers reach it directly over HTTP and cannot pin a client version the way an in-process import would.

## Decision
Adopt **URI versioning** as the canonical REST versioning strategy and publish a deprecation policy enforced by CI and visible to callers in response headers.

### 1. URI versioning baseline
- Every REST route is served under `/api/v<MAJOR>/...`. Today `<MAJOR> = 1`; future major versions add new segments rather than mutating existing ones.
- Every controller declares its version **explicitly** in the `@Controller({ path, version })` decorator. The global `defaultVersion: '1'` remains as a safety net but is no longer the sanctioned source of truth.
- Operational endpoints (`/health`, `/metrics`) declare `version: VERSION_NEUTRAL` and document the reason. Liveness, readiness, and Prometheus scrapers cannot tolerate URI churn.
- Header- or query-based versioning is **rejected**: it complicates caching, makes routes harder to grep, and pushes the versioning concern out of the URL where caller diagnostics naturally land.

### 2. Deprecation policy
A route enters the deprecation lifecycle through a `@Deprecated()` route decorator. The decorator drives an interceptor that adds three response headers per RFC 8594 and RFC 9745:

| Header | Value | Source |
|---|---|---|
| `Deprecation` | `true` (or RFC 9745 timestamp) | always |
| `Sunset` | RFC 7231 HTTP-date | required |
| `Link` | `<successor-route>; rel="successor-version"` | required when successor exists |

Minimum notice between deprecation and sunset is **90 days**. Removal before the sunset date requires an Architecture Board exception recorded in the ADR set.

### 3. Changelog requirement
Every URI-versioned route change ships with a changelog entry under `product/products/core-api/changelog.md` (created by GT-156) noting:
- The route, HTTP verb, and version.
- The change class (added · deprecated · removed · breaking-shape).
- Effective date and sunset date for deprecations.
- The successor route, when applicable.

### 4. CI enforcement
- A native rule in `.harness/scripts/` parses `apps/core-api/src/presentation/controllers/*.controller.ts` and fails when:
  - A `@Controller(...)` declaration lacks both `version` and `VERSION_NEUTRAL`.
  - A `VERSION_NEUTRAL` controller does not carry an explanatory comment with the token `version-neutral-justification`.
- A deprecation linter fails the CI pipeline when a `@Deprecated()` decorator appears without a corresponding changelog entry.

## Consequences

### Positive
- External consumers see the contract evolution in their HTTP layer (status, headers, route) rather than discovering it through a 500 or a silent shape change.
- New major versions can ship alongside `v1` without flag flips or deploy ordering, lowering rollout risk.
- The CI rule prevents future controllers from re-introducing the silent-default coupling.

### Negative / risks
- Introducing `v2` later doubles the route footprint until `v1` sunsets. Acceptable: contracts are durable, and the doubling is bounded by the 90-day minimum notice.
- The `Sunset` header is metadata only — operators must monitor logs to enforce it. The deprecation linter mitigates this by surfacing the route in the changelog where reviewers can see it.

### Trade-off accepted
- We pick URI versioning over Accept-header versioning, knowing it costs URL stability but buys grep-ability, cache friendliness, and one-look diagnostics. The deprecation cost lives in the changelog, not in HTTP semantics.

## References
- [ADR-0073](./0073-unified-cli-output-contract.md) — Unified output envelope (consumed by every versioned route).
- [GT-155](../../../control-center/gaps/gap-reference-catalog.md#gt-155) — Envelope conformance precondition.
- [GT-159](../../../control-center/gaps/gap-reference-catalog.md#gt-159) — This decision realizes the gap.
- [GT-174](../../../control-center/gaps/gap-reference-catalog.md#gt-174) — `meta.schemaVersion` and surface compatibility matrix (downstream).
- [RFC 7231 §7.1.1.1](https://datatracker.ietf.org/doc/html/rfc7231#section-7.1.1.1) — HTTP-date format used in `Sunset`.
- [RFC 8594](https://datatracker.ietf.org/doc/html/rfc8594) — The Sunset HTTP Header Field.
- [RFC 9745](https://datatracker.ietf.org/doc/html/rfc9745) — The Deprecation HTTP Header Field.
