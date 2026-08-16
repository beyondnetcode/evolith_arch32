# Auto-hospedar el Core API

> **Navegación Bilingüe:** [English](./self-hosting-core-api.md)

**No necesitas esto para usar el CLI.** `evolith validate` evalúa localmente contra el corpus
de rulesets empaquetado en el paquete npm; no abre ningún socket ni necesita servidor. Esta
guía es para la superficie REST y para escenarios multi-repositorio donde varios satélites
consultan un mismo Core gobernado.

## Qué es

El Core API es un servicio de evaluación stateless: recibe un contexto de evaluación y
devuelve un resultado. No almacena estado de producto, tenant ni iniciativa -- esos son
contexto, nunca entidades.

## Ejecutarlo en local

El fichero compose bajo `product/infra/` levanta los servicios de soporte (PostgreSQL y
compañía). Comprueba qué servicios declara de verdad antes de asumir un puerto:

```bash
grep -nE '^  [a-z0-9-]+:' product/infra/docker-compose.yml
```

> **Esta guía afirmaba un arranque en un comando en `http://localhost:30080` vía
> `./.harness/scripts/run-core-local.sh`.** Ese script no existe, y ningún servicio del
> compose expone ese puerto. Fue durante meses la llamada a la acción más visible del
> repositorio. Si encuentras aquí otra instrucción que no funcione, es un defecto -- por favor
> abre un issue.

Para un stack local completo incluyendo el Tracker, ver
[`product/infra/docker-compose.fullstack.yml`](../../product/infra/docker-compose.fullstack.yml).

## Apuntar el CLI hacia él

```bash
export EVOLITH_CORE_URL="http://localhost:30080/api/v1"
```

Solo tiene sentido cuando hay un Core API realmente escuchando en esa dirección.

## Kubernetes

Los charts de Helm viven bajo `product/infra/`. El direccionamiento cross-cluster tiene
trampas medidas (`host.docker.internal` no resuelve dentro de pods de kind, entre otras) --
consulta las notas de infraestructura en vez de adivinar.
