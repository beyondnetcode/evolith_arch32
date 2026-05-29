# [ADR 0011](0011-fault-tolerance-resiliency-patterns.md): Patrones de Resiliencia y Tolerancia a Fallos

## Estado
Aprobado

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
- [ADR-0002: Arquitectura Hexagonal Limpia](../../adrs/nodejs/0002-clean-architecture-nestjs.md)

---
[Volver al Índice](./README.es.md)
