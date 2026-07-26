# Evolith Core — Checklist de Endurecimiento de Seguridad

> **Navegación Bilingüe:** [English Version](./security-hardening-checklist.md)

**Estado:** Referencia Activa
**Responsable:** Evolith Architecture Board
**Creado:** 2026-07-23
**Última Actualización:** 2026-07-23

Este checklist documenta las medidas de endurecimiento de seguridad que deberían aplicarse a los despliegues de Docker y Kubernetes. Los ítems marcados [DONE] ya están implementados; los marcados [TODO] requieren acción.

---

## Endurecimiento de Docker

### Configuración de Contenedores

| # | Control | Estado | Evidencia |
|---|---------|:---:|---|
| D-01 | Ejecutar como usuario no-root | [DONE] | Todos los Dockerfiles usan `USER evolith` (uid 1001) |
| D-02 | Builds multi-etapa | [DONE] | Todos los Dockerfiles usan builds multi-etapa |
| D-03 | Imágenes base Alpine | [DONE] | Todas usan `node:20-alpine` |
| D-04 | Sin secretos en las imágenes | [DONE] | Sin archivos `.env` ni secretos hardcodeados |
| D-05 | Sistema de archivos raíz de solo lectura | [TODO] | Añadir `read_only: true` a los servicios de docker-compose |
| D-06 | Descartar todas las capabilities | [TODO] | Añadir `cap_drop: [ALL]` a los servicios de docker-compose |
| D-07 | Sin nuevos privilegios | [TODO] | Añadir `security_opt: [no-new-privileges:true]` |
| D-08 | tmpfs para directorios escribibles | [TODO] | Añadir `tmpfs: [/tmp, /var/tmp]` donde sea necesario |
| D-09 | Límites de recursos | [TODO] | Añadir `deploy.resources.limits` para CPU/memoria |
| D-10 | Health checks | [DONE] | Todos los Dockerfiles tienen instrucciones `HEALTHCHECK` |

### Endurecimiento de Docker Compose

| # | Control | Estado | Acción Requerida |
|---|---------|:---:|---|
| DC-01 | `read_only: true` en todos los servicios | [TODO] | Añadir a cada servicio en `docker-compose.yml` |
| DC-02 | `cap_drop: [ALL]` en todos los servicios | [TODO] | Añadir a cada servicio |
| DC-03 | `security_opt: [no-new-privileges:true]` | [TODO] | Añadir a cada servicio |
| DC-04 | `tmpfs` para directorios escribibles | [TODO] | Añadir `/tmp` y `/var/tmp` donde sea necesario |
| DC-05 | Límites de recursos (CPU/memoria) | [TODO] | Añadir `deploy.resources.limits` |

---

## Endurecimiento de Kubernetes

| # | Control | Estado | Evidencia |
|---|---------|:---:|---|
| K-01 | Pod Security Standards | [TODO] | Aplicar el perfil `restricted` |
| K-02 | Network Policies | [TODO] | Restringir la comunicación pod-a-pod |
| K-03 | RBAC con mínimo privilegio | [TODO] | Permisos mínimos de service account |
| K-04 | Gestión de secretos | [TODO] | Usar Vault o secretos de K8s (no variables de entorno) |
| K-05 | Escaneo de imágenes | [DONE] | Trivy en el pipeline de CI |

---

## Seguridad de Red

| # | Control | Estado | Evidencia |
|---|---------|:---:|---|
| N-01 | Terminación TLS en el borde | [DONE] | Traefik gestiona el TLS |
| N-02 | Servicios internos no expuestos | [TODO] | Verificar que no haya acceso externo directo |
| N-03 | CORS restringido | [DONE] | `credentials: false`, orígenes configurables |
| N-04 | Cabeceras CSP | [DONE] | `default-src 'none'` en el servidor MCP |

---

## Prioridad de Implementación

1. **[HIGH]** D-05, D-06, D-07, D-08 — Endurecimiento del contenedor Docker (read-only, cap_drop, no-new-privileges, tmpfs)
2. **[HIGH]** DC-01 a DC-04 — Endurecimiento de Docker Compose
3. **[MEDIUM]** K-01, K-02, K-03 — Pod Security Standards de Kubernetes
4. **[LOW]** D-09, K-04, K-05 — Límites de recursos, gestión de secretos, escaneo de imágenes

---

## Evaluación de Impacto

**Riesgo de implementar:** MEDIUM — Añadir `read_only: true` puede romper servicios que escriben en el sistema de archivos en tiempo de ejecución (p. ej., datos de Redis, WAL de PostgreSQL, uploads de MinIO).

**Recomendación:** Implementar de forma incremental:
1. Empezar por los servicios que no escriben en disco (Traefik, OTEL Collector)
2. Añadir `tmpfs` para los servicios que necesitan directorios escribibles (Redis, PostgreSQL)
3. Probar cada servicio individualmente antes de aplicarlo a todos

**Esfuerzo estimado:** 2-3 días para el endurecimiento de Docker, 1-2 días para el de K8s.

---

*Este checklist es un documento vivo. Actualízalo a medida que se implementen las medidas de endurecimiento.*
