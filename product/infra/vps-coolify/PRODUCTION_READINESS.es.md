# Camino a producción — qué está listo, qué no, y qué solo puede hacer el dueño

> **Navegación Bilingüe:** [English](./PRODUCTION_READINESS.md) · Español (este documento)

`GT-435` es el épico que dice que nada ha corrido nunca en producción. Esta página es el
**preflight**: todo lo de ese camino que se puede establecer *sin servidor*, establecido, para que
el día que exista el VPS no sea el día de descubrir que los charts apuntan a nada.

No es un plan, a propósito. Es una lista de hechos con fecha, y una lista de decisiones que no nos
corresponden.

## Lo que estaba roto, encontrado el 2026-08-02 sin clúster

**Todos los charts del Core pedían una imagen que ningún workflow produce.**

| chart | pedía | publica CI | veredicto |
|---|---|---|---|
| `evolith-core-api` | `0.0.2` | `latest`, `<sha>` | existe build semver, pero `docker-images.yml` **nunca ha corrido** |
| `evolith-mcp` | `1.1.0` | `latest`, `<sha>` | igual |
| `evolith-agent-runtime` | `0.1.0` | `latest`, `<sha>` | **peor — nunca ha existido un tag `v0.1.0`**, así que ninguna ruta podía producirla |

Un `helm install` con los valores por defecto habría dado `ImagePullBackOff` en los tres servicios.
Ningún CI en verde podía revelarlo: nada ha tirado nunca de esas imágenes.

Arreglado apuntando los charts a `latest`, que `ci-cd.yml` empuja en cada merge a `main`, y vigilado
por `58-validate-deployable-images` para que no vuelva. La guarda es estática — nunca contacta con
un registro, porque un chequeo que necesita credencial corre en un job y se pudre en el resto.

**Producción debe seguir sobrescribiendo el tag.** `--set image.tag=<sha>` es la invocación
correcta: a `latest` no se puede volver atrás, y `GT-448` exige un rollback efectivamente
ejercitado, que un tag flotante hace imposible de demostrar.

## Lo que el preflight NO puede decirte

Que una imagen **se pueda** producir es demostrable aquí. Que **se produjera** es un hecho sobre un
registro. La guarda dice cuál de las dos cosas está comprobando, imagen por imagen, en vez de
insinuar la más fuerte.

Antes del primer despliegue, un comando lo zanja:

```bash
# Requiere un token con read:packages. Si falta un tag, primero mergea a main.
gh api /orgs/beyondnetcode/packages/container/evolith-core-api/versions \
  --jq '[.[].metadata.container.tags[]] | unique'
```

## El Tracker no tiene CD de imágenes en absoluto

Medido el mismo día en `evolith_tracker`: tres Dockerfiles, **cero workflows que los construyan o
publiquen**, y charts que referencian `ghcr.io/beyondnetcode/evolith-tracker-api:0.0.1`,
`…-web:0.0.1` y `evolith-tracker-gateway:local` — este último un tag que ningún registro puede
servir jamás.

Es la mitad más grande de `GT-435` y vive en el otro repositorio. No es un arreglo de tag: el CD no
existe. Se sigue allí y no se repite aquí, para que un solo tablero sea su dueño.

## Decisiones y credenciales — solo el dueño

Ninguna es un cambio de código, y ninguna se puede hacer desde este repositorio.

| Qué | Por qué es tuyo | Bloquea |
|---|---|---|
| Un VPS alcanzable | `72.60.63.240` no respondió en 8000/443/80/ICMP desde dos puntos distintos | `GT-435`, `GT-448`, `GT-324` |
| `COOLIFY_API_TOKEN` + los dos deploy hooks | El job `deploy` no hace nada y avisa hasta que existan esos secretos — a propósito, para que sea seguro mergear | `GT-324` |
| Credenciales de base de datos de producción y su depósito | Nunca en un chart, nunca en git | `GT-442` |
| Dos semillas Ed25519 para el ledger de transparencia, en un depósito de secretos, más un PVC | Custodia de claves. El cable de firma está construido y apagado; se niega a caer a una clave de desarrollo, porque un ledger que parece firmado y no prueba nada es peor que ninguno | `GT-588` |
| Un encargo de pen-test | Lo tiene que intentar alguien de fuera; esta no nos la podemos autocertificar | `GT-444` |

## Lo que pasa a ser medible el día que exista el servidor

Anotado ahora para que las cifras se tomen en vez de estimarse después:

- **RTO y RPO en una restauración de desastre real** — el último criterio abierto de `GT-443`. El
  drill de caos ya rechaza confundirlos: publica MTTR y dice que un reinicio de contenedor en un
  host de CI no es nunca RTO/RPO.
- **La tasa de falso bloqueo de las compuertas** — `GT-585`. El instrumento está construido y
  probado; necesita humanos anulando decisiones reales, que necesita producción. `evolith calibrate
  report` la calcula el día que existan las etiquetas.
- **El camino de extremo a extremo del diagrama** — un cambio de satélite llegando a un veredicto
  del Core a través del Tracker, con una corrida registrada. Ese es el segundo criterio del propio
  `GT-435`, y el único que no se puede simular.
