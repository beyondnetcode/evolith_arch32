# ADR-0071: Estrategia de Acceso a Datos .NET — EF Core como ORM Predeterminado, Dapper para Lecturas Optimizadas

## 1. Estado

| Campo | Valor |
|-------|-------|
| **Estado** | Aprobado |
| **Fecha** | 2026-05-15 |
| **Alcance** | Stack Tecnológico — Acceso a Datos .NET |
| **Supercede** | Guía parcial en [ADR-0041](./0041-canonical-dotnet-backend-architecture.md) |
| **Relacionado** | [ADR-0034: Aplicabilidad de CQRS](../core/0034-cqrs-pattern-applicability-matrix.md), [ADR-0033: Outbox Transaccional](../core/0033-transactional-outbox-pattern.md), [ADR-0010: RLS Multi-Tenancy](../core/0010-multi-tenancy-architecture-strategy.md) |

---

## 2. Contexto

La plataforma .NET en esta arquitectura maneja cargas de trabajo de alto cómputo: resolución de grafos de autorización, reportes de cumplimiento, flujos de promoción de roles IGA y operaciones de datos multi-tenant. [ADR-0041](./0041-canonical-dotnet-backend-architecture.md) estableció Entity Framework Core (EF Core) como ORM principal y autorizó Dapper para cargas de lectura de alto rendimiento, pero dejó sin definir el límite entre ambos.

Sin límites explícitos, los equipos corren el riesgo de:

- Mezclar estrategias ORM de forma ad-hoc, generando patrones de acceso a datos inconsistentes entre bounded contexts
- Optimizar prematuramente rutas de lectura con Dapper antes de haber confirmado un cuello de botella real con EF Core mediante profiling
- Usar Dapper para operaciones de escritura (command-side) y eludir involuntariamente el change tracking, la consistencia de aggregates y el patrón Unit of Work
- Perder la infraestructura de auditoría y eventos de dominio provista por los interceptores de EF Core al cambiar a Dapper sin conciencia de las consecuencias

Este ADR establece una política clara y aplicable que define cuándo corresponde usar cada herramienta, garantizando consistencia, mantenibilidad y alineación con los principios de DDD y Clean Architecture.

---

## 3. Enunciado del Problema

Los equipos enfrentan tres tensiones sin resolver:

1. **Uniformidad vs. Rendimiento**: EF Core es productivo y está bien integrado con el modelo de dominio, pero puede generar SQL subóptimo para proyecciones complejas o reportes. Dapper ofrece control total del SQL a costa de perder change tracking, interceptores y el Unit of Work.

2. **Optimización Prematura**: Migrar a Dapper se hace frecuentemente por razones de rendimiento percibidas, antes de que el profiling aporte evidencia, añadiendo complejidad sin beneficio medible.

3. **Seguridad del Aggregate en Escrituras**: Usar Dapper para operaciones del lado de comandos (escritura) arriesga eludir los invariantes de dominio aplicados por el change tracking de EF Core y los interceptores de `SaveChangesAsync` — incluyendo el patrón Outbox y la inyección de contexto de sesión RLS.

---

## 4. Decisión

**Entity Framework Core 8+ es el ORM predeterminado y obligatorio para todo el acceso a datos .NET en esta plataforma.**

Dapper es una herramienta secundaria autorizada condicionalmente, permitida **únicamente** para operaciones del lado de lectura (query) que satisfagan los criterios de justificación explícitos definidos en la sección 7.

Los comandos (escrituras) deben usar siempre EF Core. Sin excepciones.

---

## 5. Fundamento

### 5.1 Por Qué EF Core Como Predeterminado

EF Core no es simplemente un ORM — es el punto de integración de varios aspectos transversales en esta arquitectura:

| Aspecto | Mecanismo EF Core |
|---------|------------------|
| RLS Multi-Tenant | `DbConnectionInterceptor` inyecta `SESSION_CONTEXT` antes de cada consulta |
| Outbox Transaccional | `SaveChangesInterceptor` escribe eventos de dominio en `outbox_events` atómicamente |
| Soft-delete / Auditoría | Filtros globales aplican `is_deleted = false`; interceptores completan columnas de auditoría |
| Unit of Work | `DbContext` registra todos los cambios en una transacción; `SaveChangesAsync` los persiste atómicamente |
| Concurrencia Optimista | `[ConcurrencyToken]` / `rowversion` gestionados automáticamente |
| Despacho de Domain Events | Los eventos recolectados en aggregates son obtenidos en el `Save()` del repositorio antes del commit |

