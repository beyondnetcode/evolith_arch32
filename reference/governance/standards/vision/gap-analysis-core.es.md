# Evolith Core — Análisis de Brechas Contra Visión de Producto

> **Navegación Bilingüe:** [English Version](./gap-analysis-core.md)

**Estado:** Análisis Activo
**Owner:** Evolith Architecture Board
**Fecha:** 2026-06-07
**Referencia:** [Visión Maestra del Producto Evolith](./evolith-product-vision-master.es.md)

---

## 1. Resumen Ejecutivo

Este documento proporciona un análisis de brechas integral del repositorio Evolith Core contra su visión de producto declarada según se define en `evolith-product-vision-master.es.md`.

### Pilares de la Visión vs. Realidad

| Pilar | Requisito de Visión | Estado Actual | Estado de Brecha |
|-------|---------------------|---------------|------------------|
| **Evolith Core** | Corpus de Referencia (Constitución) | ~90% Implementado | Brechas menores |
| **Evolith Tracker** | Suite SaaS para ejecución SDLC | 0% - No Iniciado | Faltante (fuera de alcance) |
| **CLI + MCP** | Capa de interoperabilidad | ~82% Implementado | Casi completo |

### Puntuación de Madurez General

| Componente | Anterior | Actual | Evaluación |
|------------|----------|--------|------------|
| Evolith Core (Corpus de Referencia) | 85% | **90%** | Maduro — Integración ACL diferida |
| Evolith Tracker (SaaS) | 0% | **0%** | No iniciado — Componente enterprise futuro |
| CLI (Exposición Tecnológica) | 50% | **82%** | Beta funcional; el build pasa, la suite de tests ya arranca pero aún no está completamente verde |
| Servidor MCP (Exposición Tecnológica) | 10% | **78%** | JSON-RPC stdio y HTTP mínimo implementados; faltan hardening de protocolo y evidencia smoke |
| Rulesets (Legibles por Máquina) | 75% | **86%** | 43 archivos JSON en 13 categorías, incluyendo CLI, MCP, evidencia y observabilidad |
| Phase Gates SDLC | 40% | **62%** | Existe validación de gates, pero el tracking de paridad aún marca varios checks de evidencia incompletos |
| Detección de Architecture Drift | 0% | **85%** | Detección, historial y análisis de tendencias |
| Cobertura de Tests | 25% | **No verificada** | La configuración de Jest fue reparada hasta arrancar tests; la suite completa aún tiene fallos y tests HTTP sensibles al sandbox |

**Puntuación General Ponderada:** ~45% → **~67%** (+22 puntos)

---

## 2. Matriz Visión vs. Realidad

### 2.1 Evolith Core (Corpus de Referencia)

| Requisito de Visión | Implementación Actual | Estado |
|---------------------|----------------------|--------|
| **Directivas Arquitectónicas** | Implementado | Completo |
| **ADRs (Architecture Decision Records)** | 70+ ADRs en core, nodejs, dotnet, android | Completo |
| **Estándares y Taxonomías** | Taxonomy, manifiesto de ingeniería, convenciones | Completo |
| **Rulesets (Legibles por Máquina)** | 43 archivos JSON en 13 categorías | Completo |
| **Esquemas (Artefactos Phase Gate)** | 14 JSON schemas en `rulesets/schema/` | Completo |
| **Modelo de Gobernanza Federada** | Reglas de herencia, contratos de satélite | Completo |
| **Reglas ACL (Anti-Corruption Layer)** | `rulesets/acl/anti-corruption-layer.rules.json` + 3 archivos adicionales | Completo |
| **Frontera Open-Core** | `rulesets/governance/open-core-boundary.rules.json` | Completo |

**Estado:** ~90% implementado

### 2.2 Evolith Tracker (Suite SaaS)

