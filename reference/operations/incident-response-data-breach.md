# Data Breach Response Playbook

> **Bilingual Navigation:** [Versión en Español](./incident-response-data-breach.es.md)

Operational playbook for responding to confirmed or suspected data breaches affecting the Evolith platform.

## Severity Classification

| Level | Name | Response Time | Escalation |
|-------|------|---------------|------------|
| Critical | PII/credentials exposed externally | Immediate | CTO, Legal, DPO |
| High | Internal data exfiltration confirmed | 1 hour | Security Lead, CTO |
| Medium | Suspicious access pattern detected | 4 hours | Security Lead, Engineering Lead |
| Low | Potential policy violation | 24 hours | Team Lead, Compliance |

## Communication Template

### Regulatory Notification (if applicable)

```
To: {Supervisory Authority}
Subject: Data Breach Notification — Evolith Platform

Date of breach: {UTC timestamp}
Nature of breach: {description}
Categories of data subjects: {types}
Approximate number affected: {count}
Likely consequences: {assessment}
Measures taken: {containment actions}
DPO Contact: {name, email}
```

### Internal Escalation

```
[SECURITY INCIDENT] {Severity} — {Summary}
Data types affected: {PII, credentials, financial, etc.}
Detection method: {alert, user report, audit log}
Status: Investigating / Contained / Resolved
Regulatory notification required: Yes / No / Under review
Incident Commander: {name}
```

## Containment Steps

1. Declare the security incident immediately.
2. Isolate affected systems from the network (do NOT power off).
3. Preserve all evidence: logs, memory dumps, network captures.
4. Revoke and rotate potentially compromised credentials.
5. Block identified attack vectors at the network perimeter.
6. Engage Legal and Data Protection Officer if PII is involved.
7. Document all actions with timestamps for the forensic trail.

## Recovery Procedures

1. Patch the exploited vulnerability or misconfiguration.
2. Rotate all credentials that may have been exposed.
3. Verify data integrity across affected systems.
4. Restore from clean backups if data corruption is confirmed.
5. Implement additional monitoring on affected surfaces.
6. Conduct threat hunting to confirm no persistence mechanisms remain.
7. Notify affected users if PII exposure is confirmed.
8. File regulatory notifications within required timeframes (72h GDPR).

## Post-Mortem Requirements

- [ ] Forensic timeline with chain of custody
- [ ] Attack vector analysis (how the breach occurred)
- [ ] Data scope assessment (what was accessed/exfiltrated)
- [ ] Regulatory compliance checklist
- [ ] Credential rotation evidence
- [ ] Enhanced monitoring actions
- [ ] Policy and control improvements
- [ ] Lessons learned shared with full engineering team

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [ADR-0011 — Fault Tolerance & Resiliency Patterns](../architecture/adrs/core/0011-fault-tolerance-resiliency-patterns.md)
- [ADR-0028 — Self-Hosted Hybrid Infrastructure](../architecture/adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.md)
