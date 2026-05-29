# Plantilla: Release Notes

> **Navegación bilingüe:** [English](./release-notes-template.md)
> **Fase:** 5 — Entrega y Operaciones
> **Puerta de salida:** Producción Activa (Monitoreo Nominal)
> **Padre:** [Plantillas de Artefactos](./README.es.md)

---

## Acerca de Esta Plantilla

Las Release Notes son el artefacto de comunicación formal que acompaña cada despliegue a producción. Son requeridas antes de que pueda declararse la puerta de Producción Activa. La audiencia es tanto técnica (equipo de operaciones, engineering lead) como no técnica (product owner, stakeholders). Cada sección debe escribirse en consecuencia.

Las Release Notes se almacenan en control de versiones etiquetadas al commit de release. Deben cumplir la regla de versionado de las [Buenas Prácticas de Documentación SDLC](../03-documentation/sdlc-documentation-best-practices.es.md): el estado del documento se mapea exactamente al tag del release.

---

## Sección 1 — Plantilla en Blanco

### Fuente — Copiar y pegar

```markdown
# Release Notes — [Nombre del Producto] [Versión]

> Fecha de release: [AAAA-MM-DD]
> Tipo de release: [Mayor | Menor | Parche | Hotfix]
> RC sellado: [Fecha del sello RC]
> Objetivo de despliegue: [Producción | Staging | UAT]
> Desplegado por: [Ingeniero o pipeline automatizado]
> Versión de rollback: [Tag de versión estable anterior]

---

## 1. Resumen del Release

[2–4 oraciones. ¿Qué entrega este release para el negocio?
Escribe al nivel del producto, no del código.
Los Product Owners y sponsors leerán esta sección.]

---

## 2. Nuevas Funcionalidades

### [EP-XX — Nombre del Bounded Context]

#### [Nombre de la Funcionalidad]

[Descripción breve de qué hace la funcionalidad para el usuario.
Lenguaje de negocio. Enlaza a la Historia Funcional para más detalle.]

- Entregado por: [FS-XX — Título de la Historia]
- Disponible para: [Persona o rol]

---

## 3. Mejoras

| Área | Descripción |
|---|---|
| [Componente] | [Qué se mejoró y el efecto observable] |

---

## 4. Cambios Incompatibles

> Si no hay cambios incompatibles, escribir: "Ninguno en este release."

| Cambio | Afectados | Migración Requerida | Guía de Migración |
|---|---|:---:|---|
| [Endpoint API renombrado o eliminado] | [Nombre del consumidor] | Sí | [Enlace o instrucciones inline] |
| [Cambio de schema de base de datos] | [Nombre del servicio] | Sí | [Nombre del script de migración] |

---

## 5. Correcciones de Bugs

| Problema | Descripción | Severidad |
|---|---|:---:|
| [PRB-XXX] | [Qué estaba roto y cómo se comporta ahora] | [Alto / Medio / Bajo] |

---

## 6. Actualizaciones de Dependencias

| Paquete | Anterior | Actualizado | CVE Corregido |
|---|:---:|:---:|:---:|
| [Nombre del paquete] | [vX.X.X] | [vY.Y.Y] | [CVE-XXXX o N/A] |

---

## 7. Instrucciones de Despliegue

### Prerrequisitos

- [ ] [Prerrequisito 1: ej. El script de migración de base de datos debe aplicarse antes del reinicio del servicio]
- [ ] [Prerrequisito 2: ej. La variable de entorno X debe establecerse como Y en el entorno objetivo]

### Pasos de Despliegue

1. Aplicar migraciones de base de datos: `dotnet ef database update --project Identity.Infrastructure`
2. Desplegar la imagen del container: `[tag de imagen o comando helm]`
3. Verificar endpoint de salud: `GET /health` debe retornar `200 OK`
4. Confirmar que los spans OTel fluyen a Grafana (verificar: [Enlace al dashboard])

### Verificación Post-Despliegue

- [ ] El endpoint de salud retorna `200 OK`
- [ ] El flujo de login completa con éxito con una cuenta de prueba
- [ ] Trazas OTel visibles en Grafana (TraceID propagado de extremo a extremo)
- [ ] El log de auditoría registra un evento `UserAuthenticated` en el login de prueba
- [ ] Sin logs de nivel ERROR en los primeros 10 minutos de tráfico

---

## 8. Procedimiento de Rollback

Si se detecta un problema crítico en los primeros 30 minutos del despliegue:

1. Revertir el despliegue al tag de imagen anterior: `[tag de imagen anterior]`
2. Si se aplicaron migraciones de base de datos: ejecutar script de rollback `migrations/rollback-[version].sql`
3. Notificar al SRE de guardia y al Engineering Lead.
4. Crear un incidente en el issue tracker con etiqueta `production-incident`.
5. No volver a desplegar hasta que se identifique la causa raíz.

---

## 9. Problemas Conocidos

| Problema | Descripción | Severidad | Solución Alternativa |
|---|---|:---:|---|
| [PRB-XXX] | [Descripción del problema] | [Medio / Bajo] | [Workaround temporal si aplica] |

---

## 10. Checklist de Observabilidad

Confirmar que lo siguiente está activo antes de declarar Producción Activa.

- [ ] OTel collector recibiendo spans de todos los bounded contexts
- [ ] Dashboard Grafana muestra tasa de requests activa
- [ ] Loki recibiendo logs estructurados con correlation IDs
- [ ] Trazas Tempo consultables por TraceID
- [ ] Reglas de alertas activas (tasa de error, latencia P95, health check)

---

## 11. Enlaces de Referencia

| Recurso | Enlace |
|---|---|
| Tag del release | [URL del release en GitHub] |
| Ejecución del pipeline CI | [URL de ejecución de GitHub Actions] |
| Reporte de Resumen de Testing | [Enlace al RST para este RC] |
| Dashboard de observabilidad | [URL del dashboard Grafana] |
| Runbook | [Enlace al runbook de operaciones] |
```

