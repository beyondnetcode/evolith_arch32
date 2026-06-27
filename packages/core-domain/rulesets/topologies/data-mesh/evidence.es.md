# Guía de Evidencia de Malla de Datos

> **Navegación Bilingüe:** [English](./evidence.md) | [Español](./evidence.es.md)

**Propietario:** Arquitectura de Datos
**Topología:** Malla de Datos
**Reglas Relacionadas:** DAM-R04, DAM-R07
**ADRs Relacionados:** ADR-0084

## Propósito

Esta guía define los procedimientos de recolección y validación de evidencia para la topología de malla de datos. La evidencia valida que los productos de datos cumplen con sus SLAs de calidad declarados, los contratos son conformes, el linaje está completo y el catálogo de descubrimiento es preciso.

## Comandos de Validación

### Validación de Documentación

```bash
# Validación completa de documentación
node .harness/scripts/ci/01-validate-docs.mjs

# Validar contenido específico de data-mesh
node .harness/scripts/ci/01-validate-docs.mjs --target data-mesh

# Renderizar diagramas Mermaid para validación visual
node .harness/scripts/ci/01-validate-docs.mjs --render-mermaid
```

### Validación Bilingüe

```bash
# Verificar paridad estructural EN/ES
node .harness/scripts/ci/04-check-bilingual-parity.mjs

# Verificar cobertura bilingüe
node .harness/scripts/bilingual-coverage.mjs

# Generar esqueleto ES desde archivo EN
node .harness/scripts/generate-es-skeleton.mjs <file.md> --dry-run
```

### Cobertura y Calidad

```bash
# Generar reporte visual de cobertura
node .harness/scripts/coverage-dashboard.mjs

# Ejecutar auditoría profunda de Wilson
node .harness/scripts/run-wilson-audit.mjs

# Sanear problemas de codificación
python ./.bmad-core/scripts/cleanup_markdown_encoding.py
```

## Métricas de Calidad

### Completitud

Mide la proporción de valores no nulos respecto al total de registros esperados. Los productos deben declarar umbrales de completitud como parte de sus SLAs de calidad. La completitud por debajo del umbral activa notificaciones a consumidores.

Métricas objetivo: productos críticos >99.9%, productos estándar >99%, productos mejor esfuerzo >95%.

### Frescura

Mide el tiempo transcurrido entre la actualización de datos fuente y la disponibilidad del producto. La frescura se rastrea contra SLAs declarados. Los productos que incumplen SLAs de frescura se marcan en el catálogo de la plataforma.

Granularidad de monitoreo: por producto, por dominio, por cadena de dependencias interdominio.

### Validez

Valida que los valores de datos se conformen a esquemas declarados y reglas de negocio. Las verificaciones de validez se ejecutan en tiempo de ingesta y bajo demanda. Los registros inválidos se cuarentenan y reportan.

Métricas de validez: tasa de cumplimiento de esquema, tasa de aprobación de reglas de negocio, tasa de detección de valores atípicos.

### Unicidad

Asegura que no existan registros duplicados dentro de los conjuntos de datos del producto. Las restricciones de unicidad se declaran en los esquemas del producto. La detección de duplicados se ejecuta durante la ingesta y como validación por lotes.

Métricas de unicidad: tasa de detección de duplicados, unicidad de clave primaria, unicidad de clave compuesta.

## Completitud del Catálogo

El catálogo de descubrimiento debe contener metadatos precisos para todos los productos publicados. La completitud del catálogo se mide contra: declaración de propiedad, registro de esquema, declaración de SLA, asignación de clasificación e información de contacto.

Objetivos de completitud del catálogo: 100% para productos publicados, >90% para productos en borrador. Las entradas incompletas se marcan en reportes de salud de la plataforma.

## Evidencia de Linaje (DAM-R04)

El rastreo de linaje debe cubrir fuentes aguas arriba, lógica de transformación y consumidores aguas abajo. La evidencia de linaje se recopila a través de: instrument automatizada de flujos, anotación manual e integración con la plataforma.

La completitud del linaje se mide como: porcentaje de productos con fuentes aguas arriba documentadas, porcentaje con consumidores aguas abajo documentados y porcentaje con lógica de transformación anotada.

## Cumplimiento de Contratos

El cumplimiento de contratos valida que los productos se adhieren a sus esquemas declarados, garantías de calidad y políticas de acceso. Las verificaciones de cumplimiento se ejecutan automáticamente contra contratos publicados.

Métricas de cumplimiento: tasa de adherencia al esquema, tasa de cumplimiento de SLA, conteo de violaciones de políticas de acceso. Los productos no conformes se marcan y requieren remediación dentro de la ventana definida por la gobernanza.

## Lista de Verificación

- [ ] Todos los productos publicados registrados en catálogo de descubrimiento
- [ ] Versiones de esquema actuales y compatibles backward
- [ ] SLAs de calidad declarados y monitoreados
- [ ] Políticas de acceso publicadas y ejecutadas
- [ ] Documentación de linaje completa para aguas arriba y abajo
- [ ] Campos PII declarados y con control de acceso
- [ ] Estado de encriptación verificado
- [ ] Cumplimiento de SLA dentro de tolerancia

---
[Volver al Perfil de Malla de Datos](./README.es.md)
