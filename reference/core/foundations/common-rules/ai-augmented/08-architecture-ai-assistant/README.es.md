# 08 — Asistente AI de Arquitectura Evolith

> **Navegación bilingüe:** [English](./README.md)  
> **Propietario:** Evolith Architecture Board  
> **Estado:** Propuesta Estratégica — Aprobada para Adopción Incremental  
> **Padre:** [Ingeniería AI-Augmented](../README.es.md)

---

## ¿Qué es esto?

Este módulo define la estrategia para transformar la **base de conocimiento de Evolith** — ADRs, blueprints, estándares, modelos DDD, patrones canónicos y reglas de gobernanza — en un **corpus de conocimiento gobernado, versionado y reutilizable** consumible por agentes de IA empresariales.

El resultado es el **Asistente AI de Arquitectura Evolith**: una persona de Arquitecto Principal embebida en herramientas de codificación con IA, guiando a equipos, proveedores y agentes autónomos para construir siempre en alineación con los estándares corporativos.

---

## El Problema que Resuelve

```
Sin esto:                             Con esto:
─────────────────────────────         ────────────────────────────────
Los agentes AI escriben código        Los agentes AI escriben código que
que viola la Arquitectura       →     ES validado contra ADR-0002
Hexagonal

Copilot sugiere SQL crudo dentro →    Cada sugerencia respeta la regla
de clases de dominio                  de frontera Hexagonal

Los proveedores integran sin          Los proveedores reciben guardrails
respetar estándares de        →       arquitectónicos embebidos en sus
contrato                              herramientas AI desde el día 1

Existen 133 ADRs pero ningún   →      Cada agente AI puede consultar y
agente AI los conoce                  razonar sobre cualquier ADR en contexto
```

---

## Navegación

| Documento | Propósito |
|---|---|
| [Estrategia del Asistente AI de Arquitectura](./ai-architecture-assistant-strategy.es.md) | Visión completa, estrategia de ingestión, ecosistema de agentes, gobernanza, roadmap |
| [Taxonomía de Conocimiento para IA](./knowledge-taxonomy.es.md) | Cómo se estructura cada tipo de artefacto (ADR, patrón, estándar) para consumo por IA |
| [Gobernanza de Ingesta de Conocimiento Externo](./visuals/v12-external-knowledge-intake.es.md) | Controles propuestos de procedencia, licenciamiento y promoción para fuentes arquitectónicas externas |
| [Evaluación de la Plataforma Harness](./harness-platform-evaluation.es.md) | Evaluación de Harness AI Agent como plataforma principal de orquestación |
| [Visuales](./visuals/README.es.md) | Diagramas de arquitectura: ecosistema AI, flujo RAG, colaboración entre agentes |

---

## Relación con los Estándares AI Existentes

Este módulo **extiende** la sección de Ingeniería AI-Augmented existente — no la reemplaza:

| Módulo existente | Este módulo agrega |
|---|---|
| Harness Engineering (AGENTS.md) | Capa de conocimiento que potencia el system prompt del harness |
| Integración MCP | Servidor MCP que expone los ADRs de Evolith como herramientas estructuradas |
| Patrones Agénticos | Roles de agentes específicos de arquitectura (Architect Agent, Review Agent) |
| Selección de Modelos | Qué modelos manejan razonamiento arquitectónico vs. generación de código |
| AI ADRs | Nuevos ADRs para gobernanza de conocimiento y estrategia RAG |

---

<div align="center">
  <sub>Evolith — Enterprise Architecture Platform | Asistente AI de Arquitectura</sub>
</div>
