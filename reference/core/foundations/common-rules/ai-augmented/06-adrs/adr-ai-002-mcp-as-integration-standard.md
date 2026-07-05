# ADR-AI-002: MCP as standard protocol for agent-service integration

* **Status:** Proposed
* **Date:** 2026-05-11

## Context
As AI agents must interact with the company's inventory, billing, and logistics services, the need arises to define a common interface. Without a standard, each product team implements its own proprietary glue (custom wrappers) to expose REST endpoints to their agents, hindering inter-departmental reuse and centralized auditing.

## Decision
The **Model Context Protocol (MCP)** is approved as the standardized integration layer to connect backend services with any autonomous agent or AI-augmented development environment. Domains wishing to "serve" data to corporate agents MUST construct and expose an **MCP Server**.

## Alternatives Considered
* **Direct REST + Dynamic RAG:** Requires manual code for each connector and suffers from lack of a standardized and typed tool catalog for models.
* **Vendor-Proprietary SDK:** (e.g., only using Semantic Kernel plugins). Locks us to a specific stack and limits the usage of modern agentic IDE tools (like Claude or Cursor) which are MCP-First.
* **gRPC for Tool Calling:** Overly heavy for JSON-based agentic orchestrators and lacks the mature MCP host ecosystem.

## Consequences and Trade-offs
* **Direct Interoperability:** The same MCP Server serves simultaneously to empower both the developer's IDE and the CRM Agent.
* **Unified Security:** Facilitates creating Gateways that audit tool calls in a single universal format.
* **Trade-off:** Demands adding a transport wrapper (Stdio or SSE) to microservices that were traditionally only REST/gRPC.

## References
* Official MCP Specification: https://modelcontextprotocol.io

---
[Back to Index](./README.md)