---

### Vista Previa

# Release Notes — [Nombre del Producto] [Versión]

> Fecha de release: [AAAA-MM-DD]
> Tipo de release: [Mayor | Menor | Parche | Hotfix]
> RC sellado: [Fecha del sello RC]
> Objetivo de despliegue: [Producción | Staging | UAT]
> Desplegado por: [Ingeniero o pipeline automatizado]
> Versión de rollback: [Tag de versión estable anterior]

---

## 1. Resumen del Release

[2–4 oraciones. ¿Qué entrega este release para el negocio?
Escribe al nivel del producto, no del código.
Los Product Owners y sponsors leerán esta sección.]

---

## 2. Nuevas Funcionalidades

### [EP-XX — Nombre del Bounded Context]

#### [Nombre de la Funcionalidad]

[Descripción breve de qué hace la funcionalidad para el usuario.
Lenguaje de negocio. Enlaza a la Historia Funcional para más detalle.]

- Entregado por: [FS-XX — Título de la Historia]
- Disponible para: [Persona o rol]

---

## 3. Mejoras

| Área | Descripción |
|---|---|
| [Componente] | [Qué se mejoró y el efecto observable] |

---

## 4. Cambios Incompatibles

> Si no hay cambios incompatibles, escribir: "Ninguno en este release."

| Cambio | Afectados | Migración Requerida | Guía de Migración |
|---|---|:---:|---|
| [Endpoint API renombrado o eliminado] | [Nombre del consumidor] | Sí | [Enlace o instrucciones inline] |
| [Cambio de schema de base de datos] | [Nombre del servicio] | Sí | [Nombre del script de migración] |

---

## 5. Correcciones de Bugs

| Problema | Descripción | Severidad |
|---|---|:---:|
| [PRB-XXX] | [Qué estaba roto y cómo se comporta ahora] | [Alto / Medio / Bajo] |

---

## 6. Actualizaciones de Dependencias

| Paquete | Anterior | Actualizado | CVE Corregido |
|---|:---:|:---:|:---:|
| [Nombre del paquete] | [vX.X.X] | [vY.Y.Y] | [CVE-XXXX o N/A] |

---

## 7. Instrucciones de Despliegue

### Prerrequisitos

- [ ] [Prerrequisito 1: ej. El script de migración de base de datos debe aplicarse antes del reinicio del servicio]
- [ ] [Prerrequisito 2: ej. La variable de entorno X debe establecerse como Y en el entorno objetivo]

### Pasos de Despliegue

