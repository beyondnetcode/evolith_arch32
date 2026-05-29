# [ADR 0045](0045-microservice-extraction-readiness-criteria.md): Criterios de Aceptación para la Extracción de Microservicios

## Estatus
Aprobado

## Fecha
2026-05-12

## Contexto
El [ADR 0006](../core/0006-future-microservices-transition-dapr.md) define los hitos de evolución de la arquitectura de Monolito Modular hacia Microservicios y el [ADR-0047](../core/0047-architectural-patterns-monolith-soa-microservices.md) provee el marco de selección macro. Sin embargo, se requerían criterios cuantitativos específicos y objetivos para activar físicamente la transición de extracción de un servicio. Sin estas reglas explícitas, las decisiones de división corren el riesgo de estar impulsadas por intuición o presiones, lo que deriva en fallos de migración y sobrecarga operativa prematura.

## Decisión
Formalizar la regla **"2 de 4"** como disparador cuantitativo obligatorio para la extracción de un Bounded Context hacia un servicio independiente.

Un módulo de dominio DEBE considerarse un candidato válido para la fase de extracción (Milestone 2) si, y solo si, cumple con al menos 2 de los siguientes 4 criterios durante un período de evaluación mínimo de 15 días:

| Criterio | Umbral Objetivo | Razón Arquitectónica |
| :--- | :--- | :--- |
| **1. Latencia Crítica** | Latencia P95 > 200ms sostenida. | Indica contención de CPU/Memoria específica del módulo que afecta al resto del monolito. |
| **2. Frecuencia de Release** | > 4 despliegues independientes por semana. | Alta velocidad de cambio que requiere ciclos de CI/CD aislados para no bloquear a otros equipos. |
| **3. Autonomía de Equipo** | > 80% de los commits pertenecen a un solo Squad. | Aislamiento organizacional claro (Ley de Conway); minimiza la sobrecarga de comunicación. |
| **4. Densidad de Datos** | Carga de base de datos > 20% del total del motor. | Cuello de botella de I/O que justifica la migración a una base de datos dedicada por servicio. |

### Procedimiento Operativo de Extracción:
1. **Validación:** El Lead Developer del Squad presenta la métrica al Architectural Board.
2. **Aislamiento Temporal:** Configuración de routing en Gateway (Kong) para habilitar el patrón Strangler Fig.
3. **Desacoplamiento de DB:** Migración de schema hacia una instancia independiente según fase 2 del Database Migration Path ([ADR-0031](../core/0031-schema-per-context-domain-event-catalog.md)).

## Consecuencias

### Positivas
- Elimina la subjetividad en la división de sistemas distribuidos.
- Previene el antipatrón de "Microservicios Prematuros" que consume ancho de banda de DevOps innecesariamente.
- Alineación explícita con la arquitectura basada en métricas y observables.

### Negativas
- Requiere que la observabilidad ([ADR-0007](../nodejs/0007-observability-telemetry-loki-opentelemetry.md)) esté plenamente operativa para capturar los indicadores P95 por módulo.

## Referencias
- [ADR 0006: Future Microservices Transition](../core/0006-future-microservices-transition-dapr.md)
- [ADR 0047: Marco de Selección: Monolito vs SOA vs Microservicios](../core/0047-architectural-patterns-monolith-soa-microservices.md)
- Sam Newman - *Building Microservices* (2nd Ed. 2021)

---
[Volver al Índice](./README.es.md)
