# Guía de Evidencia de Computación en el Borde

> **Navegación Bilingüe:** [English](./evidence.md) | [Español](./evidence.es.md)

**Propietario:** Ingeniería de Plataforma
**Topología:** Computación en el Borde

## Comandos de Validación

Ejecutar estos comandos para validar el rendimiento y cumplimiento de la computación en el borde.

### Verificación de Salud

```bash
# Validar salud del nodo del borde
edge-cli health check --node edge-node-01 --verbose

# Salida:
# NODE: edge-node-01
# STATUS: healthy
# UPTIME: 14d 6h 32m
# CPU: 45%
# MEMORY: 62%
# DISK: 38%
# NETWORK: 12ms avg latency
# LAST_SYNC: 2s ago
```

### Estado de la Flota

```bash
# Verificar estado de toda la flota
edge-cli fleet status --format table

# Salida:
# NODE           STATUS    UPTIME    CPU    MEMORY  DISK    LATENCY
# edge-node-01   healthy   14d       45%    62%     38%     12ms
# edge-node-02   healthy   7d        52%    71%     45%     15ms
# edge-node-03   degraded  3d        78%    85%     62%     28ms
# edge-node-04   healthy   14d       38%    55%     41%     11ms
```

## Validación de Latencia (Presupuesto de 200ms)

Validar que todas las solicitudes se completen dentro del presupuesto de latencia de 200ms.

### Prueba de Latencia

```bash
# Ejecutar prueba de validación de latencia
edge-cli latency test \
  --samples 1000 \
  --target 200ms \
  --percentile p99 \
  --output results.json

# Salida:
# SAMPLES: 1000
# TARGET: 200ms
# P50: 45ms
# P90: 120ms
# P95: 165ms
# P99: 185ms
# MAX: 198ms
# STATUS: PASS
```

### Desglose de Latencia

```bash
# Analizar desglose de latencia
edge-cli latency breakdown --sample last-1000

# Salida:
# SEGMENTO               P50     P90     P95     P99
# Resolución DNS         8ms     12ms    15ms    18ms
# Handshake TLS          25ms    35ms    40ms    45ms
# Procesamiento Borde    12ms    25ms    35ms    48ms
# Fallo de Caché (p95)   0ms     0ms     0ms     0ms
# Transferencia          5ms     8ms     10ms    12ms
# TOTAL                  50ms    80ms    100ms   123ms
```

### Monitoreo Continuo

```bash
# Configurar monitoreo continuo de latencia
edge-cli latency monitor \
  --interval 60s \
  --alert-threshold 180ms \
  --page-threshold 200ms \
  --notify slack
```

## Tasas de Acerto en Caché

Validar la eficiencia de la caché en toda la flota del borde.

### Estadísticas de Caché

```bash
# Verificar tasas de acerto en caché
edge-cli cache stats --fleet-wide

# Salida:
# NODE           HIT_RATE  MISS_RATE  EVICTIONS  SIZE
# edge-node-01   94.2%     5.8%       12,450     2.3Gi
# edge-node-02   91.8%     8.2%       15,230     2.1Gi
# edge-node-03   88.5%     11.5%      18,920     1.8Gi
# edge-node-04   95.1%     4.9%       10,840     2.4Gi
# FLEET AVG      92.4%     7.6%       14,360     2.15Gi
```

### Rendimiento de Caché

```bash
# Analizar rendimiento de caché por tipo de contenido
edge-cli cache analysis --content-type --period 24h

# Salida:
# CONTENT_TYPE      HIT_RATE  AVG_SIZE  EVICTION_RATE
# static/assets     98.5%     45KB      2.1%
# api/responses     85.2%     12KB      8.5%
# dynamic/pages     72.8%     28KB      15.2%
# media/images      96.3%     150KB     3.8%
```

## Disponibilidad sin Conexión

Validar que los nodos del borde continúen operando cuando se desconectan del origen.

### Prueba sin Conexión

