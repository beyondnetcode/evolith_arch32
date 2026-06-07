# ADR 0070: Lean Root Repository Taxonomy

## Status

Accepted

## Date

2026-06-07

## Scope

Universal — All Evolith satellite repositories

> **Satellite origin:** Originally validated in UMS satellite (UMS ADR-0064). Promoted to Evolith corporate baseline.

---

## Context and Problem Statement

Enterprise monorepos frequently suffer from root directory bloat. Over time, test directories, scripts, configuration files, and scattered knowledge articles accumulate at the repository root. This creates:

- **Cognitive overload** for new engineers who cannot quickly identify the primary entry points.
- **Discoverability degradation** — documentation is pushed below the fold on version-control platforms, reducing its visibility.
- **Structural ambiguity** — technical and governance concerns intermingle at the top level, making the repository's purpose unclear.

Without an explicit root taxonomy standard, satellite repositories develop inconsistent structures that make cross-repository tooling, AI agent conventions, and onboarding more difficult.

---

## Decision

Adopt the **Lean Root** (also called Clean Root) architectural pattern for all Evolith satellite repositories, enforcing a strict binary dichotomy at the repository root.

### Binary Dichotomy

| Directory | Purpose | Contains |
|---|---|---|
| `src/` | Technical Engine | All runnable code, tests, load testing scripts, database migrations, CI/CD utility scripts, language-specific configurations |
| `docs/` | Knowledge Hub | All enterprise documentation, architectural blueprints, requirements, translated READMEs, ADRs specific to the satellite |

### Root-Level Exceptions

The following files are the **only** items permitted to remain at the repository root, in compliance with the BMAD methodology structural standards and version-control platform conventions:

| File | Justification |
|---|---|
| `README.md` | Platform-rendered entry point |
| `README.es.md` (or other locale variants) | Bilingual entry point |
| `AGENTS.md` | AI-agent instructions (BMAD requirement) |
| `CHANGELOG.md` | Standard open-source release history |
| `LICENSE` | Legal requirement |
| `MASTER_INDEX.md` | Optional cross-repository navigation |
| `.gitignore`, `.editorconfig`, `.markdownlint.json` | Tool configuration files with no valid subdirectory placement |
| Build and CI root config files | Only when the tool requires root placement and cannot be relocated |

Any directory or file not matching the above is an unauthorized root entry and must be relocated.

### Rules

1. All runnable code, tests, scripts, migrations, and runtime configuration files **must** reside within `src/` or its subdirectories.
2. All documentation, architectural blueprints, requirements, and governance artifacts **must** reside within `docs/` or its subdirectories.
3. No new top-level directories may be created without an architectural justification and update to the root taxonomy specification.
4. CI structural linters and AI agents must enforce this dichotomy by flagging any unauthorized top-level entry.

---

## Consequences

### Positive

- The root directory is immediately scannable. Engineers know exactly where to look for code (`src/`) versus documentation and theory (`docs/`).
- `README.md` and key navigation links are prominently displayed on version-control platforms without requiring scrolling past many folders.
- Structural clarity reinforces bounded context discipline not just in code, but in repository organization.
- AI coding agents can navigate the repository reliably with a consistent structural convention.

### Negative / Trade-offs

- Developers who previously ran scripts or tests from the root must update their working directory to `src/` or adjust command paths.
- Certain tool configuration files (e.g., `NuGet.Config`) must be explicitly targeted or rely on standard inheritance mechanisms from within `src/`.
- Initial migration of existing non-conforming repositories requires a one-time relocation effort.

---

## Compliance

Satellite repositories must:

1. Maintain the `src/` vs. `docs/` binary separation.
2. Restrict root-level entries to the approved whitelist.
3. Configure CI structural linters to reject unauthorized root entries on pull requests.
4. Update `AGENTS.md` to document the repository structure for AI coding agents.

---

## References

- [ADR-0048: Enterprise Taxonomy and Reference Layout](./0048-enterprise-taxonomy-reference-layout.md)
- [ADR-0049: Naming Semantics and Clean Code Policy](./0049-naming-semantics-clean-code-policy.md)

---
[Back to Index](./README.md)
