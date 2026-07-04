# Microservices — Runbooks Guide

> **Bilingual Navigation:** [English](./runbooks.md) | [Español](./runbooks.es.md)

**Owner:** Architecture Board
**Topology:** Microservices

## Runbook 1: Service Deployment

**Trigger:** New version ready for production release.

1. Verify contract tests pass for all consumer-provider pairs (**MS-R05**).
2. Confirm SLO dashboard shows healthy error budget (**MS-R07**).
3. Run canary deployment (10% traffic) and monitor for 15 minutes.
4. Check error rates, latency p99, and circuit breaker states.
5. If healthy, promote to full rollout. If not, rollback immediately.
6. Update service catalog with new version and deployment timestamp.

## Runbook 2: Data Migration

**Trigger:** Service extraction requiring database migration.

1. Create the new service's database and schema.
2. Deploy the new service in read-only mode against the old database.
3. Backfill historical data from the old database to the new one.
4. Enable dual-write: writes go to both old and new databases.
5. Verify data consistency with checksums and row counts.
6. Switch reads to the new service. Monitor for discrepancies.
7. Cut over writes to the new service. Stop writes to old database.
8. Decommission old database access (**MS-R06**).

## Runbook 3: Cascading Failure Response

**Trigger:** Multiple services reporting elevated error rates.

1. Identify the root-cause service from trace analysis.
2. Check if circuit breakers have tripped on dependent services.
3. Enable fallback responses for affected non-critical paths (**MS-R04**).
4. Isolate the failing service using bulkhead controls (**MS-R03**).
5. Scale healthy upstream services if capacity is degraded.
6. Communicate status via incident channel. Update status page.
7. Post-resolution: review timeout configurations and retry budgets.

## Runbook 4: Service Mesh Troubleshooting

**Trigger:** Intermittent connectivity, mTLS handshake failures, or routing anomalies.

1. Verify sidecar injection is active on affected pods.
2. Check mTLS certificate rotation status in the mesh control plane.
3. Inspect authorization policies for overly restrictive rules.
4. Review Envoy proxy logs for connection errors or timeouts.
5. Validate DNS resolution within the mesh for affected services.
6. If mesh is healthy, check upstream/downstream service health independently.

## Runbook 5: Contract Breaking Change

**Trigger:** A provider service needs to make a breaking API change.

1. Publish the new API version with the breaking change documented.
2. Notify all registered consumers via contract registry.
3. Provide a migration guide and timeline (minimum one release cycle).
4. Run Pact verification to confirm consumer compatibility.
5. Deploy the new version alongside the old version (dual-version).
6. After consumer migration, deprecate the old version with sunset header.
7. Remove the old version after the deprecation period.

## References

| Rule | Description |
|------|-------------|
| **MS-R03** | Bulkhead Isolation |
| **MS-R04** | Fallback Strategies |
| **MS-R05** | Contract Tests / Pact |
| **MS-R06** | No Shared Persistence |
| **MS-R07** | SLOs |

---
[Back to Microservices Profile](./README.md)
