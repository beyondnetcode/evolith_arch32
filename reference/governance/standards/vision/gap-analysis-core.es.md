# Evolith Core — Análisis de Brechas Contra Visión de Producto

> **Navegación Bilingüe:** [English Version](./gap-analysis-core.md)

**Estado:** Análisis Activo
**Owner:** Evolith Architecture Board
**Fecha:** 2026-06-06
**Referencia:** [Visión Maestra del Producto Evolith](./evolith-product-vision-master.es.md)

---

## 1. Resumen Ejecutivo

Este documento proporciona un análisis de brechas integral del repositorio Evolith Core contra su visión de producto declarada según se define en `evolith-product-vision-master.es.md`.

### Pilares de la Visión vs. Realidad

| Pilar | Requisito de Visión | Estado Actual | Estado de Brecha |
|-------|---------------------|---------------|------------------|
| **Evolith Core** | Corpus de Referencia (Constitución) | ~85% Implementado | Parcial |
| **Evolith Tracker** | Suite SaaS para ejecución SDLC | 0% - No Iniciado | Faltante |
| **CLI + MCP** | Capa de interoperabilidad | ~30% Implementado | Parcial |

### Puntuación de Madurez General

| Componente | Puntuación | Evaluación |
|------------|------------|------------|
| Evolith Core (Corpus de Referencia) | 85% | Maduro - Brechas menores en reglas ACL |
| Evolith Tracker (SaaS) | 0% | No iniciado - Componente enterprise futuro |
| CLI (Exposición Tecnológica) | 50% | Funcional pero incompleto |
| Servidor MCP (Exposición Tecnológica) | 10% | Implementación stub únicamente |
| Rulesets (Legibles por Máquina) | 75% | Reglas core implementadas, arquitectura pendiente |
| Phase Gates SDLC | 40% | Documentado pero no ejecutable vía CLI |

**Puntuación General Ponderada:** ~45%

---

## 2. Matriz Visión vs. Realidad

### 2.1 Evolith Core (Corpus de Referencia)

| Requisito de Visión | Implementación Actual | Estado |
|---------------------|----------------------|--------|
| **Directivas Arquitectónicas** | Implementado | Completo |
| **ADRs (Architecture Decision Records)** | 70+ ADRs en core, nodejs, dotnet, android | Completo |
| **Estándares y Taxonomías** | Taxonomy, manifiesto de ingeniería, convenciones | Completo |
| **Rulesets (Legibles por Máquina)** | JSON rules en `rulesets/` | Parcial |
| **Esquemas (Artefactos Phase Gate)** | 13 JSON schemas en `rulesets/schema/` | Completo |
| **Modelo de Gobernanza Federada** | Reglas de herencia, contratos de satélite | Completo |
| **Reglas ACL (Anti-Corruption Layer)** | `rulesets/acl/anti-corruption-layer.rules.json` existe | Parcial |
| **Frontera Open-Core** | `rulesets/governance/open-core-boundary.rules.json` | Completo |

**Estado:** ~85% implementado

### 2.2 Evolith Tracker (Suite SaaS)

| Requisito de Visión | Implementación Actual | Estado |
|---------------------|----------------------|--------|
| **Ejecutar 5 Phase Gates** | Sin implementación | Faltante |
| **Rastrear Architecture Drift** | Sin implementación | Faltante |
| **Consolidar Métricas DORA + SPACE** | Sin implementación | Faltante |
| **Scorecards Ejecutivos en Tiempo Real** | Reglas definidas pero no operativas | Parcial |
| **Flujos de Aprobación** | Sin implementación | Faltante |
| **Trail de Auditoría** | Sin implementación | Faltante |
| **Dashboards Multi-tenant** | Sin implementación | Faltante |

**Estado:** 0% - **Fuera de alcance** - SaaS enterprise futuro

### 2.3 Exposición Tecnológica (CLI + MCP)

