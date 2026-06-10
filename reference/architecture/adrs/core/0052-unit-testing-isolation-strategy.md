# [ADR 0052](0052-unit-testing-isolation-strategy.md): Unit Testing Isolation Strategy (Mocks vs Stubs)

## 1. Metadata
* **ADR ID:** 0052
* **Title:** Unit Testing Isolation Strategy (Mocks vs Stubs)
* **Status:** Approved
* **Authors:** Enterprise Architecture Office
* **Reviewers:** Corporate Architecture Board, CTO Office
* **Date:** 2026-05-14
* **Tags:** `Testing`, `Quality`, `Software-Engineering`, `Best-Practices`
* **Related ADRs:** 
 * [ADR-0018: Testing Pyramid and Automated Quality Gates](./0018-testing-pyramid-quality-gates.md)
 * [ADR-0019: Tactical Design Patterns](./0019-tactical-design-patterns-future-proofing.md)

---

## Executive Summary
In a Hexagonal Architecture, unit tests are the primary defense against regression. However, improper use of test doubles (Mocks and Stubs) often leads to "fragile tests" that break with internal refactoring or provide false confidence. This ADR establishes the official strategy for isolating components during unit testing, standardizing the use of Stubs for state verification and Mocks for interaction verification.

---

## 2. Problem Context
Developers often confuse Mocks and Stubs, using them interchangeably. This leads to several anti-patterns:
1. **Over-Mocking (Mocking-itis):** Mocking internal classes or domain logic, resulting in tests that only verify the implementation details rather than business behavior.
2. **Fragile Interaction Testing:** Using Mocks to verify every internal call, making refactoring impossible without breaking dozens of tests.
3. **Inconsistent Tooling:** Different teams using different libraries and patterns for isolation, complicating cross-team code reviews.

---

## 3. Decision
We adopt a **Double-Centric Isolation Strategy** aligned with Hexagonal Architecture principles.

### 3.1 Taxonomy of Test Doubles
* **Stub (Indirect Input):** Used to provide the SUT (System Under Test) with necessary data or state. Stubs never fail a test; they simply "stand in" for a real component (e.g., a repository port returning a dummy entity).
* **Mock (Indirect Output):** Used to verify that the SUT correctly interacted with an external collaborator. Mocks *can* fail a test if the expected interaction did not occur (e.g., verifying that a notification port was called exactly once).

### 3.2 Where to Isolate (Boundary Rules)
* **Domain Layer (Entities, Value Objects):** Use **State-Based Testing**. Mocks and Stubs are strictly FORBIDDEN here. Test pure business logic using real objects.
* **Application Layer (Command Handlers, Services):** Use **Solitary Unit Tests**. All **Ports (Interfaces)** must be isolated using Stubs (for fetching data) or Mocks (for verifying side effects).
* **Infrastructure Layer (Adapters):** Unit testing here is discouraged in favor of **Integration Tests** using Testcontainers. If unit testing is required, only mock the external client (e.g., the raw DB driver or HTTP client).

### 3.3 Tooling Standards
* **.NET Stack:** **NSubstitute** (Preferred for its clean syntax) or **Moq 4.x**.
* **Node.js Stack:** **Jest** (Native `jest.fn()` and `jest.spyOn()`).

---

## 4. Best Practices (The "Architecture Way")
1. **Prefer Stubs over Mocks:** Verify state whenever possible. Only use Mocks to verify side effects that cannot be observed through state (e.g., sending an email).
2. **Mock Interfaces, Not Classes:** Never mock a concrete class. If you feel the need to mock a class, it probably indicates a missing abstraction (Port).
3. **One Interaction Verification per Test:** A test should verify only one meaningful side effect using a Mock.
4. **Don't Mock Everything:** If a collaborator is a simple helper or a Value Object, use the real thing. Isolation should happen at the **Bounded Context** or **Layer** boundaries.

---

## 5. Consequences

### Positive:
* **Refactor-Friendly Tests:** Tests focus on behavior and contracts, allowing internal code changes without breaking the suite.
* **Speed:** Isolated tests remain lightning-fast by avoiding IO and heavy setup.
* **Clarity:** Developers have a clear "recipe" for how to write tests for each layer.

### Negative:
* **Learning Curve:** Requires developers to understand the subtle difference between Stubs and Mocks.
* **Interface Overhead:** Forces the creation of interfaces (Ports) to enable isolation, which might feel like "boilerplate" for simple cases.

---

## Strategic Conclusion
Standardizing our isolation strategy ensures that our unit tests serve their intended purpose: providing a fast, reliable, and refactor-proof validation of our business logic. By mocking only at the boundaries (Ports), we maintain the purity of our Domain while ensuring the correctness of our Application orchestration.





## Objective and Scope

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Options Considered

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Evidence and Evaluation Criteria

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Related Decisions and Standards

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

---
[Back to Index](../../../../MASTER_INDEX.md)
