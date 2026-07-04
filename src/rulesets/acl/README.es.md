# Anti-Corruption Layer (ACL) Rules — Index

> **Navegación Bilingüe:** [English Version](./README.md)

## Overview

The Anti-Corruption Layer ruleset governs all integrations with external systems (Jira, Trello, Linear, GitHub, Confluence, etc.). ACLs normalize and validate external data against Evolith Core artifacts, preventing external chaos from contaminating governance.

## Files

| File | Description |
|------|-------------|
| `anti-corruption-layer.rules.json` | Machine-readable ACL rules (EN) |
| `anti-corruption-layer.rules.es.json` | Machine-readable ACL rules (ES) |

## Principles

| ID | Principle | Severity | Blocking |
|----|-----------|----------|----------|
| **ACL-01** | Schema Validation Before Ingestion | MUST | Yes |
| **ACL-02** | Transformation Traceability | MUST | Yes |
| **ACL-03** | Reject Non-Compliant Data | MUST | Yes |
| **ACL-04** | ACL Version Synchronization with Core | MUST | Yes |
| **ACL-05** | Explicit Contract Required | SHOULD | No |
| **ACL-06** | Isolate External Dependencies | MUST | Yes |

## Key Definitions

**Anti-Corruption Layer (ACL):** Integration layer that normalizes and validates external data against Core schemas. Acts as a protective barrier between external system chaos and Evolith governance.

**External System:** Any tool outside Evolith Core that provides data to satellite products (Jira, Trello, Linear, GitHub, Confluence, spreadsheets, etc.)

**Transformation Traceability:** Audit trail from external entity to Core entity showing what transformation was applied and why.

## Reference

- [Evolith Product Vision Master — Section 3.2 ACLs](../../reference/product-suite/vision/evolith-product-vision-master.es.md)
- [Evolith Core Inheritance Rules](../governance/inheritance.rules.json)

---
[Back to Rulesets Hub](../README.es.md)