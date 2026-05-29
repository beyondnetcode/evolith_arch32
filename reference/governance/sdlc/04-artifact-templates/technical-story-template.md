# Template: Technical Story

> **Bilingual navigation:** [Versión en Español](./technical-story-template.es.md)
> **Phase:** 3 — Construction
> **Exit gate:** Successful Build (PR Merge Authorized)
> **Parent:** [Artifact Templates](./README.md)

---

## About This Template

A Technical Story is an engineering-facing work item derived from one or more Functional Stories. It describes what must be built, at the implementation level, to satisfy a specific technical requirement. Technical Stories are never shown to Product Owners; they are the unit of sprint planning and pull request scope for engineers.

Key rules:
- Every Technical Story must trace to at least one Functional Story.
- A Technical Story must be deliverable in one sprint without external dependencies.
- Effort is estimated in story points using the Fibonacci scale (1, 2, 3, 5, 8, 13).
- Acceptance criteria are technical and verifiable in CI (tests must pass, build must succeed).

---

## Section 1 — Blank Template

### Source — Copy and paste

```markdown
# TS-[NUMBER]: [Technical Story Title]

> Status: [Backlog | In Progress | In Review | Done]
> Parent FS: [FS-XX — Functional Story Title]
> Epic: [EP-XX — Epic Name]
> Phase: [MVP | Post-MVP]
> Effort: [N story points]
> Assignee: [Developer name or team role]
> Sprint: [Sprint number or TBD]

---

## 1. Technical Objective

[One paragraph describing what this story builds, at the implementation level.
Reference the specific layer (Domain, Application, Infrastructure, API) being modified.
State which ADR governs this implementation.]

---

## 2. Technical Preconditions

- [TS-XXX must be completed first: reason]
- [Database migration X must be applied]
- [Environment variable X must be configured]

---

## 3. Implementation Tasks

- [ ] [Task 1: e.g. Create `User` aggregate with `Register` factory method in `Identity.Domain`]
- [ ] [Task 2: e.g. Implement `IUserRepository` port interface in `Identity.Application`]
- [ ] [Task 3: e.g. Implement `SqlUserRepository` adapter in `Identity.Infrastructure`]
- [ ] [Task 4: e.g. Write unit tests for aggregate and use case in `Identity.Tests.Unit`]
- [ ] [Task 5: e.g. Write integration test with Testcontainers in `Identity.Tests.Integration`]
- [ ] [Task 6: e.g. Update OpenAPI spec or ADR if the decision is new]

---

## 4. Technical Acceptance Criteria

- TAC-01: [All unit tests pass with >= 80% coverage on new code paths]
- TAC-02: [Integration test with Testcontainers exercises the happy path and one error path]
- TAC-03: [CI pipeline passes — linting, static analysis, test thresholds]
- TAC-04: [No outer-layer imports in Domain or Application layers (eslint-plugin-boundaries / .editorconfig rules)]
- TAC-05: [OTel span created for the use case handler with correlation ID propagated]

---

## 5. Definition of Done Checklist

- [ ] Code compiles without warnings
- [ ] All automated tests pass locally and in CI
- [ ] Code coverage >= 80% on new paths
- [ ] Zero HIGH/CRITICAL CVEs introduced (npm audit / dotnet audit)
- [ ] At least one peer review approval received
- [ ] OpenAPI / ADR updated if applicable
- [ ] Documentation delta committed alongside code

---

## 6. Traceability

| Reference Type | ID / Link |
|---|---|
| Parent Functional Story | [FS-XX — Title] |
| Governing ADRs | [ADR-XXXX, ADR-YYYY] |
| Technical Enabler | [TE-XX — Enabler name, if applicable] |
| Bounded Context | [EP-XX — Context name] |
| Related Technical Stories | [TS-XXX (must precede), TS-YYY (must follow)] |
```

---

### Preview

# TS-[NUMBER]: [Technical Story Title]

> Status: [Backlog | In Progress | In Review | Done]
> Parent FS: [FS-XX — Functional Story Title]
> Epic: [EP-XX — Epic Name]
> Phase: [MVP | Post-MVP]
> Effort: [N story points]
> Assignee: [Developer name or team role]
> Sprint: [Sprint number or TBD]

---

## 1. Technical Objective

[One paragraph describing what this story builds, at the implementation level.
Reference the specific layer (Domain, Application, Infrastructure, API) being modified.
State which ADR governs this implementation.]

---

## 2. Technical Preconditions

- [TS-XXX must be completed first: reason]
- [Database migration X must be applied]
- [Environment variable X must be configured]

---

## 3. Implementation Tasks

