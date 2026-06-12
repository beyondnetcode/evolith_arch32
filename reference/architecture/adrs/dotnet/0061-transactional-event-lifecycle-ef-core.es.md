# [ADR 0061](0061-transactional-event-lifecycle-ef-core.md): Ciclo de Vida Transaccional de Eventos en EF Core

## 1. Estado
**Estado**: Propuesto
**Fecha**: 2026-05-23
**Alcance**: Stack Tecnológico - Confiabilidad Transaccional en .NET

---

## 2. Contexto
En arquitecturas distribuidas orientadas a eventos, es fundamental garantizar que los eventos de dominio se persistan y despachen sin pérdida silenciosa de datos. El patrón Transactional Outbox requiere mapear los eventos a mensajes del outbox e insertarlos atómicamente en la misma transacción SQL que los cambios del agregado. No obstante, limpiar la cola de eventos en memoria *antes* de confirmar la transacción SQL provoca la pérdida irreversible del evento ante reintentos de red o fallos de escritura de EF Core.

---

## 3. Decisión
Se estandariza una secuencia estricta de **limpieza de eventos post-commit** en todos los repositorios SQL que utilicen EF Core:

### A. Restricciones de la Secuencia
1. **Mapeo e Inserción**: El repositorio mapea los eventos de dominio del agregado a registros `OutboxMessages` y los añade al seguidor de cambios de EF Core.
2. **Ejecución Transaccional**: El repositorio invoca `SaveChangesAsync` dentro del ámbito transaccional.
3. **Limpieza en Memoria Post-Éxito**: Únicamente *después* de que `SaveChangesAsync` completa de forma exitosa, se invoca el método `MarkChangesAsCommitted()` de la entidad.

### B. Blueprint del Patrón
```csharp
public async Task<bool> SaveEntitiesAsync(CancellationToken ct = default)
{
    foreach (var aggregate in _trackedAggregates)
    {
        _dbContext.OutboxMessages.AddRange(OutboxMessageFactory.CreateFromAggregate(aggregate));
    }
    
    // Intenta persistir transaccionalmente en la base de datos
    await _dbContext.SaveChangesAsync(ct);
    
    // Limpia los eventos en memoria solo si la persistencia es exitosa
    foreach (var aggregate in _trackedAggregates)
    {
        aggregate.DomainEvents.MarkChangesAsCommitted();
    }
    _trackedAggregates.Clear();
    return true;
}
```

---

## 4. Consecuencias

### Positivas
- **Cero Pérdida de Eventos**: Ante reintentos automáticos de EF Core, fallos transitorios de red no purgarán los eventos del agregado hasta garantizar su persistencia.
- **Consistencia del Outbox**: El estado del Outbox queda estrictamente acoplado y sincronizado al éxito de la transacción de negocio.

### Negativas
- **Retención en Memoria**: Los payloads de eventos permanecen en memoria un tiempo marginalmente mayor durante el ciclo de vida de la transacción de red.

---

## 5. Revisión
Realizar auditorías automáticas de confiabilidad inyectando fallos de red simulados en el pipeline de CI.







## Objetivo y Alcance

Backfill histórico: Abordar la tensión arquitectónica donde context is unavailable, estableciendo un límite estándar.

## Opciones Consideradas

- **Seleccionada:** Ciclo de Vida Transaccional de Eventos en EF Core
- **Otras:** Desconocido (el registro histórico no enumera explícitamente alternativas rechazadas).

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad).

## Decisiones y Estándares Relacionados

Ninguna explícitamente enlazada.

## Vigilancia Tecnológica (Tendencias, Madurez, Adopción, Soporte)

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Fuentes Actuales

Desconocido (registro histórico).

---
[Volver al Índice](./README.es.md)
