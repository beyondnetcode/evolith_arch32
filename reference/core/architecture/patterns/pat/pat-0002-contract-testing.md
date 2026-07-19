# PAT-0002: Contract Testing

> **Bilingual Navigation:** [Versión en Español](./pat-0002-contract-testing.es.md)

**Type:** Canonical Architectural Pattern — runtime-agnostic  
**Kind:** Pattern  
**Category:** Contracts  
**Status:** Accepted  
**Also known as:** Consumer-Driven Contract Testing, Pact Testing  

---

## Problem

A provider can satisfy its own tests and still break every consumer, because nothing in the provider's pipeline knows what consumers actually depend on. The break is discovered in integration, after deployment.

## Forces

- Integration environments detect breakage late and expensively; unit tests detect it not at all.
- Consumers must express their expectations without forcing the provider to run consumer test suites.
- Contract coverage must include asynchronous events, not only synchronous calls.

## Solution (Norm)

Every inter-service contract, synchronous and asynchronous alike, has contract tests that validate backward compatibility before merge. Contract tests run in CI on every change, and a deployment that breaks a published contract is rejected.

## Applicability by Topology

| Topology | Applicability | Guidance |
|---|---|---|
| Microservices | Required | Applies to synchronous gRPC/REST and to asynchronous event contracts alike; validated before merge. Enforced by MS-R05. |
| Distributed Modules | Recommended | CI verifies contract backward compatibility on every change to a module interface. |
| Event-Driven | Recommended | Event schemas are the contract; backward compatibility is separately enforced by ED-R06. |
| Modular Monolith | Optional | Cross-module contracts are validated in CI, but a single deployment unit removes the version-skew risk contract testing targets. |

## Enforcement

| Rule | Title | Engine | Ruleset |
|---|---|---|---|
| **MS-R05** | Contract Tests for All Inter-Service Contracts | topology-ruleset | `src/rulesets/topologies/progressive-axis/microservices/microservices.rules.json` |

## Governing ADRs

None. No ADR in the corpus records a decision covering this pattern; enforcement exists without a recorded decision.

## Variants

None recorded.

## Relationships

- **requires PAT-0004** — There is nothing to test until the contract is explicit and versioned.

## Implementations

None yet. This pattern has no runtime-specific canonical implementation (CP-NN) yet.

## Sources

- `reference/core/architecture/topologies/progressive-axis/microservices/patterns.md` — Contract Testing section.

> **Note:** No ADR in the corpus records a decision on contract testing. MS-R05 enforces the practice without an ADR behind it.

---

**[Back to the Pattern Catalogue](../README.md)**
