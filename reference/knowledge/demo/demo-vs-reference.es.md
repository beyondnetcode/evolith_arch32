# Referencia Canónica vs Modelo Aplicado UMS

> Navegación bilingüe: [English](./demo-vs-reference.md)

Este repositorio y UMS cumplen propósitos diferentes. Leerlos como un mismo nivel de autoridad convertiría una elección de implementación en una regla universal.

| Necesidad | Referencia arquitectónica canónica | Modelo aplicado UMS |
|---|---|---|
| Propósito | Definir estándares, blueprints, ADRs y criterios reutilizables | Demostrar esas ideas en un contexto de producto empresarial |
| Ubicación | Este repositorio bajo `reference/architecture/` y `reference/governance/` | [beyondnetcode/ums](https://github.com/beyondnetcode/ums) |
| Autoridad | Normativa cuando el artefacto es aceptado u obligatorio | Evidencia y especialización, salvo promoción mediante ADR aquí |
| Tecnología | Baseline agnóstico y perfiles de runtime explícitos | Su stack elegido y restricciones operativas de producto |
| Código ejecutable | No se mantiene en este repositorio | Se mantiene en el repositorio UMS |

## Regla de Interpretación

Lee primero el baseline y el registro ADR. Usa UMS para inspeccionar una implementación coherente de identidad, acceso, auditoría, bounded contexts, APIs, observabilidad y prácticas de entrega. Cuando una práctica de UMS deba aplicar a todos los productos, debe promoverse a este repositorio como estándar, ADR o patrón canónico.

---
[Volver al Hub de Referencia UMS](README.es.md)
