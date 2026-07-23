# ADR-0119: Endurecimiento de Configuración de Seguridad de API

> **Navegación Bilingüe:** [English Version](./0119-api-security-configuration-hardening.md)

| Campo | Valor |
|---|---|
| **Estado** | Aceptado |
| **Fecha** | 2026-07-23 |
| **Decisores** | Architecture Board |
| **Historia Técnica** | OWASP API8 / A05 — Security Misconfiguration |

## Contexto

La auditoría de endurecimiento de seguridad (Fases 1-4) identificó que varios controles de seguridad existían pero se aplicaban de forma inconsistente entre servicios. El core-api tenía rate limiting y Helmet, pero el agent-runtime-api carecía de ambos. Swagger se habilitaba automáticamente en non-production. NODE_ENV predeterminaba a development cuando no estaba configurado.

## Decisión

Establecer una **línea base unificada de configuración de seguridad** para todos los servicios HTTP (core-api, agent-runtime-api, mcp-server):

### 1. Rate Limiting
- Todos los servicios HTTP DEBEN implementar rate limiting (mínimo 100 req/min por IP).
- Usar `@nestjs/throttler` para servicios NestJS; implementación manual para Node.js raw.

### 2. Límites de Tamaño de Body
- Todos los servicios HTTP DEBEN enforce un tamaño máximo de request body (1MB por defecto).
- Rechazar requests que excedan el límite con 413 Payload Too Large.

### 3. Swagger / OpenAPI
- Swagger UI DEBE requerir opt-in explícito (`SWAGGER_ENABLED=true`) en TODOS los ambientes.
- Está prohibido habilitar automáticamente en non-production.

### 4. NODE_ENV Default
- Cuando `NODE_ENV` no está configurado, los servicios DEBEN predeterminar a `'production'` (fail-closed).
- Nunca predeterminar a `'development'` en lógica de autenticación o autorización.

### 5. Headers de Seguridad
- Todos los servicios HTTP DEBEN configurar: `Content-Security-Policy: default-src 'none'`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `Referrer-Policy: no-referrer`.
- `X-XSS-Protection: 0` (best practice moderno).

### 6. CORS
- Development: `origin: '*'` con `credentials: false`.
- Production: denegar cross-origin por defecto; requerir `CORS_ORIGINS` explícito.

## Consecuencias

- Todos los servicios nuevos deben implementar rate limiting y límites de body desde el día uno.
- Los servicios existentes deben ser auditados contra esta línea base trimestralmente.
- El test de security-headers valida el cumplimiento.
- `CORE_API_AUTH_REQUIRED=false` debe configurarse explícitamente en ambientes de test.

## ADRs Relacionados

- ADR-0005 (SAST Quality Gates)
- ADR-0059 (Helmet + CORS + Rate Limiting) — GT-59
- ADR-0075 (Core API Auth Strategy)
