# [ADR 0074](0074-evolith-core-api-exposure-layer.es.md): Capa de Exposición Nativa del Evolith Core API

> **Navegación Bilingüe:** [English Version](./0074-evolith-core-api-exposure-layer.md)

## Estado

Aprobado — Evolith Architecture Board, 2026-06-13.

## Fecha

2026-06-13

## Contexto y Problema

Históricamente, Evolith Core se ha distribuido principalmente como una CLI (`@evolith/smart-cli`). Decisiones arquitectónicas recientes incorporaron un servidor Model Context Protocol (MCP) expuesto a través de la CLI (`evolith mcp start`) para servir la gobernanza como contexto en tiempo real a los Agentes de IA y a orquestadores externos como Evolith Tracker.

Sin embargo, a medida que el Evolith Tracker hace la transición para convertirse en un Orquestador SDLC SaaS independiente, depender únicamente de un servidor MCP generado por la CLI o incrustar las bibliotecas del Core limita la escalabilidad, restringe las opciones de protocolo y desubica la frontera de red. Evolith Tracker necesita una API robusta, escalable y segura para consultar los resultados de la evaluación arquitectónica, sin duplicar la lógica de dominio.

Si forzamos al Tracker a alojar la lógica de dominio, violamos la regla fundamental de que `evolith_arch32` es la única fuente de verdad para la arquitectura Core.

## Objetivo y Alcance

**Objetivo:** Definir una capa de exposición de red oficial y escalable para Evolith Core que encapsule la lógica de dominio y proporcione interfaces estándar REST/GraphQL/MCP a clientes externos (como Evolith Tracker y Agentes de IA).

**En alcance:**
- Creación de `apps/core-api` dentro del monorepo Evolith Core.
- Selección del stack tecnológico (NestJS).
- Definición de límites entre Evolith Core y Evolith Tracker.

**Fuera de alcance:**
- Detalles de implementación del Evolith Tracker (que pertenece a su propio repositorio).
- Refactorización de toda la base de código de la CLI fuera de los paquetes de dominio compartidos.

## Opciones Consideradas

1. **Tracker BFF (Backend-For-Frontend) dentro de Evolith Core:** Construir el backend del Tracker en este repositorio. Rechazado: Viola el límite del repositorio. Evolith Core es una referencia arquitectónica, no una base de código de producto para la UI del Tracker.
2. **Exponer el Dominio Core solo vía npm:** Forzar al Tracker a importar `@evolith/smart-cli` como una biblioteca y construir su propia API. Rechazado: El Tracker queda estrechamente acoplado al entorno de ejecución del Core; cualquier lógica de API no sería reutilizable para otros clientes (como dashboards ejecutivos).
3. **Evolith Core API usando NestJS (elegido):** Construir un API gateway dedicado (`apps/core-api`) dentro del monorepo `evolith_arch32` usando NestJS. Esta API envuelve el Dominio Core y expone interfaces de red estándar. El Tracker permanece como un consumidor externo.

## Decisión y Justificación

Adoptar la **opción 3**. Construiremos el **Evolith Core API** como una aplicación NestJS en el directorio `apps/core-api`.

**Elementos ratificados:**
1. **Soberanía de Red:** Evolith Core es el único propietario de su dominio, rulesets y lógica de evaluación. Expone esta capacidad de forma nativa a través de `apps/core-api`.
2. **Agnosticismo del Cliente:** El Evolith Tracker actúa estrictamente como cliente de la Core API. Tracker consumirá interfaces REST/GraphQL para mostrar phase gates, estados de validación y gestionar el SDLC.
3. **Estructura Monorepo:** El `package.json` raíz se actualizará para admitir workspaces npm apuntando a `apps/*` y `sdk/*`.
4. **Stack Tecnológico:** Se selecciona NestJS para el `core-api` con el fin de mantener un tipado fuerte, hacer cumplir la arquitectura hexagonal de forma nativa e integrar a la perfección la lógica de dominio TypeScript existente de la `smart-cli`.
5. **Integración MCP:** La lógica del servidor MCP existente se integrará o envolverá en la aplicación NestJS para proporcionar una unidad de despliegue unificada que sirva tanto a los consumidores tradicionales de REST/GraphQL como a los Agentes de IA a través de MCP.

**Justificación:** Esta decisión preserva la soberanía del dominio de Evolith Core al tiempo que proporciona una interfaz madura y escalable para el SaaS Evolith Tracker. NestJS se alinea perfectamente con nuestro ecosistema TypeScript existente y hace cumplir estrictamente la inyección de dependencias y los límites hexagonales que hemos estandarizado.

## Evidencia y Criterios de Evaluación

Criterios utilizados para juzgar las opciones: (a) Límites de dominio claros; (b) Escalabilidad de la lógica Core; (c) Reutilización de la API para clientes distintos al Tracker.

Evidencia: La implementación actual de la CLI ya ha demostrado la viabilidad de la lógica de dominio. Este ADR simplemente eleva esa lógica a un servicio de red persistente.

## Consecuencias, Riesgos y Compensaciones

**Positivo:**
- Plano de gobernanza centralizado: Todas las evaluaciones ocurren en una API oficial.
- El Tracker se desbloquea para construir su UI sin reinventar las evaluaciones de dominio.

**Negativo / riesgos:**
- Añade sobrecarga de mantenimiento para una nueva aplicación NestJS dentro del repositorio.
- Requiere refactorizar el pipeline de despliegue para soportar un monorepo con una CLI y una API simultáneamente.

**Compensación aceptada:** El costo operativo de mantener una aplicación NestJS se compensa con la pureza arquitectónica y la seguridad de tener un límite de API estricto para el dominio Core.

## Referencias

- [SDLC Tracker — Technical Interface Design](../../../governance/standards/vision/sdlc-tracker-technical-interfaces.md)
- [Maturity Assessment](../../../governance/standards/vision/maturity-assessment.md)

## Decisiones Relacionadas y Estándares

- [ADR 0073: Unified CLI/MCP Output Contract](./0073-unified-cli-output-contract.md)
- [ADR 0047: Architectural Patterns](./0047-architectural-patterns-monolith-soa-microservices.md)

---
[Volver al Registro de ADRs](../README.es.md)