Eludir EF Core para escrituras elimina todo lo anterior de forma silenciosa. Dapper no tiene ningún mecanismo equivalente.

### 5.2 Por Qué Dapper Está Autorizado Condicionalmente para Lecturas

Para **proyecciones de solo lectura** donde:
- El modelo de lectura está desacoplado estructuralmente del aggregate de dominio (lado de lectura CQRS)
- La consulta involucra joins multi-tabla, funciones de ventana o CTEs recursivos que EF Core mapea deficientemente
- El profiling ha confirmado el SQL generado por EF Core como cuello de botella (tiempo de consulta > umbral definido en sección 6.2)

Dapper ofrece SQL explícito y ergonómico con mínimo overhead y riesgo nulo de N+1 en proyecciones complejas.

---

## 6. Consideraciones de Rendimiento

### 6.1 Optimización de Consultas EF Core Primero

Antes de autorizar Dapper, deben intentarse y documentarse como insuficientes las siguientes optimizaciones de EF Core:

```csharp
// 1. Usar AsNoTracking() para todas las consultas de solo lectura
var users = await _dbContext.Users
    .AsNoTracking()
    .Where(u => u.TenantId == tenantId)
    .Select(u => new UserSummaryDto(u.Id, u.Email, u.DisplayName))
    .ToListAsync();

// 2. Usar split queries para includes de colecciones y evitar explosión cartesiana
var tenants = await _dbContext.Tenants
    .AsNoTracking()
    .Include(t => t.Users)
    .AsSplitQuery()
    .ToListAsync();

// 3. Usar compiled queries para rutas calientes
private static readonly Func<AppDbContext, Guid, Task<UserSummaryDto?>> _getUserById =
    EF.CompileAsyncQuery((AppDbContext ctx, Guid id) =>
        ctx.Users.AsNoTracking()
            .Where(u => u.Id == id)
            .Select(u => new UserSummaryDto(u.Id, u.Email, u.DisplayName))
            .FirstOrDefault());

// 4. Usar SQL raw vía EF Core para consultas complejas — mantiene activos los interceptores
var results = await _dbContext.Database
    .SqlQuery<UserProjection>($"SELECT ...")
    .ToListAsync();
```

### 6.2 Umbral de Autorización para Dapper

Un uso de Dapper se autoriza cuando **todos** los siguientes son verdaderos:

- [ ] La operación es de solo lectura (sin INSERT / UPDATE / DELETE)
- [ ] EF Core con `AsNoTracking` + proyección fue implementado y perfilado
- [ ] El tiempo de ejecución de la consulta en datos representativos de producción supera **200 ms en p95**, O el plan SQL generado por EF Core muestra un full table scan irresolvible con un índice
- [ ] El uso de Dapper está documentado en el archivo `DataAccessDecisions.md` del bounded context

### 6.3 Gestión de Conexión y Contexto con Dapper

Cuando Dapper está autorizado, debe compartir la misma `DbConnection` que el `DbContext` activo para garantizar:

- Que el mismo `SESSION_CONTEXT` RLS ya está configurado (establecido por el interceptor de EF Core al abrir la conexión)
- Que el mismo ámbito de transacción se respeta en operaciones híbridas

```csharp
// Correcto: reutilizar la conexión del DbContext — el contexto RLS ya está configurado
public async Task<IReadOnlyList<AuthGraphProjection>> GetAuthGraphAsync(Guid tenantId)
{
    var connection = _dbContext.Database.GetDbConnection();
    // La conexión ya tiene SESSION_CONTEXT configurado por el interceptor de EF Core
    return (await connection.QueryAsync<AuthGraphProjection>(
        "SELECT user_id, role_ids, permission_ids FROM vw_auth_graph WHERE tenant_id = @TenantId",
        new { TenantId = tenantId }
    )).ToList();
}
```

---

## 7. Cuándo Debe Preferirse EF Core

Usar EF Core en **todos** los siguientes escenarios:

| Escenario | Razón |
|----------|-------|
| Cualquier operación de escritura (INSERT / UPDATE / DELETE) | Preserva Unit of Work, change tracking e integración del outbox |
| CRUD estándar para aggregate roots | Change tracking detecta mutaciones; no se necesita mapeo manual |
| Operaciones que requieren concurrencia optimista | `rowversion` / `[ConcurrencyToken]` gestionados automáticamente |
| Consultas dentro de la misma transacción que una escritura | Visibilidad atómica; consistente con Unit of Work |
| Cualquier consulta donde el contexto RLS debe estar garantizado | El interceptor de EF Core asegura la configuración de `SESSION_CONTEXT` |
| Nuevas rutas de consulta sin datos de profiling | Elección predeterminada; optimizar solo cuando la evidencia lo exija |
| Consultas con conciencia de soft-delete | El filtro global se aplica automáticamente |
| Escrituras con columnas de auditoría pobladas | `SaveChangesInterceptor` completa `created_by`, `updated_at`, etc. |

