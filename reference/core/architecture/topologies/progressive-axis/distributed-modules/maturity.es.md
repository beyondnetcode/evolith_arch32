# Guia de Adopcion, Operacion y Evolucion de Modulos Distribuidos

> **Navegacion Bilingue:** [English Version](./maturity.md)

## Adoption

Adopte esta topologia solo despues de que los contextos delimitados tengan contratos estables y necesidades operativas gestionadas de forma independiente. Defina propiedad, limites de despliegue y expectativas de compatibilidad antes de distribuir.

## Operations

Opere cada modulo con dependencias observables, contratos versionados y una ruta clara de reversa. Supervise disponibilidad, fallas de contrato y propiedad de entrega en los limites de modulo.

## Security

Use identidades de carga de trabajo y autorizacion explicita entre servicios. No transfiera credenciales, alcance de inquilino ni acceso privilegiado mediante llamadas internas implicitas.

## Resilience

Disene para fallas parciales con timeouts acotados, idempotencia, reintentos y rutas de recuperacion durables. Una interrupcion de modulo no debe corromper silenciosamente los datos de un modulo vecino.

## Patterns and Anti-Patterns

Use integracion orientada a contratos, datos con propietario y patron Transactional Outbox cuando los eventos crucen un limite de modulo. No cree un monolito distribuido con bases de datos compartidas, cadenas de dependencias sincrona o lanzamientos en bloqueo.

## Evolution

Promueva un modulo a microservicio solo cuando su autonomia, propiedad operativa y limite de datos justifiquen el costo adicional de plataforma. Preserve los contratos de compatibilidad durante cada extraccion.

## Validation Checklist

- Valide la configuracion de topologia con `topology.config.schema.json` y ambos fixtures.
- Ejecute la evaluacion Native y OPA mediante el plano de control compartido.
- Confirme ADRs aprobados, guia bilingue y pruebas positivas y negativas reproducibles.

---
[Volver al Perfil de Modulos Distribuidos](./README.es.md)
