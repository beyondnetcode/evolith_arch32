# [ADR 0005](0005-ci-cd-quality-codeql.md): CI/CD Security Quality Gates with CodeQL

## Status
Approved

## Date
2026-05-08

## Context
Security vulnerabilities introduced via code (SQL injection, prototype pollution, insecure deserialization) are frequently missed in manual code reviews. Additionally, third-party dependencies can introduce known CVEs that go undetected without automated scanning. Security must be enforced mechanically, not left to human review.

## Decision
Integrate **GitHub CodeQL** and **npm audit** as mandatory quality gates in the CI/CD pipeline.

**Pipeline gates:**

1. **CodeQL Static Analysis** - Runs on every pull request. Scans for OWASP Top 10 vulnerability patterns in TypeScript source code. PRs with `High` or `Critical` findings are blocked from merging.

2. **Dependency Vulnerability Scan** - `npm audit --audit-level=high` runs in CI. Any dependency with a `High` or `Critical` CVE blocks the pipeline.

3. **Secret Detection** - GitHub's built-in secret scanning is enabled on the repository to detect accidentally committed API keys or credentials.

**SLA:** All `Critical` findings must be resolved within 24 hours. `High` findings within 72 hours.

## Consequences

### Positive
- Security vulnerabilities are caught at PR time, before reaching any environment.
- Zero additional infrastructure cost - CodeQL is free for public and GitHub Team repositories.
- Creates a documented audit trail of security decisions for compliance requirements.

### Negative
- CodeQL scans add approximately 2-5 minutes to CI pipeline duration.
- False positives require manual suppression with documented justification comments.

## References
- [GitHub CodeQL Documentation](https://docs.github.com/en/code-security/code-scanning)
- [ADR-0009: Strict Dependency Pinning](../../adrs/core/0009-strict-dependency-pinning-vulnerability-management.md)





## Objective and Scope

Historical backfill: Address the architectural tension where security vulnerabilities introduced via code (SQL injection, prototype pollution, insecure deserialization) are frequently missed in manual code reviews, establishing a standard boundary.

## Options Considered

- **Selected:** CI/CD Security Quality Gates with CodeQL
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [GitHub CodeQL Documentation](https://docs.github.com/en/code-security/code-scanning)
- [ADR-0009: Strict Dependency Pinning](../../adrs/core/0009-strict-dependency-pinning-vulnerability-management.md)

---
[Back to Index](./README.md)