- [ ] [Task 1: e.g. Create `User` aggregate with `Register` factory method in `Identity.Domain`]
- [ ] [Task 2: e.g. Implement `IUserRepository` port interface in `Identity.Application`]
- [ ] [Task 3: e.g. Implement `SqlUserRepository` adapter in `Identity.Infrastructure`]
- [ ] [Task 4: e.g. Write unit tests for aggregate and use case in `Identity.Tests.Unit`]
- [ ] [Task 5: e.g. Write integration test with Testcontainers in `Identity.Tests.Integration`]
- [ ] [Task 6: e.g. Update OpenAPI spec or ADR if the decision is new]

---

## 4. Technical Acceptance Criteria

- TAC-01: [All unit tests pass with >= 80% coverage on new code paths]
- TAC-02: [Integration test with Testcontainers exercises the happy path and one error path]
- TAC-03: [CI pipeline passes — linting, static analysis, test thresholds]
- TAC-04: [No outer-layer imports in Domain or Application layers (eslint-plugin-boundaries / .editorconfig rules)]
- TAC-05: [OTel span created for the use case handler with correlation ID propagated]

---

## 5. Definition of Done Checklist

- [ ] Code compiles without warnings
- [ ] All automated tests pass locally and in CI
- [ ] Code coverage >= 80% on new paths
- [ ] Zero HIGH/CRITICAL CVEs introduced (npm audit / dotnet audit)
- [ ] At least one peer review approval received
- [ ] OpenAPI / ADR updated if applicable
- [ ] Documentation delta committed alongside code

---

## 6. Traceability

| Reference Type | ID / Link |
|---|---|
| Parent Functional Story | [FS-XX — Title] |
| Governing ADRs | [ADR-XXXX, ADR-YYYY] |
| Technical Enabler | [TE-XX — Enabler name, if applicable] |
| Bounded Context | [EP-XX — Context name] |
| Related Technical Stories | [TS-XXX (must precede), TS-YYY (must follow)] |

---

## Section 2 — Worked Example

The following is a complete Technical Story derived from UMS FS-01.

### Source — Copy and paste

```markdown
# TS-003: Implement User Aggregate and RegisterUser Use Case

> Status: Done
> Parent FS: FS-01 — User Registration and Identity Lifecycle
> Epic: EP-01 — Identity
> Phase: MVP
> Effort: 5 story points
> Assignee: Senior Backend Developer
> Sprint: Sprint 1

---

## 1. Technical Objective

Implement the `User` aggregate root in the `Identity.Domain` project, including the
`Register` factory method and domain events (`UserCreated`, `UserActivated`).
Implement the `RegisterUserUseCase` application handler in `Identity.Application`,
consuming the `IUserRepository` port and publishing events via the `IEventBus` port.
Both layers must have zero infrastructure imports per ADR-0002 (Hexagonal Architecture).
The aggregate and use case are governed by ADR-0002 and ADR-0016 (Immutable Audit Trail).

---

## 2. Technical Preconditions

- TS-001 (Project structure and solution scaffolding) must be completed.
- TS-002 (Database migration for `identity.users` table with composite PK) must be applied.
- `IUserRepository` port interface is already defined in `Identity.Application/Ports/`.

---

## 3. Implementation Tasks

- [ ] Create `User` class in `Identity.Domain/Aggregates/` extending `AggregateRoot<UserId>`
- [ ] Add `Register(email, displayName, tenantId)` static factory — validates email format, enforces BR-01 (unique email)
- [ ] Raise `UserCreated` domain event in the factory method
- [ ] Add `Activate()` method — validates state transition from Pending to Active; raises `UserActivated`
- [ ] Add `Suspend()` and `SoftDelete()` methods with appropriate state guards
- [ ] Implement `RegisterUserUseCase` in `Identity.Application/UseCases/`
- [ ] Inject `IUserRepository` and `IEventBus` via constructor (Dependency Inversion)
- [ ] Add `IUserRepository.ExistsWithEmail(email, tenantId)` check before persisting
- [ ] Write unit tests: happy path, duplicate email, invalid email format, state transition guards
- [ ] Write integration test (Testcontainers): `RegisterUserUseCase` persists to SQL Server and publishes event
- [ ] Verify no infrastructure imports exist in `Identity.Domain` or `Identity.Application`

---

## 4. Technical Acceptance Criteria

- TAC-01: `User.Register()` raises a `UserCreated` domain event with correct tenant_id, user_id, and timestamp.
- TAC-02: `RegisterUserUseCase` returns a `Result<UserId, DomainError>` — never throws an exception.
- TAC-03: Integration test confirms a row is persisted in `identity.users` with correct `root_tenant_id`.
- TAC-04: `Identity.Domain.csproj` has no reference to any ORM, HTTP, or infrastructure package.
- TAC-05: An OTel activity named `RegisterUser` is created with `user.id` and `tenant.id` attributes.
- TAC-06: Code coverage for `Identity.Domain` >= 90%.

---

## 5. Definition of Done Checklist

- [x] Code compiles without warnings
- [x] All automated tests pass locally and in CI
- [x] Code coverage >= 80% on new paths (Identity.Domain: 92%, Identity.Application: 85%)
- [x] Zero HIGH/CRITICAL CVEs introduced (dotnet audit clean)
- [x] Peer review approval from Tech Lead received (2026-02-10)
- [x] No new ADR required — decision covered by ADR-0002 and ADR-0016
- [x] XML doc comments added to public aggregate methods

---

## 6. Traceability

| Reference Type | ID / Link |
|---|---|
| Parent Functional Story | FS-01 — User Registration and Identity Lifecycle |
| Governing ADRs | ADR-0002 (Hexagonal Architecture), ADR-0016 (Immutable Audit Trail), ADR-0038 (Result Pattern) |
| Technical Enabler | TE-03 — Tenant Provisioning + RLS |
| Bounded Context | EP-01 — Identity |
| Related Technical Stories | TS-001 (precedes), TS-002 (precedes), TS-004 (follows: SQL adapter), TS-005 (follows: REST endpoint) |
```

