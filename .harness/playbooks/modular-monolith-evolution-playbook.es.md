# Playbook de Evolución de Monolito Modular

## Cuándo Usarlo

- Al evaluar límites de bounded contexts
- Al mover código compartido entre módulos
- Al diseñar flujos de integración entre contextos
- Al preparar un módulo para futura extracción de servicio

---

## 1. Verificaciones Obligatorias de Límites

Antes de cualquier cambio estructural en los límites de módulos:

1. Los bounded contexts mantienen ownership claro — un equipo, un esquema, una unidad de despliegue.
2. El código compartido es verdaderamente transversal (infraestructura genérica, primitivas DDD), no meramente conveniente.
3. La lógica de dominio permanece pura y sin dependencias de framework — cero imports ORM o NestJS en la capa de dominio.
4. La colaboración entre contextos usa contratos, ACLs, eventos y patrones outbox — nunca joins directos entre esquemas en DB.
5. Los cambios mejoran, o al menos preservan, la preparación para extracción futura.

---

## 2. Validación de Límites con `eslint-plugin-boundaries`

Las reglas de límites de ESLint aseguran que la capa de dominio no pueda importar desde infraestructura. Verifique violaciones antes y después de cada cambio estructural:

```bash
npx eslint --ext .ts src/libs/domain --rule '{"boundaries/element-types": "error"}'
```

Resultado esperado: **0 violaciones**. Cualquier importación entre capas desde `domain` hacia `infrastructure` es una deuda arquitectónica que debe resolverse antes de fusionar.

**Ejemplo de límite saludable:**

```
libs/
  domain/task/
    src/
      task.aggregate.ts        ← sin NestJS, sin TypeORM
      task.repository.ts       ← Puerto ITaskRepository (solo interfaz)
  infrastructure/task/
    src/
      typeorm-task.repository.ts ← implementa ITaskRepository, importa TypeORM
```

**Alerta roja:** Si `task.aggregate.ts` contiene `import { InjectRepository } from '@nestjs/typeorm'`, el límite está violado.

---

## 3. Lista de Verificación de Preparación para Extracción (Fase 1 → Fase 2)

Según [ADR-0045](../../reference/architecture/adrs/core/0045-microservice-extraction-readiness-criteria.md), un módulo es candidato válido para extracción cuando cumple **2 de 4** criterios sostenidos por 15 días:

| Criterio | Fuente de Medición | Umbral |
| :--- | :--- | :--- |
| Latencia Crítica | Jaeger P95 por módulo | > 200ms |
| Frecuencia de Release | Registros de CI de depliegue | > 4 deploys/semana |
| Autonomía del Equipo | Git blame por squad | > 80% commits de un squad |
| Densidad de Datos | PostgreSQL `pg_stat_user_tables` | Esquema del módulo > 20% de la carga total de BD |

Antes de presentar al Architecture Board, el Squad Lead DEBE proporcionar una exportación de telemetría de 15 días que muestre la superación sostenida del umbral.

---

## 4. Paso a Paso: Primera Extracción de Servicio (Strangler Fig)

Este procedimiento extrae un bounded context del monolito sin una reescritura Big Bang. Referencia: [ADR-0047 §10](../../reference/architecture/adrs/core/0047-architectural-patterns-monolith-soa-microservices.md).

### Paso 1 — Confirmar aislamiento de esquema

Verifique que el contexto objetivo ya usa su propio esquema de PostgreSQL (ej., `tasks`). Si comparte tablas con otro contexto, realice primero el aislamiento a nivel de esquema (sin foreign keys entre esquemas, sin joins SQL entre esquemas).

```sql
-- Verificar que no existan foreign keys entre esquemas
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE contype = 'f'
  AND conrelid::regclass::text LIKE 'tasks.%'
  AND confrelid::regclass::text NOT LIKE 'tasks.%';
-- Esperado: 0 filas
```

### Paso 2 — Posicionar Kong para enrutamiento Strangler Fig

Agregue una ruta Kong que redirija el prefijo de ruta del módulo al monolito. Esta es la costura de extracción futura — el tráfico se redirigirá posteriormente al nuevo servicio sin cambios en el cliente.

```yaml
# kong.yml (sin base de datos)
services:
  - name: monolith
    url: http://core-api:3000
    routes:
      - name: tasks-route
        paths: [/v1/tasks]
      - name: auth-route
        paths: [/v1/auth]
```

### Paso 3 — Convertir la librería interna en un proyecto Nx independiente

```bash
# Crear una nueva aplicación independiente desde la librería existente
nx g @nx/nest:application task-service
# Mover código de dominio + infraestructura; mantener la interfaz Port en una lib compartida
```

El nuevo servicio obtiene su propio `DATABASE_URL` apuntando a la misma instancia de PostgreSQL pero limitado al esquema `tasks`. No se necesita migración de datos.

### Paso 4 — Cambiar el enrutamiento de Kong al nuevo servicio

```yaml
services:
  - name: task-service
    url: http://task-service:3001
    routes:
      - name: tasks-route
        paths: [/v1/tasks]
  - name: monolith
    url: http://core-api:3000
    routes:
      - name: auth-route
        paths: [/v1/auth]
```

Despliegue el nuevo servicio, actualice la configuración de Kong y valide mediante el [Modelo de Referencia Aplicado UMS](../../reference/knowledge/demo/README.md). El monolito ya no maneja tráfico de tasks.

### Paso 5 — Migrar el Bus de Eventos de In-Memory a RabbitMQ

Una vez que el servicio está desplegado independientemente, el bus In-Memory ya no puede entregar eventos entre servicios. Establezca la variable de entorno:

```bash
EVENT_BUS_IMPL=rabbitmq
RABBITMQ_URL=amqp://localhost:5672
```

La implementación de `IEventBusPort` se inyecta al iniciar sin ningún cambio en el código de dominio — según [ADR-0015](../../reference/architecture/adrs/core/0015-event-driven-architecture-intra-domain.md).

---

## 5. Preguntas de Preparación para Extracción

Responda **todas** antes de proponer una extracción al Architecture Board:

- ¿Puede este módulo separarse sin copiar lógica oculta de otro contexto?
- ¿Son todos los contratos suficientemente explícitos para convertirse en límites gRPC o REST entre servicios?
- ¿Estamos centralizando accidentalmente reglas de dominio en una capa `libs/` compartida?
- ¿Tiene el módulo su propio conjunto de pruebas de integración ejecutándose contra Testcontainers?
- ¿Se ha validado la observabilidad — el módulo produce sus propios traces y logs estructurados?
- ¿Está el squad listo para mantener un pipeline CI/CD separado para este servicio?

---

## 6. Anti-Patrones a Vigilar

| Anti-Patrón | Señal | Resolución |
| :--- | :--- | :--- |
| **Módulo Dios** | Un contexto posee >50% de las entidades de dominio | Reevaluar los límites del bounded context contra el lenguaje ubicuo |
| **Librería Compartida con Fugas** | `libs/shared` contiene lógica de negocio | Mover la lógica de negocio al contexto propietario; las libs compartidas deben contener solo infraestructura genérica o primitivas DDD |
| **Acoplamiento Síncrono Oculto** | El Módulo A llama al repositorio del Módulo B directamente | Reemplazar con comunicación basada en eventos vía `IEventBusPort` |
| **Extracción Prematura** | Extracción propuesta antes de cumplir criterios "2 de 4" | Esperar evidencia de telemetría; modularizar más dentro del monolito primero |
