# Plantilla: Historia Funcional

> **Navegación bilingüe:** [English](./functional-story-template.md)
> **Fase:** 2 — Diseño y Arquitectura
> **Puerta de salida:** Baseline de Diseño Aprobada
> **Padre:** [Plantillas de Artefactos](./README.es.md)
> **Estándar normativo:** [Estándar de Escritura de Historias Funcionales](../03-documentation/functional-story-writing-standard.es.md)

---

## Acerca de Esta Plantilla

Una Historia Funcional describe una capacidad de negocio discreta. Se escribe de modo que un Product Owner pueda validar el comportamiento de negocio, y un ingeniero pueda implementarlo sin ambigüedad. Las dos preocupaciones están separadas: narrativa de negocio primero, restricciones técnicas al final.

La estructura siguiente está exigida por el [Estándar de Escritura de Historias Funcionales](../03-documentation/functional-story-writing-standard.es.md). No elimines ni reordenes las secciones.

---

## Sección 1 — Plantilla en Blanco

### Fuente — Copiar y pegar

```markdown
# FS-[NÚMERO]: [Título de la Historia Funcional]

> Estado: [Borrador | Revisada | Aprobada | Implementada | Deprecada]
> Épica: [EP-XX — Nombre de la Épica]
> Fase: [MVP | Post-MVP]
> Propietario: [Product Owner]
> Revisada por: [Tech Lead / Arquitecto]
> Fecha: [AAAA-MM-DD]

---

## 1. Propósito de Negocio

[¿Qué problema de negocio resuelve esta historia y por qué importa?
Escribe para un Product Owner. Sin términos técnicos.]

---

## 2. Actores

| Actor | Rol |
|---|---|
| **[Actor principal]** | [Su responsabilidad de negocio en esta historia] |
| **[Actor secundario]** | [Rol de apoyo, si aplica] |
| **Sistema** | [Qué hace el sistema de forma autónoma, si aplica] |

---

## 3. Precondiciones de Negocio

- [Condición 1: El actor ya debe existir en el sistema]
- [Condición 2: La configuración relevante debe estar activa]

---

## 4. Flujo Funcional Principal

1. [Paso 1: Actor inicia una acción — describir en lenguaje de negocio]
2. [Paso 2: El sistema valida o procesa]
3. [Paso 3: El sistema responde al actor]
4. [Paso 4: El estado se actualiza y el resultado es visible]

---

## 5. Flujos Alternativos y Excepciones

| Escenario | Disparador | Resultado para el Negocio |
|---|---|---|
| [Alt-01] | [Qué dispara esta alternativa] | [Qué experimenta el actor] |
| [Exc-01] | [Qué condición de error ocurre] | [Cómo informa el sistema al actor] |

---

## 6. Reglas de Negocio

- RN-01: [Regla en lenguaje sencillo — ej. "Un usuario no puede tener dos roles conflictivos simultáneamente."]
- RN-02: [Regla en lenguaje sencillo]

---

## 7. Criterios de Aceptación

- CA-01: [Resultado observable 1 — ej. "El administrador puede ver al nuevo usuario en la lista de usuarios del tenant."]
- CA-02: [Resultado observable 2]
- CA-03: [Caso borde — ej. "Si el correo ya está registrado, el usuario es informado sin crear un duplicado."]

---

## 8. Requerimientos Técnicos

> Esta sección es para ingeniería. Los Product Owners y Business Analysts
> no necesitan leer más allá de este punto.

### API / Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| [Método HTTP] | [/ruta] | [Qué hace] |

### Entidades y Tablas

| Entidad | Tabla | Columnas Clave |
|---|---|---|
| [NombreEntidad] | [schema.nombre_tabla] | [id, root_tenant_id, columnas relevantes] |

### Controles de Seguridad

- Autenticación: [Requerida / Opcional — tipo de token]
- Autorización: [Permiso o rol requerido]
- Multi-tenancy: [SESSION_CONTEXT establecido antes de la ejecución de cada query]
- Auditoría: [Nombre del evento de auditoría y disparador]

### Comportamiento de Caché

- [Patrón de clave de caché si aplica]
- [Disparador de invalidación]

### Eventos

| Evento | Publicado Cuando | Consumidor(es) |
|---|---|---|
| [NombreEvento] | [Condición disparadora] | [Contextos consumidores] |

---

## 9. Trazabilidad

| Tipo de Referencia | ID / Enlace |
|---|---|
| ADRs Rectores | [ADR-XXXX, ADR-YYYY] |
| Bounded Context | [EP-XX — Nombre del contexto] |
| Habilitadores Técnicos | [TE-XX — Nombre del habilitador] |
| Historias Técnicas | [TS-XXX hasta TS-XXX] |
| PRD Padre | [PRD: Nombre del Producto — enlace] |
```

