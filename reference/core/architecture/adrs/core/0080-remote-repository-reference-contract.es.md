# ADR-0080: Contrato de Referencia de Repositorio Remoto

> **Navegación Bilingüe:** [English Version](./0080-remote-repository-reference-contract.md)

## Estado

Accepted — Evolith Architecture Board, 2026-06-19.

## Fecha

2026-06-19

## Contexto y Problema

Actualmente el Core API recibe rutas de filesystem para evaluar satélites y ejecutar comandos de proyecto. Esto solo funciona cuando el llamador y el API comparten el filesystem del host. Un Core API hospedado consumido por Evolith Tracker no puede confiar en una ruta proporcionada por el cliente ni recibir credenciales de repositorio en una petición API.

## Objetivo y Alcance

**Objetivo:** proporcionar un contrato remoto neutral respecto al proveedor que permita al Core API hospedado adquirir un snapshot acotado para operaciones de gobernanza.

**Dentro del alcance:** identidad del repositorio, selección de revisión inmutable, referencias de credenciales, workspaces efímeros, datos de auditoría y aislamiento de tenant.

**Fuera del alcance:** selección de proveedor Git, implementación del vault de credenciales, almacenamiento duradero de código fuente e implementación del BFF de Tracker.

## Opciones Consideradas

1. **Ruta de filesystem proporcionada por el llamador.** Rechazada: no es portable ni segura entre tenants.
2. **Subir un archivo en cada comando.** Rechazada: duplica árboles de código grandes, debilita la trazabilidad de revisión y complica el escaneo de secretos.
3. **Referencia de repositorio con checkout efímero del lado servidor.** Seleccionada: mantiene las credenciales en el servidor, conserva procedencia de revisión Git y permite un adapter de proveedor posterior.

## Decisión y Fundamentación

Los comandos que requieren contenido de un satélite deben aceptar un `repositoryRef`, no `satellitePath` ni `corePath`:

```json
{
  "repository": { "url": "https://scm.example/org/product.git", "revision": "immutable-commit-sha" },
  "workspaceRef": "tracker-issued-opaque-reference",
  "operationId": "uuid"
}
```

El BFF de Evolith Tracker valida el Bearer token y el grafo de autorización de UMS, autoriza el acceso al repositorio, resuelve credenciales y crea el workspace efímero de solo lectura. Luego invoca Core con los metadatos inmutables del repositorio y `workspaceRef` opaco. Core ejecuta el caso de uso de gobernanza sin recibir token de usuario, credencial, identidad de tenant ni ruta absoluta de workspace.

El scope de tenant en la capa de aplicación del BFF de Tracker es primario. Namespacing de workspaces, aislamiento de proceso, montajes de solo lectura, limpieza y controles de retención son un failsafe secundario. Core sigue siendo reutilizable por cualquier consumidor open source y no implementa un subsistema de autenticación.

## Evidencia y Criterios de Evaluación

El modelo seleccionado se evalúa por: ausencia de dependencia del filesystem del llamador; entrada inmutable y reproducible; credenciales y tokens UMS que nunca cruzan hacia Core; autorización en la frontera BFF; limpieza determinista; y adapters reemplazables de SCM y vault.

## Consecuencias, Riesgos y Trade-offs

**Positivo:** habilita consumo hospedado; las evaluaciones son reproducibles; los proveedores SCM y de secretos siguen siendo reemplazables.

**Riesgos:** latencia de checkout, caídas del proveedor y contenido malicioso del repositorio. Mitigar mediante checkouts superficiales y fijados, límites de tiempo/recursos, restricciones de red, escaneo de malware/secretos cuando corresponda y eventos de auditoría para adquisición y limpieza.

**Trade-off:** los comandos remotos son más costosos operacionalmente que las rutas locales. El BFF de Tracker posee esta integración de producto; Core sigue siendo un estándar y motor abierto sin dependencias de CLI, MCP o autenticación.

## Referencias

- [ADR-0010: Estrategia de Arquitectura Multi-Tenancy](./0010-multi-tenancy-architecture-strategy.es.md)
- [ADR-0016: Audit Trail Inmutable](./0016-immutable-business-audit-trail.es.md)
- [ADR-0074: Capa de Exposición Nativa de Evolith Core API](./0074-evolith-core-api-exposure-layer.es.md)
- [GT-118](../../../control-center/gaps/gap-reference-catalog.es.md#gt-118)

## Decisiones y Estándares Relacionados

- [Guías de API Gateway](../../../foundations/common-rules/gateway-guidelines.es.md)
- [Estándar de Autoría ADR](../adr-authoring-standard.es.md)

---
[Volver al Registro ADR](../README.es.md)

> **Agent Signature:** Architect Agent
