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
- El test de security-headers valida ahora el cumplimiento **por valor**, no por presencia. Antes
  solo comprobaba que tres cabeceras estuvieran *definidas* —lo cual pasa con `default-src 'self'` y
  `SAMEORIGIN`, justo los valores que §5 prohíbe— y montaba su propia aplicación con
  `origin: ['*'], credentials: true`, contradiciendo el `credentials: false` de §6, así que nunca
  ejercitaba la configuración desplegada. El arnés monta ahora lo mismo que `main.ts`, y cada
  cabecera de §5 se afirma contra el valor que manda.
- `CORE_API_AUTH_REQUIRED=false` debe configurarse explícitamente en ambientes de test.

## Brechas Pendientes

Las cláusulas anteriores son la decisión y se mantienen tal como están escritas. Lo que sigue es
dónde este repositorio **no** las cumple hoy. Cada entrada es un defecto del código, no un motivo
para rebajar la cláusula.

1. **§4 — `NODE_ENV` predeterminaba a `development` en los tres servicios. CERRADA.** El
   fail-closed exige `'production'` cuando la variable no está configurada, y sin configurar es el
   estado en el que llega un contenedor recién hecho, un fichero de entorno olvidado y un
   `node dist/main` a secas. Cada sitio lee ahora sin configurar o en blanco como producción:
   - `src/apps/core-api/src/infrastructure/config/env.validation.ts` — el valor por defecto del
     esquema es `'production'`. Alimentaba a `main.ts`, donde `development` elegía `origin: '*'`.
   - `src/apps/agent-runtime-api/src/main.ts` — desaparece el `?? "development"`; sin configurar o
     en blanco resuelve a producción, que deniega cross-origin salvo `CORS_ORIGINS` explícito (§6).
   - `src/packages/mcp-server/src/mcp/mcp-tool-dispatch.ts` — el `environment` del contexto anónimo
     resuelve a producción. Este no era cosmético: el evaluador ABAC concede herramientas de
     **escritura** a los roles de desarrollo cuando `environment !== 'production'`, así que bastaba
     con no configurar la variable para abrir la escritura.

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

3. **§5 — `helmet()` sin configurar no emitía los valores exigidos. CERRADA.** helmet 8.2.0
   predetermina a `Content-Security-Policy: default-src 'self'` y `X-Frame-Options: SAMEORIGIN`,
   donde §5 exige `'none'` y `DENY` — una llamada sin opciones parece endurecimiento y entrega otra
   cosa. Los dos servicios lo configuran ahora de forma explícita (`default-src 'none'`,
   `frameguard: deny`, `Referrer-Policy: no-referrer`), y la interfaz de Swagger conserva un CSP
   relajado **acotado a su propia ruta de documentación**, y solo cuando alguien la habilitó con
   `SWAGGER_ENABLED=true`, en vez de relajar la política de toda la API. La prueba afirma ahora esos
   valores en vez de su mera presencia.

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
