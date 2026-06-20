# Guia de Adopcion, Operacion y Evolucion de Microservicios

> **Navegacion Bilingue:** [English Version](./maturity.md)

## Adoption

Adopte microservicios solo para dominios delimitados maduros con requisitos de despliegue, escala, confiabilidad o propiedad independientes que superen el costo de sistemas distribuidos.

## Operations

Opere cada servicio con un responsable, desplegabilidad independiente, objetivos de nivel de servicio observables y runbooks de incidentes. La plataforma debe hacer visibles las dependencias y la compatibilidad de versiones.

## Security

Autentique cargas de trabajo, autorice cada solicitud entre servicios y propague solo los reclamos minimos verificados de identidad e inquilino. Trate la ubicacion de red como no confiable.

## Resilience

Use timeouts, reintentos acotados, manejadores idempotentes, contrapresion y rutas de degradacion. Los cambios entre servicios deben recuperarse de forma segura de una finalizacion parcial.

## Patterns and Anti-Patterns

Use propiedad de contextos delimitados, contratos de API o eventos, propiedad de datos y Transactional Outbox para eventos entre servicios. No comparta bases de datos, coordine lanzamientos globalmente ni use transacciones distribuidas como integracion rutinaria.

## Evolution

Consolide servicios cuando sus operaciones independientes ya no justifiquen su costo. Evolucione contratos de forma compatible, conserve evidencia de auditoria y evite acoplar el modelo interno de un servicio a sus consumidores.

## Validation Checklist

- Valide la configuracion de topologia con `topology.config.schema.json` y ambos fixtures.
- Ejecute la evaluacion Native y OPA mediante el plano de control compartido.
- Confirme ADRs aprobados, guia bilingue y pruebas positivas y negativas reproducibles.

---
[Volver al Perfil de Microservicios](./README.es.md)
