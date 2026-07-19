# PAT-0009: Discovery and Registration

> **Bilingual Navigation:** [Versión en Español](./pat-0009-discovery-and-registration.es.md)

**Type:** Canonical Architectural Pattern — runtime-agnostic  
**Kind:** Pattern  
**Category:** Governance  
**Status:** Accepted  
**Also known as:** Data Catalog Registration, Discoverability  

---

## Problem

A published asset nobody can find is rebuilt by every domain that needs it, and an asset used without a catalogue entry has no recorded owner to contact when it fails.

## Forces

- Registration must be a publication gate, not a post-hoc documentation chore.
- Draft assets must be excluded from the index without blocking their development.
- Catalogue metadata rots unless registration is enforced rather than encouraged.

## Solution (Norm)

Every published asset registers in a central discovery index with owner, description, schema, classification, SLOs, contact information, and consumption instructions. Registration is a prerequisite for publication. Unregistered assets are invisible to consumers and must not be used for cross-domain sharing; draft assets are excluded from the index.

## Applicability by Topology

| Topology | Applicability | Guidance |
|---|---|---|
| Data Mesh | Required | data-mesh.config.json declares hasDiscoveryRegistration=true; registration precedes publication. Enforced by DAM-R09. |
| Microservices | Recommended | The runtime analogue is the service registry with health-checked instances. |

## Enforcement

| Rule | Title | Engine | Ruleset |
|---|---|---|---|
| **DAM-R09** | Data Product Discoverability Registration | topology-ruleset | `src/rulesets/topologies/data-mesh/data-mesh.rules.json` |

## Governing ADRs

None. No ADR in the corpus records a decision covering this pattern; enforcement exists without a recorded decision.

## Variants

None recorded.

## Relationships

- **requires PAT-0005** — What is registered is a product, with an owner and an SLA.

## Implementations

None yet. This pattern has no runtime-specific canonical implementation (CP-NN) yet.

## Sources

- `src/rulesets/topologies/data-mesh/patterns.md` — Discovery and Registration section.

---

**[Back to the Pattern Catalogue](../README.md)**
