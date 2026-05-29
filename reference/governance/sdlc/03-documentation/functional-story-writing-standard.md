# Functional Story Writing Standard

> **Bilingual Navigation:** [Versión en Español](./functional-story-writing-standard.es.md)

This standard is mandatory for satellite repositories that create Functional Stories, Use Cases, PRD feature flows, or requirements under the progressive architecture reference and spec-driven AI-DD governance model.

The goal is simple: Product Owners and Business Analysts must be able to understand the business behavior without reading implementation detail, while Developers still receive precise technical constraints in the same artifact.

---

## 1. Mandatory Structure

Every Functional Story or equivalent functional requirement artifact MUST use this structure:

1. **Business Purpose**: what problem is solved and why it matters.
2. **Actors**: primary and secondary participants described by business responsibility.
3. **Business Preconditions**: business conditions required before the flow starts.
4. **Main Functional Flow**: user-facing business narrative.
5. **Alternative Flows and Exceptions**: business outcomes for rejection, duplication, invalid state, missing information, or unavailable service.
6. **Business Rules**: domain rules that a Product Owner can validate.
7. **Acceptance Criteria**: observable, testable outcomes for PO/QA.
8. **Technical Requirements**: implementation constraints for engineering.
9. **Traceability**: related ADRs, entities, technical enablers, APIs, integrations, events, or operational artifacts.

---

## 2. Functional Narrative Rules

Functional sections MUST be readable by a Product Owner or Business Analyst.

Functional sections MUST NOT lead with:

- API paths or HTTP methods,
- protocol names,
- database engine details,
- cache implementation details,
- payload examples,
- exception class names,
- framework/library names,
- infrastructure-specific behavior.

Those details belong in **Technical Requirements**.

---

## 3. Technical Requirements Rules

The Technical Requirements section SHOULD capture:

- APIs/endpoints,
- entities and tables,
- persistence, cache, and invalidation behavior,
- security controls,
- audit events,
- error codes,
- protocol or token requirements,
- integration contracts,
- constraints from ADRs or technical enablers.

This section exists so developers have precision without making the business flow harder to read.

---

## 4. Acceptance Criteria Rules

Acceptance criteria MUST be observable and business-validatable. They describe expected outcomes, not implementation steps.

Good:

- "The sponsor can see whether the request was approved or rejected."
- "The system prevents external users from receiving internal administrative profiles."

Avoid in functional criteria:

- "The API returns `403 Forbidden`."
- "Redis keys are evicted."
- "The database writes to `APPROVAL_REQUEST`."

Move those details to Technical Requirements.

---

## 5. Satellite Repository Compliance

Satellite repositories MAY extend this standard with domain-specific examples, but they MUST NOT remove the required structure or mix implementation details back into functional narrative sections.

Satellite repositories SHOULD reference this standard from their local functional story index or requirements portal.