| Requisito de Visión | Implementación Actual | Estado |
|---------------------|----------------------|--------|
| **Ejecutar 5 Phase Gates** | CLI provee gate-status, handoff, transiciones de fase | Parcial (solo CLI, sin SaaS) |
| **Rastrear Architecture Drift** | Comando `drift` con detección, historial, tendencias | Parcial (solo CLI, sin SaaS) |
| **Consolidar Métricas DORA + SPACE** | Sin implementación | Faltante |
| **Scorecards Ejecutivos en Tiempo Real** | Reglas definidas en `executive-scorecards.rules.json` | Parcial |
| **Flujos de Aprobación** | Sin implementación | Faltante |
| **Trail de Auditoría** | Sin implementación | Faltante |
| **Dashboards Multi-tenant** | Sin implementación | Faltante |

**Estado:** 0% — **Fuera de alcance** — SaaS enterprise futuro

### 2.3 Exposición Tecnológica (CLI + MCP)

| Requisito de Visión | Implementación Actual | Estado |
|---------------------|----------------------|--------|
| **Comandos CLI** | 13 comandos: validate, drift, init, agents, upgrade, mcp serve, sdlc, adr, docs, architecture, history, standards, completion | Completo |
| **Servidor MCP** | `server.ts` — 596 líneas, transporte JSON-RPC stdio completo | Completo |
| **Herramientas MCP** | 17 herramientas: validate, agents (5), architecture, sdlc (2), config (2), metrics, moscow (7) | Completo |
| **Recursos MCP** | 8 recursos: rulesets, phase-gates, agents, versions, config, moscow, acl | Completo |
| **Prompts MCP** | 7 prompts: validate, onboarding, architecture, phase-gate, handoff, ruleset, moscow | Completo |
| **Integración IDE (Cursor, Claude Desktop)** | Ejemplos de config existen | No probado end-to-end |
| **Contexto de Gobernanza en Tiempo Real** | Servidor MCP expone rulesets, reglas, agentes como recursos | Completo |
| **Transporte HTTP** | Transporte local HTTP/SSE mínimo implementado | Parcial — requiere hardening de protocolo y evidencia smoke de release |

**Estado:** ~78% — CLI y MCP son capacidades beta funcionales; release readiness está bloqueado por tests fallidos y evidencia smoke MCP pendiente.

---

## 3. Tablero de Seguimiento de Brechas

### 3.1 Vista Kanban — Resumen por Estado

| TODO | IN PROGRESS | BLOCKED | DONE |
|------|-------------|---------|------|
| G-02 (ACL Jira) | G-17 (Cobertura Tests) | - | G-12 (Protocolo MCP) |
| G-05 (DORA Metrics) | G-18 (Tests E2E) | | G-16 (Paridad EN/ES) |
| G-06 (Scorecards) | | | G-03 (Phase Gates) |
| | | | G-04 (Architecture Drift) |
| | | | G-07 (Agents Install) |
| | | | G-08 (Satellite Upgrade) |
| | | | G-09 (Arch Validation) |
| | | | G-10 (SDLC Ops) |
| | | | G-11 (Scaffold Docs) |
| | | | G-13 (MCP Tools) |
| | | | G-14 (MCP Resources) |
| | | | G-15 (MCP Prompts) |
| | | | G-19 (Limpieza Legacy) |
| | | | G-20 (MCP HTTP) |
| | | | G-21 (Profundidad Arch) |
| | | | G-22 (Nombre MoSCoW) |
| | | | G-23 (Dir Validators) |

### 3.2 Tabla de Seguimiento Detallada

