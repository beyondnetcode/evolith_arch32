# [ADR 0038](0038-error-handling-result-pattern-strategy.md): Enterprise Error Handling & Result Pattern Strategy

## Status
Accepted

## Date
2026-05-11

## Context
Standard JavaScript `try/catch` blocks make error flows invisible to the Type System. Functions claim to return `Data`, but implicitly crash at runtime with arbitrary exceptions. This leads to fragmented error handling logic scattered across the code, making it impossible to distinguish between **Transient** (Infrastructure network blips) and **Non-Transient** (Business Rule Violations) errors safely.

## Decision
Establish a strictly typed, unified Error Propagation framework based on the **Result Pattern** (Functional Error Handling):

### 1. Principle: Errors as Values (The Result Pattern)
Mandate that ALL Application Use Cases and Domain Entities return errors explicitly instead of throwing them.
* **Return Signature**: `Promise<Result<SuccessType, DomainError>>`
* **Implementation**: Use a lightweight `Result<T, E>` class wrapper (e.g., inspired by `neverthrow`).
* **Benefit**: The Typescript compiler FORCES the caller to explicitly handle the failure branch using `.isOk()` / `.isFail()` checks or `.match()`.

### 2. Error Classification Matrix
| Error Class | Type | Recovery Mechanism | Ultimate HTTP Code |
| :--- | :--- | :--- | :--- |
| **Business Logic (Non-Transient)** | Expected | **Result Pattern**. Passed up explicit chain. | 400, 403, 409, 422 |
| **Infrastructure (Transient)** | Unexpected | **Retry with Backoff** ([ADR-0011](../core/0011-fault-tolerance-resiliency-patterns.md)). If permanent, throw generic exception. | 500, 503 |
| **Security Violation** | Guarded | Immediate Termination. Handled by NestJS Guard layer. | 401, 403 |

### 3. Propagation & Boundary Mapping
1. **Domain Layer**: Returns raw `Result.fail(new InsufficientFundsError())`. NO HTTP codes allowed.
2. **Application Layer**: Orchestrates logic. If a Step fails, short-circuits and returns the same `Result`.
3. **Adapter / Controller Layer**: The **Translation Boundary**. Explicitly maps `DomainError` subclasses into specific HTTP Response Codes using a clean mapper.
4. **Global Catch-All**: A dedicated **NestJS Exceptions Filter** captures only truly unhandled infrastructure crashes, strips internal stack traces, assigns a standard `TraceId` from OTel, and delivers an opaque "Internal Server Error" JSON.

## Consequences

### Positive
- 100% Type Safety: You cannot compile code that ignores an explicit business error.
- Total separation of Infrastructure crashes from logical rule enforcement.
- Uniformized public error contracts across all API surfaces.

### Negative
- Introduces slight syntax overhead in code structure (nested mapping).
- Requires developer training to shift from `throw new Error()` to `return Result.fail()`.

## References
- [Railway Oriented Programming](https://fsharpforfunandprofit.com/rop/)
- [ADR-0002: Clean Hexagonal Architecture](../../adrs/nodejs/0002-clean-architecture-nestjs.md)
- [ADR-0011: Fault Tolerance](../../adrs/core/0011-fault-tolerance-resiliency-patterns.md)







## Objective and Scope

Historical backfill: Address the architectural tension where standard JavaScript `try/catch` blocks make error flows invisible to the Type System, establishing a standard boundary.

## Options Considered

- **Selected:** Enterprise Error Handling & Result Pattern Strategy
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [Railway Oriented Programming](https://fsharpforfunandprofit.com/rop/)
- [ADR-0002: Clean Hexagonal Architecture](../../adrs/nodejs/0002-clean-architecture-nestjs.md)
- [ADR-0011: Fault Tolerance](../../adrs/core/0011-fault-tolerance-resiliency-patterns.md)

## Technology Watch (Trends, Maturity, Adoption, Support)

The Result pattern (Railway Oriented Programming) for error handling is a mature functional programming pattern that has seen growing adoption in TypeScript/Node.js ecosystems. Libraries like neverthrow and fp-ts demonstrate community adoption. The pattern is well-established in Rust and functional languages, with demonstrated production viability in TypeScript. Expected vigencia: 3-5 years as a pattern; specific library choices may evolve as the ecosystem matures.

## Current Sources

- neverthrow documentation — https://neverthrow.dev, consulted 2026-06-20.
- Scott Wlaschin's Railway Oriented Programming — https://fsharpforfunandprofit.com/rop, consulted 2026-06-20.
- TypeScript error handling best practices — https://www.typescriptlang.org, consulted 2026-06-20.

---
[Back to Index](./README.md)
