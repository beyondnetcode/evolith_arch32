# Platform and Provider Guidance

> **Bilingual navigation:** [Versión en Español](./README.es.md)

This domain contains guidance, evaluations, adapter designs, deployment profiles, licensing analysis, and ADRs that mention a specific platform, vendor, technology, or product.

Platform documents implement Core contracts and product requirements. They do not redefine Evolith Core or SDLC Governance.

## Goal and Objectives

> **Goal:** isolate every named technology, vendor, and provider decision behind replaceable, provider-neutral contracts.

**Objectives:**

- Keep vendor evaluations, adapter designs, licensing analysis, and deployment profiles out of the Core corpus.
- Require each provider profile to document capabilities, limits, isolation, and migration paths before adoption.
- Guarantee that any default provider can be replaced without rewriting Core or product contracts.

## Categories

Planned provider categories, ordered by how early a product needs them (work management first, collaboration last). Each will hold provider profiles once documented:

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| `work-management/` | Jira, Azure DevOps, GitHub Issues, Linear, and alternatives | Abstract work-management providers | Planned category | No |
| `agents/` | Claude, OpenAI, Gemini, local models, and future providers | Abstract AI agent providers | Planned category | No |
| `observability/` | Langfuse, OpenTelemetry, and alternatives | Abstract observability providers | Planned category | No |
| `analytics/` | Apache Superset, Grafana, Power BI, and alternatives | Abstract analytics providers | Planned category | No |
| `scm/` | GitHub, GitLab, Azure Repos, Bitbucket | Abstract source-control providers | Planned category | No |
| `ci-cd/` | GitHub Actions, Azure Pipelines, GitLab CI, Jenkins, Tekton | Abstract CI/CD providers | Planned category | No |
| `testing/` | Framework-specific test providers | Abstract testing providers | Planned category | No |
| `security/` | CodeQL, Trivy, Snyk, Semgrep, and alternatives | Abstract security-scanning providers | Planned category | No |
| `deployment/` | Kubernetes, cloud, serverless, VM, and on-premise profiles | Abstract deployment targets | Planned category | No |
| `collaboration/` | Email, Teams, Slack, and alternatives | Abstract collaboration providers | Planned category | No |

## Required Content for Provider Profiles

Every provider profile should include:

- capability coverage;
- limitations and gaps;
- deployment modes;
- licensing and redistribution constraints;
- tenant isolation and data residency;
- security and compliance considerations;
- adapter and ACL mapping;
- evidence produced;
- replaceability and migration;
- current sources and official references;
- product or platform-specific ADRs when required.

## Boundary

Named vendors never become universal Core requirements. A provider may be the default for onboarding, but it must remain replaceable through a provider-neutral capability contract.

[Back to Reference Hub](../README.md)
