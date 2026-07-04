# Infraestructura y Orquestación

> **Navegación bilingüe:** [English version](./README.md)

Este directorio contiene la configuración de Docker Compose y la configuración declarativa del gateway para el desarrollo local. La complejidad de la infraestructura escala con la fase arquitectónica — no inicies todos los servicios en la Fase 1.

## Meta y Objetivos

> **Meta:** permitir que cualquier ingeniero ejecute la plataforma de referencia en local con exactamente la infraestructura que su fase arquitectónica requiere — ni más, ni menos.

**Objetivos:**

- Mapear cada servicio local (base de datos, caché, bróker, gateway, secretos) a la fase que lo justifica.
- Proveer comandos de arranque listos para copiar para la Fase 1 mínima y el stack completo de Fase 2+.
- Mantener cada decisión de servicio trazable a su ADR correspondiente.

---

## Mapa de Servicios por Fase

| Servicio | Fase Requerida | Rol |
| :--- | :--- | :--- |
| **PostgreSQL** | Fase 1 (obligatorio) | Base de datos relacional primaria |
| **Redis** | Fase 1 (opcional, agregar cuando la latencia lo exija) | Caché distribuida — [ADR-0014](../architecture/adrs/core/0014-multi-layer-distributed-caching-strategy.md) |
| **RabbitMQ** | Fase 2+ | Bróker de mensajes async — [ADR-0015](../architecture/adrs/core/0015-event-driven-architecture-intra-domain.md) |
| **Traefik Proxy** | Fase 2+ | Gateway de API perimetral — [ADR-0030](../architecture/adrs/core/0030-two-tier-distributed-gateway-model.md) |
| **OpenBao** | Fase 2+ | Gestión de secretos (fork de Vault) — [ADR-0028](../architecture/adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.md) |

> **Regla Fase 1:** Comenzar solo con PostgreSQL. Agregar Redis cuando se supere un umbral P95 de latencia específico. Agregar Kong y RabbitMQ solo cuando se necesite un segundo canal de cliente o entrega async entre servicios.

---

## Fase 1 — Inicio Mínimo

```bash
# Iniciar solo el mínimo de Fase 1
docker-compose -f product/infra/docker-compose.yml up -d postgres

# Opcional: agregar Redis si se necesita caché
docker-compose -f product/infra/docker-compose.yml up -d postgres redis
```

## Fase 2+ — Stack Completo

```bash
# Iniciar todos los servicios
docker-compose -f product/infra/docker-compose.yml up -d
```

## Verificar Servicios Activos

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

---

## Puertos de Servicios

| Servicio | Puerto |
| :--- | :--- |
| PostgreSQL | `5432` |
| Redis | `6379` |
| RabbitMQ (AMQP) | `5672` |
| RabbitMQ (UI de Gestión) | `15672` |
| Traefik (Proxy) | `8000` |
| Traefik (Dashboard) | `8080` |
| OpenBao | `8200` |

---

## Versiones Fijadas

| Servicio | Tag de Imagen | Cadencia de Actualización |
| :--- | :--- | :--- |
| PostgreSQL | `postgres:16` | Seguimiento LTS |
| Redis | `redis:7.2` | Seguimiento de versión menor |
| MongoDB | `mongo:7.0` | Seguimiento de versión menor |
| Traefik | `traefik:v3.1` | Seguimiento de versión menor |

> **Política:** Todas las imágenes usan tags fijos (sin `latest`). Las actualizaciones se revisan trimestralmente o cuando se publican parches de seguridad.

---

## Límites de Recursos

Cada servicio en `docker-compose.yml` declara `deploy.resources.limits` para evitar que un contenedor descontrolado asfixie a sus vecinos en el mismo host y para que la planificación de capacidad mapee limpiamente al dimensionamiento en producción.

| Servicio | Memoria | CPU | Razonamiento |
| :--- | :--- | :--- | :--- |
| PostgreSQL | 512M | 0.5 | Carga de trabajo de desarrollo habitual con pool de conexiones moderado |
| SQL Server | 2G | 2 | La huella base de MSSQL es alta; margen para procesamiento de consultas |
| MongoDB | 1G | 1 | Almacén de documentos con working set en memoria |
| Redis | 256M | 0.25 | Caché en memoria; acotado por política `maxmemory` |
| RabbitMQ | 512M | 0.5 | Bróker con UI de gestión; margen para profundidad de cola |
| MinIO | 512M | 0.5 | Almacenamiento de objetos compatible S3; limitado por I/O |
| OpenBao | 256M | 0.25 | Motor de secretos; CPU baja, memoria mínima |
| Traefik | 128M | 0.25 | Reverse proxy; reenvío ligero por request |
| OTel Collector | 256M | 0.5 | Pipeline de telemetría; picos en ingesta de logs |
| Tempo | 512M | 0.5 | Almacenamiento de trazado distribuido |
| Loki | 256M | 0.5 | Índice de agregación de logs |
| Grafana | 256M | 0.5 | UI de dashboards; computación mínima |
| BFF | 512M | 0.5 | Servidor API NestJS; heap de Node.js |
| Prometheus | 512M | 0.5 | TSDB con retención de 30d |
| Mimir | 512M | 0.5 | Almacenamiento de métricas a largo plazo |
| MCP | 512M | 0.5 | Servidor MCP; heap de Node.js |

> **Guía de ajuste:** Estos límites son adecuados para un host de desarrollo local con 16 GB de RAM. En producción, escalar los límites proporcionalmente a la carga de trabajo esperada. SQL Server (2 GB) es el servicio más exigente en memoria; excluirlo de la Fase 1 mantiene el stack mínimo bajo 1 GB total.

---

## Archivos de Configuración

| Archivo | Propósito |
| :--- | :--- |
| `docker-compose.yml` | Archivo principal de orquestación |
| `traefik-dynamic.yml` | Configuración declarativa de Traefik Proxy (sin base de datos) |

---

## Guías de Despliegue

| Guía | Descripción |
| :--- | :--- |
| [VPS — Coolify en Hostinger](./vps-coolify/README.es.md) | Despliegue a producción en VPS autoalojado usando Coolify, validado en instancia Hostinger de 7.8 GB / 2 vCPU |

---

[Volver a la Raíz del Repositorio](../README.es.md)