---

### Vista Previa

# FS-[NÚMERO]: [Título de la Historia Funcional]

> Estado: [Borrador | Revisada | Aprobada | Implementada | Deprecada]
> Épica: [EP-XX — Nombre de la Épica]
> Fase: [MVP | Post-MVP]
> Propietario: [Product Owner]
> Revisada por: [Tech Lead / Arquitecto]
> Fecha: [AAAA-MM-DD]

---

## 1. Propósito de Negocio

[¿Qué problema de negocio resuelve esta historia y por qué importa?
Escribe para un Product Owner. Sin términos técnicos.]

---

## 2. Actores

| Actor | Rol |
|---|---|
| **[Actor principal]** | [Su responsabilidad de negocio en esta historia] |
| **[Actor secundario]** | [Rol de apoyo, si aplica] |
| **Sistema** | [Qué hace el sistema de forma autónoma, si aplica] |

---

## 3. Precondiciones de Negocio

- [Condición 1: El actor ya debe existir en el sistema]
- [Condición 2: La configuración relevante debe estar activa]

---

## 4. Flujo Funcional Principal

1. [Paso 1: Actor inicia una acción — describir en lenguaje de negocio]
2. [Paso 2: El sistema valida o procesa]
3. [Paso 3: El sistema responde al actor]
4. [Paso 4: El estado se actualiza y el resultado es visible]

---

## 5. Flujos Alternativos y Excepciones

| Escenario | Disparador | Resultado para el Negocio |
|---|---|---|
| [Alt-01] | [Qué dispara esta alternativa] | [Qué experimenta el actor] |
| [Exc-01] | [Qué condición de error ocurre] | [Cómo informa el sistema al actor] |

---

## 6. Reglas de Negocio

- RN-01: [Regla en lenguaje sencillo — ej. "Un usuario no puede tener dos roles conflictivos simultáneamente."]
- RN-02: [Regla en lenguaje sencillo]

---

## 7. Criterios de Aceptación

- CA-01: [Resultado observable 1 — ej. "El administrador puede ver al nuevo usuario en la lista de usuarios del tenant."]
- CA-02: [Resultado observable 2]
- CA-03: [Caso borde — ej. "Si el correo ya está registrado, el usuario es informado sin crear un duplicado."]

---

## 8. Requerimientos Técnicos

> Esta sección es para ingeniería. Los Product Owners y Business Analysts
> no necesitan leer más allá de este punto.

### API / Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| [Método HTTP] | [/ruta] | [Qué hace] |

### Entidades y Tablas

| Entidad | Tabla | Columnas Clave |
|---|---|---|
| [NombreEntidad] | [schema.nombre_tabla] | [id, root_tenant_id, columnas relevantes] |

### Controles de Seguridad

- Autenticación: [Requerida / Opcional — tipo de token]
- Autorización: [Permiso o rol requerido]
- Multi-tenancy: [SESSION_CONTEXT establecido antes de la ejecución de cada query]
- Auditoría: [Nombre del evento de auditoría y disparador]

### Comportamiento de Caché

- [Patrón de clave de caché si aplica]
- [Disparador de invalidación]

### Eventos

| Evento | Publicado Cuando | Consumidor(es) |
|---|---|---|
| [NombreEvento] | [Condición disparadora] | [Contextos consumidores] |

---

## 9. Trazabilidad

| Tipo de Referencia | ID / Enlace |
|---|---|
| ADRs Rectores | [ADR-XXXX, ADR-YYYY] |
| Bounded Context | [EP-XX — Nombre del contexto] |
| Habilitadores Técnicos | [TE-XX — Nombre del habilitador] |
| Historias Técnicas | [TS-XXX hasta TS-XXX] |
| PRD Padre | [PRD: Nombre del Producto — enlace] |

---

## Sección 2 — Ejemplo Completo

El siguiente es una Historia Funcional completa basada en UMS FS-01.

