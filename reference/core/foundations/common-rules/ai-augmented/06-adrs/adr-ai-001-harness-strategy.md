# ADR-AI-001: Harness Engineering as standard for development and agentic products

* **Status:** Proposed
* **Date:** 2026-05-11
* **Author:** AI Architect Agent

## Context
Current corporate architecture does not define standardized mechanisms regarding how development teams should incorporate Artificial Intelligence agents into their workflow or software products. Historically, each team has utilized fragmented approaches (such as simple prompt engineering) lacking reproducibility, verifiability, and security.

## Decision
We formally decide to adopt the discipline of **Harness Engineering** as the mandatory standard for any agentic initiative within the company. This implies that a solution's intelligence will not be evaluated solely by its prompt or the chosen model, but rather by the robustness of the surrounding environment defined under the 4 established pillars:
1. Documentation as Code (`AGENTS.md`).
2. Machine-readable Architectural Constraints.
3. Verification in sequential layers (Hooks -> Pre-commit -> CI).
4. Periodic harvesting of AI-generated technical debt.

## Alternatives Considered
* **Pure Prompt Engineering:** Discarded because it lacks deterministic error control and degrades rapidly at production scales.
* **Third-party Frameworks as Sole Standard:** Discarded (e.g., forcing only LangChain) due to high volatility in the current ecosystem; we prefer to standardize the harness strategy, not the specific tool.
* **No Standardization:** Discarded due to the high risk of incoherent technical debt and methodological fragmentation.

## Consequences
* **Positive:** Dramatic increase in agent success rates, auditability of agentic behavior, and reuse of corporate security patterns.
* **Negative:** Higher initial learning curve to configure hooks, and the requirement to maintain the `AGENTS.md` file manually.
* **Trade-off:** We sacrifice fleeting velocity ("Hacks") in favor of long-term stability.

## References
* Mitchell Hashimoto - Harness Engineering (Feb 2026)
* OpenAI - Harness Engineering with Codex (Feb 2026)
* Martin Fowler / Thoughtworks - Harness Engineering (Feb 2026)

---
[Back to Index](./README.md)
