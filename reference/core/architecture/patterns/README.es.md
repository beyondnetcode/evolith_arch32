# Patrones Canónicos

> **Navegación bilingüe:** [English](./README.md)

Este catálogo tiene dos niveles. Los **Patrones Arquitectónicos Canónicos (PAT-NNNN)** enuncian normas agnósticas de runtime: el problema, las fuerzas, el invariante, dónde aplica por topología y — lo esencial — qué identificadores de regla existentes ya lo enforzan. Los **Patrones Canónicos (CP-NN)** son implementaciones de referencia específicas por runtime, listas para copiar, de esas normas.

---

## Dos niveles: PAT y CP

| | PAT-NNNN | CP-NN |
|---|---|---|
| Alcance | Norma arquitectónica agnóstica de runtime | Implementación de referencia para un runtime |
| Responde | *¿Qué invariante debe sostenerse y qué lo enforza?* | *¿Cómo se ve eso en este lenguaje?* |
| Cardinalidad | Un PAT tiene 0..N implementaciones | Un CP implementa como máximo un PAT |
| Forma legible por máquina | `pat/pat-NNNN-*.json`, validado por `src/rulesets/schema/pattern.schema.json` | ninguna |

Los tutoriales de implementación se excluyen deliberadamente de la norma PAT y se referencian aparte, para que el catálogo no herede código de ejemplo sin revisar.

## Patrones Arquitectónicos Canónicos (PAT)

| PAT | Nombre | Categoría | Obligatorio en | Enforzado por | Implementaciones |
|-----|--------|-----------|----------------|---------------|------------------|
| [PAT-0001](./pat/pat-0001-database-per-service.es.md) | Base de Datos por Servicio | Propiedad de Datos | Microservicios, Módulos Distribuidos, Data Mesh | `MS-R06`, `DM-R03` | — |
| [PAT-0002](./pat/pat-0002-contract-testing.es.md) | Pruebas de Contrato | Contratos | Microservicios | `MS-R05` | — |
| [PAT-0003](./pat/pat-0003-transactional-outbox.es.md) | Outbox Transaccional | Integración | Orientada a Eventos | `ED-R02`, `CORE-0033-01` | — |
| [PAT-0004](./pat/pat-0004-api-contracts.es.md) | Contratos de API Explícitos y Versionados | Contratos | Módulos Distribuidos, Microservicios, Monolito Modular, Orientada a Eventos | `DM-R02` | — |
| [PAT-0005](./pat/pat-0005-data-as-a-product.es.md) | Datos como Producto | Gobernanza | Data Mesh | `DAM-R01` | — |
| [PAT-0006](./pat/pat-0006-data-contracts.es.md) | Contratos de Datos | Contratos | Data Mesh | `DAM-R02`, `DAM-R08` | — |
| [PAT-0007](./pat/pat-0007-federated-governance.es.md) | Gobernanza Federada | Gobernanza | Data Mesh | `DAM-R03` | — |
| [PAT-0008](./pat/pat-0008-consumption-contracts.es.md) | Contratos de Consumo | Contratos | Data Mesh | `DAM-R06` | — |
| [PAT-0009](./pat/pat-0009-discovery-and-registration.es.md) | Descubrimiento y Registro | Gobernanza | Data Mesh | `DAM-R09` | — |
| [PAT-0010](./pat/pat-0010-ports-and-adapters.es.md) | Puertos y Adaptadores | Estructura | Monolito Modular, IA Agéntica | `MM-R03`, `HXA-01`, `HXA-02`, `HXA-03`, `HXA-04`, `HXA-05`, `HXA-06`, `HXA-07`, `MM-R04`, `MM-R11` | CP-04 |
| [PAT-0011](./pat/pat-0011-data-mapper-and-repository.es.md) | Data Mapper y Repositorio | Estructura | Monolito Modular | `MM-R12` | — |
| [PAT-0012](./pat/pat-0012-schema-per-domain.es.md) | Esquema por Dominio | Propiedad de Datos | Monolito Modular, Módulos Distribuidos, Microservicios | `MM-R05`, `MM-R02`, `CORE-0031-01` | — |
| [PAT-0013](./pat/pat-0013-strangler-fig-preparation.es.md) | Preparación Strangler Fig | Entrega | Monolito Modular, Módulos Distribuidos | `MM-R07`, `DM-R08`, `CORE-0045-01` | — |
| [PAT-0014](./pat/pat-0014-circuit-breaker.es.md) | Cortacircuitos | Resiliencia | Módulos Distribuidos, Microservicios | `DM-R07`, `CORE-0011-01` | — |
| [PAT-0015](./pat/pat-0015-bulkhead.es.md) | Mamparo | Resiliencia | Microservicios | `MS-R03` | — |
| [PAT-0016](./pat/pat-0016-fallback-behavior.es.md) | Comportamiento de Respaldo | Resiliencia | Microservicios | `MS-R04` | — |
| [PAT-0017](./pat/pat-0017-idempotent-consumer.es.md) | Consumidor Idempotente | Resiliencia | Orientada a Eventos, Módulos Distribuidos, Microservicios, Serverless | `ED-R05` | CP-03 |
| [PAT-0018](./pat/pat-0018-anti-corruption-layer.es.md) | Capa Anticorrupción | Integración | Monolito Modular, Módulos Distribuidos, Microservicios, IA Agéntica | `ACL-01`, `ACL-02`, `ACL-03`, `ACL-04`, `ACL-05`, `ACL-06` | — |

