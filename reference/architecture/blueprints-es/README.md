# Blueprints de Arquitectura

> **Navegación bilingüe:** [English version](../blueprints/README.md)

Los blueprints definen las **leyes estructurales** de la arquitectura de referencia. Son agnósticos al runtime por defecto — las decisiones tecnológicas concretas viven en los perfiles de runtime.

Lee primero la línea base agnóstica. Luego lee el perfil de runtime de tu stack objetivo. Usa el blueprint de referencia para entender el modelo C4 completo y la lógica de decisiones.

---

## Orden de Lectura

| Paso | Documento | Propósito |
| :--- | :--- | :--- |
| 1 | [Línea Base Arquitectónica Agnóstica](./authoritative-tech-stack-agnostic.md) | Reglas universales aplicables a todo runtime. Empieza aquí. |
| 2 | [Blueprint de Referencia (arc42)](./reference-blueprint.md) | Modelo C4 completo, evolución Fase 1→3, matriz ADR, atributos de calidad. |
| 3 | [Checklist de Simplicidad — Fase 1](./simplicity-checklist-phase-01.md) | Checklist de control antes de agregar cualquier complejidad. |
| 4 | Tu perfil de runtime (abajo) | Decisiones tecnológicas concretas para tu stack. |

---

## Perfiles de Runtime

| Runtime | Perfil |
| :--- | :--- |
| Node.js / TypeScript | [authoritative-tech-stack-nodejs.md](./authoritative-tech-stack-nodejs.md) |
| .NET / C# | [authoritative-tech-stack-dotnet.md](./authoritative-tech-stack-dotnet.md) |
| Android / Kotlin | [authoritative-tech-stack-android.md](./authoritative-tech-stack-android.md) |
| Todos los runtimes (índice) | [authoritative-tech-stack.md](./authoritative-tech-stack.md) |

---

## Análisis Complementario

| Documento | Propósito |
| :--- | :--- |
| [Especificación de Topología C4](./c4-topology-spec.md) | Definiciones formales del modelo C4 para todos los niveles de diagrama |
| [Análisis Estratégico CAP](./cap-strategic-analysis.md) | Análisis del trade-off del teorema CAP por fase |
| [Escenarios de Despliegue Multi-Cloud](./multi-cloud-deployment-scenarios.md) | Opciones de topología de despliegue agnósticas a la nube |
| [Resumen del Tech Stack](./tech-stack-summary.md) | Tarjeta de referencia rápida Node.js/demo (no es política universal) |

---

[Volver a la Raíz de Arquitectura](../../README.md)
