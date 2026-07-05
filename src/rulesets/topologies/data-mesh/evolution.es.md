# Guía de Evolución de Malla de Datos

> **Navegación Bilingüe:** [English](./evolution.md) | [Español](./evolution.es.md)

**Propietario:** Arquitectura de Datos
**Topología:** Malla de Datos
**Reglas Relacionadas:** DAM-R08
**ADRs Relacionados:** ADR-0084

## Propósito

Esta guía define la trayectoria evolutiva desde almacenes de datos monolíticos hasta la topología de malla de datos. Cubre etapas de migración, alineación de dominios, progresión de madurez de productos, evolución de esquemas y madurez de federación. La evolución es incremental — los equipos adoptan patrones de malla progresivamente en lugar de en una sola migración.

## Almacén Monolítico a Malla

La migración desde un almacén centralizado sigue una progresión de cuatro etapas: extracción centralizada, extracción de dominio, formalización de producto y operación completa de malla. Cada etapa tiene criterios de salida medibles.

- **Etapa 1 — Extracción Centralizada:** Los dominios comienzan a publicar conjuntos de datos propios como productos. El almacén permanece como capa de consulta principal. La plataforma proporciona descubrimiento junto al catálogo existente.
- **Etapa 2 — Extracción de Dominio:** Los dominios asumen propiedad operativa de sus productos. La plataforma aplica políticas de acceso. El almacén se convierte en uno de muchos consumidores.
- **Etapa 3 — Formalización de Producto:** Todos los productos tienen SLAs, esquemas y contratos declarados. Las consultas interdominio se enrutan a través de la plataforma. El almacén se descompone en almacenes de propiedad de dominio.
- **Etapa 4 — Malla Completa:** La plataforma de autoservicio es la interfaz principal. La gobernanza federada está completamente operativa. Los dominios operan independientemente dentro de los límites de gobernanza.

## Alineación de Dominios

Los límites de dominio para productos de datos se alinean con los límites de dominios de negocio definidos en el mapeo organizacional de dominios. Los dominios de datos no deben crear nuevos límites organizacionales — deben reflejar los existentes.

Cuando los límites de dominio son ambiguos, comenzar con la alineación más gruesa y refinar a medida que los productos maduran. La división prematura de dominios crea sobrecarga de gobernanza sin beneficio para el consumidor.

## Progresión de Madurez del Producto

Los productos de datos evolucionan a través de niveles de madurez que corresponden a su sofisticación operativa:

- **Nivel 1 — Extracción:** Conjunto de datos crudo con metadatos básicos. Sin SLA. Solo uso interno del dominio.
- **Nivel 2 — Producto:** Publicado con esquema, SLA y políticas de acceso. Descubrible a través de la plataforma.
- **Nivel 3 — Gestionado:** Verificaciones de salud activas. SLAs de calidad declarados. Contratos de consumidor registrados.
- **Nivel 4 — Optimizado:** Remediación automatizada de calidad. Linaje interdominio completo. Integrado con la plataforma.

La progresión de madurez es voluntaria y dirigida por el dominio. La plataforma proporciona herramientas para soportar cada nivel pero no impone cronogramas de progresión.

## Evolución de Esquemas (DAM-R08)

Los cambios de esquema siguen reglas de compatibilidad backward definidas en DAM-R08. Los cambios aditivos — campos opcionales nuevos, nuevos endpoints — son no rupturantes. Eliminar o renombrar campos requiere un ciclo de deprecación con notificación a consumidores.

Las versiones de esquema se rastrean en el registro de productos. Los consumidores se fijan a versiones específicas de esquema o declaran tolerancia a cambios. Los cambios rupturantes requieren una nueva versión del producto y soporte de migración.

## Madurez de Federación

La gobernanza federada madura a través de tres fases:

- **Fase 1 — Definición de Estándares:** El órgano central define estándares mínimos. Los dominios autoevalúan cumplimiento.
- **Fase 2 — Ejecución Automatizada:** La plataforma ejecuta estándares en registro y publicación. Las excepciones requieren aprobación del consejo de gobernanza.
- **Fase 3 — Política como Código:** Las reglas de gobernanza se expresan como políticas legibles por máquina. Escaneo automatizado de cumplimiento. Flujos de excepción de autoservicio.

Cada fase se construye sobre la anterior. Saltarse fases crea vacíos de gobernanza que son difíciles de remediar retroactivamente.

## Comandos de Validación

```bash
# Verificar documentación de evolución
node .harness/scripts/ci/01-validate-docs.mjs --target data-mesh

# Verificar paridad bilingüe
node .harness/scripts/ci/04-check-bilingual-parity.mjs
```

---
[Volver al Perfil de Malla de Datos](./README.es.md)
