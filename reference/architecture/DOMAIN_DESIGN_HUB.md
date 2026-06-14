# Domain-Driven Design (DDD) Hub

Evolith leverages Domain-Driven Design to tackle complexity in the heart of our software. This hub outlines our canonical DDD patterns that guide the boundaries and internal structure of our microservices and modular monoliths.

## Level 1: The Reference Directory (Single Source of Truth)

Evolith officially recognizes the **Domain-Driven Design (DDD)** methodology by Eric Evans as the industry standard. This encompasses both strategic design (boundaries, maps) and tactical design (building blocks).

## Level 2: Core Canonical Patterns (Just-in-Time)

To support our microservices and modular monolith boundaries, we have formally adopted the following three essential DDD patterns.

### 1. Bounded Context
**Problem:** In a large enterprise, a single concept (e.g., "Customer") means different things in different departments (Billing vs. Shipping). Using a single unified model leads to tight coupling and confusion.
**Solution:** Explicitly define the context within which a model applies. Explicitly set boundaries in terms of team organization, usage within specific parts of the application, and physical manifestations such as code bases and database schemas.

### 2. Aggregate & Aggregate Root
**Problem:** Complex domains have many interconnected objects. Ensuring consistency across changes to multiple objects is difficult without strict transactional boundaries.
**Solution:** Cluster associated objects into a single unit (the Aggregate) for the purpose of data changes. Each Aggregate has one "Root" entity. External objects can only hold references to the Root, and all changes to the internal objects must go through the Root, guaranteeing invariant enforcement.

### 3. Domain Event
**Problem:** Something significant happens in one domain that other domains need to react to, but we want to avoid tight coupling between these domains.
**Solution:** Model the occurrence as a Domain Event. The aggregate that experiences the change publishes the event, and other bounded contexts (or components) can subscribe to and handle it asynchronously.

## Level 3: Organic Growth via ADRs (Governance)

We avoid Big Design Up Front (BDUF). If a satellite team needs a Level 1 pattern that is not yet documented in Level 2 (e.g., CQRS, Event Sourcing, or specific Anti-Corruption Layers), they must follow the organic growth flow governed by the **Loop Engineer**:

1. **Identify the Need:** The team identifies a missing pattern required for their bounded context.
2. **Proof of Concept (PoC):** The Loop Engineer implements a PoC in the UMS (Applied Reference) boundary.
3. **Draft an ADR:** The Loop Engineer proposes an Architectural Decision Record (ADR).
4. **Architecture Board Review:** The ADR is submitted to the Architecture Board.
5. **Promotion:** Once approved, the pattern "ascends" to the Evolith core corpus.
