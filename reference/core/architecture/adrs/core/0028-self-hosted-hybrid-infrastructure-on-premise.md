# ADR-0028: Self-Hosted, Open-Source Hybrid Infrastructure

## Status
Accepted

## Date
2026-05-09

## Context
Relying solely on locked-in serverless cloud vendors (e.g., AWS SQS, DynamoDB, Cognito) kills ability to deploy to sovereign air-gapped corporate client networks on-premise. Cloud pricing curves expand wildly under high throughput. We require absolute tech sovereignty that seamlessly mirrors across public clouds AND disconnected hardware clusters.

## Decision
Strictly govern internal tooling selection based on the **100% Open-Source, Self-Hostable, and Plug-and-Play Extensibility Principle**:

1. **Infrastructure as a Port**: NO concrete infrastructure SDK/Library from the products listed below may ever cross into Domain/Application layers. They must be strictly encapsulated behind pure TypeScript `Ports`. Swapping MinIO for AWS S3 or RabbitMQ for Kafka requires editing ONLY a single Infrastructure Adapter file.
2. **MinIO (Object Storage)**: Standardize on the S3-compatible engine. Run in local Kubernetes cluster directly.
3. **RabbitMQ (Bus)**: Drive asynchronous communication via open source AMQP brokers instead of proprietary queues.
4. **OpenBao & KeyCloak**: Handle native local secrets distribution and localized credentials pools using proven CNCF ecosystems.
5. **Direct PostgreSQL/Redis**: Drive caching and state through native v16+ engines deployed via Helm, bypassing vendor-wrapped managed DB limitations.

## Consequences

### Positive
- 100% Cloud Neutral: Code deploys anywhere from an engineer's Mac to an isolated military cluster with zero refactoring.
- Total cost transparency: Eliminates opaque transaction-based scaling bills.

### Negative
- Increases administrative overhead. Local DevOps must maintain replication, backups, and scale patching that major clouds typically handle automatically.

## References
- [ADR-0013: Cloud Topology](../../adrs/core/0013-cloud-infrastructure-topology-dr.md)
- [Stack Definition Reference](../../blueprints/tech-stack-summary.md)





## Objective and Scope

Historical backfill: Address the architectural tension where relying solely on locked-in serverless cloud vendors (e, establishing a standard boundary.

## Options Considered

- **Selected:** Self-Hosted, Open-Source Hybrid Infrastructure
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [ADR-0013: Cloud Topology](../../adrs/core/0013-cloud-infrastructure-topology-dr.md)
- [Stack Definition Reference](../../blueprints/tech-stack-summary.md)

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
