# Guía de Manuales Operativos de Computación en el Borde

> **Navegación Bilingüe:** [English](./runbooks.md) | [Español](./runbooks.es.md)

**Propietario:** Ingeniería de Plataforma
**Topología:** Computación en el Borde

## Manual 1: Fallo de Nodo

Manejar fallos de nodos del borde de manera elegante para mantener la disponibilidad del servicio.

### Detección

```bash
# Detectar fallo del nodo
edge-cli node status --node edge-node-01

# Disparadores de alerta:
# - Nodo inalcanzable por > 30s
# - Fallo de verificación de salud > 3 consecutivos
# - Agotamiento de recursos (CPU > 95%, Memoria > 95%)
```

### Triaje

1. **Verificar estado del nodo**: ¿Está el nodo completamente caído o parcialmente degradado?
2. **Verificar conectividad de red**: ¿Podemos alcanzar el nodo desde el plano de control?
3. **Verificar registros del nodo**: ¿Qué errores se están reportando?
4. **Verificar estado del origen**: ¿Está el origen saludable?

### Remediación

```bash
# Paso 1: Verificar salud del nodo
edge-cli health check --node edge-node-01 --verbose

# Paso 2: Si el nodo es inalcanzable, intentar reinicio
edge-cli node restart --node edge-node-01 --force

# Paso 3: Si el reinicio falla, drenar tráfico
edge-cli traffic drain --node edge-node-01 --duration 30s

# Paso 4: Si el nodo es irrecuperable, reemplazar
edge-cli node replace \
  --old-node edge-node-01 \
  --new-node edge-node-01-new \
  --migrate-state
```

### Verificación

```bash
# Verificar recuperación del nodo
edge-cli health check --node edge-node-01-new --wait 60s

# Verificar distribución de tráfico
edge-cli traffic status --fleet-wide

# Verificar estado de sincronización
edge-cli sync status --node edge-node-01-new
```

---

## Manual 2: Invalidación de Contenido

Invalidar contenido obsoleto o incorrecto en toda la flota del borde.

### Cuándo Usar

- Actualización de contenido desplegada pero no reflejada
- Vulnerabilidad de seguridad en contenido en caché
- Corrupción de datos detectada
- Requisito de cumplimiento para eliminar contenido

### Proceso de Invalidación

```bash
# Paso 1: Identificar contenido afectado
edge-cli cache search --pattern "/api/v1/products/*" --output affected.json

# Paso 2: Previsualizar invalidación
edge-cli cache invalidate --file affected.json --dry-run

# Paso 3: Ejecutar invalidación
edge-cli cache invalidate --file affected.json --confirm

# Paso 4: Monitorear progreso de invalidación
edge-cli cache invalidation status --watch
```

### Invalidación Parcial

```bash
# Invalidar tipos de contenido específicos
edge-cli cache invalidate \
  --pattern "/static/js/*" \
  --reason "security-patch"

# Invalidar por etiqueta
edge-cli cache invalidate \
  --tag "product-images" \
  --reason "content-update"
```

### Verificación

```bash
# Verificar completitud de invalidación
edge-cli cache stats --fleet-wide --content-type "js"

# Verificar contenido obsoleto
edge-cli cache audit --max-age 0 --pattern "/api/v1/products/*"
```

---

## Manual 3: Resolución de Conflictos de Sincronización

Manejar conflictos de sincronización entre nodos del borde y el origen.

### Detección

```bash
# Monitorear conflictos de sincronización
edge-cli sync conflicts monitor --alert-threshold 10

# Verificar detalles de conflictos
edge-cli sync conflicts list --node edge-node-01 --output conflicts.json
```

### Análisis

```bash
# Analizar patrones de conflictos
edge-cli sync conflicts analyze --period 1h

# Salida:
# TOTAL_CONFLICTS: 23
# BY_TYPE:
#   - write-write: 15
#   - delete-update: 5
#   - concurrent-create: 3
# BY_RESOURCE:
#   - user/preferences: 12
#   - cart/items: 8
#   - session/data: 3
```

### Resolución

```bash
# Auto-resolver conflictos simples
edge-cli sync conflicts resolve \
  --strategy last-write-wins \
  --filter "type:write-write"

# Resolución manual para conflictos complejos
edge-cli sync conflicts resolve \
  --conflict-id conflict-123 \
  --resolution manual \
  --keep "origin" \
  --merge-strategy "deep-merge"

# Forzar resolución con registro de auditoría
edge-cli sync conflicts force-resolve \
  --conflict-id conflict-123 \
  --resolution "user:admin@example.com" \
  --reason "manual-override" \
  --audit
```

### Prevención

```bash
# Habilitar bloqueo optimista
edge-cli sync config set --optimistic-locking true

# Configurar CRDTs sin conflictos para datos críticos
edge-cli sync config set \
  --resource "user/preferences" \
  --strategy crdt \
  --type lww-register
```

---

## Manual 4: Recuperación de Nodo

Recuperar un nodo del borde fallido o degradado a operación completa.

### Evaluación

```bash
# Evaluar estado del nodo
edge-cli node assess --node edge-node-01

# Salida:
# NODE: edge-node-01
# STATE: degraded
# ISSUES:
#   - disk_usage: 92% (critical)
#   - sync_lag: 45s (warning)
#   - cert_expiry: 2026-07-15 (ok)
# RECOMMENDATION: cleanup disk, force sync
```

