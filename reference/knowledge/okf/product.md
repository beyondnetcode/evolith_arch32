---
type: Product
title: Evolith Core
description: Core defines. Providers execute. CLI and MCP evaluate. Tracker decides and audits.
resource: reference/knowledge/canonical/product.yaml
tags:
  - product
  - root-authority
timestamp: '2026-07-08'
owner: '@winston'
reviewBy: '2027-01-06'
---

# Evolith Core

Evolith Core es el repositorio raíz y la autoridad de reglas/gobernanza. Expone su dominio a través del Core API Exposure Layer (ADR-0074) y nunca es redefinido por sus satélites.

## Responsibility model

Core defines. Providers execute. CLI and MCP evaluate. Tracker decides and audits.

## Exposure

- **rest**: /api/v1 — REST-only, sin GraphQL/SSE (ADR-0074)
- **mcp**: gateway MCP separado, @evolith/mcp-server (ADR-0069)
- **contextEnvelope**: { repository, revision, workspaceRef, operationId } — stateless (ADR-0080)
- **determinism**: evaluación pura y determinista (ADR-0101)

## Packs

- [knowledge-and-corpus](/packs/knowledge-and-corpus.md) — layer L2
