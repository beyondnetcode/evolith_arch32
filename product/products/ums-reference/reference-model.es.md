# UMS — Modelo de Referencia

> **Navegación bilingüe:** [English Version](./reference-model.md)
> **Padre:** [UMS Reference Hub](./README.es.md)

Cómo Evolith trata a UMS como modelo de referencia aplicado oficial, y qué elementos arquitectónicos son elegibles para herencia hacia el Core. Para la narrativa original (historia, deprecación del sandbox To-Do), ver [`ums-reference-model.es.md`](../../research/demo/ums-reference-model.es.md).

---

## 1. La Frontera

| Vive en este corpus | Vive en UMS |
|---|---|
| Principios universales de arquitectura | Código de producto, esquemas, despliegue |
| ADRs y rulesets Core | ADRs de producto y ADRs locales del producto |
| Reglas multi-topología | Realización concreta de topología (`modular-monolith`, madurez F1) |
| Gobernanza SDLC | Backlog del producto y operación de releases |
| Quality gates y umbrales | Métricas observadas, resultados de escaneo, release notes |

UMS es *evidencia*. La autoridad permanece aquí.

---

## 2. Qué Puede Heredarse

UMS es consumido por este corpus mediante cuatro mecanismos bien acotados:

1. **ADRs candidatos** descubiertos en un producto en operación y promovidos solo tras revisión del Architecture Board.
2. **Patrones canónicos específicos del runtime** cuyo alcance está claramente identificado como solo runtime.
3. **Prácticas de trazabilidad** que vinculan capacidad de negocio → decisión → patrón de código → operación.
4. **Señales concretas de extracción** desde un producto modular con fronteras de seguridad significativas.

Nada fuera de estos cuatro puede entrar al Core solo porque UMS lo use. Las selecciones de runtime en UMS — SQL Server, Redis, .NET 8 — no son normativas para el corpus salvo que un artefacto Evolith aceptado las promueva explícitamente.

---

## 3. Preocupaciones Arquitectónicas Validadas por UMS

| Preocupación | Evidencia en UMS |
|---|---|
| Bounded contexts y alcance del producto | 8 contextos (EP-01..EP-08): Identity, Authorization, Configuration, Audit, Console/Admin, Approvals, Compliance, IGA |
| Arquitectura limpia / hexagonal | Separación Dominio ↔ Aplicación ↔ Infraestructura en cada contexto |
| Frontera de consultas y comandos | Consultas GraphQL + comandos REST (CQRS a nivel de protocolo) |
| Seguridad y rendición de cuentas | Grafo de autorización, auditoría inmutable, RLS, idempotencia |
| Adopción progresiva | Monolito Modular ahora → extraer a microservicios cuando se cumplan criterios |
| Realismo de entrega | API / web ejecutables, guía de setup, pruebas, artefactos operativos |

---

## 4. Flujo de Promoción

Cuando un patrón de UMS se considera para el Core:

1. **Sponsor** registra un Adoption Case en [adoption-cases.es.md](../../research/adoption-cases.es.md).
2. **Architecture Board** revisa contra criterios de universalidad y neutralidad de runtime.
3. Si se acepta → se redacta un ADR Evolith; la fuente se referencia como evidencia, no como autoridad.
4. Cuando el ADR queda `Accepted`, el patrón entra al Core.
5. UMS upstream sigue libre de mantener la implementación específica del runtime.

Ningún artefacto Core puede citar un archivo de UMS como fuente normativa. UMS aparece en ADRs Core solo bajo `Evidence` o `Inspiration`, nunca bajo `Decision`.

---

## 5. Pendientes

- Mantener paridad EN ↔ ES de la guía de setup de UMS upstream; reflejar cualquier desviación como Known Gap aquí.
- Auditar trimestralmente los ADRs Core para asegurar que citan a UMS solo como evidencia, no como autoridad.

---

[Volver al UMS Reference Hub](./README.es.md)
