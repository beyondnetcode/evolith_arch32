# [ADR 0027](0027-dual-protocol-rest-grpc-api-gateway.md): Estrategia de API de Protocolo Dual (REST y gRPC)

## Estado
Aprobado

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
- [ADR-0002: Arquitectura Limpia](../../adrs/nodejs/0002-clean-architecture-nestjs.md)
- [Sitio Oficial de gRPC](https://grpc.io/)

---
[Volver al Índice](./README.es.md)
