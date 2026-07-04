# Application Architecture & Data Hub

Evolith defines a progressive strategy for application architecture and data access, ensuring that our systems remain maintainable, testable, and decoupled from underlying infrastructure as we scale.

## Level 1: The Reference Directory (Single Source of Truth)

Evolith officially recognizes the **Patterns of Enterprise Application Architecture (PoEAA)** catalog by Martin Fowler as the industry standard for application design. We rely on these patterns to structure our business logic and data access layers.

## Level 2: Core Canonical Patterns (Just-in-Time)

To support our current architecture (which leans heavily on Domain-Driven Design and decoupled persistence), we have formally adopted the following three essential patterns.

### 1. Data Mapper
**Problem:** Business objects and database tables have different structures. Coupling them tightly makes the domain logic hard to test and evolve.
**Solution:** A layer of Mappers that moves data between objects and a database while keeping them independent of each other and the mapper itself. (e.g., using TypeORM or MikroORM in Data Mapper mode instead of Active Record).

### 2. Repository
**Problem:** The domain logic needs to access data, but embedding SQL or ORM specifics in the domain layer pollutes the business rules.
**Solution:** Mediates between the domain and data mapping layers using a collection-like interface for accessing domain objects. The domain layer only knows about the Repository interface, while the infrastructure layer implements it.

### 3. Unit of Work
**Problem:** When a business transaction modifies multiple objects, we need to ensure all changes succeed or fail together, without managing database connections directly in the business logic.
**Solution:** Maintains a list of objects affected by a business transaction and coordinates the writing out of changes and the resolution of concurrency problems.

## Level 3: Organic Growth via ADRs (Governance)

We avoid Big Design Up Front (BDUF). If a satellite team needs a Level 1 pattern that is not yet documented in Level 2 (e.g., Active Record for a simple CRUD service), they must follow the organic growth flow governed by the **Loop Engineer**:

1. **Identify the Need:** The team identifies a missing pattern required for their bounded context.
2. **Proof of Concept (PoC):** The Loop Engineer implements a PoC in the UMS (Applied Reference) boundary.
3. **Draft an ADR:** The Loop Engineer proposes an Architectural Decision Record (ADR) backed by the PoC evidence.
4. **Architecture Board Review:** The ADR is submitted to the Architecture Board for evaluation.
5. **Promotion:** Once approved, the pattern "ascends" to the Evolith core corpus (Level 2).
