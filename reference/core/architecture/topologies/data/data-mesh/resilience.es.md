# Guía de Resiliencia de Malla de Datos

> **Navegación Bilingüe:** [English](./resilience.md) | [Español](./resilience.es.md)

**Propietario:** Arquitectura de Datos
**Topología:** Malla de Datos
**Reglas Relacionadas:** DAM-R07
**ADRs Relacionados:** ADR-0084

## Propósito

Esta guía define las prácticas de resiliencia para los productos de datos en una topología de malla. Cubre gestión de SLAs, estrategias de respaldo, caché, monitoreo de disponibilidad, recuperación de fallos de flujos y garantías de frescura. La resiliencia es de propiedad del dominio pero validada por la plataforma.

## SLAs de Productos de Datos

Cada producto de datos publicado debe declarar un SLA que cubra disponibilidad, frescura y completitud. Los SLAs se registran en la plataforma de autoservicio y se utilizan para verificaciones de salud automatizadas según DAM-R07.

Niveles de SLA: crítico (99.9% disponibilidad, <1h frescura), estándar (99% disponibilidad, <4h frescura), mejor esfuerzo (sin garantía de disponibilidad, frescura al mejor esfuerzo). Los consumidores seleccionan productos según la alineación de SLA con sus requisitos.

## Consultas de Respaldo

Los consumidores deben definir estrategias de respaldo para fallos de productos aguas arriba. Las estrategias incluyen: leer de capturas en caché, cambiar a productos de menor fidelidad o pausar procesamiento dependiente. La configuración de respaldo es parte del contrato del consumidor.

Los equipos de dominio deben documentar el comportamiento de respaldo en los READMEs de productos y ponerlo disponible a través de la plataforma de autoservicio para orquestación automatizada.

## Caché

La plataforma proporciona caché incorporado para productos de acceso frecuente. Los dominios pueden configurar políticas de caché por producto según requisitos de frescura y patrones de acceso. La invalidación de caché se activa por fallos en verificaciones de salud o cambios de esquema.

Los datos en caché deben respetar los mismos controles de acceso que el producto fuente. El TTL de caché se alinea con el SLA de frescura del producto.

## Monitoreo de Disponibilidad

La infraestructura de la plataforma proporciona monitoreo de disponibilidad centralizado para todos los productos publicados. Los equipos de dominio configuran umbrales de alerta alineados con sus SLAs declarados. Las métricas de disponibilidad se publican en el índice de descubrimiento para consumo de los consumidores.

El monitoreo cubre: accesibilidad de extremos, tasas de éxito de consultas, percentiles de latencia y categorización de errores. Las interrupciones se clasifican y escalan por nivel de severidad.

## Recuperación de Fallos de Flujos

Los equipos de dominio definen procedimientos de recuperación para sus flujos de ingesta. Los procedimientos de recuperación deben documentarse y probarse. La plataforma proporciona patrones de circuit-breaker para consumidores downstream cuando fallan flujos aguas arriba.

Los procedimientos de recuperación deben incluir: lógica de reintento automático, colas de cartas muertas para registros no procesables, disparadores de intervención manual y validación posterior a la recuperación. Todas las acciones de recuperación se registran para fines de auditoría.

## Garantías de Frescura

Los SLAs de frescura especifican el retraso máximo aceptable entre actualizaciones de datos fuente y disponibilidad del producto. La plataforma rastrea métricas de frescura contra SLAs declarados. Los consumidores pueden consultar el estado de frescura a través de la plataforma de autoservicio.

Los productos que incumplen SLAs de frescura se marcan automáticamente. Los consumidores reciben notificaciones según sus preferencias de alerta configuradas. Las violaciones de frescura activan el proceso de respuesta a incidentes de calidad.

## Comandos de Validación

```bash
# Validar declaraciones de SLA
node .harness/scripts/ci/01-validate-docs.mjs --target data-mesh

# Verificar paridad bilingüe
node .harness/scripts/ci/04-check-bilingual-parity.mjs

# Ejecutar verificación de cobertura
node .harness/scripts/coverage-dashboard.mjs --area data-mesh
```

---
[Volver al Perfil de Malla de Datos](./README.es.md)
