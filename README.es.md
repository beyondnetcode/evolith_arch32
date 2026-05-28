# Evolith: Base de Referencia de Arquitectura Progresiva

[![Status](https://img.shields.io/badge/Status-Activo-brightgreen?style=for-the-badge)]()
[![Method](https://img.shields.io/badge/Metodo-Spec--driven_AI--DD-blueviolet?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-informational?style=for-the-badge)]()

**Evolith es el upstream arquitectonico corporativo para repositorios de producto.** Define estandares reutilizables, reglas de gobierno, ADRs, patrones y guias operativas que los productos satelite heredan y especializan.

Evolith resuelve un problema empresarial comun: los equipos necesitan un lugar claro para distinguir que es politica reutilizable, que es implementacion especifica de producto y como las decisiones se promueven desde productos reales hacia la referencia arquitectonica.

> Separar conceptualmente antes de separar fisicamente.

Idioma: [English](./README.md) | [Espanol](./README.es.md)

---

## Entrada mas rapida

> **Lee esto primero:** [Estrategia de Comunicacion y Adopcion Arquitectonica](./reference/governance/standards/communication/architecture-communication-strategy.es.md)  
> La forma mas rapida de entender Evolith, UMS, responsabilidades de repositorios, capas de audiencia y camino de adopcion.
>
> **Luego usa el indice visual:** [Backlog Visual de Arquitectura](./reference/governance/standards/communication/visuals/README.es.md)  
> Un indice para los 8 visuales de explicacion y comunicacion: resumen ejecutivo, viaje progresivo, mapa de capacidades, arbol ADR, onboarding, gobernanza, trazabilidad y topologia de infraestructura.

---

## Empieza aqui

| Necesidad | Ir a |
|---|---|
| Entender Evolith rapidamente | [Estrategia de Comunicacion y Adopcion Arquitectonica](./reference/governance/standards/communication/architecture-communication-strategy.es.md) |
| Ver todos los visuales de explicacion y comunicacion | [Backlog Visual de Arquitectura](./reference/governance/standards/communication/visuals/README.es.md) |
| Nuevo en Evolith | [Primeros pasos por rol](./reference/getting-started/README.es.md) |
| Encontrar estandares React, Web, C# o .NET | [Acceso rapido por stack](./reference/quick-access/README.es.md) |
| Entender el modelo arquitectonico | [Hub de arquitectura](./reference/architecture/README.es.md) |
| Revisar decisiones y trade-offs | [Registro ADR](./reference/architecture/adrs-es/README.md) |
| Aplicar reglas de gobierno | [Estandares de gobierno](./reference/governance/standards-es/README.md) |
| Ver la referencia ejecutable de producto | [Referencia aplicada UMS](./reference/knowledge/demo/README.es.md) |
| Trabajar con ingenieria asistida por IA | [Referencia de adopcion AI-DD](./reference/governance/standards/ai-augmented/frameworks/README.es.md) |
| Operar u observar la plataforma | [Operaciones y observabilidad](./reference/operations/README.es.md) |
| Ejecutar infraestructura local | [Infraestructura y orquestacion](./reference/infrastructure/README.es.md) |
| Explorar todo | [Indice maestro global](./MASTER_INDEX.es.md) |

---

## Rutas rapidas por rol

| Rol | Empezar con | Luego leer |
|---|---|---|
| Arquitecto | [Hub de arquitectura](./reference/architecture/README.es.md) | [Registro ADR](./reference/architecture/adrs-es/README.md) |
| Ingeniero backend | [Estandar API .NET](./reference/governance/standards/engineering/api-dotnet/api-dotnet-standard.es.md) | [Perfil .NET y C#](./reference/architecture/blueprints-es/authoritative-tech-stack-dotnet.md) |
| Ingeniero frontend | [Estandar Web Frontend React](./reference/governance/standards/engineering/web-frontend/react/react-web-frontend-standard.es.md) | [Acceso rapido por stack](./reference/quick-access/README.es.md) |
| Product o delivery lead | [Referencia aplicada UMS](./reference/knowledge/demo/README.es.md) | [Guia de herencia para repositorios hijos](./reference/governance/standards/onboarding/child-repository-inheritance-guide.es.md) |
| DevOps o plataforma | [Operaciones y observabilidad](./reference/operations/README.es.md) | [Infraestructura y orquestacion](./reference/infrastructure/README.es.md) |
| Usuario de ingenieria asistida por IA | [Referencia de adopcion AI-DD](./reference/governance/standards/ai-augmented/frameworks/README.es.md) | [AGENTS.es.md](./AGENTS.es.md) |
| Revisor de gobierno | [Estandares de gobierno](./reference/governance/standards-es/README.md) | [Taxonomia del repositorio](./reference/governance/standards-es/repository-taxonomy.es.md) |

---

## Accesos directos a estandares

| Estandar o perfil | Enlace directo | Uso |
|---|---|---|
| Estrategia de Comunicacion y Adopcion Arquitectonica | [Abrir](./reference/governance/standards/communication/architecture-communication-strategy.es.md) | Explicacion mas rapida de Evolith, UMS, roles de repositorios, capas de audiencia y camino de adopcion |
| Backlog Visual de Arquitectura | [Abrir](./reference/governance/standards/communication/visuals/README.es.md) | Indice de diagramas y explicaciones visuales para ejecutivos, arquitectos, devs, QA, DevOps y PMs |
| Estandar Web Frontend React | [Abrir](./reference/governance/standards/engineering/web-frontend/react/react-web-frontend-standard.es.md) | Arquitectura React, boilerplate, tokens UI, acceso a datos, testing, accesibilidad |
| Estandar API .NET | [Abrir](./reference/governance/standards/engineering/api-dotnet/api-dotnet-standard.es.md) | APIs ASP.NET Core, bootstrap de host, superficie REST/GraphQL, persistencia, quality gates |
| Perfil .NET y C# | [Abrir](./reference/architecture/blueprints-es/authoritative-tech-stack-dotnet.md) | Runtime, librerias, perfil de plataforma |
| Baseline agnostico | [Abrir](./reference/architecture/blueprints-es/authoritative-tech-stack-agnostic.md) | Restricciones universales antes de decisiones por stack |
| Todos los caminos por stack | [Abrir](./reference/quick-access/README.es.md) | Navegacion rapida para Web, React, C#/.NET, Node.js y perfiles runtime |

---

## Evolith vs UMS

| Pregunta | Evolith | UMS |
|---|---|---|
| Que pertenece aqui? | Estandares reutilizables, principios, ADRs, gobierno, patrones canonicos, quality gates | Evidencia de implementacion especifica de producto y ejemplos aplicados |
| Que no debe copiarse aqui directamente? | Rutas, headers, schemas, seeds, valores runtime y branding locales | Politica empresarial salvo promocion mediante gobierno Evolith |
| Como una practica UMS se convierte en estandar? | Mediante ADR, estandar de gobierno o patron canonico | Aportando evidencia, no autoridad |

UMS es el modelo ejecutable oficial de referencia. Usalo para ver ideas Evolith aplicadas en un producto real, pero conserva los detalles especificos en UMS salvo que se promuevan formalmente.

---

## Mapa del repositorio

| Area | Entrada | Proposito |
|---|---|---|
| Arquitectura | [reference/architecture](./reference/architecture/README.es.md) | Blueprints, ADRs, perfiles runtime, patrones canonicos |
| Gobierno | [reference/governance/standards](./reference/governance/standards-es/README.md) | Estandares empresariales, SDLC, onboarding, taxonomia, reglas de calidad |
| Comunicacion arquitectonica | [reference/governance/standards/communication/visuals](./reference/governance/standards/communication/visuals/README.es.md) | Explicaciones visuales, diagramas de comunicacion, mapas de onboarding, flujo de gobernanza y vistas de trazabilidad |
| Inteligencia Arquitectonica | [reference/knowledge/architecture-intelligence](./reference/knowledge/architecture-intelligence/README.es.md) | Conocimiento arquitectonico consumible por IA y gobierno del catalogo de patrones |
| Ingenieria asistida por IA | [AI-DD Frameworks](./reference/governance/standards/ai-augmented/frameworks/README.es.md) | Reglas locales de adopcion para frameworks de desarrollo asistido por IA |
| Operaciones | [reference/operations](./reference/operations/README.es.md) | Observabilidad, soporte runtime, guias operativas |
| Infraestructura | [reference/infrastructure](./reference/infrastructure/README.es.md) | Plataforma local, gateway, contenedores, orquestacion |
| Conocimiento | [reference/knowledge](./reference/knowledge/demo/README.es.md) | Referencia aplicada UMS, registros de migracion, activos de inteligencia arquitectonica |
| Referencia de producto | [Repositorio UMS](https://github.com/beyondnetcode/ums) | Producto satelite ejecutable oficial |

---

## Primeras lecturas recomendadas

1. [Estrategia de Comunicacion y Adopcion Arquitectonica](./reference/governance/standards/communication/architecture-communication-strategy.es.md)
2. [Backlog Visual de Arquitectura](./reference/governance/standards/communication/visuals/README.es.md)
3. [Primeros pasos por rol](./reference/getting-started/README.es.md)
4. [Acceso rapido por stack](./reference/quick-access/README.es.md)
5. [Hub de arquitectura](./reference/architecture/README.es.md)
6. [Registro ADR](./reference/architecture/adrs-es/README.md)
7. [Estandares de gobierno](./reference/governance/standards-es/README.md)
8. [Referencia aplicada UMS](./reference/knowledge/demo/README.es.md)

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