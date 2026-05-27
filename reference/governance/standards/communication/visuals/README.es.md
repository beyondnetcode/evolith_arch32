# Evolith — Backlog Visual de Arquitectura

> **Navegación bilingüe:** [English](./README.md)  
> **Documento padre:** [Estrategia de Comunicación Arquitectónica](../architecture-communication-strategy.es.md)  
> **Propietario:** Evolith Architecture Board  
> Todos los diagramas se renderizan nativamente en GitHub con Mermaid.

Esta carpeta contiene los 8 artefactos visuales que hacen que el estándar de arquitectura corporativa Evolith sea comprensible de un vistazo. Cada visual apunta a una audiencia específica y responde una pregunta concreta.

---

## Catálogo de Visuales

| # | Visual | Audiencia principal | Pregunta que responde |
|---|---|---|---|
| [V-01](./v01-executive-one-pager.md) | **Executive One-Pager** | Ejecutivo / Sponsor | ¿Qué es Evolith? ¿Por qué lo necesitamos? ¿Qué es UMS? |
| [V-02](./v02-progressive-journey.md) | **Diagrama de Viaje Progresivo** | Todos los equipos | ¿Cuáles son las 4 etapas y qué dispara cada transición? |
| [V-03](./v03-capability-map.md) | **Mapa de Capacidades** | Arquitectos, PMs | ¿Qué ofrece la plataforma Evolith? |
| [V-04](./v04-adr-decision-tree.md) | **Árbol de Decisión ADR** | Arquitectos, Devs | ¿Qué ADR responde mi pregunta específica? |
| [V-05](./v05-onboarding-journey-map.md) | **Mapa de Journey de Onboarding** | Tech Leads, RRHH | ¿Qué lee cada rol, cuándo y en qué orden? |
| [V-06](./v06-governance-flow.md) | **Flujo de Gobernanza** | Architecture Board | ¿Cómo se escribe, revisa, aprueba y promueve un ADR? |
| [V-07](./v07-traceability-visual.md) | **Visual de Trazabilidad** | Tech Leads, QA | ¿Cómo traza cada requerimiento UMS hacia un ADR Evolith? |
| [V-08](./v08-infrastructure-topology.md) | **Topología de Infraestructura** | DevOps, SRE | ¿Cómo se ve la topología de despliegue completa? |

---

## Diagramas por Visual

| Visual | Diagramas incluidos |
|---|---|
| V-01 | Ecosistema de dos capas · Por qué ambos son necesarios · Timeline de 3 fases · Valor por stakeholder |
| V-02 | Journey de 4 etapas con disparadores · Qué obtienes en cada etapa · Criterios ADR-0045 · Checklist Fase 1 |
| V-03 | Landscape completo de capacidades · Cobertura por runtime · Cuadrante de madurez |
| V-04 | Embudo top-level · Árbol ADR Core · Árbol Node.js · Árbol .NET |
| V-05 | Flujo universal · Journey Arquitecto · Developer · QA · DevOps · PM · Proveedor externo |
| V-06 | State machine del ciclo ADR · Matriz RACI · Camino de promoción · Capas de enforcement |
| V-07 | Heatmap por cluster de dominio · Trazado FS→ADR→TE · Puntuación de impacto ADR · Cobertura TE |
| V-08 | Topología de producción completa · Stack local dev · Opciones multi-cloud · Perímetro Zero-Trust · Gates CI/CD |

---

## Tecnología

Todos los diagramas usan **Mermaid** y se renderizan nativamente en GitHub sin plugins. Para renderizar localmente:
- [Mermaid Live Editor](https://mermaid.live)
- Extensión VS Code: `Markdown Preview Mermaid Support`
- Obsidian con plugin Mermaid

Para exportar como SVG/PNG para presentaciones, pega el diagrama en [mermaid.live](https://mermaid.live) y usa el botón de exportación.
