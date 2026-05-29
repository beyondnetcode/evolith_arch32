# [ADR 0022](0022-contextual-auth-and-pluggable-projections.md): Autenticación Contextual y Proyecciones de Salida Enchufables

## Estado
Aprobado

## Fecha
2026-05-08

## Contexto
Los planos de ejecución SaaS enfrentan una pesada fricción de integración: los microservicios ligeros necesitan formatos de tokens binarios condensados pequeños para prevenir el hinchazón de datos, mientras que los clientes Frontend pesados (Angular/React) demandan salidas completas de árboles JSON recursivos para dibujar dinámicamente los menús de navegación. Codificar rígidamente un único formato de salida limita ya sea la eficiencia del ancho de banda o la velocidad de la aplicación.

## Decisión
Separar la lógica de Validación de Identidad enteramente de las capacidades de composición de salida, imponiendo proyectores especializados en tiempo de ejecución:

1. **Mapa de Proyectores Enchufables**: El servicio Core emite un modelo de permisos universal. Proyectores enchufables dedicados capturan esta carga útil y la reformatean adaptada a los consumidores (ej., un compresor JWT para servicios internos, un generador de grafos JSON rico para agentes de navegador).
2. **Enrutamiento de Nodo Contextual**: Soporte de diseño nativo para resolver la jerarquía bajando a través del Inquilino, hasta llegar dinámicamente bajo demanda al enrutamiento del nodo de Sucursal física ("Sede").
3. **Caché de Lectura Estándar**: Enrutar todas las proyecciones a través de puentes Redis de Alto Rendimiento, reteniendo las metas comunes de ejecución de destino por debajo del milisegundo para endpoints de validación de lectura intensiva.

## Consecuencias

### Positivas
- Unifica la gobernanza bajo una única fuente de seguridad, respetando las variadas tolerancias de protocolos aguas abajo.
- Empodera nativamente los flujos de autorización sensibles a la ubicación y específicos de los nodos sin hacks de base de datos.

### Negativas
- Aumenta el volumen de código inicial para soportar varias plantillas de proyección.
- Requiere sincronía de invalidación de caché a través de los diferentes formatos compilados.

## Referencias
- [ADR-0021: Grafo Auth de Alto Rendimiento](../../adrs/nodejs/0021-high-performance-auth-and-graph-compilation.md)
- [ADR-0020: Estrategia de IdP](../../adrs/core/0020-identity-provider-abstraction-strategy.md)

---
[Volver al Índice](./README.es.md)
