# [ADR 0074](0074-monorepo-orchestration-nx.es.md): Orquestación de Monorepo con Nx

## Estado
Accepted

## Fecha
2026-06-12

## Contexto y Problema
El ecosistema Node.js requiere una herramienta robusta para hacer cumplir el [Core ADR-0001: Principio de Orquestación de Monorepo](../core/0001-monorepo-orchestration-principle.es.md). La herramienta debe manejar la compilación de TypeScript, los límites de linting y el almacenamiento en caché inteligente para las cargas de trabajo de Node.js (APIs, Web y librerías compartidas) sin problemas.

## Objetivo y Alcance
Seleccionar la herramienta específica de orquestación de monorepo para la plataforma Node.js que cumpla con los requisitos del Principio de Orquestación de Monorepo central.

## Opciones Consideradas
- **Seleccionada:** Nx
- **Otras:** 
  - **Lerna:** Rechazada debido a la falta de caché de computación avanzada y ejecución más lenta para gráficos grandes.
  - **Turborepo:** Considerada, pero Nx ofrece un soporte de ecosistema de plugins más fuerte para Angular/NestJS/React y mejor aplicación de límites de serie.

## Decisión y Justificación
Adoptar **Nx** como la herramienta de orquestación de monorepo para Node.js, combinada con **espacios de trabajo npm (npm workspaces)** para la resolución nativa de paquetes.
- `nx.json` define los gráficos de dependencia de construcción, prueba y linting para almacenamiento en caché inteligente y ejecución paralela.
- `eslint-plugin-boundaries` y `dependency-cruiser` imponen reglas estrictas de importación entre capas y espacios de trabajo.

## Evidencias y Criterios de Evaluación
La Caché de Computación de Nx mantiene el CI por debajo de 1 minuto para proyectos de Node.js sin cambios. Nx soporta nativamente la visualización de dependencias y proporciona potentes generadores de código para nuestro stack tecnológico estándar de Node.js.

## Consecuencias, Riesgos y Trade-offs

### Positivas
- Pipeline de CI/CD unificada adaptada para proyectos Node.js.
- Extensible a través de plugins de Nx para generadores estructurales personalizados.

### Negativas
- Los desarrolladores deben aprender las convenciones de la CLI de Nx.
- Requiere ajuste de configuración a medida que el espacio de trabajo crece.

## Vigilancia Tecnológica (Technology Watch)
- **Dirección del Mercado:** Nx es la herramienta de monorepo líder en el ecosistema JavaScript/TypeScript, mantenida activamente.
- **Etapa de Madurez:** Madura.
- **Gatillo de Revisión (Review Trigger):** Reevaluar si Nx introduce cambios arquitectónicos que rompan la compatibilidad o si la comunidad JS converge en un estándar más nuevo como Turborepo.

## Fuentes Actuales
- [Documentación de Nx](https://nx.dev) (Consultada 2026-06-12)

## Referencias
- [Documentación de Nx](https://nx.dev)

## Decisiones y Estándares Relacionados
- [Core ADR-0001: Principio de Orquestación de Monorepo](../core/0001-monorepo-orchestration-principle.es.md)
- [Node.js ADR-0003: Estándares Estrictos de TypeScript](./0003-strict-typescript-standards.es.md)

---
[Volver al Índice](./README.es.md)
