# PRD: User Management System (UMS) — MVP

> Estado: Aprobado
> Versión: 1.0.0
> Propietario: Evolith Product Board
> Aprobado por: Evolith Architecture Board
> Fecha: 2026-01-15

---

## 1. Planteamiento del Problema

El software empresarial frecuentemente carece de un enfoque gobernado, auditable y tenant-aware para identidad, autorización y control de acceso. Los permisos están dispersos entre aplicaciones, los audit trails son incompletos y la gestión de roles es manual. UMS provee un producto de referencia disciplinado para centralizar el gobierno de identidad y ejercitar los estándares arquitectónicos de Evolith.

---

## 2. Objetivos de Negocio

| Objetivo | Resultado Clave | Método de Medición |
|---|---|---|
| Centralizar el gobierno de identidad | 100% de autenticaciones enrutadas por la capa gobernada de identidad | Eventos de login en auditoría |
| Reducir duplicación de permisos | Cero tablas locales de permisos post-migración | Revisión de arquitectura |
| Mejorar auditabilidad | Toda mutación de estado capturada en log inmutable | Reporte de cobertura de auditoría |

---

## 3. Personas de Usuario

| Persona | Descripción del Rol | Objetivo Principal | Punto de Dolor |
|---|---|---|---|
| Administrador del Sistema | Opera la instalación UMS y tenants | Configurar tenants y monitorear salud | No existe plano de control centralizado |
| Administrador de Tenant | Gestiona usuarios, roles y permisos | Asignar acceso dentro del tenant | Gestión manual de roles |
| Oficial de Compliance | Audita patrones de acceso | Generar reportes de evidencia | Datos de auditoría fragmentados |

---

## 4. Alcance

### En Alcance — MVP

- Gestión de ciclo de vida de usuarios.
- Autorización RBAC/ABAC tenant-aware.
- Log de auditoría inmutable.
- Consola administrativa para gestión de tenants y usuarios.

### Fuera de Alcance

- Integración con marketplaces externos.
- Reemplazo total de todos los IdP empresariales.

---

## 5. Métricas de Éxito

| Métrica | Línea Base | Objetivo | Ventana |
|---|---|---|---|
| Cobertura de auditoría de login | Parcial | 100% | Release MVP |
| Trazabilidad de asignación de roles | Manual | 100% trazable | 90 días post-lanzamiento |

---

## 6. Aprobaciones

| Rol | Nombre | Fecha | Estado |
|---|---|---|---|
| Product Owner | Evolith Product Board | 2026-01-15 | Aprobado |
| Architecture Board | Evolith Architecture Board | 2026-01-15 | Aprobado |
| Sponsor | Evolith Sponsor | 2026-01-15 | Aprobado |
