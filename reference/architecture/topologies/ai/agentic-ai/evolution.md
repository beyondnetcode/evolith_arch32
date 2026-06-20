# Agentic AI Evolution Guide

> **Bilingual Navigation:** [Version en Espanol](./evolution.es.md)

## Evolution Principle

Agentic AI is cross-cutting and must not dissolve bounded-context ownership. Keep orchestration, prompt assembly, policy enforcement, and tool routing in cross-cutting shells. Keep business commands, invariants, and persistence decisions within their owning bounded contexts using existing application contracts.

## Capability Evolution

Expand one capability at a time. A capability addition requires a declared tool contract, classified context sources, sandbox review, authorization and approval design, Native and OPA validation, positive and negative tests, and operational evidence. A new mutative capability additionally requires review against ADR-0083.

## Extraction Readiness

Do not extract an agent-facing service merely because an agent exists. Follow the progressive-axis extraction criteria: distinct ownership, independent deployment need, stable contract, observability, failure containment, and justified operational cost. The external service retains the same tool gateway, evidence, and domain boundaries.

## Deprecation

Deprecate a capability by revoking its delegation, removing its tool route, retaining its required evidence according to the governing policy, and updating the contract, tests, rules, and operational runbook together. Do not leave dormant tools reachable through a general agent identity.

## Reassessment Triggers

Reassess this topology when a model, tool, context source, deployment boundary, data classification, or approval method changes; when denials or policy failures trend upward; or when a satellite pattern may merit promotion into a reusable Evolith standard.

---
[Back to Agentic AI Profile](./README.md)
