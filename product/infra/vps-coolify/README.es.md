# Despliegue en VPS — Coolify en Hostinger

> **Navegación bilingüe:** [English Version](./README.md)

Esta guía cubre el despliegue de Evolith Core en un VPS autoalojado usando Coolify como plataforma de deployment. Fue validada contra la configuración de VPS de Hostinger descrita más abajo, pero aplica a cualquier VPS Ubuntu 24.04 con Docker instalado.

## Objetivo y Objetivos

> **Objetivo:** llevar `core-api`, `mcp-server` y `agent-runtime` a un VPS de producción con SSL automático, deploys disparados desde GitHub y cero comandos Docker manuales tras la configuración inicial.

**Objetivos:**

- Documentar las specs validadas del VPS y la infraestructura existente.
- Proveer un paso a paso para configurar Coolify conectado a GitHub.
- Definir el layout de servicios `docker-compose` para Evolith Core.
- Establecer un flujo CI/CD (push-to-deploy) vía webhooks de Coolify o runner self-hosted de GitHub Actions.

---

## Specs VPS Validadas (Hostinger)

| Recurso | Valor | Evaluación |
| :--- | :--- | :--- |
| SO | Ubuntu 24.04.3 LTS | Soportado |
| CPU | 2 vCPU (AMD EPYC 9354P) | Suficiente para Fase 1 |
| RAM | 7.8 GB | Excelente — 6+ GB libres |
| Disco | 96 GB SSD | Excelente — 88 GB libres |
| Docker | v5.0.0 (Compose) | Pre-instalado |
| Coolify | v4.0.0-beta | Pre-instalado |
| Reverse Proxy | Traefik v3.6 | Pre-instalado, activo en :80/:443 |
| Base de datos | PostgreSQL 15 (Docker) | Pre-instalado |
| Caché | Redis 7 (Docker) | Pre-instalado |

> **Clave:** Coolify, Traefik, PostgreSQL y Redis ya están corriendo. El despliegue de Evolith Core no requiere nueva infraestructura — solo contenedores de aplicación.

---

## Vista General de Arquitectura

```
GitHub (repo + Actions CI)
         │
         │  webhook de deploy / runner
         ▼
Panel Coolify (:8080)          ← gestionar todos los servicios aquí
         │
         ▼
Traefik v3.6 (:80 / :443)     ← terminación SSL, ruteo
    ┌────────┬────────┴────────┐
    ▼        ▼                 ▼
core-api  mcp-server     agent-runtime
 (:3000)    (:3000)          (:3000)
evolith.   mcpevolith.   evolithruntime.
 beyondnet.cloud (los tres)
```

Los tres servicios escuchan en **3000** dentro de su contenedor; Traefik los
distingue por hostname, no por puerto. El Core es stateless — ni PostgreSQL ni
Redis están en su camino de petición (ADR-0101). El PostgreSQL del VPS pertenece
al Tracker, que se despliega desde su propio repositorio.

**Uso estimado de recursos tras el deploy de Evolith Core:**

| Servicio | RAM Estimada |
| :--- | :--- |
| `core-api` (NestJS) | ~256 MB |
| `mcp-server` | ~128 MB |
| `agent-runtime` | ~128 MB |
| Total agregado | ~512 MB de 7.800 MB |

---

## Prerrequisitos

- VPS con Ubuntu 24.04, Docker y Coolify ya instalados.
- Un dominio apuntado a la IP del VPS (registro A para `api.tudominio.com` y `mcp.tudominio.com`).
- Acceso SSH al VPS.
- Cuenta GitHub con acceso al repositorio de Evolith.

---

## Fase 1 — Conectar GitHub a Coolify

1. Abrir el panel Coolify en `http://<IP_VPS>:8080`.
2. Ir a **Settings → Sources → GitHub**.
3. Hacer clic en **Add GitHub App** y completar el flujo OAuth.
4. Conceder a Coolify acceso al repositorio `evolith`.

> Tras este paso, Coolify puede observar ramas y disparar deploys en cada push.

---

## Fase 2 — Usar los Dockerfiles reales (NO copiar las plantillas)

No hay nada que agregar. Cada servicio desplegable ya tiene su Dockerfile de
producción, y es el mismo archivo que CI construye y publica en GHCR:

| Servicio | Dockerfile |
| :--- | :--- |
| core-api | `src/apps/core-api/Dockerfile` |
| mcp-server | `src/packages/mcp-server/Dockerfile` |
| agent-runtime | `src/apps/agent-runtime-api/Dockerfile` |

