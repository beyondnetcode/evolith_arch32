# Provider Profile: CodeQL & Trivy (Security)

> **Bilingual navigation:** [Versión en Español](./codeql-trivy-profile.es.md)

**Category:** Security Scanning (`security`)
**Provider:** GitHub (CodeQL) / Aqua Security (Trivy)
**Profile Status:** Active / Default

## 1. Capability Coverage
CodeQL and Trivy are used in tandem to provide comprehensive security scanning across source code, dependencies, and containers.
They satisfy the following core security capabilities:
- Static Application Security Testing (SAST) via CodeQL.
- Software Composition Analysis (SCA) via Trivy.
- Container vulnerability scanning via Trivy.
- Secret detection (Trivy/GitHub Advanced Security).
- SBOM (Software Bill of Materials) generation.

## 2. Limitations and Gaps
- CodeQL build time can be significant for large compiled codebases.
- Trivy primarily relies on open-source vulnerability databases which may have a slight delay compared to proprietary enterprise feeds.

## 3. Deployment Modes
- **Supported:** CLI execution in CI/CD pipelines, IDE plugins.
- **Default:** Integrated directly into GitHub Actions workflows.

## 4. Licensing and Redistribution Constraints
- **CodeQL:** Free for open-source repositories on GitHub. Private repositories require GitHub Advanced Security licenses.
- **Trivy:** Apache License 2.0 (Open Source).

## 5. Tenant Isolation and Data Residency
- Scanning occurs ephemerally within the CI/CD runner.
- Security reports (SARIF files) are stored in the SCM platform (e.g., GitHub Advanced Security), subject to the platform's data residency policies.

## 6. Security and Compliance Considerations
- SAST/SCA scanners must run on every Pull Request targeting the main branch.
- Critical and High vulnerabilities must fail the build automatically.
- SARIF outputs must be retained as evidence for SDLC compliance gates.

## 7. Adapter and ACL Mapping
Evolith CI/CD pipelines execute these tools and parse their outputs into standard SDLC `SecurityEvidence` records, decoupling the exact scanner from the compliance gate validation.

## 8. Evidence Produced
- SARIF (Static Analysis Results Interchange Format) files.
- CycloneDX/SPDX SBOM files.
- Exit codes reflecting policy violations.

## 9. Replaceability and Migration
These tools can be replaced by alternatives like SonarQube, Snyk, or Checkmarx.
**Migration Path:**
1. Replace CodeQL/Trivy CLI calls in the CI/CD pipelines with the target tool's CLI.
2. Ensure the new tool can export results in SARIF format for GitHub integration.
3. Update the SDLC compliance gates if they parse tool-specific SBOM formats.

## 10. Current Sources and Official References
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [Trivy Documentation](https://aquasecurity.github.io/trivy/)

## 11. ADRs
- None specific to this provider combination.
