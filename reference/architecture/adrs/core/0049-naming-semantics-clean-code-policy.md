# [ADR 0049](0049-naming-semantics-clean-code-policy.md): Naming Semantics & Clean Code Policy (E2E and Global)

## 1. Metadata
* **ADR ID:** 0049
* **Title:** Naming Semantics and Clean Code Standards (E2E and Global)
* **Status:** Accepted (Proposed)
* **Authors:** Enterprise Architecture Office
* **Reviewers:** Corporate Architecture Board, CTO Office
* **Date:** 2026-05-13
* **Tags:** `Governance`, `Clean-Code`, `Naming-Conventions`, `Maintainability`, `E2E-Standards`
* **Related ADRs:**
  * [ADR-0002: Clean Hexagonal Architecture with NestJS](../nodejs/0002-clean-architecture-nestjs.md)
  * [ADR-0003: Strict TypeScript Standards](../nodejs/0003-strict-typescript-standards.md)

---

## Executive Summary
Code readability is the determining factor in the long-term evolution speed of a system. This ADR establishes a mandatory corporate policy on code naming semantics (E2E), ensuring that any developer or AI tool can understand code intent without ambiguity, drastically reducing cognitive technical debt across the entire monorepo.

---

## 2. Problem Context
The lack of a global, unified naming policy generates the following problems:
1. **High Cognitive Load:** Inconsistent names force developers to "decipher" code instead of reading it.
2. **E2E Collaboration Friction:** Different conventions between Frontend and Backend hinder data flow tracing.
3. **AI Tool Inefficiency:** Language models (LLMs) generate better suggestions and documentation when code follows clear semantic standards.
4. **Degraded Maintainability:** Generic names (e.g., `data`, `info`, `process`) hide logical errors and hinder refactoring.

---

## 3. Strategic Decision
Compliance with **Clean Code** standards is enforced for all naming and semantics in the E2E development lifecycle.

### 3.1. Technical Casing Conventions
- **`lowerCamelCase`**: Variables, object instances, functions, and interface members.
- **`PascalCase`**: Classes, interfaces, types, enums, and UI components.
- **`UPPER_SNAKE_CASE`**: Immutable global constants and environment variables.
- **`kebab-case`**: File names, CSS selectors, and API path segments.

### 3.2. Mandatory Semantic Rules
1. **Names That Reveal Intent:** The name must explain why it exists, what it does, and how it's used. If a name requires an explanatory comment, the name has failed.
2. **Verbs for Functions:** Every function or method must start with an action verb (e.g., `fetchUser`, `calculateTax`, `isPaymentValid`).
3. **Boolean Prefixes:** Mandatory use of interrogative/state prefixes: `is`, `has`, `can`, `should`, `did` (e.g., `isValid`, `hasPermission`).
4. **Avoid Abbreviations:** Prohibited use of non-standard abbreviations (use `request` instead of `req`, `index` instead of `i` — except in trivial loops).
5. **No Type Encoding (Anti-Hungarian):** Do not include the data type in the name (avoid `userArray`, use `users`; avoid `priceString`, use `formattedPrice`).

---

## 4. Enforcement Policy
This is a **Required Policy** and will be audited through:

1. **CI Quality Gates (ESLint):**
   - The `@typescript-eslint/naming-convention` plugin will be enabled with strict configuration.
   - Any casing or prefix violation will block deployment.
2. **Code Review (Peer Review):**
   - "Poor Semantics" is sufficient reason to reject a Pull Request.
3. **AI-Assisted Validation:**
   - Assistance tools (Copilot, Cursor, etc.) must be instructed via `.cursorrules` or equivalents to validate compliance with this ADR.
4. **Boy Scout Rule:**
   - Every developer who modifies a file is expected to refactor nearby inconsistent names to align with this standard.

---

## 5. Consequences

### Positives:
- **Self-Documenting Code:** Reduced need for extensive block comments.
- **E2E Interoperability:** Consistent models from DB to UI.
- **Faster Debugging:** Faster error location thanks to precise names.
- **AI Alignment:** Maximizes accuracy of code generation tools.

### Negatives:
- **Adaptation Curve:** Requires conscious discipline during the first weeks of adoption.
- **Verbose Code:** Some names may become longer (e.g., `remainingRetries` vs `retries`).

---

## 6. References
- *Clean Code: A Handbook of Agile Software Craftsmanship* (Robert C. Martin).
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html).
- [ADR-0003: Strict TypeScript Standards](../nodejs/0003-strict-typescript-standards.md)





## Objective and Scope

Historical backfill: Address the architectural tension where context is unavailable, establishing a standard boundary.

## Options Considered

- **Selected:** Naming Semantics & Clean Code Policy (E2E and Global)
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

None explicitly linked.

---
[Back to Index](./README.md)