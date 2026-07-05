# Content Management Abstraction — Headless CMS as a Time-to-Market Accelerator

> **Bilingual Navigation:** [Versión en Español](./content-management-abstraction.es.md)
>
> **Evolith Classification:** Optional / conditional best practice
>
> **Owner:** Evolith Architecture Board
>
> **Status:** Active reference
>
> **Parent:** [Corporate Standards Center](../README.md)

---

## Purpose

Content Management Abstraction defines an optional capability for separating manageable content from the transactional domain of a system. Its purpose is to improve productivity, business autonomy, and Time to Market without contaminating the business core with editorial dependencies or concrete tools.

This practice allows texts, banners, FAQs, pages, institutional content, multilingual content, and business-editable material to evolve without requiring a full development, testing, and deployment cycle for the core system.

---

## Guiding Principle

> Not every change should become software development.

Evolith recommends explicitly separating:

| Responsibility type | Recommended owner |
|---|---|
| Editable content | Content Management Abstraction / Headless CMS |
| Business rules | Core domain services |
| Transactional processes | Application / responsible bounded context |
| Sensitive technical parameters | Secure configuration / secrets / platform services |
| Core workflow states | Transactional domain |

The CMS manages content. The business core manages business rules.

---

## Scope

This practice applies when a solution needs to reduce operational friction associated with editorial or non-transactional content changes.

### Recommended Use Cases

| Use case | Recommendation |
|---|---|
| Business-editable screen texts | Use CMA |
| Banners and informational campaigns | Use CMA |
| FAQs and self-service content | Use CMA |
| Institutional pages or landing pages | Use CMA |
| Multilingual content | Evaluate CMA |
| Non-transactional editorial catalogs | Evaluate CMA |
| Versionable legal or informational content | Evaluate CMA with approval workflow |

### Out of Scope

| Case | Evolith decision |
|---|---|
| Critical business rules | Do not use CMS as the system of record |
| Transactional pricing | Keep in the core domain |
| Workflow states | Keep in the core domain |
| Customer, user, or tenant data | Keep in authorized services |
| Sensitive technical parameters | Keep in platform / secure configuration |
| Regulated or highly sensitive data | Requires formal security and compliance review |

---

## Possible Implementations

Content Management Abstraction does not prescribe a mandatory tool. The capability may be implemented through:

| Implementation type | When to consider it |
|---|---|
| Open source Headless CMS | When speed, self-hosting, and extensibility are required |
| Enterprise Headless CMS | When SLA, support, advanced workflows, or compliance are required |
| Internal CMS | When the editorial domain has organization-specific rules |
| Git-based content | When content must be versioned as code |
| Custom parameter/content service | When content mixes with non-sensitive configuration and requires controlled APIs |

### Initial Recommended Implementation

The default recommended implementation for initial evaluation is **Strapi Community Edition**, because it is an open source, self-hosted, and extensible option for modeling content and exposing it through APIs.

This recommendation does not make Strapi a mandatory Evolith dependency. Every adoption must be validated through architectural fit, security, support, operations, and licensing criteria.

---

## Reference Model

```text
Business Users / Product / Marketing
        |
        v
Content Management Abstraction
        |
        +--> Headless CMS API
        +--> Git-based content
        +--> Internal content service
        |
        v
Frontend / Portal / Mobile / BFF
        |
        v
Core Business APIs
```

The frontend or BFF may consume content from the CMA capability, while transactional operations continue to be served by the system's core services.

---

## Decision Criteria

Content Management Abstraction should be evaluated when one or more of these conditions apply:

- Content changes frequently.
- Business needs to publish or modify content without waiting for technical releases.
- The engineering team is repeatedly spending effort on simple editorial changes.
- Multilingual or channel-specific content variants are required.
- The portal needs manageable FAQs, informational pages, banners, or legal texts.
- The product aims to reduce lead time for non-transactional changes.

It must not be adopted when the real problem is a business rule, a transactional process, a sensitive parameter, or a master data requirement.

---

## Governance Rules

CMA adoption is optional, but becomes **conditionally governed by ADR** when it impacts any of the following aspects:

- Technology selection.
- Security, authentication, or authorization.
- Multi-tenant model.
- Public or internal API contracts.
- Persistence or asset storage.
- Deployment topology.
- Observability and operations.
- Cross-system integration.

When applicable, the ADR must state:

1. Why a CMA capability is required.
2. Which content is inside and outside the CMS.
3. Which tool is selected and why.
4. How permissions, environments, and data are protected.
5. How content types, migrations, and assets are versioned.
6. How the integration is tested.
7. How the solution is operated, monitored, and backed up.

---

## Expected Productivity Impact

| Dimension | Expected impact |
|---|---|
| Time to Market | Reduces editorial changes from release cycles to content publishing cycles |
| Business autonomy | Allows authorized users to manage content without engineering dependency |
| Engineering focus | Frees technical capacity for core capabilities |
| Operational risk | Reduces redeployments caused by minor changes |
| Consistency | Centralizes reusable content across channels |
| Organizational scalability | Separates editorial governance from transactional governance |

---

## Recommended Quality Gates

Before promoting a CMA integration to production, at least the following must be validated:

- Authentication and authorization for the administrative console.
- Environment separation: development, staging, and production.
- Secure environment variable and secret management.
- Database and asset backup and restore.
- Content model migration/versioning strategy.
- Consumption tests from frontend, mobile, or BFF.
- Editorial permission tests.
- Error handling when the CMS is unavailable.
- Caching and content expiration when applicable.
- Minimum observability for availability, latency, and errors.
- Licensing, support, and operations review.

---

## Relationship with SDLC Artifacts

| Artifact | Expected use |
|---|---|
| PRD | Declare the need for business-editable content |
| Functional Story | Describe content administration, publishing, and consumption flows |
| ADR | Justify tool selection and architectural boundaries |
| Technical Story | Define integration, security, deployment, and tests |
| Test Summary Report | Evidence integration, permission, caching, and resilience tests |
| Release Notes | Document content type, endpoint, asset, and operational changes |

---

## Evolith Decision

Content Management Abstraction is an optional practice for accelerating delivery of non-transactional content without degrading the core architecture.

Strapi Community Edition is the recommended option for initial evaluation, but Evolith keeps the abstraction as a portable capability. The concrete tool must remain behind clear contracts, responsibility boundaries, and documented decisions.

---

[Back to Engineering Index](./README.md)
