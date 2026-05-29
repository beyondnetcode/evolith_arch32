# Estandar Web Frontend - React

> Navegacion bilingue: [English](./README.es.md)

Esta seccion define el estandar empresarial Evolith para frontends web basados en React. Es normativo para arquitectura reutilizable, reglas de boilerplate, gobierno del sistema de diseno, quality gates y criterios de promocion.

UMS se trata solo como referencia aplicada. Las rutas de producto, modulos de dominio, headers de tenant, colores locales y decisiones especificas de implementacion deben permanecer en UMS salvo que se promuevan aqui mediante un ADR, estandar o patron canonico.

## Documentos

| Documento | Proposito |
|---|---|
| [Estandar Web Frontend React](./react-web-frontend-standard.es.md) | Estandar normativo para aplicaciones web empresariales con React. |

## Limite de autoridad

| Aspecto | Autoridad Evolith | Autoridad UMS |
|---|---|---|
| Estandares y principios | Define reglas reutilizables obligatorias y recomendadas | Consume y aplica las reglas |
| Boilerplate | Define estructura estable y puntos de extension | Demuestra una implementacion concreta |
| Sistema UI | Define gobierno de tokens, accesibilidad y theming | Provee valores de tema y componentes especificos del producto |
| Acceso a datos | Define patrones reutilizables de frontera | Implementa clientes, headers y contratos especificos de API |
| Quality gates | Define gates minimos | Ejecuta herramientas locales y reporta brechas del producto |

## Regla de promocion

Una practica de UMS se convierte en estandar Evolith solo cuando se valida como reutilizable, se documenta aqui y se aprueba mediante el camino correspondiente: ADR, estandar de gobierno o patron canonico.

---
[Volver a estandares de ingenieria](../../README.es.md)
