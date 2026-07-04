# Guía de Runbooks del Monolito Modular

> **Navegación Bilingüe:** [English](./runbooks.md) | [Español](./runbooks.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Monolito Modular

---

## Runbook 1: Escalado de Módulo

**Activador:** La utilización de CPU/memoria del módulo excede el 80% durante 5+ minutos; la latencia p99 de solicitudes excede 300ms.

**Pasos:**

1. Identificar el módulo afectado a través del tablero de salud agregada
2. Verificar métricas específicas del módulo (latencia de consultas, uso del pool de conexiones, saturación del pool de hilos)
3. Si un solo módulo está sobrecargado: escalar el monolito horizontalmente; todos los módulos escalan juntos
4. Si el módulo tiene un cuello de botella en la base de datos: verificar consultas lentas, índices faltantes, agotamiento del pool de conexiones
5. Si el escalado es insuficiente: evaluar la extracción del módulo a F2 para escalado independiente

**Escalamiento:** Si el escalado horizontal no resuelve en 15 minutos, escalar a la Junta de Arquitectura.

**Post-incidente:** Documentar límites de escalado; evaluar si el módulo es candidato de extracción.

## Runbook 2: Migración de Esquema

**Activador:** La migración de esquema del módulo falla o causa degradación de rendimiento.

**Pasos:**

1. Verificar estado de la migración: `npm run db:migration:status --module={module}`
2. Si la migración está bloqueada: verificar conectividad de la base de datos y estado de bloqueos
3. Si la migración causó degradación: revertir la migración usando el script de reversión específico del módulo
4. Si se detecta corrupción de datos: activar recuperación a punto en el tiempo para la base de datos del módulo afectado
5. Verificar la salud del módulo después de la recuperación; verificar módulos dependientes por problemas en cascada

**Procedimiento de reversión:**

```bash
# Revertir última migración para módulo específico
npm run db:migration:rollback --module={module} --target={previous_version}

# Verificar reversión
npm run db:migration:status --module={module}
npm run health:module --module={module}
```

**Prevención:** Siempre probar migraciones en staging; usar migraciones compatibles con versiones anteriores; mantener scripts de reversión.

## Runbook 3: Aislamiento de Fallos de Módulo

**Activador:** Un solo módulo reporta fallos repetidos; otros módulos permanecen saludables.

**Pasos:**

1. Confirmar qué módulo está fallando a través de endpoints de salud
2. Verificar estado del interruptor de circuito para el módulo con fallos
3. Si el interruptor de circuito está abierto: verificar que los módulos dependientes se estén degradando con gracia
4. Si el módulo está en bucle de caída: verificar registros para la causa raíz; reiniciar el proceso del módulo
5. Si la base de datos del módulo está caída: promotes réplica de lectura a primaria; verificar consistencia de datos
6. Si el fallo es persistente: aislar el módulo; redirigir tráfico a modo degradado

**Modo degradado:** Funciones no críticas desactivadas; operaciones principales continúan; usuarios notificados de funcionalidad reducida.

## Runbook 4: Recuperación de Base de Datos

**Activador:** La base de datos del módulo no está disponible o está corrupta.

**Pasos:**

1. Identificar módulo e instancia de base de datos afectados
2. Verificar salud de la base de datos: conectividad, retraso de replicación, espacio en disco
3. Si el primario está caído: promover réplica de lectura a primaria
4. Si hay corrupción de datos: restaurar desde el último backup conocido bueno
5. Verificar que el módulo puede conectarse a la base de datos recuperada
6. Ejecutar verificaciones de consistencia de datos para el módulo afectado
7. Notificar a módulos dependientes de la recuperación; verificar que los interruptores de circuito se cierren

**Objetivo de tiempo de recuperación (RTO):** 30 minutos para recuperación de base de datos del módulo.
**Objetivo de punto de recuperación (RPO):** Máximo 5 minutos de pérdida de datos.

## Runbook 5: Reversión de Despliegue

**Activador:** El despliegue en producción causa fallos; la salud agregada se degrada dentro de la ventana de 10 minutos.

**Pasos:**

1. Monitorear el tablero de salud agregada para patrón de degradación
2. Si se detecta degradación dentro de 10 minutos: activar reversión automática
3. Si la reversión automática falla: reversión manual a la versión anterior
4. Verificar que todos los endpoints de salud de módulos retornen estado saludable
5. Verificar registros de despliegue para la causa raíz del fallo
6. Notificar a la Junta de Arquitectura; programar post-mortem

**Procedimiento de reversión:**

```bash
# Reversión automática (preferida)
npm run deploy:rollback --env=production

# Reversión manual (si la automática falla)
npm run deploy:rollback --env=production --version={previous_version}

# Verificar reversión
npm run health:aggregate
npm run test:smoke --env=production
```

**Post-reversión:** Bloquear despliegue hasta que se identifique y corrija la causa raíz; re-ejecutar pipeline CI completo antes de reintentar el despliegue.

---

[Volver al Perfil de Monolito Modular](./README.es.md)
