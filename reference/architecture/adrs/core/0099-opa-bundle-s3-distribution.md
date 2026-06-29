# ADR-0099: OPA Bundle Distribution via S3 (MinIO)

## Status
Superseded by [ADR 0085](./0085-agnostic-opa-wasm-distribution.md)

## Date
2026-06-22

## Context
As defined in [ADR 0041 (Dual-Engine Policy Evaluation)](./0041-dual-engine-policy-evaluation.md), Evolith utilizes Open Policy Agent (OPA) to enforce architectural constraints and rules. The BFF (Backend-For-Frontend) and MCP (Model Context Protocol) components also rely on these rulesets dynamically during runtime. 

Initially, the strategy involved using a `git-sync` sidecar pattern to constantly pull the rules from the Git repository. However, in an enterprise environment scaling to hundreds of pods, continuous Git polling introduces unacceptable risks:
- High latency and Github API Rate Limiting.
- Immediate rollout of potentially broken rulesets to all pods simultaneously.
- Coupling of runtime architecture to source control uptime.

## Decision
We will adopt the **OPA Bundle API pattern** using an S3-compatible object store (MinIO).

1. **Immutable Bundles (CI/CD)**: The CI/CD pipeline (GitHub Actions) will compile the `.rego` policies and `.json` data into a compressed `bundle.tar.gz` artifact only after all validation tests pass.
2. **Centralized Distribution**: The pipeline will upload this versioned bundle to a secure bucket in MinIO (or AWS S3 / Azure Blob Storage depending on the cloud profile).
3. **Decoupled Consumption**: Containerized services running the OPA engine (such as BFF and MCP) will be configured via Helm to poll the S3 bucket periodically for new bundles using OPA's native bundle downloading capabilities.

## Consequences
### Positive
- **Highly Scalable**: S3 is optimized for massive concurrent read operations.
- **Safety**: Bundles are pre-compiled and tested before reaching production.
- **Rollback Capability**: Versioned bundles allow instantaneous reversion of rule changes without altering the Git history.
- **Decoupling**: Runtime environments do not require access or credentials to the Git repository.

### Negative
- Requires additional CI/CD pipeline steps to run `opa build` and upload artifacts to S3.
- Slight propagation delay between merging a rule to `main` and it being pulled by the pods (based on OPA polling frequency).

> **Agent Signature:** Architect Agent
