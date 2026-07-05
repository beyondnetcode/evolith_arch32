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

Backfill histórico: Abordar la tensión arquitectónica donde context is unavailable, estableciendo un límite estándar.

## Opciones Consideradas

- **Seleccionada:** Pista de Auditoría Inmutable en .NET vía Triggers DDL y Captura de Deltas
- **Otras:** Desconocido (el registro histórico no enumera explícitamente alternativas rechazadas).

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad).

## Decisiones y Estándares Relacionados

Ninguna explícitamente enlazada.

## Vigilancia Tecnológica (Tendencias, Madurez, Adopción, Soporte)

Los patrones de auditoría inmutable con triggers DDL y captura delta son maduros en arquitectura de datos empresarial. SQL Server ofrece change tracking y tablas temporales que soportan requisitos de auditoría inmutable. El patrón aborda requisitos SOX, GDPR y otros. Vigencia esperada: 5+ años.

## Fuentes Actuales

- Documentación de tablas temporales SQL Server — https://learn.microsoft.com/es-es/sql/relational-databases/tables/temporal-tables, consultado 2026-06-20.
- Guías de logging OWASP — https://cheatsheetseries.owasp.org, consultado 2026-06-20.

---
[Volver al Índice](./README.es.md)
