# Plantilla: Registro de Decisión Arquitectónica (ADR)

> **Navegación bilingüe:** [English](./adr-template.md)
> **Fase:** 2 — Diseño y Arquitectura (y durante la construcción)
> **Puerta de salida:** Baseline de Diseño Aprobada (ADRs iniciales); Build Exitoso (ADRs de runtime)
> **Padre:** [Plantillas de Artefactos](./README.es.md)

---

## Acerca de Esta Plantilla

Un ADR captura una única decisión arquitectónica: el contexto que forzó la decisión, las opciones consideradas, la elección tomada y las consecuencias que siguen. Los ADRs son inmutables una vez aprobados — nunca se actualizan en el lugar. Una decisión supersedida requiere un nuevo ADR que referencia al anterior.

Todo ADR en Evolith debe registrarse en el [Registro ADR](../../../architecture/adrs-es/README.md) y vincularse en la [Matriz de Decisiones ADR](../../../architecture/adrs-es/adr-matrix.es.md) antes de que se active la puerta de Baseline de Diseño.

---

## Sección 1 — Plantilla en Blanco

### Fuente — Copiar y pegar

```markdown
# ADR-[NÚMERO]: [Título Corto de la Decisión]

> Estado: [Propuesto | Aceptado | Deprecado | Supersedido por ADR-XXXX]
> Fecha: [AAAA-MM-DD]
> Decisores: [Architecture Board / Tech Lead / equipo relevante]
> Revisado por: [Nombres o roles]
> Runtime: [Core (agnóstico) | Node.js | .NET | Android | Todos]

---

## Contexto

[Describe la situación que obliga a tomar una decisión.
Incluye las fuerzas en juego: técnicas, de negocio, del equipo, regulatorias.
No menciones aún la decisión misma.
3–6 oraciones es la extensión correcta. Un contexto más largo pertenece a un doc de diseño, no aquí.]

---

## Factores de Decisión

- [Factor 1: ej. Necesitamos soportar múltiples tenants con garantías de aislamiento de datos]
- [Factor 2: ej. La capa de dominio debe permanecer libre de imports de infraestructura]
- [Factor 3: ej. La solución debe ser testeable sin una base de datos en ejecución]

---

## Opciones Consideradas

| Opción | Resumen | Pros | Contras |
|---|---|---|---|
| **Opción A** | [Descripción breve] | [Ventaja clave] | [Desventaja clave] |
| **Opción B** | [Descripción breve] | [Ventaja clave] | [Desventaja clave] |
| **Opción C** | [Descripción breve] | [Ventaja clave] | [Desventaja clave] |

---

## Decisión

**Elegimos la Opción [X].**

[Enuncia la decisión claramente en una oración.
Luego explica el razonamiento en 2–4 oraciones.
Referencia otros ADRs si esta decisión depende de ellos o los restringe.]

---

## Consecuencias

### Positivas

- [Beneficio 1]
- [Beneficio 2]

### Negativas

- [Trade-off aceptado 1]
- [Trade-off aceptado 2]

### Riesgos

- [Riesgo 1 y enfoque de mitigación]

---

## Notas de Implementación

[Opcional: Si la decisión requiere un patrón de implementación específico,
describe la restricción clave aquí. Referencia un Patrón Canónico si existe.]

---

## Enlaces

- Supersede a: [ADR-XXXX — Título, si aplica]
- Supersedido por: [ADR-XXXX — Título, si aplica]
- Relacionado: [ADR-XXXX — Título]
- Patrón Canónico: [Enlace a canonical-patterns/ si existe]
- Referencia externa: [Enlace a RFC, paper o estándar relevante]
```

---

### Vista Previa

# ADR-[NÚMERO]: [Título Corto de la Decisión]

> Estado: [Propuesto | Aceptado | Deprecado | Supersedido por ADR-XXXX]
> Fecha: [AAAA-MM-DD]
> Decisores: [Architecture Board / Tech Lead / equipo relevante]
> Revisado por: [Nombres o roles]
> Runtime: [Core (agnóstico) | Node.js | .NET | Android | Todos]

---

## Contexto

