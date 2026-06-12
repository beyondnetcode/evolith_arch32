# No hacer joins entre dominios


---

## Problema
Un sistema puede parecer modular en el código, pero seguir acoplado en la base de datos.

Esto ocurre cuando un dominio consulta directamente tablas internas de otro dominio usando joins, repositorios compartidos, modelos ORM globales o relaciones cruzadas.
## Contexto
Aplica cuando el producto está organizado por contextos acotados, módulos o dominios y se desea preservar la autonomía y futura capacidad de extracción.
## Solución
No hacer uniones entre tablas que pertenecen a distintos contextos delimitados.

La integración debe realizarse mediante contratos explícitos.
## Alternativas permitidas
- contratos de aplicación
- API internas
- eventos de dominio o integración
- leer modelos
- proyecciones
- datos de referencia replicados
- capas anticorrupción
## Beneficios
- reducir el acoplamiento oculto
- protege la propiedad del dominio
- mejora la autonomía modular
- facilitar una futura extracción a servicios distribuidos
- mejora el razonamiento de agentes IA
## Tradeoffs
- puede requerir duplicación controlada de datos de lectura
- puede introducir consistencia eventual
- exigen contratos explícitos
- puede requerir modelos de informes separados
## Posición Evolith
Recomendado.
## Nivel de adopción
Empresarial.
## Impacto IA
Alto. Los agentes IA trabajan mejor cuando los límites de persistencia y dominio son claros.

---

[Volver a Arquitectura Inteligente](../../README.es.md)