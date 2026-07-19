# [ADR 0022](0022-contextual-auth-and-pluggable-projections.md): Autenticación Contextual y Proyecciones de Salida Enchufables

## Estado
Accepted

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
- [ADR-0021: Grafo Auth de Alto Rendimiento](../../adrs/nodejs/0021-high-performance-auth-and-graph-compilation.es.md)
- [ADR-0020: Estrategia de IdP](../../adrs/core/0020-identity-provider-abstraction-strategy.es.md)







## Objetivo y Alcance

Backfill histórico: Abordar la tensión arquitectónica donde los planos de ejecución SaaS enfrentan una pesada fricción de integración: los microservicios ligeros necesitan formatos de tokens binarios condensados pequeños para prevenir el hinchazón de datos, mientras que los clientes Frontend pesados (Angular/React) demandan salidas completas de árboles JSON recursivos para dibujar dinámicamente los menús de navegación, estableciendo un límite estándar.

## Opciones Consideradas

- **Seleccionada:** Autenticación Contextual y Proyecciones de Salida Enchufables
- **Otras:** Desconocido (el registro histórico no enumera explícitamente alternativas rechazadas).

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad).

## Decisiones y Estándares Relacionados

- [ADR-0021: Grafo Auth de Alto Rendimiento](../../adrs/nodejs/0021-high-performance-auth-and-graph-compilation.es.md)
- [ADR-0020: Estrategia de IdP](../../adrs/core/0020-identity-provider-abstraction-strategy.es.md)

## Vigilancia Tecnológica (Tendencias, Madurez, Adopción, Soporte)

La autenticación contextual con proyecciones plugables es un patrón arquitectónico multicanal en etapa de crecimiento. El enfoque de middleware de autenticación componible sigue patrones establecidos en Node.js (Passport.js). Vigencia esperada: 3-5 años como patrón.

## Fuentes Actuales

- Documentación de Passport.js — https://www.passportjs.org, consultado 2026-06-20.
- Framework OAuth 2.0 — https://oauth.net/2, consultado 2026-06-20.

---
[Volver al Índice](./README.es.md)