> [!WARNING]
> Revisiones anteriores de esta guía indicaban `cp product/infra/docker/bff.Dockerfile apps/core-api/Dockerfile`.
> **No hacerlo.** Esos dos archivos son plantillas ilustrativas de BFF/MCP que no
> están en ningún camino de despliegue (ver [deployment-topology](../deployment-topology.es.md)),
> sus rutas destino son anteriores al layout anidado en `src/`, y copiarlas sobre
> los Dockerfiles reales reemplaza un build de monorepo que funciona por uno que
> no puede resolver los paquetes del workspace.

Los tres son builds multi-stage en Alpine y corren como usuario no-root
`evolith` (UID 1001).

---

## Fase 3 — Crear Aplicaciones en Coolify

> [!IMPORTANT]
> **El base directory / build context es la RAÍZ del repositorio (`/`) para
> todos los servicios** — no la carpeta de la app. Los Dockerfiles hacen `COPY`
> de rutas relativas a la raíz (`package-lock.json`, `tsconfig.base.json`,
> `src/`, `.harness/`) porque cada imagen construye los paquetes del workspace
> desde el código fuente. Apuntar Coolify a `src/apps/core-api` como contexto
> hace fallar el build en el primer `COPY`. Cada Dockerfile lo declara en su
> propia cabecera.

### core-api

