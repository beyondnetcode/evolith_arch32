# No hacer joins entre dominios

## Problema

Un sistema puede parecer modular en el código, pero seguir acoplado en la base de datos.

Esto ocurre cuando un dominio consulta directamente tablas internas de otro dominio usando joins, repositorios compartidos, modelos ORM globales o relaciones cruzadas.

## Contexto

Aplica cuando el producto está organizado por bounded contexts, módulos o dominios y se desea preservar autonomía y futura capacidad de extracción.

## Solución

No hacer joins entre tablas que pertenecen a distintos bounded contexts.

La integración debe realizarse mediante contratos explícitos.

## Alternativas permitidas

- contratos de aplicación
- APIs internas
- eventos de dominio o integración
- read models
- proyecciones
- datos de referencia replicados
- anti-corruption layers

## Beneficios

- reduce acoplamiento oculto
- protege la propiedad del dominio
- mejora la autonomía modular
- facilita una futura extracción a servicios distribuidos
- mejora el razonamiento de agentes IA

## Tradeoffs

- puede requerir duplicación controlada de datos de lectura
- puede introducir consistencia eventual
- exige contratos explícitos
- puede requerir modelos de reporte separados

## Posición Evolith

Recomendado.

## Nivel de adopción

Empresarial.

## Impacto IA

Alto. Los agentes IA trabajan mejor cuando los límites de persistencia y dominio son claros.

---

[Volver a Architecture Intelligence](../../README.es.md)
