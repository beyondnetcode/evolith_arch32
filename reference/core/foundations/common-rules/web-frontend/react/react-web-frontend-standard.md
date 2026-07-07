# React Web Frontend Standard

> Bilingual navigation: [Espanol](./react-web-frontend-standard.es.md)

## 1. Purpose

This standard defines the reusable Evolith baseline for enterprise React web applications. It covers architecture, boilerplate structure, UI system governance, data access, state management, testing, accessibility, security, and promotion criteria.

This standard is not a copy of any product implementation. UMS can be used as applied evidence, but UMS-specific details remain local unless promoted through ADR, governance standard, or canonical pattern.

## 2. Authority and scope

| Area | Evolith standard | Product applied reference |
|---|---|---|
| Architecture principles | Normative | Must comply or document deviation |
| Folder structure | Normative baseline with allowed extension points | May specialize by bounded context or product module |
| UI tokens | Normative naming and governance | Product owns concrete values and branding |
| Libraries | Recommended profile unless approved by ADR | Product pins concrete versions |
| API contracts | Normative boundary rules | Product owns concrete endpoints, headers, and schemas |
| Testing gates | Normative minimum | Product may add stricter gates |

## 3. Recommended React enterprise profile

The default profile for an Evolith React product SHOULD use:

| Concern | Recommended profile |
|---|---|
| Runtime | React 18 or later |
| Build tool | Vite or an approved equivalent |
| Language | TypeScript with strict typing |
| Routing | Declarative router with lazy-loaded screen boundaries |
| Server state | TanStack React Query or approved equivalent |
| Client state | Lightweight store for UI, preferences, session, and feature state |
| Styling | Design tokens exposed as CSS variables and consumed by the component layer |
| Validation | Runtime schemas at external boundaries |
| HTTP | Centralized client with request context, security headers, and normalized errors |
| Mocking | Service-worker or test-server based API mocking for development and tests |
| Tests | Unit, component, integration, and E2E layers |

Any change that makes a specific tool mandatory across products requires an ADR.

## 4. Boilerplate structure

A product React application SHOULD use this structure or an equivalent documented mapping:

```text
src/
  domain/
    models/
    value-objects/
    policies/
  application/
    hooks/
    stores/
    use-cases/
    services/
  infrastructure/
    http/
    graphql/
    persistence/
    telemetry/
  presentation/
    shared/
      components/
      layouts/
      navigation/
      feedback/
    features/
    <bounded-context>/
      <feature>/
        screens/
        components/
        hooks/
        view-models/
  test/
    mocks/
    fixtures/
    helpers/
```

Rules:

1. Presentation components MUST NOT call external APIs directly.
2. Infrastructure clients MUST be centralized and injectable or configurable.
3. Domain concepts MUST remain independent from React and browser APIs.
4. Application stores MUST NOT perform direct DOM manipulation.
5. Product-specific modules MUST not be documented as universal standards without promotion.

## 5. Application bootstrap

The root application MUST centralize cross-cutting providers and runtime initialization.

Required elements:

- React strict mode or equivalent runtime safety mode.
- Data provider for server-state cache.
- Global error boundary.
- Router provider or router root.
- Locale synchronization when i18n is enabled.
- Optional mocking startup gated by environment variable.
- No product secrets or hardcoded production tenant identifiers.

## 6. Routing and screen composition

Routing MUST be declarative, observable, and modular.

Required rules:

1. Route-level screens SHOULD be lazy loaded when they are not part of the initial landing path.
2. Suspense fallback MUST use a reusable loader or skeleton component.
3. Unknown routes MUST redirect or render a controlled not-found screen.
4. Route definitions MUST not contain business logic.
5. Protected routes MUST use a reusable authorization guard pattern.

## 7. Layout shell

Enterprise applications SHOULD use an application shell pattern with:

- top application bar or equivalent global command surface,
- navigation rail, side navigation, or responsive navigation container,
- main content region,
- feedback/toast region,
- error and loading regions,
- accessibility landmarks.

The shell pattern is reusable. Product names, menu entries, routes, icons, and labels remain product-specific.

## 8. Progressive UI delivery and microfrontend readiness

Evolith web products MUST start with a **modular monolithic UI**. Microfrontends are a **Phase 3+ extraction strategy**, not the default starting architecture.

The baseline progression is:

| Phase | UI delivery model | Required guidance |
|---|---|---|
| Phase 1 | Single modular React application | Keep one deployable UI. Organize by routes, features, bounded contexts, shared components, and infrastructure boundaries. |
| Phase 2 | Stronger modular UI ownership | Preserve one deployable UI while strengthening lazy loading, API boundaries, design-system governance, testing, and applied-reference mapping. |
| Phase 3+ | Microfrontends by exception | Extract MFEs only when team scale, release contention, or independent technology lifecycle requirements justify the operational complexity. |

