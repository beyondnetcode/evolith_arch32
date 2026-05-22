# Operaciones y Observabilidad

> **Navegación bilingüe:** [English version](./README.md)

Este directorio contiene la configuración operativa y el stack de observabilidad para la referencia de arquitectura progresiva. Todos los componentes son OSS, auto-hospedados y agnósticos al proveedor según el [ADR-0028](../architecture/adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.md).

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
docker-compose -f reference/infrastructure/docker-compose.yml up -d otel-collector grafana tempo loki

# Verificar que Grafana es accesible
open http://localhost:3001   # credenciales por defecto: admin / admin
```

Para ver trazas distribuidas: abrir Grafana → Explore → seleccionar la fuente de datos **Tempo** → pegar un `traceId` desde los logs de la aplicación.

---

## Archivos de Configuración

| Archivo | Propósito |
| :--- | :--- |
| [otel/otel-collector-config.yaml](./otel/otel-collector-config.yaml) | Pipeline del Collector OTel: receivers, processors, exporters |
| [tempo/tempo.yaml](./tempo/tempo.yaml) | Configuración del backend Tempo |
| [grafana/provisioning/datasources/datasources.yml](./grafana/provisioning/datasources/datasources.yml) | Datasources de Grafana aprovisionados automáticamente (Tempo, Loki) |

---

## Verificación de Trazas

1. Ejecutar la API y realizar cualquier petición autenticada.
2. Copiar el `traceId` de la salida de logs JSON estructurado.
3. Abrir `http://localhost:3001` → Explore → Tempo → pegar el `traceId`.
4. Aparece el árbol completo de spans (Kong → BFF → CoreAPI → PostgreSQL).

---

[Volver a la Raíz del Repositorio](../README.es.md)
