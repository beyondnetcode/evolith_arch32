# Evolith: Base de Referencia de Arquitectura Progresiva

[![Status](https://img.shields.io/badge/Status-Activo-brightgreen?style=for-the-badge)]()
[![Method](https://img.shields.io/badge/Metodo-Spec--driven_AI--DD-blueviolet?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-informational?style=for-the-badge)]()

**Evolith es el upstream arquitectonico corporativo para repositorios de producto.** Define estandares reutilizables, reglas de gobierno, ADRs, patrones y guias operativas que los productos satelite heredan y especializan.

Evolith resuelve un problema empresarial comun: los equipos necesitan un lugar claro para distinguir que es politica reutilizable, que es implementacion especifica de producto y como las decisiones se promueven desde productos reales hacia la referencia arquitectonica.

> Separar conceptualmente antes de separar fisicamente.

## Evolith SDK CLI (Oficial)

Para automatizar la adopción de Evolith en nuevos repositorios satélite o integrar herramientas IDE (vía OpenCode/MCP), recomendamos fuertemente utilizar el CLI oficial.

 **[Ver Documentación del CLI](./sdk/cli/README.md)**

```bash
npx @evolith/smart-cli init
```

Idioma: [English](./README.md) | [Espanol](./README.es.md)

---

## Puntos de Entrada Clave

| Punto de Entrada | Que cubre | Ir a |
|---|---|---|
| **Comunicacion de Arquitectura y Documentacion** | Estrategia de comunicacion, mapa documental, diagramas visuales, narrativa de comunicacion, rutas de lectura por rol, modelo de herencia Evolith | [Estrategia de Comunicacion de Arquitectura](./reference/governance/standards/communication/architecture-communication-strategy.es.md) |
| **Flujo SDLC y Gobernanza de Entrega** | Ciclo de vida de entrega, fases, roles, quality gates, Definition of Done, expectativas de documentacion, SDLC enfocado en construccion, gobernanza de release | [Centro de Gobernanza SDLC](./reference/governance/sdlc/README.es.md) |
| **Hub de Navegacion del Repositorio** | Indice maestro completo, log de versiones documentales y stubs de compatibilidad de raiz | [Hub de Navegacion](./reference/navigation/README.es.md) |

**Sub-enlaces rapidos:**

- [Hub de Arquitectura](./reference/architecture/README.es.md) · [Backlog de Arquitectura Visual](./reference/governance/standards/communication/visuals/README.es.md) · [Indice Maestro](./reference/navigation/MASTER_INDEX.es.md) · [Rutas por Rol](./reference/getting-started/README.es.md)
- [SDLC Enfocado en Construccion](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.es.md) · [Manifiesto de Ingenieria](./reference/governance/standards/engineering/engineering-manifesto.es.md) · [Guia de Contract Testing](./reference/governance/standards/engineering/contract-testing-guideline.es.md) · [Registro ADR](./reference/architecture/adrs/README.md)

---

## Empieza aqui — Elige tu camino

### Camino 1 — Quiero una vision general de 5 minutos

Lee el [Resumen Ejecutivo Visual](./reference/governance/standards/communication/visuals/v01-executive-one-pager.es.md). Responde: Que es Evolith? Por que lo necesitamos? Que es UMS?

### Camino 2 — Tengo un rol especifico

| Rol | Empezar aqui | Luego leer |
|---|---|---|
| Arquitecto | [Hub de Arquitectura](./reference/architecture/README.es.md) | [Matriz ADR](./reference/architecture/adrs/adr-matrix.es.md) |
| Desarrollador | [Manifiesto de Ingenieria](./reference/governance/standards/engineering/engineering-manifesto.es.md) | [Modelo de Referencia UMS](./reference/knowledge/demo/README.es.md) |
| DevOps / SRE | [Hub de Operaciones](./reference/operations/README.es.md) | [Hub de Infraestructura](./reference/infrastructure/README.es.md) |
| Producto / PM | [Modelo de Referencia UMS](./reference/knowledge/demo/ums-reference-model.es.md) | [Casos de Adopcion](./reference/knowledge/adoption-cases.es.md) |
| Contribuidor AI | [Estandares AI-Augmented](./reference/governance/standards/ai-augmented/README.es.md) | [AGENTS.es.md](./AGENTS.es.md) |

### Camino 3 — Necesito tomar una decision arquitectonica

1. Revisa el [Registro ADR](./reference/architecture/adrs/README.md) para ver si ya existe una decision
2. Si no, usa la [Plantilla ADR](./reference/governance/sdlc/04-artifact-templates/adr-template.es.md) para proponer una
3. Enviala a la [Junta de Arquitectura](./reference/governance/standards/communication/architecture-communication-strategy.es.md) para revision

---

## Evolith vs UMS — Que va donde

| Pregunta | Evolith | UMS |
|---|---|---|
| Que pertenece aqui? | Estandares reutilizables, principios, ADRs, gobierno, patrones canonicos, quality gates | Evidencia de implementacion especifica de producto |
| Como contribuye un producto? | Proponer un ADR respaldado por evidencia real | Proporcionar prueba de concepto ejecutable |
| Que permanece local? | Rutas de producto, schemas, seeds, branding | La politica empresarial debe pasar por el gobierno de Evolith |

UMS es la referencia ejecutable oficial. Ver [Casos de Adopcion](./reference/knowledge/adoption-cases.es.md) para ejemplos reales de lecciones de productos promovidas a estandares.

---

## Contribucion

Antes de contribuir, lee:

- [AGENTS.es.md](./AGENTS.es.md) — Reglas y convenciones de agentes
- [Taxonomia del Repositorio](./reference/governance/standards/repository-taxonomy.es.md) — Que va donde
- [Guia de Herencia para Repositorios Hijos](./reference/governance/standards/onboarding/child-repository-inheritance-guide.es.md) — Como los productos heredan de Evolith

Navegacion completa: [reference/navigation/MASTER_INDEX.es.md](./reference/navigation/MASTER_INDEX.es.md)

---

## Licencia

Publicado bajo la [Licencia MIT](./LICENSE).

---

<div align="center">
  <sub>Evolith - Enterprise Architecture Platform | Progressive Reference Corpus | Spec-driven AI-DD</sub>
</div>