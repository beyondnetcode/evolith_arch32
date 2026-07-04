# ADR-0014: Estrategia de Caché Distribuido Multi-Capa

## Estado
Aprobado

## Fecha
2026-05-08

## Contexto y Problema
El rendimiento de lectura repetitivo y de alta intensidad durante las horas pico de operación puede agotar completamente los recursos físicos de la base de datos. Leer catálogos de configuración genéricos, realizar búsquedas de estado constantes o acceder frecuentemente a agregados desde discos en bruto conduce a respuestas lentas y escalas de carga inmanejables.

## Objetivo y Alcance
Establecer un límite estándar y topología de caché para interceptar y resolver las peticiones de lectura lo más cerca posible del usuario, previniendo el agotamiento de recursos aguas abajo.

## Opciones Consideradas
- **Seleccionada:** Estrategia de Caché Distribuido Multi-Capa
- **Otras:** Desconocido (el registro histórico no enumera explícitamente alternativas rechazadas, pero el almacenamiento en caché de una sola capa o el escalado vertical de las bases de datos fueron rechazados implícitamente).

## Decisión y Justificación
Evolucionar hacia una **Estrategia de Caché Escalonado Multi-Capa** integral utilizando almacenamiento en caché en el borde de CDN y nodos de caché distribuidos para interceptar y resolver las peticiones de lectura lo más cerca posible del usuario:

### Nivel 1: Borde Público (CDN Opcional y Configurable)
El sistema soporta la integración de una Red de Distribución de Contenidos (CDN) desplegada delante del Edge Gateway. Esta capa es **totalmente opcional y configurable dinámicamente** en los ajustes de topología de infraestructura; los despliegues a pequeña escala pueden desactivar esta capa para enrutar directamente al origen, mientras que el escalado Enterprise puede activarla vía configuración de entorno.
* **Alcance**: Activos estáticos de la aplicación (JS, CSS, imágenes), archivos de branding multi-tenant, y APIs de catálogo público de solo lectura con baja volatilidad.
* **Impacto**: Cero utilización del origen del servidor para las peticiones que coincidan.

### Nivel 2: Borde de Aplicación (Caché Distribuido a Nivel de BFF)
Desplegar namespaces de caché distribuido vinculados directamente a las instancias Application Gateway (BFF) del Tier-2.
* **Alcance**: Modelos de Vista a medida, respuestas JSON de tableros compilados y segmentos agregados de GraphQL.
* **Impacto**: Intercepta los ciclos de peticiones repetidas EN EL PERíMETRO, evitando por completo los recorridos síncronos aguas abajo hacia la capa API central.

### Nivel 3: Núcleo Profundo (Caché de Aplicación)
Retener namespaces de caché compartidos dedicados que sirvan al dominio de la API Core.
* **Alcance**: Conjuntos de consultas relacionales, Gráficos de Autorización, matrices de permisos activos y agregados de Dominio deshidratados.
* **Abstracción**: El acceso permanece gobernado estrictamente vía una interfaz agnóstica `ICachePort` adhiriéndose a las reglas de pureza Hexagonal. *(Ejemplo de implementación: Redis)*.

## Evidencias y Criterios de Evaluación
Evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad. El almacenamiento en caché por niveles descarga volumen de consultas del motor relacional, logrando picos de latencia frecuentemente por debajo de <50ms para objetos pre-calentados.

## Consecuencias, Riesgos y Trade-offs

### Positivas
- Descarga un inmenso volumen de consultas del motor de base de datos relacional.
- Logra que los picos de latencia de la API se sitúen frecuentemente por debajo de <50ms para objetos pre-calentados.
- Impulsa el compromiso del usuario y la fluidez de la experiencia para zonas críticas de la aplicación.

### Negativas
- La lógica de Invalidez de Caché crea un área de superficie no trivial para bugs de sincronización (regla de "El Caché es difícil").
- Introduce la configuración de nodos de hardware adicionales relacionados con la persistencia en los blueprints de operación.

## Referencias
- [Patrón Cache-Aside](https://learn.microsoft.com/es-es/azure/architecture/patterns/cache-aside)

## Decisiones y Estándares Relacionados
- Ninguna

---
[Volver al Índice](./README.es.md)

> **Agent Signature:** Architect Agent
