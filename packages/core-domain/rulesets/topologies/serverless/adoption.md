# Serverless — Adoption Guide

> **Bilingual Navigation:** [English](./adoption.md) | [Español](./adoption.es.md)

**Owner:** Platform Engineering
**Topology:** Serverless

---

## Entry Criteria

Adopt serverless when all of the following are true:

- Workload is event-driven or sporadic with unpredictable traffic patterns
- Latency budget allows up to 1500 ms per invocation
- Cold start tolerance is at least 1000 ms (SV-R04)
- Team has experience with at least one cloud provider's function platform
- Organization accepts managed-service dependency

Do not adopt serverless for sustained high-throughput workloads that exceed concurrency budgets or require sub-100 ms latency.

## Function Organization

Organize functions by bounded context. Each bounded context owns its functions, events, and data. Maintain a function catalog with:

- Function name and purpose
- Owner team
- Trigger type and event schema
- SLA (latency, error rate)
- Cost budget per execution

## Local Development

Set up local emulation for rapid iteration. Use tools like SAM Local, Functions Framework, or serverless-offline. Test function-to-function integration in a staging environment. Keep local emulation aligned with production configurations.

## Readiness Checklist

- [ ] Function decomposition complete — each function has a single responsibility
- [ ] IAM roles assigned with least privilege (SV-SEC-01)
- [ ] DLQ configured for all asynchronous invocations (SV-R01)
- [ ] Deployment packages under 50 MB (SV-R03)
- [ ] Cold start profiling completed and within budget
- [ ] Monitoring and alerting configured per evidence guide
- [ ] Cost tracking tags applied to all functions
- [ ] Vendor neutrality assessed (ADR-0095)
- [ ] Runbooks documented for common failure scenarios

---

[Back to Serverless Profile](./README.md)