### Fuente — Copiar y pegar

```markdown
# FS-01: Registro de Usuario y Ciclo de Vida de Identidad

> Estado: Aprobada
> Épica: EP-01 — Identity
> Fase: MVP
> Propietario: Evolith Product Board
> Revisada por: UMS Tech Lead, Architecture Board
> Fecha: 2026-01-20

---

## 1. Propósito de Negocio

La organización necesita crear, activar, suspender y eliminar permanentemente
cuentas de usuario de forma gobernada y auditable. Sin esta capacidad, no existe
un registro confiable de quién tiene acceso a qué, ni un mecanismo para revocar
el acceso cuando un usuario sale o cambia de responsabilidades.

---

## 2. Actores

| Actor | Rol |
|---|---|
| **Administrador de Tenant** | Crea y gestiona usuarios dentro de su organización |
| **Administrador del Sistema** | Gestiona políticas globales de usuarios y operaciones cross-tenant |
| **Sistema** | Aplica políticas, dispara eventos, escribe registros de auditoría automáticamente |

---

## 3. Precondiciones de Negocio

- La organización del tenant ya debe existir en el sistema.
- El Administrador de Tenant debe estar autenticado y tener un rol administrativo activo.

---

## 4. Flujo Funcional Principal

1. El Administrador de Tenant proporciona el nombre, correo electrónico y rol inicial del nuevo usuario.
2. El sistema verifica que el correo no esté ya registrado dentro de la misma organización.
3. El sistema crea la cuenta de usuario en estado Pendiente y envía una invitación de activación.
4. El nuevo usuario activa su cuenta aceptando la invitación y estableciendo sus credenciales.
5. El sistema marca al usuario como Activo y el Administrador de Tenant lo ve en el directorio de la organización.

---

## 5. Flujos Alternativos y Excepciones

| Escenario | Disparador | Resultado para el Negocio |
|---|---|---|
| Alt-01: Correo duplicado | El correo ya existe en este tenant | Se informa al usuario que la dirección ya está registrada; no se crea duplicado |
| Alt-02: Vencimiento de invitación | La invitación no se acepta en 72 horas | La invitación vence; el Administrador puede reenviarla desde el panel de gestión de usuarios |
| Exc-01: Campo requerido faltante | No se proporciona nombre o correo | El formulario resalta los campos faltantes; el envío queda bloqueado |
| Exc-02: Formato de correo inválido | El correo no cumple RFC 5322 | Se informa al administrador que el formato del correo es inválido |

---

## 6. Reglas de Negocio

- RN-01: Cada dirección de correo debe ser única dentro de una organización.
- RN-02: Un usuario recién creado no tiene permisos hasta que un administrador asigne un rol explícitamente.
- RN-03: Un usuario Suspendido no puede autenticarse, pero sus datos de cuenta e historial de auditoría se preservan.
- RN-04: La cuenta de un usuario Eliminado sufre soft-delete; su historial de auditoría se retiene indefinidamente por compliance.

---

## 7. Criterios de Aceptación

- CA-01: Un Administrador de Tenant puede crear un nuevo usuario proporcionando nombre y correo; el usuario aparece en el directorio del tenant con estado "Pendiente".
- CA-02: Después de aceptar la invitación, el estado del usuario cambia a "Activo" y puede autenticarse.
- CA-03: Si el correo ya está registrado en el mismo tenant, el sistema informa al administrador sin crear un duplicado.
- CA-04: Un usuario Suspendido no puede iniciar sesión y recibe un mensaje informativo cuando lo intenta.
- CA-05: Cada evento del ciclo de vida (crear, activar, suspender, eliminar) es visible en el historial de auditoría de ese usuario.

---

## 8. Requerimientos Técnicos

### API / Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | /api/v1/users | Crear usuario (comando — REST, ADR-0032) |
| PATCH | /api/v1/users/{id}/status | Cambiar estado del ciclo de vida del usuario |
| GET | /api/v1/users/{id} | Leer perfil de usuario |
| DELETE | /api/v1/users/{id} | Soft-delete de usuario |
| GraphQL Query | users(tenantId, filters) | Listar usuarios con filtrado (proyección de lectura, ADR-0034) |

### Entidades y Tablas

| Entidad | Tabla | Columnas Clave |
|---|---|---|
| User | identity.users | id, root_tenant_id, email, display_name, status, created_at, created_by, tenant_id |
| UserInvitation | identity.user_invitations | id, root_tenant_id, user_id, token_hash, expires_at, status |

PK compuesta (id, root_tenant_id) en todas las tablas — ADR-0010, ADR-0054.

### Controles de Seguridad

- Autenticación: Bearer JWT requerido (ADR-0020). Los claims deben incluir tenant_id y sub.
- Autorización: Permiso `identity:users:write` requerido para operaciones de crear/actualizar/eliminar.
- Multi-tenancy: SESSION_CONTEXT establecido con tenant_id antes de cada ejecución de query (ADR-0010 TE-03).
- Auditoría: Eventos `UserCreated`, `UserActivated`, `UserSuspended`, `UserDeleted` escritos en audit.domain_events (ADR-0016).

### Comportamiento de Caché

- Perfil de usuario cacheado en Redis con clave `user:{tenant_id}:{user_id}` y TTL de 300 segundos.
- Caché invalidada ante cualquier cambio de estado o actualización de perfil.

### Eventos

| Evento | Publicado Cuando | Consumidor(es) |
|---|---|---|
| UserCreated | Registro de usuario persistido | EP-04 Audit, EP-02 Authorization (pre-calentamiento del grafo) |
| UserActivated | Invitación aceptada | EP-04 Audit, EP-06 Approvals (si se requiere inscripción MFA) |
| UserSuspended | Estado cambiado a Suspendido | EP-04 Audit, EP-02 Authorization (evicción del grafo de permisos) |

---

## 9. Trazabilidad

| Tipo de Referencia | ID / Enlace |
|---|---|
| ADRs Rectores | ADR-0010, ADR-0016, ADR-0020, ADR-0026, ADR-0031, ADR-0032, ADR-0034, ADR-0054 |
| Bounded Context | EP-01 — Identity |
| Habilitadores Técnicos | TE-01 (Flujo JWT/OIDC), TE-03 (Provisionamiento Tenant + RLS), TE-04 (Transactional Outbox) |
| Historias Técnicas | TS-001 hasta TS-007 |
| PRD Padre | PRD: User Management System (UMS) — MVP |
```

