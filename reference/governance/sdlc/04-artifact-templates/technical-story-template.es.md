# Plantilla: Historia Técnica

> **Navegación bilingüe:** [English](./technical-story-template.md)
> **Fase:** 3 — Construcción
> **Puerta de salida:** Build Exitoso (Merge de PR Autorizado)
> **Padre:** [Plantillas de Artefactos](./README.es.md)

---

## Acerca de Esta Plantilla

Una Historia Técnica es un ítem de trabajo orientado a ingeniería, derivado de una o más Historias Funcionales. Describe qué debe construirse, a nivel de implementación, para satisfacer un requerimiento técnico específico. Las Historias Técnicas nunca se muestran a los Product Owners; son la unidad de planificación de sprint y alcance de pull request para los ingenieros.

Reglas clave:
- Toda Historia Técnica debe trazar a al menos una Historia Funcional.
- Una Historia Técnica debe poder entregarse en un sprint sin dependencias externas.
- El esfuerzo se estima en story points usando la escala Fibonacci (1, 2, 3, 5, 8, 13).
- Los criterios de aceptación son técnicos y verificables en CI (los tests deben pasar, el build debe compilar).

---

## Sección 1 — Plantilla en Blanco

```markdown
# TS-[NÚMERO]: [Título de la Historia Técnica]

> Estado: [Backlog | En Progreso | En Revisión | Hecha]
> FS Padre: [FS-XX — Título de la Historia Funcional]
> Épica: [EP-XX — Nombre de la Épica]
> Fase: [MVP | Post-MVP]
> Esfuerzo: [N story points]
> Asignado: [Nombre del desarrollador o rol del equipo]
> Sprint: [Número de sprint o TBD]

---

## 1. Objetivo Técnico

[Un párrafo describiendo qué construye esta historia, a nivel de implementación.
Referencia la capa específica (Dominio, Aplicación, Infraestructura, API) que se modifica.
Indica qué ADR rige esta implementación.]

---

## 2. Precondiciones Técnicas

- [TS-XXX debe completarse primero: razón]
- [La migración de base de datos X debe estar aplicada]
- [La variable de entorno X debe estar configurada]

---

## 3. Tareas de Implementación

- [ ] [Tarea 1: ej. Crear aggregate `User` con método factory `Register` en `Identity.Domain`]
- [ ] [Tarea 2: ej. Implementar interfaz de puerto `IUserRepository` en `Identity.Application`]
- [ ] [Tarea 3: ej. Implementar adaptador `SqlUserRepository` en `Identity.Infrastructure`]
- [ ] [Tarea 4: ej. Escribir unit tests para aggregate y caso de uso en `Identity.Tests.Unit`]
- [ ] [Tarea 5: ej. Escribir test de integración con Testcontainers en `Identity.Tests.Integration`]
- [ ] [Tarea 6: ej. Actualizar spec OpenAPI o ADR si la decisión es nueva]

---

## 4. Criterios de Aceptación Técnicos

- CAT-01: [Todos los unit tests pasan con >= 80% de cobertura en los nuevos paths de código]
- CAT-02: [Test de integración con Testcontainers ejercita el happy path y un path de error]
- CAT-03: [Pipeline CI pasa — linting, análisis estático, umbrales de test]
- CAT-04: [Sin imports de capas externas en las capas de Dominio o Aplicación]
- CAT-05: [Span OTel creado para el handler del caso de uso con correlation ID propagado]

---

## 5. Checklist de Definición de Terminado

- [ ] El código compila sin advertencias
- [ ] Todos los tests automatizados pasan localmente y en CI
- [ ] Cobertura de código >= 80% en los nuevos paths
- [ ] Cero CVEs HIGH/CRITICAL introducidos (dotnet audit / npm audit)
- [ ] Al menos una aprobación de revisión por pares recibida
- [ ] OpenAPI / ADR actualizados si aplica
- [ ] Delta de documentación commiteado junto al código

---

## 6. Trazabilidad

| Tipo de Referencia | ID / Enlace |
|---|---|
| Historia Funcional Padre | [FS-XX — Título] |
| ADRs Rectores | [ADR-XXXX, ADR-YYYY] |
| Habilitador Técnico | [TE-XX — Nombre del habilitador, si aplica] |
| Bounded Context | [EP-XX — Nombre del contexto] |
| Historias Técnicas Relacionadas | [TS-XXX (debe preceder), TS-YYY (debe seguir)] |
```

---

## Sección 2 — Ejemplo Completo

El siguiente es una Historia Técnica completa derivada de UMS FS-01.

---

