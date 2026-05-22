# ADR-0056: Convenciones Empresariales de Nomenclatura y Diseño — Multi-Lenguaje, Multi-Plataforma

## Estado

**Propuesto** — Amplía y reemplaza el alcance de nomenclatura de [ADR-0049 (Semántica y Nomenclatura Clean Code)](./0049-naming-semantics-clean-code-policy.md) con reglas vinculantes, específicas por lenguaje y plataforma.

## Fecha

2026-05-15

## Autores

Arquitecto Principal de Software

---

## 1. Contexto

Esta organización opera una arquitectura políglota y multi-plataforma que abarca:

- **Runtimes:** C# / .NET 8, Java 21, TypeScript / Node.js 20, Python 3.12
- **APIs:** REST (OpenAPI 3.1), gRPC, GraphQL (solo servicios satélite)
- **Bases de datos:** SQL Server 2022, PostgreSQL 16, almacenes analíticos (BigQuery / Synapse)
- **Mensajería:** Eventos de dominio (CloudEvents 1.0), comandos, eventos de integración vía RabbitMQ / Dapr pub/sub
- **Paradigma de diseño:** Domain-Driven Design (DDD) — estratégico y táctico
- **Estándar de calidad:** ISO/IEC 25010 (mantenibilidad, confiabilidad, portabilidad)
- **Estándar de metadatos:** ISO/IEC 11179 (nomenclatura de elementos de datos)

La inconsistencia en la nomenclatura es la fuente más frecuente de fricción en la incorporación de nuevos integrantes, bugs de integración y configuraciones incorrectas de seguridad. Un estándar corporativo vinculante elimina la ambigüedad y permite el cumplimiento automatizado.

---

## 2. Planteamiento del Problema

La ausencia de una política unificada de nomenclatura produce:

| Síntoma | Impacto |
| :--- | :--- |
| `userId` en API, `user_id` en BD, `UserId` en código — tres nombres para un mismo concepto | Bugs de integración, sobrecarga de mapeo manual |
| `GetUser`, `FetchUser`, `RetrieveUser` — sinónimos para la misma operación | Documentación inconsistente, sobrecarga cognitiva |
| Tipos de evento como `user.created`, `UserCreated`, `USER_CREATED` — todos en producción | Imposible construir consumidores de eventos confiables |
| Tabla `tbl_usr` vs `users` vs `User` entre equipos | Complejidad en migraciones, errores de consulta |
| Abreviaciones: `prd`, `cust`, `auth_tkn` | Ambigüedad, menor capacidad de búsqueda |

---

## 3. Decisión

Adoptar un **estándar único de nomenclatura vinculante con cumplimiento automatizado**, basado en cuatro pilares:

1. **El Lenguaje Ubicuo como Fuente de Verdad.** Cada nombre en código, API, base de datos y eventos proviene del glosario de dominio.
2. **Convenciones nativas por ecosistema.** Cada lenguaje y plataforma sigue su estándar de comunidad con extensiones DDD.
3. **Un concepto, múltiples representaciones.** Un concepto de dominio tiene exactamente un nombre canónico en el lenguaje ubicuo, renderizado según las reglas de cada capa.
4. **Automatización sobre documentación.** Toda regla debe ser verificable por un linter, analizador o gate de CI.

### 3.1 Regla de Derivación del Nombre Canónico

```
Término del Lenguaje Ubicuo (sustantivo/frase verbal en inglés)
    │
    ├─ C#         → PascalCase clase / camelCase miembro
    ├─ Java       → PascalCase clase / camelCase miembro
    ├─ TypeScript → PascalCase clase / camelCase miembro
    ├─ Python     → PascalCase clase / snake_case miembro
    ├─ URL REST   → kebab-case segmento de ruta
    ├─ Cuerpo JSON → camelCase propiedad
    ├─ Tabla SQL  → snake_case sustantivo plural
    ├─ Columna SQL → snake_case
    └─ Tipo de evento → {dominio}.{entidad}.{participio-pasado} (punto, minúsculas)
```

**Ejemplo — concepto: "Orden de Trabajo" (Work Order)**