[Describe la situación que obliga a tomar una decisión.
Incluye las fuerzas en juego: técnicas, de negocio, del equipo, regulatorias.
No menciones aún la decisión misma.
3–6 oraciones es la extensión correcta. Un contexto más largo pertenece a un doc de diseño, no aquí.]

---

## Factores de Decisión

- [Factor 1: ej. Necesitamos soportar múltiples tenants con garantías de aislamiento de datos]
- [Factor 2: ej. La capa de dominio debe permanecer libre de imports de infraestructura]
- [Factor 3: ej. La solución debe ser testeable sin una base de datos en ejecución]

---

## Opciones Consideradas

| Opción | Resumen | Pros | Contras |
|---|---|---|---|
| **Opción A** | [Descripción breve] | [Ventaja clave] | [Desventaja clave] |
| **Opción B** | [Descripción breve] | [Ventaja clave] | [Desventaja clave] |
| **Opción C** | [Descripción breve] | [Ventaja clave] | [Desventaja clave] |

---

## Decisión

**Elegimos la Opción [X].**

[Enuncia la decisión claramente en una oración.
Luego explica el razonamiento en 2–4 oraciones.
Referencia otros ADRs si esta decisión depende de ellos o los restringe.]

---

## Consecuencias

### Positivas

- [Beneficio 1]
- [Beneficio 2]

### Negativas

- [Trade-off aceptado 1]
- [Trade-off aceptado 2]

### Riesgos

- [Riesgo 1 y enfoque de mitigación]

---

## Notas de Implementación

[Opcional: Si la decisión requiere un patrón de implementación específico,
describe la restricción clave aquí. Referencia un Patrón Canónico si existe.]

---

## Enlaces

- Supersede a: [ADR-XXXX — Título, si aplica]
- Supersedido por: [ADR-XXXX — Título, si aplica]
- Relacionado: [ADR-XXXX — Título]
- Patrón Canónico: [Enlace a canonical-patterns/ si existe]
- Referencia externa: [Enlace a RFC, paper o estándar relevante]

---

## Sección 2 — Ejemplo Completo

El siguiente es un ADR completo en el estilo y profundidad esperados por el Architecture Board.

### Fuente — Copiar y pegar

````markdown
# ADR-0010: Estrategia de Seguridad Multi-Tenancy de Doble Capa

> Estado: Aceptado
> Fecha: 2025-11-04
> Decisores: Evolith Architecture Board
> Revisado por: Security Engineering, DBA, Tech Lead
> Runtime: Core (agnóstico)

---

## Contexto

UMS debe servir a múltiples organizaciones independientes (tenants) desde una única
instancia de base de datos. Las filas pertenecientes al Tenant A nunca deben ser
visibles para una consulta que se ejecuta en el contexto del Tenant B,
independientemente de si la capa de aplicación lo aplica correctamente.
Un enfoque de capa única que depende exclusivamente del filtrado a nivel de
aplicación introduce un radio de impacto inaceptable: un único bug en un query
builder, una configuración incorrecta del ORM o un escape de SQL nativo podría
exponer silenciosamente datos cross-tenant. La solución debe ser verificable,
de defensa en profundidad y compatible con connection pooling.

---

## Factores de Decisión

- La exposición de datos cross-tenant debe ser imposible incluso si la capa de aplicación tiene un bug.
- La capa de dominio no debe contener predicados de seguridad SQL.
- La solución debe ser testeable con Testcontainers (sin SQL Server en ejecución para unit tests).
- El connection pooling debe seguir siendo viable a escala (SESSION_CONTEXT no debe filtrarse entre conexiones).

---

## Opciones Consideradas

| Opción | Resumen | Pros | Contras |
|---|---|---|---|
| **Opción A — Filtro solo en app** | Filtro de consulta global EF Core agrega `WHERE root_tenant_id = @tid` a cada query | Simple, testeable, sin objetos de BD | Punto único de falla — un `Include` faltante o query nativo lo bypasea |
| **Opción B — RLS solo en BD** | Predicado nativo SQL Server Row-Level Security en cada tabla | Aplicado al nivel del motor, imposible de bypassear desde código de app | Requiere DDL en cada tabla, complica setup de Testcontainers, más difícil de depurar |
| **Opción C — Doble capa (App + BD)** | Capa 1: Filtro global EF Core (primario); Capa 2: Predicado RLS SQL Server (failsafe) | Defensa en profundidad, ninguna capa sola es punto único de falla | Más componentes móviles, limpieza de SESSION_CONTEXT requerida al devolver la conexión |