1. Aplicar migraciones de base de datos: `dotnet ef database update --project Identity.Infrastructure`
2. Desplegar la imagen del container: `[tag de imagen o comando helm]`
3. Verificar endpoint de salud: `GET /health` debe retornar `200 OK`
4. Confirmar que los spans OTel fluyen a Grafana (verificar: [Enlace al dashboard])

### Verificación Post-Despliegue

- [ ] El endpoint de salud retorna `200 OK`
- [ ] El flujo de login completa con éxito con una cuenta de prueba
- [ ] Trazas OTel visibles en Grafana (TraceID propagado de extremo a extremo)
- [ ] El log de auditoría registra un evento `UserAuthenticated` en el login de prueba
- [ ] Sin logs de nivel ERROR en los primeros 10 minutos de tráfico

---

## 8. Procedimiento de Rollback

Si se detecta un problema crítico en los primeros 30 minutos del despliegue:

1. Revertir el despliegue al tag de imagen anterior: `[tag de imagen anterior]`
2. Si se aplicaron migraciones de base de datos: ejecutar script de rollback `migrations/rollback-[version].sql`
3. Notificar al SRE de guardia y al Engineering Lead.
4. Crear un incidente en el issue tracker con etiqueta `production-incident`.
5. No volver a desplegar hasta que se identifique la causa raíz.

---

## 9. Problemas Conocidos

| Problema | Descripción | Severidad | Solución Alternativa |
|---|---|:---:|---|
| [PRB-XXX] | [Descripción del problema] | [Medio / Bajo] | [Workaround temporal si aplica] |

---

## 10. Checklist de Observabilidad

Confirmar que lo siguiente está activo antes de declarar Producción Activa.

- [ ] OTel collector recibiendo spans de todos los bounded contexts
- [ ] Dashboard Grafana muestra tasa de requests activa
- [ ] Loki recibiendo logs estructurados con correlation IDs
- [ ] Trazas Tempo consultables por TraceID
- [ ] Reglas de alertas activas (tasa de error, latencia P95, health check)

---

## 11. Enlaces de Referencia

| Recurso | Enlace |
|---|---|
| Tag del release | [URL del release en GitHub] |
| Ejecución del pipeline CI | [URL de ejecución de GitHub Actions] |
| Reporte de Resumen de Testing | [Enlace al RST para este RC] |
| Dashboard de observabilidad | [URL del dashboard Grafana] |
| Runbook | [Enlace al runbook de operaciones] |

---

## Sección 2 — Ejemplo Completo

### Fuente — Copiar y pegar

