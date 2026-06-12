# [ADR 0030](0030-api-gateway-kong-vs-nestjs.md): API Gateway Strategy - Kong Edge vs NestJS BFF

## Status
Approved

## Date
2026-05-10

## Context
Utilizing Node.js application threads to perform pure network-level infrastructure routing, massive volume rate-limiting, or generic SSL termination wastes single-threaded event loops on overhead, degrading critical application speed. Conversely, pushing complex API payload merges or recursive database aggregates into raw proxy Lua scripts creates operational gridlock.

## Decision
Formalize a rigid **Two-Tier Distributed Gateway Model** to correctly decouple infrastructure from orchestration:

1. **Tier 1 - Edge Gateway (Kong OSS)**: High-throughput NGINX-based barrier. Sits on the literal public cluster perimeter. Manages only non-functional transversal rules: SSL, API key throttling, simple JWT origin signature validation, path forwarding, and WAF rules.
2. **Tier 2 - Application Gateway (NestJS BFF)**: Custom Node logic deployed safely within Tier 1 security zone. Responsible for composing heterogeneous data responses, stripping PII for generic UI formats, tailoring device payloads, and managing user cookie mechanics.

### Updated Two-Tier Architecture

```mermaid
graph TD
 U["Public Clients (Mobile / Web)"] -->|TLS/HTTP| K["[Tier 1] Kong Edge Gateway"]
 
 subgraph SecureCluster["Protected Network"]
 K -->|Forward| W["[Tier 2] NestJS Web BFF"]
 K -->|Forward| M["[Tier 2] NestJS Mobile BFF"]
 
 W --> API["Reference Platform Core"]
 W --> TMS["Transport Service"]
 M --> API
 end
```

## Consequences

### Positive
- Separates raw binary concerns from logical aggregation. Node doesn't waste cycles blocking DDOS/Spams.
- Extreme throughput scale capability. NGINX core comfortably eats traffic volumes Node alone cannot.
- Improves backend isolation (Tier 1 explicitly shields Tier 2).

### Negative
- Adds a second hop latency variable (typically negligible <1ms overhead if deployed correctly).
- Introduces Kong management operational stack lifecycle.

## References
- [ADR-0008: Progressive BFF Patterns](../../adrs/nodejs/0008-progressive-multimodule-evolution-gateway-bff.md)
- [ADR-0027: Dual Protocol Edge](../../adrs/nodejs/0027-dual-protocol-rest-grpc-api-gateway.md)





## Objective and Scope

Historical backfill: Address the architectural tension where utilizing Node, establishing a standard boundary.

## Options Considered

- **Selected:** API Gateway Strategy - Kong Edge vs NestJS BFF
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [ADR-0008: Progressive BFF Patterns](../../adrs/nodejs/0008-progressive-multimodule-evolution-gateway-bff.md)
- [ADR-0027: Dual Protocol Edge](../../adrs/nodejs/0027-dual-protocol-rest-grpc-api-gateway.md)

---
[Back to Index](./README.md)