---

## Decisión

**Elegimos la Opción C — Doble Capa.**

La capa de aplicación (filtro de consulta global EF Core vía `DbConnectionInterceptor`)
es el mecanismo de aplicación primario porque es testeable y depurable. El predicado
RLS de SQL Server (`fn_SecurityPredicate`) actúa como failsafe: si un query nativo o
un cambio de código futuro bypasea el filtro EF Core, el motor de base de datos filtra
silenciosamente las filas cross-tenant antes de que salgan de SQL Server.
El `SESSION_CONTEXT` se establece al abrir la conexión y se limpia al devolverla
para garantizar comportamiento seguro bajo reutilización del connection pool.

---

## Consecuencias

### Positivas

- Los datos cross-tenant no pueden ser expuestos aunque un desarrollador futuro escriba un query SQL nativo.
- La capa EF Core es completamente testeable con NSubstitute y proveedores en memoria.
- El enfoque de doble capa satisface los controles de acceso a datos A.8 de ISO/IEC 27001:2022.

### Negativas

- Cada nueva tabla requiere tanto una PK compuesta (`id`, `root_tenant_id`) como un predicado RLS correspondiente.
- La limpieza de SESSION_CONTEXT debe implementarse en `DbConnectionInterceptor.ConnectionClosingAsync`.
- Depurar filtraciones cross-tenant requiere verificar dos capas independientes.

### Riesgos

- Filtraciones del connection pool: si el interceptor lanza una excepción antes de limpiar SESSION_CONTEXT,
  el siguiente prestatario de la conexión hereda el contexto de tenant incorrecto. Mitigación: política de
  retry con Polly y fallback que limpia explícitamente SESSION_CONTEXT antes de re-lanzar.

---

## Notas de Implementación

El `DbConnectionInterceptor` debe llamar:
```sql
EXEC sp_set_session_context @key = N'TenantId', @value = @tenantId, @read_only = 1;
```
en `ConnectionOpenedAsync` y limpiarlo en `ConnectionClosingAsync`.
La función de predicado RLS debe crearse en cada schema; un generador de migraciones DDL
está incluido en TE-03.
Ver Patrón Canónico: `.NET Multi-Tenancy Doble Capa`.

---

## Enlaces