```markdown
# Release Notes — UMS v0.1.0

> Fecha de release: 2026-04-05
> Tipo de release: Menor (primer release de producción)
> RC sellado: 2026-03-29
> Objetivo de despliegue: Producción
> Desplegado por: Pipeline GitHub Actions (automatizado)
> Versión de rollback: N/A (primer release)

---

## 1. Resumen del Release

UMS v0.1.0 entrega el MVP completo: gestión centralizada de identidad de usuario,
autorización RBAC/ABAC de grano fino con compilación de grafo de permisos,
configuración multi-tenant jerárquica, un audit trail inmutable y la consola
administrativa. Este release prueba los cinco patrones arquitectónicos Evolith
Fase 1 en código .NET 8 listo para producción.

---

## 2. Nuevas Funcionalidades

### EP-01 — Identity

#### Gestión del Ciclo de Vida de Usuario

Los Administradores de Tenant pueden crear, activar, suspender y hacer soft-delete
de cuentas de usuario. Todos los eventos del ciclo de vida se registran en el log
de auditoría inmutable.

- Entregado por: FS-01 — Registro de Usuario y Ciclo de Vida de Identidad
- Disponible para: Administrador de Tenant, Administrador del Sistema

#### Flujo de Login OIDC

Los usuarios se autentican vía el IdP configurado (Keycloak o Azure AD) a través
de un adaptador agnóstico al proveedor. Los tokens JWT portan el contexto de tenant
y se validan en cada request.

- Entregado por: FS-08 — Flujo de Login OIDC y Abstracción de IdP
- Disponible para: Todos los usuarios autenticados

### EP-02 — Authorization

#### Compilación del Grafo de Permisos

Los permisos efectivos se compilan en tiempo de resolución a partir de un grafo acíclico
dirigido de roles, plantillas y contexto organizacional. El Visual Graph Resolver permite
a los administradores inspeccionar los permisos efectivos de un usuario de forma interactiva.

- Entregado por: FS-02, FS-05
- Disponible para: Administrador de Tenant, Ingeniero de Seguridad

### EP-04 — Audit

#### Log de Auditoría Inmutable

Toda mutación de estado en el sistema — creación de usuario, asignación de rol, login,
resolución de permisos — se registra en una tabla de auditoría solo-append con esquema
estándar de 10 columnas. Los registros no pueden ser actualizados ni eliminados.

- Entregado por: FS-06 — Audit Trail Inmutable y Registro de Eventos
- Disponible para: Oficial de Compliance (API de consulta), Administrador del Sistema

---

## 3. Mejoras

| Área | Descripción |
|---|---|
| Latencia de resolución de permisos | DAG compilado en tiempo de resolución con cache Redis (TTL 300s). P95 < 12ms para orgs con hasta 200 roles. |
| Aislamiento de tenant | RLS de doble capa (EF Core + predicado SQL Server) activa en las 14 tablas en alcance. |

---

## 4. Cambios Incompatibles

Ninguno en este release (primera versión de producción).

---

## 5. Correcciones de Bugs

| Problema | Descripción | Severidad |
|---|---|:---:|
| PRB-021 | El token de invitación no vencía correctamente en límites de zona horaria | Alto |
| PRB-027 | La asignación de plantilla de rol tenía éxito silencioso para usuarios suspendidos | Medio |

---

## 6. Actualizaciones de Dependencias

| Paquete | Anterior | Actualizado | CVE Corregido |
|---|:---:|:---:|:---:|
| Microsoft.EntityFrameworkCore | 8.0.1 | 8.0.4 | N/A |
| Serilog.AspNetCore | 8.0.0 | 8.0.2 | N/A |

---

## 7. Instrucciones de Despliegue

### Prerrequisitos

- [ ] Instancia SQL Server 2022 provisionada con base de datos UMS y schemas `identity`, `authorization`, `configuration`, `audit`, `console`.
- [ ] `ASPNETCORE_ENVIRONMENT=Production` y `ConnectionStrings__UmsDb` establecidos en el entorno objetivo.
- [ ] Clúster Redis accesible en `REDIS_CONNECTION_STRING`.
- [ ] Endpoint OTel Collector configurado en `OTEL_EXPORTER_OTLP_ENDPOINT`.

### Pasos de Despliegue

1. Aplicar todas las migraciones EF Core pendientes:
   `dotnet ef database update --project src/Identity/UMS.Identity.Infrastructure`
   (repetir para proyectos de Authorization, Configuration, Audit, Console)
2. Desplegar imagen `ghcr.io/beyondnetcode/ums:0.1.0` vía Docker Compose o manifiesto de Kubernetes.
3. Verificar: `GET https://{host}/health` retorna `{"status":"Healthy"}`.
4. Confirmar que los spans OTel son visibles en Grafana: navegar al dashboard UMS Overview.

### Verificación Post-Despliegue

- [ ] El endpoint de salud retorna `200 OK`
- [ ] Crear un usuario de prueba desde la Consola Admin; verificar que aparece con estado Pendiente
- [ ] Completar el flujo de invitación; verificar que el estado cambia a Activo
- [ ] Trazas OTel visibles en Grafana — buscar por operación `RegisterUser`
- [ ] El log de auditoría muestra eventos `UserCreated` y `UserActivated` para el usuario de prueba

---

## 8. Procedimiento de Rollback

1. Revertir el despliegue al estado estable previo: `docker pull ghcr.io/beyondnetcode/ums:previous` o Helm rollback.
2. Las migraciones de base de datos para v0.1.0 son solo aditivas — no se requiere script de rollback para este release.
3. Notificar al Engineering Lead y abrir un issue `production-incident` en el repositorio de UMS.

---

## 9. Problemas Conocidos

| Problema | Descripción | Severidad | Solución Alternativa |
|---|---|:---:|---|
| PRB-014 | Visual Graph Resolver renderiza lento para orgs > 500 roles | Medio | Usar la API de consulta en lugar del renderer visual para orgs grandes |
| PRB-019 | API de consulta del audit log no tiene paginación cursor-based | Bajo | Usar parámetros `limit` y `offset`; máximo 1000 registros por consulta |

