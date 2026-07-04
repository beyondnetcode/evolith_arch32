# Guía de Operaciones de Microservicios

> **Navegación Bilingüe:** [English](./operations.md) | [Español](./operations.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Microservicios

## Orquestación de Contenedores

Kubernetes es la capa de orquestación estándar para microservicios. Cada servicio se ejecuta como un Deployment con su propia plantilla de Pod, solicitudes de recursos y sondas de preparación/y vida. Utilice Namespaces para imponer la separación lógica entre equipos y entornos.

## Rastreo Distribuido

Instrumente cada servicio con OpenTelemetry. Propague el contexto de trazas a través de límites HTTP, gRPC y mensajes. Exporte las trazas a un colector (Jaeger, Tempo o Azure Monitor) para correlación entre saltos de servicios.

## Agregación de Registros

Adopte registro estructurado en JSON con IDs de correlación. Envíe los registros a un sistema centralizado (ELK, Loki o Azure Log Analytics). Asegúrese de que cada entrada de registro incluya el nombre del servicio, el ID de traza y el ID de solicitud para la resolución de problemas entre servicios.

## Malla de Servicios

Despliegue una malla de servicios (Istio, Linkerd o Consul Connect) para manejar mTLS, gestión de tráfico y observabilidad sin cambios en la aplicación. Aplique **MS-R02** (Malla de Servicios/mTLS) en la capa de la malla. Utilice reintentos y tiempos de espera nativos de la malla en lugar de lógica de reintento personalizada.

## Estrategias de Despliegue

- **Canary**: Enrute un porcentaje del tráfico a la nueva versión antes del despliegue completo.
- **Blue-Green**: Despliegue junto a la versión actual y cambie el tráfico atómicamente.
- **Rolling**: Actualice los pods incrementalmente con configuración de oleaje y no disponible.

Todas las estrategias deben respetar **MS-R01** (Despliegue Independiente) — cada servicio se envía de forma independiente.

## Monitoreo de SLA

Defina SLOs por servicio (**MS-R07**). Rastree presupuestos de errores y tasas de consumo. Alerta sobre el agotamiento del presupuesto antes del impacto al usuario. Publique un panel de SLO en vivo por servicio y mantenga un informe centralizado de cumplimiento de SLA.

## Referencias

| Regla | Descripción |
|-------|-------------|
| **MS-R01** | Despliegue Independiente |
| **MS-R02** | Malla de Servicios / mTLS |
| **MS-R07** | SLOs |
| **ADR-0045** | Decisión de adopción de malla de servicios |
| **ADR-0047** | Selección de pila de observabilidad |

---
[Volver al Perfil de Microservicios](./README.es.md)