---

## 8. Cuándo Se Permite Dapper

Dapper puede autorizarse **únicamente** para operaciones del lado de lectura que satisfagan el umbral de la sección 6.2:

| Escenario | Justificación |
|----------|--------------|
| Consultas de reporting complejo (agregación cross-context) | SQL multi-CTE o con funciones de ventana impracticable con EF Core Linq |
| Resolución de grafo de autorización (proyección compilada, ruta caliente) | Requisito de latencia sub-milisegundo; vista altamente desnormalizada |
| Exportación de compliance con conjuntos de resultados de 100k+ filas | Streaming vía `QueryUnbufferedAsync`; EF Core materializa todo en memoria |
| Consultas jerárquicas / CTE recursivos | EF Core 8 soporta `ExecuteSqlRaw`; usar eso primero, Dapper como alternativa |
| Reconstrucción de read model para proyecciones CQRS | Lectura masiva del event store; no se necesita modelo de dominio |

**Dapper nunca está autorizado para:**

- Manejadores de comandos o servicios de aplicación que modifican estado
- Operaciones dentro de una transacción de aggregate
- Consultas que producen datos realimentados al modelo de dominio para mutación posterior

---

## 9. Alineación con DDD y Clean Architecture

### 9.1 Disciplina de Capas

```
Capa de Dominio          (sin dependencia de persistencia)
    │
    ▼
Capa de Aplicación       (orquesta casos de uso, llama a IRepository<T>)
    │
    ▼
Capa de Infraestructura  (implementa IRepository<T> usando EF Core o Dapper)
    │
    ├── Repositorios EF Core     ← predeterminado; todas las escrituras; mayoría de lecturas
    └── Servicios de Query Dapper ← solo lectura; proyecciones autorizadas únicamente
```

Las capas de Dominio y Aplicación son completamente ajenas a la tecnología de persistencia utilizada. El puerto (interfaz) es el único contrato visible para la aplicación.

### 9.2 Regla de Consistencia del Aggregate

El Aggregate Root es la unidad de consistencia. Todas las mutaciones deben:

1. Pasar por el método de dominio en el Aggregate Root
2. Persistirse mediante el repositorio EF Core usando `SaveChangesAsync`
3. Producir Domain Events obtenidos por el repositorio antes del commit (integración Outbox)

Dapper **no debe** ser la ruta de escritura para ningún dato que forme parte de un límite de aggregate.

### 9.3 Aislamiento del Read Model

Los read models CQRS están estructuralmente separados de los write models. Un servicio de query Dapper dirigido a una vista de solo lectura o una tabla de proyección desnormalizada está alineado con los principios CQRS — no toca el estado del aggregate y no necesita change tracking.

```csharp
// Separación limpia: servicio de lectura usa Dapper, repositorio de escritura usa EF Core
public interface IAuthGraphReadService   // Lado de lectura — Dapper autorizado
{
    Task<AuthGraphDto> GetByUserAsync(Guid userId, Guid tenantId);
}

public interface IUserRepository          // Lado de escritura — EF Core obligatorio
{
    Task<User?> FindByIdAsync(Guid id);
    Task SaveAsync(User user);
}
```

---

## 10. Consideraciones de Mantenibilidad

### 10.1 Carga Cognitiva de Codebases con Doble ORM

Mezclar EF Core y Dapper en el mismo bounded context incrementa:

- El tiempo de incorporación de ingenieros no familiarizados con el límite
- El riesgo de comportamiento de consultas inconsistente (una ruta respeta filtros globales, la otra no)
- La superficie de pruebas (dos rutas de código a verificar)

Mitigación: el uso de Dapper está **delimitado por bounded context** y debe estar aislado en clases `*QueryService` dedicadas dentro de la capa de Infraestructura.

### 10.2 Mantenibilidad del SQL

Los strings SQL de Dapper no son seguros para refactoring. Prácticas obligatorias cuando se usa Dapper:

```csharp
// Obligatorio: usar SQL embebido en archivos o constantes — nunca strings mágicos inline
public static class AuthGraphQueries
{
    public const string GetByUser = """
        SELECT
            u.id            AS UserId,
            r.id            AS RoleId,
            r.name          AS RoleName,
            p.code          AS PermissionCode
        FROM ums.users u
        INNER JOIN ums.user_roles ur ON ur.user_id = u.id
        INNER JOIN ums.roles r       ON r.id = ur.role_id
        INNER JOIN ums.role_permissions rp ON rp.role_id = r.id
        INNER JOIN ums.permissions p ON p.id = rp.permission_id
        WHERE u.id = @UserId
          AND u.tenant_id = @TenantId
          AND u.is_deleted = FALSE
        """;
}
```

### 10.3 Propiedad de Migraciones de Esquema

Las Migraciones de EF Core son la única fuente de verdad para el esquema de base de datos. El SQL de Dapper nunca debe contener DDL ni asumir estructuras de esquema no rastreadas en las Migraciones. Cualquier vista o función usada por Dapper debe ser creada mediante una Migración.

---

## 11. Anti-Patrones a Evitar

| Anti-Patrón | Riesgo | Regla |
|-------------|--------|-------|
| Dapper para operaciones de comando (escritura) | Elude Unit of Work, outbox e interceptor RLS | **Prohibido** |
| Strings SQL inline en clases handler/servicio | Inmantenible, sin fuente única de verdad | **Prohibido** |
| Abrir una nueva `DbConnection` en una consulta Dapper en lugar de reutilizar la del `DbContext` | Rompe el contexto de sesión RLS; entrada separada del pool de conexiones | **Prohibido** |
| Cambiar a Dapper sin evidencia de profiling | Optimización prematura; añade complejidad sin beneficio | **Prohibido** |
| Mezclar escrituras Dapper y EF Core en la misma transacción sin conexión compartida | Ámbito de transacción inconsistente | **Prohibido** |
| Usar resultados de Dapper como entidades de dominio para mutación posterior | Elude el cumplimiento de invariantes del aggregate | **Prohibido** |
| `Database.ExecuteSqlRaw` de EF Core para escrituras en capa de aplicación | Elude change tracking e interceptores | **Prohibido** |
| `context.SaveChanges()` (síncrono) en ruta de código asíncrona | Bloquea el thread pool; rompe el patrón async | **Prohibido** |

---

## 12. Guías de Implementación Recomendadas

### 12.1 Patrón Repositorio (EF Core)

```csharp
// infrastructure/persistence/repositories/UserRepository.cs
public sealed class UserRepository : IUserRepository
{
    private readonly AppDbContext _ctx;

    public UserRepository(AppDbContext ctx) => _ctx = ctx;

    public async Task<User?> FindByIdAsync(Guid id, CancellationToken ct = default)
    {
        // AsNoTracking NO se usa aquí — podemos mutar y guardar
        return await _ctx.Users
            .Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.Id == id, ct);
    }

    public async Task SaveAsync(User user, CancellationToken ct = default)
    {
        _ctx.Users.Update(user);
        // SaveChangesAsync activa:
        //   1. Interceptor RLS (SESSION_CONTEXT ya configurado en la conexión)
        //   2. Interceptor de auditoría (completa updated_at, updated_by)
        //   3. Interceptor outbox (escribe domain events en outbox_events)
        await _ctx.SaveChangesAsync(ct);
    }
}
```

### 12.2 Servicio de Query Dapper (Lado de Lectura)

```csharp
// infrastructure/persistence/queries/AuthGraphQueryService.cs
public sealed class AuthGraphQueryService : IAuthGraphReadService
{
    private readonly AppDbContext _ctx;

    public AuthGraphQueryService(AppDbContext ctx) => _ctx = ctx;

    public async Task<AuthGraphDto?> GetByUserAsync(Guid userId, Guid tenantId, CancellationToken ct = default)
    {
        // Reutilizar la conexión de EF Core — SESSION_CONTEXT RLS ya configurado por el interceptor
        var conn = _ctx.Database.GetDbConnection();
        if (conn.State != ConnectionState.Open)
            await conn.OpenAsync(ct);

        var rows = await conn.QueryAsync<AuthGraphRow>(
            AuthGraphQueries.GetByUser,
            new { UserId = userId, TenantId = tenantId }
        );

        return rows.Any()
            ? AuthGraphMapper.Map(rows)
            : null;
    }
}
```

### 12.3 Registro de DI

```csharp
// infrastructure/DependencyInjection.cs
services.AddScoped<IUserRepository, UserRepository>();               // EF Core — escrituras
services.AddScoped<IAuthGraphReadService, AuthGraphQueryService>();  // Dapper — lecturas
```

### 12.4 Registro de Autorización de Dapper