---

### Preview

# TS-003: Implement User Aggregate and RegisterUser Use Case

> Status: Done
> Parent FS: FS-01 — User Registration and Identity Lifecycle
> Epic: EP-01 — Identity
> Phase: MVP
> Effort: 5 story points
> Assignee: Senior Backend Developer
> Sprint: Sprint 1

---

## 1. Technical Objective

Implement the `User` aggregate root in the `Identity.Domain` project, including the
`Register` factory method and domain events (`UserCreated`, `UserActivated`).
Implement the `RegisterUserUseCase` application handler in `Identity.Application`,
consuming the `IUserRepository` port and publishing events via the `IEventBus` port.
Both layers must have zero infrastructure imports per ADR-0002 (Hexagonal Architecture).
The aggregate and use case are governed by ADR-0002 and ADR-0016 (Immutable Audit Trail).

---

## 2. Technical Preconditions

- TS-001 (Project structure and solution scaffolding) must be completed.
- TS-002 (Database migration for `identity.users` table with composite PK) must be applied.
- `IUserRepository` port interface is already defined in `Identity.Application/Ports/`.

---

## 3. Implementation Tasks

- [ ] Create `User` class in `Identity.Domain/Aggregates/` extending `AggregateRoot<UserId>`
- [ ] Add `Register(email, displayName, tenantId)` static factory — validates email format, enforces BR-01 (unique email)
- [ ] Raise `UserCreated` domain event in the factory method
- [ ] Add `Activate()` method — validates state transition from Pending to Active; raises `UserActivated`
- [ ] Add `Suspend()` and `SoftDelete()` methods with appropriate state guards
- [ ] Implement `RegisterUserUseCase` in `Identity.Application/UseCases/`
- [ ] Inject `IUserRepository` and `IEventBus` via constructor (Dependency Inversion)
- [ ] Add `IUserRepository.ExistsWithEmail(email, tenantId)` check before persisting
- [ ] Write unit tests: happy path, duplicate email, invalid email format, state transition guards
- [ ] Write integration test (Testcontainers): `RegisterUserUseCase` persists to SQL Server and publishes event
- [ ] Verify no infrastructure imports exist in `Identity.Domain` or `Identity.Application`

---

## 4. Technical Acceptance Criteria

- TAC-01: `User.Register()` raises a `UserCreated` domain event with correct tenant_id, user_id, and timestamp.
- TAC-02: `RegisterUserUseCase` returns a `Result<UserId, DomainError>` — never throws an exception.
- TAC-03: Integration test confirms a row is persisted in `identity.users` with correct `root_tenant_id`.
- TAC-04: `Identity.Domain.csproj` has no reference to any ORM, HTTP, or infrastructure package.
- TAC-05: An OTel activity named `RegisterUser` is created with `user.id` and `tenant.id` attributes.
- TAC-06: Code coverage for `Identity.Domain` >= 90%.

---

## 5. Definition of Done Checklist

- [x] Code compiles without warnings
- [x] All automated tests pass locally and in CI
- [x] Code coverage >= 80% on new paths (Identity.Domain: 92%, Identity.Application: 85%)
- [x] Zero HIGH/CRITICAL CVEs introduced (dotnet audit clean)
- [x] Peer review approval from Tech Lead received (2026-02-10)
- [x] No new ADR required — decision covered by ADR-0002 and ADR-0016
- [x] XML doc comments added to public aggregate methods

---

## 6. Traceability

| Reference Type | ID / Link |
|---|---|
| Parent Functional Story | FS-01 — User Registration and Identity Lifecycle |
| Governing ADRs | ADR-0002 (Hexagonal Architecture), ADR-0016 (Immutable Audit Trail), ADR-0038 (Result Pattern) |
| Technical Enabler | TE-03 — Tenant Provisioning + RLS |
| Bounded Context | EP-01 — Identity |
| Related Technical Stories | TS-001 (precedes), TS-002 (precedes), TS-004 (follows: SQL adapter), TS-005 (follows: REST endpoint) |

---

[Back to Artifact Templates](./README.md)
