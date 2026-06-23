# Serverless — Evidence Guide

> **Bilingual Navigation:** [English](./evidence.md) | [Español](./evidence.es.md)

**Owner:** Platform Engineering
**Topology:** Serverless

---

## Validation Commands

Run infrastructure validation before every deployment:

```bash
# Validate function configurations
serverless validate --stage production

# Check IAM role permissions
aws iam simulate-principal-policy --policy-source-arn <function-arn>

# Verify VPC configuration
aws ec2 describe-security-groups --filters Name=vpc-id,Values=<vpc-id>

# Scan deployment packages for vulnerabilities
npm audit --production
```

## Invocation Metrics

Track the following per function, per day:

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| p50 latency | < 500 ms | > 800 ms |
| p95 latency | < 1000 ms | > 1200 ms |
| p99 latency | < 1500 ms | > 1500 ms |
| Error rate | < 0.1% | > 0.5% |
| Throttle count | 0 | > 0 |

## Cold Start Measurements

Sample cold start times weekly. Record init duration, runtime duration, and total duration. Compare against the 1000 ms cold start budget (SV-R04). Flag any function exceeding the budget for optimization.

## Cost Reports

Generate weekly cost reports with:

- Total invocations per function
- Total compute time (GB-seconds)
- Cost per execution (target: **1 cent**)
- Month-over-month trend
- Functions exceeding cost budget

## Compliance Evidence

Retain the following artifacts for audit:

- IAM role assignments and rotation logs
- DLQ processing records
- Deployment package vulnerability scan results
- Cold start measurement history
- Cost tracking reports

---

[Back to Serverless Profile](./README.md)
