# Convention over Configuration — Evolith Design Standard for Configurable Systems

> **Bilingual Navigation:** [Versión en Español](./convention-over-configuration.es.md)
>
> **Evolith Classification:** Mandatory standard for child-system design, parameterization, and configuration
>
> **Owner:** Evolith Architecture Board
>
> **Status:** Active reference
>
> **Parent:** [Corporate Standards Center](../README.md)

---

## Purpose

Convention over Configuration establishes that systems built on Evolith must operate first through clear, inheritable, and documented conventions, and only require parameterization or explicit configuration when a real need for variation exists.

Evolith can enable highly dynamic, multi-tenant, and configurable systems, but it must not encourage overconfiguration, duplicated parameters, magic strings, hidden hardcodes, or behaviors that are difficult to audit.

---

## Guiding Principle

> Convention first, then parameterization, and explicit configuration last.

If an approved Evolith convention exists, the child system must use it as the default behavior without requiring additional configuration.

Parameterization is allowed when behavior must vary by tenant, system, module, profile, business context, functional policy, output format, security rule, or external integration.

Explicit configuration must be exceptional and exist only when a convention or parameter is insufficient.

---

## Resolution Model

```text
Behavior request
        |
        v
Does valid explicit configuration exist?
        |
        +-- Yes --> Use explicit configuration
        |
        No
        v
Does a tenant parameter exist?
        |
        +-- Yes --> Use tenant parameter
        |
        No
        v
Does a system parameter exist?
        |
        +-- Yes --> Use system parameter
        |
        No
        v
Does a global parameter exist?
        |
        +-- Yes --> Use global parameter
        |
        No
        v
Does an Evolith convention exist?
        |
        +-- Yes --> Use Evolith convention
        |
        No
        v
Documented technical default value
```

---

## Precedence Rules

Behavior resolution must follow this order:

| Priority | Source | When it applies |
|---|---|---|
| 1 | Specific explicit configuration | When a punctual override exists, is allowed, documented, and auditable |
| 2 | Tenant parameterization | When behavior varies for a specific tenant |
| 3 | System parameterization | When behavior varies for a specific registered system |
| 4 | Global parameter | When the organization needs to change the convention for the full ecosystem or product |
| 5 | Evolith convention | Standard behavior inherited by default |
| 6 | Technical default value | Last resort, only when justified and documented |

Magic values, hardcodes, or hidden behaviors must not replace conventions or parameters.

---

## Model Layers

### 1. Evolith Convention

Defines the recommended base behavior. Applies by default to all child systems, reduces repetitive configuration, and enables standardization.

Examples:

- Standard module structure.
- Domain resource names.
- Base actions.
- Standard entity states.
- Default audit policy.
- API conventions.
- UI/UX conventions.
- Documentation conventions.
- Testing conventions.
- Formal seed conventions.

### 2. Global Parameter

Overrides a convention across the ecosystem, product, or platform when a justified corporate or technical decision exists.

It must be versioned, auditable, and documented.

### 3. System Parameterization

Overrides a convention for a specific registered system.

It must be used when a child system needs to vary a policy or behavior without affecting other systems.

### 4. Tenant Parameterization

Overrides a convention for a specific tenant.

It must be used when a tenant requires functional, visual, operational, or security personalization allowed by the product model.

### 5. Explicit Configuration

Defines a concrete override not covered by convention or standard parameters.

It must be exceptional, justified, and have an accountable owner.

---

## When to Create a Parameter

Create a parameter only when at least one condition applies:

- Behavior varies by tenant.
- Behavior varies by system.
- Behavior varies by corporate policy.
- Behavior requires administration from UI.
- Behavior must be audited.
- Behavior must become part of the auth graph.
- Behavior must vary between customers or contexts.
- Behavior affects security, visibility, format, activation, or integration.

Do not create parameters for values that are stable, technical, universal, or intrinsic framework conventions.

---

## When to Keep a Convention

Keep a convention when:

- Behavior is universal for child systems.
- Variation does not add real value.
- Configuration would create duplication or operational noise.
- The value can be derived from naming, metadata, structure, or taxonomy.
- Behavior is part of Evolith's technical identity.
- The team does not need to modify it from UI or per tenant.
- The change would require an ADR or architectural decision, not operational parameterization.

---

## Decision Matrix

| Element | Current behavior | Should be convention | Should be parameter | Recommended scope | Justification | Action |
|---|---|---:|---:|---|---|---|
| Standard module structure | May vary by implementation | Yes | No | Evolith | Reduces divergence between child systems | Document base convention |
| Domain resource naming | Often manual | Yes | No | Evolith | Improves consistency, search, and traceability | Formalize naming rules |
| Base CRUD / domain actions | May be duplicated per system | Yes | Conditional | Evolith / System | Base actions are standard; extensions may vary by system | Define base actions and extension policy |
| Default auth graph format | May be implemented ad hoc | Yes | Conditional | Evolith / System | Base format must exist; variations require justification | Document base format and allowed extensions |
| Default audit policy | May be configured repeatedly | Yes | Yes | Global / Tenant | Base audit must exist; intensity may vary | Base convention + auditable parameters |
| Standard entity states | May be locally coded | Yes | No | Evolith | Avoids divergent states and hardcodes | Create standard catalog |
| Activation / deactivation / suspension / soft delete | May vary without control | Yes | Conditional | Evolith / System / Tenant | Standard base with justified exceptions | Define standard transition and allowed overrides |
| New tenants | May require manual configuration | Yes | Yes | Global / Tenant | Must inherit defaults and allow personalization | Create initialization template |
| UMS base menus | May be hardcoded | Yes | Yes | System / Tenant | Common base with tenant personalization | Define convention + UI parameters |
| Base permission templates | May be duplicated by customer | Yes | Yes | Evolith / System / Tenant | Standard base with controlled variants | Create template catalog |
| Base profile rules | May vary without traceability | Yes | Yes | System / Tenant | Requires security governance | Document defaults and overrides |
| UI/UX conventions | May fragment | Yes | Conditional | Evolith / System | Common visual and interaction baseline | Document tokens and patterns |
| API conventions | May vary by team | Yes | No | Evolith | Must be uniform | Reference API standard |
| Documentation conventions | May be omitted | Yes | No | Evolith | Required for traceability | Integrate with SDLC documentation |
| Testing conventions | May vary by module | Yes | Conditional | Evolith / System | Common baseline with criticality adjustments | Integrate with quality gates |
| Formal seeds | May be hidden or hardcoded | Yes | Yes | Evolith / System / Tenant | Base seeds must be reproducible; variable data must be parameterized | Create formal seed rule |