1. Coolify → **Projects → New Application → Docker**.
2. Fuente: GitHub → seleccionar repo `evolith` → rama `main`.
3. **Base directory: `/`** · Dockerfile: `src/apps/core-api/Dockerfile`.
4. Puerto: `3000`.
5. Dominio: `evolith.beyondnet.cloud` (Coolify configura Traefik + Let's Encrypt automáticamente).
6. Variables de entorno:

| Variable | Ejemplo | Notas |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Requerido |
| `PORT` | `3000` | Debe coincidir con el `EXPOSE` del Dockerfile |
| `EVOLITH_API_KEY` | *(encriptada)* | Clave Bearer. **Fail-closed: sin setear ⇒ toda petición se rechaza.** |

> [!NOTE]
> **Sin `DATABASE_URL`, sin `REDIS_URL`.** ADR-0101 hace del Core un motor de
> evaluación stateless — `core-api` y `agent-runtime-api` declaran cero
> dependencias de base de datos (sin driver, sin ORM, sin cadena de conexión).
> Poner un `DATABASE_URL` aquí no conecta con nada y contradice ADR-0101; la
> persistencia pertenece al Tracker y su propio Postgres. Ver
> [Secretos y Conectividad de Datos](../README.es.md).

7. Hacer clic en **Deploy**.

### mcp-server

Mismos pasos, con:
- **Base directory: `/`** · Dockerfile: `src/packages/mcp-server/Dockerfile`
- Puerto: **`3000`** (el `EXPOSE`/`PORT` de la imagen es 3000, no 3001)
- Dominio: `mcpevolith.beyondnet.cloud`
- Entorno: `EVOLITH_API_KEY`, y dejar `EVOLITH_MCP_ALLOW_NO_AUTH=false`
  (el default de la imagen). `OPA_BUNDLE_CREDENTIALS` / `OPA_BUNDLE_SIGNING_KEY`
  solo si sirves bundles de políticas desde un registro remoto.

### agent-runtime

Mismos pasos, con:
- **Base directory: `/`** · Dockerfile: `src/apps/agent-runtime-api/Dockerfile`
- Puerto: `3000`
- Dominio: `evolithruntime.beyondnet.cloud`
- Entorno:

| Variable | Ejemplo | Notas |
| :--- | :--- | :--- |
| `AGENT_RUNTIME_API_KEY` | *(encriptada)* | Fail-closed; `AGENT_RUNTIME_ALLOW_NO_AUTH` debe quedar sin setear |
| `AGENT_RUNTIME_CORE_ENDPOINT` | `https://evolith.beyondnet.cloud` | Apunta el runtime al Core REAL (si no, usa el adapter stub) |
| `AGENT_RUNTIME_CORE_TOKEN` | *(encriptada)* | Debe coincidir con el `EVOLITH_API_KEY` de core-api |
| `AGENT_RUNTIME_PROFILE` | `production` | Hace obligatorios los ajustes de approval-tracker de abajo |
| `AGENT_RUNTIME_APPROVAL_TRACKER_URL` | `https://<host-tracker>` | Aprobaciones HITL (GT-441). Sin setear ⇒ toda acción `requiresApproval` se deniega fail-closed |
| `AGENT_RUNTIME_APPROVAL_TRACKER_KEY` | *(encriptada)* | La clave CoreMachine del Tracker; el Tracker deriva el tenant de CUÁL clave hizo match |

---

## Fase 4 — CI/CD (Push-to-Deploy)

### Opción A — el job `deploy` de `ci-cd.yml` (esto es lo que el repo hace realmente)

El pipeline ya contiene el paso de despliegue. Es un job en
[`.github/workflows/ci-cd.yml`](../../../.github/workflows/ci-cd.yml) que hace
`curl` a un deploy hook de Coolify por servicio. Lee su configuración de
**secrets del repositorio y una variable del repositorio — no de un webhook de
GitHub**. Agregar una URL de Coolify en *Settings → Webhooks* no hace nada para
este job.

**Checklist del dueño — exactamente qué hay que setear, y con qué forma.** Todo
lo de abajo requiere el panel de Coolify o permisos de admin del repositorio;
nada dentro de este repositorio puede proveerlo.

| # | Dónde | Nombre | Forma requerida | Notas |
| :-- | :--- | :--- | :--- | :--- |
| 1 | Panel de Coolify | *(por aplicación)* | — | Crear primero las tres aplicaciones según la Fase 3. Un hook no puede existir antes que su aplicación. |
| 2 | **Secret** del repo | `COOLIFY_API_TOKEN` | String de token API de Coolify | Coolify → **Keys & Tokens → API tokens**. Se envía como `Authorization: Bearer`. |
| 3 | **Secret** del repo | `COOLIFY_COREAPI_DEPLOY_HOOK` | **Una URL completa**: `https://<host-coolify>/api/v1/deploy?uuid=<uuid-aplicación>` | Coolify → Aplicación → **Webhooks → Deploy Webhook → Copiar**. |
| 4 | **Secret** del repo | `COOLIFY_MCP_DEPLOY_HOOK` | misma forma, uuid de mcp-server | |
| 5 | **Secret** del repo | `COOLIFY_AGENTRUNTIME_DEPLOY_HOOK` | misma forma, uuid de agent-runtime | Agregado con GT-437. |
| 6 | **Variable** del repo | `VPS_DEPLOY_ENABLED` | el string literal `true` | `gh variable set VPS_DEPLOY_ENABLED --body true`. Es una **variable**, no un secret — ver abajo. |

> [!CAUTION]
> **Los ítems 3–5 deben ser URLs completas.** Un UUID pelado, un fragmento de
> ruta (`/api/v1/deploy?uuid=…`) o un host sin esquema hacen que `curl` falle con
> `Could not resolve host` — exactamente el fallo registrado en `GT-324`. El
> valor debe empezar con `https://` y contener el host.

**El job de deploy está deliberadamente APAGADO ahora mismo.** Su condición es
`github.ref == 'refs/heads/main' && vars.VPS_DEPLOY_ENABLED == 'true'`. Se
deshabilitó bajo `GT-567` porque el entorno objetivo pasó a Docker + kind local,
y sin el flag el job fallaba en **cada** push a `main` contra un host inalcanzable
mientras nadie leía el rojo (no es un check requerido). Se apaga con una
**variable** y no borrando los secrets a propósito: borrarlos deja el apagado
invisible, y sus valores solo se pueden reponer desde el panel de Coolify — o
sea, con el VPS ya levantado.

**Comportamiento una vez habilitado.** Cada paso es fail-soft ante UNA sola
condición: si su hook o el token están sin setear, avisa y sale 0. Con ambos
puestos corre `curl --fail`, así que un hook que no responde **hace fallar el
job** — deliberadamente. Un paso de despliegue que no puede fallar no informa de
nada.

**Orden de operaciones.** El job hace `needs: [docker-services]`, que a su vez
depende de siete jobs de test y solo corre en `main` o en un tag `v*`. O sea:
merge a `main` → tests → imágenes publicadas en
`ghcr.io/<owner>/evolith-{core-api,mcp,agent-runtime}` → hooks disparados. Nada
se despliega desde `develop`.

**La verificación que cuenta.** Un job `deploy` en verde significa que `curl`
recibió un 2xx de Coolify — **no** significa que la nueva imagen esté sirviendo.
Confirmar con los health checks de *Verificar el Despliegue* más abajo, contra
el commit desplegado.

### Opción B — Runner Self-Hosted de GitHub Actions (Recomendado para mayor control)

Instalar un runner en el VPS para correr los jobs de CI localmente — builds más rápidos, sin consumir minutos de GitHub.

```bash
# En el VPS
mkdir -p /opt/github-runner && cd /opt/github-runner
curl -o actions-runner.tar.gz -L https://github.com/actions/runner/releases/latest/download/actions-runner-linux-x64-<VERSION>.tar.gz
tar xzf actions-runner.tar.gz
./config.sh --url https://github.com/<ORG>/evolith --token <TOKEN_RUNNER>
./svc.sh install && ./svc.sh start
```

Obtener el token en: **GitHub → Repositorio → Settings → Actions → Runners → New self-hosted runner**.

Luego actualizar `.github/workflows/ci-cd.yml` para apuntar al runner:

```yaml
jobs:
  deploy:
    runs-on: self-hosted   # ← cambiar desde ubuntu-latest
```

Con un runner self-hosted, el pipeline CI (lint → test → build → deploy) corre completamente en el VPS en menos de 2 minutos.

---

## Verificar el Despliegue

```bash
# Verificar que los contenedores estén corriendo
ssh root@<IP_VPS> "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

# Liveness de los tres servicios
curl https://evolith.beyondnet.cloud/health
curl https://mcpevolith.beyondnet.cloud/health
curl https://evolithruntime.beyondnet.cloud/health

# La auth es fail-closed: SIN clave esto debe devolver 401, no 200.
curl -i -X POST https://evolith.beyondnet.cloud/api/v1/evaluate

# La evidencia de que el deploy es real: un veredicto gobernado desde el commit
# desplegado, no un 200 de un endpoint de health.
curl -X POST https://evolith.beyondnet.cloud/api/v1/evaluate \
  -H "Authorization: Bearer $EVOLITH_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"phase":"design","topology":"modular-monolith"}'
```

> [!NOTE]
> Un job `deploy` en verde no es un despliegue. Prueba que Coolify aceptó el
> webhook. Solo las llamadas de arriba, respondidas por el nuevo commit, prueban
> que el servicio está sirviendo — esa distinción es la razón por la que
> `GT-448` exige "una ejecución registrada, no un job de despliegue que sale con
> cero".

---

## Notas de Seguridad

- PostgreSQL y Redis están ligados a redes Docker internas — nunca expuestos en puertos públicos.
- Traefik maneja la terminación TLS vía Let's Encrypt; el tráfico HTTP se redirige automáticamente a HTTPS.
- Los contenedores de aplicación corren como usuario no-root `evolith` (UID 1001).
- La autenticación SSH por contraseña debe deshabilitarse una vez confirmado el acceso por llave:
  ```bash
  sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
  systemctl reload sshd
  ```

---

## Solución de Problemas

| Síntoma | Causa probable | Solución |
| :--- | :--- | :--- |
| Certificado SSL no emitido | DNS aún no propagado | Esperar 5–15 min tras agregar el registro A |
| Contenedor se cierra inmediatamente | Variable de entorno faltante | Revisar Coolify → Aplicación → Logs |
| El build falla en el primer `COPY` | Base directory apuntando a la carpeta de la app | Poner el base directory de Coolify en `/` — las imágenes se construyen desde la raíz del repo (Fase 3) |
| Job `deploy`: `Could not resolve host` | El secret del deploy-hook tiene un UUID o una ruta, no una URL | Re-setearlo a la URL completa `https://<host-coolify>/api/v1/deploy?uuid=<uuid>` (Fase 4) |
| El job `deploy` nunca corre en `main` | `VPS_DEPLOY_ENABLED` sin setear | `gh variable set VPS_DEPLOY_ENABLED --body true` (Fase 4) |
| Toda petición devuelve 401 | `EVOLITH_API_KEY` sin setear | Eso es la auth fail-closed funcionando según diseño; setear la clave |
| Panel Coolify inaccesible | Contenedor `coolify` en estado `Created` | Correr `docker start coolify` en el VPS |

---

## Referencias Relacionadas

- [Raíz de Infraestructura](../README.es.md)
- [Dockerfiles de Referencia](../docker/README.es.md)
- [ADR-0028 — Infraestructura Híbrida Autoalojada](../../../reference/core/architecture/adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.es.md)
- [ADR-0030 — Gateway Distribuido de Dos Niveles](../../../reference/core/architecture/adrs/core/0030-two-tier-distributed-gateway-model.es.md)
- [Escenarios de Despliegue Multi-Cloud](../../../reference/core/architecture/blueprints/multi-cloud-deployment-scenarios.es.md)

---

[Volver a la Raíz de Infraestructura](../README.es.md)
