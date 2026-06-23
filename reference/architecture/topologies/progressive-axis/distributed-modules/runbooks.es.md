# Guía de Runbooks de Módulos Distribuidos

> **Navegación Bilingüe:** [English](./runbooks.md) | [Español](./runbooks.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Módulos Distribuidos

## Descripción General

Esta guía proporciona runbooks operativos para escenarios comunes de módulos distribuidos: despliegue de módulo, transiciones de versionado de contratos, aislamiento de fallas, eventos de circuit breaker y fallas de comunicación entre módulos.

## Runbook 1: Despliegue de Módulo

Ejecutar este runbook al desplegar un nuevo módulo o una versión mayor de un módulo existente.

1. **Pre-despliegue**: Verificar registro de contratos, endpoints de salud y estado del pipeline CI/CD.
2. **Despliegue canary**: Desplegar en una sola instancia o subconjunto; monitorear tasas de error y latencia.
3. **Cambio de tráfico**: Cambiar gradualmente el tráfico del 10% al 100%; pausar si la tasa de error excede el umbral.
4. **Validación**: Confirmar que las verificaciones de salud pasan, las trazas se propagan correctamente y los consumidores downstream funcionan.
5. **Despliegue completo**: Completar el despliegue en todas las instancias; verificar capacidad de reversión.
6. **Post-despliegue**: Actualizar descubrimiento de servicios, ejecutar verificaciones de compatibilidad de contratos y notificar a equipos de módulos dependientes.

## Runbook 2: Transición de Versionado de Contratos

Ejecutar este runbook al deprecar una versión de contrato y transicionar consumidores a una nueva versión.

1. **Anunciar deprecación**: Notificar a todos los consumidores de la versión deprecada con la línea de tiempo de deprecación.
2. **Desplegar nueva versión**: Desplegar la nueva versión del contrato junto con la versión antigua.
3. **Migración de consumidores**: Asistir a los consumidores en la migración a la nueva versión; proporcionar guías de migración.
4. **Monitorear uso**: Rastrear el uso de la versión deprecada; identificar consumidores restantes.
5. **Aplicar deprecación**: Después de la ventana de deprecación, deshabilitar la versión antigua para nuevas solicitudes.
6. **Limpieza**: Eliminar código de contrato deprecado y actualizar documentación.

## Runbook 3: Aislamiento de Fallas

Ejecutar este runbook cuando una falla de módulo debe contenerse para prevenir impacto cross-module.

1. **Identificar alcance**: Determinar qué módulo está fallando y qué módulos downstream/upstream están afectados.
2. **Activar circuit breakers**: Confirmar que los circuit breakers se disparan para la dependencia fallida; verificar comportamiento de fail-fast.
3. **Habilitar bulkhead**: Asegurar que el aislamiento de recursos está activo; verificar que otros módulos no estén privados de recursos.
4. **Notificar equipos afectados**: Alertar a los propietarios de módulos de módulos downstream y upstream afectados.
5. **Monitorear degradación**: Rastrear el comportamiento de degradación graceful; confirmar respuestas parciales donde aplique.
6. **Resolver y verificar**: Corregir la causa raíz; verificar que el circuit breaker se cierra y la funcionalidad completa se reanuda.

## Runbook 4: Circuit Breaker Disparado

Ejecutar este runbook cuando un circuit breaker se abre debido a una falla de dependencia downstream.

1. **Confirmar disparo**: Verificar que el estado del circuit breaker es ABIERTO en el tablero de monitoreo.
2. **Identificar causa raíz**: Verificar salud de la dependencia downstream, logs y despliegues recientes.
3. **Evaluar impacto**: Determinar qué consumidores están afectados; verificar activación de degradación graceful.
4. **Intentar recuperación**: Si la dependencia se recupera, observar estado half-open; verificar que las solicitudes de prueba tienen éxito.
5. **Intervención manual**: Si el circuito permanece abierto, coordinar con el equipo del módulo downstream.
6. **Documentar**: Registrar el incidente, causa raíz y resolución en el sistema de seguimiento de incidentes.

## Runbook 5: Falla de Comunicación entre Módulos

Ejecutar este runbook cuando la comunicación entre módulos falla más allá de errores transitorios normales.

1. **Diagnosticar conectividad**: Verificar rutas de red, resolución DNS y registro de descubrimiento de servicios.
2. **Verificar mTLS**: Confirmar que los certificados son válidos y no han expirado; verificar que el handshake mTLS tiene éxito.
3. **Validar contratos**: Asegurar que la versión de contrato que se utiliza sigue registrada y es compatible.
4. **Verificar límites de recursos**: Verificar pools de conexión, límites de concurrencia y configuraciones de timeout.
5. **Escalar**: Si no se resuelve, escalar al equipo de plataforma para investigación de infraestructura.
6. **Restaurar**: Aplicar corrección; verificar que la comunicación se reanuda; actualizar runbook con nuevo modo de falla si aplica.

---

[Volver al Perfil de Módulos Distribuidos](./README.es.md)
