# Historia Técnica: Implementar Caso de Uso de Asignación de Rol Tenant

> ID: TS-014
> Estado: Terminada
> Historia Funcional padre: FS-02 Asignar Rol con Alcance Tenant
> Bounded Context: Identity and Access Governance
> Owner: UMS Engineering Team

---

## 1. Objetivo Técnico

Implementar el caso de uso de aplicación que asigna un rol tenant aprobado a un usuario después de validar límite tenant, estado del rol, estado del usuario y requisitos de auditoría.

---

## 2. Alcance de Implementación

| Área | Cambio |
|---|---|
| Dominio | Agregar comportamiento de asignación de rol y reglas de validación |
| Aplicación | Agregar `AssignTenantRoleUseCase` |
| Infraestructura | Persistir asignación y evento de auditoría en el mismo límite transaccional |
| API | Agregar endpoint de asignación de rol para administradores tenant |
| Pruebas | Agregar pruebas unitarias, integración y autorización |
| Documentación | Enlazar implementación con ADR-UMS-001 y FS-02 |

---

## 3. Criterios de Aceptación Técnica

- [x] La asignación de rol dentro del mismo tenant funciona.
- [x] La asignación entre tenants distintos es rechazada.
- [x] Usuarios suspendidos no pueden recibir asignaciones.
- [x] Todo intento es auditable.

---

## 4. Definición de Terminado

- [x] Código implementado y revisado.
- [x] Pruebas actualizadas.
- [x] CI aprobado.
- [x] Delta documental completado.
- [x] Impacto de observabilidad revisado.

---

## 5. Trazabilidad

| Ítem | Link / Notas |
|---|---|
| Historia Funcional | FS-02 Asignar Rol con Alcance Tenant |
| ADRs gobernantes | ADR-UMS-001 |
| Pull Request | PR-142 |
| Evidencia de pruebas | CI run y Test Summary Report |
