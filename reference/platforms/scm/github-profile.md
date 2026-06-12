# Provider Profile: GitHub (SCM)

> **Bilingual navigation:** [Versión en Español](./github-profile.es.md)

**Category:** Source Control Management (`scm`)
**Provider:** GitHub (Microsoft)
**Profile Status:** Active / Default

## 1. Capability Coverage
GitHub acts as the primary Source Control Management (SCM) provider for Evolith products.
It satisfies the following core SCM capabilities:
- Distributed version control (Git hosting)
- Peer code review via Pull Requests
- Branch protection rules and merge criteria enforcement
- Issue tracking (basic work management integration)

## 2. Limitations and Gaps
- Advanced ALM features require GitHub Enterprise or third-party integrations.
- Webhooks delivery requires external ingress configuration.

## 3. Deployment Modes
- **Supported:** GitHub Cloud (SaaS), GitHub Enterprise Server (On-Premises).
- **Default:** GitHub Cloud.

## 4. Licensing and Redistribution Constraints
- Open source and internal repositories operate under standard GitHub TOS.
- Enterprise features (advanced branch protections, required reviews, SSO) require a GitHub Enterprise license.

## 5. Tenant Isolation and Data Residency
- Isolation is managed via GitHub Organizations and Teams.
- Data residency is subject to GitHub Cloud geographic locations unless using GitHub Enterprise Server deployed within an isolated boundary.

## 6. Security and Compliance Considerations
- MFA must be enforced at the Organization level for all developers.
- Fine-grained Personal Access Tokens (PATs) or GitHub Apps are preferred over classic PATs for CI/CD integration.
- Commit signature verification should be enabled for critical repositories.

## 7. Adapter and ACL Mapping
Evolith integrates with GitHub through the `Evolith SCM Adapter`, abstracting GitHub-specific APIs (Octokit/GraphQL) behind generic interfaces (e.g., `IRepositoryProvider`, `IPullRequestReviewer`).

## 8. Evidence Produced
- Immutable commit hashes (SHA-1/SHA-256)
- Signed commit evidence
- Pull Request approval events (recorded via webhooks)
- Branch protection compliance statuses

## 9. Replaceability and Migration
GitHub can be replaced by any provider supporting standard Git operations (GitLab, Bitbucket, Azure Repos).
**Migration Path:**
1. Git mirror clone and push to the new provider.
2. Re-implement the `IScmAdapter` for the target platform's REST/GraphQL API.
3. Migrate CI/CD pipeline triggers.

## 10. Current Sources and Official References
- [GitHub Documentation](https://docs.github.com/)
- [GitHub REST API](https://docs.github.com/en/rest)

## 11. ADRs
- None specific to this provider; governed by Core SCM selection rules.
