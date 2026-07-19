# Guía de Patrones del Monolito Modular

> **Navegación Bilingüe:** [English](./patterns.md) | [Español](./patterns.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Monolito Modular

---

## Esquema por Dominio (ADR-0067)

Cada contexto delimitado posee su esquema de base de datos exclusivamente. Los esquemas compartidos están prohibidos; el acceso a datos entre módulos solo ocurre a través de APIs publicadas.

- **Convención de nomenclatura:** `{nombre_modulo}_{entidad_dominio}` — ej., `orders_line_items`, `inventory_stock_levels`
- **Propiedad del esquema:** Cada equipo de módulo posee y evoluciona su esquema independientemente
- **Estrategia de migración:** Cada módulo ejecuta migraciones de forma independiente; sin dependencias de migración entre módulos
- **Integridad referencial:** Las claves foráneas entre esquemas de módulos están prohibidas; usar referencias a nivel de aplicación

```
Módulo: order-management
  Esquema: order_mgmt
  Tablas: orders, order_items, order_status_history

Módulo: inventory
  Esquema: inventory
  Tablas: stock_levels, stock_movements, warehouse_locations
```

## Preparación Higo Estrangulador (ADR-0045)

El monolito modular está diseñado para extracción eventual. El código se estructura para que los módulos puedan extraerse quirúrgicamente sin reescritura.

- **Interfaces limpias:** Cada módulo expone un límite de API bien definido
- **Sin estado compartido:** Los módulos no comparten estado en memoria ni variables estáticas
- **Independencia de base de datos:** El esquema de cada módulo puede migrarse a una base de datos independiente
- **Emisión de eventos:** Los módulos publican eventos de dominio a los que los servicios extraídos pueden suscribirse

**Puntuación de preparación para extracción:** **MM-R07** exige que cada módulo rastree una puntuación de preparación para extracción y la mantenga en **>= 70%** para pasar la puerta de Diseño de Fase 2 cuando se planifica F2. Los criterios de calificación subyacentes provienen de **ADR-0045**, que no define ningún porcentaje: un módulo califica para extracción solo si cumple **al menos 2 de 4** criterios (latencia P95 > 200 ms; > 4 despliegues independientes por semana; > 80% de commits de una sola squad; carga de BD > 20% del total de instancias) sostenidos durante **al menos 15 días**.

## Patrón Data Mapper y Repository

Los módulos utilizan los patrones Data Mapper y Repository para desacoplar la lógica de dominio de la persistencia. Active Record está prohibido.

- **Entidades de dominio:** Objetos de negocio puros sin conciencia de persistencia
- **Interfaces de repository:** Definidas en la capa de dominio; implementaciones en la capa de infraestructura
- **Data mappers:** Transforman entre entidades de dominio y modelos de persistencia
- **Unidad de trabajo:** Los límites de transacción se gestionan a nivel de módulo

```
Capa de Dominio:
  Order (entidad)
  OrderRepository (interfaz)

Capa de Infraestructura:
  PostgresOrderRepository (implementación)
  OrderDataMapper (lógica de mapeo)
```

## Puertos y Adaptadores (Arquitectura Hexagonal)

Cada módulo sigue internamente la arquitectura hexagonal. Las integraciones externas son adaptadores; la lógica de negocio es el puerto.

- **Puertos:** Interfaces que definen lo que el módulo necesita del mundo exterior
- **Adaptadores:** Implementaciones que conectan puertos con sistemas externos (bases de datos, APIs, brokers de mensajes)
- **Adaptadores conductores:** Entrantes (controladores de API, manejadores de eventos)
- **Adaptadores conducidos:** Salientes (repositorios de bases de datos, clientes de API externos)

## Contratos de Límite de Módulo

Toda interacción entre módulos está gobernada por un contrato formal. Las interacciones no documentadas son violaciones.

> **Estado de gobierno:** ninguna regla MM especifica formato de contrato, versionado ni obsolescencia. MM-R05 gobierna la separación de bases de datos y MM-R06 el uso de eventos de dominio para reacciones asíncronas; ninguna cubre las prácticas siguientes. Tratar esta sección como convención de la Junta, no como regla ejecutable.

- **Formato del contrato:** Especificación OpenAPI o formato equivalente legible por máquina
- **Versionado:** Los contratos siguen versionado semántico; los cambios de ruptura requieren planes de migración
- **Validación:** El cumplimiento del contrato se prueba en CI; las violaciones fallan la compilación
- **Obsolescencia:** Los contratos se deprecian por un mínimo de 2 ciclos de liberación antes de su eliminación

---

[Volver al Perfil de Monolito Modular](./README.es.md)