---

## 10. Checklist de Observabilidad

- [x] OTel collector recibiendo spans de los 5 bounded contexts (Identity, Authorization, Configuration, Audit, Console)
- [x] Dashboard Grafana "UMS Overview" muestra tasa de requests activa
- [x] Loki recibiendo logs estructurados con campos `correlation_id` y `tenant_id`
- [x] Trazas Tempo consultables por TraceID en la pestaña Explore
- [x] Reglas de alertas activas: tasa de error > 1%, P95 > 500ms, health check DOWN

---

## 11. Enlaces de Referencia

| Recurso | Enlace |
|---|---|
| Tag del release | https://github.com/beyondnetcode/ums/releases/tag/v0.1.0 |
| Ejecución del pipeline CI | https://github.com/beyondnetcode/ums/actions/runs/2041 |
| Reporte de Resumen de Testing | governance/qa/reporte-resumen-testing-v0.1.0-rc1.md |
| Dashboard de observabilidad | https://grafana.internal/d/ums-overview |
| Runbook | docs/operations/runbook-v0.1.0.md |
```

---

### Vista Previa

# Release Notes — UMS v0.1.0

> Fecha de release: 2026-04-05
> Tipo de release: Menor (primer release de producción)
> RC sellado: 2026-03-29
> Objetivo de despliegue: Producción
> Desplegado por: Pipeline GitHub Actions (automatizado)
> Versión de rollback: N/A (primer release)

---

## 1. Resumen del Release

UMS v0.1.0 entrega el MVP completo: gestión centralizada de identidad de usuario,
autorización RBAC/ABAC de grano fino con compilación de grafo de permisos,
configuración multi-tenant jerárquica, un audit trail inmutable y la consola
administrativa. Este release prueba los cinco patrones arquitectónicos Evolith
Fase 1 en código .NET 8 listo para producción.

---

## 2. Nuevas Funcionalidades

### EP-01 — Identity

#### Gestión del Ciclo de Vida de Usuario

Los Administradores de Tenant pueden crear, activar, suspender y hacer soft-delete
de cuentas de usuario. Todos los eventos del ciclo de vida se registran en el log
de auditoría inmutable.

- Entregado por: FS-01 — Registro de Usuario y Ciclo de Vida de Identidad
- Disponible para: Administrador de Tenant, Administrador del Sistema

#### Flujo de Login OIDC

Los usuarios se autentican vía el IdP configurado (Keycloak o Azure AD) a través
de un adaptador agnóstico al proveedor. Los tokens JWT portan el contexto de tenant
y se validan en cada request.

- Entregado por: FS-08 — Flujo de Login OIDC y Abstracción de IdP
- Disponible para: Todos los usuarios autenticados

### EP-02 — Authorization

#### Compilación del Grafo de Permisos

Los permisos efectivos se compilan en tiempo de resolución a partir de un grafo acíclico
dirigido de roles, plantillas y contexto organizacional. El Visual Graph Resolver permite
a los administradores inspeccionar los permisos efectivos de un usuario de forma interactiva.

- Entregado por: FS-02, FS-05
- Disponible para: Administrador de Tenant, Ingeniero de Seguridad

### EP-04 — Audit

#### Log de Auditoría Inmutable

Toda mutación de estado en el sistema — creación de usuario, asignación de rol, login,
resolución de permisos — se registra en una tabla de auditoría solo-append con esquema
estándar de 10 columnas. Los registros no pueden ser actualizados ni eliminados.

- Entregado por: FS-06 — Audit Trail Inmutable y Registro de Eventos
- Disponible para: Oficial de Compliance (API de consulta), Administrador del Sistema

---

## 3. Mejoras

| Área | Descripción |
|---|---|
| Latencia de resolución de permisos | DAG compilado en tiempo de resolución con cache Redis (TTL 300s). P95 < 12ms para orgs con hasta 200 roles. |
| Aislamiento de tenant | RLS de doble capa (EF Core + predicado SQL Server) activa en las 14 tablas en alcance. |

---

## 4. Cambios Incompatibles

Ninguno en este release (primera versión de producción).

---

## 5. Correcciones de Bugs

| Problema | Descripción | Severidad |
|---|---|:---:|
| PRB-021 | El token de invitación no vencía correctamente en límites de zona horaria | Alto |
| PRB-027 | La asignación de plantilla de rol tenía éxito silencioso para usuarios suspendidos | Medio |

---

## 6. Actualizaciones de Dependencias

| Paquete | Anterior | Actualizado | CVE Corregido |
|---|:---:|:---:|:---:|
| Microsoft.EntityFrameworkCore | 8.0.1 | 8.0.4 | N/A |
| Serilog.AspNetCore | 8.0.0 | 8.0.2 | N/A |

---

## 7. Instrucciones de Despliegue

### Prerrequisitos

- [ ] Instancia SQL Server 2022 provisionada con base de datos UMS y schemas `identity`, `authorization`, `configuration`, `audit`, `console`.
- [ ] `ASPNETCORE_ENVIRONMENT=Production` y `ConnectionStrings__UmsDb` establecidos en el entorno objetivo.
- [ ] Clúster Redis accesible en `REDIS_CONNECTION_STRING`.
- [ ] Endpoint OTel Collector configurado en `OTEL_EXPORTER_OTLP_ENDPOINT`.

### Pasos de Despliegue

1. Aplicar todas las migraciones EF Core pendientes:
   `dotnet ef database update --project src/Identity/UMS.Identity.Infrastructure`
   (repetir para proyectos de Authorization, Configuration, Audit, Console)
2. Desplegar imagen `ghcr.io/beyondnetcode/ums:0.1.0` vía Docker Compose o manifiesto de Kubernetes.
3. Verificar: `GET https://{host}/health` retorna `{"status":"Healthy"}`.
4. Confirmar que los spans OTel son visibles en Grafana: navegar al dashboard UMS Overview.

