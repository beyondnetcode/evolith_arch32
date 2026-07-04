# Guía de Resiliencia de Microservicios

> **Navegación Bilingüe:** [English](./resilience.md) | [Español](./resilience.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Microservicios

## Ingeniería del Caos

Ejecute experimentos de caos regulares en entornos similares a producción. Inyecte fallas (latencia, pérdida de paquetes, eliminación de pods) para validar supuestos de resiliencia. Documente los resultados y retroalimente los hallazgos en el fortalecimiento de servicios. Utilice herramientas como Chaos Monkey, Litmus o Azure Chaos Studio.

## Aislamiento de Bloques

Implemente **MS-R03** (Bloque) a nivel de servicio y grupo de hilos. Aisle las rutas críticas para que una falla en una dependencia no consuma todos los recursos. Utilice grupos de conexión, grupos de hilos o límites de proceso separados por dependencia.

## Cascadas de Tiempo de Espera

Establezca tiempos de espera explícitos en cada llamada saliente. Evite esperas ilimitadas que propaguen latencia hacia arriba. Configure tiempos de espera en las capas de cliente, malla de servicios y balanceador de carga. El tiempo de espera en cada capa debe ser estrictamente menor que la capa superior.

## Estrategias de Fallback

Aplique **MS-R04** (Fallback) para cada dependencia no crítica. Defina comportamientos degradados: respuestas en caché, valores predeterminados o degradación elegante. Los fallbacks deben ser idempotentes y seguros para reintentar. Documente la ruta de fallback para cada dependencia de servicio.

## Cortacircuitos

Despliegue cortacircuitos en cada llamada saliente. Estados: cerrado (normal), abierto (fallando, fallo rápido), medio abierto (probando). Configure umbrales de falla y ventanas de recuperación por dependencia. Exponga el estado del cortacircuito como métrica de salud para observabilidad.

## Sondas de Salud

Defina sondas de vida, preparación e inicio para cada servicio. La sonda de vida detecta estados irrecuperables. La sonda de preparación controla el enrutamiento del tráfico. La sonda de inicio protege los servicios de inicio lento contra eliminación prematura. Las sondas no deben depender de servicios externos.

## Presupuestos de Reintento

Implemente presupuestos de reintento por servicio para prevenir tormentas de reintentos. Limite la tasa total de reintentos y escale al cortacircuito cuando se agote el presupuesto. Use retroceso exponencial con jitter para reintentos individuales.

## Referencias

| Regla | Descripción |
|-------|-------------|
| **MS-R03** | Aislamiento de Bloques |
| **MS-R04** | Estrategias de Fallback |
| **ADR-0079** | Decisión de patrones de resiliencia |

---
[Volver al Perfil de Microservicios](./README.es.md)
