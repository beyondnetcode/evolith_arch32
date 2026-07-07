# PRD — User Management System (UMS)

<p align="right">
  <img src="https://img.shields.io/badge/Evolith%20Core-PRD%20User%20Management%20System-003c6b?style=for-the-badge&logoColor=white" alt="Evolith Core">
  <img src="https://img.shields.io/badge/Versión-1.0.0-27ae60?style=flat-square" alt="Versión">
  <img src="https://img.shields.io/badge/Estado-Aprobado-27ae60?style=flat-square" alt="Estado">
  <img src="https://img.shields.io/badge/Alcance-Solo%20Funcional-8e44ad?style=flat-square" alt="Solo Funcional">
</p>

> **Fase:** 1 — Concepción y Descubrimiento
> **Alcance del documento:** Este PRD describe **únicamente requisitos funcionales y de negocio**. Las decisiones técnicas (stack, arquitectura, protocolos de integración, diagramas de infraestructura) viven en los artefactos de arquitectura y ADRs, no aquí.

---

## 1. Metadatos

- **Identificador:** `PRD-UMS-001`
- **Producto:** User Management System (UMS)
- **Versión:** 1.0.0
- **Estado:** Aprobado
- **Autor(es):** Evolith Product Board
- **Aprobador de Negocio:** Evolith Architecture Board
- **Fecha de Aprobación:** 2026-01-15

## 2. Resumen Ejecutivo

### 2.1 Declaración del Problema

El software empresarial frecuentemente carece de un enfoque gobernado, auditable y tenant-aware para identidad, autorización y control de acceso. Los permisos están dispersos entre aplicaciones, los audit trails son incompletos y la gestión de roles es manual. Sin una capa centralizada de identidad, cada producto implementa su propia solución, generando duplicación, inconsistencias y riesgos de seguridad.

### 2.2 Solución Propuesta

El **User Management System (UMS)** centraliza el gobierno de identidad y ejercita los estándares arquitectónicos de Evolith. Proporciona gestión de ciclo de vida de usuarios, autorización RBAC/ABAC tenant-aware, log de auditoría inmutable y una consola administrativa para gestión de tenants y usuarios.

### 2.3 Alcance del MVP

El MVP cubre las siguientes funcionalidades:

| Categoría | Funcionalidades |
| :-------- | :-------------- |
| **Gestión de Identidad** | Registro de usuarios, autenticación, ciclo de vida (activo/inactivo) |
| **Autorización** | RBAC/ABAC tenant-aware, asignación de roles y permisos |
| **Auditoría** | Log inmutable de todas las mutaciones de estado |
| **Administración** | Consola para gestión de tenants, usuarios y monitoreo de salud |

### 2.4 Beneficios Esperados

| Beneficio | Valor Esperado |
| :-------- | :------------- |
| Centralización de identidad | 100% de autenticaciones enrutadas por la capa gobernada |
| Eliminación de duplicación | Cero tablas locales de permisos post-migración |
| Auditabilidad completa | Toda mutación de estado capturada en log inmutable |

### 2.5 Fases de Entrega

| Fase | Entregable | Horizonte |
| :--- | :--------- | :-------- |
| **Fase 1 — MVP** | Gestión de identidad, RBAC, auditoría, consola admin | Q1 2026 |
| **Fase 2 — Integración** | Integración con marketplaces externos, SSO federation | Q3 2026 |
| **Fase 3 — Avanzado** | ABAC completo, políticas dinámicas, analytics de acceso | Q1 2027 |

## 3. Contexto y Problema

### 3.1 Contexto Actual

- **Operación actual:** Cada producto del ecosistema Evolith implementa su propia gestión de usuarios y permisos. No existe un plano de control centralizado. Los audit trails son incompletos y la gestión de roles es manual.
- **Tiempo promedio de configuración de acceso:** {X} horas desde solicitud hasta acceso activo
- **Tasa de errores:** {X}% de asignaciones de permisos presentan inconsistencias
- **Volumen de tenants:** {X} tenants activos con {Y} usuarios promedio

### 3.2 Problema Identificado

