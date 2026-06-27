# Guía de Resiliencia Sin Servidor

> **Navegación Bilingüe:** [English](./resilience.md) | [Español](./resilience.es.md)

**Propietario:** Ingeniería de Plataforma
**Topología:** Sin Servidor

---

## Idempotencia

Cada función debe ser idempotente. Usar claves de idempotencia derivadas del payload del evento o un token proporcionado por el cliente. Almacenar registros de idempotencia en un almacén rápido y duradero con un TTL que coincida con el dominio de negocio. Rechazar invocaciones duplicadas con el resultado original.

## Reintento con Backoff Exponencial

Configurar reintentos con backoff exponencial y jitter para fallos transitorios. Establecer el número máximo de reintentos basado en el timeout de la función y el presupuesto de latencia (1500 ms total). Distinguir errores reintatables (5xx, limitaciones) de fallos permanentes (4xx, validación). Evitar bucles de reintento ilimitados.

## Puntos de Control

Para flujos de trabajo de ejecución larga o fan-out, persistir estado interno en almacenamiento externo. Usar colas o bases de datos duraderas como puntos de control. Reanudar desde el último punto de control tras un fallo en lugar de reiniciar todo el flujo de trabajo. Mantener las escrituras de puntos de control atómicas.

## Recuperación de DLQ

Enrutar fallos irrecuperables a la DLQ. Implementar una función de recuperación dedicada que inspeccione, transforme y reprocese entradas de la DLQ. Alertar inmediatamente cuando la profundidad de la DLQ exceda el umbral. Mantener rastros de auditoría para cada intento de procesamiento de DLQ.

## Mitigación de Inicio en Frío

Reservar concurrencia provisionada para rutas críticas para mantenerse dentro del presupuesto de 1000 ms de inicio en frío (SV-R04). Calentar funciones en un calendario para prevenir evicciones por timeout de inactividad. Usar runtimes ligeros y minimizar el tamaño del paquete (SV-R03). Perfilar inicios en frío continuamente y regresar en caso de degradación.

## Diseño Stateless (SV-R02)

Las funciones no deben mantener estado local entre invocaciones. Externalizar todo el estado a almacenes gestionados (base de datos, caché, cola). Tratar cada invocación como independente. Validar esta invariant en pruebas de integración.

---

[Volver al Perfil Sin Servidor](./README.es.md)
