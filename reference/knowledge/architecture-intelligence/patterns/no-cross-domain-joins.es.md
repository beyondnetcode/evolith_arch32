# No Cross-Domain Joins


---

## Source
- Diseño basado en dominios
- Práctica de arquitectura Monolito Modular
- Patrón de aislamiento de contexto limitado
## Problem
Un sistema puede parecer modular en código y al mismo tiempo permanecer estrechamente acoplado en la base de datos.

Esto suele suceder cuando un dominio consulta las tablas internas de otro dominio directamente a través de:

- SQL se une
- propiedades de navegación ORM compartidas
- repositorios compartidos
- contextos de bases de datos globales
- claves foráneas entre dominios
## Context
Este patrón se aplica cuando un producto está organizado por contextos, módulos o dominios delimitados y debe preservar opciones de extracción futuras.
## Solution
No una tablas de bases de datos a través de límites de propiedad de contexto acotado.

Cada contexto debe exponer la información requerida a través de mecanismos de integración explícitos.
## Allowed Alternatives
- contratos de aplicación
- API internas
- eventos de dominio
- eventos de integración
- leer modelos
- proyecciones
- datos de referencia replicados
- capas anticorrupción
## Benefits
- reduce el acoplamiento oculto
- mejora la autonomía modular
- protege la propiedad del dominio
- mejora la futura preparación para la extracción de microservicios
- hace que la arquitectura sea más fácil de razonar para los agentes de IA
## Tradeoffs
- puede requerir datos de lectura duplicados
- puede introducir consistencia eventual
- requiere contratos de integración explícitos
- puede aumentar el esfuerzo de implementación para vistas entre dominios
## Evolith Position
Recomendado.
## Adoption Level
Empresa.
## AI Impact
Alto. Los agentes de IA pueden trabajar de forma más segura cuando los límites de los módulos son explícitos y la propiedad de la persistencia no es ambigua.
## Related ADRs
- [ADR-0031: Esquema por contexto y catálogo de eventos de dominio](../../../architecture/adrs/core/0031-schema-per-context-domain-event-catalog.md)
- [ADR-0045: Criterios de preparación para la extracción de microservicios](../../../architecture/adrs/core/0045-microservice-extraction-readiness-criteria.md)
- [ADR-0057: Catálogo de inteligencia de arquitectura](../../../architecture/adrs/core/0057-architecture-intelligence-catalog.md)
## Anti-Patterns
- un DbContext global para todos los dominios
- uniones SQL directas a través de contextos limitados
- repositorios compartidos utilizados por múltiples dominios
- utilizar la conveniencia de generar informes para justificar el acoplamiento de dominios

---

[Volver a Arquitectura Inteligente](../README.md)