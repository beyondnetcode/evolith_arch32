# Acceso Rapido - Estandares de Referencia por Stack

> **Proposito:** reducir la friccion de navegacion para equipos que buscan los estandares autoritativos de Web, C#/.NET y React.

Usa esta pagina cuando ya sabes el stack objetivo y necesitas el camino mas corto hacia los estandares Evolith relevantes.

## Meta y Objetivos

> **Meta:** dar a los equipos enfocados en un stack el estandar autoritativo en un clic, sin navegacion exploratoria.

**Objetivos:**

- Mapear cada stack soportado (React, API .NET, Node.js, baseline agnostico) a su unica fuente de verdad.
- Ofrecer rutas rapidas ordenadas para aplicar un estandar sin leer todo el corpus de gobernanza.
- Hacer explicito que pertenece a Evolith Core y que a los repositorios de producto, para promover practicas en lugar de copiarlas.

---

## Enlaces Directos a Estandares

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Estandar Web Frontend React](../governance/standards/engineering/web-frontend/react/react-web-frontend-standard.es.md) | Estandar autoritativo para frontends web en React | Estandarizar la entrega React | Estandar normativo | Sí |
| [Estandar API .NET](../governance/standards/engineering/api-dotnet/api-dotnet-standard.es.md) | Estandar autoritativo para APIs C# / .NET | Estandarizar la entrega de APIs .NET | Estandar normativo | Sí |
| [Perfil Tech Stack .NET y C#](../architecture/blueprints/authoritative-tech-stack-dotnet.md) | Perfil runtime aprobado para cargas .NET y C# | Fijar el stack .NET aprobado | Perfil runtime | Sí |
| [Baseline Arquitectonico Agnostico](../architecture/blueprints/authoritative-tech-stack-agnostic.md) | Baseline arquitectonico agnostico de runtime para todos los stacks | Restringir todos los stacks uniformemente | Baseline universal | Sí |

---

## Empieza Aqui por Stack

| Estoy trabajando en... | Leer primero | Luego leer | Usar para |
| :--- | :--- | :--- | :--- |
| Cualquier producto o runtime | [Baseline Arquitectonico Agnostico](../architecture/blueprints/authoritative-tech-stack-agnostic.md) | [Reference Blueprint](../architecture/blueprints/reference-blueprint.md) | Restricciones arquitectonicas universales antes de decisiones especificas de stack |
| Frontend web en React | [Estandar Web Frontend React](../governance/standards/engineering/web-frontend/react/react-web-frontend-standard.es.md) | [Seccion Frontend React](../governance/standards/engineering/web-frontend/react/README.es.md) | Arquitectura React, boilerplate, sistema UI, acceso a datos, testing, accesibilidad y reglas de promocion |
| Backend API C# / .NET | [Estandar API .NET](../governance/standards/engineering/api-dotnet/api-dotnet-standard.es.md) | [Perfil Tech Stack .NET y C#](../architecture/blueprints/authoritative-tech-stack-dotnet.md) | APIs ASP.NET Core, bootstrap de host, superficie REST/GraphQL, EF Core, observabilidad, resiliencia y quality gates |
| Workers C# / .NET o runtime no HTTP | [Perfil Tech Stack .NET y C#](../architecture/blueprints/authoritative-tech-stack-dotnet.md) | [Baseline Arquitectonico Agnostico](../architecture/blueprints/authoritative-tech-stack-agnostic.md) | Decisiones runtime para cargas .NET no API |
| Backend Node.js / TypeScript | [Perfil Tech Stack Node.js / TypeScript](../architecture/blueprints/authoritative-tech-stack-nodejs.md) | [Baseline Arquitectonico Agnostico](../architecture/blueprints/authoritative-tech-stack-agnostic.md) | Decisiones backend especificas de runtime |
| Comparacion o seleccion de stack | [Indice de Perfiles Runtime](../architecture/blueprints/authoritative-tech-stack.md) | [Resumen Tech Stack](../architecture/blueprints/tech-stack-summary.md) | Elegir o validar un perfil runtime aprobado |

---

## Rutas Rapidas

### Estandar Web React

1. Abre [Estandar Web Frontend React](../governance/standards/engineering/web-frontend/react/react-web-frontend-standard.es.md).
2. Confirma que los detalles especificos de producto permanezcan fuera de Evolith salvo promocion formal.
3. Aplica el estandar para estructura de carpetas, tokens UI, limites API, testing, seguridad y accesibilidad.

### Estandar API C# / .NET

1. Abre [Estandar API .NET](../governance/standards/engineering/api-dotnet/api-dotnet-standard.es.md).
2. Leelo junto con el [Perfil Tech Stack .NET y C#](../architecture/blueprints/authoritative-tech-stack-dotnet.md).
3. Aplica el estandar para bootstrap de host, arquitectura por capas, gobierno de superficie API, persistencia EF Core, tenancy, observabilidad, resiliencia, seguridad y quality gates.

### Trabajo Web / Frontend General

1. Empieza con [Estandar Web Frontend React](../governance/standards/engineering/web-frontend/react/react-web-frontend-standard.es.md) cuando React sea el objetivo.
2. Usa [Arquitectura de Notificaciones y Feedback](../architecture/blueprints/notification-feedback-architecture.md) cuando el trabajo toque feedback de usuario, toasts, drawers, errores o feedback de mutaciones.
3. Eleva decisiones reutilizables de UI o boilerplate mediante ADR, estandar de gobernanza o patron canonico antes de tratarlas como regla enterprise.

---

## Que Pertenece Donde

| Tema | Fuente de verdad |
| :--- | :--- |
| Reglas arquitectonicas universales | `reference/core/architecture/blueprints/authoritative-tech-stack-agnostic.md` |
| Estandar API .NET | `reference/core/foundations/common-rules/api-dotnet/` |
| Elecciones backend especificas de runtime | `reference/core/architecture/blueprints/authoritative-tech-stack-*.md` |
| Reglas frontend React | `reference/core/foundations/common-rules/web-frontend/react/` |
| Implementacion especifica de producto | Repositorio hijo o referencia aplicada UMS |
| Practica reutilizable promovida | ADR, estandar de gobernanza o patron canonico Evolith |

---

## Regla de Calidad

No copies una practica especifica de producto a Evolith solo porque existe en UMS u otro repositorio satelite. Promuevela solo cuando sea reutilizable, documentada, validada y aprobada por el camino de promocion.

---

[Volver a la raiz del repositorio](../../README.es.md)