| ID | Descripción | Comp. | Prioridad | Complejidad | Estado | Avance |
|----|-------------|-------|-----------|-------------|--------|--------|
| **G-12** | **Implementar protocolo servidor MCP (JSON-RPC stdio)** | MCP | CRITICO | M (2-3 sem) | DONE | 100% |
| G-01 | Validación arquitectura F1/F2/F3 en CLI | Core | ALTA | M (2-3 sem) | DONE | 100% |
| G-03 | Ejecutar transiciones de Phase Gates | CLI | ALTA | L (3-4 sem) | DONE | 100% |
| G-04 | Detección de Architecture Drift | CLI | ALTA | L (3-4 sem) | DONE | 100% |
| G-07 | Comando `smart-cli agents install` | CLI | ALTA | S (1 sem) | DONE | 100% |
| G-08 | Camino de upgrade seguro para satélites | CLI | ALTA | M (2-3 sem) | DONE | 100% |
| G-09 | Validación reglas arquitectura en CLI | CLI | ALTA | M (2-3 sem) | DONE | 100% |
| G-10 | Transiciones de fase y generación artefactos | CLI | MEDIA | M (2-3 sem) | DONE | 100% |
| G-11 | Andamiaje de documentación | CLI | MEDIA | S (1 sem) | DONE | 100% |
| G-13 | Implementar 10+ herramientas MCP | MCP | MEDIA | L (3-4 sem) | DONE | 100% |
| G-14 | Recursos MCP (Info Core, rulesets) | MCP | MEDIA | M (2-3 sem) | DONE | 100% |
| G-15 | Prompts MCP reutilizables | MCP | BAJA | XS (<1 sem) | DONE | 100% |
| G-17 | Cobertura tests unitarios >80% | Testing | ALTA | L (3-4 sem) | EN PROGRESO | No verificada |
| G-18 | Tests E2E reales con aserciones | Testing | ALTA | L (3-4 sem) | EN PROGRESO | Parcial |
| G-16 | Paridad bilingüe 100% EN/ES | Core | BAJA | XS (<1 sem) | DONE | 90% |
| G-02 | Integraciones ACL Jira/Trello/Linear | Core | MEDIA | M (2-3 sem) | DEFERRED | 0% |
| G-05 | Dashboard métricas DORA+SPACE | Tracker | MEDIA | L (3-4 sem) | DEFERRED | 0% |
| G-06 | Scorecards ejecutivos en tiempo real | Tracker | MEDIA | L (3-4 sem) | DEFERRED | 0% |
| G-19 | Limpieza servicio MCP legacy | Core | BAJA | XS (<1 sem) | DONE | 100% |
| G-20 | Implementación transporte HTTP MCP | MCP | MEDIA | S (1 sem) | EN PROGRESO | Transporte mínimo implementado; evidencia smoke pendiente |
| G-21 | Profundidad validación arquitectura | Core | MEDIA | M (2-3 sem) | DONE | 100% |
| G-22 | Consistencia de nombre MoSCoW | Core | BAJA | XS (<1 sem) | DONE | 100% |
| G-23 | Limpieza directorio validators vacío | Core | BAJA | XS (<1 sem) | DONE | 100% |

### 3.3 Leyenda de Semáforos

| Símbolo | Estado | Significado |
|---------|--------|-------------|
| CRITICO | Bloqueante | Impide progreso en múltiples áreas |
| ALTA | Prioridad | Funcionalidad core faltante |
| MEDIA | SECOND | Importante pero no bloqueante |
| BAJA | Nice-to-have | Mejoras menores |
| TODO | Pendiente | No iniciado |
| IN PROGRESS | En Curso | Trabajo activo |
| BLOCKED | Bloqueado | Impedimento externo |
| DONE | Completado | Entregado |

---

## 4. Brechas Resueltas (Anteriormente Abiertas)

### G-12: Implementación del Protocolo del Servidor MCP — RESUELTA

**Entregado:** `sdk/cli/src/core/mcp/server.ts` — 596 líneas implementando:
- `MinimalStdioTransport` — JSON-RPC completo sobre stdio con parsing line-buffered
- `DirectMcpServer` — enrutamiento de mensajes, manejo de errores, métricas
- 17 herramientas MCP registradas y funcionales
- 8 recursos MCP exponiendo contexto de gobernanza
- 7 prompts MCP para flujos de trabajo reutilizables

**Nota:** El legacy `mcp-server.service.ts` (23 líneas) es un stub muerto. Limpieza rastreada como G-19.

### G-01: Validación de Arquitectura F1/F2/F3 — RESUELTA

**Entregado:**
- `sdk/cli/src/commands/validate/validate.command.ts` — flag `--arch` para validación F1/F2/F3
- `sdk/cli/src/core/mcp/tools/architecture.ts` — 153 líneas de validación de arquitectura
- `rulesets/architecture/f1-modular-monolith.rules.json`, `f2-distributed-modules.rules.json`, `f3-microservices.rules.json`

**Nota:** Los checks actuales son superficiales (detección de workspace, check de dependencias circulares, check de Dockerfile). Análisis estático profundo rastreado como G-21.

