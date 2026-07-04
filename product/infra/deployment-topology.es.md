# Topología de despliegue y reconciliación de nombres

> **Navegación bilingüe:** [English version](./deployment-topology.md)

Este documento es la fuente de verdad que resuelve el drift de nombres/dominios
entre los tres modelos de despliegue (Coolify, docker-compose, Helm). Mapea cada
servicio a su nombre canónico y aclara qué es realmente `bff`.

## Objetivo

Dar un mapa inequívoco de "qué artefacto despliega qué servicio, dónde y con qué
nombre", para que los modelos Coolify (en vivo), docker-compose (local) y Helm
(K8s) dejen de divergir.

## Verdad canónica (ADR-0074)

- La capa oficial de exposición de red de Evolith Core es **`apps/core-api`**
  ([ADR-0074](../architecture/adrs/core/0074-evolith-core-api-exposure-layer.es.md)) —
  una API REST NestJS. Es el servicio real que consumen los clientes.
- **`evolith-bff`** (el chart Helm, el servicio `bff` de compose y
  `reference/infrastructure/docker/bff.Dockerfile`) es una **plantilla genérica
  de referencia del patrón BFF** (nodejs/ADR-0008). NO es la imagen real del
  core-api y no lleva configuración específica de core-api.
- **"Tracker BFF"** (doc de arquitectura §11) es **externo** — pertenece a
  Evolith Tracker y *consume* core-api; no se despliega desde este repo.
- Los Dockerfiles reales por servicio son `apps/core-api/Dockerfile`,
  `packages/mcp-server/Dockerfile`, `apps/agent-runtime-api/Dockerfile`. Los
  archivos bajo `reference/infrastructure/docker/*.Dockerfile` son plantillas
  ilustrativas, no el build de producción.

## Matriz servicio-por-modelo

| Servicio canónico | Build real | Coolify (en vivo) | docker-compose | Chart Helm |
|---|---|---|---|---|
| **CORE-API** | `apps/core-api/Dockerfile` | `evolith-core-api` · `evolith.beyondnet.cloud` | `bff` (plantilla) | `evolith-core-api` · `evolith.beyondnet.cloud` |
| **MCP Server** | `packages/mcp-server/Dockerfile` | `evolith-mcp-server` · `mcpevolith.beyondnet.cloud` | `mcp` (plantilla) | `evolith-mcp` · `mcpevolith.beyondnet.cloud` |
| **Agent Runtime** | `apps/agent-runtime-api/Dockerfile` | preparado · `evolithruntime.beyondnet.cloud` | (ninguno) | `evolith-agent-runtime` · `evolithruntime.beyondnet.cloud` |
| **SMART-CLI** | `sdk/cli` | npm `@evolith/smart-cli` | n/a | n/a |
| **Tracker BFF** | externo (Tracker) | n/a | n/a | n/a |

## Drift detectado

1. **`bff` vs `core-api`**: Helm/compose despliegan una plantilla genérica `bff`,
   mientras el servicio real/en vivo es `core-api`. Mismo rol, dos nombres, y el
   chart no construye la imagen real.
2. **Drift de dominio**: Coolify usa `*.beyondnet.cloud` (en vivo); Helm usa
   `*.beyondnetcode.com`.
3. **Drift de registry**: los charts Helm existentes referencian Docker Hub
   `beyondnetcode/*`; el nuevo workflow `docker-images.yml` publica a
   `ghcr.io/<owner>/*`.
4. **Dos juegos de Dockerfiles**: reales (`apps/*`, `packages/*`) vs plantilla
   (`reference/infrastructure/docker/*`). El camino compose/Helm construye
   plantillas, no las imágenes reales.

## Estado objetivo recomendado

- Tratar **`core-api`** (ADR-0074) como el nombre canónico en todas partes. O
  renombrar el chart Helm `evolith-bff` a `evolith-core-api` apuntando a la imagen
  real de `apps/core-api`, o mantener `evolith-bff` claramente etiquetado como
  plantilla genérica y agregar un chart real `evolith-core-api`.
- Estandarizar un **dominio canónico**. Recomendado: `*.beyondnet.cloud` (ya en
  vivo en Coolify) — actualizar `ingressRoute.host` de Helm en consecuencia.
- Estandarizar un **registry de contenedores**. Recomendado: `ghcr.io/<owner>/*`
  (el workflow `docker-images.yml` ya lo usa con el token integrado) — actualizar
  `image.repository` de los tres charts para que coincida.
- Apuntar los builds de compose/Helm a los **Dockerfiles reales**, o marcar las
  plantillas `reference/infrastructure/docker/*` como sólo de referencia.

## Decisiones resueltas (aplicado 2026-06-29)

La reconciliación en el repo ya fue aplicada:

1. **Dominio canónico → `beyondnet.cloud`.** `ingressRoute.host` de Helm
   actualizado: `evolith.beyondnet.cloud` (core-api),
   `mcpevolith.beyondnet.cloud` (mcp), `evolithruntime.beyondnet.cloud`
   (agent-runtime), todos con `PathPrefix(/)`.
2. **Registry canónico → `ghcr.io/beyondnetcode/*`.** `image.repository` de los
   tres charts actualizado; el workflow `docker-images.yml` publica ahí.
3. **`evolith-bff` renombrado a `evolith-core-api`**, modelado sobre el
   `apps/core-api` real (OPA in-process, sin sidecar, probes `/health`, puerto
   3000, secret `EVOLITH_API_KEY`). En `evolith-mcp` se corrigió el puerto `3001`
   obsoleto y los probes inexistentes `/ready`,`/startup` a `3000` + `/health`.

Sigue siendo de la infraestructura (aplicar al migrar): apuntar DNS, crear las
imágenes en el registry (correr el workflow) y reconciliar las plantillas
`reference/infrastructure/docker/*` o construir los Dockerfiles reales en compose.
