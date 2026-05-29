# Replicating This BMAD Adoption — Setup Guide

> **This guide explains how to replicate the way this repository adopted BMAD-METHOD.**
> It is not an installation guide for BMAD-METHOD itself.
>
> To understand BMAD-METHOD as a framework, start with the official source:
> [github.com/bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)

This guide describes how to set up the same combination used in this repository: BMAD-METHOD agent team + local harness governance layer (18 rules + 4 governance agents + validation script). You do not need to clone or depend on this repository — copy the configuration described here, adapt what is specific to your context, and you have an equivalent working setup.

---

## What You Are Setting Up

| Component | Files | Purpose |
| :--- | :--- | :--- |
| BMAD Team Agents | `.bmad-core/agents/*.md` | Role-based AI personas for feature delivery |
| Harness Governance Agents | `.harness/agents/agent-specs.md` | On-demand document and architecture governance |
| Harness Rules | `.harness/rules/global-rules.md` | 18 binding directives enforced across all agents |
| Playbooks | `.harness/playbooks/*.md` | Operational checklists for recurring governance tasks |
| Validation Script | `.harness/scripts/validate-docs.mjs` | Automated UTF-8, link, and Mermaid validation |
| AGENTS.md | `AGENTS.md` | Top-level file that activates the framework for AI tools |
| Workflow | `.bmad-core/workflows/development.yaml` | Sequential greenfield development workflow |

---

## Step 1 — Directory Structure

Create the following directories in your repository root:

```bash
mkdir -p .bmad-core/agents
mkdir -p .bmad-core/workflows
mkdir -p .harness/agents
mkdir -p .harness/rules
mkdir -p .harness/playbooks
mkdir -p .harness/scripts
mkdir -p .harness/templates
```

---

## Step 2 — Copy the BMAD Team Agent Files

Create one file per agent in `.bmad-core/agents/`. The content for each is the Portable Persona block from the [Agents Catalog](./agents-catalog.md).

**File names:**
```
.bmad-core/agents/analyst.md
.bmad-core/agents/pm.md
.bmad-core/agents/architect.md
.bmad-core/agents/sm.md
.bmad-core/agents/dev.md
.bmad-core/agents/qa.md
```

**Adaptation required:** In the Developer and Architect agent personas, replace technology names with your actual stack. For example, if your stack is .NET instead of Node.js/NestJS, replace NestJS references with ASP.NET Core, TypeORM with Entity Framework, etc. Keep the structural constraints (hexagonal boundaries, OWASP compliance, Clean Architecture layers) — these are stack-agnostic.

---

## Step 3 — Copy the Harness Governance Agents

Create `.harness/agents/agent-specs.md` with the following content. Adapt scope descriptions to your project's specific concerns:

```markdown
# Agent Personas Specification

## @po (Product Owner)
- **Scope**: Business logic, functional stories, OKRs, readability.
- **Directives**: No implementation jargon. Prioritize user experience and business outcome.

## @architect (Software Architect)
- **Scope**: Tech stack, system design, diagrams (C4, ERD, sequence), ADRs.
- **Directives**: Enforce hexagonal boundaries, RLS enforcement, port portability, stack coherence.

## @analyst (Business Analyst)
- **Scope**: Document sync, backlog hygiene, use case taxonomies.
- **Directives**: Ensure 100% bilingual equivalence and precise cross-references.

## @devops (DevSecOps Engineer)
- **Scope**: Docker configs, CI/CD pipelines, security scanning, harness governance.
- **Directives**: Enforce security standards, UTF-8 sanitization, and token economy.
```

**Adaptation required:** Replace `@analyst`'s bilingual directive with whatever document-consistency concern applies to your team. If your team is monolingual, repurpose `@analyst` for documentation version sync, changelog maintenance, or cross-reference integrity instead.

---

## Step 4 — Copy the Rules File

