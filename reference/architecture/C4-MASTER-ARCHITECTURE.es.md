# Evolith C4 Master Architecture Hub

> **Navegación Bilingüe:** [See English Version](./C4-MASTER-ARCHITECTURE.md)

**Estado:** Arquitectura Objetivo (Aprobada)  
**Propietario:** Evolith Architecture Board  
**Última Actualización:** 2026-06-30

## 1. Resumen Ejecutivo

Evolith es el plano de control y gobernanza para la ingeniería de software nativa de IA. Este documento sirve como la **Única Fuente de Verdad** para la arquitectura de extremo a extremo de Evolith, mapeando la intención de negocio hasta los módulos de código individuales. 

Esta arquitectura maestra adopta el **Modelo C4** (Context, Containers, Components, Code) para permitir un acercamiento progresivo desde una visión sistémica de alto nivel hasta microservicios y esquemas específicos.

---

## 2. Modelo de Arquitectura Navegable (C4)

Elige un nivel de abstracción para explorar la arquitectura:

| Nivel | Alcance | Descripción | Enlace |
|-------|---------|-------------|--------|
| **Nivel 1** | System Context | La visión panorámica de Evolith: ecosistema, Tracker SaaS, Core Governance y proveedores externos. | [Nivel 1: Context](./c4-levels/level-1-system-context.es.md) |
| **Nivel 2** | Containers | Los runtimes lógicos: Frontend, Core-API, MCP Server, Agent Runtime, CLI, bases de datos y brokers de mensajes. | [Nivel 2: Containers](./c4-levels/level-2-containers.es.md) |
| **Nivel 3** | Components | Los bloques internos de cada contenedor: casos de uso, controladores, adaptadores y servicios de dominio. | [Nivel 3: Components](./c4-levels/level-3-components/README.es.md) |
| **Nivel 4** | Code/Modules | El mapeo de más bajo nivel: archivos, esquemas, reglas OPA y clases específicas. | [Nivel 4: Code & Modules](./c4-levels/level-4-code-modules/README.es.md) |

---

## 3. Vistas Temáticas de Detalle

Más allá del modelo jerárquico C4, la arquitectura puede analizarse a través de lentes temáticos transversales:

- **Despliegue e Infraestructura:** Topologías físicas (VPS, Coolify, futuro Kubernetes). [Explorar Despliegues](./views/view-by-deployment.es.md)
- **Flujos y Trazabilidad E2E:** Flujos de datos desde la intención inicial a través de validación, rulesets y salidas. [Explorar Flujos](./views/view-by-flow.es.md)
- **Integraciones y Ecosistema:** Capacidades externas compuestas mediante Puertos de Proveedor (LLMs, Jira, GitHub, Observabilidad). [Explorar Integraciones](./views/view-by-integration.es.md)
- **Multi-Tenancy y Autorización:** Cómo el tracker garantiza el aislamiento de tenants sobre el Core stateless. [Explorar Tenants](./views/view-by-tenant.es.md)

---

## 4. Matriz de Trazabilidad

Para comprender cómo las interfaces de alto nivel se mapean a tecnologías específicas y componentes internos, consulta la [Matriz de Trazabilidad E2E](./traceability/e2e-traceability-matrix.es.md).

---
[Volver al Índice de Arquitectura](./README.es.md)
