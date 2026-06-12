# [ADR 0060](0060-dotnet-multi-tenancy-dual-layer-strategy.md): Estrategia de Multi-Tenancy de Doble Capa en .NET (EF Core y SQL Server)

## 1. Estado
**Estado**: Propuesto
**Fecha**: 2026-05-23
**Alcance**: Stack Tecnológico - Persistencia y Seguridad en .NET

---

## 2. Contexto
El estándar base corporativo (ADR-0010) exige el aislamiento de múltiples inquilinos (multi-tenancy) mediante seguridad a nivel de fila (RLS), pero detalla la implementación principalmente para PostgreSQL. Para implementar esta línea base con alta confiabilidad en aplicaciones .NET sobre Microsoft SQL Server y EF Core, debemos definir el modelo de integración que prevenga fugas de datos y garantice el cumplimiento regulatorio a escala.

---

## 3. Decisión
Se adopta una **estrategia de aislamiento tenant de doble capa (defensa en profundidad)** para APIs en .NET con EF Core y SQL Server:

### A. Capa Principal: Filtros Globales de Consulta en EF Core
Todas las configuraciones de entidades con ámbito de tenant en el DbContext deben aplicar un filtro que limite las filas según el contexto de inquilino de la solicitud:
```csharp
modelBuilder.Entity<TenantScopedEntity>()
    .HasQueryFilter(x => !tenantContext.OrganizationId.HasValue || x.TenantId == tenantContext.OrganizationId.Value);
```
- **Bypass de Contexto del Sistema**: Cuando `OrganizationId` es nulo (tareas en segundo plano, despachador del outbox), el filtro no aplica.
- **Registros Globales**: Las propiedades `TenantId` nulas permiten que los registros globales del sistema siempre sean visibles.

### B. Capa Failsafe: Interceptor SQL Server RLS mediante Session Context
Se implementa un `DbConnectionInterceptor` en EF Core para enviar el ID del inquilino al contexto de la sesión de SQL Server inmediatamente al abrir la conexión:
```csharp
public override async Task ConnectionOpenedAsync(
    DbConnection connection, ConnectionEndEventData eventData, CancellationToken ct = default)
{
    if (_tenantContext.OrganizationId.HasValue)
    {
        using var command = connection.CreateCommand();
        command.CommandText = "EXEC sp_set_session_context @key = N'current_organization_id', @value = @organizationId;";
        var param = command.CreateParameter();
        param.ParameterName = "@organizationId";
        param.Value = _tenantContext.OrganizationId.Value;
        command.Parameters.Add(param);
        await command.ExecuteNonQueryAsync(ct);
    }
    await base.ConnectionOpenedAsync(connection, eventData, ct);
}
```
En la base de datos, las políticas de seguridad RLS bloquean el acceso no autorizado basándose en `SESSION_CONTEXT(N'current_organization_id')`.

---

## 4. Consecuencias

### Positivas
- **Defensa en Profundidad**: Previene fugas de datos incluso si una consulta deshabilita explícitamente los filtros globales vía `.IgnoreQueryFilters()`.
- **Seguridad para el Desarrollador**: Elimina el riesgo de olvidar una cláusula manual `WHERE TenantId` en las clases de repositorio.

### Negativas
- **Sobrecarga del Interceptor**: Agrega un comando de red menor a la base de datos durante la inicialización de la conexión.

---

## 5. Revisión
Evaluar los impactos de rendimiento bajo cargas altamente concurrentes en la próxima sesión del comité de arquitectura.







## Objetivo y Alcance

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Opciones Consideradas

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Evidencias y Criterios de Evaluación

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Decisiones y Estándares Relacionados

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Vigilancia Tecnológica (Tendencias, Madurez, Adopción, Soporte)

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Fuentes Actuales

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

---
[Volver al Índice](./README.es.md)
