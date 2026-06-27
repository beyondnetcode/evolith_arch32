# Guia de Adopcion, Operacion y Evolucion de Edge Computing

> **Navegacion Bilingue:** [English Version](./maturity.md)

## Adoption

Adopte esta topologia cuando latencia, localidad, tolerancia offline, ubicacion regulatoria o procesamiento cercano a dispositivos requiera ejecucion fuera del runtime central. Comience con justificacion de localidad documentada, estrategia de sincronizacion explicita y aislamiento de nodo edge.

## Operations

Opere nodos edge con observabilidad store-and-forward, sincronizacion consciente de conflictos y tolerancia a conectividad intermitente. Monitoree lag de sincronizacion, tasas de conflicto y duracion offline como parte de la validacion normal de arquitectura.

## Security

Implemente autenticacion y autorizacion en cada nodo edge. Use secretos inyectados por entorno con capacidad de rotacion apropiados para entornos restringidos. Nunca incruste credenciales en artefactos de despliegue edge.

## Resilience

Disene nodos edge para operacion autonoma durante particiones de red con patrones de persistencia offline-first. Prefiera sincronizacion en background con resolucion explicita de conflictos sobre acoplamiento en tiempo real.

## Patterns and Anti-Patterns

Use bases de datos locales offline-first con sincronizacion en background, estrategias explicitas de resolucion de conflictos (last-write-wins, merge, manual) y observabilidad store-and-forward. No bifurque logica de dominio en el edge, asuma conectividad permanente ni omita gobernanza central por conveniencia edge.

## Evolution

Migre a edge computing solo cuando latencia, localidad o restricciones regulatorias justifiquen la complejidad operativa. Preserve las fronteras de ownership de dominio y los contratos de sincronizacion para que la reubicacion de workloads siga siendo deliberada.

## Validation Checklist

- Valide la configuracion de topologia con `topology.config.schema.json` y ambos fixtures.
- Ejecute la evaluacion Native y OPA mediante el plano de control compartido.
- Confirme ADRs aprobados, guia bilingue y pruebas positivas y negativas reproducibles.

---
[Volver al Perfil Edge Computing](./README.es.md)
