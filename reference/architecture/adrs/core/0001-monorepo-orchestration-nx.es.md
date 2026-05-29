# [ADR 0001](0001-monorepo-orchestration-nx.md): Orquestación de Monorepo con Nx

## Estado
Aprobado

## Fecha
2026-05-08

## Contexto
Gestionar múltiples aplicaciones relacionadas (API, Web, librerías compartidas) como repositorios aislados causa fricción: configuraciones de CI/CD duplicadas, deriva de versiones entre el código compartido y configuraciones locales complejas. Se requiere una estrategia de monorepo para mantener todos los artefactos en una única base de código coherente.

## Decisión
Adoptar **Nx** como la herramienta de orquestación de monorepo, combinada con **espacios de trabajo npm (npm workspaces)** para la resolución nativa de paquetes.

- Todas las aplicaciones residen bajo `apps/`.
- Todas las librerías compartidas residen bajo `libs/`.
- La pipeline de tareas de Nx (`nx.json`) define los gráficos de dependencia de construcción, prueba y linting para una caché inteligente y ejecución en paralelo.
- `eslint-plugin-boundaries` impone reglas estrictas de importación entre capas y espacios de trabajo.

## Consecuencias

### Positivas
- Pipeline de CI/CD unificada: un solo archivo de bloqueo (lockfile), una configuración de lint y un único ejecutor de pruebas.
- La Caché de Computación de Nx mantiene el CI por debajo de 1 minuto para los proyectos sin cambios.
- `dependency-cruiser` impone reglas de capas hexagonales globalmente a través de todos los paquetes.

### Negativas
- Los desarrolladores deben aprender las convenciones de la CLI de Nx.
- Los repositorios grandes pueden ser más lentos de clonar sin una configuración de sparse checkout.

## Referencias
- [Documentación de Nx](https://nx.dev)
- [ADR-0003: Estándares Estrictos de TypeScript](../../adrs/nodejs/0003-strict-typescript-standards.md)

---
[Volver al Índice](./README.es.md)
