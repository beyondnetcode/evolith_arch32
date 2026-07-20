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

- La capa oficial de exposición de red de Evolith Core es **`src/apps/core-api`**
  ([ADR-0074](../../reference/core/architecture/adrs/core/0074-evolith-core-api-exposure-layer.es.md)) —
  una API REST NestJS. Es el servicio real que consumen los clientes.
- **`evolith-bff`** (históricamente el chart Helm, el servicio `bff` de compose y
  `product/infra/docker/bff.Dockerfile`) era una **plantilla genérica
  de referencia del patrón BFF** (nodejs/ADR-0008): NO es la imagen real del
  core-api y no lleva configuración específica de core-api. Ya no está en ningún
  camino de despliegue: el chart Helm se renombró a `evolith-core-api` y el
  servicio de compose ahora es `core-api`, construido desde el Dockerfile real.
  Solo queda `product/infra/docker/bff.Dockerfile`, como plantilla de referencia.
- **"Tracker BFF"** (doc de arquitectura §11) es **externo** — pertenece a
  Evolith Tracker y *consume* core-api; no se despliega desde este repo.
- Los Dockerfiles reales por servicio son `src/apps/core-api/Dockerfile`,
  `src/packages/mcp-server/Dockerfile`, `src/apps/agent-runtime-api/Dockerfile`. Los
  archivos bajo `product/infra/docker/*.Dockerfile` son plantillas
  ilustrativas, no el build de producción.

## Matriz servicio-por-modelo

| Servicio canónico | Build real | Coolify (en vivo) | docker-compose | Chart Helm |
|---|---|---|---|---|
| **CORE-API** | `src/apps/core-api/Dockerfile` | `evolith-core-api` · `evolith.beyondnet.cloud` | `core-api` (build real) | `evolith-core-api` · `evolith.beyondnet.cloud` |
| **MCP Server** | `src/packages/mcp-server/Dockerfile` | `evolith-mcp` · `mcpevolith.beyondnet.cloud` | `mcp` (build real) | `evolith-mcp` · `mcpevolith.beyondnet.cloud` |
| **Agent Runtime** | `src/apps/agent-runtime-api/Dockerfile` | preparado · `evolithruntime.beyondnet.cloud` | `agent-runtime` (build real) | `evolith-agent-runtime` · `evolithruntime.beyondnet.cloud` |
| **SMART-CLI** | `src/sdk/cli` | npm `@beyondnet/evolith-cli` | n/a | n/a |
| **Tracker BFF** | externo (Tracker) | n/a | n/a | n/a |

`product/infra/docker-compose.evolith.yml` construye los tres servicios desde los
Dockerfiles **reales** (`src/apps/core-api/Dockerfile`,
`src/packages/mcp-server/Dockerfile`, `src/apps/agent-runtime-api/Dockerfile`),
cada uno con contexto de build `../..` — ninguna imagen plantilla está en el
camino de compose.

## Drift detectado

> **Estado:** #1 y #4 están **CERRADOS**. #2 y #3 están **cerrados en el repo**
> pero pendientes de la aplicación del lado de infraestructura. Se preserva
> abajo la redacción original.

1. ~~**`bff` vs `core-api`**: Helm/compose despliegan una plantilla genérica `bff`,
   mientras el servicio real/en vivo es `core-api`. Mismo rol, dos nombres, y el
   chart no construye la imagen real.~~ — **CERRADO.** El chart Helm es
   `evolith-core-api` y el servicio de compose es `core-api`, construido desde
   `src/apps/core-api/Dockerfile`. No queda ningún servicio `bff` en ningún
   camino de despliegue.
2. **Drift de dominio**: Coolify usa `*.beyondnet.cloud` (en vivo); Helm usa
   `*.beyondnetcode.com`. — **CERRADO en el repo, pendiente de infraestructura.**
   Los tres charts ya declaran `*.beyondnet.cloud`; falta apuntar el DNS.
3. **Drift de registry**: los charts Helm existentes referencian Docker Hub
   `beyondnetcode/*`; el nuevo workflow `docker-images.yml` publica a
   `ghcr.io/<owner>/*`. — **CERRADO en el repo, pendiente de infraestructura.**
   Los tres charts ya declaran `ghcr.io/beyondnetcode/*`; falta correr el
   workflow para publicar las imágenes.
4. ~~**Dos juegos de Dockerfiles**: reales (`apps/*`, `packages/*`) vs plantilla
   (`product/infra/docker/*`). El camino compose/Helm construye
   plantillas, no las imágenes reales.~~ — **CERRADO.** Compose y Helm apuntan
   ambos a los Dockerfiles reales; `product/infra/docker/*` es explícitamente
   sólo de referencia.

## Estado objetivo recomendado

- Tratar **`core-api`** (ADR-0074) como el nombre canónico en todas partes. O
  renombrar el chart Helm `evolith-bff` a `evolith-core-api` apuntando a la imagen
  real de `src/apps/core-api`, o mantener `evolith-bff` claramente etiquetado como
  plantilla genérica y agregar un chart real `evolith-core-api`.
- Estandarizar un **dominio canónico**. Recomendado: `*.beyondnet.cloud` (ya en
  vivo en Coolify) — actualizar `ingressRoute.host` de Helm en consecuencia.
- Estandarizar un **registry de contenedores**. Recomendado: `ghcr.io/<owner>/*`
  (el workflow `docker-images.yml` ya lo usa con el token integrado) — actualizar
  `image.repository` de los tres charts para que coincida.
- Apuntar los builds de compose/Helm a los **Dockerfiles reales**, o marcar las
  plantillas `product/infra/docker/*` como sólo de referencia.

## Decisiones resueltas (aplicado 2026-06-29)

La reconciliación en el repo ya fue aplicada:

1. **Dominio canónico → `beyondnet.cloud`.** `ingressRoute.host` de Helm
   actualizado: `evolith.beyondnet.cloud` (core-api),
   `mcpevolith.beyondnet.cloud` (mcp), `evolithruntime.beyondnet.cloud`
   (agent-runtime), todos con `PathPrefix(/)`.
2. **Registry canónico → `ghcr.io/beyondnetcode/*`.** `image.repository` de los
   tres charts actualizado; el workflow `docker-images.yml` publica ahí.
3. **`evolith-bff` renombrado a `evolith-core-api`**, modelado sobre el
   `src/apps/core-api` real (OPA in-process, sin sidecar, probes `/health`, puerto
   3000, secret `EVOLITH_API_KEY`). En `evolith-mcp` se corrigió el puerto `3001`
   obsoleto y los probes inexistentes `/ready`,`/startup` a `3000` + `/health`.

4. **Compose construye los Dockerfiles reales.**
   `product/infra/docker-compose.evolith.yml` construye `core-api`, `mcp` y
   `agent-runtime` desde `src/apps/core-api/Dockerfile`,
   `src/packages/mcp-server/Dockerfile` y
   `src/apps/agent-runtime-api/Dockerfile`. Los archivos
   `product/infra/docker/*` son plantillas sólo de referencia y ya no están en
   ningún camino de despliegue.

~~Sigue siendo de la infraestructura (aplicar al migrar): apuntar DNS, crear las
imágenes en el registry (correr el workflow) y reconciliar las plantillas
`product/infra/docker/*` o construir los Dockerfiles reales en compose.~~ — la
mitad de compose/Dockerfiles está **CERRADA** (ítem 4 arriba). Sigue siendo de
la infraestructura: apuntar DNS y crear las imágenes del registry corriendo el
workflow `docker-images.yml`.
