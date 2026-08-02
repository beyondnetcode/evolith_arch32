# ADR-0011: Patrones de Resiliencia y Tolerancia a Fallos

## Estado
Accepted

## Fecha
2026-05-08

## Contexto
Los despliegues de misión crítica deben integrarse con APIs volátiles de terceros (ej. servicios de aduanas, redes bancarias). Los fallos de red síncronos, la latencia excesiva o los tiempos de espera transitorios en los puntos de API externos frecuentemente se propagan en cascada hacia atrás, consumiendo hilos de recursos locales y colapsando la disponibilidad de nuestro sistema.

## Decisión
Implementar Patrones de Resiliencia explícitos protegiendo todas las salidas del sistema hacia el exterior:

1. **Circuit Breaker Distribuido (Opossum + Redis)**: Envolver las llamadas de red salientes en adaptadores de infraestructura de alto nivel. El estado operativo del circuito (Abierto/Cerrado/Semi-Abierto) DEBE almacenarse en el **Clúster Redis** compartido en lugar de la memoria local del proceso. Cuando un único nodo de aplicación activa el breaker, el estado se propaga globalmente a través del clúster instantáneamente, previniendo llamadas fallidas redundantes de nodos pares.
2. **Reintento con Backoff (Retry with Backoff)**: Configurar interceptores para códigos transitorios no fatales que ejecuten intentos de backoff exponencial transparentes nativamente dentro de la lógica del adaptador antes de entregar un resultado de error.
3. **Lógica de Dominio Desacoplada**: El dominio de negocio central debe permanecer 100% agnóstico a estos patrones.
4. **Comprobaciones Activas de Salud en el Borde de Ingreso**: Habilitar la lógica de circuit breaking upstream de Kong Gateway. Kong monitoriza la capacidad de respuesta de los endpoints y termina las asignaciones de objetivos aguas arriba a nivel del gateway de API si las métricas de salud colapsan, protegiendo los nodos de backend de impactos directos de olas de peticiones.

## Desviaciones vigentes

Recorded here because a deviation that lives only in a source comment is invisible to the audit
this ADR exists to serve. Anyone reading the Decision above would otherwise believe breaker state
is shared.

### §1 — breaker state is PROCESS-LOCAL, not Redis-backed

`src/packages/agent-runtime/src/adapters/resilience/circuit-breaker.ts` keeps circuit state in the
process. §1 mandates a shared Redis cluster so that a trip propagates across nodes instantly.

**Why.** `GT-560` deleted the previous breaker and removed `opossum` from the tree: the Core is a
stateless evaluation engine (`ADR-0101`) that makes no outbound calls, so the breaker there
protected nothing. The breaker was rebuilt where the runtime genuinely leaves the process — the
agent runtime's mandatory call to the Core API. Sharing its state would reintroduce the very Redis
dependency `GT-560` removed, for a component that has no other reason to require Redis.

**What it costs, stated rather than implied.** Each replica trips independently and converges on
its own within `failureThreshold` calls. The gap between *"each node trips independently"* and
*"the cluster trips at once"* is real: with N replicas, a failing dependency absorbs up to
N × `failureThreshold` calls before every node has stopped calling it, instead of
`failureThreshold`.

**When to revisit.** When the runtime is deployed with enough replicas that N × `failureThreshold`
is a load the dependency cannot absorb, or when Redis becomes a dependency of that component for
another reason. Until then the deviation buys a package with no transitive runtime dependency.

### The parameters this ADR does not fix

The Negative consequences above already say it: *"Requires sophisticated parameter calibration (how
many errors before break, timeout limit, restore cooldown)."* That calibration is still not in this
ADR, which is why `GT-443`'s chaos criterion cannot be checked numerically against it — the drill
asserts that the system recovers and that it measured something, not that recovery landed inside a
budget this document never declared. Quantifying it is open work, and the drill's published MTTR is
the input for doing so.

## Consecuencias

### Positivas
- Previene que las interrupciones lentas de dependencias maten de hambre y ahoguen los ciclos de CPU locales.
- Mantiene la disponibilidad local general durante caídas remotas periféricas.
- Ofrece flujos de fallo de usuario mucho más seguros que los tiempos de espera infinitos del navegador.

### Negativas
- Añade lógica operativa adicional al depurar puntos de integración.
- Requiere una calibración sofisticada de parámetros (cuántos errores antes de la ruptura, límite de timeout, enfriamiento para restauración).

## Referencias
- [Martin Fowler sobre Circuit Breakers](https://martinfowler.com/bliki/CircuitBreaker.html)
- [ADR-0002: Arquitectura Hexagonal Limpia](../../adrs/nodejs/0002-clean-architecture-nestjs.es.md)





## Objetivo y Alcance

Backfill histórico: Abordar la tensión arquitectónica donde los despliegues de misión crítica deben integrarse con APIs volátiles de terceros (ej, estableciendo un límite estándar.

## Opciones Consideradas

- **Seleccionada:** Patrones de Resiliencia y Tolerancia a Fallos
- **Otras:** Desconocido (el registro histórico no enumera explícitamente alternativas rechazadas).

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad).

## Decisiones y Estándares Relacionados

- [Martin Fowler sobre Circuit Breakers](https://martinfowler.com/bliki/CircuitBreaker.html)
- [ADR-0002: Arquitectura Hexagonal Limpia](../../adrs/nodejs/0002-clean-architecture-nestjs.es.md)

---
[Volver al Índice](./README.es.md)

> **Agent Signature:** Architect Agent
