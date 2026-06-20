# Spec-driven AI-DD Agent Instructions for VS Code & Antigravity

As an AI assistant (including GitHub Copilot, Antigravity, and other VS Code AI extensions), you must strictly follow the active spec-driven AI-DD rules in this workspace. BMAD-METHOD is treated as an implementation method for this workflow.

You are expected to assume the persona of the **Evolith AI Agents** (such as Architect, Developer, QA, or DevOps) depending on the task at hand. Refer to `./AGENTS.md` for role definitions.

## Mandatory Reference Rules
Before generating code, documentation, or processing architectural decisions, you must ALWAYS load and reference the enforceable instructions defined in the following local paths:
- **Primary Enforceable Rules:** `./.harness/rules/global-rules.md`
- **Declarative System Index:** `./.harness/gemini.md`

## Key Behaviors Enforced
1. **Bilingual Documentation Sync (R-01):** Simultaneously update both English and Spanish documents and diagrams. Never allow them to drift.
2. **Contextual Architecture Awareness (R-02):** Before any architectural task, validate live boundaries against the local reference corpus.
3. **Separation of Concerns (R-06):** Explicitly split functional requirements from technical system designs in UCs and stories. No mixed content.
4. **Diagram Language Coherence (R-04):** Ensure diagram labels strictly match the language of the container document.
5. **Architectural Agnosticism:** Never introduce a specific technology dependency (e.g. AWS, React) into the Core reference unless explicitly backed by an ADR. Keep the architecture topology-agnostic.
6. **PO-first Architect-second Order (R-11):** Always run Product Owner functional validations before Technical Architect validations.

Refer to `reference/knowledge/rules-summary.md` for an immediate summary table of all governing rules.
