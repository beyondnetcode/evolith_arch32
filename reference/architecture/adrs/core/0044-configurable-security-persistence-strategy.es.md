# [ADR 0044](0044-configurable-security-persistence-strategy.md): Estrategia de Persistencia de Seguridad Configurable (Agnosticismo vs. RLS Nativo)

## Estado
Propuesto

## Fecha
2026-05-12

## Contexto
Necesitamos implementar Seguridad a Nivel de Fila (RLS) para garantizar la integridad y visibilidad de los datos, pero bajo una Arquitectura Hexagonal que prioriza la extensibilidad y el agnosticismo tecnológico.
Rendirnos exclusivamente ante las capacidades nativas del motor de base de datos nos encadena a proveedores específicos (vendor lock-in). Inversamente, filtrar únicamente en memoria a nivel de binario podría degradar el rendimiento bajo condiciones de alta concurrencia por sobrecarga de transferencia de datos. Requerimos un modelo donde el Dominio retenga el control total de la lógica de visibilidad pero conserve la libertad de apalancar optimizaciones nativas de infraestructura donde existan.

## Decisión
Adoptar una **Estrategia de Persistencia Configurable** utilizando el patrón Strategy en la capa de Infraestructura. El modo de operación activo será determinado mediante un flag estructural en el arranque del sistema (`SECURITY_STRATEGY_MODE`).

1. **Domain Policies (Fuente de Verdad)**: Todos los criterios de visibilidad se definen como **Specifications** puras dentro de la capa Core del Dominio.
2. **Inyección de Estrategia**: La fábrica de persistencia evalúa el flag para decidir qué adaptador instanciar:
 * **Agnostic Adapter (`APP_FILTER`)**: Traduce la Specification de dominio a un filtro de código ejecutable (ej. predicados a nivel de código), garantizando el funcionamiento en CUALQUIER motor (NoSQL, In-Memory).
 * **Native Adapter (`INFRA_NATIVE`)**: Traduce la misma Specification a construcciones nativas del motor (ej. contexto `SET SESSION`, políticas RLS nativas o SQL optimizado).

## Notas de Implementación / Mapeo

| Componente | Responsabilidad |
| :--- | :--- |
| **Domain Policy** | Define los criterios de visibilidad como Specifications puras. |
| **Feature Flag** | `SECURITY_STRATEGY_MODE` (Valores: `APP_FILTER`, `INFRA_NATIVE`). |
| **Persistence Factory** | Decide qué adaptador instanciar basándose en el flag. |
| **Agnostic Adapter** | Traduce la Specification a un filtro de código (Binario/En Memoria). |
| **Native Adapter** | Traduce la Specification a un contexto `SET SESSION` + SQL nativo. |

## Consecuencias

### Positivas
- **Portabilidad Total**: Control absoluto sobre el intercambio de infraestructura. El binario opera satisfactoriamente incluso en bases de datos sin soporte de RLS.
- **Facilidad de Testing**: Permite ejecutar pruebas unitarias de lógica de seguridad extremadamente rápidas en memoria sin dependencias de contenedores de BD reales.
- **Control Evolutivo**: El dominio sigue siendo el dueño exclusivo de las reglas de visibilidad.

### Negativas / Riesgos
- **Paridad de Lógica**: Exige que los desarrolladores mantengan y garanticen la equivalencia lógica entre ambos adaptadores.
- **Duplicidad en Pruebas**: Requiere parametrización de la suite de pruebas de integración para garantizar cobertura sobre ambas estrategias activas.

### Impacto en CAP & Sistema
- **Latencia**: El modo `APP_FILTER` puede incrementar el consumo de ancho de banda (recuperando conjuntos más grandes para filtrar localmente), mientras que `INFRA_NATIVE` optimiza el tráfico pero podría sobrecargar el inicio de conexiones si no hay un buen pooling.
- **Consistencia**: Idéntica en ambas estrategias puesto que la autoridad de la regla reside invariablemente en el Dominio.

## Referencias
- [ADR-0002: Arquitectura Hexagonal Limpia con NestJS](../../adrs/nodejs/0002-clean-architecture-nestjs.md)
- [ADR-0010: Estrategia de Arquitectura Multi-Tenancy](../../adrs/core/0010-multi-tenancy-architecture-strategy.md)

---
[Volver al Índice](./README.es.md)
