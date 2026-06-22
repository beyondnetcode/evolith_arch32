# Hub de Producto — UMS Reference

> **Navegación bilingüe:** [English Version](./README.md)

Bienvenido al hub del producto **User Management System (UMS) Reference**. UMS es la referencia aplicada oficial, ejecutable y de nivel empresarial del corpus de arquitectura progresiva de Evolith. A diferencia de Tracker, Smart CLI, MCP Services y Core API — productos *construidos por* este corpus — UMS es un producto de referencia *consumido por* este corpus: un satélite público de código abierto que demuestra cómo un proyecto satélite adopta, extiende y especializa las reglas Core de Evolith.

Este hub otorga a UMS la misma estructura de producto de primer nivel que el resto de entradas bajo `reference/products/`, para que los adoptantes puedan navegarlo sin descender por rutas de knowledge/demo.

---

## 1. Por qué UMS es la referencia aplicada

El sandbox legacy de To-Do fue retirado porque no podía demostrar de forma creíble preocupaciones empresariales — ciclos de vida de identidad, fronteras de autorización, auditoría, protección de datos multi-tenant. UMS aporta un espacio de problema acotado real (identidad y acceso empresarial) operado como satélite independiente.

- **Repositorio:** [github.com/beyondnetcode/ums](https://github.com/beyondnetcode/ums)
- **Master Index:** [UMS Master Index](https://github.com/beyondnetcode/ums/blob/main/docs/MASTER_INDEX.md)
- **Portal de arquitectura:** [UMS Architecture Portal](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md)

La evidencia de UMS la consume este corpus vía ADRs candidatos, extracción de patrones canónicos y prácticas de trazabilidad — nunca como política autoritativa. La frontera entre reglas del corpus y evidencia del producto es explícita (ver [Modelo de Referencia vs Aplicado](../../knowledge/demo/demo-vs-reference.es.md)).

---

## 2. Superficie del producto

| Área | Dónde |
|---|---|
| Visión del producto | [overview.es.md](./overview.es.md) — bounded contexts, stack técnico, tabla de enlaces. |
| Modelo de referencia | [reference-model.es.md](./reference-model.es.md) — qué se hereda de UMS y cómo. |
| Visión técnica (completa) | [Visión Técnica de UMS](../../knowledge/demo/ums-technical-overview.es.md) |
| Referencia vs Aplicado | [demo-vs-reference.es.md](../../knowledge/demo/demo-vs-reference.es.md) |
| Bitácora de migración (To-Do → UMS) | [migration-from-todo-to-ums.es.md](../../knowledge/demo/migration-from-todo-to-ums.es.md) |
| Fuente upstream | [UMS Repository](https://github.com/beyondnetcode/ums) |

---

## 3. Modelo de adopción

UMS implementa un satélite modular-monolítico que adopta, extiende y especializa los rulesets Core de Evolith. Úsalo para estudiar:

- Aislamiento de bounded contexts (Identity, Access, IGA, Audit, Compliance, Approvals, Configuration).
- Arquitectura limpia / hexagonal sobre .NET 8 + EF Core + SQL Server.
- Separación de protocolos: comandos REST + consultas GraphQL.
- Observabilidad productiva con propagación de contexto OpenTelemetry.
- RLS multi-tenant combinada con auditoría temporal.

Los detalles de adopción de UMS viven en [casos de adopción](../../knowledge/adoption-cases.es.md). Las decisiones promovidas desde UMS hacia el Core de Evolith se registran como ADRs y nunca al revés.

---

## 4. Frontera

UMS es *evidencia*, no política:

- Las reglas universales viven en `reference/` (este corpus).
- La evidencia, el código y las selecciones de runtime viven en el repositorio de UMS.
- Las selecciones de runtime (SQL Server, Redis, .NET 8) no son normativas salvo que un artefacto Evolith aceptado las promueva.

---

## 5. Ejemplos SDLC con UMS

Cada plantilla del SDLC publica un ejemplo basado en UMS, para que los adoptantes comparen un recorrido real con la plantilla canónica:

- [Ejemplo de PRD — UMS](../../governance/sdlc/04-artifact-templates/examples/prd-example-ums.es.md)
- [Ejemplo de ADR — UMS](../../governance/sdlc/04-artifact-templates/examples/adr-example-ums.es.md)
- [Functional Story — UMS](../../governance/sdlc/04-artifact-templates/examples/functional-story-example-ums.es.md)
- [Test Summary — UMS](../../governance/sdlc/04-artifact-templates/examples/test-summary-report-example-ums.es.md)
- [Release Notes — UMS](../../governance/sdlc/04-artifact-templates/examples/release-notes-example-ums.es.md)
- [Executive Scorecard — UMS](../../governance/sdlc/04-artifact-templates/examples/executive-scorecard-example-ums.es.md)

---

[Volver al Índice de Productos](../README.es.md)
