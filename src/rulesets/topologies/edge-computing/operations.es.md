# Guía de Operaciones de Computación en el Borde

> **Navegación Bilingüe:** [English](./operations.md) | [Español](./operations.es.md)

**Propietario:** Ingeniería de Plataforma
**Topología:** Computación en el Borde

## Gestión del Ciclo de Vida de Nodos

Los nodos del borde siguen un ciclo de vida definido: aprovisionamiento, registro, activación, monitoreo, mantenimiento y baja.

### Aprovisionamiento

```bash
# Registrar un nuevo nodo del borde
edge-cli node register \
  --node-id edge-node-01 \
  --region us-west-2 \
  --zone us-west-2a \
  --role compute \
  --capacity "cpu=4,memory=8Gi,storage=50Gi"
```

### Monitoreo de Salud

Cada nodo reporta métricas de salud cada 15 segundos:

| Métrica | Umbral | Acción al Exceder |
|---------|--------|-------------------|
| Latencia al origen | > 200ms | Activar conmutación por error |
| Utilización de CPU | > 85% | Reducir cargas no críticas |
| Uso de memoria | > 90% | Expulsar caché de menor uso |
| Uso de disco | > 80% | Purgar contenido obsoleto |
| Retraso de sincronización | > 30s | Escalar a operaciones |

## Monitoreo de Sincronización de Contenido (Ref: EC-R01)

La estrategia de sincronización garantiza la consistencia del contenido en toda la flota del borde.

### Panel de Salud de Sincronización

```bash
# Verificar estado de sincronización en todos los nodos
edge-cli sync status --fleet-wide --format table

# Salida:
# NODE           LAST_SYNC    LAG     STATUS
# edge-node-01   2026-06-23   2s      healthy
# edge-node-02   2026-06-23   45s     degraded
# edge-node-03   2026-06-22   4h      offline
```

### Estrategias de Sincronización

| Estrategia | Caso de Uso | Consistencia | Rendimiento |
|------------|-------------|--------------|-------------|
| Basada en envío | Activos estáticos | Fuerte | Alto ancho de banda |
| Basada en solicitud | Contenido dinámico | Eventual | Bajo demanda |
| Híbrida | Cargas de trabajo mixtas | Ajustable | Equilibrado |

## Medición de Latencia (Presupuesto de 200ms)

La latencia de extremo a extremo se mende desde la solicitud del cliente hasta la entrega de la respuesta.

### Puntos de Medición

1. **Cliente → Nodo del borde**: Resolución DNS +握手 TCP + TLS
2. **Procesamiento del borde**: Tiempo de ejecución de la función
3. **Borde → Origen** (en caso de fallo): Penalización por fallo de caché
4. **Entrega de respuesta**: Serialización + transferencia

### Desglose del Presupuesto de Latencia

| Segmento | Presupuesto | Actual | Estado |
|----------|-------------|--------|--------|
| Resolución DNS | 20ms | 12ms | [PASS] |
| Handshake TLS | 40ms | 35ms | [PASS] |
| Procesamiento del borde | 50ms | 42ms | [PASS] |
| Fallo de caché (p95) | 80ms | 78ms | [PASS] |
| Sobrecarga de transferencia | 10ms | 8ms | [PASS] |
| **Total** | **200ms** | **175ms** | **[PASS]** |

### Reglas de Alerta

```yaml
alerts:
  - name: edge-latency-p99
    condition: latency_p99 > 200ms
    severity: critical
    action: page-oncall
  - name: edge-latency-p95
    condition: latency_p95 > 180ms
    severity: warning
    action: notify-slack
```

## Operaciones sin Conexión (Ref: EC-R02)

Los nodos del borde deben continuar sirviendo contenido en caché cuando se desconectan del origen.

### Matriz de Capacidades sin Conexión

| Capacidad | Disponible sin Conexión | Sincronización Requerida |
|-----------|-------------------------|--------------------------|
| Lectura de contenido en caché | Sí | No |
| Servir activos estáticos | Sí | No |
| Ejecutar funciones del borde | Sí (en caché) | Al reconectar |
| Operaciones de escritura | En cola local | Sincronización en segundo plano |
| Autenticación | Tokens en caché | Actualizar al reconectar |

### Detección sin Conexión

```bash
# Monitorear conectividad con el origen
edge-cli connectivity monitor \
  --interval 5s \
  --threshold 3 failures \
  --action enter-offline-mode
```

## Gestión de Flota

### Actualizaciones Escalonadas

```bash
# Actualizar flota en incrementos del 10%
edge-cli fleet update \
  --image edge-runtime:2.4.1 \
  --strategy rolling \
  --batch-size 10% \
  --pause-on-failure-rate 5%
```

### Planificación de Capacidad

```bash
# Ver resumen de capacidad de la flota
edge-cli fleet capacity --format json

# Métricas clave:
# - Nodos totales: 24
# - Capacidad de cómputo activa: 96 vCPUs
# - Capacidad de almacenamiento: 1.2Ti
# - Utilización actual: 62%
```

---
[Volver al Perfil de Computación en el Borde](./README.es.md)
