> **Navegación Bilingüe:** [View English version](./0098-rest-uri-versioning-deprecation-policy.md)

# ADR-0098: Versionado de URI REST y Política de Deprecación

> **Firma del Agente:** Architect Agent (Winston)

## Estado
Aceptado

## Fecha
2026-06-21

## Contexto y Problema
GT-155 unificó cada respuesta REST bajo el envelope ADR-0073. El siguiente modo de falla obvio es la evolución del contrato: un cambio en el Core API puede romper en silencio a Tracker o a cualquier satélite que consuma una ruta estable. Hoy el Core API habilita el versionado URI de NestJS (`api/v1/...` vía `defaultVersion`), pero varios controladores dependen del default implícito en vez de declarar versión, y no existe política publicada de deprecación — sin aviso mínimo, sin headers `Sunset`/`Deprecation`, sin requisito de changelog. El contrato puede así derivar sin señal visible al consumidor hasta que una petición devuelva la forma equivocada.

Las superficies CLI y MCP comparten el mismo problema (GT-174 definirá `meta.schemaVersion` y la matriz de compatibilidad productor/consumidor). REST es la superficie que necesita versionado **primero** porque los consumidores externos la alcanzan directamente por HTTP y no pueden fijar la versión del cliente como sí lo haría un import in-process.

## Decisión
Adoptar **versionado por URI** como estrategia canónica de versionado REST y publicar una política de deprecación aplicada por CI y visible a los llamantes en los headers de respuesta.

### 1. Base de versionado por URI
- Cada ruta REST se sirve bajo `/api/v<MAYOR>/...`. Hoy `<MAYOR> = 1`; futuras versiones mayores añaden segmentos nuevos en vez de mutar los existentes.
- Cada controlador declara su versión **explícitamente** en el decorador `@Controller({ path, version })`. El `defaultVersion: '1'` global queda como red de seguridad pero deja de ser la fuente autoritativa.
- Los endpoints operativos (`/health`, `/metrics`) declaran `version: VERSION_NEUTRAL` y documentan la razón. Liveness, readiness y los scrapers de Prometheus no toleran churn de URI.
- El versionado por header o query queda **rechazado**: complica el caching, hace las rutas menos greppables y empuja la preocupación de versión fuera de la URL, donde el diagnóstico del llamante aterriza naturalmente.

### 2. Política de deprecación
Una ruta entra en el ciclo de deprecación a través del decorador `@Deprecated()`. El decorador alimenta un interceptor que añade tres headers de respuesta según RFC 8594 y RFC 9745:

| Header | Valor | Origen |
|---|---|---|
| `Deprecation` | `true` (o timestamp RFC 9745) | siempre |
| `Sunset` | HTTP-date RFC 7231 | obligatorio |
| `Link` | `<ruta-sucesora>; rel="successor-version"` | obligatorio cuando hay sucesor |

El aviso mínimo entre deprecación y sunset es de **90 días**. La eliminación antes de la fecha de sunset requiere una excepción del Architecture Board registrada en el set de ADRs.

### 3. Requisito de changelog
Todo cambio de ruta versionada por URI lleva una entrada en el changelog bajo `product/products/core-api/changelog.md` (creado por GT-156) que indica:
- La ruta, el verbo HTTP y la versión.
- La clase de cambio (added · deprecated · removed · breaking-shape).
- Fecha efectiva y fecha de sunset en deprecaciones.
- La ruta sucesora, cuando aplique.

### 4. Aplicación en CI
- Una regla nativa en `.harness/scripts/` analiza `apps/core-api/src/presentation/controllers/*.controller.ts` y falla cuando:
  - Una declaración `@Controller(...)` carece de `version` y de `VERSION_NEUTRAL` a la vez.
  - Un controlador `VERSION_NEUTRAL` no lleva un comentario justificativo con el token `version-neutral-justification`.
- Un linter de deprecación falla el pipeline cuando un decorador `@Deprecated()` aparece sin entrada correspondiente en el changelog.

## Consecuencias

### Positivas
- Los consumidores externos ven la evolución del contrato en su capa HTTP (status, headers, ruta) en vez de descubrirla por un 500 o por un cambio de forma silencioso.
- Las nuevas versiones mayores pueden convivir con `v1` sin flag flips ni orden de despliegue, reduciendo el riesgo de rollout.
- La regla de CI evita que controladores futuros reintroduzcan el acoplamiento al default silencioso.

### Negativas / riesgos
- Introducir `v2` luego duplica la huella de rutas hasta el sunset de `v1`. Aceptable: los contratos son duraderos y la duplicación está acotada por el aviso mínimo de 90 días.
- El header `Sunset` es solo metadato — los operadores deben monitorear logs para aplicarlo. El linter de deprecación lo mitiga al exponer la ruta en el changelog, que sí es revisable.

### Trade-off aceptado
- Elegimos versionado por URI sobre versionado por Accept header, sabiendo que cuesta estabilidad de URL pero gana greppabilidad, amabilidad con el caching y diagnóstico de un solo golpe. El costo de la deprecación vive en el changelog, no en la semántica HTTP.

## Referencias
- [ADR-0073](./0073-unified-cli-output-contract.es.md) — Envelope de salida unificado (consumido por cada ruta versionada).
- [GT-155](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-155) — Precondición de conformidad del envelope.
- [GT-159](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-159) — Esta decisión realiza el gap.
- [GT-174](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-174) — `meta.schemaVersion` y matriz de compatibilidad entre superficies (downstream).
- [RFC 7231 §7.1.1.1](https://datatracker.ietf.org/doc/html/rfc7231#section-7.1.1.1) — Formato HTTP-date usado en `Sunset`.
- [RFC 8594](https://datatracker.ietf.org/doc/html/rfc8594) — El header HTTP Sunset.
- [RFC 9745](https://datatracker.ietf.org/doc/html/rfc9745) — El header HTTP Deprecation.
