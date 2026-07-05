# Provider Profile: GitHub Actions (CI/CD)

> **Bilingual navigation:** [Versión en Español](./github-actions-profile.es.md)

**Category:** Continuous Integration & Deployment (`ci-cd`)
**Provider:** GitHub Actions (Microsoft)
**Profile Status:** Active / Default

## 1. Capability Coverage
GitHub Actions provides CI/CD pipeline automation triggered by repository events.
It satisfies the following core CI/CD capabilities:
- Automated build, test, and packaging pipelines
- Matrix matrix execution strategies
- Environment-specific deployment jobs
- Secret injection and OIDC federation
- Reusable workflows and composite actions

## 2. Limitations and Gaps
- Action executions have maximum duration limits.
- UI for complex pipeline visualization (e.g., DAGs) is limited compared to dedicated deployment tools.
- Granular permissions for self-hosted runners require strict network isolation.

## 3. Deployment Modes
- **Supported:** GitHub-hosted runners, Self-hosted runners.
- **Default:** GitHub-hosted runners for standard workloads; Self-hosted runners for tasks requiring VPC access or specialized hardware.

## 4. Licensing and Redistribution Constraints
- Usage is billed per minute for private repositories on GitHub-hosted runners.
- Self-hosted runners are free but incur external compute costs.
- Custom actions should be audited for open-source license compliance.

## 5. Tenant Isolation and Data Residency
- Workflows run in ephemeral VMs (GitHub-hosted).
- Self-hosted runners must be configured as ephemeral to prevent cross-tenant/cross-job contamination.

## 6. Security and Compliance Considerations
- Prefer OpenID Connect (OIDC) over long-lived secrets for cloud authentication.
- Third-party actions must be pinned to specific commit SHAs to prevent supply-chain attacks.
- Environments must use protection rules (required reviewers) for production deployments.

## 7. Adapter and ACL Mapping
Evolith CI/CD abstraction (`IPipelineEngine`) maps GitHub Actions workflow dispatches, run statuses, and artifact downloads via the GitHub API.

## 8. Evidence Produced
- Workflow run ID and URL
- Step execution logs
- Build artifacts (packaged binaries, Docker images)
- Environment approval records

## 9. Replaceability and Migration
GitHub Actions can be replaced by GitLab CI, Azure Pipelines, or Jenkins.
**Migration Path:**
1. Translate `.github/workflows/` YAML syntax to the target engine's format.
2. Replace third-party GitHub Actions with equivalent scripts or plugins in the new environment.
3. Update OIDC trust policies in cloud providers.

## 10. Current Sources and Official References
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Security Hardening for GitHub Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)

## 11. ADRs
- None specific to this provider.