| Requisito de Visión | Implementación Actual | Estado |
|---------------------|----------------------|--------|
| **Comandos CLI** | Parcial - validate, init, mcp serve | Parcial |
| **Servidor MCP** | Stub únicamente - logs en consola | Faltante |
| **Herramientas MCP** | Archivos esqueleto en `tools/` | Parcial |
| **Recursos MCP** | Implementación vacía | Faltante |
| **Prompts MCP** | Implementación vacía | Faltante |
| **Integración IDE (Cursor, Claude Desktop)** | Ejemplos de config existen | No probado |
| **Contexto de Gobernanza en Tiempo Real** | No implementado | Faltante |

**Estado:** ~30% - Framework CLI funcional, servidor MCP no implementado

---

## 3. Tablero de Seguimiento de Brechas

### 3.1 Vista Kanban — Resumen por Estado

| TODO | IN PROGRESS | BLOCKED | DONE |
|------|-------------|---------|------|
| G-02 (ACL Jira) | - | - | G-12 (Protocolo MCP) |
| G-05 (DORA Metrics) | | | G-16 (Paridad EN/ES) |
| G-06 (Scorecards) | | | G-03 (Phase Gates) |
| G-10 (SDLC Ops) | | | G-04 (Architecture Drift) |
| G-11 (Scaffold Docs) | | | G-07 (Agents Install) |
| G-13 (MCP Tools) | | | G-08 (Satellite Upgrade) |
| G-14 (MCP Resources) | | | G-09 (Arch Validation) |
| G-15 (MCP Prompts) | | | |

### 3.2 Tabla de Seguimiento Detallada

| ID | Descripción | Comp. | Prioridad | Complejidad | Estado | Avance |
|----|-------------|-------|-----------|-------------|--------|--------|
| **G-12** | **Implementar protocolo servidor MCP (JSON-RPC stdio)** | MCP | 🔴 CRÍTICO | M (2-3 sem) | ✅ DONE | 100% |
| G-01 | Validación arquitectura F1/F2/F3 en CLI | Core | 🟠 ALTA | M (2-3 sem) | ✅ DONE | 100% |
| G-03 | Ejecutar transiciones de Phase Gates | CLI | 🟠 ALTA | L (3-4 sem) | ✅ DONE | 100% |
| G-04 | Detección de Architecture Drift | CLI | 🟠 ALTA | L (3-4 sem) | ✅ DONE | 100% |
| G-07 | Comando `smart-cli agents install` | CLI | 🟠 ALTA | S (1 sem) | ✅ DONE | 100% |
| G-08 | Camino de upgrade seguro para satélites | CLI | 🟠 ALTA | M (2-3 sem) | ✅ DONE | 100% |
| G-09 | Validación reglas arquitectura en CLI | CLI | 🟠 ALTA | M (2-3 sem) | ✅ DONE | 100% |
| G-17 | Cobertura tests unitarios >80% | Testing | 🟠 ALTA | L (3-4 sem) | 🟡 IN_PROGRESS | 33% |
| G-18 | Tests E2E reales con aserciones | Testing | 🟠 ALTA | L (3-4 sem) | 🟡 IN_PROGRESS | 40% |
| G-02 | Integraciones ACL Jira/Trello/Linear | Core | 🟡 MEDIA | M (2-3 sem) | ⏸️ DEFERRED | 0% |
| G-05 | Dashboard métricas DORA+SPACE | Tracker | 🟡 MEDIA | L (3-4 sem) | ⏸️ DEFERRED | 0% |
| G-06 | Scorecards ejecutivos en tiempo real | Tracker | 🟡 MEDIA | L (3-4 sem) | ⏸️ DEFERRED | 0% |
| G-10 | Transiciones de fase y generación artefactos | CLI | 🟡 MEDIA | M (2-3 sem) | ✅ DONE | 100% |
| G-11 | Andamiaje de documentación | CLI | 🟡 MEDIA | S (1 sem) | ✅ DONE | 100% |
| G-13 | Implementar 10+ herramientas MCP | MCP | 🟡 MEDIA | L (3-4 sem) | ✅ DONE | 100% |
| G-14 | Recursos MCP (Info Core, rulesets) | MCP | 🟡 MEDIA | M (2-3 sem) | ✅ DONE | 100% |
| G-15 | Prompts MCP reutilizables | MCP | 🟢 BAJA | XS (<1 sem) | ✅ DONE | 100% |
| G-16 | Paridad bilingüe 100% EN/ES | Core | 🟢 BAJA | XS (<1 sem) | ✅ DONE | 90% |

