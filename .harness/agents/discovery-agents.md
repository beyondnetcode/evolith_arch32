# Intake and Discovery Agents (Phases 00 and 01.1)

> **Bilingual Navigation:** [Versión en Español](./discovery-agents.es.md)

The following agents support the Architecture Planning Gate (Phase 00). Each agent follows the Agent Update Quality rule: scope, inputs, outputs, constraints, handoff, validation checklist, and audit output format.

| Agent | Scope | Inputs | Outputs | Handoff To |
|-------|-------|--------|---------|------------|
| **Architecture Plan Interpreter** | Analyze raw requirements to generate an Architecture Plan for Gate 0 evaluation | Raw business requirement prompt, ADRs, blueprints | Architecture Plan Draft (JSON/YAML) | OPA Evaluation Engine / Human Approver |
| **Business Discovery Agent** | Extract problem statement, value proposition, and business context from stakeholders or prompts | Business trigger, stakeholder interviews, market context | Discovery Knowledge Brief (draft) | Product Framing Agent |
| **Product Framing Agent** | Structure domain context, identify actors, and define scope boundaries | Knowledge Brief, domain knowledge, product vision | Knowledge Brief (validated), Capability Map (seed) | Capability Modeling Agent |
| **Capability Modeling Agent** | Decompose domain into capabilities with priority and dependencies | Validated Knowledge Brief, domain model, stakeholder priorities | Capability Map | Epic Discovery Agent |
| **Epic Discovery Agent** | Map capabilities to epic candidates with MoSCoW priority and size estimation | Capability Map, business priorities, technical constraints | Epic Candidate Matrix | Story Slicing Agent |
| **Story Slicing Agent** | Create minimal story seeds from epic candidates with acceptance criteria drafts | Epic Candidate Matrix, user roles, behavioral expectations | Story Seed Bank | Acceptance Criteria Agent |
| **Acceptance Criteria Agent** | Validate and refine acceptance criteria for story seeds, ensure testability | Story Seed Bank, domain rules, quality standards | Story Seed Bank (refined) | Architecture Discovery Agent |
| **Architecture Discovery Agent** | Identify technical constraints, ADR candidates, spikes, and enablers | Knowledge Brief, Capability Map, technical context | Architecture constraints section, Decision Candidates | Discovery Gate Agent |
| **Discovery Gate Agent** | Validate knowledge sufficiency against adoption level requirements | All 01.1 artifacts, adoption level, quality checklist | Discovery Readiness Gate (PASS/CONDITIONAL/FAIL) | Next phase (Ballpark / Backlog / Design) |
| **Knowledge Drift Agent** | Detect when code changes occur without corresponding knowledge updates | git diff, knowledge artifact ownership globs, Discovery Context Pack | Drift signals (FYI, not blocking) | Current phase owner |

**Common constraints for all Discovery Agents:**
- Must not create epics, stories, or backlog items — only knowledge artifacts
- Must maintain traceability IDs across all outputs
- Must produce bilingual outputs when repository requires it
- Must not introduce vendor or framework dependencies
- Must declare adoption level in all artifacts
