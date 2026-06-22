# Playbook de Release Zero-Downtime

> **Navegación Bilingüe:** [English Version](./zero-downtime-release.md)

**Fase:** [05 — Delivery and Operations](../README.es.md#fase-05-entrega-y-operaciones)
**Audiencia Principal:** DevOps, SRE, Tech Leads
**Estado:** Aprobado

Este playbook define los procedimientos operativos obligatorios para desplegar release candidates (RCs) en entornos de producción con cero tiempo de inactividad percibido por los usuarios finales. Todos los satélites de Evolith deben adherirse a estas prácticas durante la Fase 5 del SDLC.

---

## 1. Restricciones de Zero-Downtime

Un release solo se considera "zero-downtime" si no se descartan peticiones de usuarios, no ocurren timeouts, ni se sirven códigos de error inesperados durante la transición.

### 1.1 Compatibilidad Hacia Atrás de Base de Datos (Despliegue en Dos Fases)
Los esquemas de base de datos no deben romper las instancias existentes de la aplicación que están procesando tráfico actualmente.
- **Fase 1 (Solo Esquema):** Aplicar migraciones de esquema aditivas (nuevas columnas, tablas, índices). No borrar columnas ni renombrar tablas en uso.
- **Fase 2 (Despliegue de Código):** Desplegar la nueva versión de la aplicación que utiliza el nuevo esquema.
- **Fase 3 (Limpieza):** *Opcional, en un release posterior.* Eliminar tablas o columnas abandonadas una vez que todas las instancias antiguas de la aplicación hayan sido terminadas.

### 1.2 Contratos de API Compatibles Hacia Atrás
Las APIs deben aceptar tanto las estructuras de payload antiguas como las nuevas durante la ventana de transición.
- Nunca introducir cambios de contrato que rompan (ej. remover un campo requerido) sin antes versionar el endpoint.
- Si un cliente depende de un endpoint existente, el nuevo despliegue debe soportar el esquema heredado por toda la duración de la ventana de despliegue.

### 1.3 Apagados Limpios (Graceful Shutdowns)
Las aplicaciones deben manejar elegantemente las señales `SIGTERM` desde la plataforma de orquestación.
- Dejar de aceptar nuevas peticiones inmediatamente.
- Drenar peticiones existentes (permitirles terminar su procesamiento hasta un timeout definido, ej. 30 segundos).
- Cerrar conexiones de base de datos de manera segura antes de salir.

---

## 2. Estrategias de Despliegue

Evolith exige una de dos estrategias de despliegue para operaciones zero-downtime: Blue-Green o Canary.

### 2.1 Despliegue Blue-Green
La estrategia más segura para actualizaciones completas, intercambiando el tráfico enteramente de la versión antigua a la nueva a nivel de balanceador de carga o service mesh.
1. **Aprovisionar Green:** Levantar el entorno completamente nuevo ("Green") junto al entorno de producción actual ("Blue").
2. **Smoke Test:** Ejecutar pruebas de humo automatizadas contra el entorno Green (tráfico interno solamente).
3. **Cutover de Tráfico:** Cambiar el 100% del tráfico del balanceador de carga de Blue a Green.
4. **Validación:** Monitorear Green en busca de anomalías.
5. **Decomisar Blue:** Si Green es estable después de la ventana de monitoreo definida, destruir el entorno Blue.

### 2.2 Despliegue Canary
La estrategia preferida para alto rendimiento o endpoints altamente sensibles, minimizando el radio de explosión al desviar el tráfico gradualmente.
1. **Desplegar Canary:** Desplegar un pequeño subconjunto de nuevos pods/instancias (ej. 5% de capacidad).
2. **Desvío de Tráfico (Bleed):** Enrutar un pequeño porcentaje de tráfico de usuarios reales (ej. 1-5%) hacia el Canary.
3. **Ventana de Validación:** Monitorear tasas de error, latencia y logs del Canary contra la línea base por un periodo establecido (ej. 10 minutos).
4. **Escalamiento:** Incrementar incrementalmente el tráfico (ej. 10% → 25% → 50% → 100%) a medida que aumenta la confianza.
5. **Cutover Completo:** Terminar las instancias antiguas una vez que el 100% del tráfico esté siendo servido exitosamente por el Canary.

---

## 3. Puntos de Control de Observabilidad

El resultado de estos puntos de control se registra en el artefacto de [Validación de Observabilidad](../04-artifact-templates/observability-validation-template.es.md) (evidencia obligatoria de la compuerta Producción Activa). Antes, durante y después del cutover de tráfico, la siguiente telemetría debe ser monitoreada utilizando el stack mandatado por `core/ADR-0046` y `nodejs/ADR-0007`:

- **Tasas de Error (HTTP 5xx):** No deben tener picos por encima de la línea base pre-despliegue.
- **Latencia (p95 y p99):** Deben permanecer dentro de los Objetivos de Nivel de Servicio (SLOs) acordados.
- **Anomalías de Logs:** Vigilar logs de severidad `ERROR` o `FATAL` que contengan stack traces o excepciones no manejadas únicas para el nuevo release.
- **Salud del Sistema:** Pools de conexiones de base de datos, memoria y CPU deben permanecer estables sin throttling agresivo o muertes por OOM (Out of Memory).

---

## 4. Triggers de Rollback

Los rollbacks deben ser instantáneos y no destructivos. Si cualquiera de los siguientes triggers se cumple durante la ventana de observación, el release debe ser abortado inmediatamente, y el tráfico devuelto a las instancias antiguas.

### 4.1 Triggers Automáticos
- **Quema de Presupuesto de Error:** Los errores HTTP 5xx aumentan en >1% durante una ventana móvil de 2 minutos.
- **Picos de Latencia:** La latencia p95 se degrada en >20% por más de 3 minutos consecutivos.
- **Fallas de Health Checks:** La plataforma de orquestación detecta que fallan los liveness/readiness probes en >10% de las nuevas instancias.

### 4.2 Triggers Manuales
- **Alertas de Negocio Críticas:** Caída en transacciones de negocio exitosas (ej. la tasa de éxito de logins cae abruptamente).
- **Corrupción de Datos:** Sospecha de envenenamiento de datos o payloads inválidos siendo escritos en el almacenamiento persistente.
- **Incidentes de Seguridad:** Descubrimiento de una vulnerabilidad expuesta o camino de explotación activo durante el rollout.

Si se activa un rollback, el release se considera fallido. Debe conducirse un post-mortem blameless antes de que el RC pueda ser reconstruido y redesplegado.

---
[Volver a SDLC Governance Center](../README.es.md)