Al introducir Dapper para una nueva consulta, el ingeniero debe agregar una entrada al `DataAccessDecisions.md` del bounded context:

```markdown
## DA-001 — Proyección de Grafo de Autorización (Dapper)
- **Fecha**: 2026-05-15
- **Autor**: @ingeniero
- **Consulta**: `GetByUserAsync` en `AuthGraphQueryService`
- **Intento EF Core**: Implementado con `AsNoTracking` + proyección `Select`
- **Resultado de Profiling**: 340 ms p95 en dataset de 500k filas; EF Core generó 4 consultas N+1
- **Justificación**: El join de jerarquía de roles recursiva requiere CTE recursivo; EF Core Linq no puede expresarlo
- **Aprobado Por**: @arquitecto
```

---

## 13. Beneficios

| Beneficio | Descripción |
|-----------|-------------|
| **Predeterminado único** | Todos los ingenieros saben que EF Core es el punto de partida; sin fatiga de decisiones |
| **Consistencia de infraestructura** | RLS, outbox, interceptores de auditoría se aplican uniformemente a todas las rutas de escritura |
| **Seguridad del aggregate** | El change tracking de EF Core garantiza que las mutaciones pasen por los métodos del aggregate |
| **Fuente única para el esquema** | Las Migraciones de EF Core son propietarias del esquema; las consultas Dapper nunca divergen |
| **Lecturas optimizadas basadas en evidencia** | Dapper está disponible cuando genuinamente se necesita — no está prohibido |
| **Alineación DDD** | La separación lectura/escritura soporta CQRS sin sobreingeniería en rutas de lectura |

---

## 14. Trade-offs

| Trade-off | Mitigación |
|-----------|-----------|
| EF Core puede generar SQL subóptimo para joins complejos | `AsNoTracking` + proyecciones `Select` resuelven la mayoría de casos; Dapper como escape hatch |
| Dapper requiere mantenimiento manual del SQL | Constantes SQL en archivos dedicados; esquema gestionado por migraciones |
| Dos modelos mentales para el acceso a datos | Convención de nombres estricta (`*Repository` = EF Core, `*QueryService` = Dapper) |
| Dapper elude filtros globales (soft-delete, RLS) | Las consultas Dapper deben incluir explícitamente `WHERE is_deleted = FALSE AND tenant_id = @TenantId` |

---

## 15. Consecuencias

### Positivas
- Modelo de acceso a datos unificado y predecible con una ruta de escalación clara
- Eventos de dominio, auditoría y RLS garantizados en el 100% de las operaciones de escritura
- Los equipos dedican menos tiempo a debatir la elección de ORM y más a la lógica de dominio
- Las pruebas de integración son más simples — una sola ruta ORM a verificar para escrituras

### Negativas
- Los ingenieros deben aprender el umbral de autorización para Dapper y documentar su uso
- El SQL de Dapper que elude filtros globales crea un riesgo de corrección si la guía no se sigue (mitigado por revisión de código y el proceso `DataAccessDecisions.md`)
- En repositorios donde EF Core es claramente el cuello de botella, el paso de profiling añade tiempo antes de que Dapper pueda usarse

---

## 16. Alternativas Consideradas

| Alternativa | Decisión | Razón de Rechazo |
|-------------|----------|-----------------|
| Dapper en todas partes | Rechazada | Sin change tracking; debe reimplementarse Unit of Work, auditoría, outbox, RLS manualmente |
| EF Core exclusivamente (sin Dapper) | Rechazada | Impracticable para consultas de reporting complejas; EF Core Linq no puede expresar todas las construcciones SQL |
| RepoDb como ORM unificado | Rechazada | Ecosistema más pequeño, menos maduro que EF Core; añade una tercera dependencia |
| NHibernate | Rechazada | Tecnología legacy; la inversión de comunidad y tooling está declinando en el ecosistema .NET |
| ADO.NET directamente | Rechazada | Abstracción más baja; apropiada para drivers pero no para persistencia alineada con el dominio |
| Marten (event store + document DB) | Diferida | Válida para contextos event-sourced; evaluar cuando se adopte event sourcing completo |

---

## 17. Revisión

Evaluar en **Q4 2026** si:
- El umbral de autorización de Dapper (200 ms p95) requiere ajuste basado en datos de producción
- Las mejoras de EF Core 9/10 (ej. soporte nativo de tipos complejos, mapeo de columnas JSON) eliminan alguna justificación activa de Dapper
- Marten debe adoptarse formalmente para bounded contexts event-sourced

---

[Volver al Índice .NET](./README.es.md) | [Volver al Navegador de ADRs](../README.md)
