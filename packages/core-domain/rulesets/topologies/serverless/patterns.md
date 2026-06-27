# Serverless — Patterns Guide

> **Bilingual Navigation:** [English](./patterns.md) | [Español](./patterns.es.md)

**Owner:** Platform Engineering
**Topology:** Serverless

---

## Fan-Out / Fan-In

Use fan-out to distribute work across multiple parallel function invocations. Aggregate results with a fan-in function or a state machine. Ensure each parallel branch is idempotent. Monitor total pipeline latency against the 1500 ms budget.

## Step Functions / Workflows

Orchestrate multi-step processes with state machines (SV-R01). Define explicit states, transitions, and error handlers. Persist workflow state externally to survive function restarts. Use visual workflows for complex business logic that exceeds a single function.

## Event Filtering

Filter events at the source to reduce unnecessary invocations. Use event bus rules or topic subscriptions for selective delivery. Avoid processing irrelevant events inside function logic. Measure filtering effectiveness by tracking invocation-to-useful-work ratio.

## Function Composition

Compose small, single-purpose functions into higher-order workflows. Keep composition boundaries clean: each function owns one domain capability. Use async messaging for inter-function communication. Avoid deep synchronous call chains that increase latency and cold start exposure.

## Backend-for-Frontend (BFF)

Implement BFF functions to aggregate backend services for specific clients. Tailor response payloads per frontend to reduce over-fetching. Keep BFF functions thin — they compose, they don't transform business logic. Cache BFF responses for read-heavy patterns.

## Scheduled Triggers

Use cron-based triggers for periodic workloads. Align schedule granularity with business needs (minute, hour, day). Implement backfill logic for missed schedules. Monitor schedule drift and alert on missed invocations.

---

[Back to Serverless Profile](./README.md)