### 3.3 Leyenda de Semáforos

| Símbolo | Estado | Significado |
|---------|--------|-------------|
| 🔴 CRÍTICO | Bloqueante | Impide progreso en múltiples áreas |
| 🟠 ALTA | Prioridad | Funcionalidad core faltante |
| 🟡 MEDIA | SECOND | Importante pero no bloqueante |
| 🟢 BAJA | Nice-to-have | Mejoras menores |
| 🔵 TODO | Pendiente | No iniciado |
| 🟡 IN PROGRESS | En Curso | Trabajo activo |
| 🔴 BLOCKED | Bloqueado | Impedimento externo |
| ✅ DONE | Completado | Entregado |

---

## 4. Análisis de Brechas Detallado

### 4.1 Brechas Críticas Detalle

#### G-12: Implementación del Protocolo del Servidor MCP (CRÍTICO)

**Brecha:** `McpServerService.onModuleInit()` solo hace log en consola; sin implementación de protocolo JSON-RPC.

**Impacto:** Agentes AI (Claude Desktop, Cursor) no pueden consumir gobernanza Evolith como contexto en tiempo real.

**Corrección Requerida:**
1. Implementar `StdioServerTransport` de @modelcontextprotocol/sdk
2. Implementar handlers de tools/list, tools/call
3. Implementar handlers de resource/list, resource/read

---

#### G-01: Validación de Reglas de Arquitectura (ALTA)

**Brecha:** El comando CLI `validate` no verifica reglas de fase arquitectura F1/F2/F3.

**Evidencia:**
- `rulesets/architecture/f1-modular-monolith.rules.json` existe
- `rulesets/architecture/f2-distributed-modules.rules.json` existe
- `rulesets/architecture/f3-microservices.rules.json` existe
- Pero `RulesetValidatorService` solo valida reglas de gobernanza

**Impacto:** No se puede detectar drift arquitectónico en bounded contexts, límites de capa.

---

## 5. Matriz de Prioridades

| Prioridad | Brechas | Criterios |
|-----------|---------|-----------|
| **CRÍTICO** | G-12 | Bloquea integración de agentes AI |
| **ALTA** | G-01, G-03, G-04, G-07, G-08, G-09, G-17, G-18 | Funcionalidad core faltante |
| **MEDIA** | G-02, G-05, G-06, G-10, G-11, G-13, G-14 | Importante pero no bloqueante |
| **BAJA** | G-15, G-16 | Nice to have |

### Esfuerzo vs. Impacto

| Esfuerzo → | XS (<1sem) | S (1sem) | M (2-3sem) | L (3-4sem) |
|------------|------------|----------|------------|------------|
| **Impacto ALTO** | G-12 | G-08, G-09 | G-01, G-03, G-04, G-07 | G-17, G-18 |
| **Impacto MEDIO** | G-15 | G-06, G-11 | G-02, G-05, G-10, G-13 | - |
| **Impacto BAJO** | G-16 | - | - | - |

---

## 6. Hoja de Ruta de Recomendaciones

### Fase 1: Fundamentos (Semanas 1-4) - CRÍTICO/ALTO

