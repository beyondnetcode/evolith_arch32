# Architecture Radar


---

## Purpose
Architecture Radar ayuda a Evolith a clasificar ideas arquitectónicas externas e internas utilizando un modelo de adopción controlada.

Previene la estandarización prematura y hace explícita la evolución arquitectónica.
## Categories

### Adopt
Prácticas recomendadas y alineadas con los principios de Evolith.

Ejemplos iniciales:
- Telemetría abierta
- Registro estructurado de Serilog
- Aislamiento de contexto limitado
- Primera integración del contrato
- Monolito modular primero
### Trial
Prácticas que vale la pena aplicar en contextos controlados antes de convertirse en estándar.

Ejemplos iniciales:
- Agentes de aprovechamiento
- Revisiones de arquitectura asistida por IA
- Gobernanza semántica
- Comprobaciones de cumplimiento generadas por IA
### Assess
Prácticas que requieren investigación, pilotos o análisis de compensaciones.

Ejemplos iniciales:
- Búsqueda de eventos
- Modelo de actor
- Flujos de trabajo de agentes completamente autónomos
- Aplicación de políticas de arquitectura en tiempo de ejecución
### Hold
Prácticas que deben evitarse a menos que exista una excepción documentada.

Ejemplos iniciales:
- DbContext global compartido entre dominios
- Uniones de bases de datos entre dominios
- Fábricas de servicios estáticos.
- Estado mutable global
- Acoplamiento de infraestructura oculta
## Promotion Rule
Un objeto de radar puede convertirse en un estándar de Evolith sólo a través de uno de estos artefactos:

- ADR aceptado
- estándar de gobernanza
- plano de arquitectura
- patrón canónico
## Validation Rule
Todo movimiento de radar debe incluir:
- justificación
- compensaciones
- evidencia
- equipos afectados
- orientación de adopción
- Impacto de la IA cuando corresponda

---

[Volver a Arquitectura Inteligente](../README.md)