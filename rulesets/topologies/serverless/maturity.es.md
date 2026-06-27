# Guia de Adopcion, Operacion y Evolucion de Serverless

> **Navegacion Bilingue:** [English Version](./maturity.md)

## Adoption

Adopte esta topologia cuando las capacidades aisladas se beneficien de escalamiento administrado, triggers de eventos o workloads con picos sin introducir una topologia de servicio separada. Comience con handlers sin estado, contratos explicitos y paquetes de despliegue acotados.

## Operations

Opere uno o mas entornos runtime administrados. Monitoree la distribucion de cold-start, el tamano del paquete de despliegue, las tasas de invocacion y los limites de concurrencia como parte de la validacion normal de arquitectura.

## Security

Autorice el acceso en la frontera del handler. Implemente gestion de identidad y secretos neutral respecto al proveedor. Nunca incruste credenciales en paquetes de despliegue; use secretos inyectados por entorno con capacidad de rotacion.

## Resilience

Disene handlers para reintentos idempotentes, degradacion gradual bajo presion de concurrencia y tiempo de inicializacion acotado. Prefiera mecanismos de integracion durables antes de agregar infraestructura con estado.

## Patterns and Anti-Patterns

Use handlers sin estado, contratos explcitos de entrada/salida, interfaces neutrales al proveedor e inicializacion diferida acotada. No asuma estado local persistente, duracion de ejecucion ilimitada ni caracteristicas runtime especificas del proveedor.

## Evolution

Mueva una capacidad a serverless solo cuando el perfil operativo (burst, event-driven, async) justifique la dependencia de plataforma. Preserve los contratos de dominio y la preparacion para extraccion para que la migracion de retorno u otra topologia siga siendo deliberada.

## Validation Checklist

- Valide la configuracion de topologia con `topology.config.schema.json` y ambos fixtures.
- Ejecute la evaluacion Native y OPA mediante el plano de control compartido.
- Confirme ADRs aprobados, guia bilingue y pruebas positivas y negativas reproducibles.

---
[Volver al Perfil Serverless](./README.es.md)