| Problema | Impacto | Consecuencia Operativa |
| :------- | :------ | :--------------------- |
| **Sin gobierno centralizado** | Permisos dispersos entre productos | Duplicación, inconsistencias, riesgos de seguridad |
| **Audit trails incompletos** | No se puede rastrear quién hizo qué cambio | Incumplimiento de compliance, imposibilidad de auditorías |
| **Gestión manual de roles** | Asignación y revocación de acceso manual | Retrasos, errores humanos, acceso excesivo |
| **Sin trazabilidad de accesos** | No se conoce el patrón de uso de permisos | Imposible detectar accesos anómalos o no autorizados |

### 3.3 Impacto Estimado

| Métrica | Valor Estimado | Nota |
| :------ | :------------- | :--- |
| Horas/hombre en configuración de acceso | {X} horas/mes | Asignación y revocación manual |
| Incidentes de seguridad por permisos excesivos | {X}/trimestre | Permisos no revocados oportunamente |
| Tiempo de respuesta a solicitudes de acceso | {X} horas | Proceso manual sin automatización |

### 3.4 Visión Estratégica

UMS es la pieza fundacional del ecosistema Evolith. Además de resolver los problemas de identidad inmediatos, habilita:
- **Multi-tenancy gobernado:** Sin identidad centralizada, no es posible isolation real entre tenants
- **Compliance automatizado:** Sin audit trails inmutable, no hay cumplimiento regulatorio
- **Extracción de módulos:** Sin desacoplamiento de identidad, los módulos no pueden extraerse independientemente
- **Experiencia del desarrollador:** Sin una capa de identidad compartida, cada producto reinventa la rueda

## 4. Objetivos y Métricas de Éxito

| Objetivo | Métrica | Valor Inicial | Meta | Horizonte |
| :--- | :--- | :--- | :--- | :--- |
| Centralizar gobierno de identidad | Autenticaciones en capa gobernada | 0% | 100% | Q1 2026 |
| Reducir duplicación de permisos | Tablas locales de permisos | {X} tablas | 0 | Q1 2026 |
| Mejorar auditabilidad | Mutaciones en log inmutable | Parcial | 100% | Q1 2026 |
| Eliminar gestión manual de roles | Tiempo de asignación de acceso | {X} horas | < 5 min | Q1 2026 |

## 5. Alcance

### 5.1 Dentro del Alcance — MVP

| Categoría | Funcionalidades Incluidas |
| :-------- | :------------------------ |
| **Identidad** | F-01 Registro de usuarios, F-02 Autenticación, F-03 Ciclo de vida (activo/inactivo), F-04 Gestión de contraseñas |
| **Autorización** | F-05 RBAC tenant-aware, F-06 Asignación de roles, F-07 Asignación de permisos, F-08 Evaluación de políticas ABAC básicas |
| **Auditoría** | F-09 Log inmutable de mutaciones, F-10 Consulta de auditoría, F-11 Exportación de evidencia |
| **Administración** | F-12 Consola de gestión de tenants, F-13 Consola de gestión de usuarios, F-14 Monitoreo de salud, F-15 Dashboard de métricas |

### 5.2 Fuera del Alcance MVP — Fases Posteriores

| Fase | Funcionalidad | Horizonte |
| :--- | :------------ | :-------- |
| **Fase 2** | Integración con marketplaces externos | Q3 2026 |
| **Fase 2** | SSO federation (SAML, OIDC) | Q3 2026 |
| **Fase 3** | ABAC completo con políticas dinámicas | Q1 2027 |
| **Fase 3** | Analytics de patrones de acceso | Q1 2027 |
| **Post-MVP** | Reemplazo total de IdP empresariales | Por definir |

### 5.3 Alcance Funcional del MVP

El MVP se organiza en los siguientes bloques funcionales:

- **Gestión de Identidad** — registro, autenticación y ciclo de vida de usuarios dentro de un tenant.
- **Autorización RBAC** — asignación de roles y permisos con aislamiento tenant-aware.
- **Auditoría** — log inmutable de todas las mutaciones de estado para compliance y trazabilidad.
- **Consola Administrativa** — interfaz para gestión de tenants, usuarios y monitoreo de salud del sistema.

