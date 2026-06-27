# Security Policy

> **Bilingual Navigation:** [Versión en Español](./SECURITY.es.md)

The Evolith maintainers take the security of the framework and its execution
surfaces (CLI, MCP server, and Service CORE API) seriously. This document
explains which versions receive security updates and how to report a
vulnerability responsibly.

## Supported Versions

Security fixes are applied to the latest minor release line. Older lines do not
receive backports; please upgrade to a supported version before reporting.

| Version | Supported          | Notes                                  |
| ------- | ------------------ | -------------------------------------- |
| 1.1.x   | :white_check_mark: | Current stable line — actively patched |
| 1.0.x   | :white_check_mark: | Critical fixes only                    |
| < 1.0   | :x:                | Pre-release; not supported             |

## Reporting a Vulnerability

**Please do not open public GitHub issues, pull requests, or discussions for
security vulnerabilities.** Public disclosure before a fix is available puts
all users at risk.

Use one of the private channels below:

1. **GitHub Private Vulnerability Reporting (preferred).** Go to the
   repository's **Security → Report a vulnerability** tab
   (<https://github.com/beyondnetcode/evolith_arch32/security/advisories/new>).
   This opens a private advisory visible only to you and the maintainers.
2. **Email.** Write to **beyondnet.peru@gmail.com** with the subject line
   `[SECURITY] Evolith — <short summary>`. If you wish to encrypt the report,
   request the maintainer's public key in a first contact message containing no
   sensitive details.

### What to include

To help us triage quickly, please provide:

- A description of the vulnerability and its impact.
- The affected component (CLI, MCP server, Core API, a specific ruleset/policy,
  a dependency) and version (`1.1.0`, commit SHA, or branch).
- Step-by-step reproduction instructions or a proof of concept.
- Any known mitigations or suggested fixes.

### Scope

**In scope:** the Evolith source code in this repository — `sdk/`, `apps/`,
`packages/`, the OPA policies and rulesets under `rulesets/`, the CI/CD harness
(`.harness/`, `.github/workflows/`), and the published `@evolith/*` packages.

**Out of scope:** third-party dependencies (report those upstream; we track them
via Dependabot and `npm audit`), issues requiring a compromised developer
machine or already-leaked credentials, and findings in example/reference
documentation that do not affect executable surfaces.

## Response Targets

These are good-faith targets for a community-maintained project, not contractual
guarantees:

| Stage                         | Target                         |
| ----------------------------- | ------------------------------ |
| Acknowledgement of report     | Within 3 business days         |
| Initial assessment / triage   | Within 7 business days         |
| Fix or mitigation for High/Critical | Within 30 days (best effort) |
| Coordinated public disclosure | After a fix is released        |

## Disclosure Process

1. You report privately through one of the channels above.
2. We confirm receipt, assess severity (CVSS-style: Low / Medium / High /
   Critical), and may ask clarifying questions.
3. We develop and test a fix on a private branch.
4. We release a patched version and publish a GitHub Security Advisory
   crediting the reporter (unless anonymity is requested).
5. We coordinate the public disclosure timeline with you.

## Recognition

We are grateful to security researchers who report responsibly. With your
consent, we will credit you in the published advisory and the `CHANGELOG.md`.

## Operational Security Posture

For reference, this project already enforces:

- Dependency scanning via Dependabot and `npm audit` (CI gate at `--audit-level=high`).
- SAST via CodeQL, container/filesystem scanning via Trivy, and secret scanning
  via gitleaks in CI (`.github/workflows/sdk-cli-ci.yml`).
- Input validation, security headers (`helmet`), rate limiting, and API-key
  authentication on the executable surfaces.
- Secrets are never committed; `.env` is git-ignored and credentials are managed
  outside the repository.
