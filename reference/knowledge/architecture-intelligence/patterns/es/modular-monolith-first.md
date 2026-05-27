# Monolito Modular Primero

## Problema

Muchos equipos adoptan microservicios antes de tener límites de dominio claros, madurez operativa y disciplina de entrega.

Esto suele aumentar complejidad, costos y dificultad de diagnóstico.

## Contexto

Aplica cuando un producto necesita estructura empresarial, pero todavía no justifica distribución física.

## Solución

Comenzar con un monolito modular, separando dominios conceptual y técnicamente antes de separarlos físicamente.

## Reglas

- Los módulos deben representar límites de dominio reales.
- La integración interna debe ser explícita.
- Se debe preservar la posibilidad de extracción futura.
- La distribución física no debe ser el punto de partida por defecto.

## Beneficios

- menor complejidad inicial
- entrega más rápida
- mejor propiedad de dominio
- mejor transición futura
- mejor onboarding para equipos y proveedores

## Tradeoffs

- requiere disciplina modular
- los límites deben gobernarse activamente
- se debe evitar convertirlo en un sistema acoplado por conveniencia

## Posición Evolith

Recomendado.

## Nivel de adopción

Empresarial.

## Impacto IA

Alto. Un monolito modular bien estructurado ayuda a que los agentes IA trabajen dentro de límites claros.

---

[Volver a Architecture Intelligence](../README.es.md)
