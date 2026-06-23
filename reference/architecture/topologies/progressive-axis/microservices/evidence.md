# Microservices — Evidence Guide

> **Bilingual Navigation:** [English](./evidence.md) | [Español](./evidence.es.md)

**Owner:** Architecture Board
**Topology:** Microservices

## DORA Metrics

Track the four DORA metrics per service: Deployment Frequency, Lead Time for Changes, Time to Restore Service, and Change Failure Rate. Publish dashboards per team. High-performing teams achieve daily deployments with < 15% change failure rate.

## SLO Compliance

Monitor **MS-R07** (SLOs) compliance for every service. Track error budget consumption rates. Generate monthly compliance reports. Escalate when any service exhausts its error budget for two consecutive periods.

## Contract Test Results

Collect **MS-R05** (Contract Tests/Pact) results in CI. Track pass/fail rates across all consumer-provider pairs. Fail the build on any contract violation. Maintain a contract compatibility matrix visible to all teams.

## Chaos Experiment Results

Log every chaos experiment with hypothesis, action, and outcome. Categorize results: passed, partially passed, or failed. Feed failures into the service resilience backlog. Publish quarterly chaos experiment summaries.

## Service Catalog

Maintain a live service catalog with: owner, domain, API versions, SLO targets, dependencies, and deployment status. The catalog is the single source of truth for service metadata. Auto-populate from service manifests where possible.

## Cost Attribution

Attribute infrastructure costs to services using resource labels. Track cost per service per month. Identify outliers for optimization. Include cost trends in quarterly architecture reviews.

## Observability Coverage

Measure observability coverage: percentage of services with distributed tracing, structured logging, and health probes. Target 100% coverage. Flag services below the threshold for remediation.

## References

| Rule | Description |
|------|-------------|
| **MS-R05** | Contract Tests / Pact |
| **MS-R07** | SLOs |

---
[Back to Microservices Profile](./README.md)
