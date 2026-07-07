# Documentos de Planificación SDK/CLI/MCP

> **Propietario:** Equipo SDK
> **Fecha:** 2026-06-06

Este directorio contiene documentos de planificación para los componentes SDK, CLI y MCP de Evolith.

---

## Índice

| Documento | Estado | Propósito |
|-----------|--------|-----------|
| [Evaluación de Estado Actual](./sdk-cli-mcp-current-state-assessment.md) | Completo | Diagnóstico de código y capacidades existentes |
| [Arquitectura Objetivo](./sdk-cli-mcp-target-architecture.md) | Completo | Diseño de arquitectura compartida para SDK/CLI/MCP |
| [Catálogo de Capacidades API](./sdk-api-capability-catalog.md) | Completo | 9 módulos de servicio y sus capacidades |
| [Catálogo de Comandos CLI](./cli-command-catalog.md) | Completo | 50+ comandos CLI organizados por dominio |
| [Catálogo de Capacidades MCP](./mcp-capability-catalog.md) | Completo | 30+ herramientas, 12 recursos, 6 prompts |
| [Matriz de Paridad CLI/MCP](./cli-mcp-parity-matrix.md) | Completo | Paridad de funcionalidad entre CLI y MCP |
| [Análisis de Gaps](./sdk-cli-mcp-gap-analysis.md) | Completo | 10 gaps identificados (G-01 a G-10) |
| [Roadmap de Implementación](./sdk-cli-mcp-implementation-roadmap.md) | Completo | Plan de 6 fases (esfuerzo XS a XL) |
| [Estrategia de Testing](./testing-strategy.md) | Completo | Enfoque de pruebas unitarias, integración y E2E |
| [Lista de Verificación de Release](./release-readiness-checklist.md) | Completo | Criterios de release por phase gate |
| [Protocolo de Handoff SDLC](../HANDOFF-PROTOCOL.md) | Completo | Transferencia de conocimiento, contexto y artefactos entre fases SDLC y agentes |
| [Backlog CLI Histórico](./CLI-BACKLOG.md) | Reemplazado | Preservado para trazabilidad; seguimiento activo en el [tablero de gaps](../../../../../reference/core/control-center/gaps/gap-tracking.md) |

---

## Resumen de Documentos

### Evaluación de Estado Actual
Diagnóstico completo del SDK (~30% madurez), CLI (framework funcionando, mayoría de comandos mock), MCP (solo stub). Identifica 35 páginas de análisis del estado actual.

### Arquitectura Objetivo
Diseño de capa de servicio compartida donde SDK es la única fuente de verdad. CLI y MCP consumen las mismas instancias de servicio. MCP usa transporte stdio (JSON-RPC), no HTTP.

### Catálogo de Capacidades API
9 módulos de servicio definidos: RulesetValidator, EvolithYaml, BilingualValidation, ArchitectureValidation, AgentInstallation, UpgradeLogic, SdlcOperations, ArtifactGeneration, McpServer.

### Catálogo de Comandos CLI
50+ comandos catalogados en dominios: validate (5 flags), agent (5 subcomandos), architecture (4 subcomandos), sdlc (4 subcomandos), config (3 subcomandos), help.

### Catálogo de Capacidades MCP
30+ herramientas, 12 recursos, 6 prompts definidos. Herramientas incluyen validate, agent-install, architecture-validate, sdlc-handoff. Recursos cubren rulesets, phase-gates, agents.

### Matriz de Paridad CLI/MCP
Requisitos de paridad de funcionalidad: CLI y MCP deben ofrecer la misma cobertura de validación. MCP NO notifica a clientes (violación arquitectónica G-01 identificada).

### Análisis de Gaps
10 gaps identificados con severidad y esfuerzo:
- G-01 (CRÍTICO): Protocolo de Servidor MCP No Implementado
- G-02 (ALTO): Validación de Arquitectura Incompleta
- G-03 (ALTO): Lógica de Instalación de Agentes Faltante
- G-04 (ALTO): Lógica de Actualización Incompleta
- G-05 (MEDIO): Operaciones SDLC Parciales
- G-06 (MEDIO): Generación de Artefactos Limitada
- G-07 (MEDIO): Cobertura de Pruebas ~25%
- G-08 (MEDIO): Recursos MCP No Implementados
- G-09 (MEDIO): Prompts MCP No Implementados
- G-10 (BAJO): Sistema de Plugins No Diseñado

### Roadmap de Implementación
Plan de 6 fases: Fase 1 (Base SDK, L), Fase 2 (Finalización CLI, M), Fase 3 (Servidor MCP, M), Fase 4 (Extracción SDK, XL), Fase 5 (Sistema de Plugins, XL), Fase 6 (Funcionalidades Avanzadas, L).

### Estrategia de Testing
Pirámide de pruebas: 70% unitarias, 25% integración, 5% E2E. Fase 1 apunta a 80% cobertura unitaria. Framework Vitest. Pruebas de integración MCP usan subproceso stdio.

### Lista de Verificación de Release
Gates universales pre-release, gates específicos de Fase 1-3, suite de pruebas de regresión, sección de firmas de release.

---

## Documentos Relacionados

- [Visión Maestra de Producto Evolith](../../../../suite/vision/evolith-product-vision-master.md)
- [Ruleset ACL](../../../../../src/rulesets/acl/anti-corruption-layer.rules.json)
- [Reglas de Límite Open-Core](../../../../../src/rulesets/governance/open-core-boundary.rules.json)
- [Scorecards Ejecutivos](../../../../../src/rulesets/governance/executive-scorecards.rules.json)
