# Historia Funcional: Asignar Rol con Alcance Tenant

> ID: FS-02
> Estado: Aprobada
> PRD padre: PRD UMS MVP
> Bounded Context: Identity and Access Governance
> Owner: Evolith Product Board

---

## 1. Resultado de Negocio

Un administrador de tenant puede asignar un rol aprobado a un usuario dentro del mismo tenant para gobernar accesos sin intervención manual de base de datos o equipo de soporte.

---

## 2. Actores

| Actor | Objetivo | Notas |
|---|---|---|
| Administrador de Tenant | Asignar un rol a un usuario tenant | Solo debe afectar usuarios del mismo tenant |
| Usuario | Recibir acceso según el rol asignado | El acceso debe ser auditable |
| Oficial de Compliance | Revisar historial de asignaciones | Requiere evidencia de auditoría inmutable |

---

## 3. Flujo Principal

1. El Administrador de Tenant selecciona un usuario dentro del tenant.
2. El Administrador de Tenant selecciona un rol aprobado.
3. UMS valida scope tenant y política de asignación.
4. UMS asigna el rol y registra un evento de auditoría.
5. Los permisos del usuario quedan efectivos según política.

---

## 4. Reglas de Negocio

| ID Regla | Regla |
|---|---|
| BR-01 | Un administrador de tenant no puede asignar roles fuera de su tenant. |
| BR-02 | Toda asignación de rol debe producir un evento de auditoría inmutable. |
| BR-03 | Usuarios suspendidos no pueden recibir nuevas asignaciones de rol. |

---

## 5. Criterios de Aceptación

- [x] La asignación de rol funciona cuando usuario, administrador y rol pertenecen al mismo tenant.
- [x] La asignación entre tenants distintos es rechazada.
- [x] Se crea un evento de auditoría por cada intento de asignación.

---

## 6. Trazabilidad

| Ítem | Link / Notas |
|---|---|
| PRD | PRD UMS MVP |
| ADRs gobernantes | ADR-UMS-001 Límite de Autorización Tenant-Aware |
| Historias Técnicas | TS-014 Caso de uso de asignación de rol |
