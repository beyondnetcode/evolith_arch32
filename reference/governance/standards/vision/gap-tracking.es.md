# Evolith Core — Tablero de Seguimiento de Gaps

> **Navegación Bilingüe:** [English Version](./gap-tracking.md)

**Estado:** Seguimiento Activo
**Responsable:** Evolith Architecture Board
**Última Actualización:** 2026-06-14
**Detalle de Gaps:** [Catálogo de Referencia de Gaps](./gap-reference-catalog.es.md)

Este tablero es la única fuente de verdad para prioridad y estado de los gaps. Selecciona un ID para abrir la descripción del problema, propósito, evidencia, criterios de cierre y referencias.


| ID | Gap | Componente | Fase | Criticidad | Complejidad | Estado |
|---|---|:---:|:---:|:---:|:---:|:---:|
| [`GT-66`](./gap-reference-catalog.es.md#gt-66) | Trazado distribuido con OpenTelemetry | `BFF API` | F3 | P1 | L | `PENDIENTE` |
| [`GT-75`](./gap-reference-catalog.es.md#gt-75) | Paquete @evolith/infra-providers compartido | `Cross` | Transversal | P2 | M | `PENDIENTE` |
| [`GT-59`](./gap-reference-catalog.es.md#gt-59) | Hardening HTTP — Helmet + CORS + Rate Limiting (OWASP API4/8) | `BFF API` | Transversal | P0 | S | `COMPLETADO` |
| [`GT-27`](./gap-reference-catalog.es.md#gt-27) | Consistencia semántica del tracking canónico | `Governance` | Transversal | P0 | S | `COMPLETADO` |
| [`GT-01`](./gap-reference-catalog.es.md#gt-01) | ADR de contrato unificado | `Governance` | F0 | P0 | S | `COMPLETADO` |
| [`GT-60`](./gap-reference-catalog.es.md#gt-60) | Validación global de DTOs con class-validator (OWASP API3) | `BFF API` | Transversal | P0 | M | `COMPLETADO` |
| [`GT-64`](./gap-reference-catalog.es.md#gt-64) | Logging estructurado con Correlation ID | `BFF API` | Transversal | P0 | M | `COMPLETADO` |
| [`GT-44`](./gap-reference-catalog.es.md#gt-44) | Integridad determinista del pipeline de release | `CLI` | F5 | P0 | M | `COMPLETADO` |
| [`GT-41`](./gap-reference-catalog.es.md#gt-41) | Reconciliación automática de madurez | `Governance` | Transversal | P0 | M | `COMPLETADO` |
| [`GT-37`](./gap-reference-catalog.es.md#gt-37) | Cierre semántico de gaps condicionado por evidencia | `Governance` | Transversal | P0 | M | `COMPLETADO` |
| [`GT-28`](./gap-reference-catalog.es.md#gt-28) | Restaurar baseline de build, tests y smoke del CLI | `CLI` | F0 | P0 | M | `COMPLETADO` |
| [`GT-06`](./gap-reference-catalog.es.md#gt-06) | Tool MCP `evolith-gate-evaluate` | `CLI` | F2 | P0 | M | `COMPLETADO` |
| [`GT-03`](./gap-reference-catalog.es.md#gt-03) | `EvaluateGateUseCase` y comando `gate evaluate` | `Core Domain` | F1 | P0 | M | `COMPLETADO` |
| [`GT-02`](./gap-reference-catalog.es.md#gt-02) | `GateEvidence` modelado en la capa de dominio | `Core Domain` | F1 | P0 | M | `COMPLETADO` |
| [`GT-62`](./gap-reference-catalog.es.md#gt-62) | Autenticación API Key + JWT (OWASP API1/2/5) | `BFF API` | F2 | P0 | L | `COMPLETADO` |
| [`GT-73`](./gap-reference-catalog.es.md#gt-73) | Pruebas Unit + Integration + E2E del Core API | `BFF API` | Transversal | P0 | L | `COMPLETADO` |
| [`GT-72`](./gap-reference-catalog.es.md#gt-72) | Eliminar @ts-nocheck de la capa de aplicación | `Core Domain` | Transversal | P0 | L | `COMPLETADO` |
| [`GT-48`](./gap-reference-catalog.es.md#gt-48) | Restaurar el umbral normativo de cobertura del CLI | `CLI` | F0 | P0 | L | `COMPLETADO` |
| [`GT-29`](./gap-reference-catalog.es.md#gt-29) | Paridad de ejecución de reglas Native/OPA | `Core Domain` | F1 | P0 | L | `COMPLETADO` |
| [`GT-61`](./gap-reference-catalog.es.md#gt-61) | Manejo de errores RFC 9457 Problem Details | `BFF API` | Transversal | P1 | S | `COMPLETADO` |
| [`GT-63`](./gap-reference-catalog.es.md#gt-63) | Auditoría y registro de eventos de seguridad (OWASP API9) | `BFF API` | Transversal | P1 | S | `COMPLETADO` |
| [`GT-69`](./gap-reference-catalog.es.md#gt-69) | Richardson Nivel 2 — Verbos HTTP y Códigos de Estado | `BFF API` | Transversal | P1 | S | `COMPLETADO` |
| [`GT-70`](./gap-reference-catalog.es.md#gt-70) | Apagado graceful y manejo de señales del OS | `BFF API` | Transversal | P1 | S | `COMPLETADO` |
| [`GT-74`](./gap-reference-catalog.es.md#gt-74) | ConfigModule con validación de variables de entorno (Zod) | `BFF API` | Transversal | P1 | S | `COMPLETADO` |
| [`GT-47`](./gap-reference-catalog.es.md#gt-47) | Sincronización de documentación de producto y release | `Governance` | Transversal | P1 | S | `COMPLETADO` |
| [`GT-34`](./gap-reference-catalog.es.md#gt-34) | Repriorización del roadmap alrededor de la prueba de gobernanza | `Governance` | Producto | P1 | S | `COMPLETADO` |
| [`GT-18`](./gap-reference-catalog.es.md#gt-18) | Publicar `@evolith/smart-cli` en npm | `CLI` | F5 | P1 | S | `COMPLETADO` |
| [`GT-14`](./gap-reference-catalog.es.md#gt-14) | Webhook saliente al completar un gate | `CLI` | F4 | P1 | S | `COMPLETADO` |
| [`GT-12`](./gap-reference-catalog.es.md#gt-12) | `--dry-run` en todas las operaciones de escritura | `CLI` | F3 | P1 | S | `COMPLETADO` |
| [`GT-09`](./gap-reference-catalog.es.md#gt-09) | Enforcement real de coverage en Fase 3 | `CLI` | F3 | P1 | S | `COMPLETADO` |
| [`GT-08`](./gap-reference-catalog.es.md#gt-08) | Validación real del registro ADR en Fase 2 | `CLI` | F3 | P1 | S | `COMPLETADO` |
| [`GT-07`](./gap-reference-catalog.es.md#gt-07) | Smoke de release para evaluación de gates MCP | `CLI` | F2 | P1 | S | `COMPLETADO` |
| [`GT-04`](./gap-reference-catalog.es.md#gt-04) | Eliminar service locator del dominio | `Core Domain` | F1 | P1 | S | `COMPLETADO` |
| [`GT-65`](./gap-reference-catalog.es.md#gt-65) | Métricas Prometheus + Health checks liveness/readiness | `BFF API` | F2 | P1 | M | `COMPLETADO` |
| [`GT-67`](./gap-reference-catalog.es.md#gt-67) | Especificación OpenAPI 3.1 completa | `BFF API` | F2 | P1 | M | `COMPLETADO` |
| [`GT-76`](./gap-reference-catalog.es.md#gt-76) | PhaseTransitionUseCase expuesto en el Core API | `BFF API` | F1 | P1 | M | `COMPLETADO` |
| [`GT-56`](./gap-reference-catalog.es.md#gt-56) | Fallos silenciosos y mocks faltantes en pruebas E2E del CLI | `CLI` | Transversal | P1 | M | `COMPLETADO` |
| [`GT-55`](./gap-reference-catalog.es.md#gt-55) | Estrictez de TypeScript y eliminación de any implícito | `CLI` | Transversal | P1 | M | `COMPLETADO` |
| [`GT-51`](./gap-reference-catalog.es.md#gt-51) | Validación de evidencia de gate Build-versus-Compose | `CLI` | F3 | P1 | M | `COMPLETADO` |
| [`GT-49`](./gap-reference-catalog.es.md#gt-49) | Activar el modo estricto de TypeScript y puertos de filesystem tipados | `CLI` | Transversal | P1 | M | `COMPLETADO` |
| [`GT-46`](./gap-reference-catalog.es.md#gt-46) | Límite de ownership del servicio HTTP de Core | `CLI` | F2 | P1 | M | `COMPLETADO` |
| [`GT-45`](./gap-reference-catalog.es.md#gt-45) | Suite de conformidad de transporte y tools MCP | `CLI` | F2 | P1 | M | `COMPLETADO` |
| [`GT-42`](./gap-reference-catalog.es.md#gt-42) | Conformidad contractual entre repositorios | `Governance` | Transversal | P1 | M | `COMPLETADO` |
| [`GT-35`](./gap-reference-catalog.es.md#gt-35) | Inventarios automáticos y validación del tracking | `Governance` | Transversal | P1 | M | `COMPLETADO` |
| [`GT-33`](./gap-reference-catalog.es.md#gt-33) | Scoring de madurez basado en evidencia | `Governance` | Producto | P1 | M | `COMPLETADO` |
| [`GT-17`](./gap-reference-catalog.es.md#gt-17) | Consolidación DI y boundaries estrictos | `CLI` | F5 | P1 | M | `COMPLETADO` |
| [`GT-13`](./gap-reference-catalog.es.md#gt-13) | Ejecutor de propuestas `evolith-phase-advance` | `CLI` | F4 | P1 | M | `COMPLETADO` |
| [`GT-11`](./gap-reference-catalog.es.md#gt-11) | Validación de observabilidad y rollback en Fase 5 | `CLI` | F3 | P1 | M | `COMPLETADO` |
| [`GT-10`](./gap-reference-catalog.es.md#gt-10) | Validación de contenido del security scan en Fase 4 | `CLI` | F3 | P1 | M | `COMPLETADO` |
| [`GT-05`](./gap-reference-catalog.es.md#gt-05) | Transporte Streamable HTTP del SDK MCP | `CLI` | F2 | P1 | M | `COMPLETADO` |
| [`GT-57`](./gap-reference-catalog.es.md#gt-57) | Implementación incompleta de herramientas y validación MCP | `CLI` | F2 | P1 | L | `COMPLETADO` |
| [`GT-20`](./gap-reference-catalog.es.md#gt-20) | Backfill de ADRs al estándar de autoría | `Governance` | Transversal | P1 | L | `COMPLETADO` |
| [`GT-19`](./gap-reference-catalog.es.md#gt-19) | Migración hexagonal incremental de `core/` | `CLI` | Transversal | P1 | L | `COMPLETADO` |
| [`GT-68`](./gap-reference-catalog.es.md#gt-68) | Versionado de API con estrategia URI | `BFF API` | F3 | P2 | S | `COMPLETADO` |
| [`GT-78`](./gap-reference-catalog.es.md#gt-78) | Eliminar scripts de depuración de la raíz del repositorio | `Governance` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-77`](./gap-reference-catalog.es.md#gt-77) | CoreDomainModule extraído de AppModule | `BFF API` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-58`](./gap-reference-catalog.es.md#gt-58) | Limpiar stubs TODO inyectados por Hexagonal Scaffolder | `Core Domain` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-53`](./gap-reference-catalog.es.md#gt-53) | Reparar las referencias migradas a la visión de producto | `Governance` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-52`](./gap-reference-catalog.es.md#gt-52) | Eliminar los stubs muertos del contenedor de inyección de dependencias | `CLI` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-50`](./gap-reference-catalog.es.md#gt-50) | Aplicar umbrales de cobertura en la configuración de Jest | `CLI` | F0 | P2 | S | `COMPLETADO` |
| [`GT-26`](./gap-reference-catalog.es.md#gt-26) | Playbook de Zero-Downtime Release | `Governance` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-22`](./gap-reference-catalog.es.md#gt-22) | Esquema de unicidad de IDs ADR | `Governance` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-16`](./gap-reference-catalog.es.md#gt-16) | Consolidación documental | `Governance` | F5 | P2 | S | `COMPLETADO` |
| [`GT-71`](./gap-reference-catalog.es.md#gt-71) | Circuit Breaker para llamadas a servicios externos | `BFF API` | F3 | P2 | M | `COMPLETADO` |
| [`GT-24`](./gap-reference-catalog.es.md#gt-24) | Ejecutar migraciones documentales declaradas | `Governance` | Transversal | P2 | M | `COMPLETADO` |
| [`GT-21`](./gap-reference-catalog.es.md#gt-21) | Revisión de ubicación de ADRs Core tool-céntricos | `Governance` | Transversal | P2 | M | `COMPLETADO` |
| [`GT-54`](./gap-reference-catalog.es.md#gt-54) | Completar la aplicación estricta de fronteras hexagonales | `Cross` | Transversal | P2 | L | `COMPLETADO` |
| [`GT-36`](./gap-reference-catalog.es.md#gt-36) | Cobertura lingüística de reglas machine-readable | `Governance` | Transversal | P2 | L | `COMPLETADO` |
| [`GT-25`](./gap-reference-catalog.es.md#gt-25) | Primeros perfiles de proveedor | `Governance` | Transversal | P2 | L | `COMPLETADO` |
| [`GT-23`](./gap-reference-catalog.es.md#gt-23) | Backfill de traducciones españolas | `Governance` | Transversal | P2 | L | `COMPLETADO` |

**Progreso:** 68 / 70 completados · 0 en progreso · 2 pendientes · 0 diferidos

**Ordenamiento:** criticidad (`P0` → `P1` → `P2`), estado activo (`EN-PROGRESO` → `COMPLETADO` → `DIFERIDO`) y complejidad (`S` → `M` → `L`). Los gaps completados aparecen después del trabajo activo.

---
[Volver al Índice de Visión](./README.es.md)
