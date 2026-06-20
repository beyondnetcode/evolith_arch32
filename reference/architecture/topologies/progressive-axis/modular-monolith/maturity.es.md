# Guia de Adopcion, Operacion y Evolucion del Monolito Modular

> **Navegacion Bilingue:** [English Version](./maturity.md)

## Adoption

Adopte esta topologia cuando el producto necesita una unidad desplegable y limites de dominio explicitos. Comience con contextos delimitados, contratos explicitos y propiedad independiente de persistencia.

## Operations

Opere un pipeline de entrega y un artefacto desplegable. Supervise las violaciones de limites, la propiedad de migraciones y las senales de preparacion para extraccion como parte de la validacion normal de arquitectura.

## Security

Autorice el acceso en el limite de aplicacion y conserve el filtrado de inquilinos en la capa de aplicacion, con controles nativos de base de datos como salvaguarda secundaria.

## Resilience

Mantenga las fallas en proceso limitadas por contratos de contexto. Use mecanismos de integracion durables antes de extraer un modulo solo para recuperarse de una falla interna.

## Patterns and Anti-Patterns

Use los patrones Data Mapper y Repository, puertos y adaptadores, e integracion entre contextos orientada a contratos. No comparta internos de dominio, tablas de persistencia ni propiedad implicita de transacciones entre contextos.

## Evolution

Pase a modulos distribuidos solo cuando la evidencia de preparacion de ADR-0045 justifique propiedad operativa independiente. Preserve contratos y propiedad de datos para que la extraccion siga siendo reversible y deliberada.

## Validation Checklist

- Valide la configuracion de topologia con `topology.config.schema.json` y ambos fixtures.
- Ejecute la evaluacion Native y OPA mediante el plano de control compartido.
- Confirme ADRs aprobados, guia bilingue y pruebas positivas y negativas reproducibles.

---
[Volver al Perfil de Monolito Modular](./README.es.md)
