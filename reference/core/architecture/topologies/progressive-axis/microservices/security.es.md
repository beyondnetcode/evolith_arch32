# Guía de Seguridad de Microservicios

> **Navegación Bilingüe:** [English](./security.md) | [Español](./security.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Microservicios

## Arquitectura Zero-Trust

Asuma que ningún límite de red es seguro. Cada llamada de servicio a servicio debe autenticarse y autorizarse. Zero-trust no es opcional en una topología distribuida — es un requisito de línea base.

## mTLS en la Malla de Servicios

Aplique **MS-R02** (Malla de Servicios/mTLS) en la capa de la malla. Todo el tráfico interno entre servicios debe estar cifrado con TLS mutuo. Los certificados se rotan automáticamente por la malla (Istio Citadel, Linkerd identity). Ningún servicio debe aceptar tráfico interno en texto plano.

## Autenticación en la Puerta de Enlace de API

Todo el tráfico externo entra a través de una puerta de enlace de API. La puerta maneja la validación de tokens OAuth 2.0 / OIDC, límites de velocidad y transformación de solicitudes. Los servicios solo aceptan tokens validados por la puerta — nunca parsean encabezados de autorización en bruto directamente.

## IAM por Servicio

Cada servicio posee su propia lógica de autorización. Utilice cuentas de servicio con roles IAM de menor privilegio. Los servicios no deben compartir credenciales ni suplantarse entre sí. La aplicación de políticas ocurre tanto en la puerta de enlace como a nivel de servicio.

## Rotación de Secretos

- Almacene secretos en un vault dedicado (Azure Key Vault, HashiCorp Vault).
- Automatice calendarios de rotación — sin actualizaciones manuales de secretos.
- Las aplicaciones deben manejar la rotación sin problemas (actualizar sin reiniciar).
- Audite todo acceso a secretos con registros inmutables.

## Políticas de Red

Defina NetworkPolicies de Kubernetes para restringir el tráfico pod a pod. Solo los pares de servicios explícitamente permitidos pueden comunicarse. Combine con políticas de autorización a nivel de malla para defensa en profundidad.

## Cumplimiento y Auditoría

Registre todas las decisiones de autenticación y autorización. Exporte registros de auditoría a un almacén a prueba de manipulaciones. Valide periódicamente que ningún servicio evada la malla o la puerta de enlace para comunicación externa.

## Referencias

| Regla | Descripción |
|-------|-------------|
| **MS-R02** | Malla de Servicios / mTLS |
| **ADR-0045** | Adopción de malla de servicios (línea base zero-trust) |

---
[Volver al Perfil de Microservicios](./README.es.md)