---

### Vista Previa

# FS-01: Registro de Usuario y Ciclo de Vida de Identidad

> Estado: Aprobada
> Épica: EP-01 — Identity
> Fase: MVP
> Propietario: Evolith Product Board
> Revisada por: UMS Tech Lead, Architecture Board
> Fecha: 2026-01-20

---

## 1. Propósito de Negocio

La organización necesita crear, activar, suspender y eliminar permanentemente
cuentas de usuario de forma gobernada y auditable. Sin esta capacidad, no existe
un registro confiable de quién tiene acceso a qué, ni un mecanismo para revocar
el acceso cuando un usuario sale o cambia de responsabilidades.

---

## 2. Actores

| Actor | Rol |
|---|---|
| **Administrador de Tenant** | Crea y gestiona usuarios dentro de su organización |
| **Administrador del Sistema** | Gestiona políticas globales de usuarios y operaciones cross-tenant |
| **Sistema** | Aplica políticas, dispara eventos, escribe registros de auditoría automáticamente |

---

## 3. Precondiciones de Negocio

- La organización del tenant ya debe existir en el sistema.
- El Administrador de Tenant debe estar autenticado y tener un rol administrativo activo.

---

## 4. Flujo Funcional Principal

1. El Administrador de Tenant proporciona el nombre, correo electrónico y rol inicial del nuevo usuario.
2. El sistema verifica que el correo no esté ya registrado dentro de la misma organización.
3. El sistema crea la cuenta de usuario en estado Pendiente y envía una invitación de activación.
4. El nuevo usuario activa su cuenta aceptando la invitación y estableciendo sus credenciales.
5. El sistema marca al usuario como Activo y el Administrador de Tenant lo ve en el directorio de la organización.

---

## 5. Flujos Alternativos y Excepciones

| Escenario | Disparador | Resultado para el Negocio |
|---|---|---|
| Alt-01: Correo duplicado | El correo ya existe en este tenant | Se informa al usuario que la dirección ya está registrada; no se crea duplicado |
| Alt-02: Vencimiento de invitación | La invitación no se acepta en 72 horas | La invitación vence; el Administrador puede reenviarla desde el panel de gestión de usuarios |
| Exc-01: Campo requerido faltante | No se proporciona nombre o correo | El formulario resalta los campos faltantes; el envío queda bloqueado |
| Exc-02: Formato de correo inválido | El correo no cumple RFC 5322 | Se informa al administrador que el formato del correo es inválido |