| Capa | Representación |
| :--- | :--- |
| Lenguaje Ubicuo | Work Order |
| Clase C# | `WorkOrder` |
| Propiedad C# | `workOrderId` |
| Clase Java | `WorkOrder` |
| Interfaz TypeScript | `WorkOrder` |
| Clase Python | `WorkOrder` |
| Atributo Python | `work_order_id` |
| Endpoint REST | `GET /v1/work-orders/{work-order-id}` |
| Propiedad JSON | `"workOrderId"` |
| Tabla SQL | `work_orders` |
| Columna SQL | `work_order_id` |
| Tipo de evento de dominio | `operations.work-order.created` |
| Tabla de hechos analítica | `fct_work_orders` |

---

## 4. Alternativas Consideradas

### 4.1 snake_case completo (centrado en Python)
**Rechazado.** Viola los idiomas de C# y Java. Fuerza código no idiomático en lenguajes fuertemente tipados donde compiladores e IDEs asumen PascalCase para tipos. La mantenibilidad de ISO/IEC 25010 exige alineación convencional con cada ecosistema.

### 4.2 camelCase completo (centrado en JavaScript)
**Rechazado.** `workOrderId` como nombre de columna SQL no es idiomático, rompe las convenciones de SQL Server y PostgreSQL y reduce la legibilidad en DDL.

### 4.3 Autonomía por equipo con glosario compartido
**Rechazado.** Crea inconsistencias de integración. Cuando el Equipo A nombra el campo API `customerId` y el Equipo B nombra la columna BD `customer_code`, los fallos de sincronización generan bugs de datos costosos de rastrear.

### 4.4 Elegida: Ecosistema-nativo por capa, concepto canónico del lenguaje ubicuo
**Adoptada.** Respeta el estándar de cada comunidad. Automatizable vía linters. El nombre canónico en el lenguaje ubicuo actúa como ancla estable — cada capa lo renderiza según sus propias reglas.

---

## 5. Reglas por Lenguaje

### 5.1 C# / .NET 8

