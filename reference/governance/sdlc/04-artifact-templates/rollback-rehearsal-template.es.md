# Plantilla: Ensayo de Rollback

> **Navegación bilingüe:** [English](./rollback-rehearsal-template.md)
> **Fase:** 5 — Entrega y Operaciones
> **Puerta de salida:** Producción Activa (Rollback Validado)
> **Schema:** [rollback-rehearsal.schema.json](../../../../rulesets/schema/rollback-rehearsal.schema.json)
> **Padre:** [Plantillas de Artefactos](./README.es.md)

---

## Propósito

El Ensayo de Rollback es el registro formal de que se ejecutó un rollback exitosamente contra un entorno no productivo que replica la topología de producción. Demuestra que el procedimiento de rollback funciona antes del corte y es citado por el [Playbook de Release Sin Tiempo de Inactividad — Fase 5](../01-playbooks/zero-downtime-release.md).

---

## Reglas de Autoría

- El ensayo debe ejecutarse contra un entorno de staging o pre-producción, no producción.
- Cada paso del plan de rollback debe ejecutarse en orden; los pasos omitidos invalidan la evidencia.
- Captura el tiempo desde la initiación del rollback hasta la primera señal saludable; compara contra el presupuesto de rollback.
- Si el ensayo falla o excede el presupuesto, el release no debe proceder hasta que se demuestre la remediación.

---

## Secciones Requeridas

| Sección | Notas |
|---|---|
| Contexto de Despliegue | Versión del release, nombre del entorno, marca de tiempo del ensayo (ISO 8601). |
| Estrategia de Rollback | Selecciona explícitamente Blue/Green o Canary y justifica por qué. |
| Pasos de Rollback | Lista de verificación numerada ejecutada durante el ensayo. |
| Presupuesto de Rollback | Tiempo máximo permitido y tiempo real observado. |
| Firma del Testigo | Nombre, rol y fecha de la persona que presenció el ensayo. |
| Enlaces de Evidencia | Enlaces a logs de despliegue, dashboards y capturas que prueban el rollback exitoso. |

---

## Esqueleto Markdown

```markdown
# Ensayo de Rollback — [RC-X.Y.Z]

## Contexto de Despliegue
- Versión del release: X.Y.Z
- Entorno: staging / pre-producción
- Marca de tiempo del ensayo: YYYY-MM-DDThh:mm:ss±hh:mm

## Estrategia de Rollback
- Estrategia: Blue/Green | Canary
- Justificación: [Por qué se seleccionó esta estrategia]

## Pasos de Rollback
1. [ ] Identificar condición de trigger para rollback
2. [ ] Ejecutar comando / procedimiento de rollback
3. [ ] Verificar que la versión anterior esté sirviendo tráfico
4. [ ] Confirmar compatibilidad del esquema de base de datos
5. [ ] Validar health checks pasando
6. [ ] Notificar a stakeholders del rollback completado

## Presupuesto de Rollback
| Métrica | Presupuesto | Real |
|---|---|---|
| Tiempo máximo de rollback | … min | … min |
| Tiempo hasta primera señal saludable | — | … seg |
| Tiempo hasta restauración completa de tráfico | — | … min |

## Firma del Testigo
- Nombre:
- Rol:
- Fecha:

## Enlaces de Evidencia
- Log de despliegue: [enlace]
- Dashboard de monitoreo: [enlace]
- Captura del estado saludable: [enlace]
```

---

## Ejemplo Resuelto: Rollback Blue/Green

```markdown
# Ensayo de Rollback — RC-2.4.0

## Contexto de Despliegue
- Versión del release: 2.4.0
- Entorno: staging-us-east-1
- Marca de tiempo del ensayo: 2026-06-20T14:30:00-04:00

## Estrategia de Rollback
- Estrategia: Blue/Green
- Justificación: Capa web stateless con base de datos compartida; corte instantáneo mediante intercambio de target group del load balancer.

## Pasos de Rollback
1. [x] Trigger confirmado: latencia p95 excedió 800ms en el grupo canary
2. [x] Ejecutado `aws elbv2 modify-rule` para cambiar target group de green → blue
3. [x] Verificado que el target group blue responde 200 en /health dentro de 4s
4. [x] Confirmado compatibilidad retroactiva del esquema de base de datos (sin nuevas columnas)
5. [x] Dashboard de Grafana confirma tasa de error < 0.1%
6. [x] Incidente de PagerDuty resuelto; Slack #release-ops notificado

## Presupuesto de Rollback
| Métrica | Presupuesto | Real |
|---|---|---|
| Tiempo máximo de rollback | 5 min | 38 seg |
| Tiempo hasta primera señal saludable | — | 4 seg |
| Tiempo hasta restauración completa de tráfico | — | 38 seg |

## Firma del Testigo
- Nombre: Maria Chen
- Rol: SRE Lead
- Fecha: 2026-06-20

## Enlaces de Evidencia
- Log de despliegue: https://grafana.internal/d/rollback-2.4.0
- Dashboard de monitoreo: https://grafana.internal/d/prod-overview
- Captura: https://drive.google.com/file/d/abc123
```

---

## Ejemplo Resuelto: Rollback Canary

```markdown
# Ensayo de Rollback — RC-3.1.2

## Contexto de Despliegue
- Versión del release: 3.1.2
- Entorno: staging-eu-west-1
- Marca de tiempo del ensayo: 2026-06-21T09:15:00+01:00

## Estrategia de Rollback
- Estrategia: Canary
- Justificación: Conexiones gRPC de larga duración con estado en vuelo; cambio gradual de tráfico permite drenado de conexiones.

## Pasos de Rollback
1. [x] Trigger confirmado: tasa de error en canary de 5% excedió umbral de 2%
2. [x] Ejecutado `kubectl set image` para revertir pods canary a tag de imagen anterior
3. [x] Verificado que pods canary alcanzaron estado Ready con versión anterior
4. [x] Confirmado que pool de conexiones gRPC se re-estableció (sin respuestas UNAVAILABLE)
5. [x] Alerta de Prometheus `CanaryErrorRateHigh` resuelta dentro de 90s
6. [x] Coordinador de release notificado vía canal de incidentes

## Presupuesto de Rollback
| Métrica | Presupuesto | Real |
|---|---|---|
| Tiempo máximo de rollback | 10 min | 2 min 15 seg |
| Tiempo hasta primera señal saludable | — | 45 seg |
| Tiempo hasta restauración completa de tráfico | — | 2 min 15 seg |

## Firma del Testigo
- Nombre: Lucas Eriksson
- Rol: Platform Engineer
- Fecha: 2026-06-21

## Enlaces de Evidencia
- Log de despliegue: https://grafana.internal/d/canary-3.1.2
- Dashboard de monitoreo: https://grafana.internal/d/grpc-overview
- Captura: https://drive.google.com/file/d/def456
```

---

## Documentos Relacionados

| Documento | Propósito |
|---|---|
| [Playbook de Release Sin Tiempo de Inactividad](../01-playbooks/zero-downtime-release.md) | Gate procedural que consume esta evidencia. |
| [Plantilla de Release Notes](./release-notes-template.es.md) | Registro de despliegue productivo que referencia readiness de rollback. |
| [`phase-gates.rules.json`](../../../../rulesets/sdlc/phase-gates.rules.json) | La entrada de evidencia `Rollback Rehearsal` de Fase 5 referencia esta plantilla. |
