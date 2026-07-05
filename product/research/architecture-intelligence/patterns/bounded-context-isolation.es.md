# Bounded Context Isolation


---

## Source Inspiration
- Diseño basado en dominios
- Prácticas monolíticas modulares empresariales.
- Patrones de arquitectura distribuida moderna.
- Principio arquitectónico "No unir mesas a través de límites modulares"
## Problem
Muchos monolitos modulares sólo lo son a nivel de código.

La capa de persistencia permanece completamente acoplada a través de:
- uniones entre dominios
- DbContexts compartidos
- acceso directo a la entidad
- repositorios compartidos
- claves foráneas entre módulos

Esto crea:
- acoplamiento oculto
- baja autonomía
- evolución difícil
- Complejidad del razonamiento de la IA
- mala escalabilidad
## Evolith Position
Recomendado.
## Principle
Cada contexto acotado debe:
- poseer su persistencia
- poseer sus reglas
- exponer contratos
- evitar el acceso directo de persistencia desde dominios externos
## Allowed Integration
- contratos
- API
- eventos
- proyecciones
- leer modelos
- servicios de consulta
## Forbidden Integration
- uniones entre dominios
- repositorios compartidos
- acceso directo a DbSet entre dominios
- contextos Db globales
## Benefits
- autonomía modular
- evolución independiente
- propiedad más clara
- mejor ingeniería asistida por IA
- descomposición más segura en sistemas distribuidos
## Tradeoffs
- mayor complejidad de la integración
- posible duplicación de datos
- posibles escenarios de coherencia
- contratos más explícitos
## AI Impact
Alto.

Los agentes de IA razonan mucho mejor cuando los dominios están aislados conceptual y técnicamente.
## Related ADR Candidates
- ADR: aislamiento de contexto limitado
- ADR: No se permiten uniones a bases de datos entre dominios
- ADR: Primera integración del contrato

---

[Volver a Arquitectura Inteligente](../README.md)