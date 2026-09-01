# Runbook de Promoción a Producción — Motor Evolith (Coolify / VPS Hostinger)

> **Navegación bilingüe:** [English version](./README.md)

> Cierra la ruta de operaciones de **GT-448** ("nada corre en producción: el stack
> nunca se promovió al servidor que alcanzarían los clientes") y su paraguas
> **GT-435** ("la ruta extremo a extremo código → producto en ejecución no está
> desplegada/validada").
>
> Este runbook prepara y documenta la promoción. **No la ejecuta.**
> El único acto irreversible — poner `VPS_DEPLOY_ENABLED` en `true` en un repo
> que hace push a `main` — queda reservado para el usuario (ver
> [Lo que solo el usuario puede hacer](#lo-que-solo-el-usuario-puede-hacer-vs-lo-que-está-automatizado)).

---

## 0. Qué despliega esto, y la topología de referencia

CD construye tres imágenes de servicio del **motor** en cada push a `main`, las
publica en GHCR y luego dispara un hook de despliegue de Coolify por servicio.
Las imágenes son exactamente las que se probaron localmente con
`product/infra/docker-compose.fullstack.yml`:

| Servicio        | Imagen (GHCR)                                | App Coolify | Puerto (contenedor) | Health         |
| --------------- | -------------------------------------------- | ----------- | ------------------- | -------------- |
| `core-api`      | `ghcr.io/<owner>/evolith-core-api:<sha>`     | **id 12**   | `3000`              | `GET /health`  |
| `mcp-server`    | `ghcr.io/<owner>/evolith-mcp:<sha>`          | **id 13**   | `3000`              | `GET /health`  |
| `agent-runtime` | `ghcr.io/<owner>/evolith-agent-runtime:<sha>`| (asignar)   | `3000`              | `GET /health`  |
| `redis`         | `redis:7.2-alpine` (gestionado por Coolify)  | (asignar)   | `6379`              | `redis-cli ping` |

El **compañero Tracker** (`tracker-postgres`, `tracker-migrate`, `tracker-api`,
`tracker-web`, `tracker-gateway`) vive en el repo hermano `evolith_tracker` y se
despliega mediante el propio pipeline de ese repo. Este runbook del motor termina
en la frontera de `core-api`; el smoke test de la cadena de navegador en §5 ejercita
ambas mitades.

La **topología de producción refleja el full-stack local** exactamente:

```
tracker-web (nginx SPA)                 ← despliegue evolith_tracker
  → tracker-api (.NET BFF, POST /api/v1) ← despliegue evolith_tracker
      → core-api  POST /api/v1/evaluate  ← ESTE despliegue (Coolify app 12)
          → redis (cache)                ← ESTE despliegue
      mcp-server (superficie de agente, http)   ← ESTE despliegue (Coolify app 13)
      agent-runtime → core-api /evaluate ← ESTE despliegue
```

Hechos verificados en el repo (no asumidos):

- **`core-api` es stateless** (ADR-0101). Su imagen hornea el corpus en
  `/app/corpus/rulesets` (rulesets + `policy.wasm` compilado + referencia humana),
  así que **no necesita volumen ni base de datos propia**. `CORE_PATH` /
  `WORKSPACE_ROOT` deben permanecer como `/app/corpus` o OPA hace fail-closed ante
  un `policy.wasm` ausente en producción (`src/apps/core-api/Dockerfile`).
- **La persistencia en la cadena de navegador es el Postgres del Tracker**, no el
  del Core. El registro de evaluación lo escribe `tracker-api` después de que el
  Core responde.
- **MCP usa HTTP + API key** (`TRANSPORT=http`, `EVOLITH_MCP_ALLOW_NO_AUTH=false`).
- La ruta de evaluación es `POST /api/v1/evaluate` (versionado de URI de NestJS,
  versión `1`); `/health` es neutral a la versión (sin prefijo `/api/v1`).

---

## 1. Cómo está cableado CD (leer antes de tocar nada)

Fuente de verdad: `.github/workflows/ci-cd.yml`.

1. **Build & test** — los jobs `Test`, `Test core-domain`, `Test core`,
   `Test mcp-server`, `Test core-api`, `Test sdk-client`, `Test contract`,
   `Test infra-providers` corren en cada PR a `main`/`develop`.
2. **`Build Services (GHCR)`** (job `docker-services`) — construye `core-api`,
   `mcp-server` y `agent-runtime` en **cada PR**, y publica `:latest` + `:<sha>`
   en GHCR solo desde `main` o tags `v*`, usando el `GITHUB_TOKEN` incorporado
   (sin secret extra). El build era solo-main hasta GT-679; un Dockerfile roto
   cruzó tres PRs en verde porque el único job que lo habría detenido corría
   después de que ya hubieran mergeado. Las tres ramas del matrix se colapsan en
   un único check estable, **`Services build (GHCR)`** (job
   `docker-services-gate`), que es el contexto que nombra la protección de rama:
   los contextos de matrix llevan sus parámetros y cambian cada vez que cambia
   una ruta.
3. **`Deploy services (Coolify)`** (job `deploy`, `needs: [docker-services]`) —
   el paso de promoción. Su guarda es:

   ```yaml
   if: github.ref == 'refs/heads/main' && vars.VPS_DEPLOY_ENABLED == 'true'
   ```

   Tiene tres pasos — `Trigger Coolify deploy (core-api)`,
   `Trigger Coolify deploy (mcp-server)`, `Trigger Coolify deploy (agent-runtime)`
   — cada uno de los cuales:
   - **fail-soft** cuando su hook o el API token no están definidos: imprime un
     `::warning::` y `exit 0` (seguro para mergear antes de configurar CD), y
   - **fail-hard** una vez configurado: `curl --fail ... "$HOOK" -H "Authorization: Bearer $TOKEN"`
     devuelve no-cero si el hook no responde, lo que significa que el despliegue
     no ocurrió. Si este paso está en rojo, mira el runtime antes que el workflow.

**GT-567 — el job de deploy está deliberadamente APAGADO.** La variable de guarda
`VPS_DEPLOY_ENABLED` está sin definir/`false`, así que el job `deploy` se salta en
cada push a `main`. Esto es intencional (el objetivo era Docker + `kind` local; el
VPS quedó aparcado). Reactivarlo es **un comando** (§4, paso 6) y es la acción
irreversible del usuario. Los secrets se mantuvieron en su lugar y solo la
*variable* alterna la compuerta, por diseño — así el estado "apagado" es visible en
un solo lugar y reversible sin el panel del VPS.

---

## 2. Checklist de pre-vuelo (hacer todo esto antes de habilitar CD)

- [ ] **VPS alcanzable.** El VPS de Hostinger está arriba y Coolify está corriendo
      y accesible por HTTPS.
- [ ] **Existen tres apps de Coolify que hacen pull desde GHCR** (no "build from git"):
      - core-api → `ghcr.io/<owner>/evolith-core-api:latest` (app id **12**)
      - mcp-server → `ghcr.io/<owner>/evolith-mcp:latest` (app id **13**)
      - agent-runtime → `ghcr.io/<owner>/evolith-agent-runtime:latest`
      Si los paquetes de GHCR son privados, añade una credencial de registry GHCR en
      Coolify (un PAT con `read:packages`).
- [ ] **Un recurso `redis` gestionado** existe en el mismo proyecto/red de Coolify,
      alcanzable desde `core-api` en `redis://redis:6379` (o define `REDIS_URL` con
      la dirección que Coolify asigne).
- [ ] **Las variables de entorno de runtime están definidas en cada app de Coolify**
      (los valores viven en Coolify, NO en GitHub). Ver `production-env.example` en
      esta carpeta para el conjunto anotado completo. Como mínimo:
      - core-api: `EVOLITH_API_KEY`, `REDIS_URL`, `CORE_PATH=/app/corpus`,
        `WORKSPACE_ROOT=/app/corpus`, `NODE_ENV=production`, `PORT=3000`
      - mcp-server: `EVOLITH_API_KEY`, `TRANSPORT=http`,
        `EVOLITH_MCP_ALLOW_NO_AUTH=false`, `CORE_PATH=/app/corpus`,
        `WORKSPACE_ROOT=/app/corpus`
      - agent-runtime: `AGENT_RUNTIME_API_KEY`, `AGENT_RUNTIME_CORE_ENDPOINT`,
        `AGENT_RUNTIME_CORE_TOKEN`, y (si se usa HITL) los dos valores
        `AGENT_RUNTIME_APPROVAL_TRACKER_*`
      **Usa el mismo valor de `EVOLITH_API_KEY`** en core-api, mcp-server y como
      `AGENT_RUNTIME_CORE_TOKEN` — la topología local usa una clave compartida
      (ancla `x-api-key` en el compose full-stack). Genera un valor aleatorio fuerte;
      no reutilices `local-dev-key`.
- [ ] **El webhook de deploy por app está habilitado** en Coolify (necesario para
      capturar las URLs de hook en §3).
- [ ] **Un API token de Coolify** existe con permiso para disparar despliegues.
- [ ] **La protección de la rama `main`** está en verde (los 6 checks requeridos) para
      que nada roto pueda llegar al job de deploy.
- [ ] **El compañero Tracker está desplegado** (o listo para desplegar) para que el
      smoke test de navegador de §5 pueda correr extremo a extremo.

---

## 3. El checklist exacto de secrets y variables de GitHub

Estos son los **únicos** ajustes a nivel de repo en GitHub que la promoción necesita.
Configúralos con el CLI `gh` desde un checkout de este repo (se acotan al repo actual).

### Secrets — `gh secret set <NAME>`

| Nombre del secret                    | Dónde obtenerlo en Coolify                                                                                   | Comando |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------- |
| `COOLIFY_API_TOKEN`                  | Coolify → **Keys & Tokens → API Tokens** → crea un token con permiso de deploy.                              | `gh secret set COOLIFY_API_TOKEN` |
| `COOLIFY_COREAPI_DEPLOY_HOOK`        | Coolify → **core-api app (id 12) → Webhooks → Deploy** → copia la URL completa del webhook.                  | `gh secret set COOLIFY_COREAPI_DEPLOY_HOOK` |
| `COOLIFY_MCP_DEPLOY_HOOK`            | Coolify → **mcp-server app (id 13) → Webhooks → Deploy** → copia la URL completa del webhook.                | `gh secret set COOLIFY_MCP_DEPLOY_HOOK` |
| `COOLIFY_AGENTRUNTIME_DEPLOY_HOOK`   | Coolify → **agent-runtime app → Webhooks → Deploy** → copia la URL completa del webhook.                     | `gh secret set COOLIFY_AGENTRUNTIME_DEPLOY_HOOK` |

`gh secret set` lee el valor de un prompt interactivo o de stdin, así que el valor
nunca queda en el historial del shell, p. ej.:

```bash
gh secret set COOLIFY_API_TOKEN                 # luego pega el token en el prompt
gh secret set COOLIFY_COREAPI_DEPLOY_HOOK       # pega la URL del hook
gh secret set COOLIFY_MCP_DEPLOY_HOOK
gh secret set COOLIFY_AGENTRUNTIME_DEPLOY_HOOK
```

> No forma parte de la promoción al VPS, listado por completitud: `NPM_TOKEN` lo usa
> solo el job `Publish npm` en tags `v*`, y `GITHUB_TOKEN` (incorporado) autentica
> el push a GHCR — ninguno necesita crearse para este runbook.

### Variable — `gh variable set <NAME>`

| Nombre de variable    | Valor  | Efecto                                                                 |
| --------------------- | ------ | --------------------------------------------------------------------- |
| `VPS_DEPLOY_ENABLED`  | `true` | Des-compuerta el job `deploy` en push a `main`. **Este es el switch que enciende los despliegues a producción.** |

```bash
gh variable set VPS_DEPLOY_ENABLED --body true
```

### Verificar lo que está configurado (sin imprimir valores)

```bash
gh secret list
gh variable list
```

---

## 4. Orden de promoción

Haz esto en orden. Los pasos 1–5 son reversibles / no destructivos. **El paso 6 es
el go-live irreversible y le corresponde ejecutarlo al usuario.**

1. **Completa el pre-vuelo de §2** — apps, redis, env de runtime por app, webhooks,
   API token, todo en su lugar en Coolify.
2. **Configura los tres secrets de deploy-hook + el API token** (§3, tabla de secrets).
   Con estos definidos y `VPS_DEPLOY_ENABLED` aún sin definir, el job de deploy sigue
   saltándose — nada se despliega todavía.
3. **Mergea un cambio normal a `main`** (o vuelve a ejecutar el workflow) y confirma
   que el job `Build Services (GHCR)` está en verde y las tres imágenes aparecen en
   GHCR (en un PR el mismo job va en verde sin publicar nada). El job `deploy` debería
   seguir mostrándose como **skipped** (la guarda está apagada).
4. **Opcionalmente despliega una vez manualmente desde la UI de Coolify** (cada app →
   Deploy) para probar que las imágenes arrancan y el env de runtime es correcto, antes
   de cablear el disparador automático. Observa que cada `/health` pase a verde.
5. **Ejecuta el smoke test de §5** contra el stack desplegado manualmente. Si la cadena
   de navegador se prueba correctamente, CD solo automatizará lo que ya funciona.
6. **ACCIÓN DEL USUARIO — habilitar CD automatizado:**
   ```bash
   gh variable set VPS_DEPLOY_ENABLED --body true
   ```
   Desde el siguiente push a `main`, el job `deploy` corre y hace `curl --fail` a cada
   hook de Coolify. Este es el switch irreversible de promoción a producción. Para pausar
   CD de nuevo: `gh variable set VPS_DEPLOY_ENABLED --body false`.

---

## 5. Smoke test extremo a extremo post-despliegue (prueba GT-435)

GT-435 está "cerrado" solo cuando una evaluación gobernada fluye por la cadena de
navegador **real** y se **persiste** — no cuando un contenedor meramente arranca. Ejecuta
las tres capas.

### 5a. Liveness (cada servicio del motor)

```bash
# core-api  (/health neutral a la versión)
curl -fsS https://<core-api-host>/health

# mcp-server  (transport http, health sin autenticar)
curl -fsS https://<mcp-host>/health

# agent-runtime
curl -fsS https://<agent-runtime-host>/health
```

Los tres deben devolver HTTP 200.

### 5b. Core evaluate directo (prueba el motor + OPA/policy.wasm en prod)

```bash
curl -fsS -X POST https://<core-api-host>/api/v1/evaluate \
  -H "Content-Type: application/json" \
  -H "x-api-key: $EVOLITH_API_KEY" \
  -d '{ "workspaceRef": "rulesets", "phase": "1" }'
```

Espera **HTTP 200** y un sobre de éxito ADR-0073 que envuelve un
`EvaluationResult` (un `overallVerdict` de `PASS`/`FAIL`/… — un veredicto *real*, no
un error). Un 200 aquí prueba que el corpus horneado en la imagen (`/app/corpus/rulesets`,
incluyendo `policy.wasm`) cargó y el motor corrió.

### 5c. La cadena de navegador de evaluación gobernada (el criterio de cierre de GT-435)

Este es el flujo que el full-stack local prueba y que prod debe reproducir:

```
tracker-web  →  tracker-api  →  core-api  POST /api/v1/evaluate  → 200 → persistido
```

1. Abre la UI web del Tracker: `https://<tracker-web-host>` e inicia sesión.
2. Dispara una evaluación gobernada desde la UI (la acción de evaluar
   iniciativa/arquitectura que el BFF del Tracker proxea al Core).
3. Confirma en el panel de red del navegador que `tracker-api` devolvió **200** para
   la llamada de evaluación y que la UI renderizó un veredicto real.
4. **Prueba que vino del Core real, no de un mock.** El Tracker debe correr con
   `CoreApi__MockFallback=false` (como en el compose full-stack). Un resultado servido
   por el motor en vivo — es decir, **provenance = core**, no el mock fallback del BFF —
   es la señal de que el salto al Core realmente se ejecutó. Si el Tracker expone un
   campo de provenance/source en la respuesta, debe leer `core`; si no lo hace, afirma
   `MockFallback=false` en la config desplegada de `tracker-api` para que un mock sea
   imposible.
5. **Prueba la persistencia.** Confirma que la evaluación se escribió en el Postgres del
   Tracker (el registro aparece en el historial de evaluación de la iniciativa en la UI
   al recargar, y/o consulta la base de datos `evolith_tracker` directamente). El Core es
   stateless por diseño — esta fila persistida del lado del Tracker es lo que cierra la
   afirmación de "producto en ejecución".

Cuando 5a + 5b + 5c pasan todos contra el VPS, GT-448 (stack promovido y alcanzable)
y GT-435 (código → producto en ejecución, validado) quedan demostrablemente cerrados.

### 5d. Rollback

Coolify mantiene despliegues anteriores por app. Si un smoke test falla después del go-live:
vuelve a desplegar el tag de imagen buena anterior desde la UI de Coolify (cada app →
Deployments → Redeploy), y ejecuta `gh variable set VPS_DEPLOY_ENABLED --body false` para
detener más promociones automáticas mientras investigas.

---

## Lo que solo el usuario puede hacer vs. lo que está automatizado

### Automatizado (ya cableado en `ci-cd.yml`, sin humano en el loop una vez habilitado)

- Build + test de cada workspace en PRs a `main`/`develop`.
- Build & push de las imágenes de `core-api`, `mcp-server`, `agent-runtime` a GHCR en
  cada push a `main` (job `docker-services`, `GITHUB_TOKEN` incorporado).
- Disparar el hook de deploy de Coolify para cada uno de los tres servicios en push a
  `main` — **pero solo mientras `VPS_DEPLOY_ENABLED == 'true'`** (job `deploy`).
- Reporte fail-hard: una vez configurados hooks/token, un hook que no responde falla el
  workflow en lugar de pasar en silencio.

### Del usuario — manual, y deliberadamente no automatizable aquí

- **Aprovisionar** el VPS de Hostinger y Coolify, crear las tres apps
  (ids 12 / 13 / asignar para agent-runtime) y el `redis` gestionado.
- **Configurar las variables de entorno de runtime** en cada app de Coolify (los secrets
  viven en Coolify, no en GitHub) — incluyendo generar el `EVOLITH_API_KEY` de producción.
- **Capturar las URLs de deploy-hook y el API token de Coolify** desde el panel de Coolify
  y **configurarlos como secrets de GitHub** (§3). Estos valores solo existen en Coolify y
  no pueden generarse desde este repo.
- **El go-live irreversible:** `gh variable set VPS_DEPLOY_ENABLED --body true`.
  Este es el único acto que convierte los pushes a `main` en despliegues en vivo de cara al
  cliente. Se deja intencionalmente a un humano porque es el punto sin retorno, y porque el
  VPS objetivo es un recurso que este runbook no puede alcanzar.
- **Ejecutar / firmar el visto bueno del smoke test de §5** contra producción.

Este runbook, `production-env.example`, y el cableado CI/CD existente son todo lo que *se
puede* preparar sin credenciales ni el VPS. Los pasos restantes requieren secrets que solo
el usuario posee y el acto deliberado de encender producción.
