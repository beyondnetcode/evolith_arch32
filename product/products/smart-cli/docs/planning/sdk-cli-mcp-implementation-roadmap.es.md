# SDK/CLI/MCP Implementation Roadmap

> **Estado:** Propuesto
> **Fecha:** 2026-06-06

---

## 1. Descripción General del Roadmap

| Fase | Enfoque | Duración | Prioridad |
|------|---------|----------|-----------|
| **Fase 0** | Diagnóstico y Arquitectura | DONE | - |
| **Fase 1** | Fundación del SDK | 2-3 semanas | P0 |
| **Fase 2** | Finalización del CLI | 2-3 semanas | P1 |
| **Fase 3** | Implementación de MCP | 2-3 semanas | P1 |
| **Fase 4** | Arquitectura y SDLC | 2-3 semanas | P2 |
| **Fase 5** | Integración y Pruebas | 3-4 semanas | P2 |
| **Fase 6** | Endurecimiento y Release | 2 semanas | P3 |

---

## 2. Fase 1: Fundación del SDK (2-3 semanas)

### Objetivo
Extraer y formalizar la lógica compartida en servicios del SDK que consumirán CLI y MCP.

### Tareas

| Tarea | Esfuerzo | Dependencia | Estado |
|-------|----------|-------------|--------|
| Add `@modelcontextprotocol/sdk` dependency | XS | - | TODO |
| Create SDK service interfaces | S | - | TODO |
| Extract `CoreLoader` from current code | S | - | TODO |
| Formalize `RulesetRegistry` service | M | CoreLoader | TODO |
| Formalize `RulesetValidator` service | M | RulesetRegistry | TODO |
| Add architecture ruleset validation (F1/F2/F3) | M | RulesetValidator | TODO |
| Create `ArtifactService` for template loading | M | - | TODO |
| Add unit tests for all services (>80%) | L | Services | TODO |

### Entregables
- Paquete `@beyondnet/evolith-sdk-core` estructurado
- Todos los servicios del SDK con interfaces
- >80% de cobertura de pruebas unitarias

### Quality Gate
- Todas las pruebas unitarias pasan
- Los servicios del SDK pueden importarse y usarse de forma independiente

---

## 3. Fase 2: Finalización del CLI (2-3 semanas)

### Objetivo
Completar las implementaciones de comandos del CLI, reemplazando stubs con lógica real.

### Tareas

| Tarea | Esfuerzo | Dependencia | Estado |
|-------|----------|-------------|--------|
| Implement `agent install` command | M | SDK CoreLoader | TODO |
| Implement `upgrade` command | S | SDK RulesetRegistry | TODO |
| Implement `validate architecture` | M | SDK F1/F2/F3 validation | TODO |
| Implement `validate sdlc` | M | SDK SDLCService | TODO |
| Implement `sdlc handoff` (real phase transitions) | M | SDK SDLCService | TODO |
| Implement `sdlc generate` (real artifact gen) | M | SDK ArtifactService | TODO |
| Implement `architecture initialize` | M | NxWorkspaceStrategy | TODO |
| Implement `ruleset explain` command | S | SDK RulesetRegistry | TODO |
| Add E2E tests for all commands | L | Commands | TODO |

### Entregables
- Todos los comandos del CLI implementados (sin stubs)
- Pruebas E2E reales con aserciones

### Quality Gate
- `evolith-cli validate --all` pasa en Core
- Pruebas E2E para todos los comandos

---

## 4. Fase 3: Implementación de MCP (2-3 semanas)

### Objetivo
Implementar el servidor MCP con soporte completo de herramientas, recursos y prompts.

### Tareas

| Tarea | Esfuerzo | Dependencia | Estado |
|-------|----------|-------------|--------|
| Create `McpServer` class with stdio transport | M | Phase 1 SDK | TODO |
| Implement `tools/list` handler | S | McpServer | TODO |
| Implement `validate_project` tool | M | SDK ValidationService | DONE |
| Implement `validate_ruleset` tool | M | SDK RulesetValidator | DONE |
| Implement `list_rulesets` tool | S | SDK RulesetRegistry | DONE |
| Implement `get_ruleset` tool | S | SDK RulesetRegistry | DONE |
| Implement `detect_architecture_drift` tool | M | SDK DriftDetection | DONE |
| Implement `resources/list` handler | S | McpServer | DONE |
| Implement `evolith://core/info` resource | S | SDK CoreLoader | DONE |
| Implement `evolith://rulesets` resource | S | SDK RulesetRegistry | DONE |
| Implement `prompts/list` handler | XS | McpServer | DONE |
| Implement `prepare_discovery` prompt | S | - | DONE |
| Implement `review_architecture` prompt | S | - | DONE |
| Add MCP integration tests | M | MCP tools | DONE |

