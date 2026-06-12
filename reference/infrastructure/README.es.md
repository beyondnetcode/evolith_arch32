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
| **Kong Gateway** | Fase 2+ | Gateway de API perimetral — [ADR-0030](../architecture/adrs/core/0030-two-tier-distributed-gateway-model.md) |
| **HashiCorp Vault** | Fase 2+ | Gestión de secretos — [ADR-0028](../architecture/adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.md) |

> **Regla Fase 1:** Comenzar solo con PostgreSQL. Agregar Redis cuando se supere un umbral P95 de latencia específico. Agregar Kong y RabbitMQ solo cuando se necesite un segundo canal de cliente o entrega async entre servicios.

---

## Fase 1 — Inicio Mínimo

```bash
# Iniciar solo el mínimo de Fase 1
docker-compose -f reference/infrastructure/docker-compose.yml up -d postgres

# Opcional: agregar Redis si se necesita caché
docker-compose -f reference/infrastructure/docker-compose.yml up -d postgres redis
```

## Fase 2+ — Stack Completo

```bash
# Iniciar todos los servicios
docker-compose -f reference/infrastructure/docker-compose.yml up -d
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
| Kong (Proxy) | `8000` |
| Kong (API Admin) | `8001` |
| HashiCorp Vault | `8200` |

---

## Archivos de Configuración

| Archivo | Propósito |
| :--- | :--- |
| `docker-compose.yml` | Archivo principal de orquestación |
| `kong.yml` | Configuración declarativa de Kong Gateway (sin base de datos) |

---

[Volver a la Raíz del Repositorio](../README.es.md)
