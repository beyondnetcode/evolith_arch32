# Playbook de Reproceso de Mensajes Veneno (colas `_error` de MassTransit)

> **Navegación bilingüe:** [View English version](./incident-response-poison-message-reprocess.md)

Playbook operativo para mensajes fallidos de la proyección del retrato de tenant. Se dispara desde la
alerta `MassTransitPoisonMessages` (estrategia de despliegue §5.3 · ADR-0108 · GT-463).

## Qué lo disparó

MassTransit reintenta un consumo fallido (exponencial, 5 intentos). Agotados los reintentos,
**mueve** el mensaje a `<cola-endpoint>_error` — nunca hace `nack`, así que el dead-letter exchange
del broker jamás se dispara. **Cualquier** mensaje en una cola `_error` es un mensaje veneno que un
consumidor no pudo procesar. El retrato de tenant tiene exactamente un consumidor, así que solo una
cola puede guardar veneno suyo:

- `tracker.tenant-snapshot_error`

UMS publica el retrato y no consume nada de él (ADR-0129 · ADR-UMS-107), así que no hay cola `ums.*`
de proyección que shovelear. Las `ums.tenant-projection_error` y `tracker.tenant-projection_error`
que este playbook nombró hasta el 2026-08-22 eran del consumidor de la era MMS que T-059 retiró.

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
  rabbitmqctl set_parameter shovel reprocess-tenant-snapshot \
  '{"src-protocol":"amqp091","src-uri":"amqp:///","src-queue":"tracker.tenant-snapshot_error",
    "dest-protocol":"amqp091","dest-uri":"amqp:///","dest-queue":"tracker.tenant-snapshot",
    "src-delete-after":"queue-length","ack-mode":"on-confirm"}'
```

- `src-delete-after: queue-length` drena solo los mensajes presentes al iniciar el shovel (no hace
  bucle infinito con los que fallen después).
- Borra el shovel al terminar: `rabbitmqctl clear_parameter shovel reprocess-tenant-snapshot`.

## Verificar

1. La profundidad de la cola `_error` vuelve a 0 y la alerta `MassTransitPoisonMessages` se limpia.
2. La proyección se pone al día: `tracker.tenant-snapshot` drena y se queda casi vacía. No hay
   contador de aplicados/descartados que leer — las métricas `masterdata_projection_*` de la era MMS
   que aquí se nombraban hasta el 2026-08-22 nunca tuvieron emisor, y T-059 no introdujo
   sustitutas. La señal es la profundidad de la cola.
3. Verifica puntualmente el/los tenant(s) afectados: la fila de `tenants` del Tracker lleva el
   `ums_projection_version` que UMS publicó por última vez, y `code`/`name`/`status` coinciden con
   UMS, que es el maestro (ADR-0129).

## Prevenir recurrencia

- Veneno-por-contenido persistente → el productor emitió un evento fuera de contrato: reconcilia
  contra `Evolith.Messaging.Contracts` (DS-12) y añade un contract test del productor.
- Faults transitorios repetidos → revisa la base de datos del Tracker donde escribe el consumidor
  (T-059 retiró la cadena de conexión aparte `MasterDataDb`; la proyección aterriza en el esquema
  propio del Tracker) y la postura de readiness (readiness nunca debe condicionarse a AMQP — §5.4).

## Referencias
- Estrategia de despliegue §5.3 (manejo de veneno) · ADR-0108 (topología propiedad de MassTransit) · GT-463.
- Relacionados: [rollback de producción](./incident-response-production-rollback.es.md) · [service outage](./incident-response-service-outage.es.md).