```bash
# Simular desconexión del origen
edge-cli offline test \
  --node edge-node-01 \
  --duration 300s \
  --check-availability

# Salida:
# NODE: edge-node-01
# DURATION: 300s (5 minutos)
# AVAILABILITY: 99.98%
# REQUESTS_SERVED: 12,847
# ERRORS: 3
# CACHE_HITS: 12,844
# CACHE_MISSES: 0
# STATUS: PASS
```

### Prueba de Duración sin Conexión

```bash
# Probar operación extendida sin conexión
edge-cli offline stress-test \
  --node edge-node-01 \
  --duration 3600s \
  --traffic-rate 1000rps

# Salida:
# NODE: edge-node-01
# DURATION: 3600s (1 hora)
# AVAILABILITY: 99.95%
# REQUESTS_SERVED: 3,600,000
# ERRORS: 1,800
# CACHE_HITS: 3,598,200
# CACHE_MISSES: 0
# MEMORY_USAGE: 78% (estable)
# DISK_USAGE: 42% (estable)
# STATUS: PASS
```

## Tasa de Éxito de Sincronización

Validar que la sincronización entre nodos del borde y el origen tenga éxito de manera consistente.

### Estadísticas de Sincronización

```bash
# Verificar tasas de éxito de sincronización
edge-cli sync stats --fleet-wide --period 24h

# Salida:
# NODE           SYNC_ATTEMPTS  SUCCESS  FAILED  CONFLICTS  SUCCESS_RATE
# edge-node-01   1,245          1,243    2       1          99.84%
# edge-node-02   1,180          1,175    5       3          99.58%
# edge-node-03   980            975      5       2          99.49%
# edge-node-04   1,320          1,318    2       0          99.85%
# FLEET TOTAL    4,725          4,711    14      6          99.70%
```

### Rendimiento de Sincronización

```bash
# Analizar métricas de rendimiento de sincronización
edge-cli sync performance --period 7d

# Salida:
# MÉTRICA                    VALOR
# TIEMPO_PROMEDIO_SYNC       2.3s
# P95_TIEMPO_SYNC            5.8s
# P99_TIEMPO_SYNC            12.4s
# RESOLUCIÓN_PROMEDIO_CONFLICTO  45ms
# PROFUNDIDAD_COLA_SYNC      23 (promedio)
# TASA_FALLO_SYNC            0.3%
# TASA_EXITO_REINTENTO       98.5%
```

### Éxito de Resolución de Conflictos

```bash
# Verificar tasas de éxito de resolución de conflictos
edge-cli sync conflicts stats --period 24h

# Salida:
# TOTAL_CONFLICTS: 47
# AUTO_RESOLVED: 44
# MANUAL_REQUIRED: 3
# RESOLUTION_RATE: 93.6%
# AVG_RESOLUTION_TIME: 120ms
# STRATEGIES_USED:
#   - last-write-wins: 28
#   - version-vector: 12
#   - crdt-merge: 4
#   - custom: 3
```

## Validación de Cumplimiento

### Cumplimiento de Residencia de Datos

```bash
# Validar cumplimiento de residencia de datos
edge-cli compliance residency --fleet-wide

# Salida:
# REGIÓN             CUMPLIMIENTO  VIOLACIONES  REMEDIADAS
# eu-west-1          100%          0            -
# us-west-2          100%          0            -
# ap-southeast-1     100%          0            -
# FLEET              100%          0            -
```

### Cumplimiento de Seguridad

```bash
# Validar cumplimiento de seguridad
edge-cli compliance security --fleet-wide

# Salida:
# VERIFICACIÓN                    ESTADO
# mTLS Habilitado                 PASS
# Certificados Válidos            PASS
# Reglas de Firewall Aplicadas    PASS
# Secretos Rotados                PASS
# Cifrado en Reposo               PASS
# Segmentación de Red             PASS
# GENERAL                         PASS
```

---
[Volver al Perfil de Computación en el Borde](./README.es.md)
