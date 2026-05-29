# [ADR 0038](0038-error-handling-result-pattern-strategy.md): Estrategia Empresarial de Manejo de Errores y Patrón Result

## Estado
Aprobado

## Fecha
2026-05-11

## Contexto
Los bloques JavaScript estándar `try/catch` hacen que los flujos de error sean invisibles para el Sistema de Tipos. Las funciones afirman devolver `Datos`, pero implícitamente colapsan en tiempo de ejecución con excepciones arbitrarias. Esto conduce a una lógica de manejo de errores fragmentada y dispersa por el código, haciendo imposible distinguir con seguridad entre errores **Transitorios** (pequeños fallos de red de infraestructura) y **No Transitorios** (violaciones de Reglas de Negocio).

## Decisión
Establecer un marco de Propagación de Errores fuertemente tipado y unificado basado en el **Patrón Result** (Manejo de Errores Funcional):

### 1. Principio: Los Errores son Valores (El Patrón Result)
Mandar que TODOS los Casos de Uso de Aplicación y Entidades de Dominio devuelvan errores explícitamente en lugar de lanzarlos.
* **Firma de Retorno**: `Promise<Result<SuccessType, DomainError>>`
* **Implementación**: Usar una envoltura ligera de la clase `Result<T, E>` (ej., inspirada en `neverthrow`).
* **Beneficio**: El compilador de Typescript OBLIGA a quien llama a manejar explícitamente la rama de fallo usando verificaciones `.isOk()` / `.isFail()` o `.match()`.

### 2. Matriz de Clasificación de Errores
| Clase de Error | Tipo | Mecanismo de Recuperación | Código HTTP Final |
| :--- | :--- | :--- | :--- |
| **Lógica de Negocio (No Transitorio)** | Esperado | **Patrón Result**. Pasado por cadena explícita. | 400, 403, 409, 422 |
| **Infraestructura (Transitorio)** | Inesperado | **Reintento con Backoff** ([ADR-0011](../core/0011-fault-tolerance-resiliency-patterns.md)). Si es permanente, lanzar excepción genérica. | 500, 503 |
| **Violación de Seguridad** | Guardado | Terminación Inmediata. Manejado por la capa Guard de NestJS. | 401, 403 |

### 3. Propagación y Mapeo de Límites
1. **Capa de Dominio**: Devuelve un `Result.fail(new InsufficientFundsError())` en bruto. NO se permiten códigos HTTP.
2. **Capa de Aplicación**: Orquesta la lógica. Si un Paso falla, realiza un cortocircuito y devuelve el mismo `Result`.
3. **Capa de Adaptador / Controlador**: El **Límite de Traducción**. Mapea explícitamente las subclases de `DomainError` en Códigos de Respuesta HTTP específicos usando un mapeador limpio.
4. **Captura Global (Catch-All)**: Un **Filtro de Excepciones de NestJS** dedicado captura solo los fallos de infraestructura verdaderamente no manejados, elimina los rastros de pila (stack traces) internos, asigna un `TraceId` estándar de OTel, y entrega un JSON opaco de "Error Interno del Servidor".

## Consecuencias

### Positivas
- 100% Seguridad de Tipos: No puedes compilar código que ignore un error de negocio explícito.
- Separación total de los fallos de Infraestructura respecto a la imposición de reglas lógicas.
- Contratos de error públicos uniformados a través de todas las superficies de API.

### Negativas
- Introduce una ligera sobrecarga sintáctica en la estructura del código (mapeo anidado).
- Requiere capacitación a los desarrolladores para cambiar de `throw new Error()` a `return Result.fail()`.

## Referencias
- [Railway Oriented Programming](https://fsharpforfunandprofit.com/rop/)
- [ADR-0002: Arquitectura Hexagonal Limpia](../../adrs/nodejs/0002-clean-architecture-nestjs.md)
- [ADR-0011: Tolerancia a Fallos](../../adrs/core/0011-fault-tolerance-resiliency-patterns.md)

---
[Volver al Índice](./README.es.md)
