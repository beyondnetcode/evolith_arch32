# Agent Proposals

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

This directory holds **agent self-improvement proposals** — the durable output of the
Self-Improvement and Proactive Optimization Mandate defined in
[AGENTS.md §8](../AGENTS.md#8-self-improvement-and-proactive-optimization-mandate).

When any agent (`@winston`, `@architect`, `@po`, `@pm`, `@analyst`, `@devops`, `@dev`,
`@sm`, `@docs`, `@qa`, …) detects a signal worth acting on — a missing script, a rule
gap, a workflow friction, or an optimization — it files a proposal here rather than
acting silently. This keeps `.bmad-core/` as the **orchestration-only** home for agent
state and outputs, distinct from:

- `reference/core/foundations/agent-skills/` — the canonical agent **definitions** and skills.
- `.harness/agents/` — the operational agent **contracts**.

## Proposal Format

Each proposal is a Markdown file following the format in
[AGENTS.md §8.3](../AGENTS.md#83-proposal-format):

```markdown
## Proposal: <Title>
**Agent:** <Your Name>
**Trigger:** <What signal triggered this>
**Scope:** <Script / Rule / Workflow / Agent definition>
**Rationale:** <Why this matters>
**Implementation:** <Brief technical approach>
**Validation:** <How to verify it works>
```

## Relationship to the Gap Board

Proposals are **pre-triage**: a proposal that is accepted and has architectural
significance is promoted to a `GT-*` gap on the
[Gap Tracking Board](../../reference/core/control-center/gaps/gap-tracking.md), which
remains the single source of truth for tracked work. A proposal that is purely local
(a small script or rule tweak) can be implemented directly and referenced from its
commit.
