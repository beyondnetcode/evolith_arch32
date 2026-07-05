# Despliegue en VPS — Coolify en Hostinger

> **Navegación bilingüe:** [English Version](./README.md)

Esta guía cubre el despliegue de Evolith Core en un VPS autoalojado usando Coolify como plataforma de deployment. Fue validada contra la configuración de VPS de Hostinger descrita más abajo, pero aplica a cualquier VPS Ubuntu 24.04 con Docker instalado.

## Objetivo y Objetivos

> **Objetivo:** llevar `core-api` y `mcp-server` a un VPS de producción con SSL automático, deploys disparados desde GitHub y cero comandos Docker manuales tras la configuración inicial.

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
    ┌────┴────────────────┐
    ▼                     ▼
core-api (:3000)     mcp-server (:3001)
api.tudominio.com    mcp.tudominio.com
         │                 │
         └────────┬────────┘
                  ▼
         PostgreSQL 15 (:5432, interno)
         Redis 7 (:6379, interno)
```

**Uso estimado de recursos tras el deploy de Evolith Core:**

| Servicio | RAM Estimada |
| :--- | :--- |
| `core-api` (NestJS) | ~256 MB |
| `mcp-server` | ~128 MB |
| Total agregado | ~384 MB de 7.800 MB |

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

## Fase 2 — Agregar Dockerfiles

Los Dockerfiles de referencia se encuentran en [`product/infra/docker/`](../docker/). Antes de deployar vía Coolify, copiarlos a los directorios de cada app:

```bash
# core-api
cp product/infra/docker/bff.Dockerfile apps/core-api/Dockerfile

# mcp-server
cp product/infra/docker/mcp.Dockerfile packages/mcp-server/Dockerfile
```

Ambos usan builds multi-stage en Alpine y corren como usuario no-root `evolith` (UID 1001).

> Si las apps ya tienen su propio `Dockerfile`, revisar antes de sobreescribir — los archivos de referencia son plantillas.

---

## Fase 3 — Crear Aplicaciones en Coolify

### core-api

1. Coolify → **Projects → New Application → Docker**.
2. Fuente: GitHub → seleccionar repo `evolith` → rama `main`.
3. Build context: `apps/core-api`, Dockerfile: `apps/core-api/Dockerfile`.
4. Puerto: `3000`.
5. Dominio: `api.tudominio.com` (Coolify configura Traefik + Let's Encrypt automáticamente).
6. Variables de entorno:

| Variable | Ejemplo | Notas |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Requerido |
| `DATABASE_URL` | `postgresql://user:pass@coolify-db:5432/evolith` | Usar hostname interno de Docker |
| `REDIS_URL` | `redis://coolify-redis:6379` | Usar hostname interno de Docker |
| `PORT` | `3000` | Debe coincidir con EXPOSE del Dockerfile |

7. Hacer clic en **Deploy**.

### mcp-server

Repetir los pasos anteriores con:
- Build context: `packages/mcp-server`
- Puerto: `3001`
- Dominio: `mcp.tudominio.com`

---

## Fase 4 — CI/CD (Push-to-Deploy)

### Opción A — Webhook de Coolify (Recomendado por simplicidad)

Coolify genera una URL de webhook de deploy por aplicación. Agregarla a GitHub:

1. Coolify → Aplicación → **Webhooks → Copiar URL**.
2. GitHub → Repositorio → **Settings → Webhooks → Add webhook**.
3. Payload URL: pegar la URL de Coolify.
4. Content type: `application/json`.
5. Evento: **Push**.

Cada push a `main` dispara un redeploy automático.

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

# Health check core-api
curl https://api.tudominio.com/health

# Health check mcp-server
curl https://mcp.tudominio.com/health
```

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
| `DATABASE_URL` con conexión rechazada | Hostname interno incorrecto | Usar `coolify-db` en lugar de `localhost` |
| Panel Coolify inaccesible | Contenedor `coolify` en estado `Created` | Correr `docker start coolify` en el VPS |

---

## Referencias Relacionadas

- [Raíz de Infraestructura](../README.es.md)
- [Dockerfiles de Referencia](../docker/README.es.md)
- [ADR-0028 — Infraestructura Híbrida Autoalojada](../../architecture/adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.es.md)
- [ADR-0030 — Gateway Distribuido de Dos Niveles](../../architecture/adrs/core/0030-two-tier-distributed-gateway-model.es.md)
- [Escenarios de Despliegue Multi-Cloud](../../architecture/blueprints/multi-cloud-deployment-scenarios.es.md)

---

[Volver a la Raíz de Infraestructura](../README.es.md)
