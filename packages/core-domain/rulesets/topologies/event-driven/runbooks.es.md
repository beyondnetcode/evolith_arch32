# Guía de Manuales Operativos Orientada a Eventos

> **Navegación Bilingüe:** [English](./runbooks.md) | [Español](./runbooks.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Orientada a Eventos

## Propósito

Proveer manuales operativos para escenarios de falla comunes en arquitecturas orientadas a eventos: failover del broker, rebalanceo de consumidores, migración de esquemas, reproducción de DLQ y recuperación de violaciones de ordenamiento.

## Manual 1: Failover del Broker

**Disparador:** Nodo del broker no responde o falla verificación de salud del clúster.

1. Verificar estado del nodo del broker vía consola de gestión del clúster.
2. Confirmar que la reasignación de líder de particiones se completó automáticamente.
3. Verificar retraso del grupo de consumidores para temas afectados; alertar si el retraso excede el umbral.
4. Validar que los reintentos del productor están teniendo éxito en brokers sobrevivientes.
5. Post-recuperación: revisar configuración del broker para factor de réplicas y min-insync replicas.

## Manual 2: Rebalanceo de Consumidores

**Disparador:** Grupo de consumidores experimenta rebalanceos repetidos o tormenta de rebalanceo.

1. Identificar el desencadenante del rebalanceo: nuevo ingreso de consumidor, crash de consumidor o timeout de heartbeat.
2. Verificar salud de la instancia del consumidor: memoria, CPU, pausas de GC.
3. Revisar configuración de session.timeout.ms y heartbeat.interval.ms.
4. Si hay tormenta de rebalanceo: reducir temporalmente instancias de consumidor para estabilizar.
5. Post-recuperación: ajustar configuraciones de timeout; considerar estrategia de asignación cooperativa y pegajosa.

## Manual 3: Migración de Esquemas

**Disparador:** El esquema del evento requiere un cambio rupturante.

1. Registrar nueva versión del esquema en el registro de esquemas con modo de compatibilidad configurado.
2. Desplegar consumidores actualizados que toleren versiones de esquema antigua y nueva.
3. Habilitar escritura dual en productores: emitir eventos en ambos formatos antiguo y nuevo.
4. Monitorear tasas de error de consumidores durante la ventana de migración.
5. Después de que todos los consumidores se actualicen: eliminar escritura dual; deprecar esquema antiguo.

## Manual 4: Reproducción de DLQ — ED-R03

**Disparador:** Profundidad de DLQ excede umbral o el negocio requiere reprocesamiento.

1. Identificar tema DLQ y grupo de consumidores afectado.
2. Revisar mensajes de DLQ: confirmar que la causa raíz está resuelta (por ejemplo, corrección de esquema desplegada).
3. Usar herramienta de reproducción de DLQ para republicar mensajes al tema original.
4. Monitorear procesamiento del consumidor; confirmar que los mensajes se consumen exitosamente.
5. Post-reproducción: verificar que la profundidad de DLQ regresa a cero; documentar causa raíz.

## Manual 5: Violación de Ordenamiento — ED-R04

**Disparador:** Consumidor detecta eventos procesados fuera del orden esperado.

1. Identificar partición afectada y secuencia de eventos.
2. Verificar distribución de clave de partición del productor; confirmar que la clave es estable.
3. Verificar que el consumidor no esté procesando desde múltiples particiones concurrentemente sin lógica de ordenamiento.
4. Si el ordenamiento es crítico: forzar consumo de un solo hilo por partición.
5. Post-recuperación: revisar estrategia de clave de partición; considerar rediseño de clave si se detecta partición caliente.

## Aplicabilidad Componible

| Componible | Orientación |
|---|---|
| Monolito Modular | Manuales simplificados; failover intra-proceso es automático. |
| Módulos Distribuidos | Coordinación entre módulos durante failover y rebalanceo. |
| Microservicios | Alcance completo de manuales; DLQ y gestión de ordenamiento por servicio. |
| Serverless | Failover gestionado por proveedor; manuales se enfocan en recuperación a nivel de aplicación. |
| Computación Edge | Failover local; manuales incluyen pasos de recuperación de sincronización a la nube. |

## Referencias ADR

- **ADR-0015**: Procedimientos de failover del broker y rebalanceo de consumidores.
- **ADR-0079**: Estándares de migración de esquemas y reproducción de DLQ.

---

[Volver al Perfil Orientado a Eventos](./README.es.md)
