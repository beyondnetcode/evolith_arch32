# Serverless — Security Guide

> **Bilingual Navigation:** [English](./security.md) | [Español](./security.es.md)

**Owner:** Platform Engineering
**Topology:** Serverless

---

## IAM Roles Per Function

Apply least-privilege IAM roles to each function. No function shares an IAM role with another unless their permission sets are identical. Rotate credentials automatically. Audit role assignments quarterly.

## VPC Isolation

Deploy functions into private subnets when accessing internal resources. Use security groups to restrict egress. Avoid public subnets for data-plane functions. Monitor VPC flow logs for anomalous traffic patterns.

## Secret Management

Never embed secrets in deployment packages or environment variables in plaintext. Use a managed secrets store (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager). Rotate secrets on a defined schedule. Cache secrets in-memory with short TTL to reduce store calls.

## Network Security (SV-SEC-01)

Enforce network segmentation between function layers. Block all inbound internet access unless explicitly required. Use WAF rules at API Gateway level. Validate and sanitize all external inputs at the function boundary.

## Mutual TLS (SV-SEC-02)

Implement mTLS for service-to-service communication in distributed topologies. Use a shared certificate authority or managed mTLS provider. Validate client certificates at the function gateway. Rotate certificates on a 90-day cycle.

## Runtime Hardening

Use minimal base images for container-based functions. Apply OS-level patches promptly. Disable unused language features and runtimes. Scan deployment packages for known vulnerabilities before publishing.

---

[Back to Serverless Profile](./README.md)
