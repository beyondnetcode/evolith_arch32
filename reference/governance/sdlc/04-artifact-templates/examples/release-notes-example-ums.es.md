# Release Notes: UMS v1.0.0

> Estado: Liberado
> Release: v1.0.0
> Evidencia RC: UMS v1.0.0 RC-1 Test Summary Report
> Owner: UMS DevOps / SRE Lead
> Fecha: 2026-01-22

---

## 1. Resumen del Release

UMS v1.0.0 entrega la baseline inicial de identidad gobernada y gestión de acceso tenant-aware. El release incluye gestión del ciclo de vida de usuarios, asignación de roles por tenant, auditoría inmutable y validaciones operativas de observabilidad.

---

## 2. Cambios Incluidos

| Tipo | Descripción | Trazabilidad |
|---|---|---|
| Funcionalidad | Gestión tenant-aware del ciclo de vida de usuarios | FS-01 / TS-011 |
| Funcionalidad | Asignación de rol con alcance tenant | FS-02 / TS-014 |
| Operacional | Logging de auditoría para mutaciones de usuarios y roles | ADR-UMS-001 / TS-017 |
| Operacional | Dashboards base y logs estructurados | Checklist de readiness de release |

---

## 3. Plan de Despliegue

| Paso | Owner | Evidencia |
|---|---|---|
| Desplegar migraciones de base de datos | DevOps Lead | Log de migración |
| Desplegar API UMS | SRE Lead | Pipeline de despliegue |
| Ejecutar smoke tests | QA Lead | Reporte de smoke test |
| Validar dashboards | SRE Lead | Checklist de observabilidad |

---

## 4. Plan de Rollback

| Escenario | Acción de Rollback | Owner |
|---|---|---|
| Falla de despliegue API | Volver a imagen previa del contenedor | SRE Lead |
| Falla de migración | Restaurar snapshot de base de datos y detener release | DevOps Lead |
| Falla de smoke test | Deshabilitar exposición del release e investigar | QA Lead |

---

## 5. Checklist de Observabilidad

- [x] Dashboards verificados.
- [x] Logs verificados.
- [x] Trazas verificadas.
- [x] Alertas verificadas.
- [x] Smoke test post-despliegue aprobado.

---

## 6. Decisión de Producción Activa

| Campo | Valor |
|---|---|
| Decisión | Producción Activa |
| Aprobado por | SRE Lead, Tech Lead, Product Owner |
| Condiciones | N/A |
| Timestamp productivo | 2026-01-22 18:00 UTC |
