# Estandar de Corpus de Topologias

> **Navegacion bilingue:** [Version en ingles](./topology-corpus-standard.md)

## Proposito

Cada topologia es un producto arquitectonico reutilizable; un manifiesto o README por si solo no es implementacion.

## Corpus Requerido

| Area | Evidencia requerida |
|---|---|
| Guia | Perfil bilingue mas guia de adopcion, operacion, seguridad, resiliencia, patrones y evolucion |
| Decisiones | ADRs especificos de topologia aceptados y enlazados desde manifiesto y matriz ADR |
| Gobernanza ejecutable | Ruleset JSON, Rego equivalente, evaluador Native y pruebas positivas/negativas |
| Contrato | Contrato de configuracion neutral de proveedor y fixtures validos/invalidos |
| Plano de control | Descubrimiento y validacion compartidos por CLI, MCP y Core API |
| Cierre | Comandos reproducibles y evidencia canonica |

## Regla de Aceptacion

Una topologia `accepted` DEBE proporcionar todo artefacto de corpus declarado, guia bilingue y ningun fallo R-27 del validador. Los perfiles draft permanecen draft hasta que sus gaps sean trazados y cerrados.

---
[Volver al Hub de Topologias](./README.es.md)
