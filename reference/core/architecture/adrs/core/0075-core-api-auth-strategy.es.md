# ADR-0075: Estrategia de Autenticación del Core API

- **Estado:** Superseded by ADR-0080
- **Decisores:** Evolith Architecture Board
- **Fecha:** 2026-06-14

## Contexto

> **Nota de reemplazo (2026-06-19):** Evolith Core es un corpus y motor de arquitectura open source, no un perímetro de producto autenticado. El BFF de Evolith Tracker es el único perímetro autenticado; valida el Bearer token y el grafo de autorización de UMS. El modelo de API key y JWT futuro que sigue es histórico y no debe extenderse en Core.

El Core API expone operaciones críticas (evaluación de gates, inicialización de proyectos, detección de drift de arquitectura) sin ningún mecanismo de autenticación. Esto viola los requisitos del OWASP API Security Top 10: API1 (Autorización a Nivel de Objeto Roto), API2 (Autenticación Rota) y API5 (Autorización a Nivel de Función Roto).

## Decisión

Implementar un modelo de autenticación de dos niveles:

### Nivel 1: API Key (M2M) — Implementado Ahora
- Comunicación máquina a máquina entre el Tracker y el Core API
- API keys validadas mediante el header `x-api-key`
- Keys almacenadas como variables de entorno, hasheadas con SHA-256 y comparadas usando comparación en tiempo constante (`timingSafeEqual`)
- `ApiKeyAuthGuard` registrado como `APP_GUARD` global
- Decorador `@Public()` exime los endpoints de health/métricas
- **Mitigaciones OWASP:** API1, API5

### Nivel 2: JWT Bearer (Acceso Humano) — Futuro
- Tokens JWT Bearer para acceso humano (CLI, Dashboard)
- Access tokens con TTL corto, refresh tokens con TTL largo
- Claims basados en roles (`admin`, `operator`, `reader`)
- Integración OAuth2/OIDC para SSO
- **Mitigación OWASP:** API2

## Consecuencias

- Todos los endpoints no públicos retornan 401 sin `x-api-key` válido
- Las API keys deben rotarse mediante cambios en variables de entorno + reinicio del servicio
- El endpoint de health check permanece accesible públicamente
- Ruta de migración futura a JWT: agregar `JwtStrategy` junto a `ApiKeyStrategy`, configurar `AuthGuard(['api-key', 'jwt'])`

## Referencias

- [OWASP API1:2023](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/)
- [OWASP API2:2023](https://owasp.org/API-Security/editions/2023/en/0xa2-broken-authentication/)
- [OWASP API5:2023](https://owasp.org/API-Security/editions/2023/en/0xa5-broken-function-level-authorization/)
- [apps/core-api/src/infrastructure/auth/](https://github.com/beyondnetcode/evolith_arch32/tree/main/apps/core-api/src/infrastructure/auth)

> **Agent Signature:** Architect Agent
