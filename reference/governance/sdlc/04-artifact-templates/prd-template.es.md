# Plantilla: Documento de Requisitos de Producto (PRD)

> **Navegación bilingüe:** [English](./prd-template.md)
> **Fase:** 1 — Concepción y Descubrimiento
> **Puerta de salida:** Aprobación de Negocio (Alcance Congelado)
> **Padre:** [Plantillas de Artefactos](./README.es.md)

---

## Acerca de Esta Plantilla

Un PRD define qué debe lograr el producto y para quién, antes de que comience cualquier trabajo de diseño o arquitectura. Es el contrato de negocio que ancla todos los artefactos posteriores. El Architecture Board debe aprobar este documento antes de que comience la Fase 2.

---

## Sección 1 — Plantilla en Blanco

Copia la estructura siguiente en tu nuevo archivo PRD. Reemplaza cada `[PLACEHOLDER]`.

---

```markdown
# PRD: [Nombre del Producto o Funcionalidad]

> Estado: [Borrador | En Revisión | Aprobado | Supersedido]
> Versión: [ej. 1.0.0]
> Propietario: [Nombre y rol del Product Owner]
> Aprobado por: [Architecture Board / nombre del Sponsor — dejar en blanco hasta firma]
> Fecha: [AAAA-MM-DD]

---

## 1. Planteamiento del Problema

[Describe el problema de negocio que este producto resuelve. Máximo 3–5 oraciones.
No menciones tecnología. Enfócate en el dolor, la audiencia y el costo de no resolverlo.]

---

## 2. Objetivos de Negocio

| Objetivo | Resultado Clave | Método de Medición |
|---|---|---|
| [Objetivo 1] | [Resultado medible] | [Cómo se medirá] |
| [Objetivo 2] | [Resultado medible] | [Cómo se medirá] |

---

## 3. Personas de Usuario

| Persona | Descripción del Rol | Objetivo Principal | Punto de Dolor |
|---|---|---|---|
| [Nombre de persona] | [Rol en el negocio] | [Qué quiere lograr] | [Qué actualmente lo impide] |

---

## 4. Alcance

### En Alcance (MVP)

- [Funcionalidad o capacidad 1]
- [Funcionalidad o capacidad 2]

### En Alcance (Post-MVP)

- [Funcionalidad o capacidad 3]
- [Funcionalidad o capacidad 4]

### Fuera de Alcance

- [Capacidad explícitamente excluida 1]
- [Capacidad explícitamente excluida 2]

---

## 5. Métricas de Éxito

| Métrica | Línea Base | Objetivo | Ventana de Medición |
|---|---|---|---|
| [Nombre de métrica] | [Estado actual o N/A] | [Valor objetivo] | [ej. 90 días post-lanzamiento] |

---

## 6. Restricciones y Dependencias

| Tipo | Descripción |
|---|---|
| **Regulatorio** | [Restricciones de cumplimiento: GDPR, ISO 27001, sectoriales] |
| **Técnico** | [Restricciones de plataforma, límites del stack tecnológico aprobado] |
| **Temporal** | [Fechas límite inamovibles o ventanas de mercado] |
| **Equipo** | [Tamaño del equipo, brechas de contratación, dependencias externas] |

---

## 7. Índice de Historias Funcionales

Lista las Historias Funcionales que se escribirán para implementar este PRD.
Las historias se escriben por separado usando la [Plantilla de Historia Funcional](./functional-story-template.es.md).

| ID | Título | Fase | Prioridad |
|---|---|---|---|
| FS-01 | [Título de la historia] | MVP | Alta |
| FS-02 | [Título de la historia] | MVP | Alta |

---

## 8. Restricciones Arquitectónicas

[Referencia los artefactos Evolith que enmarcan la arquitectura de este producto.
No diseñes la arquitectura aquí — eso corresponde a la Fase 2.]

- Topología: [Monolito Modular per ADR-0047]
- Stack: [Conforme con el Stack Tecnológico Autorizado]
- Multi-tenancy: [Sí/No — si sí, aplica ADR-0010]
- Preparación para extracción: [Fase objetivo para posible extracción a microservicio]

---

## 9. Preguntas Abiertas

| Pregunta | Responsable | Fecha Objetivo de Resolución |
|---|---|---|
| [Pregunta 1] | [Nombre] | [AAAA-MM-DD] |

---

## 10. Aprobaciones

| Rol | Nombre | Fecha | Estado |
|---|---|---|---|
| Product Owner | | | Pendiente |
| Architecture Board | | | Pendiente |
| Engineering Lead | | | Pendiente |
| Sponsor | | | Pendiente |
```

