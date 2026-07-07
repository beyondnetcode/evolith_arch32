# UMS — Visión del Producto

> **Navegación bilingüe:** [English Version](./overview.md)
> **Padre:** [UMS Reference Hub](./README.es.md)

Vista condensada del hub de producto de UMS. Para la inmersión arquitectónica completa (diagramas de visión, matrices de capacidades, trazabilidad), abre el documento fuente en [`ums-technical-overview.es.md`](../../research/demo/ums-technical-overview.es.md).

> **Nota de fuente:** UMS es un repositorio satélite externo, no un submódulo de este corpus. Los datos de stack, protocolo y bounded contexts a continuación provienen de la [Visión Técnica de UMS](../../research/demo/ums-technical-overview.es.md) canónica y no están verificados contra el código fuente vivo de UMS desde este repo. Para instrucciones de setup y ejecución autoritativas y actuales, sigue siempre el [repositorio upstream](https://github.com/beyondnetcode/ums).

---

## 1. Qué es UMS

UMS es un User Management System empresarial de código abierto, operado como satélite independiente de Evolith. Aborda los problemas más duros de autorización e identidad — aislamiento multi-tenant, grafos jerárquicos de permisos, gobernanza de identidades (IGA), auditoría inmutable y flujos de aprobación — en un único monolito modular.

| Dimensión | Valor |
|---|---|
| Tipo | Producto de referencia (satélite — no producido por este corpus) |
| Topología | `modular-monolith` (nivel de madurez F1 en el eje progresivo) |
| Estado | Referencia activa |
| Upstream | [github.com/beyondnetcode/ums](https://github.com/beyondnetcode/ums) |
| Owner | Architecture Board de Evolith (owner de la referencia) · Equipo UMS (owner del producto) |

---

## 2. Bounded Contexts

UMS aísla las responsabilidades en bounded contexts claramente delimitados. Cada contexto posee su esquema, repositorios y casos de uso:

UMS se descompone en exactamente 8 bounded contexts (EP-01..EP-08), según la [Visión Técnica de UMS](../../research/demo/ums-technical-overview.es.md#3-los-8-bounded-contexts) canónica. Multi-tenancy no es un contexto separado; es una preocupación transversal materializada como RLS de dos capas en cada contexto.

| Contexto | Responsabilidad |
|---|---|
| Identity (EP-01) | Ciclo de vida de usuario y tenant, autenticación, MFA/passwordless, jerarquía organizacional. |
| Authorization (EP-02) | Plantillas RBAC/ABAC, compilación del grafo de permisos, proyecciones contextuales. |
| Configuration (EP-03) | Config jerárquica (ENV > SYSTEM > TENANT), resolución cacheada con TTL, proyección CQRS. |
| Audit (EP-04) | Bitácora append-only inmutable, esquema estándar de 10 columnas, tablas temporales. |
| Console / Admin (EP-05) | UI administrativa, gestión de tenants, registro de topología del sistema. |
| Approvals (EP-06) | Scoring de riesgo MFA adaptativo, acceso externo B2B, sagas de administración delegada. |
| Compliance (EP-07) | Expiración de documentos, enforcement de acceso, controles regulatorios y reporte. |
| IGA (EP-08) | Role Maturity Model (5 niveles), ciclo de promoción, Promotion Impact Analysis. |

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
| Aislamiento de bounded contexts con schema-per-context | Permite que la topología `modular-monolith` (F1) promueva limpiamente hacia `microservices` (F3) cuando se cumplan los criterios. |
| Autorización inspirada en XACML PEP/PDP/PAP/PIP (ADR-0039) | Desacopla política del runtime; auditable; testeable. |
| Grafo de permisos compilado en tiempo de resolución (TE-02) | Evaluación de alto rendimiento sin dispersar la lógica. |
| RLS de dos capas (app + DB) | Aislamiento de tenants demostrable bajo carga. |
| Bitácora append-only con esquema de 10 columnas | Trazabilidad de nivel regulatorio. |
| Middleware de idempotencia (memoria o distribuido) | Comandos REST seguros bajo reintentos. |
| Envelope OpenTelemetry en cada adaptador | Observabilidad productiva con bajo ruido. |

---

## 5. Enlaces por Rol

| Si eres… | Empieza por |
|---|---|
| Arquitecto onboarding a Evolith | [`ums-reference-model.es.md`](../../research/demo/ums-reference-model.es.md) → esta visión → [Architecture Portal](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) upstream |
| Ingeniero adoptando un patrón Evolith | Esta visión → sección de bounded contexts en [`ums-technical-overview.es.md`](../../research/demo/ums-technical-overview.es.md) → fuente upstream |
| Product Owner comparando capacidades | Esta visión → [`reference-model.es.md`](./reference-model.es.md) para el mapa de herencia |
| Auditor verificando fronteras | [`demo-vs-reference.es.md`](../../research/demo/demo-vs-reference.es.md) → Architecture Portal upstream |

---

## 6. Ejecutar UMS (Upstream)

UMS se construye y opera desde su propio repositorio; este corpus no publica su código fuente, su entorno ni sus scripts de ejecución. Usa los puntos de entrada upstream a continuación — son la superficie autoritativa de install/prerequisitos/ejecución.

| Necesidad | Punto de entrada upstream |
|---|---|
| Prerequisitos y stack (.NET 8 SDK, SQL Server 2022, Redis) | [UMS README](https://github.com/beyondnetcode/ums/blob/main/README.md) |
| Setup local y cómo ejecutar la app | [UMS README](https://github.com/beyondnetcode/ums/blob/main/README.md) |
| Stack Docker Compose, colector OTel, Grafana | [UMS Infrastructure Setup](https://github.com/beyondnetcode/ums/blob/main/README.md) |
| Mapa de navegación completo | [UMS Master Index](https://github.com/beyondnetcode/ums/blob/main/docs/MASTER_INDEX.md) |

Para promover patrones descubiertos en UMS hacia este corpus, ver el [Modelo de Referencia — Flujo de Promoción](./reference-model.es.md#4-flujo-de-promoción). Para contribuir al corpus en sí, ver el [CONTRIBUTING.md](../../../CONTRIBUTING.md) en la raíz del repo.

---

[Volver al UMS Reference Hub](./README.es.md)
