# Runbooks Sin Servidor

> **Navegación Bilingüe:** [English](./runbooks.md) | [Español](./runbooks.es.md)

**Propietario:** Ingeniería de Plataforma
**Topología:** Sin Servidor

---

## Runbook 1: Fallo en Despliegue de Función

**Disparador:** El pipeline de CI/CD reporta un error de despliegue.

1. Revisar logs de despliegue para detalles del error y stack trace.
2. Verificar permisos del rol IAM para la cuenta de despliegue.
3. Validar configuración de la función (ruta del handler, runtime, memoria, timeout).
4. Asegurar que el paquete de despliegue esté bajo 50 MB (SV-R03).
5. Re-ejecutar el despliegue con logging detallado habilitado.
6. Si persiste, hacer rollback a la última versión conocida como buena e investigar offline.

## Runbook 2: Latencia de Inicio en Frío Excede el Presupuesto

**Disparador:** La latencia p95 de inicio en frío excede 1000 ms (SV-R04).

1. Identificar la función afectada desde el panel de monitoreo.
2. Revisar el tamaño del paquete de despliegue y dependencias.
3. Cambiar a un runtime más ligero si es factible (Node.js, Python).
4. Habilitar concurrencia provisionada para la función.
5. Perfilar la fase de init — identificar código de inicialización pesado.
6. Mover la inicialización fuera del handler donde sea posible.
7. Validar la mejora contra el presupuesto de 1000 ms.

## Runbook 3: Profundidad de DLQ Excede el Umbral

**Disparador:** La profundidad de la DLQ excede cero por más de 5 minutos.

1. Identificar la función de origen y el tipo de evento fallido.
2. Inspeccionar entradas de la DLQ para mensajes de error y payloads.
3. Corregir la causa raíz en la función consumidora.
4. Reprocesar entradas de la DLQ a través de la función de remediación.
5. Verificar que la profundidad de la DLQ regresa a cero.
6. Actualizar umbrales de alerta si el umbral era demasiado sensible.

## Runbook 4: Límite de Concurrencia Excedido

**Disparador:** Invocaciones de función retornan errores de limitación (429).

1. Verificar el uso actual de concurrencia contra la cuota regional.
2. Identificar qué funciones están consumiendo más concurrencia.
3. Aumentar concurrencia reservada para funciones críticas si es necesario.
4. Implementar o ajustar interruptores de circuito en rutas no críticas.
5. Solicitar aumento de cuota si se espera crecimiento sostenido.
6. Monitorear durante 30 minutos después de la remediación para confirmar estabilidad.

## Runbook 5: Investigación de Timeout de Función

**Disparador:** La función excede consistentemente el timeout configurado.

1. Revisar logs de ejecución de la función para operaciones lentas.
2. Verificar latencia de servicios downstream (base de datos, APIs externas).
3. Aumentar el timeout si la carga de trabajo genuinamente requiere más tiempo.
4. Optimizar rutas de código — reducir I/O innecesario, operaciones por lotes.
5. Considerar dividir en funciones más pequeñas si la tarea es demasiado grande.
6. Validar el nuevo timeout contra el presupuesto de latencia de 1500 ms.

---

[Volver al Perfil Sin Servidor](./README.es.md)