```markdown
# TS-003: Implementar Aggregate User y Caso de Uso RegisterUser

> Estado: Hecha
> FS Padre: FS-01 — Registro de Usuario y Ciclo de Vida de Identidad
> Épica: EP-01 — Identity
> Fase: MVP
> Esfuerzo: 5 story points
> Asignado: Senior Backend Developer
> Sprint: Sprint 1

---

## 1. Objetivo Técnico

Implementar el aggregate root `User` en el proyecto `Identity.Domain`, incluyendo el
método factory `Register` y los eventos de dominio (`UserCreated`, `UserActivated`).
Implementar el handler de aplicación `RegisterUserUseCase` en `Identity.Application`,
consumiendo el puerto `IUserRepository` y publicando eventos vía el puerto `IEventBus`.
Ambas capas deben tener cero imports de infraestructura conforme al ADR-0002
(Arquitectura Hexagonal). El aggregate y el caso de uso están gobernados por
ADR-0002 y ADR-0016 (Audit Trail Inmutable).

---

## 2. Precondiciones Técnicas

- TS-001 (Estructura del proyecto y scaffolding de solución) debe estar completada.
- TS-002 (Migración de base de datos para tabla `identity.users` con PK compuesta) debe estar aplicada.
- La interfaz de puerto `IUserRepository` ya está definida en `Identity.Application/Ports/`.

---

## 3. Tareas de Implementación

- [ ] Crear clase `User` en `Identity.Domain/Aggregates/` extendiendo `AggregateRoot<UserId>`
- [ ] Agregar factory estática `Register(email, displayName, tenantId)` — valida formato de correo, aplica RN-01 (correo único)
- [ ] Disparar evento de dominio `UserCreated` en el método factory
- [ ] Agregar método `Activate()` — valida transición de estado de Pendiente a Activo; dispara `UserActivated`
- [ ] Agregar métodos `Suspend()` y `SoftDelete()` con guards de estado apropiados
- [ ] Implementar `RegisterUserUseCase` en `Identity.Application/UseCases/`
- [ ] Inyectar `IUserRepository` e `IEventBus` vía constructor (Inversión de Dependencias)
- [ ] Agregar verificación `IUserRepository.ExistsWithEmail(email, tenantId)` antes de persistir
- [ ] Escribir unit tests: happy path, correo duplicado, formato de correo inválido, guards de transición de estado
- [ ] Escribir test de integración (Testcontainers): `RegisterUserUseCase` persiste en SQL Server y publica evento
- [ ] Verificar que no existen imports de infraestructura en `Identity.Domain` ni en `Identity.Application`

---

## 4. Criterios de Aceptación Técnicos

- CAT-01: `User.Register()` dispara un evento de dominio `UserCreated` con tenant_id, user_id y timestamp correctos.
- CAT-02: `RegisterUserUseCase` retorna `Result<UserId, DomainError>` — nunca lanza una excepción.
- CAT-03: El test de integración confirma que una fila persiste en `identity.users` con `root_tenant_id` correcto.
- CAT-04: `Identity.Domain.csproj` no tiene referencia a ningún paquete de ORM, HTTP o infraestructura.
- CAT-05: Una actividad OTel con nombre `RegisterUser` se crea con atributos `user.id` y `tenant.id`.
- CAT-06: Cobertura de código para `Identity.Domain` >= 90%.

---

## 5. Checklist de Definición de Terminado

- [x] El código compila sin advertencias
- [x] Todos los tests automatizados pasan localmente y en CI
- [x] Cobertura de código >= 80% en nuevos paths (Identity.Domain: 92%, Identity.Application: 85%)
- [x] Cero CVEs HIGH/CRITICAL introducidos (dotnet audit limpio)
- [x] Aprobación de revisión por pares del Tech Lead recibida (2026-02-10)
- [x] Sin nuevo ADR requerido — decisión cubierta por ADR-0002 y ADR-0016
- [x] Comentarios de doc XML agregados a los métodos públicos del aggregate

---

## 6. Trazabilidad

| Tipo de Referencia | ID / Enlace |
|---|---|
| Historia Funcional Padre | FS-01 — Registro de Usuario y Ciclo de Vida de Identidad |
| ADRs Rectores | ADR-0002 (Arquitectura Hexagonal), ADR-0016 (Audit Trail Inmutable), ADR-0038 (Patrón Result) |
| Habilitador Técnico | TE-03 — Provisionamiento Tenant + RLS |
| Bounded Context | EP-01 — Identity |
| Historias Técnicas Relacionadas | TS-001 (precede), TS-002 (precede), TS-004 (sigue: adaptador SQL), TS-005 (sigue: endpoint REST) |
```

---

[Volver a Plantillas de Artefactos](./README.es.md)
