# PAT-0001: Base de Datos por Servicio

> **Navegación bilingüe:** [English](./pat-0001-database-per-service.md)

**Tipo:** Patrón Arquitectónico Canónico — agnóstico de runtime  
**Clase:** Patrón  
**Categoría:** Propiedad de Datos  
**Estado:** Accepted  
**También conocido como:** No Shared Persistence, Service Owns Its Data  

---

## Problema

Los servicios que comparten una base de datos acoplan sus ciclos de release: la migración de esquema de un equipo rompe en tiempo de ejecución el servicio de otro, y la dependencia es invisible a la revisión de contratos porque nunca cruza una API.

## Fuerzas

- La desplegabilidad independiente separa los datos; la comodidad de los joins los junta.
- Leer las tablas de otro servicio siempre es más barato a corto plazo que publicar una interfaz.
- Las copias desnormalizadas cuestan almacenamiento e introducen desactualización, pero son el precio de la propiedad.

## Solución (norma)

Cada servicio posee su almacén de datos en exclusiva. Ningún servicio puede leer ni escribir directamente la base de datos de otro. El acceso a datos entre servicios ocurre a través de APIs publicadas o de eventos.

## Aplicabilidad por topología

| Topología | Aplicabilidad | Guía |
|---|---|---|
| Microservicios | Obligatorio | Cada servicio posee su almacén de datos en exclusiva; sin bases de datos compartidas ni acceso a tablas entre servicios. Enforzado por MS-R06. |
| Módulos Distribuidos | Obligatorio | Ningún módulo consulta la capa de persistencia de otro; el acceso fluye por la interfaz publicada del módulo propietario. Enforzado por DM-R03. |
| Monolito Modular | Recomendado | Se aplica con granularidad de esquema, no de instancia — ver la variante Esquema por Dominio en PAT-0012. |
| Data Mesh | Obligatorio | El almacenamiento de cada producto de datos pertenece a exactamente un dominio; la propiedad nunca se comparte. |

## Enforcement

| Regla | Título | Motor | Ruleset |
|---|---|---|---|
| **MS-R06** | El servicio posee sus datos — Sin persistencia compartida | ruleset de topología | `src/rulesets/topologies/progressive-axis/microservices/microservices.rules.json` |
| **DM-R03** | Aislamiento de datos del módulo enforzado | ruleset de topología | `src/rulesets/topologies/progressive-axis/distributed-modules/distributed-modules.rules.json` |

## ADRs de gobierno

| ADR | Título registrado | Verificación | Nota |
|---|---|---|---|
| [ADR-0076](../../adrs/core/0076-domain-oriented-microservice-architecture.es.md) | Domain-Oriented Microservice Architecture (DOMA) (core) | verificado | La guía de patrones de microservicios cita este ADR como 'Propiedad de datos orientada al dominio'; el título registrado es 'Domain-Oriented Microservice Architecture (DOMA)'. La decisión sí cubre la propiedad de datos por dominio, pero la etiqueta del documento citante no es la del propio ADR. |

## Variantes

| Variante | Alcance | Invariante | PAT |
|---|---|---|---|
| Schema-per-Domain | contexto acotado | Un contexto acotado posee su esquema en exclusiva; las claves foráneas entre esquemas de módulos están prohibidas. El mismo invariante — nadie toca la persistencia de otro — aplicado con granularidad de esquema dentro de una única unidad de despliegue. | PAT-0012 |
| Database-per-Service | servicio | Un servicio posee su instancia de base de datos en exclusiva. | PAT-0001 |

## Relaciones

- **complementa a PAT-0004** — Los contratos de API publicados son el reemplazo sancionado del acceso directo a tablas.
- **complementa a PAT-0003** — El outbox es la forma en que un propietario publica sus cambios de datos sin ceder la propiedad.

## Implementaciones

Ninguna todavía. Este patrón aún no tiene implementación canónica por runtime (CP-NN).

## Fuentes

- `reference/core/architecture/topologies/progressive-axis/microservices/patterns.md` — Sección Database per Service.

---

**[Volver al catálogo de patrones](../README.es.md)**
