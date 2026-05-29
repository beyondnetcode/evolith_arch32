# [ADR 0029](0029-tactical-ddd-primitives-library.md): Adopción de Librería de Primitivas DDD Tácticas

## Estado
Aprobado

## Fecha
2026-05-09

## Contexto
Elaborar una lógica core Hexagonal robusta invita al desarrollo repetitivo y cargado de código repetitivo (boilerplate). Crear métodos base de comparación para IDs, identidad estructural para Objetos de Valor, y recolectar Eventos de Dominio en memoria dentro de Raíces de Agregado resulta en miles de líneas de utilidades duplicadas. Requerimos primitivas estandarizadas de TypeScript puro sin romper los límites Hexagonales.

## Decisión
Estandarizar la utilización del ecosistema de primitivas **`@nestjslatam/ddd`** dentro de los dominios centrales para acelerar la velocidad:

1. **Solo Typescript Puro**: Adhiriéndose a las restricciones de pureza del core, este paquete específico tiene 0 dependencias NPM externas, haciéndolo totalmente seguro para su colocación directamente en la capa más interna del Dominio.
2. **Clases Tácticas**: Desplegar implementaciones padre estándar de `AggregateRoot`, `Entity<T>`, `ValueObject`, y definiciones nativas de `DomainEvent`.
3. **Barrera de Barrel Local**: Para prevenir el bloqueo a largo plazo de la librería, los desarrolladores importan y re-exportan estos tipos vía un archivo proxy de librería compartida local. El código de negocio importa desde rutas locales, permitiendo futuros reemplazos directos sin ediciones generalizadas.

## Restricciones
- **Restricción Readonly**: Todas las propiedades mapeadas a clases de extensión de `ValueObject` DEBEN permanecer inmutables con `readonly`.
- **Cero contaminación de ORM**: Prohibido explícitamente utilizar decoradores relacionales (`@Entity`, `@Column`) dentro del código que extiende primitivas DDD. Las reglas de dominio permanecen puras; los mapas SQL permanecen fuera en Infraestructura.

## Consecuencias

### Positivas
- Tritura el pesado código repetitivo de rutina.
- Establece una vernácula de codificación uniforme a través de múltiples equipos de backend distribuidos instantáneamente.

### Negativas
- Introduce otra dependencia interna superficial. (Mitigado limpiamente vía la abstracción de Barrel).

## Referencias
- [ADR-0002: Arquitectura Hexagonal](../../adrs/nodejs/0002-clean-architecture-nestjs.md)
- [documentación de @nestjslatam/ddd](https://github.com/nestjslatam/ddd)

---
[Volver al Índice](./README.es.md)
