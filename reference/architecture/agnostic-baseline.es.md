# Baseline Agnóstica de Arquitectura

> **Navegación Bilingüe:** [English Version](./agnostic-baseline.md)

**Estado:** Autoritativo
**Responsable:** Evolith Architecture Board
**Aplicabilidad:** Obligatorio para cada producto, runtime e implementación satélite.

## 1. Propósito

Este documento es la **baseline arquitectónica de máximo nivel** de Evolith. Declara los principios, patrones y restricciones agnósticos al runtime que todo componente DEBE cumplir antes de cualquier decisión específica de runtime o producto. Los perfiles de runtime, los ADRs y las implementaciones de producto extienden esta baseline; ninguno puede debilitarla.

La baseline es la forma narrativa de la prueba de fuego para decisiones Core: **si la herramienta, proveedor o framework nombrado desapareciera, las reglas siguientes seguirían vigentes.**

## 2. Documentos Autoritativos

Este archivo es el punto de entrada. La profundidad normativa vive en:

| Capa | Documento | Rol |
|---|---|---|
| Principios | [Principios de Arquitectura](./principles/README.es.md) | Neutralidad de proveedor, ACL, integridad de evidencia, rendición de cuentas humana, aislamiento de tenant. |
| Reglas estructurales | [Universal Architecture Standards](./blueprints/authoritative-tech-stack-agnostic.md) | Especificación completa de la baseline agnóstica al runtime (núcleo hexagonal, contratos, persistencia, seguridad, observabilidad, despliegue). |
| Blueprint de referencia | [Reference Blueprint (arc42)](./blueprints/reference-blueprint.es.md) | Modelo C4, evolución por fase, matriz ADR, atributos de calidad. |
| Gate de fase | [Simplicity Checklist — Phase 1](./blueprints/simplicity-checklist-phase-01.es.md) | Gate antes de añadir complejidad más allá de la baseline. |
| Decisiones | [Registro de ADRs](./adrs/README.es.md) · [Matriz ADR](./adrs/adr-matrix.es.md) | Trade-offs aceptados y su alcance. |
| Composición topológica | [Topology Hub](./topologies/README.es.md) | Multi-Topology Reference Corpus. |

Un documento forma parte de la baseline agnóstica solo cuando permanece válido bajo la prueba de fuego anterior. Los perfiles de runtime y patrones canónicos son guía condicionada, no política de baseline.

## 3. Principios Universales

La baseline se apoya en cinco principios, todos neutrales respecto a proveedor y producto:

1. **Abstracción de Proveedor & Modelo de Plugins.** El dominio depende de puertos, nunca de un proveedor, SDK, ORM o framework nombrado. Los adaptadores concretos viven en infraestructura y son reemplazables sin modificar el dominio.
2. **Capa Anticorrupción en cada frontera externa.** Los modelos externos entran al dominio solo mediante traducción. El dominio posee su propio lenguaje.
3. **Integridad y Trazabilidad de Evidencia.** Cada afirmación de gobernanza (resultado de gate, decisión, cierre) es reproducible desde la historia del repositorio y artefactos resolubles. Sin evidencia especulativa, marcador de posición ni waivers.
4. **Rendición de Cuentas Humana & Fronteras de Agentes.** Las operaciones mutativas tienen dueños humanos. Los agentes pueden proponer; los humanos aprueban. La auditoría registra ambas firmas.
5. **Aislamiento de Tenant & Neutralidad de Proveedor.** Aislamiento schema-por-contexto, row-level security opcional, protocolos de almacenamiento S3-compatibles, estándares de señal OpenTelemetry. Sin joins entre tenants, sin SDK propietario en el dominio.

El catálogo extendido de principios vive en [`principles/`](./principles/README.es.md).

## 4. Patrones Universales

Patrones estructurales obligatorios, agnósticos al runtime:

- **Arquitectura Hexagonal (Ports & Adapters).** Un puerto por capacidad propiedad del dominio; un adaptador directo en Fase 1, adaptadores adicionales solo cuando un ADR lo justifique.
- **Integración Contract-First.** Las superficies públicas son RESTful (OpenAPI v3); las llamadas síncronas internas escalan a gRPC (Protocol Buffers) desde la Fase 2; la integración asíncrona usa AMQP / CloudEvents con Transactional Outbox.
- **Frontend Atómico & Estado Cache-First.** Un monolito React modular hasta la Fase 3+, Module Federation solo por excepción, estado asíncrono cache-first (`stale-while-revalidate`), tokens de diseño atómicos compartidos.
- **Infraestructura Fundamental Neutral al Proveedor.** Caché vía puerto abstracto (Redis-compatible como referencia). Almacenamiento de objetos vía protocolo S3-compatible (MinIO como referencia). Persistencia relacional por ADR-0051 con aislamiento schema-por-contexto y normalización según ADR-0054.
- **Observabilidad OpenTelemetry-Native.** Tracing W3C Trace Context, logs JSON estructurados, OpenTelemetry Collector como punto de entrega neutral.
- **Despliegue Containerizado y Fasado.** Contenedores OCI con bases distroless. La Fase 1 puede correr en VM, App Service o Docker Compose. Kubernetes es obligatorio desde Fase 3+ con charts Helm v3 agnósticos al sabor.

Cada patrón está plenamente especificado en el [Universal Architecture Standards blueprint](./blueprints/authoritative-tech-stack-agnostic.md).

## 5. Restricciones No Negociables

La violación de cualquiera de las siguientes falla automáticamente el Architecture Gate:

- **Política Cero-SDK en el dominio.** Ningún SDK de proveedor cloud, ORM ni framework HTTP toca la capa de dominio.
- **Sin secretos en texto plano.** Los secretos viven en OpenBao (compatible con Vault) y se consumen solo vía inyección por sidecar.
- **Networking Zero Trust.** Federación OIDC / OAuth 2.0 / SAML 2.0 con JWTs firmados RS256. mTLS pasa a ser obligatorio al activar la malla distribuida (Fase 3+).
- **Sin lock-in de observabilidad propietaria.** Los agentes de vendor no pueden reemplazar la instrumentación OpenTelemetry.
- **Almacenamiento de objetos neutral al proveedor.** Los SDK binarios propietarios están prohibidos; el código de dominio interactúa solo vía puertos S3-compatibles.
- **Sin joins SQL entre contextos.** El aislamiento schema-por-contexto es absoluto; las lecturas entre contextos ocurren vía APIs de dominio.

## 6. Cómo Evoluciona la Baseline

- Los cambios a este documento DEBEN ir acompañados de un ADR Core que documente el trade-off y el alcance de ratificación.
- Las actualizaciones de perfil de runtime que entren en conflicto con la baseline se rechazan en el Architecture Gate; el conflicto se resuelve enmendando la baseline (vía ADR) o revirtiendo la decisión de runtime.
- El cierre de cualquier gap que afecte la baseline sigue el [Gap Closure Evidence Standard](../governance/standards/vision/gap-closure-evidence-standard.es.md).

---

[Volver al Architecture Hub](./README.es.md)
