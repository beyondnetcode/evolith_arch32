# Evolith — Visual Architecture Backlog

> **Bilingual navigation:** [Español](./README.es.md)  
> **Parent:** [Architecture Communication Strategy](../architecture-communication-strategy.md)  
> **Owner:** Evolith Architecture Board  
> All diagrams are rendered natively on GitHub via Mermaid.

This folder contains the 8 visual artifacts that make the Evolith corporate architecture standard understandable at a glance. Each visual targets a specific audience and answers a specific question.

---

## Visual Catalog

| # | Visual | Primary Audience | Core Question Answered |
|---|---|---|---|
| [V-01](./v01-executive-one-pager.md) | **Executive One-Pager** | Executive / Sponsor | What is Evolith? Why do we need it? What is UMS? |
| [V-02](./v02-progressive-journey.md) | **Progressive Journey Diagram** | All teams | What are the 4 stages and what triggers each transition? |
| [V-03](./v03-capability-map.md) | **Capability Map** | Architects, PMs | What does the Evolith platform provide? |
| [V-04](./v04-adr-decision-tree.md) | **ADR Decision Tree** | Architects, Devs | Which ADR answers my specific question? |
| [V-05](./v05-onboarding-journey-map.md) | **Onboarding Journey Map** | Tech Leads, HR | What does each role read, when, and in what order? |
| [V-06](./v06-governance-flow.md) | **Governance Flow** | Architecture Board | How does an ADR get written, reviewed, approved, and promoted? |
| [V-07](./v07-traceability-visual.md) | **Traceability Visual** | Tech Leads, QA | How does every UMS requirement trace to an Evolith ADR? |
| [V-08](./v08-infrastructure-topology.md) | **Infrastructure Topology** | DevOps, SRE | What does the full deployment topology look like? |

---

## Diagrams per Visual

| Visual | Diagrams included |
|---|---|
| V-01 | Two-Layer Ecosystem · Why Both Are Needed · 3-Phase Timeline · Value by Stakeholder |
| V-02 | 4-Stage Journey with Triggers · What You Get at Each Stage · ADR-0045 Extraction Criteria · Phase 1 Checklist |
| V-03 | Full Capability Landscape · Coverage by Runtime · Capability Maturity Quadrant |
| V-04 | Top-Level Funnel · Core ADR Tree · Node.js ADR Tree · .NET ADR Tree |
| V-05 | Universal Flow · Architect Journey · Developer Journey · QA Journey · DevOps Journey · PM Journey · Vendor Journey |
| V-06 | ADR Lifecycle State Machine · RACI Matrix · Promotion Path · Enforcement Layers |
| V-07 | Domain Cluster Heatmap · Forward Trace FS→ADR→TE · ADR Impact Score · TE Coverage Map |
| V-08 | Full Production Topology · Local Dev Stack · Multi-Cloud Options · Zero-Trust Perimeter · CI/CD Quality Gates |

---

## Technology

All diagrams use **Mermaid** and render natively on GitHub without plugins. To render locally, use:
- [Mermaid Live Editor](https://mermaid.live)
- VS Code extension: `Markdown Preview Mermaid Support`
- Obsidian with Mermaid plugin

To export as SVG/PNG for presentations, paste into [mermaid.live](https://mermaid.live) and use the export button.
