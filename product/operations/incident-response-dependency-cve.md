# Dependency CVE Response Playbook

> **Bilingual Navigation:** [Versión en Español](./incident-response-dependency-cve.es.md)

Operational playbook for responding to Common Vulnerabilities and Exposures (CVEs) discovered in third-party dependencies used by the Evolith platform.

## Severity Classification

| CVSS Range | Name | Response Time | Escalation |
|------------|------|---------------|------------|
| 9.0 – 10.0 | Critical | 24 hours | Security Lead, Engineering Lead |
| 7.0 – 8.9 | High | 72 hours | Engineering Lead |
| 4.0 – 6.9 | Medium | 7 business days | Team Lead |
| 0.1 – 3.9 | Low | 30 days | On-call Engineer |

## Communication Template

### Internal Advisory

```
[CVE ADVISORY] {Severity} — {CVE-ID}
Package: {name}@{version}
CVSS Score: {score}
Affected component(s): {service(s)}
Exploitability: {PoC available / Theoretical / Not exploitable in our config}
Patch available: {Yes — version X.Y.Z / No — workaround: ...}
Remediation deadline: {date}
Owner: {name}
```

### Stakeholder Update

```
A {severity} vulnerability ({CVE-ID}) has been identified in a third-party
dependency. Impact assessment: {summary}. We are {applying the patch /
implementing a workaround} and expect completion by {date}. No data exposure
has been identified at this time.
```

## Containment Steps

1. Identify the vulnerable dependency and version from the CVE advisory.
2. Determine which services and environments use the affected package.
3. Assess exploitability: check for public PoC, network exposure, and auth requirements.
4. Check if the vulnerability is actively exploited in the wild.
5. If Critical and actively exploited: isolate affected services immediately.
6. Review dependency graph for transitive exposure.
7. Notify stakeholders per communication template.

## Recovery Procedures

1. Check for an upstream patch or fixed version.
2. If patch available: upgrade and run full test suite.
3. If no patch: implement WAF rules, input validation, or network-level controls.
4. Rebuild containers/images with the updated dependency.
5. Deploy to staging first, verify, then promote to production.
6. Verify the CVE is resolved via vulnerability scanner post-deployment.
7. Update the dependency lock file and pin the secure version.
8. Document the remediation in the CVE tracking issue.

## Post-Mortem Requirements

- [ ] CVE details and CVSS assessment
- [ ] Affected services and environment inventory
- [ ] Time from detection to remediation
- [ ] Remediation method (patch / workaround / removal)
- [ ] Test coverage for the remediation
- [ ] Dependency management policy improvements
- [ ] Automated scanning coverage gap analysis
- [ ] Supply chain security improvements

## References

- [ADR-0025 — Feature Flag Provider Abstraction](../architecture/adrs/core/0025-feature-flag-provider-abstraction.md)
- [ADR-0011 — Fault Tolerance & Resiliency Patterns](../architecture/adrs/core/0011-fault-tolerance-resiliency-patterns.md)
- [NIST National Vulnerability Database](https://nvd.nist.gov/)