Sigue las [Directrices de Nomenclatura de Microsoft .NET](https://learn.microsoft.com/es-es/dotnet/standard/design-guidelines/naming-guidelines) con extensiones DDD.

| Construcción | Convención | Ejemplo |
| :--- | :--- | :--- |
| Espacio de nombres | PascalCase, alineado al dominio | `Acme.Orders.Domain.Aggregates` |
| Clase / Struct / Record | PascalCase | `WorkOrder`, `Money` |
| Interfaz | Prefijo `I` + PascalCase | `IWorkOrderRepository` |
| Enum | PascalCase; miembros PascalCase | `OrderStatus.Confirmed` |
| Método | PascalCase (frase verbal) | `CalculateTotalCost()` |
| Propiedad | PascalCase | `WorkOrderId` |
| Campo privado | Prefijo `_` + camelCase | `_workOrderId` |
| Variable local | camelCase | `workOrderId` |
| Constante | PascalCase (no UPPER_SNAKE) | `MaxRetryCount` |
| Parámetro genérico | Prefijo `T` + sustantivo PascalCase | `TEntity`, `TResult` |
| Método asíncrono | Sufijo `Async` | `GetWorkOrderAsync()` |
| Clase de prueba | `{Sujeto}Tests` | `WorkOrderTests` |
| Método de prueba | `{Método}_When{Condición}_Should{Resultado}` | `Complete_WhenAlreadyClosed_ShouldReturnFailure` |

**Convenciones DDD en C#:**

```csharp
// Aggregate Root
public sealed class WorkOrder : AggregateRoot<WorkOrderId> { }

// Value Object (inmutable)
public sealed record Money(decimal Amount, Currency Currency);

// Evento de dominio (tiempo pasado)
public sealed record WorkOrderCreatedEvent(WorkOrderId WorkOrderId, ...) : DomainEvent;

// Comando (imperativo)
public sealed record CreateWorkOrderCommand(...) : IRequest<Result<WorkOrderId>>;

// Query (pregunta)
public sealed record GetWorkOrderByIdQuery(WorkOrderId Id) : IRequest<Result<WorkOrderDto>>;

// Puerto de repositorio
public interface IWorkOrderRepository { }

// Servicio de dominio (sin estado)
public sealed class WorkOrderPricingService { }

// Especificación
public sealed class OpenWorkOrdersSpecification : Specification<WorkOrder> { }

// Política
public sealed class LateDeliveryPenaltyPolicy { }
```

---

### 5.2 Java 21

Sigue la [Guía de Estilo de Google Java](https://google.github.io/styleguide/javaguide.html) con extensiones DDD.

| Construcción | Convención | Ejemplo |
| :--- | :--- | :--- |
| Paquete | minúsculas, alineado al dominio | `com.acme.orders.domain.aggregates` |
| Clase / Interfaz / Enum | PascalCase | `WorkOrder`, `WorkOrderRepository` |
| Método | camelCase (frase verbal) | `calculateTotalCost()` |
| Campo | camelCase | `workOrderId` |
| Constante | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Clase de prueba | `{Sujeto}Test` | `WorkOrderTest` |

> **Diferencia con C#:** Java usa UPPER_SNAKE_CASE para constantes. Las interfaces **no** llevan prefijo `I` — la implementación lleva prefijo descriptivo (`JpaWorkOrderRepository`).

---

### 5.3 TypeScript / JavaScript

Sigue la [Guía de Estilo TypeScript de Google](https://google.github.io/styleguide/tsguide.html) con extensiones DDD.

| Construcción | Convención | Ejemplo |
| :--- | :--- | :--- |
| Nombre de archivo | kebab-case | `work-order.aggregate.ts` |
| Clase | PascalCase | `WorkOrder` |
| Interfaz | PascalCase (sin prefijo `I`) | `WorkOrderRepository` |
| Alias de tipo | PascalCase | `WorkOrderId` |
| Función / Método | camelCase | `calculateTotalCost()` |
| Variable / Propiedad | camelCase | `workOrderId` |
| Constante de módulo | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Componente React | PascalCase | `WorkOrderCard` |
| Hook React | Prefijo `use` + camelCase | `useWorkOrderList()` |

**Sufijos de archivo por capa:**

| Sufijo | Propósito |
| :--- | :--- |
| `.aggregate.ts` | Aggregate Root DDD |
| `.entity.ts` | Entidad DDD |
| `.value-object.ts` | Objeto de Valor |
| `.repository.ts` | Puerto (interfaz) |
| `.repository.impl.ts` | Adaptador (implementación) |
| `.use-case.ts` | Caso de uso de aplicación |
| `.command.ts` | Objeto de comando |
| `.query.ts` | Objeto de consulta |
| `.event.ts` | Evento de dominio |
| `.dto.ts` | Data Transfer Object |
| `.controller.ts` | Controlador HTTP |
| `.spec.ts` | Prueba unitaria |

---

### 5.4 Python 3.12

Sigue [PEP 8](https://peps.python.org/pep-0008/) con extensiones DDD.

| Construcción | Convención | Ejemplo |
| :--- | :--- | :--- |
| Módulo / archivo | snake_case | `work_order_repository.py` |
| Paquete | snake_case | `orders/domain/aggregates/` |
| Clase | PascalCase | `WorkOrder` |
| Clase de excepción | PascalCase + sufijo `Error` | `WorkOrderNotFoundError` |
| Función / Método | snake_case (frase verbal) | `calculate_total_cost()` |
| Variable / Atributo | snake_case | `work_order_id` |
| Atributo privado | Prefijo `_` + snake_case | `_work_order_id` |
| Constante | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Value Object (dataclass) | PascalCase, `frozen=True` | `@dataclass(frozen=True) class Money:` |
| Archivo de prueba | `test_{sujeto}.py` | `test_work_order.py` |

---

### 5.5 SQL (SQL Server 2022 y PostgreSQL 16)

Sigue los principios de nomenclatura de metadatos de [ISO/IEC 11179](https://www.iso.org/standard/60525.html).

| Construcción | Convención | Ejemplo |
| :--- | :--- | :--- |
| Esquema | snake_case, alineado al dominio | `orders`, `billing`, `audit` |
| Tabla | snake_case, **sustantivo plural** | `work_orders`, `order_items` |
| Columna | snake_case | `work_order_id`, `created_at` |
| Clave primaria | `id` (sustituta) | `id` |
| Columna FK | `{tabla_referenciada_singular}_id` | `customer_id` |
| Restricción FK | `fk_{tabla}_{tabla_referenciada}` | `fk_order_items_work_orders` |
| Restricción PK | `pk_{tabla}` | `pk_work_orders` |
| Restricción UNIQUE | `uq_{tabla}_{columnas}` | `uq_work_orders_reference_number` |
| Restricción CHECK | `ck_{tabla}_{regla}` | `ck_work_orders_status_valid` |
| Índice | `ix_{tabla}_{columnas}` | `ix_work_orders_customer_id_status` |
| Vista | `v_{nombre}` | `v_open_work_orders` |
| Procedimiento almacenado | `sp_{verbo}_{sustantivo}` | `sp_complete_work_order` |
| Función | `fn_{verbo}_{sustantivo}` | `fn_calculate_order_total` |
| Trigger | `tr_{tabla}_{evento}` | `tr_work_orders_after_update` |
| Archivo de migración | `{timestamp}_{descripción}.sql` | `20260515_143000_add_work_orders_table.sql` |
| Columnas de auditoría | `created_at`, `updated_at`, `created_by`, `updated_by` | Obligatorias en todas las tablas |

---

## 6. Reglas DDD de Nomenclatura

Todos los nombres deben provenir del **glosario de lenguaje ubicuo** definido por contexto delimitado. Los nombres no presentes en el glosario requieren una actualización del mismo antes de escribir código.

### 6.1 Aggregates
- Sustantivo del lenguaje ubicuo. Sin sufijos técnicos (`Aggregate`, `Root`).

```csharp
// OK: Correcto
public sealed class WorkOrder : AggregateRoot<WorkOrderId> { }

// MAL: Incorrecto — sufijo redundante
public sealed class WorkOrderAggregate : AggregateRoot<WorkOrderId> { }
```

### 6.2 Eventos de Dominio
- **Formato:** `{Aggregate}{ParticipioPasado}` — siempre en tiempo pasado.
- Sufijo `Event` en lenguajes OO. **No** en el campo `type` de CloudEvents.

```csharp
// OK: Correcto
public sealed record WorkOrderCreatedEvent(...) : DomainEvent;
public sealed record WorkOrderCompletedEvent(...) : DomainEvent;

// MAL: Incorrecto — presente / imperativo
public sealed record WorkOrderCreate(...) : DomainEvent;
public sealed record CreateWorkOrderEvent(...) : DomainEvent;
```

### 6.3 Comandos
- **Formato:** `{VerbImperativo}{Sustantivo}Command`

```csharp
public sealed record CreateWorkOrderCommand(...) : IRequest<Result<WorkOrderId>>;
public sealed record CompleteWorkOrderCommand(...) : IRequest<Result>;
```

### 6.4 Queries
- **Formato:** `Get{Sustantivo}By{Criterio}Query` o `List{Sustantivos}Query`

```csharp
public sealed record GetWorkOrderByIdQuery(WorkOrderId Id) : IRequest<Result<WorkOrderDto>>;
public sealed record ListOpenWorkOrdersQuery(CustomerId Id) : IRequest<Result<IReadOnlyList<WorkOrderSummaryDto>>>;
```

### 6.5 Errores de Dominio
- **Preferir `Result<T>` sobre excepciones** para errores de negocio.
- Códigos de error: `{dominio}.{entidad}.{slug_error}` — minúsculas, separados por punto.

```csharp
// OK: Preferido
public static readonly DomainError WorkOrderNotFound =
    new("orders.work-order.not-found", "La orden de trabajo no existe.");

// MAL: Evitar — error de negocio como excepción
throw new WorkOrderNotFoundException();
```

---

## 7. Reglas API / OpenAPI 3.1

| Regla | Convención | Ejemplo |
| :--- | :--- | :--- |
| Segmentos de recurso | kebab-case, sustantivo plural | `/work-orders`, `/order-items` |
| Parámetros de ruta | kebab-case | `/work-orders/{work-order-id}` |
| Acciones de dominio | Sufijo verbal después del recurso | `/work-orders/{id}/complete` |
| Versionado | Prefijo URL `/v{N}` | `/v1/work-orders` |
| Parámetros de consulta | camelCase | `?pageSize=20&sortBy=createdAt` |
| operationId | camelCase, frase verbal | `createWorkOrder`, `getWorkOrderById` |
| Propiedades JSON | camelCase | `"workOrderId"`, `"referenceNumber"` |
| Fechas/horas | ISO 8601 | `"2026-05-15T14:30:00Z"` |

---

## 8. Eventos — CloudEvents 1.0

### Patrón de nomenclatura del tipo de evento

```
{organización-dominio}.{contexto-delimitado}.{entidad}.{verbo-participio-pasado}
```

```json
{
  "specversion": "1.0",
  "type": "acme.orders.work-order.created",
  "source": "/services/orders-api/v1",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "time": "2026-05-15T14:30:00Z",
  "datacontenttype": "application/json",
  "subject": "work-orders/WO-2026-00123",
  "data": {
    "workOrderId": "...",
    "referenceNumber": "WO-2026-00123",
    "status": "Draft"
  }
}
```

**Nomenclatura prohibida:**
```
MAL:  UserCreated           (sin prefijo de org/contexto)
MAL:  user_created          (snake_case — viola CloudEvents)
MAL:  USER_CREATED          (UPPER_SNAKE — ilegible en logs)
MAL:  acme.orders.CreateUser (tiempo presente)
OK   acme.identity.user.registered
```

---

## 9. Data Warehouse y Analítica

### 9.1 Prefijos por capa (Kimball)

| Capa | Prefijo | Propósito |
| :--- | :--- | :--- |
| Staging | `stg_` | Datos brutos ingestados |
| Intermedio | `int_` | Datos unidos y limpiados |
| Tabla de hechos | `fct_` | Mediciones de procesos de negocio |
| Tabla de dimensiones | `dim_` | Atributos descriptivos |
| Tabla puente | `brd_` | Dimensiones muchos-a-muchos |
| Agregado / mart | `agg_` | Pre-agregado para consumo |

### 9.2 Convenciones de columna

| Patrón | Convención | Ejemplo |
| :--- | :--- | :--- |
| Clave sustituta | `{tabla}_key` | `work_order_key` |
| Clave de negocio | `{entidad}_{id}_bk` | `work_order_reference_bk` |
| FK a dimensión | `{dim_sin_prefijo}_key` | `customer_key` |
| Clave de fecha | `{contexto}_date_key` | `created_date_key` |
| Medidas | snake_case + unidad si es ambigua | `total_cost_usd`, `duration_seconds` |
| Flags booleanos | `is_{condición}` o `has_{condición}` | `is_late`, `has_penalty` |
| Marcas de tiempo | `{evento}_at` | `created_at`, `ingested_at` |
| Metadatos ETL | `etl_{atributo}` | `etl_batch_id`, `etl_source_system` |

---

## 10. Tabla de Mapeo Completa

| Lenguaje Ubicuo | C# | Java | TypeScript | Python | URL REST | JSON | Tabla SQL | Columna SQL | Tipo de Evento | DW Hechos |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Work Order | `WorkOrder` | `WorkOrder` | `WorkOrder` | `WorkOrder` | `/work-orders` | `workOrderId` | `work_orders` | `work_order_id` | `*.work-order.created` | `fct_work_orders` |
| Order Item | `OrderItem` | `OrderItem` | `OrderItem` | `OrderItem` | `/order-items` | `orderItemId` | `order_items` | `order_item_id` | `*.order-item.added` | `fct_order_items` |
| Customer | `Customer` | `Customer` | `Customer` | `Customer` | `/customers` | `customerId` | `customers` | `customer_id` | `*.customer.registered` | `dim_customers` |
| Created At | `CreatedAt` | `createdAt` | `createdAt` | `created_at` | `createdAt` (param) | `createdAt` | — | `created_at` | `time` (CloudEvents) | `created_date_key` |
| Total Cost | `TotalCost` (Money VO) | `totalCost` | `totalCost` | `total_cost` | — | `totalCost.amount` | — | `total_cost_usd` | `data.totalCost` | `total_cost_usd` |

---

## 11. Herramientas de Validación

### 11.1 Por Lenguaje

| Lenguaje | Formateador | Linter | Analizador Estático |
| :--- | :--- | :--- | :--- |
| C# | `dotnet format` | Roslyn + `StyleCop.Analyzers` | SonarQube |
| Java | Google Java Format | Checkstyle (config Google) | SonarQube, SpotBugs |
| TypeScript | Prettier | ESLint (`@typescript-eslint`, `eslint-plugin-sonarjs`) | SonarQube |
| Python | Black + isort | Flake8 + pylint | SonarQube |
| SQL | `sqlfluff` | `sqlfluff lint` | `sqlfluff fix` |

### 11.2 Cumplimiento de Límites Arquitectónicos

| Lenguaje | Herramienta | Regla |
| :--- | :--- | :--- |
| C# | ArchUnitNET | Capa Domain no puede referenciar Infrastructure |
| Java | ArchUnit | `noClasses().that()...resideInPackage("..domain..")` |
| TypeScript | `eslint-plugin-boundaries` | `domain` no puede importar de `infrastructure` |
| Python | `import-linter` | Contratos en `.importlinter` |

### 11.3 Linting de API y Eventos

| Herramienta | Qué valida |
| :--- | :--- |
| `spectral` (Stoplight) | OpenAPI 3.1 — formato operationId, paths en kebab-case |
| `sqlfluff` | Sintaxis SQL, convenciones de mayúsculas, alias explícitos |
| CloudEvents SDK | Validación del schema del envelope del evento |

### 11.4 Quality Gates de SonarQube

| Métrica | Umbral |
| :--- | :--- |
| Cobertura (código nuevo) | ≥ 80% |
| Líneas duplicadas (código nuevo) | ≤ 3% |
| Rating de Mantenibilidad (código nuevo) | A |
| Rating de Confiabilidad (código nuevo) | A |
| Hotspots de seguridad revisados | 100% |
| Complejidad cognitiva por método | ≤ 15 |
| Violaciones de convención de nomenclatura | 0 |

---

## 12. Política de Excepciones

Una excepción a las reglas de nomenclatura puede concederse **solo** bajo las siguientes condiciones:

1. **Contrato externo inamovible.** Un sistema de terceros exige un formato de nomenclatura específico. La excepción debe aislarse en el adaptador / capa anti-corrupción.
2. **Requisito regulatorio.** Un ente regulador exige un nombre de campo específico en un formato de reporte. Solo el transformador de salida es excepcionado.
3. **Migración de sistema legado (con fecha límite).** Durante una fase de migración, los nombres legados pueden coexistir. La excepción debe tener una fecha de vencimiento no superior a 6 meses.

**Las excepciones NO aplican para:**
- Código nuevo (greenfield)
- Comunicación API-a-API interna
- Nombres de la capa de dominio (el lenguaje ubicuo no es negociable)

---

## 13. Definición de Terminado (DoD)

Un artefacto de código está **Terminado** desde una perspectiva de nomenclatura cuando **todos** los siguientes puntos pasan:

```
[ ] Todos los nombres siguen el glosario de lenguaje ubicuo del contexto delimitado
[ ] Convenciones de capitalización por lenguaje aplicadas (0 violaciones de linter)
[ ] Sin abreviaciones (excepto acrónimos aprobados: ID, URL, HTTP, API, DTO, ORM, JWT, SQL)
[ ] Objetos SQL siguen reglas de esquema/tabla/columna/restricción
[ ] OpenAPI: operationId en camelCase; rutas en kebab-case; propiedades JSON en camelCase
[ ] CloudEvents: type sigue el patrón {org}.{contexto}.{entidad}.{tiempo-pasado}
[ ] Sin magic strings con nombres de campo (usar constantes o nameof())
[ ] Gate de SonarQube pasa (0 violaciones de nomenclatura, mantenibilidad A)
[ ] Descripción de PR referencia el término del lenguaje ubicuo del glosario del contexto
[ ] sqlfluff lint retorna 0 violaciones en todos los scripts de migración
[ ] spectral lint retorna 0 errores en los specs OpenAPI afectados
```

---

## 14. Ejemplos Correctos vs Incorrectos

### 14.1 C# — Aggregate

```csharp
// CORRECTO
public sealed class WorkOrder : AggregateRoot<WorkOrderId>
{
    public WorkOrderId Id { get; private init; }
    public ReferenceNumber ReferenceNumber { get; private set; }
    public WorkOrderStatus Status { get; private set; }

    public static WorkOrder Create(CustomerId customerId, string referenceNumber)
    {
        var order = new WorkOrder { /* ... */ };
        order.Raise(new WorkOrderCreatedEvent(order.Id, customerId));
        return order;
    }
}

// INCORRECTO
public class WrkOrdAggregat  // abreviación + sufijo
{
    public int Id { get; set; }      // ID entero, sin tipo fuerte
    public string stat { get; set; }  // minúsculas, abreviado
}
```

### 14.2 SQL — Tabla y restricciones

```sql
-- OK CORRECTO
CREATE TABLE orders.work_orders (
    id               UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    reference_number VARCHAR(50)      NOT NULL,
    customer_id      UNIQUEIDENTIFIER NOT NULL,
    status           VARCHAR(30)      NOT NULL DEFAULT 'Draft',
    created_at       DATETIMEOFFSET   NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by       NVARCHAR(256)    NOT NULL,
    CONSTRAINT pk_work_orders            PRIMARY KEY (id),
    CONSTRAINT uq_work_orders_ref_number UNIQUE (reference_number),
    CONSTRAINT ck_work_orders_status     CHECK (status IN ('Draft','Confirmed','InProgress','Completed','Cancelled')),
    CONSTRAINT fk_work_orders_customers  FOREIGN KEY (customer_id) REFERENCES customers.customers(id)
);
CREATE INDEX ix_work_orders_customer_status ON orders.work_orders (customer_id, status);

-- MAL: INCORRECTO
CREATE TABLE tbl_WrkOrd (
    WrkOrdID INT IDENTITY,
    CustID   INT,
    Stat     VARCHAR(1),
    dt       DATETIME
);
```

### 14.3 CloudEvents

```json
// CORRECTO
{
  "type": "acme.orders.work-order.created",
  "time": "2026-05-15T14:30:00Z",
  "data": { "workOrderId": "...", "referenceNumber": "WO-2026-00123" }
}

// INCORRECTO
{
  "type": "WorkOrderCreated",
  "timestamp": "15-05-2026",
  "payload": { "work_order_id": "...", "ref": "WO-2026-00123" }
}
```

---

## 15. Consecuencias

### Positivas

- **Mantenibilidad (ISO/IEC 25010).** La nomenclatura consistente reduce la carga cognitiva y acelera la incorporación de nuevos integrantes.
- **Confiabilidad de integración.** Un nombre de concepto único previene bugs de mapeo de datos entre API, base de datos y consumidores de eventos.
- **Cumplimiento automatizado.** Todas las reglas son verificables por herramientas existentes.
- **Alineación con DDD.** El lenguaje ubicuo como fuente de nombres elimina la "capa de traducción" entre negocio e ingeniería.

### Negativas

- **Costo de migración.** Las bases de código existentes no conformes requieren refactorización por fases.
- **Curva de aprendizaje.** Los equipos que cambian de lenguaje deben internalizar las reglas de renderizado por capa.
- **Los linters pueden ralentizar los PRs iniciales.** Inversión en plugins de IDE reduce la fricción.

---

## 16. Referencias

- [Directrices de Nomenclatura de Microsoft .NET](https://learn.microsoft.com/es-es/dotnet/standard/design-guidelines/naming-guidelines)
- [Guía de Estilo de Google Java](https://google.github.io/styleguide/javaguide.html)
- [Guía de Estilo TypeScript de Google](https://google.github.io/styleguide/tsguide.html)
- [PEP 8 — Guía de Estilo de Python](https://peps.python.org/pep-0008/)
- [Especificación CloudEvents 1.0](https://cloudevents.io)
- [Especificación OpenAPI 3.1](https://spec.openapis.org/oas/v3.1.0)
- [ISO/IEC 11179 — Registros de Metadatos](https://www.iso.org/standard/60525.html)
- [ISO/IEC 25010 — Calidad de Sistemas y Software](https://www.iso.org/standard/35733.html)
- [Spectral — Linter OpenAPI](https://stoplight.io/open-source/spectral)
- [sqlfluff — Linter SQL](https://docs.sqlfluff.com)
- [ADR-0049 — Semántica y Nomenclatura Clean Code](./0049-naming-semantics-clean-code-policy.md) ← alcance superado
- [ADR-0048 — Taxonomía Empresarial y Layout de Referencia](./0048-enterprise-taxonomy-reference-layout.md)
- [Versión en Inglés](../../adrs/core/0056-enterprise-naming-design-conventions.md)

---

## Registro de Excepciones

| ID | Fecha | Solicitante | Contexto | Regla Excepcionada | Justificación | Fecha Vencimiento | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| — | — | — | — | — | — | — | — |

---

[Volver al Índice de ADRs](./README.es.md)
