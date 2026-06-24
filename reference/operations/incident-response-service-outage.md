# Service Outage Response Playbook

> **Bilingual Navigation:** [Versión en Español](./incident-response-service-outage.es.md)

Operational playbook for responding to unplanned service outages across the Evolith platform stack.

## Severity Classification

| Level | Name | Response Time | Escalation |
|-------|------|---------------|------------|
| P1 | Critical — Full platform down | 15 minutes | CTO, VP Engineering |
| P2 | High — Major feature degraded | 1 hour | Engineering Lead, PO |
| P3 | Medium — Minor feature impacted | 4 hours | On-call Engineer |
| P4 | Low — Cosmetic or non-urgent | 24 hours | Team Lead |

## Communication Template

### Internal

```
[OUTAGE] P{N} — {Service} is {status}
Impact: {description of affected users/features}
Start time: {UTC timestamp}
Current status: Investigating / Identified / Mitigating / Resolved
Next update: {ETA}
Incident Commander: {name}
```

### External

```
We are currently experiencing issues with {service}. Our team is actively
working on a resolution. We will provide updates every {interval} on our
status page. We apologize for the inconvenience.
```

## Containment Steps

1. Acknowledge the alert and open an incident channel.
2. Declare severity level and assign Incident Commander.
3. Identify the affected service(s) and blast radius.
4. Check infrastructure health: database, cache, message broker.
5. Review recent deployments and configuration changes.
6. If deployment-related, initiate rollback per Production Rollback playbook.
7. Notify stakeholders per communication template.

## Recovery Procedures

1. Restore the failing component (restart, scale, or redeploy).
2. Verify data consistency and integrity post-recovery.
3. Run smoke tests against affected endpoints.
4. Monitor error rates and latency for 30 minutes post-recovery.
5. Close the incident once stability is confirmed.
6. Schedule post-mortem within 48 hours.

## Post-Mortem Requirements

- [ ] Timeline of events (UTC)
- [ ] Root cause analysis with 5-Whys
- [ ] Impact summary (users affected, duration, data impact)
- [ ] Action items with owners and due dates
- [ ] Detection gap analysis (why wasn't this caught earlier?)
- [ ] Runbook updates if response was ad-hoc
- [ ] Shared with engineering team within 5 business days

## References

- [ADR-0011 — Fault Tolerance & Resiliency Patterns](../architecture/adrs/core/0011-fault-tolerance-resiliency-patterns.md)
- [ADR-0068 — Documentation Release Gitflow](../architecture/adrs/core/0068-documentation-release-gitflow.md)
