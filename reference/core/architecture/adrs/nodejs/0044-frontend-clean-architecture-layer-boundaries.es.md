# [ADR 0044](0044-frontend-clean-architecture-layer-boundaries.md): Límites de Capas — Arquitectura Limpia en Frontend (React)

## Estado

Aceptado

## Fecha

2026-06-07

## Alcance

Pila tecnológica — Arquitectura Frontend (React / TypeScript)

> **Origen en satélite:** Validado originalmente en el satélite UMS (UMS ADR-0056). Promovido a línea base corporativa de Evolith.

---

## Contexto

Las aplicaciones frontend construidas sobre esta plataforma suelen mezclar responsabilidades: lógica de negocio en componentes, llamadas HTTP en código de interfaz y gestión de estado distribuida entre archivos. Sin límites de capa explícitos se producen los siguientes problemas:

- Lógica de negocio no testeable (dependencias de UI en cada prueba).
- Sin reutilización de hooks o servicios entre pantallas.
- Bases de código frágiles ante cambios de infraestructura (REST → gRPC, Axios → Fetch).
- Responsabilidades indistinguibles durante la revisión de código.

Los frontends satélite de Evolith deben aplicar la misma disciplina arquitectónica ya exigida en el backend (véase [ADR-0002](./0002-clean-architecture-nestjs.es.md)).

---

## Decisión

Aplicar **Arquitectura Limpia (Hexagonal)** a los frontends React con límites estrictos de capa y una regla de dependencia hacia el interior.

### Estructura Canónica de Capas

```text
src/
├── domain/                     # Reglas de negocio empresarial (PURO)
│   ├── entities/               # Entidades de dominio
│   ├── value-objects/          # Objetos de valor
│   ├── schemas/                # Esquemas de validación Zod
│   └── constants/              # Constantes de dominio
│
├── application/                # Casos de uso y lógica de aplicación
│   ├── hooks/                  # React hooks (casos de uso)
│   ├── stores/                 # Stores de estado cliente (Zustand o equivalente)
│   ├── errors/                 # Utilidades de manejo de errores
│   └── utils/                  # Utilidades de aplicación (logger, i18n)
│
├── infrastructure/             # Preocupaciones externas
│   ├── http/                   # Clientes HTTP, clientes GraphQL
│   └── services/               # Adaptadores de servicios externos
│
└── presentation/               # Capa de interfaz de usuario
    ├── shared/                 # Componentes compartidos, layouts, tema
    └── <contexto-acotado>/     # Pantallas y hooks específicos del contexto
```

### Regla de Dependencia

Las dependencias fluyen **solo hacia el interior**. La infraestructura se inyecta mediante inversión de dependencias.

```text
presentación ──▶ aplicación ──▶ dominio
                      ▲
                      │
              infraestructura (inyectada)
```

### Reglas Arquitectónicas

1. **La capa de dominio es PURA.** Sin React, sin librería de estado, sin cliente HTTP, sin paquetes externos. Solo se permiten librerías de validación de esquemas (p. ej., Zod).
2. **La capa de aplicación desconoce la interfaz de usuario.** Los hooks definen casos de uso; los stores gestionan el estado del cliente. Sin manipulación del DOM, sin importaciones de componentes.
3. **La infraestructura implementa puertos.** Los clientes HTTP, los clientes GraphQL y los adaptadores de servicios externos residen exclusivamente en `infrastructure/`.
4. **La presentación compone.** Los componentes componen hooks y stores. La lógica de negocio no debe residir en los componentes.
5. **Sin importaciones entre capas.** El dominio nunca importa desde la aplicación. La aplicación nunca importa desde la presentación.
6. **Los efectos secundarios del DOM pertenecen a la presentación.** Operaciones como `document.body.classList` corresponden a la capa de presentación, no a stores ni hooks.

### Exportaciones Barrel

Cada capa expone una API pública a través de archivos barrel `index.ts`. Las importaciones entre capas deben referenciar solo el barrel, nunca rutas internas.

---

## Consecuencias

### Positivas

- La lógica de negocio es testeable sin ninguna dependencia de UI o DOM.
- Los hooks y stores son reutilizables en múltiples pantallas.
- Los límites de capa crean puntos de control claros durante la revisión de código.
- Los intercambios de infraestructura (REST → gRPC, un cliente HTTP → otro) requieren cambios solo en `infrastructure/`.

### Negativas / Concesiones

- Más directorios que una estructura plana.
- Requiere disciplina y aplicación automatizada (ESLint `no-restricted-imports`) para mantenerse en el tiempo.
- La configuración inicial tiene un coste mayor que la organización de carpetas ad hoc.

---

## Aplicación

- La regla `no-restricted-imports` de **ESLint** puede detectar violaciones de límites en CI.
- Los barrel exports (`index.ts`) definen el contrato de API pública de cada capa.
- `AGENTS.md` en el repositorio satélite documenta las convenciones para los agentes de codificación con IA.

---

## Referencias

- [ADR-0002: Arquitectura Limpia con NestJS](./0002-clean-architecture-nestjs.es.md)
- [ADR-0045: Gestión de Estado Zustand + TanStack Query](./0045-zustand-tanstack-query-state-management.es.md)






## Opciones Consideradas

- **Seleccionada:** Límites de Capas — Arquitectura Limpia en Frontend (React)
- **Otras:** Desconocido (el registro histórico no enumera explícitamente alternativas rechazadas).

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad).

## Decisiones y Estándares Relacionados

- [ADR-0002: Arquitectura Limpia con NestJS](./0002-clean-architecture-nestjs.es.md)
- [ADR-0045: Gestión de Estado Zustand + TanStack Query](./0045-zustand-tanstack-query-state-management.es.md)

## Vigilancia Tecnológica (Tendencias, Madurez, Adopción, Soporte)

Los patrones de arquitectura limpia en frontend (React) están en etapa de crecimiento. React (mantenido por Meta) es un framework maduro con fuerte retrocompatibilidad. El patrón de capas está bien documentado pero requiere disciplina de equipo. Vigencia esperada: principios de arquitectura limpia 5+ años; versiones específicas de React evolucionan más rápido (2-3 años).

## Fuentes Actuales

- Documentación de React — https://react.dev, consultado 2026-06-20.
- Clean Architecture de Robert C. Martin (2017), consultado 2026-06-20.
- Clean Architecture en React de Alex Bespoyasov — https://bespoyasov.me/blog/clean-architecture-on-frontend, consultado 2026-06-20.

---
[Volver al Índice](./README.es.md)
