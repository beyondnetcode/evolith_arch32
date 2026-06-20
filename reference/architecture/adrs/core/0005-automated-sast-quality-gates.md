# [ADR 0005](0005-automated-sast-quality-gates.md): Automated SAST Quality Gates in CI/CD

## Status
Approved

## Date
2026-05-08

## Context and Problem
Security vulnerabilities introduced via code (SQL injection, prototype pollution, insecure deserialization) are frequently missed in manual code reviews. Additionally, third-party dependencies can introduce known CVEs that go undetected without automated scanning. Security must be enforced mechanically, not left to human review.

## Objective and Scope
Establish a mandatory capability for Automated Static Application Security Testing (SAST) as a quality gate in all CI/CD pipelines across all stacks.

## Options Considered
- **Selected:** Automated SAST Quality Gates in CI/CD
- **Others:** Manual security reviews (rejected due to inconsistency and scale).

## Decision and Rationale
Integrate **Automated SAST and Dependency Vulnerability Scanning** as mandatory quality gates in the CI/CD pipeline for all repositories.

**Pipeline gates:**
1. **SAST Static Analysis** - Runs on every pull request. Scans for OWASP Top 10 vulnerability patterns in source code. PRs with `High` or `Critical` findings are blocked from merging. *(Example implementation: GitHub CodeQL)*.
2. **Dependency Vulnerability Scan** - A dependency audit runs in CI. Any dependency with a `High` or `Critical` CVE blocks the pipeline. *(Example implementation: npm audit / dotnet list package --vulnerable)*.
3. **Secret Detection** - Secret scanning is enabled on the repository to detect accidentally committed API keys or credentials.

**SLA:** All `Critical` findings must be resolved within 24 hours. `High` findings within 72 hours.

## Evidence and Evaluation Criteria
Evaluated against general architectural principles of maintainability and security. Automated mechanical enforcement guarantees baseline security posture before code enters main branches.

## Consequences, Risks, and Trade-offs

### Positive
- Security vulnerabilities are caught at PR time, before reaching any environment.
- Creates a documented audit trail of security decisions for compliance requirements.

### Negative
- SAST scans add duration (2-5 minutes) to the CI pipeline.
- False positives require manual suppression with documented justification comments.

## References
- None

## Related Decisions and Standards
- [ADR-0009: Strict Dependency Pinning](../../adrs/core/0009-strict-dependency-pinning-vulnerability-management.md)

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
