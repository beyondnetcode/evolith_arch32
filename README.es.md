<div align="center">

# Evolith: Base de Referencia de Arquitectura Progresiva

> **Navegación Bilingüe:** [English](./README.md)

[![Status](https://img.shields.io/badge/Status-Activo-brightgreen?style=for-the-badge)]()
[![Method](https://img.shields.io/badge/Method-Spec--driven_AI--DD-blueviolet?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-informational?style=for-the-badge)]()
[![CI](https://img.shields.io/github/actions/workflow/status/beyondnetcode/evolith_arch32/docs.yml?style=for-the-badge&label=CI)](https://github.com/beyondnetcode/evolith_arch32/actions)
[![Coverage](https://img.shields.io/badge/Docs-100%25-brightgreen?style=for-the-badge)](./COVERAGE_REPORT.md)

<br/>

<a href="./reference/governance/sdlc/assets/master-view.png" title="Visión General del Producto Evolith E2E — clic para ampliar">
  <img src="./reference/governance/sdlc/assets/master-view.png"
       alt="Visión General del Producto Evolith E2E"
       width="780"
       style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);" />
</a>

<sub>↑ Visión General del Producto Evolith E2E · MD3 — <i>clic para ampliar</i></sub>

<br/>

**Evolith es el upstream de arquitectura corporativa para repositorios de productos.**<br/>
Define estándares de arquitectura reutilizables, reglas de gobernanza, ADRs, patrones<br/>
y guía operativa que los productos satélite heredan y especializan.

> *Separar conceptualmente antes de separar físicamente.*

---

## 📑 Menú de Navegación Rápida

| Categoría | Punto de Entrada | Descripción |
|----------|------------------|-------------|
| 📚 **Arquitectura** | [Hub](./reference/architecture/README.md) | Patrones, blueprints, decisiones |
| 🏛️ **ADRs** | [Registro](./reference/architecture/adrs/README.md) | 70+ decisiones arquitectónicas |
| 🏗️ **Ingeniería** | [Manifiesto](./reference/governance/standards/engineering/engineering-manifesto.md) | Estándares, convenciones |
| 🚦 **SDLC** | [Gobernanza](./reference/governance/sdlc/README.md) | Phase gates, flujo de entrega |
| 🤖 **AI & Herramientas** | [Smart CLI](./sdk/cli/README.md) | `npx @evolith/smart-cli init` |
| 📊 **Visión** | [Visión del Producto](./reference/governance/standards/vision/evolith-product-vision-master.es.md) | Estrategia y hoja de ruta |
| 🔍 **Análisis de Brechas** | [Análisis](./reference/governance/standards/vision/gap-analysis-core.es.md) | ⚠️ **NUEVO** Estado actual vs visión |
| 📋 **Índice Completo** | [Índice Maestro](./reference/navigation/MASTER_INDEX.md) | Navegación completa |
| 🚀 **Referencia Aplicada** | [UMS Demo](./reference/knowledge/demo/README.md) | Ejemplo de producto real |

---

## 🎯 Comienza Aquí — Elige Tu Camino

### Camino 1 — Vista de 5 Minutos

📄 [Resumen Ejecutivo](./reference/governance/standards/communication/visuals/v01-executive-one-pager.es.md)

*¿Qué es Evolith? ¿Por qué lo necesitamos? ¿Qué es UMS?*

### Camino 2 — Por Rol

| Rol | Comienza Aquí | Luego Lee |
|-----|---------------|-----------|
| 🏛️ **Arquitecto** | [Hub de Arquitectura](./reference/architecture/README.md) | [Matriz ADR](./reference/architecture/adrs/adr-matrix.md) |
| 👨‍💻 **Desarrollador** | [Manifiesto de Ingeniería](./reference/governance/standards/engineering/engineering-manifesto.md) | [Referencia UMS](./reference/knowledge/demo/README.md) |
| 🛠️ **DevOps/SRE** | [Hub de Operaciones](./reference/operations/README.md) | [Infraestructura](./reference/infrastructure/README.md) |
| 📦 **Producto/PM** | [Modelo de Referencia UMS](./reference/knowledge/demo/ums-reference-model.md) | [Casos de Adopción](./reference/knowledge/adoption-cases.md) |
| 🤖 **Contribuidor IA** | [Estándares IA](./reference/governance/standards/ai-augmented/README.md) | [AGENTS.md](./AGENTS.md) |

### Camino 3 — Tomar una Decisión Arquitectónica

1. Revisa el [Registro ADR](./reference/architecture/adrs/README.md) — ¿existe ya la decisión?
2. Si no, usa la [Plantilla ADR](./reference/governance/sdlc/04-artifact-templates/adr-template.es.md)
3. Envía a revisión del [Tablero de Arquitectura](./reference/governance/standards/communication/architecture-communication-strategy.md)

---

## 📂 Estructura del Repositorio (Exploración Profunda)

### 📚 Arquitectura y Patrones
| Artefacto | Propósito |
|-----------|-----------|
| [Hub de Arquitectura](./reference/architecture/README.md) | Entrada central para arquitectura |
| [Blueprints](./reference/architecture/blueprints/README.md) | Stacks técnicos, modelos de referencia |
| [Patrones Canónicos](./reference/architecture/canonical-patterns/README.md) | Patrones de diseño reutilizables |
| [Spec Topología C4](./reference/architecture/blueprints/c4-topology-spec.md) | Visualización de sistemas |

### 🏛️ Registros de Decisiones Arquitectónicas
| Artefacto | Propósito |
|-----------|-----------|
| [Registro ADR](./reference/architecture/adrs/README.md) | Todos los ADRs por runtime |
| [ADRs Core](./reference/architecture/adrs/core/README.md) | Decisiones agnósticas de lenguaje |
| [ADRs Node.js](./reference/architecture/adrs/nodejs/README.md) | Específico de Node.js |
| [ADRs .NET](./reference/architecture/adrs/dotnet/README.md) | Específico de .NET |
| [Matriz ADR](./reference/architecture/adrs/adr-matrix.md) | Resumen de decisiones |

### 🏗️ Estándares de Ingeniería
| Artefacto | Propósito |
|-----------|-----------|
| [Manifiesto de Ingeniería](./reference/governance/standards/engineering/engineering-manifesto.md) | Principios core |
| [Contract Testing](./reference/governance/standards/engineering/contract-testing-guideline.es.md) | Testing de integración |
| [Observabilidad](./reference/governance/standards/engineering/observability-playbook.es.md) | Monitoreo y tracing |
| [Riesgo de Proveedores](./reference/governance/standards/engineering/vendor-risk-assessment.es.md) | Evaluación de terceros |

### 🚦 SDLC y Entrega
| Artefacto | Propósito |
|-----------|-----------|
| [Gobernanza SDLC](./reference/governance/sdlc/README.md) | Phase gates, quality gates |
| [Plantillas de Artefactos](./reference/governance/sdlc/04-artifact-templates/README.md) | PRD, ADR, Historias |
| [Definition of Done](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.es.md) | Checklist de DoD |

### 🤖 Ingeniería Augmentada por IA
| Artefacto | Propósito |
|-----------|-----------|
| [Estándares IA](./reference/governance/standards/ai-augmented/README.md) | Estándares de integración IA |
| [Integración MCP](./reference/governance/standards/ai-augmented/02-mcp-integration/README.es.md) | Guía del protocolo MCP |
| [Smart CLI](./sdk/cli/README.es.md) | CLI para onboarding de satélites |

### 📊 Visión y Estrategia
| Artefacto | Propósito |
|-----------|-----------|
| [Visión del Producto](./reference/governance/standards/vision/evolith-product-vision-master.es.md) | Declaración completa de visión |
| [Análisis de Brechas](./reference/governance/standards/vision/gap-analysis-core.es.md) | ⚠️ **NUEVO** Estado actual vs visión |
| [Hoja de Ruta Evolutiva](./reference/governance/standards/vision/evolutionary-strategy-roadmap.es.md) | Plan fase por fase |
| [Matriz de Madurez](./reference/governance/standards/vision/maturity-matrix.es.md) | Evaluación de madurez organizacional |

### 🚀 Referencia Aplicada
| Artefacto | Propósito |
|-----------|-----------|
| [Hub de Referencia UMS](./reference/knowledge/demo/README.md) | Referencia de producto aplicada |
| [Arquitectura UMS](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) | Docs externos de UMS |
| [Casos de Adopción](./reference/knowledge/adoption-cases.es.md) | Lecciones de productos reales |

---

## 🔧 Herramientas y Scripts

### Smart CLI (Oficial)
```bash
# Inicializar nuevo repositorio satélite
npx @evolith/smart-cli init

# Validar contra estándares Evolith
smart-cli validate

# Gestionar ADRs
smart-cli adr create
smart-cli adr list

# Servidor MCP para asistentes IA
smart-cli mcp serve
```

📖 [Documentación CLI](./sdk/cli/README.es.md)
📊 [Arquitectura CLI](./sdk/cli/ARCHITECTURE.es.md)
🎯 [Visión del Producto CLI](./sdk/cli/docs/VISION.es.md)
🔍 [Análisis de Estado](./sdk/cli/docs/planning/sdk-cli-mcp-current-state-assessment.md)

### Pre-commit Hooks
| Hook | Propósito |
|------|-----------|
| [validate-docs.mjs](./.harness/scripts/validate-docs.mjs) | Validación de links y anchors |
| [check-bilingual-parity.mjs](./.harness/scripts/check-bilingual-parity.mjs) | Paridad estructural EN/ES |
| [impact-analysis-synchronizer.mjs](./.harness/scripts/impact-analysis-synchronizer.mjs) | Sync de impacto cross-repo |

---

## 📖 Evolith vs UMS — Qué Va Dónde

| Pregunta | Evolith (Referencia) | UMS (Producto) |
|----------|----------------------|----------------|
| ¿Qué pertenece aquí? | Estándares reutilizables, principios, ADRs, gobernanza, patrones canónicos | Evidencia de implementación específica del producto |
| ¿Cómo contribuye un producto? | Proponer un ADR respaldado por evidencia real | Proporcionar prueba de concepto ejecutable |
| ¿Qué stays local? | La política enterprise debe pasar por gobernanza | Rutas de producto, esquemas, seeds, branding |

UMS es la referencia ejecutable oficial. Ver [Casos de Adopción](./reference/knowledge/adoption-cases.es.md) para ejemplos reales.

---

## 🤝 Contribución

Antes de contribuir, lee:

- [AGENTS.md](./AGENTS.md) — Reglas y convenciones de agentes
- [Taxonomía del Repositorio](./reference/governance/standards/repository-taxonomy.md) — Qué va dónde
- [Guía de Herencia](./reference/governance/standards/onboarding/child-repository-inheritance-guide.es.md) — Cómo los productos heredan

---

## 📋 Todos los Índices de Navegación

| Índice | Propósito |
|--------|-----------|
| [Índice Maestro](./reference/navigation/MASTER_INDEX.md) | Navegación completa del repositorio |
| [Índice de Arquitectura](./reference/architecture/README.md) | Todos los artefactos de arquitectura |
| [Índice de Visión](./reference/governance/standards/vision/README.es.md) | Estrategia y análisis de brechas |
| [Índice SDLC](./reference/governance/sdlc/README.md) | Artefactos de entrega y gobernanza |
| [Índice Bilingüe](./reference/navigation/BILINGUAL_INDEX.md) | Pares de documentos EN/ES |

---

## Licencia

Publicado bajo la [Licencia MIT](./LICENSE).

---

<div align="center">
  <sub>Evolith - Plataforma de Arquitectura Empresarial | Corpus de Referencia Progresivo | Spec-driven AI-DD</sub>
</div>