# Perfil de Proveedor: Stack OpenTelemetry (Observabilidad)

> **Navegación bilingüe:** [English Version](./otel-stack-profile.md)

**Categoría:** Observabilidad (`observability`)
**Proveedor:** OpenTelemetry (CNCF)
**Estado del Perfil:** Activo / Por defecto

## 1. Cobertura de Capacidades
El stack de OpenTelemetry (OTel) proporciona recolección de datos de telemetría agnóstica al proveedor.
Satisface las siguientes capacidades centrales de observabilidad:
- Trazabilidad distribuida (W3C Trace Context)
- Recolección de métricas (contadores, indicadores, histogramas)
- Ingestión y correlación de logs estructurados
- Collector unificado para parseo, filtrado y exportación de datos de telemetría

## 2. Limitaciones y Brechas
- OTel es un estándar de recolección, no un backend de almacenamiento o visualización; debe estar emparejado con backends como Jaeger, Prometheus o Datadog.
- Existen consideraciones de sobrecarga (overhead) cuando se muestrea el 100% de las trazas en servicios de alto tráfico.

## 3. Modos de Despliegue
- **Soportados:** Application SDK (in-process), Local Agent/Sidecar, Gateway Collector.
- **Por Defecto:** Despliegue tipo Agent/Sidecar por nodo que reenvía a un Gateway Collector central.

## 4. Restricciones de Licencia y Redistribución
- Licenciado bajo Apache License 2.0 (Open Source).
- Sin restricciones de redistribución para uso interno.

## 5. Aislamiento de Tenants y Residencia de Datos
- Los datos de telemetría deben etiquetarse con IDs de tenant si se procesan en un backend multi-tenant.
- El OTel Collector puede rutear telemetría a diferentes backends de almacenamiento basándose en requisitos de residencia de datos (por ejemplo, rutear telemetría de la UE a un backend de almacenamiento basado en la UE).

## 6. Consideraciones de Seguridad y Cumplimiento
- PII/PHI deben ser enmascarados utilizando el pipeline del procesador del OTel Collector antes de su exportación a sistemas externos.
- mTLS debe ser utilizado entre SDKs de aplicación, Collectors y el almacenamiento backend.

## 7. Mapeo de Adaptadores y ACL
Los productos implementan el `ITelemetryProvider` abstracto de Evolith, el cual mapea internamente a los SDKs de OTel (por ejemplo, `@opentelemetry/api` en Node.js). 

## 8. Evidencia Producida
- IDs de Traza correlacionados a través de límites de microservicios.
- Logs de error enlazados a trazas de transacciones específicas.
- Métricas de negocio personalizadas.

## 9. Reemplazabilidad y Migración
Mientras que OTel mismo es la capa de abstracción que protege contra el encierro de proveedor (vendor lock-in) para backends de almacenamiento, migrar *lejos* de OTel implicaría:
1. Reescribir el `ITelemetryProvider` para utilizar un SDK propietario (por ejemplo, librerías nativas de Datadog o New Relic).
2. Actualizar las cabeceras de propagación de contexto a través de todos los servicios.

## 10. Fuentes Actuales y Referencias Oficiales
- [Documentación Oficial de OpenTelemetry](https://opentelemetry.io/docs/)
- [Proyecto OTel de CNCF](https://www.cncf.io/projects/opentelemetry/)

## 11. ADRs
- Ninguno específico para este proveedor.
