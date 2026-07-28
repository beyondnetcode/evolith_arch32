# ADR-0056: Convenciones corporativas de nomenclatura y diseño - multilenguaje, multiplataforma

## Estado

**Estado:** Aceptado — extiende y amplía el alcance de [ADR-0049 (Semántica de Nombres y Política de Código Limpio)](./0049-naming-semantics-clean-code-policy.es.md) a todas las capas del ecosistema enterprise (código, API, base de datos, eventos, data warehouse, patrones tácticos DDD).

## Fecha

2026-05-15

## Autores

Principal Software Architect

---

## 1. Contexto

Esta organización opera una arquitectura políglota y multiplataforma que abarca:

- **Runtimes:** C# / .NET 8, Java 21, TypeScript / Node.js 20, Python 3.12
- **APIs:** REST (OpenAPI 3.1), gRPC, GraphQL (solo en satélites)
- **Bases de datos:** SQL Server 2022, PostgreSQL 16, almacenes analíticos (BigQuery / Synapse)
- **Mensajería:** eventos de dominio (CloudEvents 1.0), comandos y eventos de integración vía RabbitMQ / Dapr pub/sub
- **Paradigma de diseño:** Domain-Driven Design (DDD), estratégico y táctico
- **Estándar de calidad:** ISO/IEC 25010 (mantenibilidad, confiabilidad, portabilidad)
- **Estándar de metadatos:** ISO/IEC 11179 (nomenclatura de elementos de datos)

La inconsistencia de nombres es la causa que con más frecuencia se cita como fuente de fricción al incorporar gente, de errores de integración y de malas configuraciones de seguridad (por ejemplo, nombres de campo desalineados entre JSON y base de datos que terminan filtrando PII). Un estándar corporativo vinculante elimina la ambigüedad y habilita la verificación automatizada.

---

## 2. Planteamiento del problema

La ausencia de una política unificada de nomenclatura entre lenguajes, capas y plataformas produce:

| Síntoma | Impacto |
| :--- | :--- |
| `userId` en la API, `user_id` en la base de datos, `UserId` en el código: tres nombres para un mismo concepto | Errores de integración, sobrecoste de mapeo manual |
| `GetUser`, `FetchUser`, `RetrieveUser`: sinónimos para la misma operación | Documentación inconsistente, sobrecarga cognitiva |
| Tipos de evento como `user.created`, `UserCreated`, `USER_CREATED`, todos en producción | Imposible construir consumidores de eventos fiables |
| Tabla `tbl_usr` frente a `users` frente a `User`, según el equipo | Complejidad de migración, errores en las consultas |
| Abreviaturas: `prd`, `cust`, `auth_tkn` | Ambigüedad, menor capacidad de búsqueda |

---

## 3. Decisión

Adoptar un **único estándar de nomenclatura, vinculante y de verificación automatizada**, con los siguientes pilares:

1. **El lenguaje ubicuo como fuente de verdad.** Cada nombre en el código, la API, la base de datos y los eventos nace del glosario del dominio, no de preferencias de implementación.
2. **Convenciones nativas del ecosistema por capa.** Cada lenguaje y plataforma sigue el estándar de su comunidad (PEP 8, Microsoft C# Guidelines, Google Java Style, etc.) con extensiones propias de DDD.
3. **Un concepto, varias representaciones.** Un concepto de dominio tiene exactamente un nombre canónico en el lenguaje ubicuo, que se representa según las reglas de cada capa.
4. **Automatización antes que documentación.** Toda regla debe poder comprobarse con un linter, un analizador o una compuerta de CI. Las reglas que no se pueden automatizar quedan obsoletas.

### 3.1 Regla de derivación del nombre canónico

```
Término del lenguaje ubicuo (sintagma nominal/verbal en inglés)
    │
    |- C#        -> clase PascalCase / miembro camelCase
    |- Java      -> clase PascalCase / miembro camelCase
    |- TypeScript -> clase PascalCase / miembro camelCase
    |- Python    -> clase PascalCase / miembro snake_case
    |- URL REST  -> segmento de ruta kebab-case
    |- Cuerpo JSON -> propiedad camelCase
    |- Tabla SQL -> sustantivo en plural snake_case
    |- Columna SQL -> snake_case
    `- Tipo de evento -> {domain}.{entity}.{past-participle} (separado por puntos, en minúsculas)
```

**Ejemplo - concepto: "Work Order"**

| Capa | Representación |
| :--- | :--- |
| Lenguaje ubicuo | Work Order |
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

## 4. Alternativas consideradas

### 4.1 snake_case en todas partes (enfoque centrado en Python)
**Rechazada.** Vulnera los idiomas de C# y de Java. Fuerza código no idiomático en lenguajes fuertemente tipados, cuyos compiladores e IDE dan por hecho que los tipos van en PascalCase. La mantenibilidad de la ISO/IEC 25010 exige alinearse con la convención de cada ecosistema.

### 4.2 camelCase en todas partes (enfoque centrado en JavaScript)
**Rechazada.** `workOrderId` como nombre de columna SQL no es idiomático, rompe las convenciones de SQL Server y de PostgreSQL, y reduce la legibilidad del DDL. El herramental a nivel de base de datos (pg_dump, migraciones de esquema, utilidades de DBA) espera `snake_case`.

### 4.3 Autonomía por equipo con un glosario compartido
**Rechazada.** Crea costuras de integración. Cuando el equipo A llama `customerId` al campo de la API y el equipo B llama `customer_code` a la columna de la base de datos, los fallos de sincronización provocan errores de datos caros de rastrear.

### 4.4 Elegida: nativa del ecosistema por capa, concepto canónico desde el lenguaje ubicuo
**Adoptada.** Respeta el estándar de cada comunidad. Se automatiza con linters. El único nombre canónico del lenguaje ubicuo actúa como ancla estable, y cada capa lo representa según sus propias reglas.

---

## 5. Reglas por lenguaje

### 5.1 C# / .NET 8

Sigue las [Microsoft .NET Naming Guidelines](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/naming-guidelines) con extensiones de DDD.

| Constructo | Convención | Ejemplo |
| :--- | :--- | :--- |
| Namespace | PascalCase, alineado al dominio | `Acme.Orders.Domain.Aggregates` |
| Clase / Struct / Record | PascalCase | `WorkOrder`, `Money` |
| Interfaz | prefijo `I` + PascalCase | `IWorkOrderRepository` |
| Enum | PascalCase; miembros en PascalCase | `OrderStatus.Confirmed` |
| Método | PascalCase (sintagma verbal) | `CalculateTotalCost()` |
| Propiedad | PascalCase | `WorkOrderId` |
| Campo privado | prefijo `_` + camelCase | `_workOrderId` |
| Variable local | camelCase | `workOrderId` |
| Constante | PascalCase (no UPPER_SNAKE) | `MaxRetryCount` |
| Parámetro genérico | prefijo `T` + sustantivo PascalCase | `TEntity`, `TResult` |
| Método asíncrono | sufijo `Async` | `GetWorkOrderAsync()` |
| Clase de prueba | `{Subject}Tests` | `WorkOrderTests` |
| Método de prueba | `{Method}_When{Condition}_Should{Outcome}` | `Complete_WhenAlreadyClosed_ShouldReturnFailure` |

**Convenciones DDD en C#:**

```csharp
// Raíz de agregado
public sealed class WorkOrder : AggregateRoot<WorkOrderId> { }

// Objeto de valor (record inmutable)
public sealed record Money(decimal Amount, Currency Currency);

// Evento de dominio (en pasado)
public sealed record WorkOrderCreatedEvent(WorkOrderId WorkOrderId, ...) : DomainEvent;

// Comando (en imperativo)
public sealed record CreateWorkOrderCommand(...) : IRequest<Result<WorkOrderId>>;

// Consulta (sintagma interrogativo)
public sealed record GetWorkOrderByIdQuery(WorkOrderId Id) : IRequest<Result<WorkOrderDto>>;

// Puerto de repositorio
public interface IWorkOrderRepository { }

// Servicio de dominio (operación sin estado que no pertenece a un solo agregado)
public sealed class WorkOrderPricingService { }

// Especificación
public sealed class OpenWorkOrdersSpecification : Specification<WorkOrder> { }

// Política
public sealed class LateDeliveryPenaltyPolicy { }

// Excepción (error de dominio; úsese con moderación, se prefiere Result)
public sealed class WorkOrderNotFoundException : DomainException { }
```

---

### 5.2 Java 21

Sigue la [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html) con extensiones de DDD.

| Constructo | Convención | Ejemplo |
| :--- | :--- | :--- |
| Paquete | minúsculas, alineado al dominio, separado por puntos | `com.acme.orders.domain.aggregates` |
| Clase / Interfaz / Enum | PascalCase | `WorkOrder`, `IWorkOrderRepository` -> `WorkOrderRepository` (sin prefijo `I`) |
| Método | camelCase (sintagma verbal) | `calculateTotalCost()` |
| Campo | camelCase | `workOrderId` |
| Constante | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Parámetro genérico | una letra mayúscula o un sustantivo descriptivo | `T`, `TEntity` |
| Anotación | PascalCase | `@WorkOrderId` |
| Clase de prueba | `{Subject}Test` | `WorkOrderTest` |
| Método de prueba | camelCase, descriptivo | `completeShouldFailWhenAlreadyClosed()` |

> **Diferencia de Java respecto de C#:** Java usa UPPER_SNAKE_CASE para las constantes (`static final`). Los nombres de interfaz NO llevan el prefijo `I`: se usa `WorkOrderRepository` como nombre de la interfaz y `JpaWorkOrderRepository` o `SqlWorkOrderRepository` para la implementación.

---

### 5.3 TypeScript / JavaScript

Sigue la [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) con extensiones de DDD.

| Constructo | Convención | Ejemplo |
| :--- | :--- | :--- |
| Nombre de archivo | kebab-case | `work-order.aggregate.ts` |
| Clase | PascalCase | `WorkOrder` |
| Interfaz | PascalCase (sin prefijo `I`) | `WorkOrderRepository` |
| Alias de tipo | PascalCase | `WorkOrderId` |
| Enum | PascalCase; miembros en PascalCase | `OrderStatus.Confirmed` |
| Función / Método | camelCase | `calculateTotalCost()` |
| Variable / Propiedad | camelCase | `workOrderId` |
| Miembro privado | `#` (privado nativo) o prefijo `_` | `#workOrderId` |
| Constante (de módulo) | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Componente React | PascalCase | `WorkOrderCard` |
| Hook de React | prefijo `use` + camelCase | `useWorkOrderList()` |
| Archivo de prueba | `{subject}.spec.ts` | `work-order.spec.ts` |

**Convenciones de sufijo de archivo (NestJS / arquitectura por capas):**

| Sufijo | Propósito |
| :--- | :--- |
| `.aggregate.ts` | Raíz de agregado DDD |
| `.entity.ts` | Entidad DDD |
| `.value-object.ts` | Objeto de valor |
| `.repository.ts` | Puerto (interfaz) |
| `.repository.impl.ts` | Adaptador (implementación) |
| `.use-case.ts` | Caso de uso de aplicación |
| `.command.ts` | Objeto comando |
| `.query.ts` | Objeto consulta |
| `.event.ts` | Evento de dominio |
| `.dto.ts` | Objeto de transferencia de datos |
| `.controller.ts` | Controlador HTTP |
| `.module.ts` | Módulo NestJS |
| `.spec.ts` | Prueba unitaria |
| `.e2e-spec.ts` | Prueba de extremo a extremo |

---

### 5.4 Python 3.12

Sigue [PEP 8](https://peps.python.org/pep-0008/) con extensiones de DDD.

| Constructo | Convención | Ejemplo |
| :--- | :--- | :--- |
| Módulo / archivo | snake_case | `work_order_repository.py` |
| Paquete | snake_case | `orders/domain/aggregates/` |
| Clase | PascalCase | `WorkOrder` |
| Clase de excepción | PascalCase + sufijo `Error` | `WorkOrderNotFoundError` |
| Función / Método | snake_case (sintagma verbal) | `calculate_total_cost()` |
| Variable / Atributo | snake_case | `work_order_id` |
| Atributo privado | prefijo `_` + snake_case | `_work_order_id` |
| Constante | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Alias de tipo | PascalCase | `WorkOrderId = NewType('WorkOrderId', UUID)` |
| Protocolo (interfaz) | PascalCase | `WorkOrderRepository` (clase base abstracta o Protocol) |
| Dataclass (objeto de valor) | PascalCase, `frozen=True` | `@dataclass(frozen=True) class Money:` |
| Archivo de prueba | `test_{subject}.py` | `test_work_order.py` |
| Función de prueba | `test_{method}_when_{condition}_should_{outcome}` | `test_complete_when_closed_should_raise` |

---

### 5.5 SQL (SQL Server 2022 y PostgreSQL 16)

Sigue los principios de nomenclatura de metadatos de [ISO/IEC 11179](https://www.iso.org/standard/60525.html) con convenciones relacionales.

| Constructo | Convención | Ejemplo |
| :--- | :--- | :--- |
| Esquema | snake_case, alineado al dominio | `orders`, `billing`, `audit` |
| Tabla | snake_case, **sustantivo en plural** | `work_orders`, `order_items` |
| Columna | snake_case | `work_order_id`, `created_at` |
| Clave primaria | `id` (subrogada) o `{entity}_id` (natural) | `id`, `work_order_id` |
| Columna de clave foránea | `{referenced_table_singular}_id` | `customer_id`, `product_id` |
| Restricción FK | `fk_{table}_{referenced_table}` | `fk_order_items_work_orders` |
| Restricción PK | `pk_{table}` | `pk_work_orders` |
| Restricción de unicidad | `uq_{table}_{columns}` | `uq_work_orders_reference_number` |
| Restricción CHECK | `ck_{table}_{rule}` | `ck_work_orders_status_valid` |
| Índice | `ix_{table}_{columns}` | `ix_work_orders_customer_id_status` |
| Índice único | `uix_{table}_{columns}` | `uix_work_orders_reference_number` |
| Vista | `v_{name}` | `v_open_work_orders` |
| Vista materializada | `mv_{name}` | `mv_work_order_summary` |
| Procedimiento almacenado | `sp_{verb}_{noun}` | `sp_complete_work_order` |
| Función | `fn_{verb}_{noun}` | `fn_calculate_order_total` |
| Disparador | `tr_{table}_{event}` | `tr_work_orders_after_update` |
| Archivo de migración | `{timestamp}_{description}.sql` | `20260515_143000_add_work_orders_table.sql` |
| Columna de auditoría (obligatoria) | `created_at`, `updated_at`, `created_by`, `updated_by` | Todas las tablas deben incluirlas |

**Patrones SQL prohibidos:**

```sql
-- MAL: prefijar los nombres de tabla
CREATE TABLE tbl_work_orders (...);

-- MAL: abreviar los nombres de columna
ALTER TABLE work_orders ADD COLUMN wrkord_stat VARCHAR(20);

-- MAL: usar palabras reservadas como nombres
CREATE TABLE order (...);  -- 'order' es una palabra reservada de SQL

-- MAL: clave primaria poco descriptiva
CREATE TABLE work_orders (id INT PRIMARY KEY, ...);  -- ambigua en los joins

-- BIEN: correcto
CREATE TABLE work_orders (
    id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    reference_number VARCHAR(50)      NOT NULL,
    customer_id     UNIQUEIDENTIFIER NOT NULL,
    status          VARCHAR(30)      NOT NULL,
    created_at      DATETIMEOFFSET   NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at      DATETIMEOFFSET   NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by      NVARCHAR(256)    NOT NULL,
    updated_by      NVARCHAR(256)    NOT NULL,
    CONSTRAINT pk_work_orders PRIMARY KEY (id),
    CONSTRAINT uq_work_orders_reference_number UNIQUE (reference_number),
    CONSTRAINT ck_work_orders_status_valid CHECK (status IN ('Draft','Confirmed','InProgress','Completed','Cancelled')),
    CONSTRAINT fk_work_orders_customers FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX ix_work_orders_customer_id_status ON work_orders (customer_id, status);
```

---

## 6. Reglas de nomenclatura DDD

Todos los nombres deben nacer del **glosario del lenguaje ubicuo del dominio**, definido por contexto acotado. Los nombres que no figuren en el glosario exigen actualizarlo antes de poder escribir el código.

### 6.1 Agregados

- Sintagma nominal del lenguaje ubicuo.
- PascalCase en todos los lenguajes orientados a objetos; snake_case en Python.
- Sin sufijos técnicos (`Aggregate`, `Root`; **no** `WorkOrderAggregate`).

```csharp
// BIEN: correcto — el concepto ES el nombre
public sealed class WorkOrder : AggregateRoot<WorkOrderId> { }

// MAL: incorrecto — sufijo redundante
public sealed class WorkOrderAggregate : AggregateRoot<WorkOrderId> { }
```

### 6.2 Entidades (que no son raíz)

- Sintagma nominal. Sin sufijo.
- Se distinguen de los objetos de valor: las entidades tienen identidad (`Id`); los objetos de valor no.

```csharp
public sealed class OrderItem { }         // BIEN: entidad — tiene OrderItemId
public sealed record Money(decimal Amount, Currency Currency); // BIEN: objeto de valor — sin identidad
```

### 6.3 Objetos de valor

- Sintagma nominal, o un sintagma nominal que describa una medida o un concepto.
- **Inmutables**: se usa `record` (C#), `@dataclass(frozen=True)` (Python) o una clase `readonly` (TypeScript).
- Nunca exponen setters.

```csharp
public sealed record EmailAddress(string Value)
{
    public static Result<EmailAddress> Create(string raw) { ... }
}
```

### 6.4 Repositorios (puerto)

- `I` + nombre de la entidad o del agregado + `Repository` (C#, y TypeScript cuando se sigue la convención de prefijo).
- Java y Python: nombre de la entidad + `Repository` (sin prefijo).

```csharp
// C#
public interface IWorkOrderRepository { }
public sealed class SqlWorkOrderRepository : IWorkOrderRepository { } // adaptador

// Java
public interface WorkOrderRepository { }
public class JpaWorkOrderRepository implements WorkOrderRepository { }

// TypeScript
export interface WorkOrderRepository { }  // sin prefijo I en TS
export class TypeOrmWorkOrderRepository implements WorkOrderRepository { }
```

### 6.5 Servicios de dominio

- Sintagma nominal terminado en `Service` **solo cuando** la operación no pertenece a ningún agregado concreto.
- Sin estado.

```csharp
public sealed class OrderPricingService { }          // BIEN: cálculo entre agregados
public sealed class WorkOrderCompletionService { }   // MAL: corresponde a WorkOrder.Complete()
```

### 6.6 Eventos de Dominio

- **Nomenclatura:** `{Aggregate}{PastParticiple}`, siempre en pasado; el evento ya ocurrió.
- Se añade el sufijo `Event` en los lenguajes fuertemente tipados, para distinguirlo de los comandos.
- NO se añade `Event` en el campo `type` de CloudEvents.

```csharp
// C# — nombre de clase
public sealed record WorkOrderCreatedEvent(...) : DomainEvent;
public sealed record WorkOrderCompletedEvent(...) : DomainEvent;
public sealed record OrderItemRemovedEvent(...) : DomainEvent;

// MAL: incorrecto — en presente
public sealed record WorkOrderCreate(...) : DomainEvent;
// MAL: incorrecto — en imperativo
public sealed record CreateWorkOrderEvent(...) : DomainEvent;
```

### 6.7 Comandos

- **Nomenclatura:** `{verbo imperativo}{Sustantivo}Command`, en modo imperativo; expresa la intención.
- Inmutables (record/dataclass/readonly).

```csharp
public sealed record CreateWorkOrderCommand(string CustomerId, string Description) : IRequest<Result<WorkOrderId>>;
public sealed record CompleteWorkOrderCommand(WorkOrderId Id) : IRequest<Result>;
public sealed record CancelWorkOrderCommand(WorkOrderId Id, string Reason) : IRequest<Result>;
```

### 6.8 Consultas

- **Nomenclatura:** `Get{Noun}By{Criteria}Query` o `List{Nouns}Query`.
- Devuelven un modelo de lectura o un DTO, nunca un agregado de dominio.

```csharp
public sealed record GetWorkOrderByIdQuery(WorkOrderId Id) : IRequest<Result<WorkOrderDto>>;
public sealed record ListOpenWorkOrdersQuery(CustomerId CustomerId) : IRequest<Result<IReadOnlyList<WorkOrderSummaryDto>>>;
```

### 6.9 Políticas

- Sintagma nominal que expresa una regla de negocio. Sufijo `Policy`.

```csharp
public sealed class LateDeliveryPenaltyPolicy { }
public sealed class DiscountEligibilityPolicy { }
```

### 6.10 Especificaciones

- Sintagma nominal que describe el criterio de selección. Sufijo `Specification` o `Spec`.

```csharp
public sealed class OverdueWorkOrdersSpecification : Specification<WorkOrder> { }
public sealed class CustomerHasActiveOrdersSpec : Specification<Customer> { }
```

### 6.11 Excepciones / errores de dominio

- **Se prefiere `Result<T>` a las excepciones para los errores de negocio.**
- Cuando se usan excepciones (fallos de infraestructura), llevan el sufijo `Exception`.
- Los códigos de error de dominio siguen `{domain}.{entity}.{error_slug}`: en minúsculas y separados por puntos.

```csharp
// Excepción de infraestructura — aceptable
public sealed class DatabaseConnectionException : InfrastructureException { }

// Código de error de dominio — el enfoque preferido
public static readonly DomainError WorkOrderNotFound =
    new("orders.work-order.not-found", "Work order does not exist.");

// MAL: incorrecto — error de negocio como excepción
throw new WorkOrderNotFoundException();
```

---

## 7. Reglas de API / OpenAPI 3.1

### 7.1 Rutas de URL

| Regla | Convención | Ejemplo |
| :--- | :--- | :--- |
| Segmentos de recurso | **kebab-case, sustantivo en plural** | `/work-orders`, `/order-items` |
| Parámetros de ruta | **kebab-case** | `/work-orders/{work-order-id}` |
| Subrecursos | Anidados hasta 2 niveles como máximo | `/work-orders/{id}/order-items` |
| Acciones (no CRUD) | Verbo como sufijo después del recurso | `/work-orders/{id}/complete`, `/work-orders/{id}/cancel` |
| Versionado de la API | Prefijo de URL `/v{N}` | `/v1/work-orders` |
| Parámetros de consulta | **camelCase** | `?pageSize=20&sortBy=createdAt` |

### 7.2 Métodos HTTP y semántica

| Intención | Método | Patrón de URL |
| :--- | :--- | :--- |
| Crear recurso | POST | `/v1/work-orders` |
| Leer uno | GET | `/v1/work-orders/{work-order-id}` |
| Leer colección | GET | `/v1/work-orders` |
| Reemplazo completo | PUT | `/v1/work-orders/{work-order-id}` |
| Actualización parcial | PATCH | `/v1/work-orders/{work-order-id}` |
| Borrar | DELETE | `/v1/work-orders/{work-order-id}` |
| Acción de dominio | POST (verbo) | `/v1/work-orders/{id}/complete` |

### 7.3 Propiedades del cuerpo JSON

- **camelCase** en todos los nombres de propiedad JSON.
- ISO 8601 en todos los campos de fecha y hora: `"2026-05-15T14:30:00Z"`.
- Los importes monetarios, como `{ "amount": 1500.00, "currency": "USD" }`.
- Los identificadores, como cadenas (formato UUID): `"workOrderId": "550e8400-e29b-41d4-a716-446655440000"`.

```json
// BIEN: correcto
{
  "workOrderId": "550e8400-e29b-41d4-a716-446655440000",
  "referenceNumber": "WO-2026-00123",
  "customerId": "...",
  "status": "Confirmed",
  "totalCost": { "amount": 1500.00, "currency": "USD" },
  "createdAt": "2026-05-15T14:30:00Z",
  "orderItems": [
    { "orderItemId": "...", "description": "Repair service", "quantity": 2 }
  ]
}

// MAL: incorrecto — snake_case, abreviado, sin objeto de moneda
{
  "work_order_id": "...",
  "ref_num": "WO-2026-00123",
  "total_cost": 1500.00,
  "created": "15/05/2026"
}
```

### 7.4 operationId de OpenAPI

- Sintagma verbal en **camelCase**: `{action}{Resource}`.

```yaml
paths:
  /v1/work-orders:
    get:
      operationId: listWorkOrders       # BIEN
    post:
      operationId: createWorkOrder      # BIEN
  /v1/work-orders/{workOrderId}:
    get:
      operationId: getWorkOrderById     # BIEN
  /v1/work-orders/{workOrderId}/complete:
    post:
      operationId: completeWorkOrder    # BIEN
```

### 7.5 Nombres de esquema de OpenAPI

- PascalCase para los nombres de esquema.
- Sufijo `Request` para los cuerpos de petición, `Response` para los envoltorios de respuesta y `Dto` para los objetos de transferencia dentro de las especificaciones OpenAPI.

```yaml
components:
  schemas:
    CreateWorkOrderRequest:
      type: object
    WorkOrderResponse:
      type: object
    WorkOrderSummaryDto:
      type: object
```

### 7.6 Códigos de estado HTTP - mapeo canónico

| Condición | Estado | Cuándo |
| :--- | :--- | :--- |
| Created | 201 | POST que crea el recurso correctamente |
| OK | 200 | GET, PUT o PATCH con éxito |
| No Content | 204 | DELETE, o PATCH sin cuerpo |
| Bad Request | 400 | Validación o entrada mal formada |
| Unauthorized | 401 | Token ausente o inválido |
| Forbidden | 403 | Autenticado, pero con alcance insuficiente |
| Not Found | 404 | El recurso no existe |
| Conflict | 409 | Duplicado o conflicto de estado |
| Unprocessable | 422 | Violación de una regla de negocio |
| Server Error | 500 | Fallo de infraestructura inesperado |

---

## 8. Eventos - CloudEvents 1.0

Sigue la [especificación CloudEvents 1.0](https://cloudevents.io).

### 8.1 Nomenclatura del tipo de evento

```
{organization-domain}.{bounded-context}.{entity}.{past-participle-verb}
```

| Segmento | Convención | Ejemplo |
| :--- | :--- | :--- |
| organization-domain | minúsculas, DNS invertido o nombre corto de la organización | `acme` |
| bounded-context | minúsculas, kebab-case | `orders`, `billing`, `identity` |
| entity | minúsculas, kebab-case en singular | `work-order`, `order-item` |
| past-participle-verb | minúsculas | `created`, `completed`, `cancelled` |

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
    "customerId": "...",
    "referenceNumber": "WO-2026-00123",
    "status": "Draft"
  }
}
```

### 8.2 Subject del evento

- `{resource-type}/{resource-id}`: el tipo de recurso en kebab-case y el identificador como valor.

### 8.3 Propiedades de los datos del evento

- Las mismas reglas que el cuerpo JSON: **camelCase**, fechas en ISO 8601 y sin abreviaturas.

### 8.4 Nomenclatura de eventos prohibida

```
MAL:  UserCreated            (falta el prefijo de organización y contexto — riesgo de colisión)
MAL:  user_created           (snake_case — vulnera la convención de CloudEvents)
MAL:  USER_CREATED           (UPPER_SNAKE — poco legible en los logs)
MAL:  acme.orders.CreateUser (en presente — el evento ya ocurrió)
BIEN  acme.identity.user.registered
```

---

## 9. Data warehouse y analítica

Sigue el [modelado dimensional de Kimball](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/) con los principios de nomenclatura de metadatos de la ISO/IEC 11179.

### 9.1 Nomenclatura de capas

| Capa | Prefijo | Propósito |
| :--- | :--- | :--- |
| Staging | `stg_` | Datos crudos ingeridos, 1:1 con el origen |
| Intermedia / OBT | `int_` | Unidos, limpios y desnormalizados |
| Tablas de hechos | `fct_` | Mediciones de procesos de negocio |
| Tablas de dimensiones | `dim_` | Atributos descriptivos |
| Tablas puente | `brd_` | Puentes de dimensión de muchos a muchos |
| Agregados / mart | `agg_` o `mart_` | Preagregados para su consumo |
| Calidad de datos | `dq_` | Tablas de validación y de cuarentena |

### 9.2 Nomenclatura de columnas

| Patrón | Convención | Ejemplo |
| :--- | :--- | :--- |
| Clave subrogada | `{table_name}_key` | `work_order_key` |
| Clave natural o de negocio | `{entity}_{identifier}_bk` | `work_order_reference_bk` |
| Clave foránea a una dimensión | `{dim_table_without_dim}_key` | `customer_key`, `status_key` |
| Clave de fecha | `{context}_date_key` | `created_date_key`, `completed_date_key` |
| Medidas | snake_case, con sufijo de unidad cuando sea ambiguo | `total_cost_usd`, `quantity_units`, `duration_seconds` |
| Banderas | `is_{condition}` o `has_{condition}` | `is_late`, `has_penalty`, `is_active` |
| Marcas de tiempo | `{event}_at` | `created_at`, `ingested_at`, `updated_at` |
| Metadatos de ETL | `etl_{attribute}` | `etl_batch_id`, `etl_source_system`, `etl_loaded_at` |

### 9.3 Entrada del catálogo de datos (inspirada en ISO/IEC 11179)

Toda columna analítica debe tener una entrada de catálogo con:

| Atributo | Requerido | Ejemplo |
| :--- | :--- | :--- |
| `element_name` | Sí | `work_order_total_cost_usd` |
| `definition` | Sí | "Suma del coste de todas las líneas de una orden de trabajo, en USD" |
| `data_type` | Sí | `NUMERIC(18,4)` |
| `unit_of_measure` | Cuando aplique | `USD` |
| `allowed_values` | Para enumeraciones | `Draft, Confirmed, InProgress, Completed, Cancelled` |
| `source_system` | Sí | `orders-api` |
| `source_table` | Sí | `orders.work_orders` |
| `source_column` | Sí | `total_cost` |
| `pii_classification` | Sí | `None`, `Sensitive`, `Restricted` |
| `owner_team` | Sí | `operations-domain` |

---

## 10. Tabla de correspondencias completa

| Lenguaje ubicuo | C# | Java | TypeScript | Python | URL REST | JSON | Tabla SQL | Columna SQL | Tipo de evento | Hecho DW |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Work Order | `WorkOrder` | `WorkOrder` | `WorkOrder` | `WorkOrder` | `/work-orders` | `workOrderId` | `work_orders` | `work_order_id` | `*.work-order.created` | `fct_work_orders` |
| Order Item | `OrderItem` | `OrderItem` | `OrderItem` | `OrderItem` | `/order-items` | `orderItemId` | `order_items` | `order_item_id` | `*.order-item.added` | `fct_order_items` |
| Customer | `Customer` | `Customer` | `Customer` | `Customer` | `/customers` | `customerId` | `customers` | `customer_id` | `*.customer.registered` | `dim_customers` |
| Reference Number | `ReferenceNumber` (VO) | `ReferenceNumber` | `ReferenceNumber` | `ReferenceNumber` | `referenceNumber` (consulta) | `referenceNumber` | - | `reference_number` | - | `work_order_reference_bk` |
| Created At | `CreatedAt` (propiedad) | `createdAt` | `createdAt` | `created_at` | `createdAt` (parámetro de consulta) | `createdAt` | - | `created_at` | `time` (campo de CloudEvents) | `created_date_key` |
| Total Cost (USD) | `TotalCost` (VO Money) | `totalCost` | `totalCost` | `total_cost` | - | `totalCost.amount` | - | `total_cost_usd` | data.totalCost | `total_cost_usd` |
| Work Order Status | `WorkOrderStatus` (enum) | `WorkOrderStatus` | `WorkOrderStatus` | `WorkOrderStatus` | `status` (filtro) | `status` | - | `status` | data.status | `dim_work_order_status` |

---

## 11. Herramientas de validación

### 11.1 Por lenguaje

| Lenguaje | Formateador | Linter | Analizador estático |
| :--- | :--- | :--- | :--- |
| C# | `dotnet format` (integrado) | Roslyn Analyzers (`StyleCop.Analyzers`, `SonarAnalyzer.CSharp`) | SonarQube / SonarCloud |
| Java | Google Java Format | Checkstyle (configuración de Google) | SonarQube, SpotBugs |
| TypeScript | Prettier | ESLint (`@typescript-eslint`, `eslint-plugin-sonarjs`) | SonarQube |
| Python | Black + isort | Flake8 + pylint | SonarQube |
| SQL | `sqlfluff` (dialecto: tsql / postgres) | `sqlfluff lint` | `sqlfluff fix` |

### 11.2 Verificación de fronteras arquitectónicas

| Lenguaje | Herramienta | Regla |
| :--- | :--- | :--- |
| C# | `dotnet-architecture-tests` (ArchUnitNET) | La capa de dominio no tiene ninguna referencia NuGet a infraestructura |
| Java | ArchUnit | `noClasses().that().resideInPackage("..domain..").should().dependOnClassesThat().resideInPackage("..infrastructure..")` |
| TypeScript | `eslint-plugin-boundaries` | `domain` no puede importar de `infrastructure` |
| Python | `import-linter` | Contratos definidos en `.importlinter` |

### 11.3 Linting de API y de eventos

| Herramienta | Qué valida |
| :--- | :--- |
| `spectral` (Stoplight) | OpenAPI 3.1: formato del operationId, rutas en kebab-case, campos obligatorios |
| `openapi-generator validate` | Completitud y corrección del esquema |
| CloudEvents SDK (en cualquier lenguaje) | Validación del esquema del sobre del evento |
| `redocly lint` | Lint de OpenAPI y reglas de estilo |

**Ruleset de Spectral recomendado (`.spectral.yaml`):**

```yaml
extends: ["spectral:oas"]
rules:
  operation-operationId: error
  operation-operationId-valid-in-url: error
  path-casing:
    given: "$.paths"
    severity: error
    then:
      function: pattern
      functionOptions:
        match: "^(/v[0-9]+)?(/[a-z][a-z0-9-]*({[a-z][a-z0-9-]*})?)*$"
  property-casing:
    given: "$.components.schemas.*.properties"
    severity: error
    then:
      function: casing
      functionOptions:
        type: camel
```

### 11.4 Linting de SQL (sqlfluff)

Configuración del proyecto en `.sqlfluff`:

```ini
[sqlfluff]
dialect = tsql          # o postgres
templater = raw
max_line_length = 120

[sqlfluff:rules:L010]   # Palabras clave en mayúsculas
capitalisation_policy = upper

[sqlfluff:rules:L014]   # Alias de columna en snake_case
extended_capitalisation_policy = lower

[sqlfluff:rules:L030]   # Nombres de función en mayúsculas
capitalisation_policy = upper

[sqlfluff:rules:aliasing.table]
aliasing = explicit     # Los alias se nombran siempre de forma explícita
```

### 11.5 Compuertas de calidad de SonarQube

| Métrica | Umbral | Se aplica a |
| :--- | :--- | :--- |
| Cobertura (código nuevo) | ≥ 80 % | Todos los lenguajes |
| Líneas duplicadas (código nuevo) | ≤ 3 % | Todos los lenguajes |
| Calificación de mantenibilidad (código nuevo) | A | Todos los lenguajes |
| Calificación de confiabilidad (código nuevo) | A | Todos los lenguajes |
| Hotspots de seguridad revisados | 100 % | Todos los lenguajes |
| Complejidad cognitiva por método | ≤ 15 | Todos los lenguajes |
| Violaciones de convención de nombres | 0 | Verificado con Roslyn / ESLint / Checkstyle / pylint |

### 11.6 Compuertas de pre-commit y de CI

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: dotnet-format
        name: dotnet format
        language: system
        entry: dotnet format --verify-no-changes
        types: [c#]

      - id: prettier
        name: prettier
        language: system
        entry: npx prettier --check .
        types_or: [ts, tsx, json, yaml]

      - id: eslint
        name: eslint
        language: system
        entry: npx eslint --max-warnings 0
        types: [ts]

      - id: black
        name: black
        language: python
        entry: black --check .
        types: [python]

      - id: sqlfluff
        name: sqlfluff
        language: python
        entry: sqlfluff lint
        types: [sql]

      - id: spectral
        name: spectral openapi lint
        language: system
        entry: npx spectral lint docs/openapi.yaml
        pass_filenames: false
```

---

## 12. Política de excepciones

Una excepción de nomenclatura solo puede concederse **si** se cumple alguna de estas condiciones:

1. **Contrato externo cerrado.** Un sistema de terceros impone un formato de nombres concreto (por ejemplo, la API de un proveedor usa JSON en `PascalCase`, o una tabla de sistema de SQL Server usa un nombre de columna no estándar). La excepción debe quedar aislada en la capa de adaptador o anticorrupción.

2. **Requisito regulatorio.** Un organismo regulador impone un nombre de campo concreto en un formato de reporte (por ejemplo, `TaxId` para reportes fiscales). El nombre canónico interno sigue cumpliendo la norma; la excepción alcanza solo al adaptador de transformación de salida.

3. **Migración de un sistema heredado (con plazo).** Durante una fase de migración, los nombres heredados pueden convivir. La excepción debe tener una fecha de caducidad definida y registrada en el log de excepciones del ADR (más abajo), que no supere los 6 meses.

**Formato del log de excepciones** (se añade a la sección `## Log de excepciones` de este ADR):

```markdown
| ID | Fecha | Solicitante | Contexto | Regla exceptuada | Justificación | Fecha de caducidad | Estado |
|----|-------|-------------|----------|------------------|---------------|--------------------|--------|
| EX-001 | 2026-06-01 | @team-billing | Integración heredada con SAP | Prefijo `Z_` en columnas SQL | Estándar de SAP | 2026-12-01 | Activa |
```

**Las excepciones NO se aplican a:**
- Código nuevo desde cero
- Comunicación interna entre APIs
- Nombres de la capa de dominio (el lenguaje ubicuo no es negociable)

---

## 13. Definición de Terminado

Un artefacto de código está **Terminado** desde el punto de vista de la nomenclatura cuando pasa **todo** lo siguiente:

```
[ ] Todos los nombres de clase, método, propiedad y variable coinciden con el glosario del lenguaje ubicuo
[ ] Se aplican las convenciones de capitalización de cada lenguaje (comprobado por el linter, cero violaciones)
[ ] Sin abreviaturas (salvo los acrónimos aprobados: ID, URL, HTTP, API, DTO, ORM, JWT, SQL)
[ ] Los objetos SQL siguen las reglas de nombres de esquema, tabla, columna y restricción
[ ] operationId de OpenAPI en camelCase; rutas en kebab-case; propiedades en camelCase
[ ] El tipo de CloudEvents sigue el patrón {org}.{context}.{entity}.{past-tense}
[ ] Sin cadenas mágicas que contengan nombres de campo (se usan constantes o nameof())
[ ] La compuerta de SonarQube pasa (0 violaciones de nombres, mantenibilidad A)
[ ] La descripción del PR referencia el término del lenguaje ubicuo del glosario del contexto acotado
[ ] sqlfluff lint devuelve 0 violaciones en todos los scripts de migración
[ ] Spectral lint devuelve 0 errores en las especificaciones OpenAPI afectadas
```

---

## 14. Ejemplos correctos frente a incorrectos

### 14.1 C# - agregado y objeto de valor

```csharp
// CORRECTO
public sealed class WorkOrder : AggregateRoot<WorkOrderId>
{
    private readonly List<OrderItem> _orderItems = [];

    public WorkOrderId Id { get; private init; }
    public ReferenceNumber ReferenceNumber { get; private set; }
    public CustomerId CustomerId { get; private init; }
    public WorkOrderStatus Status { get; private set; }

    public static WorkOrder Create(CustomerId customerId, string referenceNumber)
    {
        var order = new WorkOrder
        {
            Id = WorkOrderId.New(),
            CustomerId = customerId,
            ReferenceNumber = ReferenceNumber.From(referenceNumber),
            Status = WorkOrderStatus.Draft,
        };
        order.Raise(new WorkOrderCreatedEvent(order.Id, customerId));
        return order;
    }
}

// INCORRECTO
public class WrkOrdAggregat  // abreviatura + sufijo
{
    public int Id { get; set; }     // ID entero (debería ser fuertemente tipado)
    public string stat { get; set; } // en minúsculas y abreviado
    public List<OrdItm> Items;       // campo público, tipo abreviado
}
```

### 14.2 TypeScript - caso de uso

```typescript
// CORRECTO - archivo: create-work-order.use-case.ts
@Injectable()
export class CreateWorkOrderUseCase {
  constructor(
    @Inject('WorkOrderRepository')
    private readonly workOrderRepository: WorkOrderRepository,
  ) {}

  async execute(command: CreateWorkOrderCommand): Promise<Result<WorkOrderId>> {
    const workOrder = WorkOrder.create(command.customerId, command.referenceNumber);
    await this.workOrderRepository.save(workOrder);
    return Result.ok(workOrder.id);
  }
}

// INCORRECTO
export class CreateWO {   // abreviatura, sin sufijo
  constructor(private repo: any) {}  // sin tipos, `repo` está abreviado

  async run(data: any): Promise<any> {  // 'run' no es lenguaje de dominio; sin tipos
    return this.repo.insert(data);      // salta el modelo de dominio
  }
}
```

### 14.3 Python - protocolo de repositorio

```python
# BIEN CORRECTO - archivo: work_order_repository.py
from abc import abstractmethod
from typing import Protocol
from uuid import UUID

class WorkOrderRepository(Protocol):
    @abstractmethod
    async def find_by_id(self, work_order_id: UUID) -> WorkOrder | None: ...

    @abstractmethod
    async def save(self, work_order: WorkOrder) -> None: ...

    @abstractmethod
    async def list_by_customer(self, customer_id: UUID) -> list[WorkOrder]: ...


# MAL: INCORRECTO
class WO_Repo:
    def get(self, id): ...           # nombre abreviado, sin tipos
    def ins(self, obj): ...          # abreviatura sin significado
    def list_all(self, cust): ...    # `cust` abreviado, sin anotación de tipo
```

### 14.4 SQL - tabla y restricciones

```sql
-- BIEN CORRECTO
CREATE TABLE orders.work_orders (
    id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    reference_number    VARCHAR(50)         NOT NULL,
    customer_id         UNIQUEIDENTIFIER    NOT NULL,
    status              VARCHAR(30)         NOT NULL DEFAULT 'Draft',
    created_at          DATETIMEOFFSET      NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIMEOFFSET      NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by          NVARCHAR(256)       NOT NULL,
    updated_by          NVARCHAR(256)       NOT NULL,
    CONSTRAINT pk_work_orders               PRIMARY KEY (id),
    CONSTRAINT uq_work_orders_ref_number    UNIQUE (reference_number),
    CONSTRAINT ck_work_orders_status        CHECK (status IN ('Draft','Confirmed','InProgress','Completed','Cancelled')),
    CONSTRAINT fk_work_orders_customers     FOREIGN KEY (customer_id) REFERENCES customers.customers(id)
);
CREATE INDEX ix_work_orders_customer_status ON orders.work_orders (customer_id, status);

-- MAL: INCORRECTO
CREATE TABLE tbl_WrkOrd (       -- prefijado, PascalCase, abreviado
    WrkOrdID    INT IDENTITY,   -- PK entera, notación húngara, IDENTITY sin UUID
    CustID      INT,            -- FK abreviada, sin nombre de restricción
    Stat        VARCHAR(1),     -- columna abreviada, valores de un solo carácter
    dt          DATETIME        -- abreviada, tipo incorrecto para una columna de auditoría
);
```

### 14.5 OpenAPI

```yaml
# BIEN CORRECTO
paths:
  /v1/work-orders:
    post:
      operationId: createWorkOrder
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateWorkOrderRequest'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WorkOrderResponse'

components:
  schemas:
    CreateWorkOrderRequest:
      type: object
      required: [customerId, referenceNumber]
      properties:
        customerId:
          type: string
          format: uuid
        referenceNumber:
          type: string
          minLength: 3

# MAL: INCORRECTO
paths:
  /WorkOrders:            # ruta en PascalCase
    post:
      operationId: Create_Work_Order   # operationId en snake_case
      requestBody:
        content:
          application/json:
            schema:
              properties:
                customer_id:            # propiedad JSON en snake_case
                  type: integer         # tipo incorrecto para un UUID
                ref_num:                # abreviada
                  type: string
```

### 14.6 CloudEvents

```json
// CORRECTO
{
  "specversion": "1.0",
  "type": "acme.orders.work-order.created",
  "source": "/services/orders-api/v1",
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "time": "2026-05-15T14:30:00Z",
  "datacontenttype": "application/json",
  "subject": "work-orders/WO-2026-00123",
  "data": {
    "workOrderId": "550e8400-e29b-41d4-a716-446655440000",
    "referenceNumber": "WO-2026-00123",
    "customerId": "...",
    "status": "Draft"
  }
}

// INCORRECTO
{
  "type": "WorkOrderCreated",        // PascalCase, sin prefijo de organización/contexto
  "timestamp": "15-05-2026",         // no es ISO 8601
  "payload": {
    "work_order_id": "...",          // snake_case dentro de los datos JSON
    "ref": "WO-2026-00123",          // abreviado
    "cust_id": "..."                 // abreviado
  }
}
```

---

## 15. Consecuencias

### Positivas

- **Mantenibilidad (ISO/IEC 25010).** Una nomenclatura consistente reduce la carga cognitiva y acelera la incorporación. Quien llega puede predecir los nombres sin consultar la implementación.
- **Fiabilidad de las integraciones.** Un único nombre canónico por concepto evita los errores de mapeo de datos entre la API, la base de datos y los consumidores de eventos.
- **Verificación automatizada.** Todas las reglas son comprobables con el herramental existente, así que no hace falta revisión manual para el cumplimiento de nombres.
- **Alineación con DDD.** Usar el lenguaje ubicuo como origen de los nombres elimina la "capa de traducción" entre el negocio y la ingeniería.

### Negativas

- **Coste de migración.** Las bases de código existentes que no cumplen este ADR requieren una refactorización por fases. Véase la política de excepciones para acotarla en el tiempo.
- **Curva de aprendizaje.** Los equipos que se mueven entre lenguajes tienen que interiorizar las reglas de representación de cada capa.
- **El rigor puede frenar los primeros PR.** Los linters bloquean los merges hasta que los nombres son correctos. Invertir en plugins de IDE reduce la fricción (avisos en vivo de Roslyn, integración de ESLint en el IDE).

---

## 16. Referencias

- [Microsoft .NET Naming Guidelines](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/naming-guidelines)
- [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [PEP 8 - Python Style Guide](https://peps.python.org/pep-0008/)
- [CloudEvents 1.0 Specification](https://cloudevents.io)
- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [ISO/IEC 11179 - Metadata Registries](https://www.iso.org/standard/60525.html)
- [ISO/IEC 25010 - Systems and Software Quality](https://www.iso.org/standard/35733.html)
- [Kimball Dimensional Modeling Techniques](https://www.kimballgroup.com)
- [Spectral OpenAPI Linter](https://stoplight.io/open-source/spectral)
- [sqlfluff - SQL Linter](https://docs.sqlfluff.com)
- [ArchUnit - Architecture Testing](https://www.archunit.org)
- [ADR-0049 - Naming Semantics & Código Limpio Policy](./0049-naming-semantics-clean-code-policy.md) <- alcance superado
- [ADR-0048 - Enterprise Taxonomy Reference Layout](./0048-enterprise-taxonomy-reference-layout.md)

---

## Log de excepciones

| ID | Fecha | Solicitante | Contexto | Regla exceptuada | Justificación | Fecha de caducidad | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| - | - | - | - | - | - | - | - |




## Objetivo y Alcance

Backfill histórico: abordar la tensión arquitectónica en la que el contexto no está disponible, estableciendo un límite estándar.

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como la mantenibilidad y la confiabilidad).

## Decisiones y Estándares Relacionados

Ninguna explícitamente enlazada.

---

[Volver al índice de ADR](./README.md)

> **Agent Signature:** Architect Agent