**Actores principales que interactúan con estos bloques:** Administrador del Sistema (configura tenants y monitorea), Administrador de Tenant (gestiona usuarios y roles), Oficial de Compliance (audita patrones de acceso).

## 6. Actores y Casos de Uso de Alto Nivel

### 6.1 Descripción de Actores

| Actor | Rol en el Sistema | Responsabilidades Principales |
| :---- | :---------------- | :---------------------------- |
| **Administrador del Sistema** | Opera la instalación UMS y tenants | Configurar tenants, monitorear salud, gestionar configuración global |
| **Administrador de Tenant** | Gestiona usuarios, roles y permisos | Asignar acceso, crear usuarios, gestionar roles dentro del tenant |
| **Oficial de Compliance** | Audita patrones de acceso | Generar reportes de evidencia, revisar logs de auditoría |
| **Desarrollador** | Integra UMS con productos | Implementar flujos de autenticación y autorización en sus productos |

### 6.2 Casos de Uso por Actor

| Actor | Casos de Uso — MVP (Fase 1) | Casos de Uso — Fase 2+ |
| :---- | :-------------------------- | :---------------------- |
| **Administrador del Sistema** | F-12 Gestionar tenants, F-14 Monitorear salud, F-15 Dashboard | Configuración avanzada, federation |
| **Administrador de Tenant** | F-01 Registrar usuarios, F-06 Asignar roles, F-07 Asignar permisos | ABAC dinámico, políticas custom |
| **Oficial de Compliance** | F-10 Consultar auditoría, F-11 Exportar evidencia | Analytics de patrones, alertas |
| **Desarrollador** | F-02 Autenticación, F-08 Evaluación de políticas | SDK avanzado, webhooks |

### 6.3 Matriz de Interacción

| Actor | UMS Web App | UMS API | Productos Evolith | Logs de Auditoría |
| :---- | :---------- | :------ | :--------------- | :---------------- |
| **Administrador del Sistema** | Configura tenants | — | — | Revisa salud |
| **Administrador de Tenant** | Gestiona usuarios | — | — | Consulta logs |
| **Oficial de Compliance** | — | — | — | Exporta evidencia |
| **Desarrollador** | — | Integra SDK | Registra productos | — |

## 7. Funcionalidades Detalladas del MVP

| ID | Funcionalidad | Descripción |
| :-- | :------------ | :---------- |
| F-01 | Registro de Usuarios | Creación de cuentas de usuario dentro de un tenant, con validación de email y asignación de estado inicial |
| F-02 | Autenticación | Login con email/contraseña, gestión de sesiones, refresh tokens. Soporte para MFA en fase posterior |
| F-03 | Ciclo de Vida | Activación, desactivación y eliminación lógica de usuarios con preservación de datos de auditoría |
| F-04 | Gestión de Contraseñas | Políticas de contraseñas, recuperación por email, cambio forzado por admin |
| F-05 | RBAC Tenant-Aware | Roles y permisos con aislamiento estricto entre tenants. Un permiso en tenant A no aplica en tenant B |
| F-06 | Asignación de Roles | Asignación y revocación de roles a usuarios, con validación de que el rol pertenece al tenant |
| F-07 | Asignación de Permisos | Asignación directa de permisos a usuarios, complementaria a la asignación por rol |
| F-08 | Evaluación ABAC Básica | Evaluación de políticas de acceso basadas en atributos del usuario y del recurso (versión simplificada) |
| F-09 | Log Inmutable | Registro de toda mutación de estado: quién, cuándo, qué cambió, valor anterior y nuevo |
| F-10 | Consulta de Auditoría | Búsqueda y filtrado de logs de auditoría por usuario, acción, fecha y tenant |
| F-11 | Exportación de Evidencia | Generación de reportes de auditoría en formato PDF/CSV para compliance |
| F-12 | Consola de Tenants | CRUD de tenants con configuración de límites, features y estado |
| F-13 | Consola de Usuarios | Listado, búsqueda y gestión de usuarios con filtros por tenant, rol y estado |
| F-14 | Monitoreo de Salud | Dashboard de métricas de sistema: uptime, latencia de autenticación, errores |
| F-15 | Dashboard de Métricas | Visualización de métricas de negocio: usuarios activos, distribución de roles, patrones de acceso |