### Cobertura de enforcement

Todos los patrones anteriores nacen con al menos un identificador de regla vivo, de modo que el catálogo es verificable por máquina desde el día uno. Tres hallazgos merecen mención:

- **La categoría de resiliencia tenía enforcement completo y cero documentación.** PAT-0014 a PAT-0018 se derivan de enunciados de reglas y de ADRs, no de prosa — ninguna guía de patrones del corpus los describía.
- **Puertos y Adaptadores (PAT-0010) está enforzado por diez identificadores de regla en dos motores**, ninguno de los cuales estaba enlazado desde la prosa que lo describe.
- **Las citas a ADR se registran con un estado de verificación explícito.** Varias citas de la prosa fuente nombran un ADR cuyo título o decisión registrada difiere de la afirmación; cada PAT documenta la discrepancia en lugar de propagarla. Los patrones sin ADR de gobierno — PAT-0002, PAT-0004, PAT-0008, PAT-0009, PAT-0011, PAT-0015, PAT-0016, PAT-0018 — lo declaran explícitamente.

## Patrones Canónicos por runtime (CP)

Las entradas CP se mapean a uno o más ADRs y pueden adoptarse directamente en los repositorios satélite.

### Ecosistema .NET (C#)

| CP | Título | Tipo | ADR | Implementa |
|----|-------|------|-----|------------|
| [CP-01](./dotnet/cp-01-request-scope-context-propagation.es.md) | Propagación del contexto de observabilidad del alcance de la solicitud | Transversal | ADR-0064 | — |
| [CP-02](./dotnet/cp-02-pii-safe-serilog-logging.es.md) | Registro estructurado seguro de PII con Serilog | Seguridad / Observabilidad | ADR-0065 | — |
| [CP-03](./dotnet/cp-03-lightweight-http-idempotency.es.md) | Middleware ligero de idempotencia HTTP | Fiabilidad | ADR-0066 | [PAT-0017](./pat/pat-0017-idempotent-consumer.es.md) |
| [CP-04](./dotnet/cp-04-aop-logging-decorator.es.md) | Decorador de registro AOP con envolvente de observabilidad | Transversal | ADR-0064 / ADR-0065 | [PAT-0010](./pat/pat-0010-ports-and-adapters.es.md) |

## Esquema de las fichas

Cada PAT lleva una ficha legible por máquina junto a su ficha bilingüe, validada contra `src/rulesets/schema/pattern.schema.json`. El esquema soporta antipatrones (`kind: anti-pattern`, que exige `whyProhibited` y `requiredCorrection`), aplicabilidad por topología con su propia guía, variantes de un mismo invariante a distinta granularidad, relaciones tipadas entre patrones y citas a ADR con un campo `verification`.

---

**[Volver a Arquitectura](../README.md)** | **[Registro ADR](../adrs/README.md)**
