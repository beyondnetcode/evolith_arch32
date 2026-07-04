# Operaciones y Observabilidad

> **Navegación bilingüe:** [English version](./README.md)

Este directorio contiene la configuración operativa y el stack de observabilidad para la referencia de arquitectura progresiva. Todos los componentes son OSS, auto-hospedados y agnósticos al proveedor según el [ADR-0028](../architecture/adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.md).

## Meta y Objetivos

> **Meta:** hacer que la plataforma de referencia sea observable y operable en local con un stack completamente OSS y neutral respecto de proveedores.

**Objetivos:**

- Proveer un stack de observabilidad listo para ejecutar (OpenTelemetry, Grafana, Tempo, Loki) con un solo comando.
- Mantener cada componente operativo trazable al ADR que lo gobierna.
- Documentar la ruta de verificación desde una petición de la aplicación hasta su traza distribuida completa.

---

## Stack de Observabilidad

| Componente | Rol | Puerto Local |
| :--- | :--- | :--- |
| **OpenTelemetry Collector** | Recibe trazas y logs de todos los servicios y los distribuye a los backends | — |
| **Grafana** | Dashboards, consultas de logs (Loki), exploración de trazas | `3001` |
| **Tempo** | Backend de trazado distribuido (almacena spans) | `3200` |
| **Loki** | Backend de agregación de logs | `3100` |

La estrategia de instrumentación completa está definida en el [ADR-0007](../architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.md).

---

## Iniciar el Stack de Observabilidad

```bash
# Desde la raíz del repositorio — inicia OTel, Grafana, Tempo, Loki
docker-compose -f product/infra/docker-compose.yml up -d otel-collector grafana tempo loki

# Verificar que Grafana es accesible
open http://localhost:3001   # credenciales por defecto: admin / admin
```

Para ver trazas distribuidas: abrir Grafana → Explore → seleccionar la fuente de datos **Tempo** → pegar un `traceId` desde los logs de la aplicación.

---

## Archivos de Configuración

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [otel-collector-config.yaml](./otel/otel-collector-config.yaml) | Pipeline del Collector OTel: receivers, processors, exporters | Enrutar telemetría a los backends | Archivo de configuración | Sí |
| [tempo.yaml](./tempo/tempo.yaml) | Configuración del backend Tempo | Configurar el backend de trazado | Archivo de configuración | Sí |
| [datasources.yml](./grafana/provisioning/datasources/datasources.yml) | Datasources de Grafana aprovisionados automáticamente (Tempo, Loki) | Aprovisionar dashboards automáticamente | Archivo de configuración | Sí |
| [Soporte de CI Agentico y RAG](./agentic-ci-rag-support.es.md) | Runbook de soporte para revision Gemini/Winston e indice RAG | Operar CI asistido por IA de forma segura | Runbook de soporte | Sí |
| [Backup y DR de Almacenes de Datos](./data-store-backup-dr.es.md) | Procedimientos de backup y recuperación ante desastres para PostgreSQL, MongoDB, MinIO, OpenBao | Recuperarse de pérdida de datos sin arqueología ad-hoc | Runbook DR | Sí |
| [Reglas de Alerta Prometheus](./alerts/prometheus-alerts.yml) | Reglas de alerta a nivel de infraestructura (servicio-caído, CPU, disco, tasa de error) | Notificar on-call antes de que los problemas lleguen a usuarios | Reglas de alerta | Sí |
| [SLO de Core API](./slo/core-api-slo.es.md) | Objetivos de nivel de servicio y presupuestos de error para el Core API | Mantener el Core API en objetivos de fiabilidad explícitos | Definición de SLO | Sí |

---

## Verificación de Trazas

1. Ejecutar la API y realizar cualquier petición autenticada.
2. Copiar el `traceId` de la salida de logs JSON estructurado.
3. Abrir `http://localhost:3001` → Explore → Tempo → pegar el `traceId`.
4. Aparece el árbol completo de spans (Traefik → BFF → CoreAPI → PostgreSQL).

---

[Volver a la Raíz del Repositorio](../README.es.md)
