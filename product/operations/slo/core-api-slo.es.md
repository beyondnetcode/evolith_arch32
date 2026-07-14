# SLO de Core API

> **Nota:** Este archivo es un esqueleto inicial. Por favor, complete la traducción.

## Descripción general

Objetivos de nivel de servicio para los servicios de la API principal de Evolith Core.

## Definiciones de SLO

### SLO de Disponibilidad

| Métrica | Objetivo | Ventana | Medición |
|---------|----------|---------|----------|
| Disponibilidad | 99.9% | 30 días móviles | `sum(evolith_http_requests_total{status!~"5.."}[30d]) / sum(evolith_http_requests_total[30d])` |
| Presupuesto de error | 0.1% (43,8 min/mes) | 30 días móviles | Derivado de disponibilidad |

### SLO de Latencia

| Métrica | Objetivo | Ventana | Medición |
|---------|----------|---------|----------|
| p99 Latencia | < 200ms | 30 días móviles | `histogram_quantile(0.99, rate(evolith_http_request_duration_seconds_bucket[5m]))` |
| p95 Latencia | < 100ms | 30 días móviles | `histogram_quantile(0.95, rate(evolith_http_request_duration_seconds_bucket[5m]))` |
| p50 Latencia | < 50ms | 30 días móviles | `histogram_quantile(0.50, rate(evolith_http_request_duration_seconds_bucket[5m]))` |

### SLO de Tasa de Error

| Métrica | Objetivo | Ventana | Medición |
|---------|----------|---------|----------|
| Tasa de error 5xx | < 0.1% | 30 días móviles | `rate(evolith_http_requests_total{status=~"5.."}[5m]) / rate(evolith_http_requests_total[5m])` |
| Tasa de error 4xx | < 5% | 30 días móviles | `rate(evolith_http_requests_total{status=~"4.."}[5m]) / rate(evolith_http_requests_total[5m])` |

## Política de Presupuesto de Error

| Presupuesto Restante | Acción |
|----------------------|--------|
| > 25% | Operaciones normales, liberaciones de funcionalidades continúan |
| 10% - 25% | Mayor escrutinio de revisiones, testing adicional requerido |
| < 10% | Congelación de cambios no críticos, revisión de incidentes obligatoria |
| 0% | Congelación total, todo esfuerzo hacia mejora de confiabilidad |

## Integración con Alerting

Las alertas se definen en `product/operations/alerts/prometheus-alerts.yml`. Alertas clave:

- `HighErrorRate` — se activa cuando la tasa de error 5xx supera 1% por 5 minutos
- `HighLatency` — se activa cuando p99 supera 500ms por 5 minutos
- `PodRestart` — se activa cuando un pod se reinicia más de 3 veces en 1 hora

## Dashboards

Los dashboards de SLO se provisionan vía Grafana y deben rastrear:

- Tasa de quema (ventanas de 1h, 6h, 24h)
- Presupuesto de error restante
- Gráficos de tendencia SLI por servicio

---

[Volver al nivel superior](../README.md)
