# ADR-0031: Esquema por Contexto Delimitado y Catálogo de Eventos de Dominio

## Estado
Aprobado

## Fecha
2026-05-11

## Contexto

Como el sistema está diseñado como un **Monolito Progresivo** ([ADR-0006](0006-microservices-transition-sidecar-pattern.es.md)) destinado a evolucionar hacia microservicios, existen dos riesgos estructurales que no están cubiertos por la línea base actual de ADR:

1. **Esquema de PostgreSQL Plano**: [ADR-0010](0010-multi-tenancy-architecture-strategy.es.md) define la Seguridad a Nivel de Fila (RLS) para el aislamiento multi-tenant, pero todas las tablas residen en un único esquema plano. Al extraer un contexto delimitado a un microservicio independiente, no hay una frontera de propiedad clara a nivel de base de datos. Los joins entre tablas se convierten en llamadas entre servicios, y los planes de migración se vuelven ambiguos.

2. **Sin Catálogo de Eventos de Dominio**: [ADR-0015](0015-event-driven-architecture-intra-domain.es.md) define la abstracción inyectable `IEventBusPort`, pero no especifica **qué eventos cruzan los límites de contexto**, ni los **contratos de carga útil tipados** para esos eventos. Sin este catálogo, las dependencias entre contextos son implícitas y no están documentadas, lo que hace que la extracción de microservicios sea insegura.

Ambos problemas tienen un costo cero de resolución durante la fase de Monolito Modular, pero se vuelven extremadamente caros de arreglar post-extracción.

---

## Decisión

### Parte 1: Esquema por Contexto Delimitado (PostgreSQL)

Cada contexto delimitado será dueño de un **esquema de PostgreSQL dedicado**. Todas las tablas que pertenezcan a un contexto deben crearse dentro de su esquema. Los joins entre esquemas dentro del monolito siguen estando permitidos (misma conexión de BD), pero deben tratarse como contratos de integración, no como detalles de implementación.

#### Asignaciones de Esquema

| Esquema PostgreSQL | Contexto Propietario | Tablas |
| :--- | :--- | :--- |
| `auth` | Contexto de Autenticación | `auth.users` |
| `tasks` | Contexto de Gestión de Tareas | `tasks.task`, `tasks.task_tags` |
| `taxonomy` | Contexto de Taxonomía | `taxonomy.category`, `taxonomy.tag` |
| `audit` | Contexto de Auditoría | `audit.audit_log` |

#### Estrategia de Migración

Cada contexto delimitado tendrá su propia configuración de `DataSource` de TypeORM acotada a su esquema. Las migraciones se ejecutan por esquema, permitiendo ciclos de despliegue independientes cuando los contextos se extraigan en microservicios dedicados.

```typescript
// Ejemplo: TaskDataSource (acotado al esquema tasks)
export const TaskDataSource = new DataSource({
 schema: 'tasks',
 migrations: ['dist/tasks/infrastructure/migrations/*.js'],
 entities: ['dist/tasks/infrastructure/entities/*.js'],
});
```

#### Ruta de Migración de Base de Datos (Progresión en 3 Fases)

Para prevenir el antipatrón de "Base de Datos Compartida con Microservicios", la transición debe seguir estrictamente:

- **Fase 1 (Monolito):** Motor físico compartido, esquemas lógicamente distintos por contexto. PROHIBIDOS los JOINs entre esquemas. La cohesión entre esquemas solo se da vía API o eventos de dominio.
- **Fase 2 (Extracción):** Usuarios lógicos separados por servicio extraído. Transición hacia migración física utilizando el Transactional Outbox ([ADR-0033](../core/0033-transactional-outbox-pattern.es.md)) para replicación fiable. Se sincroniza el estado vía eventos, NUNCA vía acceso DB directo inter-esquema.
- **Fase 3 (Malla Completa):** Propiedad Total de Datos. Cada microservicio posee su propia instancia de motor de base de datos exclusiva. Las dependencias se resuelven vía API/gRPC o Vistas Materializadas hidratadas por eventos.

---

### Parte 2: Catálogo de Eventos de Dominio

Toda la comunicación entre contextos delimitados debe ocurrir exclusivamente vía **Eventos de Dominio** publicados a través de `IEventBusPort` ([ADR-0015](0015-event-driven-architecture-intra-domain.es.md)). El siguiente catálogo define todos los eventos aprobados, su contexto propietario y sus contratos de carga útil tipados.

> **Regla**: Un contexto delimitado solo puede leer de sus propias tablas de esquema. Para obtener datos que pertenecen a otro contexto, debe suscribirse a los Eventos de Dominio publicados por ese contexto.

#### Catálogo de Eventos

##### Contexto Auth - Eventos Publicados

```typescript
/** Publicado cuando un nuevo usuario completa el registro con éxito */
class UserRegisteredEvent {
 readonly eventId: string; // UUID - para idempotencia
 readonly occurredAt: Date;
 readonly userId: string; // UUID
 readonly tenantId: string; // UUID
 readonly email: string;
}

/** Publicado cuando una cuenta de usuario se desactiva permanentemente */
class UserDeactivatedEvent {
 readonly eventId: string;
 readonly occurredAt: Date;
 readonly userId: string;
 readonly tenantId: string;
}
```

##### Contexto Gestión de Tareas - Eventos Publicados

