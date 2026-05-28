# Acceso Rapido — Estandares de Referencia por Stack

> **Proposito:** reducir la friccion de navegacion para equipos que buscan los estandares autoritativos de Web, C#/.NET y React.

Usa esta pagina cuando ya sabes el stack objetivo y necesitas el camino mas corto hacia los estandares Evolith relevantes.

---

## Empieza Aqui por Stack

| Estoy trabajando en... | Leer primero | Luego leer | Usar para |
| :--- | :--- | :--- | :--- |
| Cualquier producto o runtime | [Baseline Arquitectonico Agnostico](../architecture/blueprints-es/authoritative-tech-stack-agnostic.md) | [Reference Blueprint](../architecture/blueprints-es/reference-blueprint.md) | Restricciones arquitectonicas universales antes de decisiones especificas de stack |
| Frontend web en React | [React Web Frontend Standard](../governance/standards/engineering/web-frontend/react/react-web-frontend-standard.md) | [Seccion Frontend React](../governance/standards/engineering/web-frontend/react/README.md) | Arquitectura React, boilerplate, sistema UI, acceso a datos, testing, accesibilidad y reglas de promocion |
| Backend o workers C# / .NET | [Perfil Tech Stack .NET & C#](../architecture/blueprints-es/authoritative-tech-stack-dotnet.md) | [Baseline Arquitectonico Agnostico](../architecture/blueprints-es/authoritative-tech-stack-agnostic.md) | ASP.NET Core, EF Core, validacion, testing, observabilidad y mapeo hexagonal |
| Backend Node.js / TypeScript | [Perfil Tech Stack Node.js / TypeScript](../architecture/blueprints-es/authoritative-tech-stack-nodejs.md) | [Baseline Arquitectonico Agnostico](../architecture/blueprints-es/authoritative-tech-stack-agnostic.md) | Decisiones backend especificas de runtime |
| Comparacion o seleccion de stack | [Indice de Perfiles Runtime](../architecture/blueprints-es/authoritative-tech-stack.md) | [Resumen Tech Stack](../architecture/blueprints-es/tech-stack-summary.md) | Elegir o validar un perfil runtime aprobado |

---

## Rutas Rapidas

### Estandar Web React

1. Abre [React Web Frontend Standard](../governance/standards/engineering/web-frontend/react/react-web-frontend-standard.md).
2. Confirma que los detalles especificos de producto permanezcan fuera de Evolith salvo promocion formal.
3. Aplica el estandar para estructura de carpetas, tokens UI, limites API, testing, seguridad y accesibilidad.

### Estandar C# / .NET

1. Abre [Perfil Tech Stack .NET & C#](../architecture/blueprints-es/authoritative-tech-stack-dotnet.md).
2. Leelo despues del [Baseline Arquitectonico Agnostico](../architecture/blueprints-es/authoritative-tech-stack-agnostic.md).
3. Aplica runtime aprobado, ASP.NET Core, EF Core, validacion, testing, observabilidad y reglas de segregacion hexagonal de proyectos.

### Trabajo Web / Frontend General

1. Empieza con [React Web Frontend Standard](../governance/standards/engineering/web-frontend/react/react-web-frontend-standard.md) cuando React sea el objetivo.
2. Usa [Arquitectura de Notificaciones y Feedback](../architecture/blueprints-es/notification-feedback-architecture.md) cuando el trabajo toque feedback de usuario, toasts, drawers, errores o feedback de mutaciones.
3. Eleva decisiones reutilizables de UI o boilerplate mediante ADR, estandar de gobernanza o patron canonico antes de tratarlas como regla enterprise.

---

## Que Pertenece Donde

| Tema | Fuente de verdad |
| :--- | :--- |
| Reglas arquitectonicas universales | `reference/architecture/blueprints/authoritative-tech-stack-agnostic.md` |
| Elecciones backend especificas de runtime | `reference/architecture/blueprints/authoritative-tech-stack-*.md` |
| Reglas frontend React | `reference/governance/standards/engineering/web-frontend/react/` |
| Implementacion especifica de producto | Repositorio hijo o referencia aplicada UMS |
| Practica reutilizable promovida | ADR, estandar de gobernanza o patron canonico Evolith |

---

## Regla de Calidad

No copies una practica especifica de producto a Evolith solo porque existe en UMS u otro repositorio satelite. Promuevela solo cuando sea reutilizable, documentada, validada y aprobada por el camino de promocion.

---

[Volver a la raiz del repositorio](../../README.es.md)
