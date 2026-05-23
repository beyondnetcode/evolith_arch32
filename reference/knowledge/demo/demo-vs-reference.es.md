# Demo vs Referencia

> Navegación bilingüe: [English](./demo-vs-reference.md)

Esta página evita un error común de lectura: no todo detalle de implementación en la demo es una regla universal de arquitectura.

## Qué Es Universal

La guía universal vive en documentos de arquitectura y gobernanza:

- Evolución progresiva desde monolito simple a monolito modular y servicios distribuidos.
- Principios y restricciones agnósticas de runtime.
- ADRs y estándares aceptados como política del repositorio.
- Reglas de nombres, documentación, calidad, seguridad y SDLC.

## Qué Es Específico de la Demo

La guía específica de demo vive en la documentación demo y el código fuente:

- Alcance funcional To-Do.
- Infraestructura local y cableado Docker Compose.
- Decisiones concretas Node.js/NestJS usadas por el sandbox.
- Simplificaciones realizadas para mantener el ejemplo entendible.

## Regla de Lectura

Si una decisión aparece solo en documentación demo, trátala como ejemplo. Si aparece en el registro ADR, blueprint o estándares de gobernanza, trátala como guía canónica.

---
[Volver al Hub Demo](./README.md)
