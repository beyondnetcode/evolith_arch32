# C4 Level 3: Core API Components

> **Bilingual Navigation:** [Versión en Español](./core-api-components.es.md)

**Status:** Approved  
**Level:** 3 - Components  
**Parent:** [C4 Level 3: Components Hub](./README.md)

## 1. Container Context

The **Core API (BFF)** is the stateless evaluation engine of Evolith. It receives HTTP REST requests, resolves workspace references to find the appropriate reference corpus, evaluates gates using OPA or a Native Engine, and returns a technical evaluation result.

It strictly adheres to **Clean Architecture**.

## 2. Component Diagram

```mermaid
C4Component
    title Component Diagram for Core API (BFF)

    Container_Boundary(api, "Core API Container") {
        
        Component(controllers, "REST Controllers", "NestJS @Controller", "Handles HTTP requests, validation (DTOs), and serialization.")
        
        Component(usecases, "Use Cases (App Services)", "Application Layer", "Orchestrates domain logic. E.g., PhaseTransitionUseCase, GateEvaluationUseCase.")
        
        Component(domain, "Domain Entities & Rules", "@evolith/core-domain", "Pure business rules. Stateless gate models, evidence validation rules.")
        
        Component(workspace, "Workspace Resolver", "Infrastructure Adapter", "Safely resolves opaque 'workspaceRef' to physical file paths. Prevents path traversal.")
        
        Component(opa, "OPA Evaluator", "Infrastructure Adapter", "Executes WASM-based Open Policy Agent rulesets.")
        
        Component(redis, "Cache Adapter", "Infrastructure Adapter", "Interfaces with Redis for caching rulesets (Cache-Manager).")

        Rel(controllers, usecases, "Invokes")
        Rel(usecases, domain, "Uses")
        Rel(usecases, workspace, "Requests paths from")
        Rel(usecases, opa, "Delegates evaluation to")
        Rel(usecases, redis, "Checks/Writes cache via")
    }
```

## 3. Key Components Breakdown

| Component | Responsibility |
|-----------|----------------|
| **REST Controllers** | Expose endpoints like `POST /v1/gates/evaluate`. Ensure input payloads meet DTO schemas. |
| **Use Cases** | Coordinate the flow: get input -> resolve workspace -> fetch ruleset (cache or disk) -> evaluate via OPA -> return result. |
| **@evolith/core-domain** | The core business logic, decoupled from NestJS. Defines what a `Gate` is, what `Evidence` is. |
| **Workspace Resolver** | Security boundary. Translates an opaque `workspaceRef` token (provided by Tracker) into a safe, validated absolute path to the reference corpus on disk. |
| **OPA Evaluator** | Loads `.wasm` policies compiled from Rego, injects the JSON rulesets and the input evidence, and returns the evaluation result. |

---
[Back to Level 3: Components Hub](./README.md)
