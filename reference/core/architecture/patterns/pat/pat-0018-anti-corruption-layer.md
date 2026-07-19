# PAT-0018: Anti-Corruption Layer

> **Bilingual Navigation:** [Versión en Español](./pat-0018-anti-corruption-layer.es.md)

**Type:** Canonical Architectural Pattern — runtime-agnostic  
**Kind:** Pattern  
**Category:** Integration  
**Status:** Accepted  
**Also known as:** ACL, Translation Layer  

---

## Problem

An external system's model, admitted unchanged, becomes the internal model. Its identifiers, its optionality, and its inconsistencies spread through the domain, and the domain can no longer evolve independently of a system nobody here controls.

## Forces

- Translation is duplicated work whose value is only visible when the external system changes.
- Rejecting non-compliant data creates operational load that silent normalisation would have hidden.
- The layer must version in lockstep with the internal schemas it protects.

## Solution (Norm)

All external data is validated against the internal schemas before entering the governance model, and unvalidated data is rejected. Non-compliant data is rejected rather than normalised: silent transformation to make external data fit is prohibited. Every transformation preserves traceability to the originating external entity, and the layer lives in the infrastructure/adapter layer, never in domain entities or application services.

## Applicability by Topology

| Topology | Applicability | Guidance |
|---|---|---|
| Modular Monolith | Required | Applies at every ingestion point; ACL code sits in the module's infrastructure layer behind a port. Enforced by ACL-01 through ACL-06. |
| Distributed Modules | Required | Each module owns the ACL for the external systems it integrates with. |
| Microservices | Required | The ACL is what keeps a wrapper service from becoming a pass-through of the vendor model. |
| Agentic AI | Required | Retrieved text is data, not policy: provenance and schema are validated before it can influence behaviour. |
| Data Mesh | Recommended | External sources feeding a data product are translated before the product's contract is applied. |

## Enforcement

| Rule | Title | Engine | Ruleset |
|---|---|---|---|
| **ACL-01** | External data validated against Core schemas | acl-ruleset | `src/rulesets/acl/anti-corruption-layer.rules.json` |
| **ACL-02** | Transformations preserve source traceability | acl-ruleset | `src/rulesets/acl/anti-corruption-layer.rules.json` |
| **ACL-03** | Non-compliant data is rejected, not normalised | acl-ruleset | `src/rulesets/acl/anti-corruption-layer.rules.json` |
| **ACL-04** | ACL implementations versioned with Core evolution | acl-ruleset | `src/rulesets/acl/anti-corruption-layer.rules.json` |
| **ACL-05** | Integration uses explicit reviewed contracts | acl-ruleset | `src/rulesets/acl/anti-corruption-layer.rules.json` |
| **ACL-06** | ACL isolated from domain logic | acl-ruleset | `src/rulesets/acl/anti-corruption-layer.rules.json` |

## Governing ADRs

None. No ADR in the corpus records a decision covering this pattern; enforcement exists without a recorded decision.

## Variants

None recorded.

## Relationships

- **is a variant of PAT-0010** — A driven adapter whose specific responsibility is model translation and rejection.
- **complements PAT-0004** — The external contract is what the layer validates against.

## Implementations

None yet. This pattern has no runtime-specific canonical implementation (CP-NN) yet.

## Sources

- `src/rulesets/acl/anti-corruption-layer.rules.json` — ACL-01 through ACL-06 rule statements. No prose pattern guide documents this pattern.
- `src/rulesets/topologies/agentic-ai/patterns.md` — 'Retrieved text as policy' anti-pattern and its required correction.

> **Note:** Six rule identifiers enforce this pattern and no pattern guide in the corpus describes it. No ADR records the decision.

---

**[Back to the Pattern Catalogue](../README.md)**
