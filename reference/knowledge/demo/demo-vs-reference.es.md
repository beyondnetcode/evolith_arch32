# Referencia Canonica vs Modelo Aplicado UMS

> Navegacion bilingue: [English](./demo-vs-reference.md)

Este repositorio y UMS cumplen propositos diferentes. Leerlos como un mismo nivel de autoridad convertiria una eleccion de implementacion en una regla universal.

| Necesidad | Referencia arquitectonica canonica | Modelo aplicado UMS |
|---|---|---|
| Proposito | Definir estandares, blueprints, ADRs y criterios reutilizables | Demostrar esas ideas en un contexto de producto empresarial |
| Ubicacion | Este repositorio bajo `reference/architecture/` y `reference/governance/` | [beyondnetcode/ums](https://github.com/beyondnetcode/ums) |
| Autoridad | Normativa cuando el artefacto es aceptado u obligatorio | Evidencia y especializacion, salvo promocion mediante ADR aqui |
| Tecnologia | Baseline agnostico y perfiles de runtime explicitos | Su stack elegido y restricciones operativas de producto |
| Codigo ejecutable | No se mantiene en este repositorio | Se mantiene en el repositorio UMS |

## Regla de Interpretacion

Lee primero el baseline y el registro ADR. Usa UMS para inspeccionar una implementacion coherente de identidad, acceso, auditoria, bounded contexts, APIs, observabilidad y practicas de entrega. Cuando una practica de UMS deba aplicar a todos los productos, debe promoverse a este repositorio como estandar, ADR o patron canonico.

---
[Volver al Hub de Referencia UMS](./README.md)
