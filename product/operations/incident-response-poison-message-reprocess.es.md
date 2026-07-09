# Playbook de Reproceso de Mensajes Veneno (colas `_error` de MassTransit)

> **Navegación bilingüe:** [View English version](./incident-response-poison-message-reprocess.md)

Playbook operativo para mensajes fallidos de la proyección de datos maestros. Se dispara desde la
alerta `MassTransitPoisonMessages` (estrategia de despliegue §5.3 · ADR-0108 · GT-463).

## Qué lo disparó

MassTransit reintenta un consumo fallido (exponencial, 5 intentos). Agotados los reintentos,
**mueve** el mensaje a `<cola-endpoint>_error` — nunca hace `nack`, así que el dead-letter exchange
del broker jamás se dispara. **Cualquier** mensaje en una cola `_error` es un mensaje veneno que un
consumidor no pudo procesar. Las colas afectadas para la proyección de tenant son:

- `ums.tenant-projection_error`
- `tracker.tenant-projection_error`

## Severidad

| Profundidad | Nivel | Respuesta |
|-------------|-------|-----------|
| ≥ 1 sostenido 2m | P3 | Ingeniero on-call — investigar en 4h |
| Creciendo / muchos tenants | P2 | Líder de ingeniería — el productor o un bug de consumidor emite eventos malos |

## Diagnosticar (NO reprocesar a ciegas)

1. Inspecciona un mensaje fallido (RabbitMQ management UI → la cola `_error` → *Get messages*, requeue=true):
   ```bash
   kubectl port-forward -n evolith-messaging svc/evolith-rabbitmq 15672:15672
   # abrir http://localhost:15672 → Queues → ums.tenant-projection_error
   ```
2. Lee los headers de fault de MassTransit (`MT-Fault-Message`, `MT-Fault-StackTrace`) en el mensaje.
3. Clasifica la causa raíz **antes** de reprocesar:
   - **Transitorio** (BD caída, deadlock, blip del broker) → el mensaje está bien; reprocesa.
   - **Veneno por contenido** (mismatch de schema/contrato, payload no parseable) → reprocesar solo
     volverá a fallar. Corrige primero el productor/consumidor, o descarta el mensaje a propósito.

## Reprocesar (shovel `_error` → cola principal)

Cuando la causa sea transitoria o esté corregida, mueve los mensajes de vuelta con un **shovel dinámico**:

```bash
kubectl exec -n evolith-messaging evolith-rabbitmq-server-0 -c rabbitmq -- \
  rabbitmqctl set_parameter shovel reprocess-ums-projection \
  '{"src-protocol":"amqp091","src-uri":"amqp:///","src-queue":"ums.tenant-projection_error",
    "dest-protocol":"amqp091","dest-uri":"amqp:///","dest-queue":"ums.tenant-projection",
    "src-delete-after":"queue-length","ack-mode":"on-confirm"}'
```

- `src-delete-after: queue-length` drena solo los mensajes presentes al iniciar el shovel (no hace
  bucle infinito con los que fallen después).
- Repite con `tracker.tenant-projection_error` → `tracker.tenant-projection` para Tracker.
- Borra el shovel al terminar: `rabbitmqctl clear_parameter shovel reprocess-ums-projection`.

## Verificar

1. La profundidad de la cola `_error` vuelve a 0 y la alerta `MassTransitPoisonMessages` se limpia.
2. La proyección se pone al día: `masterdata_projection_applied_total` sube; sin un alza equivalente
   en `masterdata_projection_discarded_total` más allá de los descartes esperados por la guarda de stale.
3. Verifica puntualmente el/los tenant(s) afectados en `masterdata.tenant_projection` (UMS + Tracker)
   contra MMS.

## Prevenir recurrencia

- Veneno-por-contenido persistente → el productor emitió un evento fuera de contrato: reconcilia
  contra `Evolith.Messaging.Contracts` (DS-12) y añade un contract test del productor.
- Faults transitorios repetidos → revisa la salud de la BD del consumidor (`MasterDataDb`) y la
  postura de readiness (readiness nunca debe condicionarse a AMQP — §5.4).

## Referencias
- Estrategia de despliegue §5.3 (manejo de veneno) · ADR-0108 (topología propiedad de MassTransit) · GT-463.
- Relacionados: [rollback de producción](./incident-response-production-rollback.es.md) · [service outage](./incident-response-service-outage.es.md).