## 8. Reglas de Negocio Explícitas

> **Prioridad (MoSCoW):** **M** = Must (imprescindible MVP) · **S** = Should (importante, no bloquea MVP) · **C** = Could (deseable / fase posterior).

| ID | Regla | Prioridad |
| :-- | :---- | :-------: |
| RN-01 | Un usuario solo puede pertenecer a un tenant a la vez | M |
| RN-02 | Los permisos asignados en un tenant no aplican en otro tenant | M |
| RN-03 | Un usuario no puede auto-asignarse roles de Administrador del Sistema | M |
| RN-04 | Toda mutación de estado de usuario debe registrarse en el log de auditoría | M |
| RN-05 | Un usuario desactivado no puede autenticarse pero conserva sus datos y historial | M |
| RN-06 | La contraseña debe cumplir política de seguridad configurada por tenant (mínimo 8 caracteres, 1 mayúscula, 1 número) | M |
| RN-07 | Un tenant debe tener al menos un Administrador de Tenant activo | M |
| RN-08 | La asignación de roles debe ser aprobada por un Administrador de Tenant o superior | S |
| RN-09 | Los logs de auditoría deben conservarse mínimo 90 días | S |
| RN-10 | Un usuario puede tener máximo 5 roles asignados simultáneamente | S |
| RN-11 | La evaluación ABAC debe completarse en menos de 100ms (P99) | S |
| RN-12 | El sistema debe soportar mínimo 1000 tenants simultáneos | C |
| RN-13 | MFA debe estar disponible como opción para tenants premium | C |
| RN-14 | Los logs de auditoría deben ser exportables en formato standard (CEF/OCSF) | C |

## 9. Restricciones y Supuestos

### 9.1 Restricciones

| ID | Restricción | Categoría |
| :-- | :---------- | :-------- |
| R-01 | El MVP no incluye SSO federation (SAML/OIDC); es de Fase 2 | Alcance |
| R-02 | Los datos maestros de tenants son provistos por la capa de gobernanza de Evolith | Dependencia |
| R-03 | El MVP está limitado a RBAC básico; ABAC completo es de Fase 3 | Alcance |
| R-04 | La infraestructura debe cumplir con los estándares de seguridad de Evolith (ADR-0010) | Técnica |

### 9.2 Supuestos

| ID | Supuesto | Riesgo si no se cumple |
| :-- | :------- | :--------------------- |
| S-01 | Los productos del ecosistema Evolith adoptarán UMS como capa de identidad | Duplicación persistente de soluciones de identidad |
| S-02 | El volumen inicial será menor a 100 tenants | Posible necesidad de optimización de rendimiento anticipada |
| S-03 | Los desarrolladores tendrán acceso al SDK de integración antes del launch | Retraso en la adopción por parte de productos |
| S-04 | La capa de gobernanza de Evolith proveerá datos de tenant confiables | Configuración incorrecta de tenants |

## 10. Riesgos de Negocio

| ID | Riesgo | Probabilidad | Impacto | Mitigación |
| :-- | :----- | :----------- | :------ | :--------- |
| RS-01 | Adopción deficiente por parte de productos del ecosistema | Media | Alto | Involucrar product owners desde diseño; SDK intuitivo; documentación completa |
| RS-02 | Incumplimiento de auditoría por logs incompletos | Baja | Alto | Validación automática de cobertura de auditoría; testing de trazabilidad |
| RS-03 | Rendimiento insuficiente para alto volumen de tenants | Baja | Medio | Benchmarks tempranos; arquitectura escalable desde diseño |
| RS-04 | Cambios en requerimientos de compliance durante el proyecto | Media | Medio | Monitoreo continuo de regulaciones; diseño parametrizable |
| RS-05 | Dependencia de la capa de gobernanza no disponible a tiempo | Media | Alto | Definir interfaz como prioridad del MVP; datos de respaldo |

## 11. Criterios de Aceptación del PRD

El PRD se considera aprobado cuando se cumplan todos los siguientes criterios:

### 11.1 Contenido del PRD

