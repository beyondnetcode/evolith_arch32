# Evolith SDK / CLI

## Overview

The **Evolith SDK** (and its CLI wrapper) is the official operational platform for the Evolith architecture. It goes beyond simple project scaffolding; it is designed to be a living architectural assistant that operates locally in developer environments, IDEs (via MCP), and autonomous agent pipelines.

## Architectural Principles

1. **Convention over Configuration**: The CLI relies on Evolith defaults. It will prompt only for necessary overrides and will not overwrite existing code without explicit confirmation.
2. **Modular Extensibility**: The logic is cleanly separated into a `core` layer containing domain services (ADRs, Governance, Storage) and an external wrapper layer (`commands`, `mcp`) that exposes these capabilities to different consumers.
3. **Omni-channel Consumption**: 
   - **CLI**: Direct terminal usage (e.g., `smart-cli adr create`).
   - **MCP Server**: Local standard I/O server for IDE integration (`smart-cli mcp serve`).
   - **Agents**: Automated invocations inside CI/CD or agentic loops.

## Core Modules

The SDK is divided into six primary operational pillars:

1. **Init Module (`smart-cli init`)**: Scaffolds a new or existing repository, establishing the bilingual documentation base, ADR registry, and quality gates required to be an official Evolith Satellite.
2. **ADR Module (`smart-cli adr`)**: Manages the lifecycle of Architecture Decision Records, templates, validation, and linkages between Satellite decisions and Upstream standards.
3. **Architecture Bounding (`smart-cli architecture ask`)**: A search/RAG interface (using an Inversion of Control pattern to support both local lightweight indexing and enterprise vector search) to answer architectural questions based on the corpus.
4. **Standards Governance (`smart-cli standards`)**: Evaluates repository structures against defined patterns, suggesting refactors and ensuring compliance.
5. **Documentation Sync (`smart-cli docs`)**: Ensures code-to-docs synchronization, bilingual parity validation, and Mermaid diagram verification.
6. **IDE Integration (`smart-cli mcp`)**: Exposes SDK tools via the Model Context Protocol to assistants like Antigravity.

## Navigation

- [Technical Design & Architecture](./technical-design.md)
- [Domain Model & Conceptual Maps](./domain-model.md)
