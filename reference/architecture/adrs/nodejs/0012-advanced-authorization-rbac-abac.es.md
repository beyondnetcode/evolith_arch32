# [ADR 0012](0012-advanced-authorization-rbac-abac.md): Estrategia de Autorización Avanzada (RBAC/ABAC)

## Estado
Aprobado

## Fecha
2026-05-08

## Contexto
La identificación básica por JWT determina *quién* está accediendo al servicio, pero las aplicaciones SaaS necesitan restringir *qué* pueden hacer físicamente. Los usuarios en inquilinos (tenants) operativos activos necesitan verificaciones de matrices de permisos dependiendo de condiciones dinámicas, y las asignaciones de roles deben permanecer firmemente acotadas dentro de su contexto específico de Inquilino.

## Decisión
Implementar una Arquitectura Híbrida tendiendo un puente entre el control de acceso Basado en Roles (RBAC) y Basado en Atributos (ABAC):

1. **Marco de Guardias de NestJS**: Desplegar anotaciones personalizadas `@Roles()` y `@Permissions()` en los controladores. Usar Interceptores Globales nativos para leer el JWT parseado, obtener los metadatos asociados con las claims, y aprobar/denegar las entradas en la pipeline de ejecución inmediatamente.
2. **Acotación Estricta por Inquilino**: Los permisos nunca son globales. Un usuario puede ser un supervisor en el Inquilino A, y un observador en el Inquilino B. Las comprobaciones deben intersecar el contexto del endpoint objetivo con el token del Inquilino actual activo de `AsyncLocalStorage`.
3. **Pista de Seguridad Inmutable**: Los cambios cruciales de privilegios o los intentos fallidos de elevación de privilegios transmiten mensajes automáticamente al contexto de Log de Auditoría de forma asíncrona, ayudando a los flujos de vigilancia automatizada de amenazas.

## Consecuencias

### Positivas
- Política de acceso de grano fino que se adapta sin esfuerzo a configuraciones de negocio regulatorias complejas.
- Protege contra ataques internos laterales entre niveles del sistema o inquilinos.

### Negativas
- El crecimiento de la matriz de gestión requiere herramientas administrativas cuidadosas para mantenerse a lo largo del tiempo.
- Diseñar los tokens JWT cuidadosamente es necesario para evitar cargas útiles de paquetes sobredimensionadas que causen hinchazón en las cabeceras (header bloat).

## Referencias
- [Documentación de NestJS Guard](https://docs.nestjs.com/guards)
- [ADR-0010: Multi-Tenancy (RLS)](../../adrs/core/0010-multi-tenancy-architecture-strategy.md)

---
[Volver al Índice](./README.es.md)