### G-04: Detección de Architecture Drift — RESUELTA

**Entregado:**
- `sdk/cli/src/core/validators/architecture-drift.service.ts` — detección de drift, rastreo de violaciones, historial, análisis de tendencias
- `sdk/cli/src/commands/drift/drift.command.ts` — 214 líneas con flags `--json`, `--history`, `--trend`

### G-07: Comando de Instalación de Agentes — RESUELTA

**Entregado:** `sdk/cli/src/commands/init/agents.command.ts` — 538 líneas con install/list/validate/upgrade/remove y soporte de plantillas.

### G-08: Camino de Upgrade de Satélites — RESUELTA

**Entregado:** `sdk/cli/src/commands/init/upgrade.command.ts` — 173 líneas con dry-run, detección de cambios rupturistas, camino de upgrade seguro.

### G-09: Validación de Reglas de Arquitectura — RESUELTA

**Entregado:** `RulesetValidatorService.validateArchitecture()` con cobertura completa de tests en `ruleset-validator-architecture.spec.ts`.

### G-10: Transiciones de Fase SDLC — RESUELTA

**Entregado:** `sdk/cli/src/core/mcp/tools/sdlc.ts` — 177 líneas con generación de manifiestos de handoff y estado de gates.

### G-11: Andamiaje de Documentación — RESUELTA

**Entregado:** `sdk/cli/src/commands/docs/docs.command.ts` — 193 líneas con soporte de plantillas y modo dry-run.

### G-13: Herramientas MCP (10+) — RESUELTA

**Entregado:** 17 herramientas en 5 archivos:
- `validate.ts` — validación de gobernanza
- `agent.ts` — 5 herramientas de ciclo de vida de agentes
- `architecture.ts` — checks de arquitectura F1/F2/F3
- `sdlc.ts` — 2 herramientas SDLC
- `moscow.ts` — 7 herramientas de priorización MoSCoW

### G-14: Recursos MCP — RESUELTA

**Entregado:** `sdk/cli/src/core/mcp/resources/index.ts` — 203 líneas, 8 recursos.

### G-15: Prompts MCP — RESUELTA

**Entregado:** `sdk/cli/src/core/mcp/prompts/index.ts` — 225 líneas, 7 prompts.

---

## 5. Análisis de Brechas Activas

### 5.1 Alta Prioridad

#### G-17: Cobertura de Tests Unitarios >80% (EN PROGRESO — NO VERIFICADA)

**Estado:** La configuración de Jest ahora arranca la suite, pero la cobertura completa no es confiable hasta que todas las suites pasen. Los bloqueos conocidos incluyen tests HTTP sensibles al sandbox y fallos restantes de comandos/servicios.

**Trabajo restante:** Casos borde en prompts interactivos (flujos `p.group`), algunas ramas de comandos, y rutas de error de servicios.

#### G-18: Tests E2E Reales con Aserciones (EN PROGRESO — 40%)

**Estado:** La infraestructura de tests existe. Se necesitan tests de integración que levanten el servidor MCP y ejerciten las herramientas end-to-end.

#### G-20: Transporte HTTP MCP (EN PROGRESO — IMPLEMENTACIÓN MÍNIMA)

**Brecha:** `server.ts` implementa un transporte local HTTP/SSE mínimo, pero release readiness aún requiere tests de conformidad de protocolo, validación de modo de autenticación y evidencia smoke.

**Impacto:** El transporte HTTP debe tratarse como beta hasta generar evidencia de cumplimiento de protocolo y seguridad.

**Corrección Requerida:**
1. Agregar tests de conformidad para HTTP/SSE.
2. Validar API key o modo local-only.
3. Generar evidencia smoke de release para initialize, tools/list, resources/list y prompts/list.

#### G-21: Profundidad de Validación de Arquitectura (EN PROGRESO — 0%)

**Brecha:** Los checks F1/F2/F3 actuales son superficiales:
- F1: Detección de workspace, check de estructura básica
- F2: Check de dependencias circulares (básico)
- F3: Check de presencia de Dockerfile

