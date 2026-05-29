# [ADR 0004](0004-frontend-offline-resilience.md): Resiliencia Offline del Frontend

## Estado
Aprobado

## Fecha
2026-05-08

## Contexto
Las aplicaciones web que dependen enteramente de la conectividad con el servidor proporcionan una experiencia de usuario deficiente cuando las condiciones de la red se degradan (conexiones móviles, VPNs corporativas lentas). Los usuarios pierden el estado no guardado y reciben mensajes de error crípticos en lugar de una degradación elegante.

## Decisión
Implementar resiliencia offline en la capa del frontend utilizando **React Query** (TanStack Query) como la solución principal para la gestión del estado y la caché en el lado del cliente.

Estrategias clave:
- **Stale-While-Revalidate**: Servir datos cacheados inmediatamente mientras se obtienen actualizaciones en segundo plano.
- **Optimistic Updates** (Actualizaciones Optimistas): Aplicar mutaciones a la UI instantáneamente antes de que el servidor las confirme, con rollback automático en caso de fallo.
- **Background Sync** (Sincronización en Segundo Plano): Encolar mutaciones realizadas sin conexión y reproducirlas cuando se restaure la conectividad.
- **Lógica de Reintento**: Backoff exponencial automático para peticiones fallidas (configurable por consulta).

## Consecuencias

### Positivas
- Los usuarios ven los datos inmediatamente al navegar - sin indicadores de carga (spinners) para contenido cacheado.
- Los formularios y mutaciones se sienten instantáneos vía actualizaciones optimistas.
- Modo offline elegante: la aplicación sigue siendo utilizable para operaciones de lectura incluso sin conectividad.

### Negativas
- Las actualizaciones optimistas requieren una lógica de rollback cuidadosa para mutaciones complejas de múltiples pasos.
- Los desarrolladores deben entender el modelo de invalidación de caché para prevenir problemas de datos obsoletos.

## Referencias
- [Documentación de TanStack Query](https://tanstack.com/query)
- [ADR-0011: Patrones de Resiliencia y Tolerancia a Fallos](../../adrs/core/0011-fault-tolerance-resiliency-patterns.md)

---
[Volver al Índice](./README.es.md)
