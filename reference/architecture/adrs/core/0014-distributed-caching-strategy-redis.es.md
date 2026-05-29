# [ADR 0014](0014-distributed-caching-strategy-redis.md): Estrategia de Caché Distribuido Multi-Capa

## Estado
Aprobado

## Fecha
2026-05-08

## Contexto
El rendimiento de lectura repetitivo y de alta intensidad durante las horas pico de operación puede agotar completamente los recursos físicos de PostgreSQL. Leer catálogos de configuración genéricos, realizar búsquedas de estado constantes o acceder frecuentemente a agregados desde discos en bruto conduce a respuestas lentas y escalas de carga inmanejables.

## Decisión
Evolucionar hacia una **Estrategia de Caché Escalonado Multi-Capa** integral utilizando almacenamiento en caché en el borde de CDN y nodos Redis distribuidos para interceptar y resolver las peticiones de lectura lo más cerca posible del usuario:

### Nivel 1: Borde Público (CDN Opcional y Configurable)
El sistema soporta la integración de una Red de Distribución de Contenidos (CDN) (ej. Cloudflare, Akamai) desplegada delante del Gateway Kong Edge. Esta capa es **totalmente opcional y configurable dinámicamente** en los ajustes de topología de infraestructura; los despliegues a pequeña escala pueden desactivar esta capa para enrutar directamente al origen, mientras que el escalado Enterprise puede activarla vía configuración de entorno.
* **Alcance**: Activos estáticos de la aplicación (JS, CSS, imágenes), archivos de branding multi-tenant, y APIs de catálogo público de solo lectura con baja volatilidad.
* **Impacto**: Cero utilización del origen del servidor para las peticiones que coincidan.

### Nivel 2: Borde de Aplicación (Caché Redis a Nivel de BFF)
Desplegar namespaces de caché de Redis vinculados directamente a las instancias NestJS BFF del Tier-2.
* **Alcance**: Modelos de Vista a medida, respuestas JSON de tableros compilados y segmentos agregados de GraphQL.
* **Impacto**: Intercepta los ciclos de peticiones repetidas EN EL PERíMETRO, evitando por completo los recorridos síncronos gRPC aguas abajo hacia la capa API central.

### Nivel 3: Núcleo Profundo (Caché Redis de Aplicación)
Retener namespaces Redis compartidos dedicados que sirvan al dominio de la API Core.
* **Alcance**: Conjuntos de consultas relacionales, Gráficos de Autorización, matrices de permisos activos y agregados de Dominio deshidratados.
* **Abstracción**: El acceso permanece gobernado estrictamente vía la interfaz `ICachePort` adhiriéndose a las reglas de pureza Hexagonal.

## Consecuencias

### Positivas
- Descarga un inmenso volumen de consultas del motor SQL relacional.
- Logra que los picos de latencia de la API se sitúen frecuentemente por debajo de <50ms para objetos pre-calentados.
- Impulsa el compromiso del usuario y la fluidez de la experiencia para zonas críticas de la aplicación.

### Negativas
- La lógica de Invalidez de Caché crea un área de superficie no trivial para bugs de sincronización (regla de "El Caché es difícil").
- Introduce la configuración de nodos de hardware adicionales relacionados con la persistencia en los blueprints de operación.

## Referencias
- [Patrón Redis Cache-Aside](https://redis.io/docs/develop/cache/)
- [ADR-0002: Arquitectura Hexagonal Limpia](../../adrs/nodejs/0002-clean-architecture-nestjs.md)

---
[Volver al Índice](./README.es.md)
