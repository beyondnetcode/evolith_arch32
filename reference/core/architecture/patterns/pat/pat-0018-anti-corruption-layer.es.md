# PAT-0018: Capa Anticorrupción

> **Navegación bilingüe:** [English](./pat-0018-anti-corruption-layer.md)

**Tipo:** Patrón Arquitectónico Canónico — agnóstico de runtime  
**Clase:** Patrón  
**Categoría:** Integración  
**Estado:** Accepted  
**También conocido como:** ACL, Translation Layer  

---

## Problema

El modelo de un sistema externo, admitido sin cambios, se convierte en el modelo interno. Sus identificadores, su opcionalidad y sus inconsistencias se esparcen por el dominio, y el dominio ya no puede evolucionar con independencia de un sistema que aquí nadie controla.

## Fuerzas

- La traducción es trabajo duplicado cuyo valor solo se ve cuando el sistema externo cambia.
- Rechazar datos no conformes genera carga operativa que la normalización silenciosa habría ocultado.
- La capa debe versionarse al mismo ritmo que los esquemas internos que protege.

## Solución (norma)

Todos los datos externos se validan contra los esquemas internos antes de entrar al modelo de gobernanza, y los datos no validados se rechazan. Los datos no conformes se rechazan en vez de normalizarse: la transformación silenciosa para que los datos externos encajen está prohibida. Toda transformación preserva la trazabilidad a la entidad externa de origen, y la capa vive en la capa de infraestructura/adaptadores, nunca en entidades de dominio ni en servicios de aplicación.

## Aplicabilidad por topología

| Topología | Aplicabilidad | Guía |
|---|---|---|
| Monolito Modular | Obligatorio | Aplica en cada punto de ingesta; el código ACL vive en la capa de infraestructura del módulo, detrás de un puerto. Enforzado por ACL-01 a ACL-06. |
| Módulos Distribuidos | Obligatorio | Cada módulo posee la ACL de los sistemas externos con los que se integra. |
| Microservicios | Obligatorio | La ACL es lo que evita que un servicio envoltorio se convierta en un paso directo del modelo del proveedor. |
| IA Agéntica | Obligatorio | El texto recuperado es dato, no política: se validan su procedencia y su esquema antes de que pueda influir en el comportamiento. |
| Data Mesh | Recomendado | Las fuentes externas que alimentan un producto de datos se traducen antes de aplicar el contrato del producto. |

## Enforcement

| Regla | Título | Motor | Ruleset |
|---|---|---|---|
| **ACL-01** | Datos externos validados contra los esquemas del Núcleo | ruleset ACL | `src/rulesets/acl/anti-corruption-layer.rules.json` |
| **ACL-02** | Las transformaciones preservan la trazabilidad al origen | ruleset ACL | `src/rulesets/acl/anti-corruption-layer.rules.json` |
| **ACL-03** | Los datos no conformes se rechazan, no se normalizan | ruleset ACL | `src/rulesets/acl/anti-corruption-layer.rules.json` |
| **ACL-04** | Las implementaciones ACL se versionan con la evolución del Núcleo | ruleset ACL | `src/rulesets/acl/anti-corruption-layer.rules.json` |
| **ACL-05** | La integración usa contratos explícitos y revisados | ruleset ACL | `src/rulesets/acl/anti-corruption-layer.rules.json` |
| **ACL-06** | ACL aislada de la lógica de dominio | ruleset ACL | `src/rulesets/acl/anti-corruption-layer.rules.json` |

## ADRs de gobierno

Ninguno. Ningún ADR del corpus registra una decisión que cubra este patrón; el enforcement existe sin decisión registrada.

## Variantes

Ninguna registrada.

## Relaciones

- **es variante de PAT-0010** — Un adaptador de salida cuya responsabilidad específica es la traducción y el rechazo de modelos.
- **complementa a PAT-0004** — El contrato externo es aquello contra lo que la capa valida.

## Implementaciones

Ninguna todavía. Este patrón aún no tiene implementación canónica por runtime (CP-NN).

## Fuentes

- `src/rulesets/acl/anti-corruption-layer.rules.json` — Enunciados de las reglas ACL-01 a ACL-06. Ninguna guía de patrones en prosa documenta este patrón.
- `reference/core/architecture/topologies/ai/agentic-ai/patterns.md` — Antipatrón 'Retrieved text as policy' y su corrección requerida.

> **Nota:** Seis identificadores de regla enforzan este patrón y ninguna guía de patrones del corpus lo describe. Ningún ADR registra la decisión.

---

**[Volver al catálogo de patrones](../README.es.md)**
