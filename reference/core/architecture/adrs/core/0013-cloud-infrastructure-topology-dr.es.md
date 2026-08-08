# ADR-0013: Topología de Infraestructura Cloud y Recuperación ante Desastres (DR)

## Estado
Accepted

## Fecha
2026-05-08

## Contexto
Las operaciones de negocio manejadas por esta arquitectura demandan una estabilidad de ejecución continua las 24 horas del día, los 7 días de la semana. El fallo de un componente del centro de datos o un apagón amplio de una zona de disponibilidad no pueden dejar fuera de línea el procesamiento de la ruta crítica operativa durante horas manuales. Nuestro plan de distribución a través de las topologías de nube objetivo requiere definiciones de política explícitas.

## Decisión
Diseñar la topología de infraestructura apuntando a patrones Cloud-Native que impongan alta resiliencia y potencial de failover instantáneo:

1. **Orquestación Automatizada**: El despliegue evoluciona por fase arquitectónica. Mientras que la Fase 1 exige solo contenedores OCI estándar sobre cómputo simple (VMs, Compose), el despliegue en plataformas de clúster gestionadas capaces de HPA se activa estrictamente a partir de la Fase 3.
2. **Estrategia Multi-AZ**: La operación estándar ocurre de forma activo-activo a través de varias Zonas de Disponibilidad (Availability Zones) explícitas. Una región de respaldo secundaria permanece en warm-standby para un pivot de desastre inmediato.
3. **Entrada de Red Global**: Desplegar un punto unificado de ingreso externo (ej. Cloudflare/Azure Front Door) para analizar la salud y realizar redirección de enrutamiento instantánea entre regiones si se detecta degradación del clúster local.

## Consecuencias

### Positivas
- Preserva los compromisos de tiempo de actividad (uptime) sin interrupciones para las cadenas operativas corporativas globales.
- Mitiga el daño potencial de interrupciones estructurales o de zonas de proveedores.

### Negativas
- La distribución Activo-Activo duplica matemáticamente los costos de ejecución de infraestructura.
- Requiere pipelines CI/CD sofisticados diseñados para configuraciones de orquestación de múltiples objetivos.

## Referencias
- [ADR-0011: Tolerancia a Fallos](../../adrs/core/0011-fault-tolerance-resiliency-patterns.es.md)
- [ADR-0028: Estrategia Híbrida Autohospedada](../../adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.es.md)





## Objetivo y Alcance

Backfill histórico: Abordar la tensión arquitectónica donde las operaciones de negocio manejadas por esta arquitectura demandan una estabilidad de ejecución continua las 24 horas del día, los 7 días de la semana, estableciendo un límite estándar.

## Opciones Consideradas

- **Seleccionada:** Topología de Infraestructura Cloud y Recuperación ante Desastres (DR)
- **Otras:** Desconocido (el registro histórico no enumera explícitamente alternativas rechazadas).

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad).

## Decisiones y Estándares Relacionados

- [ADR-0011: Tolerancia a Fallos](../../adrs/core/0011-fault-tolerance-resiliency-patterns.es.md)
- [ADR-0028: Estrategia Híbrida Autohospedada](../../adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.es.md)

---
[Volver al Índice](./README.es.md)

> **Agent Signature:** Architect Agent


## Objetivos de recuperación, medidos (GT-443)

Simulacro del 2026-08-08 sobre el stack local de `kind` (`evolith-tracker-local`), siguiendo
`product/infra/helm/evolith-tracker-postgres/BACKUP_RESTORE.md` tal cual y no por un atajo: se
escribió un marcador, se tomó `pg_dump -Fc` como lo toma el CronJob de backup, se escribió un
segundo marcador después, se destruyeron las 51 tablas de aplicación repartidas en 9 esquemas, y se
restauró con `pg_restore --clean --if-exists`.

### RPO — lo fija el schedule, y eso sí generaliza

**≤ 24 horas**, determinado por el CronJob de backup (`schedule: "0 2 * * *"`, `retentionDays: 7`),
no por ninguna propiedad del hardware. Confirmado por comportamiento en el simulacro: el marcador
escrito **antes** del backup sobrevivió; el escrito **después** no. Esta cota se cumple en cualquier
entorno que ejecute este chart, porque es una propiedad del schedule.

### El procedimiento de restauración funciona

51 tablas en 9 esquemas volvieron desde un dump de 130 KB en **menos de un segundo**. `pg_dump -Fc`
se lleva todos los esquemas —no está restringido con `-n`—, lo que aquí importa porque solo una de
las 51 tablas vive en `public`.

Léase ese número como un suelo del PASO de restauración, no como un RTO ni como una cifra
extrapolable: se midió en un portátil, contra disco local, sobre una base tres órdenes de magnitud
más pequeña que una poblada.

### RTO — NO medido, y la razón es el hallazgo

**Aquí no se declara ningún RTO, porque el sistema hoy no sabe decir cuándo está caído.**

Durante el simulacro, con 51 de 52 tablas destruidas, **ambas sondas se mantuvieron en verde todo el
tiempo**:

| sonda | ruta | durante la pérdida total de datos |
|---|---|---|
| liveness | `/health/live` | `200` |
| readiness | `/health/ready` | `200` |

Liveness hace bien en quedarse verde y `TrackerHealthChecks` explica por qué: reiniciar un pod no
arregla una base de datos caída, así que atarla a liveness convierte una caída en una tormenta de
reinicios. Readiness se quedó verde por otro motivo: `DbContextHealthCheck` llama a
`CanConnectAsync`, que pregunta si la base **acepta conexiones**, no si conserva un esquema.
Destruir todos los esquemas no rompe ninguna de las dos cosas.

La consecuencia no es académica: durante toda la caída el pod siguió anunciándose como listo y
habría seguido recibiendo tráfico que toda consulta habría fallado. Y para este ADR en concreto, un
RTO es *el tiempo desde que se detecta el fallo hasta que el servicio vuelve* — sin señal en ninguno
de los dos extremos, cualquier número publicado aquí mediría el script del simulacro, no una
recuperación. Durante este simulacro se produjeron dos de esos números (682 ms y 2 581 ms) antes de
entenderlo, y se registran aquí como descartados, no como cifra.

**Qué reemplaza esto.** La consecuencia positiva "preserva los compromisos de disponibilidad" era una
afirmación sin cuantificar. Ahora es: una cota de RPO que se cumple y está confirmada, un
procedimiento de restauración que se ha ejecutado de verdad, y un RTO explícitamente ausente con la
razón de su ausencia.

**Qué haría medible un RTO**, por orden: una señal de readiness que se ponga en rojo cuando el
almacén está presente pero inservible, y después un simulacro en un entorno con datos y
almacenamiento con forma de producción. Si readiness debe afirmar la presencia del esquema es una
decisión de diseño con sus propios modos de fallo —un readiness demasiado listo falla cerrado por sus
propios bugs— y aquí no se toma.
