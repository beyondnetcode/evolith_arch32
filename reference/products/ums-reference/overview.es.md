# UMS — Visión del Producto

> **Navegación bilingüe:** [English Version](./overview.md)
> **Padre:** [UMS Reference Hub](./README.es.md)

Vista condensada del hub de producto de UMS. Para la inmersión arquitectónica completa (diagramas de visión, matrices de capacidades, trazabilidad), abre el documento fuente en [`ums-technical-overview.es.md`](../../knowledge/demo/ums-technical-overview.es.md).

---

## 1. Qué es UMS

UMS es un User Management System empresarial de código abierto, operado como satélite independiente de Evolith. Aborda los problemas más duros de autorización e identidad — aislamiento multi-tenant, grafos jerárquicos de permisos, gobernanza de identidades (IGA), auditoría inmutable y flujos de aprobación — en un único monolito modular.

| Dimensión | Valor |
|---|---|
| Tipo | Producto de referencia (satélite — no producido por este corpus) |
| Fase | Monolito Modular (Fase 1 de Evolith) |
| Estado | Referencia activa |
| Upstream | [github.com/beyondnetcode/ums](https://github.com/beyondnetcode/ums) |
| Owner | Architecture Board de Evolith (owner de la referencia) · Equipo UMS (owner del producto) |

---

## 2. Bounded Contexts

UMS aísla las responsabilidades en bounded contexts claramente delimitados. Cada contexto posee su esquema, repositorios y casos de uso:

| Contexto | Responsabilidad |
|---|---|
| Identity (EP-01) | Ciclo de vida de usuario y tenant, jerarquía organizacional. |
| Access (EP-02) | Grafo de autorización, XACML PEP/PDP/PAP/PIP, plantillas contextuales. |
| Audit (EP-04) | Bitácora append-only inmutable, esquema estándar de 10 columnas, tablas temporales. |
| Multi-tenancy (EP-03) | RLS de dos capas — `(id, root_tenant_id)` en cada tabla. |
| Approvals (EP-05) | Flujos de aprobación de acceso por saga y ciclo de vida del ticket. |
| Compliance (EP-06) | Controles regulatorios y ganchos de reporte. |
| Configuration (EP-07) | Configuración por tenant y feature flags. |
| IGA (EP-08) | Role Maturity Model (5 niveles), ciclo de promoción. |

---

## 3. Stack Técnico

- **Backend:** .NET 8 (C#), monolito modular, arquitectura hexagonal.
- **Protocolos de API:** comandos REST + consultas GraphQL (CQRS a nivel de protocolo).
- **Frontend:** React (TypeScript).
- **Persistencia:** EF Core + SQL Server (tablas temporales para auditoría; RLS para tenancy).
- **Caché / idempotencia:** Redis + IMemoryCache.
- **Observabilidad:** propagación de contexto OpenTelemetry (W3C `TraceParent` + correlation IDs).

---

## 4. Patrones para Heredar

| Patrón | Por qué importa |
|---|---|
| Aislamiento de bounded contexts con schema-per-context | Permite que el monolito Fase 1 promueva limpiamente a microservicios Fase 2. |
| Autorización XACML PEP/PDP/PAP/PIP | Desacopla política del runtime; auditable; testeable. |
| Grafo de permisos compilado en tiempo de resolución (TE-02) | Evaluación de alto rendimiento sin dispersar la lógica. |
| RLS de dos capas (app + DB) | Aislamiento de tenants demostrable bajo carga. |
| Bitácora append-only con esquema de 10 columnas | Trazabilidad de nivel regulatorio. |
| Middleware de idempotencia (memoria o distribuido) | Comandos REST seguros bajo reintentos. |
| Envelope OpenTelemetry en cada adaptador | Observabilidad productiva con bajo ruido. |

---

## 5. Enlaces por Rol

| Si eres… | Empieza por |
|---|---|
| Arquitecto onboarding a Evolith | [`ums-reference-model.es.md`](../../knowledge/demo/ums-reference-model.es.md) → esta visión → [Architecture Portal](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) upstream |
| Ingeniero adoptando un patrón Evolith | Esta visión → sección de bounded contexts en [`ums-technical-overview.es.md`](../../knowledge/demo/ums-technical-overview.es.md) → fuente upstream |
| Product Owner comparando capacidades | Esta visión → [`reference-model.es.md`](./reference-model.es.md) para el mapa de herencia |
| Auditor verificando fronteras | [`demo-vs-reference.es.md`](../../knowledge/demo/demo-vs-reference.es.md) → Architecture Portal upstream |

---

[Volver al UMS Reference Hub](./README.es.md)
