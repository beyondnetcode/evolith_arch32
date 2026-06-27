# Serverless — Runbooks

> **Bilingual Navigation:** [English](./runbooks.md) | [Español](./runbooks.es.md)

**Owner:** Platform Engineering
**Topology:** Serverless

---

## Runbook 1: Function Deployment Failure

**Trigger:** CI/CD pipeline reports deployment error.

1. Check deployment logs for error details and stack trace.
2. Verify IAM role permissions for the deployment account.
3. Validate function configuration (handler path, runtime, memory, timeout).
4. Ensure deployment package is under 50 MB (SV-R03).
5. Re-run deployment with verbose logging enabled.
6. If persistent, rollback to the last known-good version and investigate offline.

## Runbook 2: Cold Start Latency Exceeds Budget

**Trigger:** p95 cold start latency exceeds 1000 ms (SV-R04).

1. Identify the affected function from monitoring dashboard.
2. Review deployment package size and dependencies.
3. Switch to a lighter runtime if feasible (Node.js, Python).
4. Enable provisioned concurrency for the function.
5. Profile init phase — identify heavy initialization code.
6. Move initialization outside the handler where possible.
7. Validate improvement against the 1000 ms budget.

## Runbook 3: DLQ Depth Exceeds Threshold

**Trigger:** DLQ depth exceeds zero for more than 5 minutes.

1. Identify the source function and failing event type.
2. Inspect DLQ entries for error messages and payloads.
3. Fix the root cause in the consumer function.
4. Reprocess DLQ entries via the remediation function.
5. Verify DLQ depth returns to zero.
6. Update alerting thresholds if the threshold was too sensitive.

## Runbook 4: Concurrency Limit Exceeded

**Trigger:** Function invocations returning throttling errors (429).

1. Check current concurrency usage against regional quota.
2. Identify which functions are consuming the most concurrency.
3. Increase reserved concurrency for critical functions if needed.
4. Implement or tune circuit breakers on non-critical paths.
5. Request a quota increase if sustained growth is expected.
6. Monitor for 30 minutes after remediation to confirm stability.

## Runbook 5: Function Timeout Investigation

**Trigger:** Function consistently timing out near configured timeout.

1. Review function execution logs for slow operations.
2. Check downstream service latency (database, external APIs).
3. Increase timeout if the workload genuinely requires more time.
4. Optimize code paths — reduce unnecessary I/O, batch operations.
5. Consider splitting into smaller functions if the task is too large.
6. Validate new timeout against the 1500 ms latency budget.

---

[Back to Serverless Profile](./README.md)
