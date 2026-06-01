# ADR-UMS-001: Límite de Autorización Tenant-Aware

> Estado: Aceptado
> Fecha: 2026-01-15
> Owner: Evolith Architecture Board
> Fase relacionada: Diseño y Arquitectura
> Artefactos relacionados: PRD UMS, FS-01, FS-02

---

## 1. Contexto

UMS debe centralizar la autorización preservando aislamiento por tenant. El producto necesita soportar administración de sistema, administración de tenant y acceso de usuario sin permitir fuga de privilegios entre tenants.

---

## 2. Drivers de Decisión

- Evitar escalamiento de acceso cross-tenant.
- Mantener la lógica de autorización auditable y testeable.
- Alinear UMS con los estándares Evolith de multi-tenancy y seguridad.

---

## 3. Opciones Consideradas

| Opción | Resumen | Pros | Contras |
|---|---|---|---|
| Filtro tenant solo en aplicación | Filtrar acceso por tenant en servicios de aplicación | Implementación simple | Alto riesgo de omitir validaciones |
| Aislamiento a nivel de base de datos | Forzar límite tenant en persistencia | Aislamiento fuerte | Requiere disciplina de esquema y pruebas |
| Policy engine externo únicamente | Delegar decisiones externamente | Política centralizada | Mayor dependencia operativa |

---

## 4. Decisión

UMS aplicará autorización tenant-aware en el límite de aplicación y persistirá datos usando reglas de aislamiento por tenant, con pruebas explícitas que demuestren bloqueo de acceso cross-tenant.

---

## 5. Consecuencias

### Positivas

- El aislamiento por tenant se vuelve testeable y auditable.
- Las decisiones de autorización son trazables a rol y scope tenant.

### Trade-offs

- Se requieren más casos de prueba por ruta de autorización.
- Las capas de persistencia y aplicación deben mantenerse alineadas.

---

## 6. Cumplimiento y Trazabilidad

| Ítem | Link / Notas |
|---|---|
| PRD padre | PRD UMS MVP |
| Historias Funcionales | FS-01 Gestionar usuarios tenant, FS-02 Asignar roles tenant |
| Bounded context afectado | Identity and Access Governance |
| ADRs Evolith relacionados | ADR-0010 Multi-Tenancy, ADR-0056 Naming and Design Conventions |
