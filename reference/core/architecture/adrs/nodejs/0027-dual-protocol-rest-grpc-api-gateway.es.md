# [ADR 0027](0027-dual-protocol-rest-grpc-api-gateway.md): Estrategia de API de Protocolo Dual (REST y gRPC)

## Estado
Accepted

## Fecha
2026-05-09

## Contexto
Exponer la charla interna entre microservicios vía APIs REST estándar JSON HTTP/1.1 conduce a una degradación masiva del rendimiento (cadenas detalladas, ciclos de decodificación de texto). Sin embargo, la exposición externa absoluta debe permanecer como REST estándar para preservar la accesibilidad de desarrolladores externos. Un único protocolo no satisfará tanto la eficiencia interna como la compatibilidad externa.

## Decisión
Orquestar un **Borde de Tiempo de Ejecución de Protocolo Dual** estricto emparejado con la orquestación del Gateway Kong:

1. **REST Estándar (Público)**: Todos los agentes de navegador, aplicaciones de portales de clientes y gateways B2B consumen APIs REST JSON seguras y documentadas sobre HTTPS estándar.
2. **gRPC Binario (Interno)**: Cualquier apretón de manos de autorización interno crítico para la misión, verificación de token de máquina a máquina o stream entre servicios se transmite estrictamente sobre llamada a procedimiento remoto de Google (gRPC) binaria, aprovechando cargas útiles densas de Protocol Buffers.
3. **Abastecimiento Unificado**: Impulsar los contratos internos nativamente utilizando definiciones maestras `.proto` seguidas centralmente en el monorepo Nx en `libs/contracts`, compilando automáticamente enlaces (bindings) limpios de código generado en Typescript.

## Consecuencias

### Positivas
- Colapsa la huella de ancho de banda de las cargas útiles internas.
- Acelera drásticamente la latencia de validación de backend a backend utilizando pipelines HTTP/2 multiplexados.
- Preserva la simplicidad del descubrimiento vía Swagger público para desarrolladores corporativos globales.

### Negativas
- Los desarrolladores deben generar y compilar librerías Proto localmente, complicando ligeramente el tiempo de rampa de las estaciones de trabajo de desarrollo locales.

## Referencias
- [ADR-0002: Arquitectura Limpia](../../adrs/nodejs/0002-clean-architecture-nestjs.es.md)
- [Sitio Oficial de gRPC](https://grpc.io/)







## Objetivo y Alcance

Backfill histórico: Abordar la tensión arquitectónica donde exponer la charla interna entre microservicios vía APIs REST estándar JSON HTTP/1, estableciendo un límite estándar.

## Opciones Consideradas

- **Seleccionada:** Estrategia de API de Protocolo Dual (REST y gRPC)
- **Otras:** Desconocido (el registro histórico no enumera explícitamente alternativas rechazadas).

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad).

## Decisiones y Estándares Relacionados

- [ADR-0002: Arquitectura Limpia](../../adrs/nodejs/0002-clean-architecture-nestjs.es.md)
- [Sitio Oficial de gRPC](https://grpc.io/)

## Vigilancia Tecnológica (Tendencias, Madurez, Adopción, Soporte)

REST y gRPC son protocolos maduros y ampliamente adoptados. gRPC (CNCF graduado) está en etapa de crecimiento para comunicación entre servicios. REST sigue siendo dominante para APIs públicas. La estrategia de doble protocolo es un patrón reconocido en arquitecturas de microservicios. Vigencia esperada: ambos 5+ años.

## Fuentes Actuales

- Documentación de gRPC — https://grpc.io, consultado 2026-06-20.
- Guías de diseño de APIs REST (Microsoft) — https://learn.microsoft.com/es-es/azure/architecture/best-practices/api-design, consultado 2026-06-20.

---
[Volver al Índice](./README.es.md)
