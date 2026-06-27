# Guía de Evidencia Sin Servidor

> **Navegación Bilingüe:** [English](./evidence.md) | [Español](./evidence.es.md)

**Propietario:** Ingeniería de Plataforma
**Topología:** Sin Servidor

---

## Comandos de Validación

Ejecutar validación de infraestructura antes de cada despliegue:

```bash
# Validar configuraciones de funciones
serverless validate --stage production

# Verificar permisos de roles IAM
aws iam simulate-principal-policy --policy-source-arn <function-arn>

# Verificar configuración VPC
aws ec2 describe-security-groups --filters Name=vpc-id,Values=<vpc-id>

# Escanear paquetes de despliegue en busca de vulnerabilidades
npm audit --production
```

## Métricas de Invocación

Rastrear lo siguiente por función, por día:

| Métrica | Objetivo | Umbral de Alerta |
|---------|----------|------------------|
| Latencia p50 | < 500 ms | > 800 ms |
| Latencia p95 | < 1000 ms | > 1200 ms |
| Latencia p99 | < 1500 ms | > 1500 ms |
| Tasa de error | < 0.1% | > 0.5% |
| Conteo de limitaciones | 0 | > 0 |

## Mediciones de Inicio en Frío

Muestrear tiempos de inicio en frío semanalmente. Registrar duración de init, duración de runtime y duración total. Comparar contra el presupuesto de 1000 ms de inicio en frío (SV-R04). Señalar cualquier función que exceda el presupuesto para optimización.

## Reportes de Costos

Generar reportes de costos semanales con:

- Total de invocaciones por función
- Tiempo total de computación (GB-segundos)
- Costo por ejecución (objetivo: **1 centavo**)
- Tendencia mes a mes
- Funciones que exceden el presupuesto de costos

## Evidencia de Cumplimiento

Retener los siguientes artefactos para auditoría:

- Asignaciones y registros de rotación de roles IAM
- Registros de procesamiento de DLQ
- Resultados de escaneo de vulnerabilidades de paquetes de despliegue
- Historial de mediciones de inicio en frío
- Reportes de rastreo de costos

---

[Volver al Perfil Sin Servidor](./README.es.md)
