> **Bilingual Navigation:** [Ver versión en Español](./0085-agnostic-opa-wasm-distribution.es.md)

# ADR-0085: Agnostic OPA Wasm Distribution Architecture

## Status
Accepted

## Date
2026-06-20

## Context
Evolith enforces its architectural constraints and access models via Open Policy Agent (OPA), distributing these rules as compiled WebAssembly (`policy.wasm`) bundles. 
Previously, [ADR 0099](./0099-opa-bundle-s3-distribution.md) (originally numbered 0076, renumbered to resolve a duplicate ID) prescribed an AWS S3-centric distribution model. However, mandating proprietary cloud object storage violates the Evolith tenet of vendor-agnostic portability, especially for on-premise, edge computing, or air-gapped topologies where S3 is unavailable or undesirable.

We require a standardized, non-cloud-locked mechanism to distribute OPA bundles to consuming nodes (e.g., BFFs, Agentic MCP servers, and Sidecars) reliably.

## Decision
We mandate an **Agnostic HTTP-based Distribution Architecture** for all OPA `policy.wasm` bundles. 
Instead of coupling to proprietary cloud APIs, all deployment topologies MUST support one of the following standard, self-hostable distribution patterns:

1. **Internal HTTP Artifact Server (NGINX/Apache)**:
   The simplest, most universal pattern. The CI/CD pipeline publishes the `bundle.tar.gz` to a static file server. Consuming nodes fetch it via standard `HTTPS GET`.
   
2. **Agnostic Object Storage (MinIO)**:
   For teams requiring the S3 API for tooling compatibility, they MUST use or ensure compatibility with self-hostable solutions like MinIO, guaranteeing that the architecture is not locked to AWS S3.

3. **Standard OCI Registries**:
   Since OPA natively supports downloading bundles from OCI (Open Container Initiative) compliant registries, policies may be packaged as OCI artifacts and distributed via standard registries (e.g., Docker Hub, Harbor, GHCR).

4. **NPM Registry (Node.js ecosystems)**:
   For Node.js specific targets (like our internal MCP tools), the `.wasm` file can be distributed as an internal NPM package (e.g., `@evolith/policy-bundle`) via Verdaccio or GitHub Packages.

## Consequences
### Positive
- **Vendor Independence**: Evolith can be deployed in any environment (AWS, Azure, On-Premise, Edge) without architectural modifications to the policy distribution layer.
- **Flexibility**: Teams can choose the distribution method (HTTP, OCI, or NPM) that best fits their specific infrastructure maturity.
- **Resilience**: Self-hosted solutions like MinIO or NGINX can be deployed in air-gapped environments.

### Negative
- **Infrastructure Overhead**: On-premise teams must maintain their own highly available NGINX or MinIO clusters to serve the bundles.
- **Tooling Adjustments**: CI pipelines must be abstracted to push artifacts to multiple potential targets rather than hardcoding AWS CLI `s3 sync` commands.

> **Agent Signature:** Architect Agent