**Faltante:**
- Análisis de grafo de importaciones (detección de violaciones de capa)
- Verificación de aislamiento de bounded contexts
- Checks de segregación de interfaces
- Validación de inversión de dependencias
- Análisis de acoplamiento de base de datos

**Impacto:** No se pueden detectar violaciones arquitectónicas sutiles como la capa de dominio importando infraestructura, o llamadas directas entre contextos.

### 5.2 Prioridad Media

#### G-02: Integraciones ACL (DEFERRED — 0%)

**Estado:** Las reglas existen en `rulesets/acl/`. Los adaptadores Jira/Trello/Linear pertenecen al alcance de Tracker SaaS.

#### G-05: Métricas DORA (DEFERRED — 0%)

**Estado:** Responsabilidad de Tracker SaaS.

#### G-06: Scorecards (DEFERRED — 0%)

**Estado:** Responsabilidad de Tracker SaaS. Reglas definidas pero sin dashboard operativo.

### 5.3 Prioridad Baja (Limpieza)

#### G-19: Limpieza de Servicio MCP Legacy (TODO — 0%)

**Brecha:** `sdk/cli/src/core/services/mcp-server.service.ts` (23 líneas) es un stub muerto que solo hace log. La implementación real está en `server.ts`.

**Impacto:** Confuso para contribuidores. Dos archivos con nombres similares pero roles diferentes.

**Corrección:** Eliminar `mcp-server.service.ts` o agregar comentario de deprecación apuntando a `server.ts`.

#### G-22: Consistencia de Nombre MoSCoW (TODO — 0%)

**Brecha:** La clase de servicio es `MoscoPrioritizationService` (falta 'w'). Los archivos importan correctamente desde `moscow-prioritization.service` pero el nombre de la clase es inconsistente.

**Corrección:** Renombrar a `MoscowPrioritizationService`.

#### G-23: Directorio Validators Vacío (TODO — 0%)

**Brecha:** `sdk/cli/src/validators/` es un directorio vacío. Artefacto muerto.

**Corrección:** Eliminar directorio.

---

## 6. Matriz de Prioridades

| Prioridad | Brechas | Criterios |
|-----------|---------|-----------|
| **ALTA** | G-17, G-18, G-21 | Calidad y profundidad de validación |
| **MEDIA** | G-02, G-05, G-06, G-20 | Importante pero no bloqueante |
| **BAJA** | G-16, G-19, G-22, G-23 | Limpieza y nice-to-have |

### Esfuerzo vs. Impacto

| Esfuerzo → | XS (<1sem) | S (1sem) | M (2-3sem) | L (3-4sem) |
|------------|------------|----------|------------|------------|
| **Impacto ALTO** | G-19, G-23 | G-20 | G-21 | G-17, G-18 |
| **Impacto MEDIO** | G-22 | - | G-02 | G-05, G-06 |
| **Impacto BAJO** | G-16 | - | - | - |

---

## 7. Hoja de Ruta de Recomendaciones

### Fase 1: Limpieza y Calidad (Semanas 1-2)

| Acción | IDs de Brecha | Entregable |
|--------|---------------|------------|
| Eliminar artefactos muertos | G-19, G-23 | Codebase limpio, sin confusión |
| Corregir consistencia de nombres | G-22 | `MoscowPrioritizationService` |
| Estabilizar cobertura de tests | G-17 | Verificar y mantener >80% |

### Fase 2: Profundizar Validación (Semanas 3-6)

| Acción | IDs de Brecha | Entregable |
|--------|---------------|------------|
| Profundizar validación de arquitectura | G-21 | Grafo de importaciones, violaciones de capa, aislamiento de contextos |
| Implementar transporte HTTP MCP | G-20 | Modo HTTP/SSE para acceso remoto |
| Tests E2E reales | G-18 | Suite de tests de integración para servidor MCP |

### Fase 3: Consolidación (Semanas 7-12)

| Acción | IDs de Brecha | Entregable |
|--------|---------------|------------|
| Completar paridad bilingüe | G-16 | 100% cobertura EN/ES |
| Prototipos de integración ACL | G-02 | Adaptadores de reglas Jira/Trello/Linear (opcional) |

### Diferido (Alcance de Tracker)