### Pasos de Recuperación

```bash
# Paso 1: Limpiar espacio en disco
edge-cli node cleanup \
  --node edge-node-01 \
  --purge-stale-cache \
  --remove-old-logs \
  --compact-database

# Paso 2: Forzar sincronización con el origen
edge-cli sync force \
  --node edge-node-01 \
  --full \
  --timeout 300s

# Paso 3: Reiniciar servicios del nodo
edge-cli node restart \
  --node edge-node-01 \
  --services all \
  --grace-period 30s

# Paso 4: Verificar recuperación
edge-cli health check --node edge-node-01 --wait 120s
```

### Validación Post-Recuperación

```bash
# Ejecutar suite completa de validación
edge-cli validate node --node edge-node-01 --comprehensive

# Verificar enrutamiento de tráfico
edge-cli traffic status --node edge-node-01

# Monitorear durante 15 minutos
edge-cli monitor --node edge-node-01 --duration 900s --alert-on-anomaly
```

---

## Manual 5: Operaciones en Modo sin Conexión

Manejar períodos extendidos sin conexión cuando los nodos del borde no pueden alcanzar el origen.

### Detección

```bash
# Monitorear conectividad con el origen
edge-cli connectivity status --node edge-node-01

# Salida:
# NODE: edge-node-01
# ORIGIN_STATUS: unreachable
# LAST_CONTACT: 2026-06-23T10:15:00Z
# DURATION: 45 minutes
# MODE: offline
# CACHED_CONTENT: 98.5% available
```

### Activación del Modo sin Conexión

```bash
# Verificar que el modo sin conexión está activo
edge-cli offline status --node edge-node-01

# Verificar disponibilidad de contenido en caché
edge-cli cache availability --node edge-node-01

# Salida:
# TOTAL_CONTENT: 1,245 items
# CACHED: 1,226 items (98.5%)
# MISSING: 19 items (1.5%)
# STALE: 234 items (18.8%)
```

### Operaciones durante la Desconexión

```bash
# Servir contenido en caché
edge-cli offline serve --node edge-node-01 --mode degraded

# Encolar escrituras para sincronización posterior
edge-cli offline queue-status --node edge-node-01

# Salida:
# QUEUED_WRITES: 45
# QUEUED_SIZE: 128KB
# ESTIMATED_SYNC_TIME: 30s (cuando esté en línea)
```

### Recuperación de la Desconexión

```bash
# Detectar recuperación del origen
edge-cli connectivity monitor --watch

# Sincronizar escrituras en cola
edge-cli sync process-queue --node edge-node-01

# Verificar que todas las escrituras se sincronizaron
edge-cli sync queue-status --node edge-node-01
```

---

## Manual 6: Conmutación por Error del Origen

Manejar fallos del servidor origen dirigiendo el tráfico a orígenes de respaldo.

### Detección

```bash
# Monitorear salud del origen
edge-cli origin health --watch

# Disparadores de alerta:
# - Tiempo de respuesta del origen > 500ms
# - Tasa de errores del origen > 5%
# - Fallos de conexión del origen > 3
```

### Proceso de Conmutación

```bash
# Paso 1: Verificar fallo del origen
edge-cli origin test --target primary --timeout 10s

# Paso 2: Activar conmutación
edge-cli origin failover activate --reason "primary-origin-down"

# Paso 3: Verificar enrutamiento de conmutación
edge-cli origin status --fleet-wide

# Salida:
# PRIMARY: primary-origin.example.com (DOWN)
# FAILOVER: failover-origin.example.com (ACTIVE)
# TRAFFIC: 100% to failover
# STATUS: degraded (reduced capacity)
```

### Monitoreo durante la Conmutación

```bash
# Monitorear rendimiento de la conmutación
edge-cli origin monitor --interval 30s

# Verificar tasas de acerto en caché durante la conmutación
edge-cli cache stats --fleet-wide --period 5m

# Verificar que no haya pérdida de datos
edge-cli sync verify --period 5m
```

### Recuperación

```bash
# Verificar recuperación del origen primario
edge-cli origin test --target primary --continuous --duration 300s

# Cambiar de vuelta al primario
edge-cli origin failover deactivate --confirm

# Verificar enrutamiento normal
edge-cli origin status --fleet-wide
```

---

## Contactos de Emergencia

| Rol | Contacto | Disponibilidad |
|-----|----------|----------------|
| Líder de Plataforma del Borde | platform-lead@example.com | 24/7 |
| Ingeniero de Guardia | oncall-edge@example.com | 24/7 |
| Equipo de Seguridad | security@example.com | Horario laboral |
| Operaciones de Red | netops@example.com | 24/7 |

## Ruta de Escalamiento

```
P1 (Servicio Caído):
  → Ingeniero de Guardia (5 min)
  → Líder de Plataforma (15 min)
  → VP de Ingeniería (30 min)

P2 (Rendimiento Degradado):
  → Ingeniero de Guardia (15 min)
  → Líder de Plataforma (1 hora)
  → VP de Ingeniería (4 horas)

P3 (Problema Menor):
  → Ingeniero de Guardia (1 hora)
  → Líder de Plataforma (siguiente día hábil)
```

---
[Volver al Perfil de Computación en el Borde](./README.es.md)
