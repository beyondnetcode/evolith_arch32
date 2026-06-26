# Phase 1.1 — Knowledge-First Discovery / KDD Readiness Gate

> **Bilingual Navigation:** [Versión en Español](./phase-1.1-knowledge-first-discovery.es.md)

**Phase:** 01 — Conception & Discovery
**Subphase:** 01.1 — Knowledge-First Discovery / KDD Readiness
**Gate Type:** Optional, progressive
**Accountable Role:** Business Discovery Agent / Product Owner
**Waiver Authority:** Executive Sponsor

---

## Purpose

This playbook operationalises the Knowledge-First Discovery gate within Phase 01. It validates that minimum sufficient knowledge has been captured before any epic, story, or backlog item is created. The gate is optional and scales from lightweight (Level 1) to enterprise-regulated (Level 4).

---

## When to Apply

| Scenario | Recommended Level |
|----------|------------------|
| Small fix or trivial change | Level 0 (skip) |
| Well-understood domain, experienced team | Level 1 (Light) |
| New product or significant feature | Level 2 (Standard) |
| Legacy modernization or complex integration | Level 3 (Governed) |
| Regulated industry (finance, health, government) | Level 4 (Enterprise) |
| Satellite repository onboarding | Level 2-3 |

---

## Discovery Agents

Each step in the gate procedure is supported by a specialized AI agent defined in [`AGENTS.md §Discovery Agents`](../../../../AGENTS.md#discovery-agents-subphase-011). Invoke agents in this sequence; each agent's output is the next agent's input:

| Agent | Artifact Produced | Level |
|---|---|:---:|
| Business Discovery Agent | Discovery Knowledge Brief (draft) | 1+ |
| Product Framing Agent | Knowledge Brief (validated), Context Pack | 1+ |
| Capability Modeling Agent | Capability Map | 2+ |
| Epic Discovery Agent | Epic Candidate Matrix (with MoSCoW) | 2+ |
| Story Slicing Agent + Acceptance Criteria Agent | Story Seed Bank | 2+ |
| Architecture Discovery Agent | Architecture constraints, Decision Candidates | 3+ |
| Discovery Gate Agent | Discovery Readiness Gate (PASS/CONDITIONAL/FAIL) | 3+ |

Human execution is valid at all levels; agents are optional accelerators.

---

## Gate Procedure

### Step 1: Determine Adoption Level

Evaluate the initiative against these criteria:

| Factor | Level 0-1 | Level 2 | Level 3 | Level 4 |
|--------|-----------|---------|---------|---------|
| Domain familiarity | Known | Partially known | New | Regulated |
| Team size | 1-3 | 4-8 | 8+ | Any + compliance |
| Change risk | Low | Medium | High | Critical |
| Regulatory requirements | None | None | Some | Mandatory |
| AI agent involvement | None | Possible | Likely | Required |

### Step 2: Produce Required Artifacts

**Level 1 — Light:**
1. Discovery Knowledge Brief (problem, value, actors, context)
2. Assumptions & Questions Log (open items)
3. Discovery Context Pack (exportable for agents)

**Level 2 — Standard (adds):**
4. Capability Map (domain capabilities)
5. Epic Candidate Matrix (capability → epic traceability)
6. Story Seed Bank (minimal story seeds)

**Level 3 — Governed (adds):**
7. Discovery Readiness Gate (formal validation)

**Level 4 — Enterprise (adds):**
8. OPA ruleset validation
9. CLI/MCP evidence generation
10. Audit trail record

### Step 3: Validate Against Quality Checklist

- [ ] Problem statement is explicit and testable
- [ ] Value proposition is articulated
- [ ] Stakeholders / actors are identified
- [ ] Capabilities are described at domain level
- [ ] Each epic candidate derives from a capability
- [ ] Each story seed derives from an epic candidate
- [ ] Assumptions are visible and labeled (validated / unvalidated)
- [ ] Open questions have owners and target dates
- [ ] Technical constraints are identified
- [ ] Risks have owners or mitigation strategy
- [ ] ADR candidates, spikes, or enablers are flagged
- [ ] Discovery Context Pack exists (Level 1+)
- [ ] Adoption level is appropriate for initiative type
- [ ] Traceability chain is complete (trigger → brief → capability → epic → story)

### Step 4: Gate Decision

| Outcome | Action |
|---------|--------|
| **PASS** | Proceed to Capability Map / Epic Candidate Matrix / Ballpark Estimation |
| **CONDITIONAL** | Proceed with documented waivers for specific gaps |
| **FAIL** | Return to knowledge capture; re-run gate after gaps addressed |

---

## Handoff

After gate PASS:

```
Discovery Knowledge Brief ──→ Capability Map ──→ Epic Candidate Matrix
                                                         │
Assumptions & Questions Log ─────────────────────────────┤
                                                         │
Story Seed Bank ──→ Ballpark Estimation ──→ Agile Backlog
                                                         │
Discovery Context Pack ──→ Design / Architecture ──→ Construction
```

---

## Quality Checklist

- [ ] All required artifacts for the chosen level exist
- [ ] Traceability IDs are assigned and linked
- [ ] No blocking assumptions remain unvalidated (Level 3+)
- [ ] Knowledge sufficient for the next phase (Ballpark or Backlog)
- [ ] Discovery Context Pack is current and exportable

---

## Handoff to Gate F1

After a **PASS** or **CONDITIONAL** outcome, the following gate-F1 artifacts must reflect KDD outputs:

| Gate F1 Artifact | KDD Source | Condition |
|---|---|---|
| Discovery Canvas | Discovery Knowledge Brief | Level 1+ |
| Ballpark Estimation | Story Seed Bank sizing | Level 2+ |
| MoSCoW Prioritization Matrix | Epic Candidate Matrix (MoSCoW columns) | Level 2+ — the matrix IS the MoSCoW artifact; no standalone required |
| Technical Feasibility Canvas | Architecture Discovery Agent output | Level 3+ |

A **FAIL** outcome on this gate **blocks** the opening of the Phase 1 Business Sign-Off gate. Document the gap and re-run after resolution.

---

## References

- [Discovery Knowledge Brief Template](../04-artifact-templates/discovery-knowledge-brief-template.md)
- [Capability Map Template](../04-artifact-templates/capability-map-template.md)
- [Epic Candidate Matrix Template](../04-artifact-templates/epic-candidate-matrix-template.md)
- [Discovery Readiness Gate Template](../04-artifact-templates/discovery-readiness-gate-template.md)
- [KDD Principles](https://github.com/Kaddo-kdd/kaddo) — external reference, not a dependency
