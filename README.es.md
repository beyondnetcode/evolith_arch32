# Evolith: Base de Referencia de Arquitectura Progresiva

[![Status](https://img.shields.io/badge/Status-Activo-brightgreen?style=for-the-badge)]()
[![Method](https://img.shields.io/badge/Metodo-Spec--driven_AI--DD-blueviolet?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-informational?style=for-the-badge)]()

**Evolith es el upstream arquitectonico corporativo para repositorios de producto.** Define estandares reutilizables, reglas de gobierno, ADRs, patrones y guias operativas que los productos satelite heredan y especializan.

Evolith resuelve un problema empresarial comun: los equipos necesitan un lugar claro para distinguir que es politica reutilizable, que es implementacion especifica de producto y como las decisiones se promueven desde productos reales hacia la referencia arquitectonica.

> Separar conceptualmente antes de separar fisicamente.

Idioma: [English](./README.md) | [Espanol](./README.es.md)

---

## Empieza aqui

| Necesidad | Ir a |
|---|---|
| **Fase 1 — Concepcion** | |
| Nuevo en Evolith | [Primeros pasos por rol](./reference/getting-started/README.es.md) |
| Entender Evolith rapidamente | [Estrategia de Comunicacion y Adopcion Arquitectonica](./reference/governance/standards/communication/architecture-communication-strategy.es.md) |
| Ver todos los visuales de explicacion y comunicacion | [Backlog Visual de Arquitectura](./reference/governance/standards/communication/visuals/README.es.md) |
| **Fase 2 — Diseno y Arquitectura** | |
| Entender el modelo arquitectonico | [Hub de arquitectura](./reference/architecture/README.es.md) |
| Revisar decisiones y trade-offs | [Registro ADR](./reference/architecture/adrs-es/README.md) |
| Encontrar estandares React, Web, C# o .NET | [Acceso rapido por stack](./reference/quick-access/README.es.md) |
| Aplicar reglas de gobierno | [Estandares de gobierno](./reference/governance/standards-es/README.md) |
| **Fase 3 — Construccion** | |
| Seguir el ciclo de vida de entrega de software | [Centro de Gobernanza SDLC](./reference/governance/sdlc/README.md) |
| Trabajar con ingenieria asistida por IA | [Referencia de adopcion AI-DD](./reference/governance/standards/ai-augmented/frameworks/README.es.md) |
| Ver la referencia ejecutable de producto | [Referencia aplicada UMS](./reference/knowledge/demo/README.es.md) |
| **Fases 4–5 — Validacion y Entrega** | |
| Operar u observar la plataforma | [Operaciones y observabilidad](./reference/operations/README.es.md) |
| Ejecutar infraestructura local | [Infraestructura y orquestacion](./reference/infrastructure/README.es.md) |
| **Todas las fases** | |
| Explorar todo | [Indice maestro global](./MASTER_INDEX.es.md) |

---

## Evolith vs UMS

| Pregunta | Evolith | UMS |
|---|---|---|
| Que pertenece aqui? | Estandares reutilizables, principios, ADRs, gobierno, patrones canonicos, quality gates | Evidencia de implementacion especifica de producto y ejemplos aplicados |
| Que no debe copiarse aqui directamente? | Rutas, headers, schemas, seeds, valores runtime y branding locales | Politica empresarial salvo promocion mediante gobierno Evolith |
| Como una practica UMS se convierte en estandar? | Mediante ADR, estandar de gobierno o patron canonico | Aportando evidencia, no autoridad |

UMS es el modelo ejecutable oficial de referencia. Usalo para ver ideas Evolith aplicadas en un producto real, pero conserva los detalles especificos en UMS salvo que se promuevan formalmente.

---

## Contribucion

Contribuir a Evolith significa fortalecer el estandar empresarial. Agrega aqui guia reutilizable. Conserva la evidencia especifica de producto en repositorios satelite como UMS salvo que la practica haya sido promovida por el camino de gobierno.

Antes de contribuir, lee:

- [AGENTS.es.md](./AGENTS.es.md)
- [Taxonomia del repositorio](./reference/governance/standards-es/repository-taxonomy.es.md)
- [Guia de herencia para repositorios hijos](./reference/governance/standards/onboarding/child-repository-inheritance-guide.es.md)
- [ADR Gitflow](./reference/architecture/adrs-es/core/0050-estrategia-ramas-gitflow.md)

---

## Licencia

Este proyecto se publica bajo la [Licencia MIT](./LICENSE).

---

<div align="center">
 <sub>Evolith - Enterprise Architecture Platform | Progressive Reference Corpus | Spec-driven AI-DD</sub>
</div>