| Acción | IDs de Brecha | Entregable |
|--------|---------------|------------|
| Implementar Protocolo Servidor MCP | G-12 | Servidor MCP funcional con transporte stdio |
| Implementar Validación Arquitectura CLI | G-01, G-09 | Reglas F1/F2/F3 validadas por CLI |
| Implementar Instalación de Agentes | G-07 | `smart-cli agents install` funcional |
| Implementar Lógica de Upgrade | G-08 | Camino de upgrade seguro para satélites |

### Fase 2: Completación (Semanas 5-8) - ALTO/MEDIO

| Acción | IDs de Brecha | Entregable |
|--------|---------------|------------|
| Implementar Herramientas MCP | G-13 | 10+ herramientas funcionales |
| Implementar Recursos MCP | G-14 | Info Core, rulesets como recursos |
| Implementar Operaciones SDLC | G-10 | Transiciones de fase reales |
| Aumentar Cobertura de Tests | G-17, G-18 | >80% tests unitarios, E2E reales |

### Fase 3: Consolidación (Semanas 9-12) - MEDIO

| Acción | IDs de Brecha | Entregable |
|--------|---------------|------------|
| Implementar Integraciones ACL | G-02 | Reglas de validación Jira/Trello/Linear |
| Implementar Métricas DORA | G-05 | Servicio de recolección de métricas |
| Completar Paridad Bilingüe | G-16 | 100% cobertura EN/ES |

---

## 7. Resumen de Estado

### Estado de Componentes

| Componente | Estado |
|------------|--------|
| Documentos Core | 87% (130/150 archivos) |
| ADRs | 100% (70+ archivos) |
| Rulesets (JSON) | 75% (30/40 archivos) |
| JSON Schemas | 100% (13/13 archivos) |
| Comandos CLI | 50% (3 completos, 3 stub) |
| Servidor MCP | 10% (stub únicamente) |
| Herramientas MCP | 20% (esqueleto únicamente) |
| Recursos MCP | 0% (vacío) |
| Cobertura Tests | 25% |

### Completitud de Pilares de Visión

| Pilar de Visión | Completitud | Bloqueadores |
|-----------------|-------------|--------------|
| Evolith Core | 85% | Integraciones ACL, validación arquitectura |
| Evolith Tracker | 0% | Futuro - fuera de alcance |
| CLI | 50% | Instalación agentes, upgrade, docs |
| MCP | 10% | Protocolo no implementado |

---

## 8. Qué Está Funcionando Bien

1. **Registro ADR Integral** - 70+ ADRs en múltiples runtimes
2. **Fuerte Cobertura Bilingüe** - ~90% de documentos tienen pares EN/ES
3. **Rulesets Legibles por Máquina** - JSON rules para gobernanza, ACL, fases
4. **JSON Schemas Completos** - 13 schemas para validación de artefactos
5. **Plantillas de Artefactos SDLC** - Suite completa para las 5 fases
6. **Gobernanza Federada** - Herencia y contratos de satélite funcionando
7. **Framework CLI** - CLI basada en NestJS con validación funcional

---

## 9. Camino Crítico hacia Alineación de Visión

```
Estado Actual                        Meta de Visión
     ↓                                     ↓
┌─────────────┐                    ┌─────────────────────┐
│  CLI 50%    │───────────────────►│  CLI 100%           │
│  MCP 10%    │───────────────────►│  MCP 100%           │
│  Core 85%   │───────────────────►│  Core 95%           │
│  Tracker 0% │                    │  Tracker 0% (futuro)│
└─────────────┘                    └─────────────────────┘
```

**Camino Crítico:**
1. **Protocolo MCP (G-12)** - Desbloquea integración de agentes AI
2. **Validación Arquitectura (G-01, G-09)** - Habilita aplicación de F1/F2/F3
3. **Instalación Agentes (G-07)** - Habilita onboarding de satélites
4. **Cobertura Tests (G-17, G-18)** - Asegura mantenibilidad a largo plazo

---

## 10. Fuera de Alcance

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