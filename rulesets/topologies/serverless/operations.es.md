# Guía de Operaciones Sin Servidor

> **Navegación Bilingüe:** [English](./operations.md) | [Español](./operations.es.md)

**Propietario:** Ingeniería de Plataforma
**Topología:** Sin Servidor

---

## Optimización de Inicio en Frío

Las funciones deben cumplir con un presupuesto de **1000 ms para inicio en frío** (SV-R04). Utilizar concurrencia provisionada para rutas sensibles a la latencia. Mantener los paquetes de despliegue por debajo de **50 MB** (SV-R03) para reducir el tiempo de inicialización. Evitar dependencias pesadas de runtime; preferir runtimes ligeros (Node.js, Python) sobre stacks pesados.

## Límites de Concurrencia

Monitorear cuotas de concurrencia regionales. Implementar interruptores de circuito al acercarse a los límites. Utilizar concurrencia reservada para aislar funciones críticas de vecinos ruidosos. Rastrear ejecuciones concurrentes contra los presupuestos para evitar cascadas de limitaciones.

## Manejo de Cola de Cartas Muertas (DLQ)

Toda invocación asíncrona debe declarar una DLQ (SV-R01). Los mensajes fallidos se enrutan a la DLQ tras agotar los reintentos. Procesar entradas de DLQ con una función dedicada de remediación. Alertar cuando la profundidad de la DLQ exceda cero por más de 5 minutos.

## Monitoreo de Funciones

Instrumentar invocaciones con logs estructurados, trazas y métricas. Rastrear latencia p50, p95 y p99 por función. Monitorear tasas de error, conteos de limitaciones y frecuencia de inicio en frío. Agregar costos por función para responsabilidad presupuestaria (objetivo: **1 centavo por ejecución**).

## Rastreo de Costos

Etiquetar cada función con metadatos de centro de costo. Generar reportes diarios de costos por función y por topology. Alertar cuando el costo por ejecución exceda el presupuesto. Revisar funciones inactivas mensualmente y descomisionar recursos no utilizados.

## Mitigación de Bloqueo con el Proveedor

Abstract las APIs específicas del proveedor detrás de interfaces internas (ADR-0095). Utilizar runtimes de funciones y formatos de eventos portables entre proveedores. Mantener una capa de contrato neutral al proveedor para esquemas de eventos. Documentar optimizaciones específicas del proveedor como compromisos deliberados, no acoplamientos accidentales.

---

[Volver al Perfil Sin Servidor](./README.es.md)