| Acción | IDs de Brecha | Racional |
|--------|---------------|----------|
| Métricas DORA | G-05 | Responsabilidad de Tracker SaaS |
| Scorecards Ejecutivos | G-06 | Responsabilidad de Tracker SaaS |

---

## 8. Resumen de Estado

### Estado de Componentes

| Componente | Estado |
|------------|--------|
| Documentos Core | 90% (570 archivos markdown, 285 pares bilingües) |
| ADRs | 100% (70+ archivos en 4 runtimes) |
| Rulesets (JSON) | 86% (43 archivos en 13 categorías) |
| JSON Schemas | 100% (14/14 archivos) |
| Comandos CLI | 82% (beta funcional; tests de release no verdes) |
| Servidor MCP | 78% (stdio más HTTP mínimo; evidencia smoke pendiente) |
| Herramientas MCP | 95% (17 herramientas funcionales) |
| Recursos MCP | 90% (8 recursos) |
| Prompts MCP | 95% (7 prompts) |
| Architecture Drift | 85% (detección + historial + tendencias) |
| Cobertura Tests | No verificada hasta que la suite Jest completa pase |

### Completitud de Pilares de Visión

| Pilar de Visión | Completitud | Bloqueadores |
|-----------------|-------------|--------------|
| Evolith Core | 90% | Integraciones ACL (diferidas) |
| Evolith Tracker | 0% | Futuro — fuera de alcance |
| CLI | 82% | Beta funcional |
| MCP | 78% | HTTP mínimo implementado; hardening pendiente |

---

## 9. Qué Está Funcionando Bien

1. **Registro ADR Integral** — 70+ ADRs en múltiples runtimes
2. **Paridad Bilingüe Perfecta** — 285/570 archivos tienen pares EN/ES exactos
3. **Rulesets Legibles por Máquina** — 43 archivos JSON en gobernanza, arquitectura, ACL, SDLC, CLI, MCP, evidencia y observabilidad
4. **JSON Schemas Completos** — 14 schemas para validación de artefactos
5. **Implementación CLI Completa** — 13 comandos cubriendo todos los requisitos de visión
6. **Servidor MCP Funcional** — 596 líneas de implementación JSON-RPC con 17 herramientas, 8 recursos, 7 prompts
7. **Detección de Architecture Drift** — Detección, almacenamiento de historial y análisis de tendencias
8. **Inventario Amplio de Tests** — existen muchos specs, pero la cobertura de release no está verificada hasta que la suite esté verde
9. **Gobernanza Federada** — Herencia y contratos de satélite funcionando
10. **Phase Gates SDLC** — Ejecutables vía CLI con manifiestos de handoff

---

## 10. Camino Crítico hacia Alineación de Visión

```
Estado Actual                        Meta de Visión
     ↓                                     ↓
┌─────────────┐                    ┌─────────────────────┐
│  CLI 85%    │───────────────────►│  CLI 100%           │
│  MCP 80%    │───────────────────►│  MCP 100%           │
│  Core 90%   │───────────────────►│  Core 95%           │
│  Tracker 0% │                    │  Tracker 0% (futuro)│
└─────────────┘                    └─────────────────────┘
```

**Camino Crítico:**
1. **Estabilidad de Cobertura Tests (G-17)** — Dejar Jest verde, luego verificar y mantener >80%
2. **Profundidad de Validación Arquitectura (G-21)** — Superficial → análisis estático profundo
3. **Transporte HTTP MCP (G-20)** — Endurecer la implementación HTTP/SSE mínima con evidencia smoke
4. **Limpieza de Código (G-19, G-22, G-23)** — Eliminar artefactos muertos, corregir nombres

---

## 11. Fuera de Alcance

Los siguientes están explícitamente **fuera de alcance** para Evolith Core:

- Evolith Tracker SaaS
- Flujos de Aprobación
- Gestión de Usuarios
- Integración de Facturación
- Monitoreo SLA

Estos pertenecen al futuro producto Evolith Tracker.

---

*Este análisis de brechas es un documento vivo y debe ser actualizado conforme el progreso de implementación.*

---
[Volver al Índice de Visión](./README.es.md)
