# Evolith C4 Master Architecture Hub

> **Navegación Bilingüe:** [See English Version](./C4-MASTER-ARCHITECTURE.md)

**Estado:** Baseline Implementada + Evolución Objetivo (Aprobada)  
**Propietario:** Evolith Architecture Board  
**Última Actualización:** 2026-07-01

## 1. Resumen Ejecutivo

Evolith es el plano de control y gobernanza para la ingeniería de software nativa de IA. Este documento sirve como la **Única Fuente de Verdad** para la arquitectura de extremo a extremo de Evolith, mapeando la intención de negocio hasta servicios ejecutables, paquetes, rulesets y módulos de código.

Esta arquitectura maestra adopta el **Modelo C4** (Context, Containers, Components, Code) para permitir un acercamiento progresivo desde una visión sistémica de alto nivel hasta runtimes implementados, límites de paquetes, esquemas y políticas. Cuando la implementación de referencia contiene comportamiento transitorio, las vistas de menor nivel lo declaran explícitamente en lugar de tratarlo como el límite de producto de largo plazo.

---

## 2. Modelo de Arquitectura Navegable (C4)

Elige un nivel de abstracción para explorar la arquitectura:

| Nivel | Alcance | Descripción | Enlace |
|-------|---------|-------------|--------|
| **Nivel 1** | System Context | La visión panorámica de Evolith: ecosistema, Tracker SaaS, Core Governance y proveedores externos. | [Nivel 1: Context](./level-1-system-context.es.md) |
| **Nivel 2** | Containers | Los runtimes lógicos implementados: Core API, MCP Server, Agent Runtime API/Engine, Smart CLI, caché Redis y corpus de referencia. Tracker permanece externo a este repositorio. | [Nivel 2: Containers](./level-2-containers.es.md) |
| **Nivel 3** | Components | Los bloques internos de cada contenedor: controladores, comandos, registros de tools, casos de uso, adaptadores, evaluadores y servicios de dominio. | [Nivel 3: Components](./level-3-components/README.es.md) |
| **Nivel 4** | Code/Modules | El mapeo de más bajo nivel: archivos, esquemas, reglas OPA y clases específicas. | [Nivel 4: Code & Modules](./level-4-code-modules/README.es.md) |

---

## 3. Vistas Temáticas de Detalle

Más allá del modelo jerárquico C4, la arquitectura puede analizarse a través de lentes temáticos transversales:

- **Visual Map (Explorador Interactivo):** Navegación visual y dinámica del modelo C4, flujos e integraciones. [Abrir Visual Map](https://beyondnetcode.github.io/evolith_arch32/)
- **Despliegue e Infraestructura:** Topologías físicas (VPS, Coolify, futuro Kubernetes). [Explorar Despliegues](./view-by-deployment.es.md)
- **Flujos y Trazabilidad E2E:** Flujos de datos desde la intención inicial a través de validación, rulesets y salidas. [Explorar Flujos](./view-by-flow.es.md)
- **Flujos de Interfaces del Core:** Contratos IN/OUT, rutas de procesamiento, resiliencia, auditoría y guía de clientes para cada interfaz Core (incluye **Ejemplos de Contratos JSON**). [Explorar Flujos de Interfaces](./view-by-interface-flow.es.md)
- **Integraciones y Ecosistema:** Capacidades externas compuestas mediante Puertos de Proveedor (LLMs, Jira, GitHub, Observabilidad). [Explorar Integraciones](./view-by-integration.es.md)
- **Multi-Tenancy y Autorización:** Cómo el tracker garantiza el aislamiento de tenants sobre el Core stateless. [Explorar Tenants](./view-by-tenant.es.md)

---

## 4. Matriz de Trazabilidad

Para comprender cómo las interfaces de alto nivel se mapean a tecnologías específicas y componentes internos, consulta la [Matriz de Trazabilidad E2E](../../control-center/taxonomy/e2e-traceability-matrix.es.md).

---
[Volver al Índice de Arquitectura](./README.es.md)