### Verificación Post-Despliegue

- [ ] El endpoint de salud retorna `200 OK`
- [ ] Crear un usuario de prueba desde la Consola Admin; verificar que aparece con estado Pendiente
- [ ] Completar el flujo de invitación; verificar que el estado cambia a Activo
- [ ] Trazas OTel visibles en Grafana — buscar por operación `RegisterUser`
- [ ] El log de auditoría muestra eventos `UserCreated` y `UserActivated` para el usuario de prueba

---

## 8. Procedimiento de Rollback

1. Revertir el despliegue al estado estable previo: `docker pull ghcr.io/beyondnetcode/ums:previous` o Helm rollback.
2. Las migraciones de base de datos para v0.1.0 son solo aditivas — no se requiere script de rollback para este release.
3. Notificar al Engineering Lead y abrir un issue `production-incident` en el repositorio de UMS.

---

## 9. Problemas Conocidos

| Problema | Descripción | Severidad | Solución Alternativa |
|---|---|:---:|---|
| PRB-014 | Visual Graph Resolver renderiza lento para orgs > 500 roles | Medio | Usar la API de consulta en lugar del renderer visual para orgs grandes |
| PRB-019 | API de consulta del audit log no tiene paginación cursor-based | Bajo | Usar parámetros `limit` y `offset`; máximo 1000 registros por consulta |

---

## 10. Checklist de Observabilidad

- [x] OTel collector recibiendo spans de los 5 bounded contexts (Identity, Authorization, Configuration, Audit, Console)
- [x] Dashboard Grafana "UMS Overview" muestra tasa de requests activa
- [x] Loki recibiendo logs estructurados con campos `correlation_id` y `tenant_id`
- [x] Trazas Tempo consultables por TraceID en la pestaña Explore
- [x] Reglas de alertas activas: tasa de error > 1%, P95 > 500ms, health check DOWN

---

## 11. Enlaces de Referencia

| Recurso | Enlace |
|---|---|
| Tag del release | https://github.com/beyondnetcode/ums/releases/tag/v0.1.0 |
| Ejecución del pipeline CI | https://github.com/beyondnetcode/ums/actions/runs/2041 |
| Reporte de Resumen de Testing | governance/qa/reporte-resumen-testing-v0.1.0-rc1.md |
| Dashboard de observabilidad | https://grafana.internal/d/ums-overview |
| Runbook | docs/operations/runbook-v0.1.0.md |

---

[Volver a Plantillas de Artefactos](./README.es.md)