- Relacionado: ADR-0044 — Estrategia Configurable de Persistencia de Seguridad
- Relacionado: ADR-0031 — Schema-per-Context
- Relacionado: ADR-0054 — Estándares de Diseño y Normalización de Base de Datos
- Patrón Canónico: [.NET Multi-Tenancy Doble Capa](../../../architecture/canonical-patterns/README.md)
- Referencia externa: [SQL Server Row-Level Security — Microsoft Docs](https://learn.microsoft.com/es-es/sql/relational-databases/security/row-level-security)
````

---

### Vista Previa

# ADR-0010: Estrategia de Seguridad Multi-Tenancy de Doble Capa

> Estado: Aceptado
> Fecha: 2025-11-04
> Decisores: Evolith Architecture Board
> Revisado por: Security Engineering, DBA, Tech Lead
> Runtime: Core (agnóstico)

---

## Contexto

UMS debe servir a múltiples organizaciones independientes (tenants) desde una única
instancia de base de datos. Las filas pertenecientes al Tenant A nunca deben ser
visibles para una consulta que se ejecuta en el contexto del Tenant B,
independientemente de si la capa de aplicación lo aplica correctamente.
Un enfoque de capa única que depende exclusivamente del filtrado a nivel de
aplicación introduce un radio de impacto inaceptable: un único bug en un query
builder, una configuración incorrecta del ORM o un escape de SQL nativo podría
exponer silenciosamente datos cross-tenant. La solución debe ser verificable,
de defensa en profundidad y compatible con connection pooling.

---

## Factores de Decisión

- La exposición de datos cross-tenant debe ser imposible incluso si la capa de aplicación tiene un bug.
- La capa de dominio no debe contener predicados de seguridad SQL.
- La solución debe ser testeable con Testcontainers (sin SQL Server en ejecución para unit tests).
- El connection pooling debe seguir siendo viable a escala (SESSION_CONTEXT no debe filtrarse entre conexiones).

---

## Opciones Consideradas

| Opción | Resumen | Pros | Contras |
|---|---|---|---|
| **Opción A — Filtro solo en app** | Filtro de consulta global EF Core agrega `WHERE root_tenant_id = @tid` a cada query | Simple, testeable, sin objetos de BD | Punto único de falla — un `Include` faltante o query nativo lo bypasea |
| **Opción B — RLS solo en BD** | Predicado nativo SQL Server Row-Level Security en cada tabla | Aplicado al nivel del motor, imposible de bypassear desde código de app | Requiere DDL en cada tabla, complica setup de Testcontainers, más difícil de depurar |
| **Opción C — Doble capa (App + BD)** | Capa 1: Filtro global EF Core (primario); Capa 2: Predicado RLS SQL Server (failsafe) | Defensa en profundidad, ninguna capa sola es punto único de falla | Más componentes móviles, limpieza de SESSION_CONTEXT requerida al devolver la conexión |

---

## Decisión

**Elegimos la Opción C — Doble Capa.**

La capa de aplicación (filtro de consulta global EF Core vía `DbConnectionInterceptor`)
es el mecanismo de aplicación primario porque es testeable y depurable. El predicado
RLS de SQL Server (`fn_SecurityPredicate`) actúa como failsafe: si un query nativo o
un cambio de código futuro bypasea el filtro EF Core, el motor de base de datos filtra
silenciosamente las filas cross-tenant antes de que salgan de SQL Server.
El `SESSION_CONTEXT` se establece al abrir la conexión y se limpia al devolverla
para garantizar comportamiento seguro bajo reutilización del connection pool.

---

## Consecuencias

### Positivas

- Los datos cross-tenant no pueden ser expuestos aunque un desarrollador futuro escriba un query SQL nativo.
- La capa EF Core es completamente testeable con NSubstitute y proveedores en memoria.
- El enfoque de doble capa satisface los controles de acceso a datos A.8 de ISO/IEC 27001:2022.

### Negativas

- Cada nueva tabla requiere tanto una PK compuesta (`id`, `root_tenant_id`) como un predicado RLS correspondiente.
- La limpieza de SESSION_CONTEXT debe implementarse en `DbConnectionInterceptor.ConnectionClosingAsync`.
- Depurar filtraciones cross-tenant requiere verificar dos capas independientes.

### Riesgos

- Filtraciones del connection pool: si el interceptor lanza una excepción antes de limpiar SESSION_CONTEXT,
  el siguiente prestatario de la conexión hereda el contexto de tenant incorrecto. Mitigación: política de
  retry con Polly y fallback que limpia explícitamente SESSION_CONTEXT antes de re-lanzar.

---

## Notas de Implementación

El `DbConnectionInterceptor` debe llamar:

```sql
EXEC sp_set_session_context @key = N'TenantId', @value = @tenantId, @read_only = 1;
```

en `ConnectionOpenedAsync` y limpiarlo en `ConnectionClosingAsync`.
La función de predicado RLS debe crearse en cada schema; un generador de migraciones DDL
está incluido en TE-03.
Ver Patrón Canónico: `.NET Multi-Tenancy Doble Capa`.

---

## Enlaces

- Relacionado: ADR-0044 — Estrategia Configurable de Persistencia de Seguridad
- Relacionado: ADR-0031 — Schema-per-Context
- Relacionado: ADR-0054 — Estándares de Diseño y Normalización de Base de Datos
- Patrón Canónico: [.NET Multi-Tenancy Doble Capa](../../../architecture/canonical-patterns/README.md)
- Referencia externa: [SQL Server Row-Level Security — Microsoft Docs](https://learn.microsoft.com/es-es/sql/relational-databases/security/row-level-security)

---

[Volver a Plantillas de Artefactos](./README.es.md)