```typescript
/** Publicado cuando una nueva tarea se crea con éxito */
class TaskCreatedEvent {
 readonly eventId: string;
 readonly occurredAt: Date;
 readonly taskId: string; // UUID
 readonly userId: string; // UUID - propietario
 readonly tenantId: string; // UUID
 readonly title: string;
 readonly categoryId: string | null;
}

/** Publicado cuando una tarea transiciona al estado COMPLETED (Completada) */
class TaskCompletedEvent {
 readonly eventId: string;
 readonly occurredAt: Date;
 readonly taskId: string;
 readonly userId: string;
 readonly tenantId: string;
 readonly completedAt: Date;
}

/** Publicado cuando una tarea se elimina permanentemente */
class TaskDeletedEvent {
 readonly eventId: string;
 readonly occurredAt: Date;
 readonly taskId: string;
 readonly userId: string;
 readonly tenantId: string;
}
```

##### Contexto Taxonomía - Eventos Publicados

```typescript
/** Publicado cuando se elimina una categoría (las tareas que la referencian deben ser notificadas) */
class CategoryDeletedEvent {
 readonly eventId: string;
 readonly occurredAt: Date;
 readonly categoryId: string;
 readonly tenantId: string;
}
```

#### Mapa de Suscripción de Eventos

| Evento | Publicador | Suscriptor | Razón |
| :--- | :--- | :--- | :--- |
| `UserRegisteredEvent` | Auth | Task | Inicializar espacio de trabajo de tareas del usuario |
| `UserDeactivatedEvent` | Auth | Task, Audit | Borrado en cascada de tareas, escribir entrada de auditoría |
| `TaskCreatedEvent` | Task | Audit | Escribir registro de creación inmutable |
| `TaskCompletedEvent` | Task | Audit | Escribir registro de finalización inmutable |
| `TaskDeletedEvent` | Task | Audit | Escribir registro de eliminación inmutable |
| `CategoryDeletedEvent` | Taxonomy | Task | Anular el `category_id` en las tareas afectadas |

---

## Consecuencias

### Positivas (Pros)
- **Extracción a microservicios a costo cero**: Los límites de esquema definidos de antemano eliminan la parte más costosa de la extracción del servicio: la ambigüedad de la propiedad de los datos.
- **Contratos explícitos**: El Catálogo de Eventos hace que todas las dependencias entre contextos sean visibles y auditables, previniendo acoplamientos ocultos.
- **Procesamiento de eventos idempotente**: El `eventId` (UUID) en cada evento permite a los consumidores deduplicar de forma segura las entregas reintentadas.
- **Ciclos de migración independientes**: Cada esquema puede migrarse de forma independiente, permitiendo despliegues con cero tiempo de inactividad (zero-downtime) por contexto.

### Negativas (Cons)
- **Sin transacciones entre esquemas**: Las operaciones que abarcan múltiples esquemas no pueden usar una única transacción de base de datos. Se debe abrazar la consistencia eventual vía Eventos de Dominio para operaciones entre contextos.
- **Complejidad multi-datasource de TypeORM**: Requiere configurar y gestionar múltiples instancias de `DataSource`, una por esquema. El DI de NestJS debe configurarse cuidadosamente para inyectar la fuente de datos correcta por repositorio.
- **Disciplina del desarrollador**: Los desarrolladores deben respetar las reglas de propiedad del esquema. Las reglas de límites de ESLint ([ADR-0003](../nodejs/0003-strict-typescript-standards.es.md)) deben configurarse para prevenir importaciones directas a través de los límites de los contextos.

## Referencias
- [ADR-0006: Transición Futura a Microservicios con Dapr](../../adrs/core/0006-microservices-transition-sidecar-pattern.es.md)
- [ADR-0010: Estrategia Multi-Tenancy (RLS)](../../adrs/core/0010-multi-tenancy-architecture-strategy.es.md)
- [ADR-0015: Arquitectura Dirigida por Eventos (Bus Inyectable)](../../adrs/core/0015-event-driven-architecture-intra-domain.es.md)
- [Modelo de Referencia Aplicado UMS](../../../knowledge/demo/README.es.md)





## Objetivo y Alcance

Backfill histórico: Abordar la tensión arquitectónica donde como el sistema está diseñado como un **Monolito Progresivo** ([ADR-0006](0006-microservices-transition-sidecar-pattern, estableciendo un límite estándar.

## Opciones Consideradas

- **Seleccionada:** Esquema por Contexto Delimitado y Catálogo de Eventos de Dominio
- **Otras:** Desconocido (el registro histórico no enumera explícitamente alternativas rechazadas).

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad).

## Decisiones y Estándares Relacionados

- [ADR-0006: Transición Futura a Microservicios con Dapr](../../adrs/core/0006-microservices-transition-sidecar-pattern.es.md)
- [ADR-0010: Estrategia Multi-Tenancy (RLS)](../../adrs/core/0010-multi-tenancy-architecture-strategy.es.md)
- [ADR-0015: Arquitectura Dirigida por Eventos (Bus Inyectable)](../../adrs/core/0015-event-driven-architecture-intra-domain.es.md)
- [Modelo de Referencia Aplicado UMS](../../../knowledge/demo/README.es.md)

---
[Volver al Índice](./README.es.md)

> **Agent Signature:** Architect Agent
