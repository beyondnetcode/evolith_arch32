# Evolith Core — Tablero de Seguimiento de Gaps

> **Navegación Bilingüe:** [English Version](./gap-tracking.md)

**Estado:** Seguimiento Activo
**Responsable:** Evolith Architecture Board
**Última Actualización:** 2026-06-14
**Detalle de Gaps:** [Catálogo de Referencia de Gaps](./gap-reference-catalog.es.md)

Este tablero es la única fuente de verdad para prioridad y estado de los gaps. Selecciona un ID para abrir la descripción del problema, propósito, evidencia, criterios de cierre y referencias.

> Una sola tabla con todos los gaps. Cada ID enlaza a su detalle completo en el catálogo. Orden: estado (activos arriba) → criticidad → complejidad; los completados van al final agrupados por componente. GitHub renderiza Markdown de forma estática (sin orden ni búsqueda interactivos): la columna **Componente** categoriza y la búsqueda de archivo de GitHub (`/`) encuentra un ID o término.

| ID | Gap | Componente | Fase | Criticidad | Complejidad | Estado |
|---|---|:---:|:---:|:---:|:---:|:---:|
| [`GT-110`](./gap-reference-catalog.es.md#gt-110) | Migrar el ingress del abandonado Kong OSS a Traefik/NGINX | `Platform` | Transversal | P0 | L | `COMPLETADO` |
| [`GT-112`](./gap-reference-catalog.es.md#gt-112) | Reemplazar los binarios comerciales de HashiCorp con OpenTofu + OpenBao | `Platform` | Transversal | P0 | L | `COMPLETADO` |
| [`GT-83`](./gap-reference-catalog.es.md#gt-83) | Desbloquear dependencias upstream del Tracker (Core API, UMS JWKS, UMS Auth Graph) | `Tracker` | Transversal | P0 | L | `REVISIÓN` |
| [`GT-79`](./gap-reference-catalog.es.md#gt-79) | Restaurar el pipeline de validación de CI del CLI en verde | `Governance` | Transversal | P1 | S | `COMPLETADO` |
| [`GT-80`](./gap-reference-catalog.es.md#gt-80) | Type-check de la suite de tests del CLI | `CLI` | Transversal | P1 | M | `COMPLETADO` |
| [`GT-97`](./gap-reference-catalog.es.md#gt-97) | Múltiples perfiles del CLI | `CLI` | Transversal | P1 | M | `COMPLETADO` |
| [`GT-111`](./gap-reference-catalog.es.md#gt-111) | Planificar el giro comercial de MassTransit v9 (quedarse en v8 OSS o migrar a Rebus) | `Platform` | Transversal | P1 | L | `PENDIENTE` |
| [`GT-85`](./gap-reference-catalog.es.md#gt-85) | Arquitectura de plugins para el workflow engine del Tracker | `Tracker` | Transversal | P1 | L | `PENDIENTE` |
| [`GT-86`](./gap-reference-catalog.es.md#gt-86) | Aggregate roots con event sourcing | `Tracker` | Transversal | P1 | L | `PENDIENTE` |
| [`GT-90`](./gap-reference-catalog.es.md#gt-90) | CQRS con proyecciones de read-model | `Tracker` | Transversal | P1 | L | `PENDIENTE` |
| [`GT-94`](./gap-reference-catalog.es.md#gt-94) | DSL de workflow / editor visual | `Tracker` | Transversal | P1 | L | `PENDIENTE` |
| [`GT-95`](./gap-reference-catalog.es.md#gt-95) | Aislamiento multi-tenant con shared kernel (PostgreSQL RLS) | `Tracker` | Transversal | P1 | L | `PENDIENTE` |
| [`GT-98`](./gap-reference-catalog.es.md#gt-98) | Sistema de extensiones/plugins del CLI | `CLI` | Transversal | P1 | L | `PENDIENTE` |
| [`GT-99`](./gap-reference-catalog.es.md#gt-99) | Autenticación SSO/SAML del CLI | `CLI` | Transversal | P1 | L | `PENDIENTE` |
| [`GT-103`](./gap-reference-catalog.es.md#gt-103) | Profundidad de subcomandos del CLI | `CLI` | Transversal | P2 | S | `PENDIENTE` |
| [`GT-105`](./gap-reference-catalog.es.md#gt-105) | Imagen Docker del CLI | `CLI` | Transversal | P2 | S | `PENDIENTE` |
| [`GT-106`](./gap-reference-catalog.es.md#gt-106) | Alias de comandos del CLI | `CLI` | Transversal | P2 | S | `PENDIENTE` |
| [`GT-108`](./gap-reference-catalog.es.md#gt-108) | Fixtures/datos de prueba del CLI | `CLI` | Transversal | P2 | S | `PENDIENTE` |
| [`GT-109`](./gap-reference-catalog.es.md#gt-109) | Integración de shell del CLI | `CLI` | Transversal | P2 | S | `PENDIENTE` |
| [`GT-82`](./gap-reference-catalog.es.md#gt-82) | Revivir o eliminar el spec muerto de gate-status | `CLI` | Transversal | P2 | S | `PENDIENTE` |
| [`GT-91`](./gap-reference-catalog.es.md#gt-91) | Contract testing con Pact (BFF↔Core) | `Tracker` | Transversal | P2 | S | `PENDIENTE` |
| [`GT-92`](./gap-reference-catalog.es.md#gt-92) | ADRs como código con CLI de cumplimiento | `Tracker` | Transversal | P2 | S | `PENDIENTE` |
| [`GT-100`](./gap-reference-catalog.es.md#gt-100) | Navegador/explorador de API del CLI | `CLI` | Transversal | P2 | M | `PENDIENTE` |
| [`GT-101`](./gap-reference-catalog.es.md#gt-101) | Mecanismo de auto-actualización del CLI | `CLI` | Transversal | P2 | M | `PENDIENTE` |
| [`GT-102`](./gap-reference-catalog.es.md#gt-102) | Progreso/streaming en tiempo real del CLI | `CLI` | Transversal | P2 | M | `PENDIENTE` |
| [`GT-104`](./gap-reference-catalog.es.md#gt-104) | Distribución por gestor de paquetes del CLI | `CLI` | Transversal | P2 | M | `PENDIENTE` |
| [`GT-107`](./gap-reference-catalog.es.md#gt-107) | Asistentes interactivos del CLI | `CLI` | Transversal | P2 | M | `PENDIENTE` |
| [`GT-81`](./gap-reference-catalog.es.md#gt-81) | Subir la cobertura de branches del CLI al piso de statements | `CLI` | F0 | P2 | M | `PENDIENTE` |
| [`GT-87`](./gap-reference-catalog.es.md#gt-87) | Federación GraphQL sobre REST | `Tracker` | Transversal | P2 | M | `PENDIENTE` |
| [`GT-88`](./gap-reference-catalog.es.md#gt-88) | Feature flags como objetos de dominio de primera clase | `Tracker` | Transversal | P2 | M | `PENDIENTE` |
| [`GT-89`](./gap-reference-catalog.es.md#gt-89) | Motor dinámico de formularios/esquemas | `Tracker` | Transversal | P2 | M | `PENDIENTE` |
| [`GT-93`](./gap-reference-catalog.es.md#gt-93) | Observabilidad incorporada (OTel BFF→Core→integraciones) | `Tracker` | Transversal | P2 | M | `PENDIENTE` |
| [`GT-96`](./gap-reference-catalog.es.md#gt-96) | Sincronización en tiempo real vía WebSockets/SSE | `Tracker` | Transversal | P2 | M | `PENDIENTE` |
| [`GT-113`](./gap-reference-catalog.es.md#gt-113) | Purificación de Clean Architecture en core-domain | `Core Domain` | Transversal | P1 | M | `PENDIENTE` |
| [`GT-114`](./gap-reference-catalog.es.md#gt-114) | Human-in-the-Loop para Herramientas Mutativas MCP | `CLI` | Transversal | P1 | M | `PENDIENTE` |
| [`GT-115`](./gap-reference-catalog.es.md#gt-115) | Auto-fix de fallas arquitectónicas vía herramientas MCP | `CLI` | Transversal | P2 | L | `PENDIENTE` |
| [`GT-116`](./gap-reference-catalog.es.md#gt-116) | Eliminación de operaciones bloqueantes de I/O en la CLI | `CLI` | Transversal | P2 | M | `PENDIENTE` |
| [`GT-84`](./gap-reference-catalog.es.md#gt-84) | Extraer AuditTrail como shared kernel | `Tracker` | Transversal | P1 | L | `DIFERIDO` |
| [`GT-59`](./gap-reference-catalog.es.md#gt-59) | Hardening HTTP — Helmet + CORS + Rate Limiting (OWASP API4/8) | `BFF API` | Transversal | P0 | S | `COMPLETADO` |
| [`GT-60`](./gap-reference-catalog.es.md#gt-60) | Validación global de DTOs con class-validator (OWASP API3) | `BFF API` | Transversal | P0 | M | `COMPLETADO` |
| [`GT-64`](./gap-reference-catalog.es.md#gt-64) | Logging estructurado con Correlation ID | `BFF API` | Transversal | P0 | M | `COMPLETADO` |
| [`GT-62`](./gap-reference-catalog.es.md#gt-62) | Autenticación API Key + JWT (OWASP API1/2/5) | `BFF API` | F2 | P0 | L | `COMPLETADO` |
| [`GT-73`](./gap-reference-catalog.es.md#gt-73) | Pruebas Unit + Integration + E2E del Core API | `BFF API` | Transversal | P0 | L | `COMPLETADO` |
| [`GT-61`](./gap-reference-catalog.es.md#gt-61) | Manejo de errores RFC 9457 Problem Details | `BFF API` | Transversal | P1 | S | `COMPLETADO` |
| [`GT-63`](./gap-reference-catalog.es.md#gt-63) | Auditoría y registro de eventos de seguridad (OWASP API9) | `BFF API` | Transversal | P1 | S | `COMPLETADO` |
| [`GT-69`](./gap-reference-catalog.es.md#gt-69) | Richardson Nivel 2 — Verbos HTTP y Códigos de Estado | `BFF API` | Transversal | P1 | S | `COMPLETADO` |
| [`GT-70`](./gap-reference-catalog.es.md#gt-70) | Apagado graceful y manejo de señales del OS | `BFF API` | Transversal | P1 | S | `COMPLETADO` |
| [`GT-74`](./gap-reference-catalog.es.md#gt-74) | ConfigModule con validación de variables de entorno (Zod) | `BFF API` | Transversal | P1 | S | `COMPLETADO` |
| [`GT-65`](./gap-reference-catalog.es.md#gt-65) | Métricas Prometheus + Health checks liveness/readiness | `BFF API` | F2 | P1 | M | `COMPLETADO` |
| [`GT-67`](./gap-reference-catalog.es.md#gt-67) | Especificación OpenAPI 3.1 completa | `BFF API` | F2 | P1 | M | `COMPLETADO` |
| [`GT-76`](./gap-reference-catalog.es.md#gt-76) | PhaseTransitionUseCase expuesto en el Core API | `BFF API` | F1 | P1 | M | `COMPLETADO` |
| [`GT-66`](./gap-reference-catalog.es.md#gt-66) | Trazado distribuido con OpenTelemetry | `BFF API` | F3 | P1 | L | `COMPLETADO` |
| [`GT-68`](./gap-reference-catalog.es.md#gt-68) | Versionado de API con estrategia URI | `BFF API` | F3 | P2 | S | `COMPLETADO` |
| [`GT-77`](./gap-reference-catalog.es.md#gt-77) | CoreDomainModule extraído de AppModule | `BFF API` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-71`](./gap-reference-catalog.es.md#gt-71) | Circuit Breaker para llamadas a servicios externos | `BFF API` | F3 | P2 | M | `COMPLETADO` |
| [`GT-44`](./gap-reference-catalog.es.md#gt-44) | Integridad determinista del pipeline de release | `CLI` | F5 | P0 | M | `COMPLETADO` |
| [`GT-28`](./gap-reference-catalog.es.md#gt-28) | Restaurar baseline de build, tests y smoke del CLI | `CLI` | F0 | P0 | M | `COMPLETADO` |
| [`GT-06`](./gap-reference-catalog.es.md#gt-06) | Tool MCP `evolith-gate-evaluate` | `CLI` | F2 | P0 | M | `COMPLETADO` |
| [`GT-48`](./gap-reference-catalog.es.md#gt-48) | Restaurar el umbral normativo de cobertura del CLI | `CLI` | F0 | P0 | L | `COMPLETADO` |
| [`GT-18`](./gap-reference-catalog.es.md#gt-18) | Publicar `@evolith/smart-cli` en npm | `CLI` | F5 | P1 | S | `COMPLETADO` |
| [`GT-14`](./gap-reference-catalog.es.md#gt-14) | Webhook saliente al completar un gate | `CLI` | F4 | P1 | S | `COMPLETADO` |
| [`GT-12`](./gap-reference-catalog.es.md#gt-12) | `--dry-run` en todas las operaciones de escritura | `CLI` | F3 | P1 | S | `COMPLETADO` |
| [`GT-09`](./gap-reference-catalog.es.md#gt-09) | Enforcement real de coverage en Fase 3 | `CLI` | F3 | P1 | S | `COMPLETADO` |
| [`GT-08`](./gap-reference-catalog.es.md#gt-08) | Validación real del registro ADR en Fase 2 | `CLI` | F3 | P1 | S | `COMPLETADO` |
| [`GT-07`](./gap-reference-catalog.es.md#gt-07) | Smoke de release para evaluación de gates MCP | `CLI` | F2 | P1 | S | `COMPLETADO` |
| [`GT-56`](./gap-reference-catalog.es.md#gt-56) | Fallos silenciosos y mocks faltantes en pruebas E2E del CLI | `CLI` | Transversal | P1 | M | `COMPLETADO` |
| [`GT-55`](./gap-reference-catalog.es.md#gt-55) | Estrictez de TypeScript y eliminación de any implícito | `CLI` | Transversal | P1 | M | `COMPLETADO` |
| [`GT-51`](./gap-reference-catalog.es.md#gt-51) | Validación de evidencia de gate Build-versus-Compose | `CLI` | F3 | P1 | M | `COMPLETADO` |
| [`GT-49`](./gap-reference-catalog.es.md#gt-49) | Activar el modo estricto de TypeScript y puertos de filesystem tipados | `CLI` | Transversal | P1 | M | `COMPLETADO` |
| [`GT-46`](./gap-reference-catalog.es.md#gt-46) | Límite de ownership del servicio HTTP de Core | `CLI` | F2 | P1 | M | `COMPLETADO` |
| [`GT-45`](./gap-reference-catalog.es.md#gt-45) | Suite de conformidad de transporte y tools MCP | `CLI` | F2 | P1 | M | `COMPLETADO` |
| [`GT-17`](./gap-reference-catalog.es.md#gt-17) | Consolidación DI y boundaries estrictos | `CLI` | F5 | P1 | M | `COMPLETADO` |
| [`GT-13`](./gap-reference-catalog.es.md#gt-13) | Ejecutor de propuestas `evolith-phase-advance` | `CLI` | F4 | P1 | M | `COMPLETADO` |
| [`GT-11`](./gap-reference-catalog.es.md#gt-11) | Validación de observabilidad y rollback en Fase 5 | `CLI` | F3 | P1 | M | `COMPLETADO` |
| [`GT-10`](./gap-reference-catalog.es.md#gt-10) | Validación de contenido del security scan en Fase 4 | `CLI` | F3 | P1 | M | `COMPLETADO` |
| [`GT-05`](./gap-reference-catalog.es.md#gt-05) | Transporte Streamable HTTP del SDK MCP | `CLI` | F2 | P1 | M | `COMPLETADO` |
| [`GT-57`](./gap-reference-catalog.es.md#gt-57) | Implementación incompleta de herramientas y validación MCP | `CLI` | F2 | P1 | L | `COMPLETADO` |
| [`GT-19`](./gap-reference-catalog.es.md#gt-19) | Migración hexagonal incremental de `core/` | `CLI` | Transversal | P1 | L | `COMPLETADO` |
| [`GT-52`](./gap-reference-catalog.es.md#gt-52) | Eliminar los stubs muertos del contenedor de inyección de dependencias | `CLI` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-50`](./gap-reference-catalog.es.md#gt-50) | Aplicar umbrales de cobertura en la configuración de Jest | `CLI` | F0 | P2 | S | `COMPLETADO` |
| [`GT-03`](./gap-reference-catalog.es.md#gt-03) | `EvaluateGateUseCase` y comando `gate evaluate` | `Core Domain` | F1 | P0 | M | `COMPLETADO` |
| [`GT-02`](./gap-reference-catalog.es.md#gt-02) | `GateEvidence` modelado en la capa de dominio | `Core Domain` | F1 | P0 | M | `COMPLETADO` |
| [`GT-72`](./gap-reference-catalog.es.md#gt-72) | Eliminar @ts-nocheck de la capa de aplicación | `Core Domain` | Transversal | P0 | L | `COMPLETADO` |
| [`GT-29`](./gap-reference-catalog.es.md#gt-29) | Paridad de ejecución de reglas Native/OPA | `Core Domain` | F1 | P0 | L | `COMPLETADO` |
| [`GT-04`](./gap-reference-catalog.es.md#gt-04) | Eliminar service locator del dominio | `Core Domain` | F1 | P1 | S | `COMPLETADO` |
| [`GT-58`](./gap-reference-catalog.es.md#gt-58) | Limpiar stubs TODO inyectados por Hexagonal Scaffolder | `Core Domain` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-75`](./gap-reference-catalog.es.md#gt-75) | Paquete @evolith/infra-providers compartido | `Cross` | Transversal | P2 | M | `COMPLETADO` |
| [`GT-54`](./gap-reference-catalog.es.md#gt-54) | Completar la aplicación estricta de fronteras hexagonales | `Cross` | Transversal | P2 | L | `COMPLETADO` |
| [`GT-27`](./gap-reference-catalog.es.md#gt-27) | Consistencia semántica del tracking canónico | `Governance` | Transversal | P0 | S | `COMPLETADO` |
| [`GT-01`](./gap-reference-catalog.es.md#gt-01) | ADR de contrato unificado | `Governance` | F0 | P0 | S | `COMPLETADO` |
| [`GT-41`](./gap-reference-catalog.es.md#gt-41) | Reconciliación automática de madurez | `Governance` | Transversal | P0 | M | `COMPLETADO` |
| [`GT-37`](./gap-reference-catalog.es.md#gt-37) | Cierre semántico de gaps condicionado por evidencia | `Governance` | Transversal | P0 | M | `COMPLETADO` |
| [`GT-47`](./gap-reference-catalog.es.md#gt-47) | Sincronización de documentación de producto y release | `Governance` | Transversal | P1 | S | `COMPLETADO` |
| [`GT-34`](./gap-reference-catalog.es.md#gt-34) | Repriorización del roadmap alrededor de la prueba de gobernanza | `Governance` | Producto | P1 | S | `COMPLETADO` |
| [`GT-42`](./gap-reference-catalog.es.md#gt-42) | Conformidad contractual entre repositorios | `Governance` | Transversal | P1 | M | `COMPLETADO` |
| [`GT-35`](./gap-reference-catalog.es.md#gt-35) | Inventarios automáticos y validación del tracking | `Governance` | Transversal | P1 | M | `COMPLETADO` |
| [`GT-33`](./gap-reference-catalog.es.md#gt-33) | Scoring de madurez basado en evidencia | `Governance` | Producto | P1 | M | `COMPLETADO` |
| [`GT-20`](./gap-reference-catalog.es.md#gt-20) | Backfill de ADRs al estándar de autoría | `Governance` | Transversal | P1 | L | `COMPLETADO` |
| [`GT-78`](./gap-reference-catalog.es.md#gt-78) | Eliminar scripts de depuración de la raíz del repositorio | `Governance` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-53`](./gap-reference-catalog.es.md#gt-53) | Reparar las referencias migradas a la visión de producto | `Governance` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-26`](./gap-reference-catalog.es.md#gt-26) | Playbook de Zero-Downtime Release | `Governance` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-22`](./gap-reference-catalog.es.md#gt-22) | Esquema de unicidad de IDs ADR | `Governance` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-16`](./gap-reference-catalog.es.md#gt-16) | Consolidación documental | `Governance` | F5 | P2 | S | `COMPLETADO` |
| [`GT-24`](./gap-reference-catalog.es.md#gt-24) | Ejecutar migraciones documentales declaradas | `Governance` | Transversal | P2 | M | `COMPLETADO` |
| [`GT-21`](./gap-reference-catalog.es.md#gt-21) | Revisión de ubicación de ADRs Core tool-céntricos | `Governance` | Transversal | P2 | M | `COMPLETADO` |
| [`GT-36`](./gap-reference-catalog.es.md#gt-36) | Cobertura lingüística de reglas machine-readable | `Governance` | Transversal | P2 | L | `COMPLETADO` |
| [`GT-25`](./gap-reference-catalog.es.md#gt-25) | Primeros perfiles de proveedor | `Governance` | Transversal | P2 | L | `COMPLETADO` |
| [`GT-23`](./gap-reference-catalog.es.md#gt-23) | Backfill de traducciones españolas | `Governance` | Transversal | P2 | L | `COMPLETADO` |

**Progreso:** 75 / 108 completados · 0 en progreso · 32 pendientes · 1 diferidos

**Ordenamiento:** una sola tabla, ordenada por estado (pendientes, luego diferidos, luego completados), luego criticidad (`P0` → `P1` → `P2`) y luego complejidad (`S` → `M` → `L`); los completados se agrupan por componente. Cada ID enlaza a su detalle en el [Catálogo de Referencia de Gaps](./gap-reference-catalog.es.md).

---
[Volver al Índice de Visión](./README.es.md)
