# Modular Monolith First


---

## Source
- Estrategia de arquitectura progresiva.
- Diseño basado en dominios
- Viaje de arquitectura Evolith
## Problem
Los equipos suelen pasar a los microservicios antes de que los límites del dominio, la madurez operativa y la disciplina de entrega estén listos.

Esto crea:

- complejidad distribuida demasiado pronto
- integración frágil
- depuración más difícil
- más coste operativo
- entrega más lenta
## Context
Este patrón se aplica cuando un producto necesita una estructura empresarial pero aún no justifica la distribución física.
## Solution
Comience con un monolito modular que separe los dominios conceptual y técnicamente antes de separarlos físicamente.
## Rules
- Los módulos deben representar límites de dominio significativos.
- Los módulos deben evitar el acoplamiento de persistencia directo.
- La integración interna debe ser explícita.
- Debe preservarse la futura preparación para la extracción.
- La distribución en tiempo de ejecución es opcional, no el supuesto inicial.
## Benefits
- entrega inicial más rápida
- menor complejidad operativa
- propiedad de dominio más clara
- extracción futura más fluida
- mejor curva de aprendizaje para equipos y proveedores
## Tradeoffs
- requiere disciplina para evitar convertirse en una gran bola de barro en capas
- Los límites del módulo deben ser gobernados activamente.
- Los equipos pueden hacer mal uso de la conveniencia de la base de datos compartida.
- la extracción aún requiere planificación y controles de madurez
## Evolith Position
Recomendado.
## Adoption Level
Empresa.
## AI Impact
Alto. Un monolito modular bien estructurado brinda a los agentes de IA suficiente contexto para trabajar localmente dentro de áreas delimitadas sin introducir una complejidad distribuida innecesaria.
## Related ADRs
- [ADR-0045: Criterios de preparación para la extracción de microservicios](../../../architecture/adrs/core/0045-microservice-extraction-readiness-criteria.md)
- [ADR-0047: Microservicios SOA Monolith de patrones arquitectónicos](../../../architecture/adrs/core/0047-architectural-patterns-monolith-soa-microservices.md)
- [ADR-0057: Catálogo de inteligencia de arquitectura](../../../architecture/adrs/core/0057-architecture-intelligence-catalog.md)
## Anti-Patterns
- tratar la separación de carpetas como una verdadera modularidad
- usar un modelo de dominio compartido en todos los módulos
- usar un modelo de persistencia global para cada contexto
- Comenzando con microservicios para compensar el diseño de dominio poco claro.

---

[Volver a Arquitectura Inteligente](../README.md)