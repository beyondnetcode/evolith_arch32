# ADR-0084: Data Mesh and Data as a Product

**Status:** Accepted  
**Date:** 2026-06-20  
**Tags:** `architecture`, `data`, `topology`

## Context

Evolith operates at an enterprise scale where a single, centralized analytical data team or a monolithic data lake becomes a severe bottleneck. The traditional model forces domain experts to hand off their data to specialized teams who lack domain context, resulting in pipelines that are brittle, misunderstood, and slow to evolve. We need an architecture that scales analytical data capabilities without breaking domain autonomy.

## Decision

We adopt the **Data Mesh** topology for our analytical architecture.

1. **Domain-Oriented Decentralized Data Ownership**: Bounded Contexts own their analytical data in the same way they own their operational data. Data is no longer a byproduct "exhaust" thrown over the wall; it is a first-class citizen of the domain.
2. **Data as a Product**: Domains expose their analytical data as Discoverable, Addressable, Trustworthy, Self-describing, Interoperable, and Secure (DATSIS) products.
3. **Self-Serve Data Infrastructure as a Platform**: We provide a self-serve platform that allows domain teams to build, execute, and monitor their data products autonomously without requiring specialized Big Data expertise.
4. **Federated Computational Governance**: Data contracts, schemas, access control, and compliance policies are defined globally but enforced computationally at the point of data production.

All satellites adopting this topology MUST declare `data-mesh.config.json` containing their configuration as a Data Product.

## Consequences

- **Positive:** Removes the centralized data team bottleneck. Gives domain teams full autonomy over both operational and analytical planes. Radically improves data quality since the producers (who understand the data best) are responsible for it.
- **Negative:** Increased cognitive load for domain teams who now must understand data product lifecycles. Requires significant investment in the self-serve data platform to make this feasible.
- **Compliance:** Governed through `DM-R01`, `DM-R02`, and `DM-R03` in the executable architecture rules.

> **Agent Signature:** Architect Agent
