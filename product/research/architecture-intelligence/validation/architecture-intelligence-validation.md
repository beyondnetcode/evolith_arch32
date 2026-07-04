# Architecture Intelligence Validation

> Validation checklist for Architecture Intelligence artifacts.

## Purpose

Ensure that curated architecture knowledge remains consistent with Evolith taxonomy, governance, and AI-readability expectations.

## Required Checks

Every Architecture Intelligence artifact must verify:

- Uses kebab-case file names.
- Lives under `product/research/architecture-intelligence/`.
- Has a clear title and purpose.
- Defines problem, context, solution, benefits, and tradeoffs.
- Defines Evolith position and adoption level when it is a pattern.
- Links to related ADRs when applicable.
- Does not promote external ideas as standards without ADR approval.
- Avoids product-specific mandates unless explicitly scoped.
- Keeps UMS as applied evidence, not universal authority.
- Uses relative links that resolve.
- Avoids duplicate or conflicting pattern names.
- Includes AI impact when relevant.

## AI Readiness Checks

AI-consumable artifacts must be:

- deterministic in structure
- concise but complete
- explicit about authority level
- linked to controlling ADRs or standards
- clear about assumptions and limitations

## Failure Conditions

An artifact should not be marked complete if:

- links are broken
- ADR references are missing
- taxonomy is violated
- a recommendation lacks tradeoff analysis
- external ideas are copied without contextualization
- the document confuses applied evidence with universal policy

## Recommended Review Roles

- Architect
- BMAD PO
- BMAD QA
- AI governance reviewer

---

[Back to Architecture Intelligence](../README.md)
