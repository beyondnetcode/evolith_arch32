# Guia de Adopcion, Operacion y Evolucion de Data Mesh

> **Navegacion Bilingue:** [English Version](./maturity.md)

## Adoption

Adopte esta topologia cuando el ownership de datos analiticos debe acercarse a los equipos de dominio sin perder gobernanza, calidad, interoperabilidad ni cumplimiento. Comience con productos de datos orientados a dominio, contratos explicitos y politicas de gobernanza federada.

## Operations

Opere una plataforma de infraestructura de datos self-serve que soporte productos de datos propiedad de dominio. Monitoree la frescura de contratos de datos, evidencia de calidad, trazabilidad de lineage y cumplimiento normativo como parte de la validacion normal de arquitectura.

## Security

Autorice el acceso a datos en la frontera del producto de datos. Implemente control de acceso basado en atributos para el consumo de datos analiticos. Nunca omita el plano de gobernanza federada para consultas criticas de cumplimiento.

## Resilience

Disene productos de datos para actualizaciones idempotentes, tolerancia a evolucion de schema y degradacion gradual cuando los dominios upstream no esten disponibles. Prefiera consistencia eventual para la distribucion analitica.

## Patterns and Anti-Patterns

Use productos de datos orientados a dominio con propiedades DATSIS (Discoverable, Addressable, Trustworthy, Self-describing, Interoperable, Secure), gobernanza computacional federada y patrones de plataforma self-serve. No construya un data lake centralizado, comparta tablas operativas sin procesar entre dominios ni omita ownership de dominio por conveniencia analitica.

## Evolution

Migre a data mesh solo cuando la autonomia de dominio para datos analiticos este justificada por la escala organizacional. Preserve las fronteras de ownership transaccional y las politicas de gobernanza federada para que la migracion de productos de datos siga siendo deliberada.

## Validation Checklist

- Valide la configuracion de topologia con `topology.config.schema.json` y ambos fixtures.
- Ejecute la evaluacion Native y OPA mediante el plano de control compartido.
- Confirme ADRs aprobados, guia bilingue y pruebas positivas y negativas reproducibles.

---
[Volver al Perfil Data Mesh](./README.es.md)
