# ADR-0120: Estándar de prevención de SSRF

> **Navegación Bilingüe:** [English Version](./0120-ssrf-prevention-standard.md)

| Campo | Valor |
|---|---|
| **Estado** | Aceptado |
| **Fecha** | 2026-07-23 |
| **Decisores** | Comité de Arquitectura |
| **Historia técnica** | OWASP API7 / A10 — Server-Side Request Forgery |

## Contexto

La obtención de secretos de Dapr en core-api usaba `localhost:${DAPR_HTTP_PORT}` sin validar ni el puerto ni el nombre de host. Un atacante que controlase esa variable de entorno podía redirigir la petición. El adaptador de webhooks sí tenía una protección contra SSRF (GT-351), pero no existía ningún estándar corporativo.

## Decisión

Establecer reglas de prevención de SSRF para toda petición HTTP saliente:

### 1. Validación de URL
- Toda petición HTTP saliente DEBE validar la URL de destino contra una lista de permitidos de hosts o IPs de confianza.
- Se rechazan las peticiones a rangos de IP privados (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16) salvo que se configuren de forma explícita.

### 2. Protección frente a DNS rebinding
- Resolver el DNS una sola vez y fijar la IP antes de conectar. No se vuelve a resolver después de la conexión.
- Para los servicios locales, escribir `127.0.0.1` en el código en lugar de `localhost`, porque así el DNS rebinding no tiene dónde actuar.

### 3. Validación de variables de entorno
- Las variables de entorno que controlan URLs o puertos DEBEN validarse:
  - Las variables de puerto han de ser numéricas, finitas y estar entre 1 y 65535.
  - Las variables de URL han de coincidir con los patrones esperados (por ejemplo, `^https?://`).
- Los valores inválidos DEBEN registrarse como advertencia y recaer en valores por defecto seguros.

### 4. Límites de tiempo y de tamaño
- Toda petición saliente DEBE llevar un tiempo límite (30 s por defecto).
- El tamaño del cuerpo de la respuesta DEBE estar acotado, para que no agote la memoria.

## Consecuencias

- Los servicios nuevos han de validar la URL antes de hacer cualquier petición saliente.
- Los endpoints existentes que piden secretos a Dapr han de validar `DAPR_HTTP_PORT`.
- La limitación de tasa de `@nestjs/throttler` aporta una protección parcial frente a denegación de servicio.

## ADRs relacionados

- ADR-0081 (aislamiento del sandbox — red denegada por defecto)
- GT-351 (protección contra SSRF en WebhookAdapter)

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
