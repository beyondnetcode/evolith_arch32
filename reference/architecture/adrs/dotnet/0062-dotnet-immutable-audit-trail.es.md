# [ADR 0062](0062-dotnet-immutable-audit-trail.md): Pista de Auditoría Inmutable en .NET vía Triggers DDL y Captura de Deltas

## 1. Estado
**Estado**: Propuesto
**Fecha**: 2026-05-23
**Alcance**: Stack Tecnológico - Seguridad y Cumplimiento en .NET

---

## 2. Contexto
Las normativas de gobernanza y cumplimiento empresarial exigen que las pistas de auditoría transaccionales permanezcan estrictamente inmutables; una vez registrados, los eventos no deben modificarse ni eliminarse, incluso bajo cuentas administrativas. Validar esto únicamente en la aplicación es frágil. Requerimos un mecanismo robusto que combine bloqueos a nivel de motor de base de datos con serialización estructurada de cambios en la aplicación.

---

## 3. Decisión
Se adopta una **estrategia híbrida de Triggers DDL en Base de Datos y Serialización de Deltas** para asegurar la inmutabilidad de la auditoría:

### A. Bloqueo en Base de Datos (Triggers DDL)
Todas las tablas del esquema de auditoría SQL Server se protegen mediante disparadores que impiden sentencias `UPDATE` y `DELETE`:
```sql
CREATE OR ALTER TRIGGER trg_security_events_immutable
ON ums_audit.security_events
AFTER UPDATE, DELETE
AS
BEGIN
    RAISERROR ('La pista de auditoría es inmutable. UPDATE y DELETE están prohibidos.', 16, 1);
    ROLLBACK TRANSACTION;
END;
```

### B. Captura de Deltas en la Aplicación
Los command handlers registran una instantánea del estado previo y posterior mediante el utilitario `DeltaCapture`, persistiendo la serialización de diferencias en el payload:
```csharp
public static class DeltaCapture
{
    public static AuditDelta Capture<T>(T before, T after, string actorId) where T : class
    {
        var beforeJson = JsonSerializer.Serialize(before, DefaultOptions);
        var afterJson = JsonSerializer.Serialize(after, DefaultOptions);
        return new AuditDelta(beforeJson, afterJson, actorId, DateTimeOffset.UtcNow, beforeJson != afterJson);
    }
}
```

---

## 4. Consecuencias

### Positivas
- **Gobernanza Garantizada**: El motor SQL bloquea cualquier manipulación, impidiendo errores de lógica o elevación de privilegios en el registro de pistas.
- **Fidelidad Histórica**: Las instantáneas del delta permiten reconstruir estados del negocio en cualquier punto específico del tiempo.

### Negativas
- **Procesamiento de GDPR**: Los flujos de depuración de datos sensibles por privacidad de datos requieren procedimientos almacenados especializados fuera de banda que se ejecuten bajo roles que evadan RLS y triggers de auditoría de forma temporal.

---

## 5. Revisión
Auditar anualmente la cobertura de triggers inmutables sobre todas las tablas de persistencia de eventos y registros.







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