---

## Sección 2 — Ejemplo Completo

El siguiente es un PRD completo usando el producto de referencia UMS.

---

```markdown
# PRD: User Management System (UMS) — MVP

> Estado: Aprobado
> Versión: 1.0.0
> Propietario: Evolith Product Board
> Aprobado por: Evolith Architecture Board — 2026-01-15
> Fecha: 2026-01-15

---

## 1. Planteamiento del Problema

El software empresarial falla consistentemente en proveer un enfoque gobernado,
auditable y seguro a nivel de tenant para la gestión de identidad de usuarios,
autorización y control de acceso. Los permisos están dispersos en aplicaciones
individuales, los audit trails son incompletos y la gestión de roles es manual,
creando deuda de seguridad acumulativa a escala. UMS existe para resolver los
cinco modos de fallo simultáneamente en un único producto arquitectónicamente
disciplinado.

---

## 2. Objetivos de Negocio

| Objetivo | Resultado Clave | Método de Medición |
|---|---|---|
| Centralizar la gobernanza de identidad | 100% de la autenticación de usuarios enrutada a través de la capa de abstracción IdP | Log de eventos de login en auditoría |
| Eliminar duplicación de permisos | Cero aplicaciones manteniendo sus propias tablas de permisos post-migración | Revisión de arquitectura |
| Alcanzar completitud de auditoría | Toda mutación de estado registrada en el log inmutable de auditoría | Reporte de cobertura del log |
| Probar patrones Evolith Fase 1 | Los 57+ ADRs Evolith ejercidos en código en ejecución al cierre del Post-MVP | Matriz de trazabilidad ADR |

---

## 3. Personas de Usuario

| Persona | Descripción del Rol | Objetivo Principal | Punto de Dolor |
|---|---|---|---|
| Administrador del Sistema | Gestiona la instalación de UMS, configuración de tenants y topología del sistema | Configurar tenants y gestionar salud del sistema | Sin panel de control centralizado — cada configuración está en un sistema diferente |
| Administrador de Tenant | Gestiona usuarios, roles y permisos dentro de su organización | Asignar roles y gestionar el acceso para su org | La gestión de roles es manual y carece de flujos de aprobación |
| Usuario Final | Sujeto de la gestión de identidad y acceso | Acceder a los sistemas que está autorizado a usar | No puede ver por qué fue denegado ni apelar una decisión |
| Oficial de Compliance | Audita patrones de acceso y aplica requisitos regulatorios | Generar reportes de acceso y verificar asignaciones de roles | Los datos de auditoría están fragmentados en múltiples sistemas |
| Ingeniero de Seguridad | Revisa políticas de autorización y monitorea accesos anómalos | Validar que ningún usuario tiene permisos excesivos | Sin visibilidad de permisos efectivos en todos los contextos |

---

## 4. Alcance

### En Alcance (MVP — EP-01 a EP-05)

- Gestión del ciclo de vida de usuario (creación, activación, suspensión, eliminación)
- Autorización RBAC/ABAC con compilación del grafo de permisos
- Configuración multi-tenant jerárquica (ENV > SYSTEM > TENANT)
- Log de auditoría inmutable con esquema estándar de 10 columnas
- Consola administrativa para gestión de tenants y usuarios

### En Alcance (Post-MVP — EP-06 a EP-08)

- Scoring de riesgo MFA adaptivo y flujos de aprobación (EP-06)
- Gestión de documentos de compliance y aplicación de vencimientos (EP-07)
- Ciclo de vida de promoción de roles IGA con Role Maturity Model (EP-08)

### Fuera de Alcance

- Procesamiento de pagos o gestión de facturación
- Gestión de contenido o almacenamiento de documentos no relacionado con compliance
- Aplicaciones cliente móviles nativas
- Despliegues single-tenant sin infraestructura multi-tenancy

---

## 5. Métricas de Éxito

| Métrica | Línea Base | Objetivo | Ventana de Medición |
|---|---|---|---|
| Centralización de autenticación | 0% | 100% de logins a través de abstracción IdP | 30 días post-MVP |
| Cobertura del log de auditoría | 0 eventos | 100% de mutaciones de estado registradas | Continuo |
| Cobertura de código | N/A | >= 70% (puerta Manifiesto de Ingeniería) | Cada sprint |
| Índice de Agnosticismo (PI) | N/A | >= 5.0 al completar MVP | Release MVP |

---

## 6. Restricciones y Dependencias

| Tipo | Descripción |
|---|---|
| **Regulatorio** | Requisitos de soberanía de datos GDPR aplican a todo PII de usuarios. Controles ISO/IEC 27001:2022 deben mapearse para la Fase 3. |
| **Técnico** | .NET 8, SQL Server 2022, EF Core 8. Toda tecnología debe cumplir con el Stack Tecnológico Autorizado. |
| **Temporal** | Objetivo MVP: 6–7 semanas desde Sprint 0. Producto completo: 14–17 semanas. Objetivo producción: Q3 2026. |
| **Equipo** | 6.25 FTE equipo MVP. 2 brechas de contratación identificadas: Senior Security Engineer, Senior QA/SDET. |

---

## 7. Índice de Historias Funcionales

| ID | Título | Fase | Prioridad |
|---|---|---|---|
| FS-01 | Registro de Usuario y Ciclo de Vida de Identidad | MVP | Alta |
| FS-02 | Asignación de Roles y Gestión de Plantillas RBAC | MVP | Alta |
| FS-03 | Provisionamiento de Organización Multi-Tenant | MVP | Alta |
| FS-04 | Jerarquía de Configuración y Resolución de Tenant | MVP | Alta |
| FS-05 | Compilación del Grafo de Permisos y Visual Resolver | MVP | Alta |
| FS-06 | Audit Trail Inmutable y Registro de Eventos | MVP | Alta |
| FS-07 | Consola Administrativa y Dashboard de Tenant | MVP | Media |
| FS-08 | Flujo de Login OIDC y Abstracción de IdP | MVP | Alta |
| FS-09 | MFA Adaptivo y Autenticación Basada en Riesgo | Post-MVP | Alta |
| FS-10 | Acceso Externo B2B y Provisionamiento de Invitados | Post-MVP | Media |
| FS-11 | Carga de Documentos de Compliance y Seguimiento de Vencimientos | Post-MVP | Media |
| FS-12 | Ciclo de Vida de Promoción de Roles IGA | Post-MVP | Alta |
| FS-13 | Proyecciones CQRS y API de Consulta de Permisos | MVP | Media |
| FS-14 | Administración Delegada con Permisos Acotados | Post-MVP | Alta |
| FS-15 | Notificaciones de Vencimiento de Compliance | Post-MVP | Media |
| FS-16 | Aplicación de Acceso Basada en Estado de Compliance | Post-MVP | Alta |

---

## 8. Restricciones Arquitectónicas

- Topología: Monolito Modular per ADR-0047. Sin extracción a microservicios hasta que se cumplan los criterios de ADR-0045.
- Stack: .NET 8, C# 12, EF Core 8, SQL Server 2022. Conforme con el Stack Tecnológico Autorizado.
- Multi-tenancy: Sí — RLS de doble capa requerida (ADR-0010). PK compuesta (id, root_tenant_id) en cada tabla.
- Preparación para extracción: Solo Fase 1. EP-02 (Authorization) es el primer candidato de extracción en Fase 2.

---

## 9. Preguntas Abiertas

| Pregunta | Responsable | Fecha Objetivo |
|---|---|---|
| Selección de IdP: ¿Keycloak o Azure AD como default? | Architecture Board | 2026-02-01 |
| Activación de Dapr: ¿Fase 2 o diferir a Fase 3? | Tech Lead | 2026-02-15 |

---

## 10. Aprobaciones

| Rol | Nombre | Fecha | Estado |
|---|---|---|---|
| Product Owner | Evolith Product Board | 2026-01-15 | Aprobado |
| Architecture Board | Evolith Architecture Board | 2026-01-15 | Aprobado |
| Engineering Lead | UMS Tech Lead | 2026-01-20 | Aprobado |
| Sponsor | Evolith Executive Sponsor | 2026-01-15 | Aprobado |
```

---

[Volver a Plantillas de Artefactos](./README.es.md)
