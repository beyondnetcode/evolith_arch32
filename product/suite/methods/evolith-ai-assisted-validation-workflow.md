# Evolith — AI-Assisted Product Validation Workflow

> **Bilingual Navigation:** [Versión en Español](./evolith-ai-assisted-validation-workflow.es.md)

**Status:** Active Strategic Workflow  
**Owner:** Evolith Architecture Board  
**Parent:** [Evolith Product Vision Master](../vision/evolith-product-vision-master.md)  
**Companion:** [Strategic Positioning and Comparative Landscape](../positioning/evolith-strategic-positioning-comparative-landscape.md)  
**Origin:** Investor feedback session, 2026-06-09  
**Created:** 2026-06-10  
**Last Updated:** 2026-06-10

---

## 1. Purpose

Use Evolith's existing documentation, product ideas, assumptions, and open questions as input to a rigorous AI-assisted validation process before committing to implementation.

This workflow is for discovery, challenge, comparison, and decision support. It must not allow an AI tool to modify the approved Product Vision or create binding Core decisions without human review.

---

## 2. Recommended Two-Track Workflow

### 2.1 Product Research Track — Claude Desktop, Chat, Research, or Cowork

Use the strongest generally available Claude model appropriate at execution time, with the highest justified reasoning effort. The investor specifically recommended Claude Opus 4.8 at maximum effort as of the feedback date.

Load a curated evidence pack containing:

- Product Vision Master;
- architectural directives and roadmap;
- Discovery Canvas, PRD, and product goals;
- comparative and market analyses;
- open gaps, risks, assumptions, and investor feedback;
- module documentation and relevant ADRs.

Ask the model to:

1. challenge the problem and target customer;
2. identify hidden assumptions and contradictions;
3. determine which capabilities can be adopted, integrated, extended, or built;
4. compare open-source, free-tier, and commercial alternatives;
5. identify the irreducible Evolith differentiator;
6. propose falsifiable experiments and the narrowest valuable product slice;
7. produce evidence, source links, uncertainty, and counterarguments.

Use standard Claude chat or Research for analysis. Use Cowork only when the task requires controlled work on local files, folders, documents, spreadsheets, or connected applications.

### 2.2 Engineering Challenge Track — Claude Code with Structured Skills

After the product hypothesis is reviewed, use Claude Code against a controlled repository branch. Do not begin with code generation.

Two recommended skill systems are:

- **Superpowers `brainstorming`**: Socratic refinement, alternatives, design approval, planning, TDD, implementation, and review.
- **gstack `/office-hours`**: product interrogation, premise challenge, reframing, alternatives, and a design document that feeds later planning and engineering reviews.

The preferred sequence is:

```text
Evidence Pack
    -> Product Research
    -> Human Review
    -> Brainstorming or Office Hours
    -> Product Decision Record
    -> Architecture and Engineering Review
    -> Approved Plan
    -> Controlled Implementation
    -> Evidence and Lessons Promoted to Evolith
```

---

## 3. Guardrails

- Treat AI output as analysis, not authority.
- Preserve links to sources and distinguish facts from inference.
- Never expose credentials, production secrets, or unrestricted customer data.
- Use a dedicated branch or worktree for repository actions.
- Require human approval before changing vision, rulesets, ADRs, or Phase Gates.
- Record rejected alternatives and unresolved uncertainty.
- Do not let the selected model or skill become a Core dependency.
- Revalidate model names, pricing, plans, and capabilities when the workflow is executed.

---

## 4. Required Outputs

Each validation cycle must produce:

| Output | Purpose |
|---|---|
| **Problem Reframing** | Restate the real customer problem and desired outcome |
| **Assumption Register** | List assumptions, confidence, evidence, and validation method |
| **Capability Disposition Matrix** | Classify capabilities as Adopt, Embed, Integrate, Extend, Build, or Reject |
| **Competitive Counterargument** | Explain how a composed tool stack could replace Evolith |
| **Differentiation Proof** | Identify what Evolith uniquely owns and how it will be measured |
| **Experiment Plan** | Define the smallest tests that can falsify or support the thesis |
| **Decision Record** | Capture the human-approved conclusion and next action |

---

## 5. Acceptance Criteria

The workflow succeeds only when:

- major assumptions have evidence or explicit experiments;
- existing tools are evaluated before native development;
- the recommended product slice is smaller and more testable than the original idea;
- risks and counterarguments remain visible;
- decisions are approved by accountable humans;
- any reusable lesson is proposed upstream according to Evolith governance.

---

## 6. Relationship and Navigation

- [Evolith Product Vision Master](../vision/evolith-product-vision-master.md)
- [Strategic Positioning and Comparative Landscape](../positioning/evolith-strategic-positioning-comparative-landscape.md)
- [Architectural Directives](../architecture/architectural-directives.md)
- [Evolutionary Strategy Roadmap](../strategy/evolutionary-strategy-roadmap.md)
- [Index of Vision](./README.md)

---

*This workflow turns investor advice into a repeatable validation mechanism while preserving Evolith's human governance and provider neutrality.*