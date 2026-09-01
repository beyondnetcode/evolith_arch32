# ADR-0119: Endurecimiento de Configuración de Seguridad de API

> **Navegación Bilingüe:** [English Version](./0119-api-security-configuration-hardening.md)

| Campo | Valor |
|---|---|
| **Estado** | Aceptado |
| **Fecha** | 2026-07-23 |
| **Decisores** | Architecture Board |
| **Historia Técnica** | OWASP API8 / A05 — Security Misconfiguration |

<!-- implementation-status: src/apps/core-api/src/main.ts, src/apps/core-api/src/app.module.ts, src/apps/core-api/src/infrastructure/config/env.validation.ts, src/apps/agent-runtime-api/src/main.ts -->
> **Estado de implementación en este repositorio: parcial** (2026-09-01). El rate limiting (§1), el
> opt-in de Swagger (§3) y la denegación CORS por defecto en producción (§6) están en su sitio. El
> default fail-closed de `NODE_ENV` (§4) y los valores de cabecera exigidos (§5) no lo están. Cada
> incumplimiento se detalla en [Brechas Pendientes](#brechas-pendientes) con su fichero y línea.

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
- El test de security-headers **no** valida el cumplimiento de esta línea base. Solo comprueba que
  `X-Frame-Options`, `X-Content-Type-Options` y `X-DNS-Prefetch-Control` estén *definidas*
  (`toBeDefined()`, `src/apps/core-api/src/presentation/controllers/security-headers.spec.ts:46-61`)
  — no comprueba ningún valor exigido por §5, y nunca mira `Content-Security-Policy`,
  `Strict-Transport-Security`, `Referrer-Policy` ni `X-XSS-Protection`. Peor aún: el test monta su
  propia aplicación con `origin: ['*'], credentials: true` (líneas 34-37), lo que contradice el
  `credentials: false` de §6, de modo que ni siquiera ejercita la configuración CORS desplegada. §5
  y §6 quedan por tanto sin cobertura; falta escribir un test conforme.
- `CORE_API_AUTH_REQUIRED=false` debe configurarse explícitamente en ambientes de test.

## Brechas Pendientes

Las cláusulas anteriores son la decisión y se mantienen tal como están escritas. Lo que sigue es
dónde este repositorio **no** las cumple hoy. Cada entrada es un defecto del código, no un motivo
para rebajar la cláusula.

1. **§4 — `NODE_ENV` sigue predeterminando a `development` en los tres servicios.** El fail-closed
   exige `'production'` cuando la variable no está configurada:
   - `src/apps/core-api/src/infrastructure/config/env.validation.ts:5` —
     `z.enum(['development', 'production', 'test']).default('development')`.
   - `src/apps/agent-runtime-api/src/main.ts:41` — `process.env.NODE_ENV ?? "development"`, cuyo
     valor selecciona pocas líneas más abajo `origin: "*"` para CORS.
   - `src/packages/mcp-server/src/mcp/mcp-tool-dispatch.ts:223` — `process.env.NODE_ENV ||
     'development'` en el contexto de usuario que se entrega a la autorización de herramientas.

2. **§4 — el guard de autenticación del agent-runtime fallaba ABIERTO fuera de producción. CERRADA.**
   En `src/apps/agent-runtime-api/src/auth/api-key.guard.ts`, cuando no había configurado ni
   `AGENT_RUNTIME_API_KEY` ni `AGENT_RUNTIME_JWT_SECRET`, la rama `if (!isProd || allowNoAuth)`
   adjuntaba un principal con `authMethod: 'none'` y `tenantId: WILDCARD_TENANT` y devolvía `true`
   —acceso concedido, tenant comodín, sin presentar credencial— mientras el comentario que la
   precede decía «Fail-closed». La postura ahora lee **`NODE_ENV` sin configurar o en blanco como
   producción**, así que el estado en el que llega un contenedor recién hecho, un fichero de entorno
   olvidado o un `node dist/main` a secas deniega en vez de abrir. Correr sin autenticación exige un
   acto deliberado: `NODE_ENV=development`, que alguien escribió, o el explícito
   `AGENT_RUNTIME_ALLOW_NO_AUTH=true`. Lo fijan tres pruebas en `api-key.guard.spec.ts` —sin
   configurar, en blanco, y la vía declarada que debe seguir funcionando—, cada una comprobada
   fallando contra el código anterior.

   La brecha 1 ya no agrava esta: el guard deriva su propia postura en vez de fiarse del valor por
   defecto del servicio. La brecha 1 sigue abierta por su cuenta.

3. **§5 — `helmet()` sin configurar no emite los valores de cabecera exigidos.** `helmet()` se
   invoca sin opciones en `src/apps/core-api/src/main.ts:53` y
   `src/apps/agent-runtime-api/src/main.ts:12`. Los valores por defecto de helmet 8.2.0 producen
   `Content-Security-Policy: default-src 'self'` y `X-Frame-Options: SAMEORIGIN`, donde §5 manda
   `default-src 'none'` y `DENY`. Ninguno de los dos puntos de invocación los sobrescribe.

## ADRs Relacionados

- ADR-0005 (SAST Quality Gates)
- ADR-0075 (Core API Auth Strategy)

## Brechas Relacionadas

- [`GT-59`](../../../control-center/gaps/gap-reference-catalog.es.md#gt-59) — Hardening HTTP: Helmet
  + CORS + Rate Limiting (OWASP API4/8). Revisiones anteriores de este ADR lo citaban como
  «ADR-0059»: no existe tal decisión en el corpus core, cuya numeración salta del 0058 directamente
  al 0067. El identificador es de gap, y el gap se registra en el tablero de gaps, no en el corpus
  de ADRs.

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