Create `.harness/rules/global-rules.md` with the rules table from the [Rules Reference](./rules-reference.md#portable-rules-block). This is the single source of truth for all binding directives.

**Adaptation required:**
- R-01 (Bilingual Sync): Adjust to your documentation language strategy.
- R-02 (Context Authority): Replace the reference to "authoritative context source" with the specific files in your repository that serve this role (e.g., your `DECISIONS.md`, your approved stack document).
- R-05 (Tech Stack): Point to your own approved tech stack document.
- R-14 (Runtime Authority): Point to your own runtime profile documents.
- Rules R-15, R-16, R-17, R-18 can be removed if multi-tenancy, catalog entities, modular extraction, or hybrid API are not concerns for your product.

---

## Step 5 — Copy the Playbooks

Create one file per playbook in `.harness/playbooks/`. Adapt trigger conditions and mandatory checks to your workflow.

**Minimum recommended playbooks:**

**`.harness/playbooks/document-governance-playbook.md`**
```markdown
# Document Governance Playbook

## Use When
- reviewing requirements
- updating functional stories
- editing ADRs or blueprints
- validating documentation sync

## Mandatory Checks
1. Functional content is readable to Product Owners and Business Analysts.
2. Technical detail is isolated in a dedicated Technical Requirements section.
3. Document language variants stay synchronized.
4. Diagram labels match document language.
5. Runtime-specific claims point to the correct authoritative profile.

## Audit Output Format
- artifact
- location
- issue type
- severity
- recommended correction
```

**`.harness/playbooks/api-governance-playbook.md`**
```markdown
# API Governance Playbook

## Use When
- reviewing backend contracts
- designing REST endpoints
- validating query handlers or repositories

## Mandatory Checks
1. Command and query responsibilities are explicit.
2. Pagination, filtering, sorting are centralized.
3. Error mapping stays structured and predictable.
4. Multi-tenancy keeps primary application-layer filtering.

## Architectural Goal
The API remains maintainable as a modular monolith today and extractable tomorrow.
```

---

## Step 6 — Copy the Validation Script

Copy `.harness/scripts/validate-docs.mjs` from this repository to your `.harness/scripts/` directory. The script validates:
- UTF-8 encoding (no encoding artifacts in range U+2600–U+27BF)
- Relative links resolve to existing files
- Mermaid code blocks have valid syntax markers

Run it locally to verify your documentation:
```bash
node .harness/scripts/validate-docs.mjs
```

**Adaptation required:** The script scans `**/*.md` from the repository root by default. If your documentation lives in a different directory structure, adjust the glob pattern in the script's configuration section.

---

## Step 7 — Create AGENTS.md

`AGENTS.md` is the top-level file that activates the framework for AI tools (Claude Code, Cursor, GitHub Copilot, etc.). It tells the AI tool what agents exist, what rules apply, and how to behave in this repository.

Create `AGENTS.md` at your repository root with the following structure:

```markdown
# AGENTS.md — [Your Repository Name]

## Project Overview
[Brief description of what this repository is and does]

## Build and Run
[Commands to install dependencies, start the project, run tests]

## Agent Team

### BMAD Team Agents (Sequential Workflow)
Invoke by role for spec-driven feature delivery:
- **analyst**: Requirements analysis and functional specification
- **pm**: PRD creation and backlog management
- **architect**: Technical architecture and ADR authoring
- **sm**: Task breakdown and sprint planning
- **dev**: Implementation (backend + frontend)
- **qa**: Testing, security audit, release verification

Agent personas: `.bmad-core/agents/`

### Harness Governance Agents (On-Demand)
Invoke by tag for document and architecture governance:
- **@po**: Functional story readability and business narrative
- **@architect**: ADR review, diagram audit, stack validation
- **@analyst**: Document sync and cross-reference integrity
- **@devops**: Infrastructure, CI/CD, harness health

Agent specs: `.harness/agents/agent-specs.md`

## Binding Rules
All agents operate under 18 binding rules. Full reference: `.harness/rules/global-rules.md`

Key rules always active:
- R-01: Document variants stay synchronized
- R-03: Pure UTF-8 output only
- R-04: Diagram labels match document language (code identifiers exempt)
- R-10: Audit output format: [Document, Location, Issue Type, Severity, Fix]

## Conventions
[Your naming conventions, ADR format, directory taxonomy]

## Out of Bounds
- Never commit secrets, tokens, or credentials
- Never modify files outside the scope of the current task
- Never skip the validation script before committing documentation changes
```

---

## Step 8 — CI Integration

Add documentation validation as a blocking CI step:

**GitHub Actions:**
```yaml
# .github/workflows/docs-validation.yml
name: Documentation Validation
on: [push, pull_request]

jobs:
  validate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Validate documentation
        run: node .harness/scripts/validate-docs.mjs
```

**GitLab CI:**
```yaml
validate-docs:
  stage: validate
  image: node:20
  script:
    - node .harness/scripts/validate-docs.mjs
  rules:
    - if: $CI_PIPELINE_SOURCE == "push"
```

---

## Step 9 — Workflow File

Create `.bmad-core/workflows/development.yaml` to define the canonical greenfield development workflow. Adapt the deliverable paths to your repository structure:

```yaml
name: Greenfield Development Workflow
description: End-to-end spec-driven development loop for new features.
version: 1.0.0

steps:
  - id: analysis
    agent: analyst
    action: Analyze requirements and produce functional specification.
    deliverable: ".bmad-core/deliverables/functional-spec.md"

  - id: product-definition
    agent: pm
    action: Refine functional specs into a PRD with UX definitions.
    deliverable: ".bmad-core/deliverables/prd.md"
    dependsOn: [analysis]

  - id: architectural-design
    agent: architect
    action: Define architecture, DB schemas, and security parameters.
    deliverable: ".bmad-core/deliverables/technical-architecture.md"
    dependsOn: [product-definition]

  - id: task-breakdown
    agent: sm
    action: Create backlog stories and Definition of Done templates.
    deliverable: ".bmad-core/backlog/tasks.json"
    dependsOn: [architectural-design]

  - id: implementation
    agent: dev
    action: Implement backend and frontend. Ensure OWASP security.
    deliverable: "src/"
    dependsOn: [task-breakdown]

  - id: verification
    agent: qa
    action: Run tests, security audits, and produce QA report.
    deliverable: ".bmad-core/deliverables/qa-report.md"
    dependsOn: [implementation]
```

---

## Minimal Adoption Option

If you want to adopt only the governance layer without the full BMAD team workflow, the minimum viable setup is:

| File | Why it matters |
| :--- | :--- |
| `.harness/agents/agent-specs.md` | Defines @po, @architect, @analyst, @devops |
| `.harness/rules/global-rules.md` | The 18 binding rules |
| `.harness/scripts/validate-docs.mjs` | Automated enforcement |
| `AGENTS.md` | Activates the framework for AI tools |
| CI step | Makes R-03 and link validation non-negotiable |

This gives you governed AI-assisted document review and architectural auditing without committing to the full spec-driven delivery workflow.

---

## Adaptation Checklist

Before your first commit with the framework active, verify:

- [ ] All technology names in agent personas match your actual stack
- [ ] R-02 points to your actual authoritative context sources
- [ ] R-05 and R-14 point to your actual tech stack and runtime profile documents
- [ ] `AGENTS.md` describes your actual project, not this base repository
- [ ] Validation script passes on your existing documentation (`node .harness/scripts/validate-docs.mjs`)
- [ ] CI step is configured and blocking

---

## Related Documents

- [Agents Catalog](./agents-catalog.md) — Full portable persona specifications
- [Rules Reference](./rules-reference.md) — Detailed rule rationale and examples
- [BMAD-METHOD Overview](./README.md) — Framework architecture and two-layer model

---

[Back to BMAD-METHOD Overview](./README.md)
