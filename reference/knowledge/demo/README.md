# Reference Demo / Sandbox Application ("To-Do App")

This section documents the physical implementation provided in this repository. Its sole objective is to act as a **Pattern Laboratory**, demonstrating in live code how corporate standards operate together.

Before applying demo choices as general architecture policy, read [Demo vs Reference](./demo-vs-reference.md) or [Demo vs Referencia](./demo-vs-reference.es.md).

---

## Demo Navigation Map (Exhaustive)

### 0. Project Lifecycle & Backlog
Official planning, Scrum artifacts, and taxonomy of deliverables.
* -> **[Project Hub (PRD & Backlog)](./project/README.md)**

### 1. Functional & Business Layer of the Sandbox
Domain description to trigger the demonstrative technical flows.
* [Demo Product Vision](./functional/product-vision.md)
* [Business Context](./functional/business-context.md)
* [Product Objectives & OKRs](./functional/product-objectives.md)
* [Stakeholders Matrix](./functional/stakeholders.md)
* [Atomic Functional Scope](./functional/domain-scope.md)
* [Business Glossary (Ubiquitous Language)](./functional/business-glossary.md)
* [Conceptual Data Model](./functional/data-model.md)

### 2. Technical Layer of the Demo
How the corporate architectural blueprint is applied tactically within the code of this specific solution.
* [Bounded Contexts Map (Auth vs Tasks)](./technical/bounded-context-map.md)
* -> **[Pattern Verification Matrix (Sandbox Scope)](./technical/sandbox-verification.md)** *(Check which ADRs are physically proven in code)*

### 3. Implemented Atomic Use Cases
* [UC-01: User Authentication](./functional/usecases/uc-01-user-authentication.md)
* [UC-02: Create To-Do Task](./functional/usecases/uc-02-create-todo-task.md)
* [UC-03: List Personal Tasks](./functional/usecases/uc-03-list-filter-tasks.md)
* [UC-04: Manage Task Tags](./functional/usecases/uc-04-manage-task-tags.md)

---

## Known Limitations
This application is NOT a final production product. It intentionally lacks complex business logic (multi-user collaboration, dense semantic searches) to keep the code clean, lightweight, and 100% focused on validating **Architectural Boundaries** and **Framework Capabilities**.

---
[Back to Upper Level](../../README.md)
