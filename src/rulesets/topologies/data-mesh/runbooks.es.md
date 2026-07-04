# Guía de Libretas de Operaciones de Malla de Datos

> **Navegación Bilingüe:** [English](./runbooks.md) | [Español](./runbooks.es.md)

**Propietario:** Arquitectura de Datos
**Topología:** Malla de Datos
**Reglas Relacionadas:** DAM-R02, DAM-R07, DAM-R08

## Propósito

Esta guía proporciona libretas de operaciones para escenarios comunes de malla de datos. Cada libreta define procedimientos paso a paso para una tarea operativa específica, incluyendo puntos de decisión, pasos de reversión y comandos de validación.

## Libreta 1 — Despliegue de Producto de Datos

### Disparador
El equipo de dominio ha completado el diseño del producto y está listo para publicar.

### Procedimiento
1. Validar esquema contra reglas de compatibilidad backward según DAM-R08.
2. Verificar que los SLAs de calidad estén declarados y dentro de umbrales de la plataforma.
3. Confirmar que las políticas de acceso estén publicadas y ejecutables.
4. Registrar producto en índice de descubrimiento según DAM-R09.
5. Ejecutar validación de plataforma: `node .harness/scripts/ci/01-validate-docs.mjs --target data-mesh`
6. Publicar producto y verificar actualización del índice de descubrimiento.
7. Notificar a consumidores registrados de la disponibilidad.

### Reversión
Si la publicación falla: eliminar producto del índice de descubrimiento, revertir metadatos de la plataforma, notificar a partes interesadas.

### Validación
- Producto visible en catálogo de descubrimiento
- Versión de esquema coincide con versión registrada
- Políticas de acceso ejecutadas en tiempo de consulta

---

## Libreta 2 — Evolución de Esquemas

### Disparador
El equipo de dominio necesita modificar el esquema de un producto publicado.

### Procedimiento
1. Clasificar el cambio: aditivo (no rupturante) o eliminación/renombrado (rupturante).
2. Para cambios aditivos: actualizar esquema, registrar nueva versión, mantener compatibilidad backward según DAM-R08.
3. Para cambios rupturantes: crear plan de deprecación con cronograma de notificación a consumidores.
4. Actualizar metadatos del producto con nueva versión de esquema.
5. Ejecutar validación: `node .harness/scripts/ci/01-validate-docs.mjs --target data-mesh`
6. Publicar esquema actualizado y notificar a consumidores.
7. Monitorear progreso de migración de consumidores.

### Reversión
Revertir a versión de esquema anterior. Notificar a consumidores de la reversión. Investigar causa raíz.

### Validación
- Versión anterior de esquema accesible durante ventana de deprecación
- Contratos de consumidor actualizados o migración completa
- Sin fallos de consulta contra nuevo esquema

---

## Libreta 3 — Respuesta a Incidentes de Calidad

### Disparador
Una verificación de salud automatizada falla o un consumidor reporta un problema de calidad.

### Procedimiento
1. Acknowledger incidente en sistema de monitoreo de la plataforma.
2. Identificar productos afectados y consumidores downstream.
3. Evaluar severidad: crítico (SLA de consumidor impactado), estándar (calidad degradada), bajo (problema cosmético).
4. Para incidentes críticos: activar estrategias de respaldo según contratos de consumidor.
5. Investigar causa raíz: fallo de flujo, deriva de esquema, corrupción de datos fuente.
6. Implementar corrección: reinicio de flujo, corrección de datos, reversión de esquema.
7. Validar corrección: re-ejecutar verificaciones de salud, verificar completitud y frescura de datos.
8. Documentar incidente y post-mortem.

### Reversión
Si la corrección introduce nuevos problemas: revertir cambios, restaurar desde backup, re-activar respaldos de consumidor.

### Validación
- Verificación de salud vuelve a estado de aprobación
- SLAs de consumidor restaurados
- Incidente documentado con causa raíz

---

## Libreta 4 — Migración de Contrato de Consumidor

### Disparador
Un consumidor necesita migrar a una nueva versión de esquema o producto.

### Procedimiento
1. Identificar versión actual del contrato del consumidor y dependencias.
2. Revisar guía de migración publicada por el dominio productor.
3. Actualizar aplicación del consumidor para soportar nueva versión de esquema.
4. Probar con consultas de validación contra versiones antigua y nueva.
5. Actualizar registro de contrato de consumo en plataforma.
6. Monitorear consultas del consumidor por errores durante transición.
7. Descontinuar uso de versión antigua después de ventana de migración.

### Reversión
Revertir aplicación del consumidor a versión anterior de esquema. Restaurar contrato de consumo anterior.

### Validación
- Consultas del consumidor exitosas contra nuevo esquema
- Sin regresiones de calidad de datos
- Contrato de consumo actualizado en plataforma

---

## Libreta 5 — Remediación de Vacíos de Linaje

### Disparador
La validación de linaje descubre documentación faltante aguas arriba o abajo.

### Procedimiento
1. Identificar el vacío de linaje: fuente aguas arriba faltante, consumidor aguas abajo faltante o transformación no documentada.
2. Contactar equipos de dominio para información de linaje faltante.
3. Actualizar metadatos de linaje en la plataforma.
4. Validar completitud del linaje: `node .harness/scripts/ci/01-validate-docs.mjs --target data-mesh`
5. Verificar que el linaje refleje el flujo real de datos.
6. Documentar excepciones o limitaciones del linaje.

### Reversión
Revertir metadatos de linaje a estado anterior si las actualizaciones introducen errores.

### Validación
- Gráfico de linaje completo para productos afectados
- Sin flujos de datos huérfanos
- Metadatos de linaje coinciden con topología real de flujos

---

## Comandos de Validación

```bash
# Validar procedimientos de libretas
node .harness/scripts/ci/01-validate-docs.mjs --target data-mesh

# Verificar paridad bilingüe
node .harness/scripts/ci/04-check-bilingual-parity.mjs

# Ejecutar panel de cobertura
node .harness/scripts/coverage-dashboard.mjs --area data-mesh
```

---
[Volver al Perfil de Malla de Datos](./README.es.md)
