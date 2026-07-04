# Guía de Operaciones de Malla de Datos

> **Navegación Bilingüe:** [English](./operations.md) | [Español](./operations.es.md)

**Propietario:** Arquitectura de Datos
**Topología:** Malla de Datos
**Reglas Relacionadas:** DAM-R01, DAM-R03
**ADRs Relacionados:** ADR-0084

## Propósito

Esta guía define los procedimientos operativos para gestionar los productos de datos a lo largo de su ciclo de vida, desde la designación de dominio hasta la deprecación. Establece el modelo de propiedad de dominio, la gobernanza de la plataforma de autoservicio y el monitoreo de salud de los flujos de datos necesarios para operaciones sostenibles de la malla.

## Modelo de Propiedad de Dominio

Cada dominio es responsable de sus productos de datos de extremo a extremo. Los propietarios de productos de datos de dominio son responsables de la calidad, disponibilidad y cumplimiento de contratos con consumidores. Las transferencias de propiedad requieren una entrega formal con SLAs actualizados y notificación a consumidores.

Los equipos de dominio deben designar un líder de producto de datos que sirva como punto de contacto principal para todos los consumidores. El líder es responsable del esquema, los SLAs de calidad y las decisiones de ciclo de vida del producto.

## Ciclo de Vida del Producto de Datos

Los productos de datos siguen un ciclo de vida de cuatro etapas: borrador, publicado, deprecado y archivado. Cada etapa tiene criterios de entrada y salida explícitos definidos en DAM-R01. Los productos en estado de borrador no son descubribles a través de la plataforma de autoservicio. Los productos deprecados deben mantener compatibilidad backward por un período mínimo de transición.

### Definiciones de Etapa

- **Borrador:** Prototipo interno del dominio. Sin SLA. No descubrible en el catálogo de la plataforma.
- **Publicado:** Listo para consumidores. SLA activo. Registrado en el índice de descubrimiento.
- **Deprecado:** Programado para eliminación. Compatibilidad backward mantenida según DAM-R08. Consumidores notificados.
- **Archivado:** Solo lectura. No se aceptan nuevos consumidores. Política de retención según DAM-R05.

## Gobernanza de la Plataforma de Autoservicio

La plataforma de autoservicio es la interfaz principal para el registro, descubrimiento y consumo de productos de datos. Los equipos de plataforma proporcionan la infraestructura; los equipos de dominio operan sus productos a través de ella.

La gobernanza de la plataforma requiere que todos los metadatos del producto de datos — propiedad, esquema, SLAs, clasificación — estén registrados antes de la publicación. Los productos no registrados no deben aparecer en el índice de descubrimiento.

## Monitoreo de Flujos de Datos

Los equipos de dominio son responsables de monitorear sus flujos de ingesta y la frescura de las salidas. La plataforma proporciona paneles de observabilidad centralizados; los equipos configuran sus propios umbrales de alerta alineados con los SLAs del producto.

Dimensiones clave de monitoreo: latencia del flujo, frescura de salida, conteo de registros, deriva de esquema y tasas de error. Todas las métricas deben exponerse a través de la plataforma de autoservicio para visibilidad interdominio.

## Verificaciones de Salud del Producto

Las verificaciones de salud automatizadas se ejecutan en un horario configurable. El estado de salud se publica en el índice de descubrimiento y es consumido por productos dependientes. Los criterios de verificación incluyen frescura, completitud, unicidad y validez de datos según DAM-R07.

Los productos que fallan las verificaciones se marcan en el catálogo de la plataforma y activan notificaciones a consumidores dentro de la ventana de alerta configurada.

## Comandos de Validación

```bash
# Verificar registro del producto
node .harness/scripts/ci/01-validate-docs.mjs --target data-mesh

# Verificar paridad bilingüe
node .harness/scripts/ci/04-check-bilingual-parity.mjs

# Ejecutar panel de cobertura
node .harness/scripts/coverage-dashboard.mjs --area data-mesh
```

---
[Volver al Perfil de Malla de Datos](./README.es.md)
