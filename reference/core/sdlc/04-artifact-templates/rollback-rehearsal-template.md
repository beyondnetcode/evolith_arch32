# Template: Rollback Rehearsal

> **Bilingual navigation:** [Versión en Español](./rollback-rehearsal-template.es.md)
> **Phase:** 5 — Delivery and Operations
> **Exit gate:** Production Live (Rollback Validated)
> **Schema:** [rollback-rehearsal.schema.json](../../../../rulesets/schema/rollback-rehearsal.schema.json)
> **Parent:** [Artifact Templates](./README.md)

---

## Purpose

The Rollback Rehearsal is the formal record that a rollback was executed successfully against a non-production environment mirroring production topology. It proves the rollback procedure works before cutover and is cited by the [Phase 5 — Zero-Downtime Release Playbook](../01-playbooks/zero-downtime-release.md).

---

## Authoring Rules

- Rehearsal must run against a staging or pre-production environment, not production.
- Every step in the rollback plan must be executed in order; skipped steps invalidate the evidence.
- Capture wall-clock time from rollback initiation to first healthy signal; compare against the rollback budget.
- If the rehearsal fails or exceeds the budget, the release must not proceed until remediation is demonstrated.

---

## Required Sections

| Section | Notes |
|---|---|
| Deployment Context | Release version, environment name, rehearsal timestamp (ISO 8601). |
| Rollback Strategy | Explicitly select Blue/Green or Canary and state why. |
| Rollback Steps | Numbered checklist executed during the rehearsal. |
| Rollback Budget | Maximum allowed time and actual wall-clock time observed. |
| Witness Sign-off | Name, role, and date of the person who witnessed the rehearsal. |
| Evidence Links | Links to deployment logs, dashboards, and screenshots proving rollback succeeded. |

---

## Markdown Skeleton

```markdown
# Rollback Rehearsal — [RC-X.Y.Z]

## Deployment Context
- Release version: X.Y.Z
- Environment: staging / pre-production
- Rehearsal timestamp: YYYY-MM-DDThh:mm:ss±hh:mm

## Rollback Strategy
- Strategy: Blue/Green | Canary
- Justification: [Why this strategy was selected]

## Rollback Steps
1. [ ] Identify trigger condition for rollback
2. [ ] Execute rollback command / procedure
3. [ ] Verify previous version is serving traffic
4. [ ] Confirm database schema compatibility
5. [ ] Validate health checks passing
6. [ ] Notify stakeholders of rollback completion

## Rollback Budget
| Metric | Budget | Actual |
|---|---|---|
| Max time to rollback | … min | … min |
| Time to first healthy signal | — | … sec |
| Time to full traffic restoration | — | … min |

## Witness Sign-off
- Name:
- Role:
- Date:

## Evidence Links
- Deployment log: [link]
- Monitoring dashboard: [link]
- Screenshot of healthy state: [link]
```

---

## Worked Example: Blue/Green Rollback

```markdown
# Rollback Rehearsal — RC-2.4.0

## Deployment Context
- Release version: 2.4.0
- Environment: staging-us-east-1
- Rehearsal timestamp: 2026-06-20T14:30:00-04:00

## Rollback Strategy
- Strategy: Blue/Green
- Justification: Stateless web tier with shared database; instant cutover via load balancer target group swap.

## Rollback Steps
1. [x] Confirm trigger: p95 latency exceeded 800ms on canary group
2. [x] Executed `aws elbv2 modify-rule` to shift target group from green → blue
3. [x] Verified blue target group returning 200 on /health within 4s
4. [x] Confirmed database schema is backward-compatible (no new columns required)
5. [x] Grafana dashboard confirms error rate < 0.1%
6. [x] PagerDuty incident resolved; Slack #release-ops notified

## Rollback Budget
| Metric | Budget | Actual |
|---|---|---|
| Max time to rollback | 5 min | 38 sec |
| Time to first healthy signal | — | 4 sec |
| Time to full traffic restoration | — | 38 sec |

## Witness Sign-off
- Name: Maria Chen
- Role: SRE Lead
- Date: 2026-06-20

## Evidence Links
- Deployment log: https://grafana.internal/d/rollback-2.4.0
- Monitoring dashboard: https://grafana.internal/d/prod-overview
- Screenshot: https://drive.google.com/file/d/abc123
```

---

## Worked Example: Canary Rollback

```markdown
# Rollback Rehearsal — RC-3.1.2

## Deployment Context
- Release version: 3.1.2
- Environment: staging-eu-west-1
- Rehearsal timestamp: 2026-06-21T09:15:00+01:00

## Rollback Strategy
- Strategy: Canary
- Justification: Long-lived gRPC connections with in-flight state; gradual traffic shift allows connection draining.

## Rollback Steps
1. [x] Confirm trigger: error rate on 5% canary exceeded 2% threshold
2. [x] Executed `kubectl set image` to revert canary pods to previous image tag
3. [x] Verified canary pods reached Ready state with previous version
4. [x] Confirmed gRPC connection pool re-established (no UNAVAILABLE responses)
5. [x] Prometheus alert `CanaryErrorRateHigh` resolved within 90s
6. [x] Release coordinator notified via incident channel

## Rollback Budget
| Metric | Budget | Actual |
|---|---|---|
| Max time to rollback | 10 min | 2 min 15 sec |
| Time to first healthy signal | — | 45 sec |
| Time to full traffic restoration | — | 2 min 15 sec |

## Witness Sign-off
- Name: Lucas Eriksson
- Role: Platform Engineer
- Date: 2026-06-21

## Evidence Links
- Deployment log: https://grafana.internal/d/canary-3.1.2
- Monitoring dashboard: https://grafana.internal/d/grpc-overview
- Screenshot: https://drive.google.com/file/d/def456
```

---

## Related Documents

| Document | Purpose |
|---|---|
| [Zero-Downtime Release Playbook](../01-playbooks/zero-downtime-release.md) | Procedural gate that consumes this evidence. |
| [Release Notes Template](./release-notes-template.md) | Production deployment record referencing rollback readiness. |
| [`phase-gates.rules.json`](../../../../rulesets/sdlc/phase-gates.rules.json) | Phase 5 `Rollback Rehearsal` evidence entry references this template. |
