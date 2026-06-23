# Evolith Core — Tablero de Seguimiento de Gaps

> **Navegación Bilingüe:** [English Version](./gap-tracking.md)

**Estado:** Seguimiento Activo
**Responsable:** Evolith Architecture Board
**Última Actualización:** 2026-06-23
**Detalle de Gaps:** [Catálogo de Referencia de Gaps](./gap-reference-catalog.es.md)

Este tablero es la única fuente de verdad para deuda técnica, gaps, oportunidades, habilitadores, prioridad y estado. Selecciona un ID para abrir la descripción del problema, propósito, evidencia, criterios de cierre y referencias.

> Una sola tabla con todos los gaps y actividades rastreadas. Los IDs `GT-*` enlazan a su detalle completo en el catálogo; los IDs `MT-A*` enlazan al plan de implementación Multi-Topology de apoyo, pero esta tabla sigue siendo la fuente canónica de estado. Orden: estado (activos arriba) → criticidad → complejidad; los completados van al final agrupados por componente. GitHub renderiza Markdown de forma estática (sin orden ni búsqueda interactivos): la columna **Componente** categoriza y la búsqueda de archivo de GitHub (`/`) encuentra un ID o término.

| ID | Gap | Componente | Fase | Criticidad | Complejidad | Estado |
|---|---|:---:|:---:|:---:|:---:|:---:|
| [`GT-190`](./gap-reference-catalog.es.md#gt-190) | Agregar logging a 9 catch blocks vacíos | `CLI` | Cross | P2 | S | `COMPLETADO` |
| [`GT-191`](./gap-reference-catalog.es.md#gt-191) | Corregir etiqueta ADR matrix incorrecta | `Docs` | Cross | P2 | S | `COMPLETADO` |
| [`GT-192`](./gap-reference-catalog.es.md#gt-192) | Corregir enlaces MASTER_INDEX EN (`.es.md`→`.md`) | `Docs` | Cross | P2 | S | `COMPLETADO` |
| [`GT-193`](./gap-reference-catalog.es.md#gt-193) | Eliminar TODOs de documentación de gobernanza | `Docs` | Cross | P2 | S | `COMPLETADO` |
| [`GT-195`](./gap-reference-catalog.es.md#gt-195) | Corregir rutas shell solo-Linux (Windows compat) | `CLI` | Cross | P2 | S | `COMPLETADO` |
| [`GT-211`](./gap-reference-catalog.es.md#gt-211) | Crear EN para 3 ADRs solo-ES huérfanos | `Docs` | Cross | P2 | S | `COMPLETADO` |
| [`GT-178`](./gap-reference-catalog.es.md#gt-178) | Reconstruir `core/README.es.md` con todos los ADRs | `Docs` | Cross | P2 | M | `COMPLETADO` |
| [`GT-186`](./gap-reference-catalog.es.md#gt-186) | Eliminar `@ts-nocheck` restante (fase 2) | `CLI` | Cross | P2 | M | `COMPLETADO` |
| [`GT-187`](./gap-reference-catalog.es.md#gt-187) | Habilitar modo estricto en tsconfig | `CLI` | Cross | P2 | M | `COMPLETADO` |
| [`GT-189`](./gap-reference-catalog.es.md#gt-189) | Reemplazar `require()` con imports ES | `CLI` | Cross | P2 | M | `COMPLETADO` |
| [`GT-194`](./gap-reference-catalog.es.md#gt-194) | Eliminar tipos `any` en APIs públicas | `CLI` | Cross | P2 | M | `PENDIENTE` |
| [`GT-196`](./gap-reference-catalog.es.md#gt-196) | Agregar tests E2E para transporte HTTP MCP | `MCP Services` | Cross | P2 | M | `PENDIENTE` |
| [`GT-183`](./gap-reference-catalog.es.md#gt-183) | Construir scaffolding BFF mínimo (NestJS) | `Architecture` | Cross | P2 | L | `PENDIENTE` |
| [`GT-188`](./gap-reference-catalog.es.md#gt-188) | Agregar tests para 15 archivos sin cobertura | `CLI` | Cross | P2 | L | `PENDIENTE` |
| [`GT-197`](./gap-reference-catalog.es.md#gt-197) | Corregir fallos intermitentes pipeline release | `DevOps` | Cross | P2 | L | `PENDIENTE` |
| [`GT-198`](./gap-reference-catalog.es.md#gt-198) | Corregir typo "Moscoww" (5 sitios) | `CLI` | Cross | P3 | S | `COMPLETADO` |
| [`GT-199`](./gap-reference-catalog.es.md#gt-199) | Mover import al inicio del archivo | `CLI` | Cross | P3 | S | `COMPLETADO` |
| [`GT-200`](./gap-reference-catalog.es.md#gt-200) | Convertir constructor 11-param a objeto options | `CLI` | Cross | P3 | S | `COMPLETADO` |
| [`GT-201`](./gap-reference-catalog.es.md#gt-201) | Extraer valores hardcodeados a constantes | `CLI` | Cross | P3 | S | `COMPLETADO` |
| [`GT-202`](./gap-reference-catalog.es.md#gt-202) | Agregar README a directorio `governance/adr/` | `Docs` | Cross | P3 | S | `COMPLETADO` |
| [`GT-203`](./gap-reference-catalog.es.md#gt-203) | Eliminar o poblar dir vacío `kubernetes/` | `Docs` | Cross | P3 | S | `COMPLETADO` |
| [`GT-204`](./gap-reference-catalog.es.md#gt-204) | Agregar READMEs a directorios infra | `Docs` | Cross | P3 | S | `COMPLETADO` |
| [`GT-205`](./gap-reference-catalog.es.md#gt-205) | Agregar README a directorio SDLC playbooks | `Docs` | Cross | P3 | S | `COMPLETADO` |
| [`GT-206`](./gap-reference-catalog.es.md#gt-206) | Formalizar regla de anidación BILINGUAL_INDEX | `Docs` | Cross | P3 | S | `COMPLETADO` |
| [`GT-207`](./gap-reference-catalog.es.md#gt-207) | Estandarizar formato encabezados ADR | `Docs` | Cross | P3 | S | `COMPLETADO` |
| [`GT-208`](./gap-reference-catalog.es.md#gt-208) | Programar reevaluación ADR-0077 (MassTransit EOL) | `Docs` | Cross | P3 | S | `COMPLETADO` |
| [`GT-209`](./gap-reference-catalog.es.md#gt-209) | Crear baseline agnóstico (`agnostic-baseline.md` ausente) | `Architecture` | Cross | P0 | M | `COMPLETADO` |
| [`GT-169`](./gap-reference-catalog.es.md#gt-169) | Presupuestos operativos, ciclo de credenciales y runbooks de Agentic AI | `Architecture` | Cross | P1 | L | `COMPLETADO` |
| [`GT-173`](./gap-reference-catalog.es.md#gt-173) | Paridad de exportación OpenTelemetry en CLI, MCP y REST | `Cross` | Cross | P2 | M | `COMPLETADO` |
| [`GT-171`](./gap-reference-catalog.es.md#gt-171) | Auditoría de paridad de superficie command-as-a-service (CLI vs MCP vs REST) | `Cross` | Cross | P2 | L | `COMPLETADO` |
| [`GT-172`](./gap-reference-catalog.es.md#gt-172) | Suite de pruebas de contrato roundtrip entre superficies | `Cross` | Cross | P2 | L | `COMPLETADO` |
| [`GT-164`](./gap-reference-catalog.es.md#gt-164) | Riqueza de rulesets event-driven y data-mesh | `Rulesets` | Cross | P1 | M | `COMPLETADO` |
| [`GT-152`](./gap-reference-catalog.es.md#gt-152) | Contrato de Conocimiento Externo y Esquema de Registro Fuente | `Governance` | Cross | P0 | S | `COMPLETADO` |
| [`GT-153`](./gap-reference-catalog.es.md#gt-153) | Gobierno del Ciclo de Vida del Conocimiento por Winston | `Governance` | Cross | P0 | M | `COMPLETADO` |
| [`GT-154`](./gap-reference-catalog.es.md#gt-154) | Proyección RAG y Paridad Native/OPA para Conocimiento Externo | `Governance` | Cross | P0 | M | `COMPLETADO` |
| [`GT-151`](./gap-reference-catalog.es.md#gt-151) | Completar la Cobertura de IDs de Regla Native/OPA para Topologías Aceptadas | `Rulesets` | Cross | P0 | M | `DONE` |
| [`GT-146`](./gap-reference-catalog.es.md#gt-146) | Revisión Agéntica de CI Segura, Neutral al Proveedor y Acotada por Tokens | `Governance` | Cross | P0 | L | `COMPLETADO` |
| [`GT-150`](./gap-reference-catalog.es.md#gt-150) | Madurar las Topologías Draft Restantes a Paridad de Corpus Aceptado | `Architecture` | Cross | P1 | L | `COMPLETADO` |
| [`GT-168`](./gap-reference-catalog.es.md#gt-168) | Aplicación de referencia de composición cross-topología | `Architecture` | Cross | P1 | L | `COMPLETADO` |
| [`GT-145`](./gap-reference-catalog.es.md#gt-145) | Sincronización Veraz y Neutral al Proveedor de Vectores RAG | `Operations` | Cross | P1 | L | `COMPLETADO` |
| [`GT-149`](./gap-reference-catalog.es.md#gt-149) | Pruebas OPA Ejecutables y Gate de Paridad Semántica Native/OPA | `Rulesets` | Cross | P1 | L | `COMPLETADO` |
| [`GT-147`](./gap-reference-catalog.es.md#gt-147) | Auditoría Automatizada de Deriva de Capacidades Operativas y Eficiencia | `Governance` | Cross | P1 | M | `COMPLETADO` |
| [`GT-140`](./gap-reference-catalog.es.md#gt-140) | Estándar de Rotación de Tokens de Identidad de Workload para Referencia de Satélites | `Architecture` | Cross | P1 | M | `DONE` |
| [`GT-142`](./gap-reference-catalog.es.md#gt-142) | Pipeline de Enlace de LLM Real en CI para Revisiones Agénticas | `Governance` | Cross | P1 | L | `DONE` |
| [`GT-144`](./gap-reference-catalog.es.md#gt-144) | Reglas de Prevención de Bucles Infinitos y Circuit Breaker para Agentes | `Governance` | Cross | P1 | M | `DONE` |
| [`GT-141`](./gap-reference-catalog.es.md#gt-141) | Estándar de Control de Concurrencia y Bloqueo de Recursos para Herramientas MCP | `Architecture` | Cross | P2 | M | `DONE` |
| [`GT-143`](./gap-reference-catalog.es.md#gt-143) | Estándares de Handoff Multi-Agente y Delegación de Tareas | `Governance` | Cross | P2 | L | `DONE` |
| [`GT-148`](./gap-reference-catalog.es.md#gt-148) | Reparación de Migración de Referencias y Cobertura de Reglas Consciente de Topologías | `Rulesets` | Cross | P1 | M | `COMPLETADO` |
| [`GT-135`](./gap-reference-catalog.es.md#gt-135) | Estándar de Telemetría y Control de Costos para IA Agéntica | `Architecture` | Cross | P1 | M | `DONE` |
| [`GT-136`](./gap-reference-catalog.es.md#gt-136) | Control de Acceso Consciente del Contexto (ABAC para LLMs) | `Governance` | Cross | P1 | L | `DONE` |
| [`GT-137`](./gap-reference-catalog.es.md#gt-137) | Identidad Soberana para IA Agéntica | `Architecture` | Cross | P2 | M | `DONE` |
| [`GT-138`](./gap-reference-catalog.es.md#gt-138) | Flujos de Trabajo Agénticos Orientados a Eventos | `Architecture` | Cross | P2 | M | `DONE` |
| [`GT-139`](./gap-reference-catalog.es.md#gt-139) | Estándar de Gobernanza de Conocimiento RAG | `Governance` | Cross | P2 | L | `DONE` |
| [`GT-132`](./gap-reference-catalog.es.md#gt-132) | Revisiones de Código Autónomas con Agentes MCP en CI | `Governance` | Cross | P1 | M | `DONE` |
| [`GT-133`](./gap-reference-catalog.es.md#gt-133) | Arquitectura de Distribución Agnóstica Centralizada de OPA Wasm | `Architecture` | Cross | P2 | L | `DONE` |
| [`GT-134`](./gap-reference-catalog.es.md#gt-134) | Registro Estandarizado de Herramientas MCP | `Architecture` | Cross | P2 | M | `DONE` |
| [`GT-130`](./gap-reference-catalog.es.md#gt-130) | Validación en pipeline CI para firmas de Agentes BMAD en ADRs y Specs Técnicas | `Governance` | Cross | P1 | M | `DONE` |
| [`GT-131`](./gap-reference-catalog.es.md#gt-131) | Crear Sandbox/Referencia Aplicada para la Topología Agentic AI con MCP real | `Architecture` | Cross | P2 | L | `DONE` |
| [`GT-117`](./gap-reference-catalog.es.md#gt-117) | Endpoints de lectura (GET) en el Core API para la composición del BFF del Tracker | `BFF API` | F2 | P1 | M | `COMPLETADO` |
| [`GT-118`](./gap-reference-catalog.es.md#gt-118) | Modelo de consumo remoto/SaaS — desacoplar el Core API de rutas de filesystem locales | `BFF API` | F3 | P1 | L | `COMPLETADO` |
| [`MT-A23`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Preservar compatibilidad CLI `--arch-level F1/F2/F3` | `Smart CLI` | Transversal | P1 | M | `COMPLETADO` |
| [`MT-A17`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Mover o espejar reglas F1/F2/F3 actuales hacia descubrimiento topológico | `Core Domain` | Transversal | P1 | L | `COMPLETADO` |
| [`MT-A18`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Agregar reglas iniciales Native + OPA para serverless | `Rulesets` | Transversal | P1 | L | `COMPLETADO` |
| [`MT-A19`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Agregar reglas iniciales Native + OPA para event-driven | `Rulesets` | Transversal | P1 | L | `COMPLETADO` |
| [`MT-A20`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Agregar reglas iniciales Native + OPA para agentic AI | `Rulesets` | Transversal | P1 | L | `COMPLETADO` |
| [`MT-A21`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Agregar catálogo topológico compartido y resolver de manifiestos en Core Domain | `Core Domain` | Transversal | P1 | L | `COMPLETADO` |
| [`MT-A22`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Agregar soporte CLI `--topology` a validación | `Smart CLI` | Transversal | P1 | L | `COMPLETADO` |
| [`MT-A24`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Agregar recursos y herramientas MCP topológicas | `MCP Services` | Transversal | P1 | L | `COMPLETADO` |
| [`MT-A25`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Agregar endpoints de descubrimiento y validación topológica a Service CORE API | `Core API` | Transversal | P1 | L | `COMPLETADO` |
| [`GT-119`](./gap-reference-catalog.es.md#gt-119) | Reconciliar el ADR-0074 §5 (MCP en NestJS) con el paquete standalone `@evolith/mcp-server` | `Governance` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-120`](./gap-reference-catalog.es.md#gt-120) | Exposición GraphQL del Core API (alcance del ADR-0074) | `BFF API` | F3 | P2 | M | `COMPLETADO` |
| [`GT-121`](./gap-reference-catalog.es.md#gt-121) | Retirar el subsistema MCP in-process del Smart CLI (tras la delegación, Fase 3 de ADR-0074/0075) | `CLI` | Transversal | P2 | M | `COMPLETADO` |
| [`GT-122`](./gap-reference-catalog.es.md#gt-122) | Consolidar adapters de infraestructura duplicados entre sdk/cli, apps/core-api y packages/infra-providers | `Cross` | Transversal | P2 | M | `COMPLETADO` |
| [`GT-124`](./gap-reference-catalog.es.md#gt-124) | Suite e2e del CLI rota — faltan fixtures (plantillas SDLC, shell hooks) y naming obsoleto del MCP viejo | `CLI` | Transversal | P2 | M | `COMPLETADO` |
| [`MT-A09`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Crear Topology Hub en inglés y español | `Documentation` | Transversal | P1 | S | `COMPLETADO` |
| [`GT-165`](./gap-reference-catalog.es.md#gt-165) | SLOs y presupuestos de costo concretos para topologías serverless y edge | `Documentation` | Cross | P1 | S | `COMPLETADO` |
| [`GT-166`](./gap-reference-catalog.es.md#gt-166) | Runbooks SDLC faltantes para Fases 1, 2 y 4 | `Documentation` | Cross | P1 | M | `COMPLETADO` |
| [`GT-167`](./gap-reference-catalog.es.md#gt-167) | Plantillas de evidencia y checklists de aceptación para phase-gates | `Documentation` | Cross | P1 | M | `COMPLETADO` |
| [`MT-A26`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Actualizar navegación, índices, evidencia de validación y estado del tracker | `Documentation` | Transversal | P2 | M | `COMPLETADO` |
| [`GT-59`](./gap-reference-catalog.es.md#gt-59) | Hardening HTTP — Helmet + CORS + Rate Limiting (OWASP API4/8) | `BFF API` | Transversal | P0 | S | `COMPLETADO` |
| [`GT-60`](./gap-reference-catalog.es.md#gt-60) | Validación global de DTOs con class-validator (OWASP API3) | `BFF API` | Transversal | P0 | M | `COMPLETADO` |
| [`GT-64`](./gap-reference-catalog.es.md#gt-64) | Logging estructurado con Correlation ID | `BFF API` | Transversal | P0 | M | `COMPLETADO` |
| [`GT-155`](./gap-reference-catalog.es.md#gt-155) | Conformidad de envelope ADR-0073 en el REST del Core API | `BFF API` | Cross | P0 | M | `COMPLETADO` |
| [`GT-62`](./gap-reference-catalog.es.md#gt-62) | Autenticación API Key + JWT (OWASP API1/2/5) | `BFF API` | F2 | P0 | L | `COMPLETADO` |
| [`GT-73`](./gap-reference-catalog.es.md#gt-73) | Pruebas Unit + Integration + E2E del Core API | `BFF API` | Transversal | P0 | L | `COMPLETADO` |
| [`GT-61`](./gap-reference-catalog.es.md#gt-61) | Manejo de errores RFC 9457 Problem Details | `BFF API` | Transversal | P1 | S | `COMPLETADO` |
| [`GT-63`](./gap-reference-catalog.es.md#gt-63) | Auditoría y registro de eventos de seguridad (OWASP API9) | `BFF API` | Transversal | P1 | S | `COMPLETADO` |
| [`GT-69`](./gap-reference-catalog.es.md#gt-69) | Richardson Nivel 2 — Verbos HTTP y Códigos de Estado | `BFF API` | Transversal | P1 | S | `COMPLETADO` |
| [`GT-70`](./gap-reference-catalog.es.md#gt-70) | Apagado graceful y manejo de señales del OS | `BFF API` | Transversal | P1 | S | `COMPLETADO` |
| [`GT-74`](./gap-reference-catalog.es.md#gt-74) | ConfigModule con validación de variables de entorno (Zod) | `BFF API` | Transversal | P1 | S | `COMPLETADO` |
| [`GT-159`](./gap-reference-catalog.es.md#gt-159) | Versionado de URI y política de deprecación de la API REST | `BFF API` | Cross | P1 | S | `COMPLETADO` |
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
| [`GT-123`](./gap-reference-catalog.es.md#gt-123) | El CLI no compila — errores TypeScript preexistentes bloquean `tsc` (init.wizard, progress.service, alias, auto-fix del MCP viejo) | `CLI` | Transversal | P1 | L | `COMPLETADO` |
| [`GT-79`](./gap-reference-catalog.es.md#gt-79) | Restaurar el pipeline de validación de CI del CLI en verde | `Governance` | Transversal | P1 | S | `COMPLETADO` |
| [`GT-18`](./gap-reference-catalog.es.md#gt-18) | Publicar `@evolith/smart-cli` en npm | `CLI` | F5 | P1 | S | `COMPLETADO` |
| [`GT-14`](./gap-reference-catalog.es.md#gt-14) | Webhook saliente al completar un gate | `CLI` | F4 | P1 | S | `COMPLETADO` |
| [`GT-12`](./gap-reference-catalog.es.md#gt-12) | `--dry-run` en todas las operaciones de escritura | `CLI` | F3 | P1 | S | `COMPLETADO` |
| [`GT-09`](./gap-reference-catalog.es.md#gt-09) | Enforcement real de coverage en Fase 3 | `CLI` | F3 | P1 | S | `COMPLETADO` |
| [`GT-08`](./gap-reference-catalog.es.md#gt-08) | Validación real del registro ADR en Fase 2 | `CLI` | F3 | P1 | S | `COMPLETADO` |
| [`GT-07`](./gap-reference-catalog.es.md#gt-07) | Smoke de release para evaluación de gates MCP | `CLI` | F2 | P1 | S | `COMPLETADO` |
| [`GT-80`](./gap-reference-catalog.es.md#gt-80) | Type-check de la suite de tests del CLI | `CLI` | Transversal | P1 | M | `COMPLETADO` |
| [`GT-97`](./gap-reference-catalog.es.md#gt-97) | Múltiples perfiles del CLI | `CLI` | Transversal | P1 | M | `COMPLETADO` |
| [`GT-100`](./gap-reference-catalog.es.md#gt-100) | Navegador/explorador de API del CLI | `CLI` | Transversal | P2 | M | `COMPLETADO` |
| [`GT-101`](./gap-reference-catalog.es.md#gt-101) | Mecanismo de auto-actualización del CLI | `CLI` | Transversal | P2 | M | `COMPLETADO` |
| [`GT-102`](./gap-reference-catalog.es.md#gt-102) | Progreso/streaming en tiempo real del CLI | `CLI` | Transversal | P2 | M | `COMPLETADO` |
| [`GT-104`](./gap-reference-catalog.es.md#gt-104) | Distribución por gestor de paquetes del CLI | `CLI` | Transversal | P2 | M | `COMPLETADO` |
| [`GT-107`](./gap-reference-catalog.es.md#gt-107) | Asistentes interactivos del CLI | `CLI` | Transversal | P2 | M | `COMPLETADO` |
| [`GT-81`](./gap-reference-catalog.es.md#gt-81) | Subir la cobertura de branches del CLI al piso de statements | `CLI` | F0 | P2 | M | `COMPLETADO` |
| [`GT-116`](./gap-reference-catalog.es.md#gt-116) | Eliminación de operaciones bloqueantes de I/O en la CLI | `CLI` | Transversal | P2 | M | `COMPLETADO` |
| [`GT-115`](./gap-reference-catalog.es.md#gt-115) | Auto-fix de fallas arquitectónicas vía herramientas MCP | `CLI` | Transversal | P2 | L | `COMPLETADO` |
| [`GT-114`](./gap-reference-catalog.es.md#gt-114) | Human-in-the-Loop para Herramientas Mutativas MCP | `CLI` | Transversal | P1 | M | `COMPLETADO` |
| [`GT-56`](./gap-reference-catalog.es.md#gt-56) | Fallos silenciosos y mocks faltantes en pruebas E2E del CLI | `CLI` | Transversal | P1 | M | `COMPLETADO` |
| [`GT-55`](./gap-reference-catalog.es.md#gt-55) | Estrictez de TypeScript y eliminación de any implícito | `CLI` | Transversal | P1 | M | `COMPLETADO` |
| [`GT-51`](./gap-reference-catalog.es.md#gt-51) | Validación de evidencia de gate Build-versus-Compose | `CLI` | F3 | P1 | M | `COMPLETADO` |
| [`GT-49`](./gap-reference-catalog.es.md#gt-49) | Activar el modo estricto de TypeScript y puertos de filesystem tipados | `CLI` | Transversal | P1 | M | `COMPLETADO` |
| [`GT-180`](./gap-reference-catalog.es.md#gt-180) | Reemplazar `require()` entre capas con imports ES / `import()` dinámico | `CLI` | Cross | P1 | M | `COMPLETADO` |
| [`GT-181`](./gap-reference-catalog.es.md#gt-181) | Dividir archivos grandes en módulos pequeños | `CLI` | Cross | P1 | M | `COMPLETADO` |
| [`GT-182`](./gap-reference-catalog.es.md#gt-182) | Agregar tests para Core Domain SDK | `SDK` | Cross | P1 | M | `COMPLETADO` |
| [`GT-185`](./gap-reference-catalog.es.md#gt-185) | Corregir stubs de herramientas MCP | `MCP Services` | Cross | P1 | M | `COMPLETADO` |
| [`GT-184`](./gap-reference-catalog.es.md#gt-184) | Eliminar `@ts-nocheck` de 19 archivos | `CLI` | Cross | P1 | M | `COMPLETADO` |
| [`GT-210`](./gap-reference-catalog.es.md#gt-210) | Completar Fase SDLC 05 (fase faltante) | `SDLC` | Cross | P1 | M | `COMPLETADO` |
| [`GT-179`](./gap-reference-catalog.es.md#gt-179) | Agregar tests para 5 comandos CLI baja cobertura | `CLI` | Cross | P1 | L | `COMPLETADO` |
| [`GT-46`](./gap-reference-catalog.es.md#gt-46) | Límite de ownership del servicio HTTP de Core | `CLI` | F2 | P1 | M | `COMPLETADO` |
| [`GT-45`](./gap-reference-catalog.es.md#gt-45) | Suite de conformidad de transporte y tools MCP | `CLI` | F2 | P1 | M | `COMPLETADO` |
| [`GT-17`](./gap-reference-catalog.es.md#gt-17) | Consolidación DI y boundaries estrictos | `CLI` | F5 | P1 | M | `COMPLETADO` |
| [`GT-13`](./gap-reference-catalog.es.md#gt-13) | Ejecutor de propuestas `evolith-phase-advance` | `CLI` | F4 | P1 | M | `COMPLETADO` |
| [`GT-11`](./gap-reference-catalog.es.md#gt-11) | Validación de observabilidad y rollback en Fase 5 | `CLI` | F3 | P1 | M | `COMPLETADO` |
| [`GT-10`](./gap-reference-catalog.es.md#gt-10) | Validación de contenido del security scan en Fase 4 | `CLI` | F3 | P1 | M | `COMPLETADO` |
| [`GT-05`](./gap-reference-catalog.es.md#gt-05) | Transporte Streamable HTTP del SDK MCP | `CLI` | F2 | P1 | M | `COMPLETADO` |
| [`GT-98`](./gap-reference-catalog.es.md#gt-98) | Sistema de extensiones/plugins del CLI | `CLI` | Transversal | P1 | L | `COMPLETADO` |
| [`GT-57`](./gap-reference-catalog.es.md#gt-57) | Implementación incompleta de herramientas y validación MCP | `CLI` | F2 | P1 | L | `COMPLETADO` |
| [`GT-19`](./gap-reference-catalog.es.md#gt-19) | Migración hexagonal incremental de `core/` | `CLI` | Transversal | P1 | L | `COMPLETADO` |
| [`GT-106`](./gap-reference-catalog.es.md#gt-106) | Alias de comandos del CLI | `CLI` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-108`](./gap-reference-catalog.es.md#gt-108) | Fixtures/datos de prueba del CLI | `CLI` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-109`](./gap-reference-catalog.es.md#gt-109) | Integración de shell del CLI | `CLI` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-103`](./gap-reference-catalog.es.md#gt-103) | Profundidad de subcomandos del CLI | `CLI` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-105`](./gap-reference-catalog.es.md#gt-105) | Imagen Docker del CLI | `CLI` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-52`](./gap-reference-catalog.es.md#gt-52) | Eliminar los stubs muertos del contenedor de inyección de dependencias | `CLI` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-82`](./gap-reference-catalog.es.md#gt-82) | Revivir o eliminar el spec muerto de gate-status | `CLI` | Transversal | P2 | S | `COMPLETADO` |
| [`GT-50`](./gap-reference-catalog.es.md#gt-50) | Aplicar umbrales de cobertura en la configuración de Jest | `CLI` | F0 | P2 | S | `COMPLETADO` |
| [`GT-03`](./gap-reference-catalog.es.md#gt-03) | `EvaluateGateUseCase` y comando `gate evaluate` | `Core Domain` | F1 | P0 | M | `COMPLETADO` |
| [`GT-02`](./gap-reference-catalog.es.md#gt-02) | `GateEvidence` modelado en la capa de dominio | `Core Domain` | F1 | P0 | M | `COMPLETADO` |
| [`GT-72`](./gap-reference-catalog.es.md#gt-72) | Eliminar @ts-nocheck de la capa de aplicación | `Core Domain` | Transversal | P0 | L | `COMPLETADO` |
| [`GT-29`](./gap-reference-catalog.es.md#gt-29) | Paridad de ejecución de reglas Native/OPA | `Core Domain` | F1 | P0 | L | `COMPLETADO` |
| [`GT-113`](./gap-reference-catalog.es.md#gt-113) | Purificación de Clean Architecture en core-domain | `Core Domain` | Transversal | P1 | M | `COMPLETADO` |
| [`GT-04`](./gap-reference-catalog.es.md#gt-04) | Eliminar service locator del dominio | `Core Domain` | F1 | P1 | S | `COMPLETADO` |
| [`GT-58`](./gap-reference-catalog.es.md#gt-58) | Limpiar stubs TODO inyectados por Hexagonal Scaffolder | `Core Domain` | Transversal | P2 | S | `COMPLETADO` |
| [`MT-A07`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Definir el modelo topológico dimensional | `Architecture` | Transversal | P0 | M | `COMPLETADO` |
| [`MT-A08`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Preservar F1/F2/F3 como modelo de compatibilidad `progressive-axis` | `Architecture` | Transversal | P0 | M | `COMPLETADO` |
| [`MT-A11`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Crear el perfil topológico modular-monolith | `Architecture` | Transversal | P1 | M | `COMPLETADO` |
| [`MT-A12`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Crear el perfil topológico distributed-modules | `Architecture` | Transversal | P1 | M | `COMPLETADO` |
| [`MT-A13`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Crear el perfil topológico microservices | `Architecture` | Transversal | P1 | M | `COMPLETADO` |
| [`MT-A14`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Crear perfiles draft para serverless y edge computing | `Architecture` | Transversal | P1 | M | `COMPLETADO` |
| [`MT-A15`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Crear perfiles draft para event-driven y data mesh | `Architecture` | Transversal | P1 | M | `COMPLETADO` |
| [`MT-A16`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Crear perfil draft para agentic AI | `Architecture` | Transversal | P1 | M | `COMPLETADO` |
| [`GT-75`](./gap-reference-catalog.es.md#gt-75) | Paquete @evolith/infra-providers compartido | `Cross` | Transversal | P2 | M | `COMPLETADO` |
| [`GT-54`](./gap-reference-catalog.es.md#gt-54) | Completar la aplicación estricta de fronteras hexagonales | `Cross` | Transversal | P2 | L | `COMPLETADO` |
| [`GT-27`](./gap-reference-catalog.es.md#gt-27) | Consistencia semántica del tracking canónico | `Governance` | Transversal | P0 | S | `COMPLETADO` |
| [`GT-01`](./gap-reference-catalog.es.md#gt-01) | ADR de contrato unificado | `Governance` | F0 | P0 | S | `COMPLETADO` |
| [`MT-A01`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Ratificar el ADR del Corpus de Referencia Multi-Topología | `Governance` | Transversal | P0 | S | `COMPLETADO` |
| [`MT-A02`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Congelar la decisión de taxonomía raíz: no `/topologies/` raíz sin ADR reemplazante | `Governance` | Transversal | P0 | S | `COMPLETADO` |
| [`MT-A06`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Agregar validación de manifiestos a gates documentales y de rulesets | `Harness` | Transversal | P0 | M | `COMPLETADO` |
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
| [`GT-175`](./gap-reference-catalog.es.md#gt-175) | Corregir duplicado ADR-0076 (renumerar bundle OPA al siguiente Core ID libre) | `Docs` | Cross | P1 | S | `COMPLETADO` |
| [`GT-176`](./gap-reference-catalog.es.md#gt-176) | Eliminar subdir duplicado `patterns/es/` (violación Patrón A/B) | `Docs` | Cross | P1 | S | `COMPLETADO` |
| [`GT-177`](./gap-reference-catalog.es.md#gt-177) | Completar `core/README.md` con todos los ADRs Core faltantes | `Docs` | Cross | P1 | S | `COMPLETADO` |
| [`GT-16`](./gap-reference-catalog.es.md#gt-16) | Consolidación documental | `Governance` | F5 | P2 | S | `COMPLETADO` |
| [`GT-24`](./gap-reference-catalog.es.md#gt-24) | Ejecutar migraciones documentales declaradas | `Governance` | Transversal | P2 | M | `COMPLETADO` |
| [`GT-21`](./gap-reference-catalog.es.md#gt-21) | Revisión de ubicación de ADRs Core tool-céntricos | `Governance` | Transversal | P2 | M | `COMPLETADO` |
| [`GT-36`](./gap-reference-catalog.es.md#gt-36) | Cobertura lingüística de reglas machine-readable | `Governance` | Transversal | P2 | L | `COMPLETADO` |
| [`GT-25`](./gap-reference-catalog.es.md#gt-25) | Primeros perfiles de proveedor | `Governance` | Transversal | P2 | L | `COMPLETADO` |
| [`GT-23`](./gap-reference-catalog.es.md#gt-23) | Backfill de traducciones españolas | `Governance` | Transversal | P2 | L | `COMPLETADO` |
| [`GT-110`](./gap-reference-catalog.es.md#gt-110) | Migrar el ingress del abandonado Kong OSS a Traefik/NGINX | `Platform` | Transversal | P0 | L | `COMPLETADO` |
| [`GT-112`](./gap-reference-catalog.es.md#gt-112) | Reemplazar los binarios comerciales de HashiCorp con OpenTofu + OpenBao | `Platform` | Transversal | P0 | L | `COMPLETADO` |
| [`GT-111`](./gap-reference-catalog.es.md#gt-111) | Planificar el giro comercial de MassTransit v9 (quedarse en v8 OSS o migrar a Rebus) | `Platform` | Transversal | P1 | L | `COMPLETADO` |
| [`MT-A04`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Autorizar `rulesets/topologies/` como la ubicación canónica de reglas de topología ejecutables | `Rulesets` | Transversal | P0 | S | `COMPLETADO` |
| [`MT-A10`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Crear Rulesets Topologies Hub en inglés y español | `Rulesets` | Transversal | P1 | S | `COMPLETADO` |
| [`GT-162`](./gap-reference-catalog.es.md#gt-162) | Tests unitarios del agregador `main.rego` y paridad post GT-149 | `Rulesets` | Cross | P1 | M | `COMPLETADO` |
| [`GT-163`](./gap-reference-catalog.es.md#gt-163) | Validación CI de artefactos referenciados por el manifest de topología | `Rulesets` | Cross | P1 | M | `COMPLETADO` |
| [`MT-A05`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Crear `topology-manifest.schema.json` | `Schema` | Transversal | P0 | M | `COMPLETADO` |
| [`GT-161`](./gap-reference-catalog.es.md#gt-161) | Esquemas JSON formales para los inputs de las políticas OPA core | `Schema` | Cross | P1 | M | `COMPLETADO` |
| [`MT-A03`](./multi-topology-reference-corpus-implementation-plan.es.md#6-autoridad-de-tracking) | Autorizar `reference/architecture/topologies/` como corpus topológico canónico legible por humanos | `Taxonomy` | Transversal | P0 | S | `COMPLETADO` |
| [`GT-125`](./gap-reference-catalog.es.md#gt-125) | Maturation of Agentic AI Topology — paridad de madurez con monolito modular | `Architecture` | Transversal | P1 | L | `COMPLETADO` |
| [`GT-126`](./gap-reference-catalog.es.md#gt-126) | Maturation of Serverless Topology | `Architecture` | Transversal | P2 | M | `COMPLETADO` |
| [`GT-127`](./gap-reference-catalog.es.md#gt-127) | Maturation of Event-Driven Topology | `Architecture` | Transversal | P2 | M | `COMPLETADO` |
| [`GT-128`](./gap-reference-catalog.es.md#gt-128) | Baseline Ruleset for Data Mesh | `Architecture` | Transversal | P2 | M | `COMPLETADO` |
| [`GT-129`](./gap-reference-catalog.es.md#gt-129) | Baseline Ruleset for Edge Computing | `Architecture` | Transversal | P2 | M | `COMPLETADO` |
| [`GT-156`](./gap-reference-catalog.es.md#gt-156) | Hub de producto, referencia API y runbook de despliegue del Core API | `Product` | Cross | P0 | L | `COMPLETADO` |
| [`GT-170`](./gap-reference-catalog.es.md#gt-170) | Hub de producto de UMS reference | `Product` | Cross | P1 | M | `COMPLETADO` |
| [`GT-157`](./gap-reference-catalog.es.md#gt-157) | Paridad de autenticación y autorización MCP with REST | `MCP Services` | Cross | P1 | M | `COMPLETADO` |
| [`GT-158`](./gap-reference-catalog.es.md#gt-158) | Human-in-the-loop y ABAC para herramientas MCP mutativas | `MCP Services` | Cross | P1 | M | `COMPLETADO` |
| [`GT-160`](./gap-reference-catalog.es.md#gt-160) | Propagación de correlation-ID y contexto de solicitud entre superficies | `Cross` | Cross | P1 | M | `COMPLETADO` |
| [`GT-174`](./gap-reference-catalog.es.md#gt-174) | `meta.schemaVersion` y matriz de compatibilidad productor/consumidor | `Cross` | Cross | P2 | S | `COMPLETADO` |

**Progreso:** 209 / 214 completados · 0 en progreso · 5 pendientes · 0 diferidos

**Oleada 2026-06-21 (auditoría profunda de Wilson):** Añadidos 20 gaps nuevos `GT-155`…`GT-174` que cubren conformidad de envelope en Core API REST, paridad de superficies command-as-a-service, autenticación/autorización MCP, esquemas y tests de OPA, validación CI de manifests de topología, runbooks y plantillas SDLC, hubs de producto de Core API y UMS, presupuestos operativos de Agentic AI, paridad OpenTelemetry y versionado del envelope.

**Oleada 2026-06-22 (integración backlog NXT):** Añadidos 34 gaps nuevos `GT-175`…`GT-208` del Deep Coherence Analysis que cubren calidad de código CLI, completitud de documentación, cobertura de pruebas, READMEs de infraestructura y estandarización ADR.

**Ordenamiento:** una sola tabla, ordenada por estado (pendientes, luego diferidos, luego completados), luego criticidad (`P0` → `P1` → `P2`) y luego complejidad (`S` → `M` → `L`); los completados se agrupan por componente. Los IDs `GT-*` enlazan al [Catálogo de Referencia de Gaps](./gap-reference-catalog.es.md); los IDs `MT-A*` enlazan al [plan de implementación Multi-Topology](./multi-topology-reference-corpus-implementation-plan.es.md).

---
[Volver al Índice de Visión](./README.es.md)
