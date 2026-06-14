# Evolith Core — Tablero de Seguimiento de Gaps

> **Navegación Bilingüe:** [English Version](./gap-tracking.md)

**Estado:** Seguimiento Activo
**Responsable:** Evolith Architecture Board
**Última Actualización:** 2026-06-14
**Detalle de Gaps:** [Catálogo de Referencia de Gaps](./gap-reference-catalog.es.md)

Este tablero es la única fuente de verdad para prioridad y estado de los gaps. Selecciona un ID para abrir la descripción del problema, propósito, evidencia, criterios de cierre y referencias.


| ID | Gap | Componente | Fase | Criticidad | Complejidad | Estado |
|---|---|:---:|:---:|:---:|:---:|:---:|
| [`GT-78`](./gap-reference-catalog.es.md#gt-78) | Eliminar scripts de depuración de la raíz del repositorio | `governance` | Transversal | P2 | S | `PENDIENTE` |
| [`GT-77`](./gap-reference-catalog.es.md#gt-77) | CoreDomainModule extraído de AppModule | `core-api` | Transversal | P2 | S | `PENDIENTE` |
| [`GT-76`](./gap-reference-catalog.es.md#gt-76) | PhaseTransitionUseCase expuesto en el Core API | `core-api` | F1 | P1 | M | `PENDIENTE` |
| [`GT-75`](./gap-reference-catalog.es.md#gt-75) | Paquete @evolith/infra-providers compartido | `cross` | Transversal | P2 | M | `PENDIENTE` |
| [`GT-74`](./gap-reference-catalog.es.md#gt-74) | ConfigModule con validación de variables de entorno (Zod) | `core-api` | Transversal | P1 | S | `PENDIENTE` |
| [`GT-73`](./gap-reference-catalog.es.md#gt-73) | Pruebas Unit + Integration + E2E del Core API | `core-api` | Transversal | P0 | L | `PENDIENTE` |
| [`GT-72`](./gap-reference-catalog.es.md#gt-72) | Eliminar @ts-nocheck de la capa de aplicación | `core-domain` | Transversal | P0 | L | `PENDIENTE` |
| [`GT-71`](./gap-reference-catalog.es.md#gt-71) | Circuit Breaker para llamadas a servicios externos | `core-api` | F3 | P2 | M | `PENDIENTE` |
| [`GT-70`](./gap-reference-catalog.es.md#gt-70) | Apagado graceful y manejo de señales del OS | `core-api` | Transversal | P1 | S | `PENDIENTE` |
| [`GT-69`](./gap-reference-catalog.es.md#gt-69) | Richardson Nivel 2 — Verbos HTTP y Códigos de Estado | `core-api` | Transversal | P1 | S | `PENDIENTE` |
| [`GT-68`](./gap-reference-catalog.es.md#gt-68) | Versionado de API con estrategia URI | `core-api` | F3 | P2 | S | `PENDIENTE` |
| [`GT-67`](./gap-reference-catalog.es.md#gt-67) | Especificación OpenAPI 3.1 completa | `core-api` | F2 | P1 | M | `PENDIENTE` |
| [`GT-66`](./gap-reference-catalog.es.md#gt-66) | Trazado distribuido con OpenTelemetry | `core-api` | F3 | P1 | L | `PENDIENTE` |
| [`GT-65`](./gap-reference-catalog.es.md#gt-65) | Métricas Prometheus + Health checks liveness/readiness | `core-api` | F2 | P1 | M | `PENDIENTE` |
| [`GT-64`](./gap-reference-catalog.es.md#gt-64) | Logging estructurado con Correlation ID | `core-api` | Transversal | P0 | M | `PENDIENTE` |
| [`GT-63`](./gap-reference-catalog.es.md#gt-63) | Auditoría y registro de eventos de seguridad (OWASP API9) | `core-api` | Transversal | P1 | S | `PENDIENTE` |
| [`GT-62`](./gap-reference-catalog.es.md#gt-62) | Autenticación API Key + JWT (OWASP API1/2/5) | `core-api` | F2 | P0 | L | `PENDIENTE` |
| [`GT-61`](./gap-reference-catalog.es.md#gt-61) | Manejo de errores RFC 9457 Problem Details | `core-api` | Transversal | P1 | S | `PENDIENTE` |
| [`GT-60`](./gap-reference-catalog.es.md#gt-60) | Validación global de DTOs con class-validator (OWASP API3) | `core-api` | Transversal | P0 | M | `PENDIENTE` |
| [`GT-59`](./gap-reference-catalog.es.md#gt-59) | Hardening HTTP — Helmet + CORS + Rate Limiting (OWASP API4/8) | `core-api` | Transversal | P0 | S | `PENDIENTE` |
| [`GT-58`](./gap-reference-catalog.es.md#gt-58) | Limpiar stubs TODO inyectados por Hexagonal Scaffolder | `core-domain` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-57`](./gap-reference-catalog.es.md#gt-57) | Implementación incompleta de herramientas y validación MCP | `smart-cli` | F2 | P1 | L | `COMPLETADO` |
| [`GT-56`](./gap-reference-catalog.es.md#gt-56) | Fallos silenciosos y mocks faltantes en pruebas E2E del CLI | `smart-cli` | Transversal | P1 | M | `COMPLETADO` |
| [`GT-55`](./gap-reference-catalog.es.md#gt-55) | Estrictez de TypeScript y eliminación de any implícito | `smart-cli` | Transversal | P1 | M | `COMPLETADO` |
| [`GT-54`](./gap-reference-catalog.es.md#gt-54) | Completar la aplicación estricta de fronteras hexagonales | `cross` | Transversal | P2 | L | `COMPLETADO` |
| [`GT-53`](./gap-reference-catalog.es.md#gt-53) | Reparar las referencias migradas a la visión de producto | `governance` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-52`](./gap-reference-catalog.es.md#gt-52) | Eliminar los stubs muertos del contenedor de inyección de dependencias | `smart-cli` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-51`](./gap-reference-catalog.es.md#gt-51) | Validación de evidencia de gate Build-versus-Compose | `smart-cli` | F3 | P1 | M | `COMPLETADO` |
| [`GT-50`](./gap-reference-catalog.es.md#gt-50) | Aplicar umbrales de cobertura en la configuración de Jest | `smart-cli` | F0 | P2 | S | `COMPLETADO` |
| [`GT-49`](./gap-reference-catalog.es.md#gt-49) | Activar el modo estricto de TypeScript y puertos de filesystem tipados | `smart-cli` | Transversal | P1 | M | `COMPLETADO` |
| [`GT-48`](./gap-reference-catalog.es.md#gt-48) | Restaurar el umbral normativo de cobertura del CLI | `smart-cli` | F0 | P0 | L | `COMPLETADO` |
| [`GT-47`](./gap-reference-catalog.es.md#gt-47) | Sincronización de documentación de producto y release | `governance` | Transversal | P1 | S | `COMPLETADO` |
| [`GT-46`](./gap-reference-catalog.es.md#gt-46) | Límite de ownership del servicio HTTP de Core | `smart-cli` | F2 | P1 | M | `COMPLETADO` |
| [`GT-45`](./gap-reference-catalog.es.md#gt-45) | Suite de conformidad de transporte y tools MCP | `smart-cli` | F2 | P1 | M | `COMPLETADO` |
| [`GT-44`](./gap-reference-catalog.es.md#gt-44) | Integridad determinista del pipeline de release | `smart-cli` | F5 | P0 | M | `COMPLETADO` |
| [`GT-42`](./gap-reference-catalog.es.md#gt-42) | Conformidad contractual entre repositorios | `governance` | Transversal | P1 | M | `COMPLETADO` |
| [`GT-41`](./gap-reference-catalog.es.md#gt-41) | Reconciliación automática de madurez | `governance` | Transversal | P0 | M | `COMPLETADO` |
| [`GT-37`](./gap-reference-catalog.es.md#gt-37) | Cierre semántico de gaps condicionado por evidencia | `governance` | Transversal | P0 | M | `COMPLETADO` |
| [`GT-36`](./gap-reference-catalog.es.md#gt-36) | Cobertura lingüística de reglas machine-readable | `governance` | Transversal | P2 | L | `COMPLETADO` |
| [`GT-35`](./gap-reference-catalog.es.md#gt-35) | Inventarios automáticos y validación del tracking | `governance` | Transversal | P1 | M | `COMPLETADO` |
| [`GT-34`](./gap-reference-catalog.es.md#gt-34) | Repriorización del roadmap alrededor de la prueba de gobernanza | `governance` | Producto | P1 | S | `COMPLETADO` |
| [`GT-33`](./gap-reference-catalog.es.md#gt-33) | Scoring de madurez basado en evidencia | `governance` | Producto | P1 | M | `COMPLETADO` |
| [`GT-29`](./gap-reference-catalog.es.md#gt-29) | Paridad de ejecución de reglas Native/OPA | `core-domain` | F1 | P0 | L | `COMPLETADO` |
| [`GT-28`](./gap-reference-catalog.es.md#gt-28) | Restaurar baseline de build, tests y smoke del CLI | `smart-cli` | F0 | P0 | M | `COMPLETADO` |
| [`GT-27`](./gap-reference-catalog.es.md#gt-27) | Consistencia semántica del tracking canónico | `governance` | Transversal | P0 | S | `COMPLETADO` |
| [`GT-26`](./gap-reference-catalog.es.md#gt-26) | Playbook de Zero-Downtime Release | `governance` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-25`](./gap-reference-catalog.es.md#gt-25) | Primeros perfiles de proveedor | `governance` | Transversal | P2 | L | `COMPLETADO` |
| [`GT-24`](./gap-reference-catalog.es.md#gt-24) | Ejecutar migraciones documentales declaradas | `governance` | Transversal | P2 | M | `COMPLETADO` |
| [`GT-23`](./gap-reference-catalog.es.md#gt-23) | Backfill de traducciones españolas | `governance` | Transversal | P2 | L | `COMPLETADO` |
| [`GT-22`](./gap-reference-catalog.es.md#gt-22) | Esquema de unicidad de IDs ADR | `governance` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-21`](./gap-reference-catalog.es.md#gt-21) | Revisión de ubicación de ADRs Core tool-céntricos | `governance` | Transversal | P2 | M | `COMPLETADO` |
| [`GT-20`](./gap-reference-catalog.es.md#gt-20) | Backfill de ADRs al estándar de autoría | `governance` | Transversal | P1 | L | `COMPLETADO` |
| [`GT-19`](./gap-reference-catalog.es.md#gt-19) | Migración hexagonal incremental de `core/` | `smart-cli` | Transversal | P1 | L | `COMPLETADO` |
| [`GT-18`](./gap-reference-catalog.es.md#gt-18) | Publicar `@evolith/smart-cli` en npm | `smart-cli` | F5 | P1 | S | `COMPLETADO` |
| [`GT-17`](./gap-reference-catalog.es.md#gt-17) | Consolidación DI y boundaries estrictos | `smart-cli` | F5 | P1 | M | `COMPLETADO` |
| [`GT-16`](./gap-reference-catalog.es.md#gt-16) | Consolidación documental | `governance` | F5 | P2 | S | `COMPLETADO` |
| [`GT-14`](./gap-reference-catalog.es.md#gt-14) | Webhook saliente al completar un gate | `smart-cli` | F4 | P1 | S | `COMPLETADO` |
| [`GT-13`](./gap-reference-catalog.es.md#gt-13) | Ejecutor de propuestas `evolith-phase-advance` | `smart-cli` | F4 | P1 | M | `COMPLETADO` |
| [`GT-12`](./gap-reference-catalog.es.md#gt-12) | `--dry-run` en todas las operaciones de escritura | `smart-cli` | F3 | P1 | S | `COMPLETADO` |
| [`GT-11`](./gap-reference-catalog.es.md#gt-11) | Validación de observabilidad y rollback en Fase 5 | `smart-cli` | F3 | P1 | M | `COMPLETADO` |
| [`GT-10`](./gap-reference-catalog.es.md#gt-10) | Validación de contenido del security scan en Fase 4 | `smart-cli` | F3 | P1 | M | `COMPLETADO` |
| [`GT-09`](./gap-reference-catalog.es.md#gt-09) | Enforcement real de coverage en Fase 3 | `smart-cli` | F3 | P1 | S | `COMPLETADO` |
| [`GT-08`](./gap-reference-catalog.es.md#gt-08) | Validación real del registro ADR en Fase 2 | `smart-cli` | F3 | P1 | S | `COMPLETADO` |
| [`GT-07`](./gap-reference-catalog.es.md#gt-07) | Smoke de release para evaluación de gates MCP | `smart-cli` | F2 | P1 | S | `COMPLETADO` |
| [`GT-06`](./gap-reference-catalog.es.md#gt-06) | Tool MCP `evolith-gate-evaluate` | `smart-cli` | F2 | P0 | M | `COMPLETADO` |
| [`GT-05`](./gap-reference-catalog.es.md#gt-05) | Transporte Streamable HTTP del SDK MCP | `smart-cli` | F2 | P1 | M | `COMPLETADO` |
| [`GT-04`](./gap-reference-catalog.es.md#gt-04) | Eliminar service locator del dominio | `core-domain` | F1 | P1 | S | `COMPLETADO` |
| [`GT-03`](./gap-reference-catalog.es.md#gt-03) | `EvaluateGateUseCase` y comando `gate evaluate` | `core-domain` | F1 | P0 | M | `COMPLETADO` |
| [`GT-02`](./gap-reference-catalog.es.md#gt-02) | `GateEvidence` modelado en la capa de dominio | `core-domain` | F1 | P0 | M | `COMPLETADO` |
| [`GT-01`](./gap-reference-catalog.es.md#gt-01) | ADR de contrato unificado | `governance` | F0 | P0 | S | `COMPLETADO` |

**Progreso:** 50 / 70 completados · 0 en progreso · 20 pendientes · 0 diferidos

**Ordenamiento:** criticidad (`P0` → `P1` → `P2`), estado activo (`EN-PROGRESO` → `COMPLETADO` → `DIFERIDO`) y complejidad (`S` → `M` → `L`). Los gaps completados aparecen después del trabajo activo.

---
[Volver al Índice de Visión](./README.es.md)