---

## Proposed Evolith Conventions

Child systems must inherit at least:

- Base module structure.
- Naming conventions for domains, resources, endpoints, permissions, and events.
- Base entity states.
- Base operation actions.
- Default audit policy.
- Default soft delete rule.
- New tenant base template.
- Base permission and profile templates.
- API conventions.
- UI/UX conventions when the system has an interface.
- SDLC documentation conventions.
- Unit, integration, and E2E testing conventions.
- Formal and reproducible seed conventions.

---

## Parameters That Should Exist

Parameters should exist when they control real variations such as:

- Tenant policies.
- System policies.
- Capability activation/deactivation.
- Output formats.
- Menu or module visibility.
- Profile or permission variants.
- Adjustable security rules.
- External integrations.
- Audited functional configuration.
- Tenant onboarding defaults when administrable.

---

## Unnecessary Configurations to Remove

Remove or migrate to convention when they:

- Repeat the same value across all tenants.
- Repeat the same value across all systems.
- Represent universal naming, structure, or behavior.
- Are technical values never administered from UI.
- Were created only to avoid documenting a convention.
- Duplicate a behavior already defined by an Evolith standard.

---

## Hardcodes to Convert into Documented Conventions

Convert to convention when the value is stable and universal:

- Base module names.
- Base actions.
- Standard states.
- Resource prefixes or suffixes.
- Base naming rules.
- Base seed structure.
- Internal routes derivable by convention.
- Base documentation or testing formats.

---

## Hardcodes to Convert into Parameters

Convert to parameter when the value changes by context:

- Tenant rules.
- System rules.
- Business-visible administrable text.
- Variable security policies.
- Menu visibility by customer.
- External integrations.
- Output formats by customer.
- Configurable operational limits.
- Permission or profile templates that vary by tenant.

---

## Rules for Child Systems

Every child system based on Evolith must:

- Inherit base conventions.
- Document which conventions it adopts unchanged.
- Document which conventions it overrides.
- Justify every override.
- Register parameters only when a real need for variation exists.
- Avoid magic strings, hardcodes, and duplicated configuration.
- Maintain traceability between convention, parameter, and final behavior.
- Run overconfiguration reviews during design and validation.

---

## Impact on UMS

UMS must treat this standard as an applied reference for:

- New tenants.
- Base menus.
- Permission templates.
- Profile rules.
- Auth graph.
- Global parameters.
- System parameters.
- Tenant parameters.
- Formal seeds.
- Administrable functional configuration.

The UMS implementation must avoid making every behavior parameterizable by default. It must first identify the base convention and then enable overrides only when they provide real value.

---

## Impact on Child Systems

Child systems must be able to start with defaults inherited from Evolith. Personalization must be incremental, explicit, and traceable.

This enables:

- Faster bootstrap.
- Less repetitive configuration.
- Greater consistency across products.
- Lower technical debt.
- Better multi-tenant governance.
- More clarity for AI agents and human teams.

---

## Required Validations

During architecture reviews, PRs, or audits, validate:

- Unnecessary configurations that should be conventions.
- Unnecessary parameters that should be Evolith conventions.
- Hardcodes that should be documented conventions.
- Hardcodes that should be parameters.
- Undocumented conventions.
- Parameters without justification.
- Tenant or system overrides without traceability.
- Incoherent differences between Evolith, UMS, and other child systems.

---

## Relationship with SDLC Artifacts

| Artifact | Expected use |
|---|---|
| PRD | Declare real parameterization and context-variation needs |
| ADR | Justify precedence changes, new configuration layers, or parameterization models |
| Functional Story | Describe default behavior and allowed variations |
| Technical Story | Implement convention/parameter/explicit configuration resolution |
| Test Summary Report | Evidence precedence and traceability tests |
| Release Notes | Document convention, parameter, or default behavior changes |

---

## Required Tests

When applicable, cover:

- Resolution through Evolith convention.
- Override through global parameter.
- Override through system parameter.
- Override through tenant parameter.
- Override through explicit configuration.
- Absence of undocumented hardcodes.
- Final behavior traceability.
- Fallback cases to documented technical default value.

---

## Evolith Decision

Evolith adopts Convention over Configuration as a mandatory principle to reduce overconfiguration, improve consistency, and accelerate child-system creation.

The architecture must favor convention first, then parameterization, and explicit configuration only when necessary, justified, and auditable.

---

[Back to Engineering Index](./README.md)
