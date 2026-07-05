# Guía de Seguridad Orientada a Eventos

> **Navegación Bilingüe:** [English](./security.md) | [Español](./security.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Orientada a Eventos

## Propósito

Establecer controles de seguridad para arquitecturas orientadas a eventos que cubren autenticación de eventos, validación de esquemas en los límites de publicación/suscripción, control de acceso a temas, cifrado de carga útil y requisitos de auditoría de rastro.

## Autenticación de Eventos

- Requerir TLS mutuo (mTLS) entre productores y el broker, y entre el broker y los consumidores.
- Usar tokens de corta vida (JWT/OAuth2) para autenticación servicio-a-evento donde mTLS no esté disponible.
- Rotar credenciales automáticamente; enforce duración máxima de token de 1 hora.

## Validación de Esquemas — ED-R01, ED-R06

- Validar cargas útiles de eventos contra el esquema AsyncAPI registrado al momento de publicar.
- Rechazar eventos no conformes en el broker antes de que ingresen al tema.
- Mantener un registro de esquemas con historial de versiones; descontinuar esquemas mediante un ciclo de vida formal.

## Control de Acceso a Temas

- Implementar ACLs a nivel de tema: los productores solo pueden escribir en temas autorizados; los consumidores solo pueden suscribirse a temas autorizados.
- Usar prefijos de namespace (por ejemplo, `dominio.entorno.nombre-evento`) para enforce aislamiento.
- Auditar cambios de acceso a temas; requerir revisión de pares para escaladas de privilegios.

## Cifrado de Carga Útil

- Cifrar campos sensibles en la capa de aplicación antes de publicar (cifrado a nivel de campo).
- Usar cifrado nativo del broker en repositorio para almacenamiento de temas.
- Nunca incrustar secretos o credenciales en texto plano en cargas útiles de eventos.

## Auditoría de Rastro — ED-R08

- Registrar todos los eventos de registro y desregistro de esquemas.
- Rastrear cambios de ACL de temas con identidad del actor y marca de tiempo.
- Retener registros de auditoría por un mínimo de 90 días en almacenamiento inmutable.

## Aplicabilidad Componible

| Componible | Orientación |
|---|---|
| Monolito Modular | Los eventos intra-proceso pueden omitir mTLS; la validación de esquemas sigue siendo requerida. |
| Módulos Distribuidos | Enforce completo de mTLS y ACLs entre límites de módulos. |
| Microservicios | Delimitación de credenciales por servicio; aislamiento de ACLs de temas. |
| Serverless | Políticas de seguridad de broker gestionadas; vinculación IAM a nivel de función. |
| Computación Edge | Cifrado de broker local; sincronizar registros de auditoría al almacén central. |

## Referencias ADR

- **ADR-0015**: Modelo de autenticación y autorización del broker de eventos.
- **ADR-0079**: Estándares de gobernanza y validación de esquemas.

---

[Volver al Perfil Orientado a Eventos](./README.es.md)
