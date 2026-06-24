# Contributing to Evolith Core

Welcome to **Evolith Core**! We are thrilled that you're interested in contributing. 

Evolith is not a conventional application starter template. It is an **executable architectural governance framework** — a living, breathing set of technical laws, ADRs, OPA policies, and AI agent definitions that act as the enterprise reference for satellite products.

To ensure everything flows smoothly, please take a moment to review our unique contribution model.

## 1. The BMAD Method & AI Agents

We strictly use the **BMAD Method** (Specification-driven AI-Driven Development) for the core repository. This means you do not have to code or write documentation alone. You can (and should) invoke our specialized AI agents in your IDE or prompts to assist you:

- **Winston (Principal Architect):** Use for architectural audits and to track gaps.
- **Architect Agent:** Assists in defining Data Mesh contracts, Event-Driven patterns, and drafting Architecture Decision Records (ADRs).
- **Developer Agent:** Helps implement secure patterns (OWASP) and progressive architecture patterns.
- **QA Agent:** Assists in contract testing and Rego policy validation.
- **DevOps Agent:** Helps orchestrate distributed deployments and GitHub Actions.
- **Docs Agent:** Manages translation and markdown validations.

*For detailed orientation, see our [Quick Start Guide](./reference/governance/standards/onboarding/product-quick-start.md).*

## 2. The Golden Rules of Evolith

Before you submit a Pull Request, you must adhere to these absolute rules:

### A. Mandatory Bilingual Parity
Evolith operates globally. **Every single documentation file must have an English (`.md`) and a Spanish (`.es.md`) version.** They must be structurally identical (same number of `##` and `###` headers). The Docs Agent can assist you with this translation.

### B. Architectural Agnosticism
Unless you are editing a specific *Authoritative Tech Stack Profile*, keep the reference agnostic. Do not assume a specific runtime, framework, or cloud provider in the core standards without an accepted ADR.

### C. Validation Quality Gates
You must validate your work locally. Our `.husky/pre-commit` hooks will automatically check your work, but you should run these scripts manually before committing:

```bash
# Validate all Markdown links, anchors, and Mermaid diagrams
node .harness/scripts/ci/01-validate-docs.mjs

# Verify bilingual structural parity
node .harness/scripts/ci/04-check-bilingual-parity.mjs
```

If these scripts fail, the CI pipeline will block your PR.

## 3. Pull Request Process

1. **Branching:** Follow [ADR-0050](./reference/architecture/adrs/core/0050-gitflow-branching-strategy.md). Prefix your branches correctly (e.g., `feature/`, `docs/`, `fix/`).
2. **ADR Updates:** If your PR introduces an architectural change or a new tool, it *must* be accompanied by an update to an existing ADR or a new ADR following [ADR-0068](./reference/architecture/adrs/core/0068-documentation-release-gitflow.md).
3. **Commit Messages:** We use semantic versioning and release-please. Your commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification (e.g., `feat:`, `docs:`, `fix:`).
4. **Code Review:** All PRs require review. Our automated workflows will also post coverage impact and structural validation results on your PR.

## 4. Setting up your Local Environment

Since Evolith relies on validation scripts and OPA rulesets:

1. Clone the repo: `git clone https://github.com/beyondnetcode/evolith_arch32.git`
2. Install dependencies: `npm install`
3. Make your changes and invoke your AI agents.
4. Run validations: `npm run validate` (or run scripts directly).

Thank you for helping us evolve the core!