Rules:

1. Products MUST NOT start with microfrontends unless an explicit ADR deviation is approved.
2. Module Federation, shell/orchestrator runtime composition, and per-MFE CI/CD pipelines are NOT part of the Phase 1 baseline.
3. A modular folder structure, lazy-loaded routes, and bounded-context UI ownership SHOULD be used first to delay distribution until it is necessary.
4. MFE extraction MUST comply with [ADR-0055: Microfrontends Architecture Strategy](../../../../architecture/adrs/core/0055-microfrontends-architecture-strategy.md).
5. When MFEs are introduced, design tokens, shared accessibility rules, telemetry, and cross-cutting security behavior remain governed by Evolith standards.

## 9. Material Design 3 and design tokens

Evolith standardizes token governance, not a single product palette.

Required token roles:

- primary, on-primary, primary-container, on-primary-container,
- secondary and tertiary equivalents,
- error roles,
- surface and on-surface roles,
- surface-container roles,
- outline roles,
- inverse roles.

Rules:

1. Tokens SHOULD be exposed as CSS variables.
2. Component utilities SHOULD consume semantic tokens rather than raw colors.
3. Dark mode SHOULD be class or attribute based and deterministic.
4. Product branding values belong to the product repository.
5. Global token changes require design-system review.

## 10. State management

State MUST be classified before implementation.

| State type | Ownership |
|---|---|
| Server state | Query/cache layer |
| UI state | Lightweight client store or local component state |
| Session state | Auth/session boundary |
| Form state | Form-specific controller |
| Domain state | Domain/application services, not raw presentation components |

Rules:

1. Do not duplicate server state into client stores unless justified.
2. Stores must expose intent-oriented actions.
3. DOM side effects belong in presentation adapters or effects, not store definitions.
4. Persistent client state must document storage, privacy, and invalidation behavior.

## 11. Data access and runtime validation

External access MUST go through infrastructure boundaries.

Required rules:

1. Use one or more centralized clients for HTTP, GraphQL, or other protocols.
2. Inject request context consistently for language, tenant, correlation, or session values.
3. Normalize infrastructure errors before they reach presentation.
4. Use runtime validation for external data when contracts are not fully compile-time enforced.
5. Mutating requests MUST include required security controls such as CSRF or equivalent when applicable.
6. Headers and endpoint names remain product-specific.

## 12. Internationalization

Internationalization SHOULD be centralized.

Rules:

1. Shared components MUST not hardcode user-facing strings unless explicitly local-only.
2. The document language SHOULD be synchronized with the active locale.
3. Translation keys belong to the product unless Evolith owns the component.
4. Locale propagation to APIs must be documented at the request-context boundary.

## 13. Testing and quality gates

Minimum gates:

| Layer | Expected coverage |
|---|---|
| Unit | Pure functions, hooks, stores, validators |
| Component | UI states, accessibility-relevant behavior, interactions |
| Integration | API client plus mocked API behavior |
| E2E | Critical journeys and authorization-sensitive flows |

Recommended tools may include Vitest, Testing Library, MSW, and Playwright. Making any one tool mandatory across all Evolith products requires ADR approval.

## 14. Security and privacy rules

1. Raw GUIDs or internal technical identifiers MUST NOT be displayed to end users unless explicitly required.
2. Tenant, user, and authorization context MUST be handled through documented boundaries.
3. Product secrets MUST NOT be embedded in the frontend bundle.
4. Error messages MUST be safe for users and logs.
5. Development-only identifiers MUST be isolated from production builds.

## 15. Accessibility and UX quality

1. Interactive elements MUST have accessible names.
2. Navigation structure SHOULD use semantic landmarks.
3. Loading, empty, error, and success states MUST be intentional.
4. Color use MUST respect contrast requirements.
5. Keyboard navigation MUST be considered for core flows.

## 16. Promotion path from product to Evolith

A product implementation practice may be promoted only when it satisfies all conditions:

1. It is reusable across more than one product context.
2. It is not coupled to product domain language, API routes, or local branding.
3. It has evidence from implementation or review.
4. It has a documented standard, ADR, or canonical pattern in Evolith.
5. It includes UMS or other product references as examples, not authority.

## 17. Required applied-reference mapping

Every product applying this standard SHOULD maintain a mapping document with:

| Evolith topic | Product artifact | Classification |
|---|---|---|
| Bootstrap | Product root entry point | Applied evidence |
| Routing | Product route configuration | Applied evidence |
| UI tokens | Product theme and token files | Local values |
| HTTP client | Product infrastructure client | Applied evidence with local headers |
| Testing | Product test setup | Applied quality gate |
| Deviations | Local decisions | Must be justified |

---
[Back to React Standard Portal](./README.md)