# Blueprints de Arquitectura

> **Navegación bilingüe:** [English version](./blueprints/README.md)

Los blueprints definen las **leyes estructurales** de la arquitectura de referencia. Son agnósticos al runtime por defecto — las decisiones tecnológicas concretas viven en los perfiles de runtime.

Lee primero la línea base agnóstica. Luego lee el perfil de runtime de tu stack objetivo. Usa el blueprint de referencia para entender el modelo C4 completo y la lógica de decisiones.

---

## Orden de Lectura

| Paso | Documento | Propósito |
| :--- | :--- | :--- |
| 1 | [Línea Base Arquitectónica Agnóstica](./blueprints/authoritative-tech-stack-agnostic.es.md) | Reglas universales aplicables a todo runtime. Empieza aquí. |
| 2 | [Blueprint de Referencia (arc42)](./blueprints/reference-blueprint.es.md) | Modelo C4 completo, evolución Fase 1→3, matriz ADR, atributos de calidad. |
| 3 | [Checklist de Simplicidad — Fase 1](./blueprints/simplicity-checklist-phase-01.es.md) | Checklist de control antes de agregar cualquier complejidad. |
| 4 | Tu perfil de runtime (abajo) | Decisiones tecnológicas concretas para tu stack. |

---

## Perfiles de Runtime

| Runtime | Perfil |
| :--- | :--- |
| Node.js / TypeScript | [authoritative-tech-stack-nodejs.es.md](./blueprints/authoritative-tech-stack-nodejs.es.md) |
| .NET / C# | [authoritative-tech-stack-dotnet.es.md](./blueprints/authoritative-tech-stack-dotnet.es.md) |
| Android / Kotlin | [authoritative-tech-stack-android.es.md](./blueprints/authoritative-tech-stack-android.es.md) |
| Todos los runtimes (índice) | [authoritative-tech-stack.es.md](./blueprints/authoritative-tech-stack.es.md) |

---

## Análisis Complementario

| Documento | Propósito |
| :--- | :--- |
| [Especificación de Topología C4](./blueprints/c4-topology-spec.es.md) | Definiciones formales del modelo C4 para todos los niveles de diagrama |
| [Flujo de Arquitectura de Observabilidad](./blueprints/observability-architecture-flow.es.md) | Flujo end-to-end de correlación, logging AOP, trazas, métricas y sinks de telemetría |
| [Análisis Estratégico CAP](./blueprints/cap-strategic-analysis.es.md) | Análisis del trade-off del teorema CAP por fase |
| [Escenarios de Despliegue Multi-Cloud](./blueprints/multi-cloud-deployment-scenarios.es.md) | Opciones de topología de despliegue agnósticas a la nube |
| [Resumen del Tech Stack](./blueprints/tech-stack-summary.es.md) | Tarjeta de referencia rápida Node.js/demo (no es política universal) |

---

[Volver a la Raíz de Arquitectura](../../README.es.md)
