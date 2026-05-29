# Best Practices for SDLC Documentation

> **Bilingual Navigation:** [Versión en Español](./sdlc-documentation-best-practices.es.md)

This policy dictates how architectural and technical knowledge MUST mature alongside code deliverables across all lifecycle phases from MVP to production.

---

## 1. Key Objectives
To prevent "documentation rot" (stale information) and maintain a single, authoritative, version-controlled truth for the entire engineering ecosystem.

---

## 2. Strategic Core Standards

### A. Documentation as Code
Treat documentation exactly like production code. 
* Store narrative content as Markdown alongside application code.
* Use standard Git Version Control for auditing and diff history.
* Subject docs to code reviews (Pull Requests) to ensure factual accuracy.

### B. Synchronized Lifecycle & Versioning
Documents must mature exactly synchronously with functionality increments.
* **Rule:** No feature code should merge into stable branches without its delta documentation update.
* Documentation state MUST be mapped to Release Git Tags (e.g., v1.2.0 docs reflect exactly v1.2.0 software mechanics).

### C. Incremental Maturity (Evolution)
Do not aim for exhaustive detail on Day 1.
* **Phase 1 (MVP):** Maintain high-level, atomic READMEs that only block core engineering comprehension.
* **Phase 2+ (Scale):** Expand tutorials, deeper conceptual maps, and detailed failure-mode diagrams iteratively.

### D. Automation First (Auto-Gen)
Maximize non-human artifact updating to ensure reliability.
* Expose live API schemas directly from codebase metadata (Swagger/OpenAPI).
* Leverage Mermaid.js markup language for diagrams directly inside markdown to support visual tracking without binaries.

### E. Functional Story Readability
Functional requirements must be readable by Product Owners and Business Analysts before they are useful to engineering.
* Functional Stories MUST separate business purpose, actors, flows, business rules, and acceptance criteria from implementation detail.
* APIs, payloads, protocols, database, cache, security controls, and runtime constraints MUST be placed in a dedicated Technical Requirements section.
* See the mandatory [Functional Story Writing Standard](./functional-story-writing-standard.md).

---

## 3. Feedback & Clean-Up Lifecycle

1. **Continuous Feedback:** Every published page MUST invite corrections via simple ticket creation if details appear ambiguous.
2. **Obsolescence Audit:** During the sunsetting or deprecation of any microservice or feature, an explicit sub-task MUST trigger the deletion of expired documentation to clear ambient noise.

---

## 4. Professional Formatting Standard
All documentation must adhere to enterprise-grade professional standards:
* **No Emojis:** Completely avoid emojis in titles, headings, and body text.
* **No UTF-8 Icons:** Avoid decorative UTF-8 icons or non-standard characters.
* **Structural Priority:** Prioritize plain text, standard Markdown headings, clean tables, and simple lists.
* **Technical Nomenclature:** Maintain consistent and professional technical terminology across all languages.

---
[Back to Index](./README.md)
