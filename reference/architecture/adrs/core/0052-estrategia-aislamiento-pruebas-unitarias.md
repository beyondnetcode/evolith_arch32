# [ADR 0052](0052-unit-testing-isolation-strategy.md): Unit Testing Isolation Strategy (Mocks vs Stubs)

## 1. Metadata
* **ADR ID:** 0052
* **Title:** Unit Testing Isolation Strategy (Mocks vs Stubs)
* **Status:** Approved
* **Authors:** Enterprise Architecture Office
* **Reviewers:** Corporate Architecture Committee, CTO Office
* **Date:** 2026-05-14
* **Tags:** `Testing`, `Quality`, `Software-Engineering`, `Best-Practices`
* **Related ADRs:**
  * [ADR-0018: Testing Pyramid and Automated Quality Gates](./0018-testing-pyramid-quality-gates.md)
  * [ADR-0019: Tactical Design Patterns](./0019-tactical-design-patterns-future-proofing.md)

---

## Executive Summary
In a Hexagonal Architecture, unit tests are the primary defense against regression. However, the inappropriate use of test doubles (Mocks and Stubs) often leads to "brittle tests" that break with internal refactoring or provide a false sense of confidence. This ADR establishes the official strategy for isolating components during unit testing, standardizing the use of Stubs for state verification and Mocks for interaction verification.

---

## 2. Problem Context
Developers often confuse Mocks and Stubs, using them interchangeably. This leads to several anti-patterns:
1. **Over-Mocking (Mocking-itis):** Mocking internal classes or domain logic, resulting in tests that only verify implementation details instead of business behavior.
2. **Brittle Interaction Tests:** Using Mocks to verify every internal call, making refactoring impossible without breaking dozens of tests.
3. **Inconsistent Tools:** Different teams using different libraries and patterns for isolation, complicating cross-team code reviews.

---

## 3. Decision
We adopt a **Doubles-Centric Isolation Strategy** aligned with Hexagonal Architecture principles.

### 3.1 Test Doubles Taxonomy
* **Stub (Indirect Input):** Used to provide the SUT (*System Under Test*) with necessary data or state. Stubs never fail a test; they simply "replace" a real component (e.g., a repository port that returns a fictitious entity).
* **Mock (Indirect Output):** Used to verify that the SUT interacted correctly with an external collaborator. Mocks *can* fail a test if the expected interaction did not occur (e.g., verifying that a notification port was called exactly once).

### 3.2 Where to Isolate (Boundary Rules)
* **Domain Layer (Entities, Value Objects):** Use **State-Based Tests**. Mocks and Stubs are strictly PROHIBITED here. Test pure business logic using real objects.
* **Application Layer (Command Handlers, Services):** Use **Solitary Unit Tests**. All **Ports (Interfaces)** must be isolated using Stubs (to get data) or Mocks (to verify side effects).
* **Infrastructure Layer (Adapters):** Unit tests are discouraged here in favor of **Integration Tests** using Testcontainers. If unit tests are required, only mock the external client (e.g., the DB driver or HTTP client).

### 3.3 Tool Standards
* **.NET Stack:** **NSubstitute** (Preferred for clean syntax) or **Moq 4.x**.
* **Node.js Stack:** **Jest** (Native mocks `jest.fn()` and `jest.spyOn()`).

---

## 4. Best Practices (The "Architectural Style")
1. **Prefer Stubs over Mocks:** Verify state whenever possible. Only use Mocks to verify side effects that cannot be observed through state (e.g., sending an email).
2. **Mock Interfaces, not Classes:** Never mock a concrete class. If you feel the need to mock a class, it probably indicates a missing abstraction (Port).
3. **One Interaction Verification per Test:** A test should verify only one significant side effect using a Mock.
4. **Don't Mock Everything:** If a collaborator is a simple helper or a Value Object, use the real object. Isolation should occur at the **Bounded Context** or **Layer** boundaries.

---

## 5. Consequences

### Positives:
* **Refactoring-Friendly Tests:** Tests focus on behavior and contracts, allowing internal code changes without breaking the suite.
* **Speed:** Isolated tests remain ultra-fast by avoiding I/O and heavy configurations.
* **Clarity:** Developers have a clear "recipe" on how to write tests for each layer.

### Negatives:
* **Learning Curve:** Requires developers to understand the subtle difference between Stubs and Mocks.
* **Interface Overhead:** Forces creation of interfaces (Ports) to enable isolation, which may feel like "boilerplate code" for simple cases.

---

## Strategic Conclusion
Standardizing our isolation strategy ensures our unit tests fulfill their intended purpose: providing fast, reliable, refactoring-proof validation of our business logic. By mocking only at boundaries (Ports), we maintain the purity of our Domain while ensuring the correctness of our Application orchestration.

---
[Back to Index](../../../../MASTER_INDEX.md)