| ID | Criterio | Responsable | Estado |
| :-- | :------- | :---------- | :----- |
| CA-01 | Resumen ejecutivo validado por el Aprobador de Negocio | Evolith Product Board | ☑ |
| CA-02 | Métricas de éxito con valor inicial y meta medibles | Evolith Product Board | ☑ |
| CA-03 | Alcance (5.1 y 5.2) firmado por Producto | Evolith Product Board | ☑ |
| CA-04 | Reglas de negocio (RN-01 a RN-14) sin contradicciones y priorizadas | Evolith Product Board | ☑ |
| CA-05 | Restricciones y supuestos revisados y aprobados | Evolith Product Board | ☑ |
| CA-06 | Actores y casos de uso validados con stakeholders clave | Evolith Product Board | ☑ |
| CA-07 | Funcionalidades (F-01 a F-15) con criterios de aceptación individuales | Evolith Product Board | ☑ |
| CA-08 | Reglas de negocio priorizadas (Must/Should/Could) | Evolith Product Board | ☑ |
| CA-09 | Glosario completo y consistente con el dominio | Evolith Product Board | ☑ |

### 11.2 Producto

| ID | Criterio | Responsable | Estado |
| :-- | :------- | :---------- | :----- |
| CA-10 | Prototipos/wireframes aprobados por UX | UX Designer | ☑ |
| CA-11 | Plan de datos maestros (mapeo, calidad, limpieza) aprobado | Evolith Product Board | ☑ |

### 11.3 Proyecto

| ID | Criterio | Responsable | Estado |
| :-- | :------- | :---------- | :----- |
| CA-12 | Cronograma del MVP con hitos y fecha de entrega definidos | PM del proyecto | ☑ |
| CA-13 | Recursos de desarrollo asignados y disponibles | PM del proyecto | ☑ |
| CA-14 | Plan de testing (unitario, integración, aceptación) definido | QA Lead | ☑ |
| CA-15 | Plan de despliegue y capacitación definido | PM del proyecto | ☑ |

## 12. Glosario

| Término | Definición |
| :------ | :--------- |
| **Tenant** | Unidad de aislamiento en UMS. Cada tenant tiene sus propios usuarios, roles y permisos, completamente aislados de otros tenants |
| **RBAC** | Role-Based Access Control — control de acceso basado en roles. Los permisos se asignan a roles, y los roles a usuarios |
| **ABAC** | Attribute-Based Access Control — control de acceso basado en atributos del usuario, recurso y contexto |
| **Log Inmutable** | Registro de auditoría que no puede ser modificado ni eliminado una vez creado, garantizando trazabilidad completa |
| **SSO** | Single Sign-On — autenticación única que permite acceder a múltiples sistemas con las mismas credenciales |
| **MFA** | Multi-Factor Authentication — autenticación de múltiples factores para mayor seguridad |
| **SDK** | Software Development Kit — conjunto de herramientas para integrar UMS en productos del ecosistema |

## 13. Historial de Cambios

| Versión | Fecha | Autor | Cambios |
| :------ | :---- | :---- | :------ |
| 0.1.0-draft | 2026-01-10 | Evolith Product Board | Versión inicial |
| 1.0.0 | 2026-01-15 | Evolith Product Board | PRD aprobado por Architecture Board. Formato actualizado al estándar TMS (13 secciones, MoSCoW, criterios de aceptación, glosario) |

---

## Anexos

### A.1 Prototipos de Pantallas (MVP)

Los prototipos de las pantallas del MVP se encuentran disponibles en Figma. Se debe revisar y validar cada pantalla con el Product Owner antes del inicio del desarrollo.

| Pantalla | Funcionalidad | Referencia |
| :------- | :------------ | :--------- |
| Login | F-02 | Figma — UMS / Auth |
| Dashboard Admin | F-14, F-15 | Figma — UMS / Dashboard |
| Gestión de Usuarios | F-13 | Figma — UMS / Users |
| Gestión de Roles | F-06, F-07 | Figma — UMS / Roles |
| Auditoría | F-10, F-11 | Figma — UMS / Audit |

> *Nota: Los prototipos en Figma son la fuente de verdad para el diseño de UI/UX. Este documento solo referencia las pantallas y sus funcionalidades asociadas.*

---

<p align="center">
  <strong>© Evolith</strong> · www.beyondnet.info
</p>
