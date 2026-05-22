# Objetivos Estratégicos del Producto (OKRs) - Skeleton To-Do de Referencia

Para alinear la entrega técnica con el objetivo de proveer una Arquitectura de Referencia pura, la plantilla está gobernada por los siguientes **Objetivos y Resultados Clave (OKRs)**:

---

## Objetivo 1: 100% de Cumplimiento de Arquitectura Limpia
Garantizar la separación absoluta de la lógica del dominio central respecto a los detalles de infraestructura.

- **KR 1.1**: Mantener **cero importaciones de SDK de infraestructura** dentro de la capa `src/core` (monitoreado vía `dependency-cruiser`).
- **KR 1.2**: Mantener la velocidad de pruebas del dominio por debajo de **100ms para toda la suite**, utilizando estrategias de mocking puramente en memoria.
- **KR 1.3**: Lograr **100% de aislamiento de casos de uso**, donde cada lógica de interacción cabe dentro de una única clase de servicio dedicada.

---

## Objetivo 2: Observabilidad Lista para Producción
Establecer que el tracing y el logging no son un añadido posterior sino estándares fundacionales.

- **KR 2.1**: Estandarizar **100% de propagación de trazas** a través del stack via auto-instrumentación de OpenTelemetry.
- **KR 2.2**: Mantener compatibilidad del esquema de logs estructurado en todas las salidas de runtime.

---

## Objetivo 3: Configuración Local y Scaffolding Sin Fricción
Garantizar que la incorporación de nuevos desarrolladores sea fluida y extremadamente rápida.

- **KR 3.1**: Levantar el entorno completo (Postgres, Redis, API) en **menos de 1 comando** usando `docker compose up`.
- **KR 3.2**: Asegurar que el tiempo de compilación del monorepo sea **inferior a 1 minuto** vía Nx Cache.

---
[Volver al Índice](./README.md)