---

## 6. Reglas de Negocio

- RN-01: Cada dirección de correo debe ser única dentro de una organización.
- RN-02: Un usuario recién creado no tiene permisos hasta que un administrador asigne un rol explícitamente.
- RN-03: Un usuario Suspendido no puede autenticarse, pero sus datos de cuenta e historial de auditoría se preservan.
- RN-04: La cuenta de un usuario Eliminado sufre soft-delete; su historial de auditoría se retiene indefinidamente por compliance.

---

## 7. Criterios de Aceptación

- CA-01: Un Administrador de Tenant puede crear un nuevo usuario proporcionando nombre y correo; el usuario aparece en el directorio del tenant con estado "Pendiente".
- CA-02: Después de aceptar la invitación, el estado del usuario cambia a "Activo" y puede autenticarse.
- CA-03: Si el correo ya está registrado en el mismo tenant, el sistema informa al administrador sin crear un duplicado.
- CA-04: Un usuario Suspendido no puede iniciar sesión y recibe un mensaje informativo cuando lo intenta.
- CA-05: Cada evento del ciclo de vida (crear, activar, suspender, eliminar) es visible en el historial de auditoría de ese usuario.

---

## 8. Requerimientos Técnicos

### API / Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | /api/v1/users | Crear usuario (comando — REST, ADR-0032) |
| PATCH | /api/v1/users/{id}/status | Cambiar estado del ciclo de vida del usuario |
| GET | /api/v1/users/{id} | Leer perfil de usuario |
| DELETE | /api/v1/users/{id} | Soft-delete de usuario |
| GraphQL Query | users(tenantId, filters) | Listar usuarios con filtrado (proyección de lectura, ADR-0034) |

### Entidades y Tablas

| Entidad | Tabla | Columnas Clave |
|---|---|---|
| User | identity.users | id, root_tenant_id, email, display_name, status, created_at, created_by, tenant_id |
| UserInvitation | identity.user_invitations | id, root_tenant_id, user_id, token_hash, expires_at, status |

PK compuesta (id, root_tenant_id) en todas las tablas — ADR-0010, ADR-0054.

### Controles de Seguridad

- Autenticación: Bearer JWT requerido (ADR-0020). Los claims deben incluir tenant_id y sub.
- Autorización: Permiso `identity:users:write` requerido para operaciones de crear/actualizar/eliminar.
- Multi-tenancy: SESSION_CONTEXT establecido con tenant_id antes de cada ejecución de query (ADR-0010 TE-03).
- Auditoría: Eventos `UserCreated`, `UserActivated`, `UserSuspended`, `UserDeleted` escritos en audit.domain_events (ADR-0016).

### Comportamiento de Caché

- Perfil de usuario cacheado en Redis con clave `user:{tenant_id}:{user_id}` y TTL de 300 segundos.
- Caché invalidada ante cualquier cambio de estado o actualización de perfil.

### Eventos

| Evento | Publicado Cuando | Consumidor(es) |
|---|---|---|
| UserCreated | Registro de usuario persistido | EP-04 Audit, EP-02 Authorization (pre-calentamiento del grafo) |
| UserActivated | Invitación aceptada | EP-04 Audit, EP-06 Approvals (si se requiere inscripción MFA) |
| UserSuspended | Estado cambiado a Suspendido | EP-04 Audit, EP-02 Authorization (evicción del grafo de permisos) |

---

## 9. Trazabilidad

| Tipo de Referencia | ID / Enlace |
|---|---|
| ADRs Rectores | ADR-0010, ADR-0016, ADR-0020, ADR-0026, ADR-0031, ADR-0032, ADR-0034, ADR-0054 |
| Bounded Context | EP-01 — Identity |
| Habilitadores Técnicos | TE-01 (Flujo JWT/OIDC), TE-03 (Provisionamiento Tenant + RLS), TE-04 (Transactional Outbox) |
| Historias Técnicas | TS-001 hasta TS-007 |
| PRD Padre | PRD: User Management System (UMS) — MVP |

---

[Volver a Plantillas de Artefactos](./README.es.md)
