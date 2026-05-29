# [ADR 0021](0021-high-performance-auth-and-graph-compilation.md): Compilación de Grafos de Autorización de Alto Rendimiento

## Estado
Aprobado

## Fecha
2026-05-08

## Contexto
Los procesos de inicio de sesión generan la huella de carga inicial más pesada en absoluto. Atravesar roles anidados recursivos dinámicos, generar matrices de menús dinámicas y filtrar capacidades multi-tenant directamente desde las tablas SQL en cada transacción genera latencias insoportables y mata el rendimiento total del gateway.

## Decisión
Estandarizar los gateways de inicio de sesión de autenticación para producir **Grafos de Autorización Jerárquicos** ligeros y predigeridos, impulsados vía cachés secundarias en memoria distribuida:

1. **Firma Sin Estado**: La verificación de legitimidad de la sesión continúa sobre la validación de Token RS256 asimétrica, rotada dinámicamente (RTR).
2. **Grafado Agregado**: En lugar de unir repetidamente tablas relacionales, resolver la totalidad de los mapeos de `Rol -> Sistema -> Menú -> Submenú -> Acción` una vez.
3. **Ráfaga de Memoria Read-Aside**: Serializar esta estructura de grafo directamente en Redis, particionada por claves de contexto de usuario e inquilino. Mantener la resolución de autorización de acceso general bajo los **benchmarks físicos de <5ms**.
4. **Superioridad de Denegación Explícita**: Codificar la precedencia de reglas de tal manera que las anulaciones locales (`DENY`/Denegar) superen explícitamente las estructuras permisivas generales (`ALLOW`/Permitir) independientemente de la posición en la jerarquía.

## Consecuencias

### Positivas
- Reducción dramática de la latencia. Logra el máximo rendimiento de densidad para los usuarios finales en móvil/web inmediatamente tras el apretón de manos.
- Escalabilidad lineal: Los gateways de autenticación pueden replicarse horizontalmente indefinidamente sin impactar la capacidad del disco SQL.

### Negativas
- Exige una rigurosa lógica de invalidación de caché de Redis explícitamente vinculada a cualquier evento de escritura de gestión de permisos.

## Referencias
- [ADR-0014: Caché Redis](../../adrs/core/0014-distributed-caching-strategy-redis.md)
- [ADR-0022: Autorización Contextual](../../adrs/nodejs/0022-contextual-auth-and-pluggable-projections.md)

---
[Volver al Índice](./README.es.md)
