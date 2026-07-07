# Production Rollback Response Playbook

> **Bilingual Navigation:** [Versión en Español](./incident-response-production-rollback.es.md)

Operational playbook for performing emergency or planned rollbacks of production deployments across the Evolith platform.

## Severity Classification

| Blast Radius | Name | Response Time | Escalation |
|-------------|------|---------------|------------|
| > 50% users | Full Service Rollback | 15 minutes | CTO, Engineering Lead, PO |
| 10 – 50% users | Partial Service Rollback | 1 hour | Engineering Lead, PO |
| < 10% users | Single Feature Rollback | 4 hours | Team Lead |

## Communication Template

### Internal

```
[ROLLBACK] {Scope} — {Service/Feature}
Trigger: {bug / performance regression / data corruption / security}
Deployment being rolled back: {commit SHA or version}
Target rollback state: {previous version}
ETA to completion: {time}
Impact: {description}
Rollback Owner: {name}
```

### External (if user-visible)

```
We have identified an issue with {feature/service} and are rolling back to a
stable version. Some users may experience temporary disruption. We expect
full resolution within {ETA}. We apologize for the inconvenience.
```

## Containment Steps

1. Identify the failing deployment: version, timestamp, and change scope.
2. Assess the blast radius: which users, services, and data flows are affected.
3. Determine rollback type: full service, partial, or single feature flag.
4. Freeze all other deployments until rollback is complete.
5. Notify stakeholders per communication template.
6. Capture current state (logs, metrics, database state) before rollback.

## Recovery Procedures

### Decision Tree

1. **Feature flag available?** → Disable the flag; no deployment needed.
2. **Database migration involved?** → Assess backward compatibility; may need a migration rollback script.
3. **API breaking change?** → Roll back to previous version; coordinate with consumers.
4. **No migration, no breaking change?** → Standard container/service rollback.

### Execution

1. Execute the rollback via CI/CD pipeline or manual deployment.
2. Verify service health endpoints return expected status codes.
3. Run smoke tests against critical user journeys.
4. Verify data consistency (check for partial writes or orphaned records).
5. Monitor error rates and latency for 30 minutes post-rollback.
6. Confirm with stakeholders that the issue is resolved.
7. Close the rollback incident.

## Post-Mortem Requirements

- [ ] Deployment timeline (what was deployed, when, by whom)
- [ ] Failure analysis (what broke and why)
- [ ] Rollback effectiveness (was it complete? any residual issues?)
- [ ] Data impact assessment (any data corruption or loss?)
- [ ] Deployment process improvements
- [ ] Testing gaps that allowed the issue through
- [ ] Feature flag strategy review (if applicable)

## References

- [ADR-0068 — Documentation Release Gitflow](../../reference/core/architecture/adrs/core/0068-documentation-release-gitflow.md)
- [ADR-0050 — Gitflow Branching Strategy](../../reference/core/architecture/adrs/core/0050-gitflow-branching-strategy.md)
- [ADR-0025 — Feature Flag Provider Abstraction](../../reference/core/architecture/adrs/core/0025-feature-flag-provider-abstraction.md)
