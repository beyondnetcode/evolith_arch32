# Agentic AI Topology Profile

> **Bilingual Navigation:** [Version en Espanol](./README.es.md)

**Status:** Draft  
**Dimension:** `ai`  
**Topology ID:** `agentic-ai`  
**Manifest:** [topology.manifest.json](./topology.manifest.json)

Agentic AI is an architecture topology for AI-first systems, autonomous or semi-autonomous agents, MCP-enabled workflows, and model-context-driven implementation assistance governed by Evolith Core.

## Purpose

Use this topology when AI agents participate in design, coding, validation, orchestration, decision support, or workflow execution and must operate with explicit architectural context before acting.

Agentic AI does not bypass architecture governance. Agents must receive governed context, respect bounded contexts, follow rulesets, preserve auditability, and route mutative actions through controlled interfaces.

## Governance Rules

| Rule | Requirement |
|---|---|
| Context injection | Agents must receive architecture context through MCP resources, prompts, and tools before generating or changing code. |
| Tool boundaries | Mutative tools must preserve human-in-the-loop or policy-governed approval where required. |
| Auditability | Agent actions must produce traceable evidence, inputs, outputs, and rule references. |
| Domain isolation | Agents must respect bounded contexts, contracts, and repository taxonomy. |
| Safety | AI workflows must not encode business budget, ROI, staffing, timing, or ownership decisions in Core artifacts. |

## Composition

`agentic-ai` can combine with every progressive-axis profile and with `serverless`, `event-driven`, `data-mesh`, and `edge-computing` when the agent context and tool boundaries are explicit.

## Business Boundary

This draft profile is technical-only. It defines AI architecture governance and operational context. It does not define business ownership, prioritization, ROI, cost, budget, staffing, delivery timing, or Funnel 0. Evolith Tracker owns those business concerns through its ACL.

---
[Back to Topology Hub](../../README.md)
