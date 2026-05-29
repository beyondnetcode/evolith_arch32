# [ADR 0019](0019-tactical-design-patterns-future-proofing.md): Patrones de Diseño Táctico para Blindaje a Futuro

## Estado
Aprobado

## Fecha
2026-05-08

## Contexto
El acoplamiento estrecho entre controladores de dominio e infraestructura (como lanzar una `HttpException` dentro de un servicio de base de datos) destruye la reutilización del código. Necesitamos modismos fundacionales que aseguren que la lógica de dominio fluye limpiamente de forma independiente de los transportes de red o los manejadores de fallos.

## Decisión
Imponer patrones Funcionales y de Estructura específicos que protejan la pureza core:

1. **El Patrón Result**: Eliminar el lanzamiento de errores en bruto (raw error throwing) desde el interior de los casos de uso de la aplicación. Los métodos devuelven estrictamente un envoltorio funcional tipado `Result<V, E>`. Los adaptadores externos (ej. Controlador HTTP) interrogan `result.isFailure()` y mapean los errores de dominio a errores de transporte (ej. 404).
2. **Evitación del Null Object**: Prohibir el uso estándar de `null` para resultados lógicos comunes. Devolver objetos vacíos semánticos fuertemente tipados o representaciones `Optional` para forzar la verificación del manejo de nulos por parte del cliente.
3. **Separación de Límites mediante Decoradores**: Descargar filtros transversales globales (métricas, rastreo, registro) en Decoradores de métodos transparentes de Typescript en la puerta de entrada, previniendo el envenenamiento de telemetría del código del algoritmo real.
4. **Patrón Unit of Work**: Todas las mutaciones de estado de la base de datos dentro de una sola transacción de Caso de Uso de Aplicación deben operar bajo un contexto atómico `IUnitOfWork`. Esto garantiza que múltiples actualizaciones de repositorio y efectos secundarios (como inserciones de registros de auditoría) se confirmen exitosamente juntos como una única transacción o se reviertan totalmente ante cualquier fallo intermediario, preservando estados agregados consistentes.

## Consecuencias

### Positivas
- Garantiza transiciones impecables a transportes alternativos (gRPC, MessageBus) requiriendo cero ediciones dentro de los módulos de lógica.
- Los vectores de error fuertemente tipados producen pistas de seguridad autodocumentadas.

### Negativas
- Introduce ruido verbal (comprobar booleanos de éxito) para desarrolladores habituados a cascadas no estructuradas de try/catch.

## Referencias
- [Guía del Patrón Result](https://khalilstemmler.com/articles/enterprise-typescript-nodejs/functional-error-handling-design-patterns/)
- [ADR-0029: Primitivas DDD Tácticas](../../adrs/nodejs/0029-tactical-ddd-primitives-library.md)

---
[Volver al Índice](./README.es.md)
