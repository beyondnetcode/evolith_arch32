# Architecture Blueprints


---

## Reading Order
| Paso | Documento | Propósito |
| :--- | :--- | :--- |
| 1 | [Línea base de arquitectura agnóstica] (./authoritative-tech-stack-agnostic.md) | Reglas universales que se aplican a cada tiempo de ejecución. Empiece aquí. |
| 2 | [Plano de referencia (arc42)](./reference-blueprint.md) | Modelo C4 completo, evolución Fase 1→3, matriz ADR, atributos de calidad. |
| 3 | [Lista de verificación de simplicidad - Fase 1](./simplicity-checklist-phase-01.md) | Lista de verificación de la puerta antes de agregar cualquier complejidad. |
| 4 | Su perfil de tiempo de ejecución (abajo) | Decisiones tecnológicas concretas para su pila. |

---
## Runtime Profiles
| Tiempo de ejecución | Perfil |
| :--- | :--- |
| Node.js / TypeScript | [autoritative-tech-stack-nodejs.md](./authoritative-tech-stack-nodejs.md) |
| .NET/C# | [autoritative-tech-stack-dotnet.md](./authoritative-tech-stack-dotnet.md) |
| Android/Kotlin | [autoritative-tech-stack-android.md](./authoritative-tech-stack-android.md) |
| Todos los tiempos de ejecución (índice) | [autoritative-tech-stack.md](./authoritative-tech-stack.md) |

---
## Supplemental Analysis
| Documento | Propósito |
| :--- | :--- |
| [Especificación de topología C4](./c4-topology-spec.md) | Definiciones formales del modelo C4 para todos los niveles de diagrama |
| [Flujo de arquitectura de observabilidad](./observability-architecture-flow.md) | Flujo de señales de un extremo a otro para correlación, registro de AOP, seguimientos, métricas y receptores de telemetría |
| [Arquitectura de notificaciones y comentarios](./notification-feedback-architecture.md) | Patrón de doble visibilidad para detectar errores comerciales: brindis efímeros + cajón persistente, punto de extracción único, fábrica de mutaciones |
| [Análisis estratégico de la PAC](./cap-strategic-analysis.md) | Análisis de compensación del teorema de la PAC por fase |
| [Escenarios de implementación de múltiples nubes](./multi-cloud-deployment-scenarios.md) | Opciones de topología de implementación independiente de la nube |
| [Resumen de la pila tecnológica] (./tech-stack-summary.md) | Node.js/tarjeta de referencia rápida de demostración (no la política universal) |

---

[Volver a la raíz de la arquitectura](../../README.md)
