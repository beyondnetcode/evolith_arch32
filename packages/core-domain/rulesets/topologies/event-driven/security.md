# Event-Driven — Security Guide

> **Bilingual Navigation:** [English](./security.md) | [Español](./security.es.md)

**Owner:** Architecture Board
**Topology:** Event-Driven

## Purpose

Establish security controls for event-driven architectures covering event authentication, schema validation at publish/subscribe boundaries, topic access control, payload encryption, and audit trail requirements.

## Event Authentication

- Require mutual TLS (mTLS) between producers and the broker, and between broker and consumers.
- Use short-lived tokens (JWT/OAuth2) for service-to-event authentication where mTLS is unavailable.
- Rotate credentials automatically; enforce maximum token lifetime of 1 hour.

## Schema Validation — ED-R01, ED-R06

- Validate event payloads against the registered AsyncAPI schema at publish time.
- Reject non-conforming events at the broker before they enter the topic.
- Maintain a schema registry with version history; deprecate schemas through a formal lifecycle.

## Topic Access Control

- Implement topic-level ACLs: producers may only write to authorized topics; consumers may only subscribe to authorized topics.
- Use namespace prefixes (e.g., `domain.environment.event-name`) to enforce isolation.
- Audit topic access changes; require peer review for privilege escalations.

## Payload Encryption

- Encrypt sensitive fields at the application layer before publishing (field-level encryption).
- Use broker-native encryption at rest for topic storage.
- Never embed plaintext secrets or credentials in event payloads.

## Audit Trail — ED-R08

- Log all schema registration and deregistration events.
- Record topic ACL changes with actor identity and timestamp.
- Retain audit logs for a minimum of 90 days in immutable storage.

## Composable Applicability

| Composable | Guidance |
|---|---|
| Modular Monolith | Intra-process events may skip mTLS; schema validation still required. |
| Distributed Modules | Full mTLS and ACL enforcement across module boundaries. |
| Microservices | Per-service credential scoping; topic ACL isolation. |
| Serverless | Managed broker security policies; function-level IAM binding. |
| Edge Computing | Local broker encryption; sync audit logs to central store. |

## ADR References

- **ADR-0015**: Event broker authentication and authorization model.
- **ADR-0079**: Schema governance and validation standards.

---

[Back to Event-Driven Profile](./README.md)