### Entregables
- Servidor MCP funcional
- 10+ herramientas implementadas
- 5+ recursos implementados
- 3+ prompts implementados

### Quality Gate
- El servidor MCP se conecta vía stdio
- Las herramientas devuelven respuestas JSON-RPC válidas
- Las pruebas de integración pasan con Claude Desktop

---

## 5. Fase 4: Arquitectura y SDLC (2-3 semanas)

### Objetivo
Completar la validación de arquitectura y las operaciones de phase gate del SDLC.

### Tareas

| Tarea | Esfuerzo | Dependencia | Estado |
|-------|----------|-------------|--------|
| Implement full F1/F2/F3 validation | M | Phase 1 SDK | DONE |
| Implement bounded context checks | M | F1/F2/F3 | DONE |
| Implement layer boundary validation | M | F1/F2/F3 | DONE |
| Implement `gate validate` command | M | Phase 2 CLI | DONE |
| Implement evidence collection | M | SDK EvidenceService | DONE |
| Implement phase transition validation | M | Gate validate | DONE |
| Add architecture drift detection | M | Phase 3 MCP | DONE |
| Implement DORA metrics collection | M | SDK ReportService | DONE |

### Entregables
- Validación completa de arquitectura
- Operaciones de phase gate funcionales
- Recolección de evidencia operativa

### Quality Gate
- La validación de arquitectura detecta patrones conocidos
- Los reportes de phase gate incluyen evidencia completa

---

## 6. Fase 5: Integración y Pruebas (3-4 semanas)

### Objetivo
Asegurar que SDK, CLI y MCP produzcan resultados consistentes.

### Tareas

| Tarea | Esfuerzo | Dependencia | Estado |
|-------|----------|-------------|--------|
| Verify CLI and MCP produce identical results | M | Phase 2, Phase 3 | TODO |
| Add integration tests (SDK + CLI) | M | Phase 2 | TODO |
| Add integration tests (SDK + MCP) | M | Phase 3 | TODO |
| Set up CI/CD pipeline | M | - | TODO |
| Add coverage gates in CI | S | CI/CD | TODO |
| Performance testing (load times) | S | - | TODO |
| Offline mode testing | M | - | TODO |
| Multi-platform testing (win/linux/mac) | M | - | TODO |

### Entregables
- Pipeline CI/CD con quality gates
- Pruebas de paridad exitosas
- Benchmarks de rendimiento establecidos

### Quality Gate
- Todas las pruebas de paridad pasan
- Pipeline CI en verde
- <500ms de carga del core, <10s de validación completa

---

## 7. Fase 6: Endurecimiento y Release (2 semanas)

### Objetivo
Preparar el release estable.

### Tareas

| Tarea | Esfuerzo | Dependencia | Estado |
|-------|----------|-------------|--------|
| Security audit | M | Phase 5 | TODO |
| API documentation generation | M | Phase 1 | TODO |
| CLI user guide | M | Phase 2 | TODO |
| MCP integration guide | M | Phase 3 | TODO |
| Migration guide (v0 to v1) | S | - | TODO |
| Semantic version setup | XS | - | TODO |
| npm publishing setup | M | - | TODO |
| Release candidate testing | M | All phases | TODO |

### Entregables
- Release candidate v1.0.0
- Documentación completa
- Guía de migración

### Quality Gate
- Auditoría de seguridad aprobada
- Documentación completa
- Criterios de release cumplidos

---

## 8. Leyenda de Esfuerzo

| Código | Descripción |
|--------|-------------|
| XS | < 1 semana |
| S | 1 semana |
| M | 2-3 semanas |
| L | 3-4 semanas |
| XL | > 4 semanas |

---

## 9. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Cambios en el MCP SDK que rompan funcionalidad | Fijar una versión estable del MCP SDK |
| Scope creep | Phase gates estrictos, eliminar características no esenciales |
| Agotamiento por cobertura de pruebas | Automatizar la medición de cobertura |
| Problemas de rendimiento | Benchmark temprano, optimizar rutas críticas |

---

## 10. Criterios de Éxito

- Comandos del CLI completamente funcionales (sin stubs)
- Servidor MCP funcionando con Claude Desktop
- SDK compartido entre CLI y MCP
- >80% de cobertura de pruebas
- <500ms de carga del core
- <10s de validación completa del proyecto
- Documentación completa
- Release v1.0.0 listo

---

[Volver al Índice de Planificación SDK/CLI](./README.md)
