# [ADR 0020](0020-identity-provider-abstraction-strategy.md): Estrategia de Abstracción de Proveedor de Identidad

## Estado
Aprobado

## Fecha
2026-05-09

## Contexto
Las necesidades de autenticación empresarial migran, cambian y se fragmentan con el tiempo. Vincular los internos del sistema directamente a los SDKs de proveedores (ej. Zitadel, Okta) causa un bloqueo total y deja a la plataforma incapaz de responder a necesidades de despliegue desconectados (air-gapped), requisitos SAML de hubs corporativos externos, o flujos internos estándar heredados de hashing.

## Decisión
Separar la verificación de credenciales de la capa de negocio vía la **inyección polimórfica de Estrategia** asegurada por una interfaz Hexagonal local (`IAuthenticationPort`):

1. **Bloqueo Cero (Zero Lock-in)**: El núcleo core confía en una única lógica de Puerto de validación. Solo le importa si las credenciales se resuelven en un vector de usuario verificado.
2. **Ejecución Dinámica**: El resolutor activa los Adaptadores concretos correctos en tiempo de ejecución (vía banderas de configuración de `Tenant`) alimentándose de:
 - Almacén Local (almacenamiento Bcrypt)
 - Proveedores de Identidad Empresarial (Cognito, Azure AD, Okta, Zitadel, Auth0)
 - Endpoints federados generales (OIDC/SAML)
3. **Seguridad Progresiva**: Conectar protocolos actuales que soporten Estándares Modernos (Passkeys, MFA, WebAuthn) nativamente en el pool de proveedores abstraído.

## Consecuencias

### Positivas
- Alta fluidez de despliegue. Desplegar el mismo código dentro de la nube Azure o dentro de hardware local privado desconectado.
- Los clientes conservan la soberanía: cada Inquilino (Tenant) empresarial puede configurar y apuntar hacia el AD/SAML de su propia compañía.

### Negativas
- Aumenta la complejidad de la factoría de inicialización requerida para instanciar correctamente los controladores de credenciales adecuados basados en el contexto del host en tiempo de ejecución.

## Referencias
- [ADR-0026: MFA y Passwordless](../../adrs/nodejs/0026-mfa-passwordless-adaptive-authentication.md)
- [ADR-0002: Arquitectura Hexagonal Limpia](../../adrs/nodejs/0002-clean-architecture-nestjs.md)

---
[Volver al Índice](./README.es.md)
