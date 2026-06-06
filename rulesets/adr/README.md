# ADR-Encoded Rules Index

Machine-readable encoding of critical ADRs as rules. These rules are automatically enforced in CI/CD pipelines.

| ADR | Rule File | Description |
|---|---|---|
| **ADR-0002** — Hexagonal Architecture | [adr-0002-hexagonal-architecture.rules.json](./adr-0002-hexagonal-architecture.rules.json) | Ports & Adapters, layer isolation, AOP in adapters only |
| **ADR-0005** — CI/CD Quality Gates | [adr-0005-cicd-quality-gates.rules.json](./adr-0005-cicd-quality-gates.rules.json) | CodeQL, dependency scan, secret detection, SLA compliance |
| **ADR-0018** — Testing Pyramid | [adr-0018-testing-pyramid.rules.json](./adr-0018-testing-pyramid.rules.json) | 70/20/10 distribution, layer thresholds, coverage >= 80% |
| **ADR-0032** — Protocol Selection | [adr-0032-protocol-selection.rules.json](./adr-0032-protocol-selection.rules.json) | gRPC internal, REST external, GraphQL BFF aggregate |
| **ADR-0040** — Multi-Runtime | [adr-0040-multi-runtime.rules.json](./adr-0040-multi-runtime.rules.json) | Runtime by workload profile, gRPC sync, RabbitMQ async |
| **ADR-0050** — GitFlow Branching | [adr-0050-gitflow-branching.rules.json](./adr-0050-gitflow-branching.rules.json) | Branch naming, protected branches, semver tags |
| **ADR-0010** — Multi-Tenancy | [adr-0010-multi-tenancy.rules.json](./adr-0010-multi-tenancy.rules.json) | Dual-layer filtering, tenant context propagation (conditional) |

---

Back to [Rulesets Hub](../README.md)