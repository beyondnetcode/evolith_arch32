# Guía de Resiliencia de Computación en el Borde

> **Navegación Bilingüe:** [English](./resilience.md) | [Español](./resilience.es.md)

**Propietario:** Ingeniería de Plataforma
**Topología:** Computación en el Borde

## Persistencia Primero sin Conexión

Los nodos del borde deben servir solicitudes incluso cuando están desconectados del origen. La arquitectura primero sin conexión garantiza una operación continua.

### Arquitectura de Almacenamiento

```
┌─────────────────────────────────────────┐
│  Almacenamiento del Nodo del Borde      │
│  ┌─────────────────────────────────┐   │
│  │  Almacén Lectura-Escritura      │   │
│  │  (SQLite)                       │   │
│  │  - Workloads activos            │   │
│  │  - Estado local                 │   │
│  │  - Escrituras pendientes        │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Caché Solo-Lectura (KV Store)  │   │
│  │  - Activos estáticos            │   │
│  │  - Datos de acceso frecuente    │   │
│  │  - Contenido pre-obtenido       │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Registro WAL                   │   │
│  │  - Operaciones de sincronización│   │
│  │    pendientes                   │   │
│  │  - Cola de resolución de        │   │
│  │    conflictos                   │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Detección sin Conexión

```bash
# Monitorear conectividad con el origen
edge-cli resilience monitor \
  --check-interval 5s \
  --failure-threshold 3 \
  --recovery-threshold 2 \
  --notify on-state-change
```

## Resolución de Conflictos (Ref: EC-R03)

Cuando múltiples nodos del borde o el origen modifican los mismos datos, los conflictos deben resolverse de forma determinística.

### Estrategias de Resolución

| Estrategia | Caso de Uso | Compromiso |
|------------|-------------|------------|
| Última escritura gana (LWW) | Estado no crítico | Simple, puede perder actualizaciones |
| Vectores de versión | Edición colaborativa | Completo, historial completo |
| CRDTs | Operaciones de contador/conjunto | Convergente, consumo de memoria |
| Resolución personalizada | Lógica específica del negocio | Flexible, debe implementarse |

### Motor de Resolución de Conflictos

```yaml
conflict_resolution:
  default_strategy: "version-vector"
  rules:
    - resource: "user-profile"
      strategy: "merge-fields"
      priority_fields:
        - name: "email"
          strategy: "origin-wins"
        - name: "preferences"
          strategy: "deep-merge"
    - resource: "shopping-cart"
      strategy: "crdt-set"
      merge_on_reconnect: true
    - resource: "audit-log"
      strategy: "append-only"
      conflict_action: "reject-duplicate"
```

### Flujo de Resolución

```bash
# Detectar y resolver conflictos
edge-cli sync conflicts resolve \
  --node edge-node-01 \
  --strategy auto \
  --dry-run

# Salida:
# CONFLICTS_FOUND: 3
# RESOLVED: 2
# REQUIRES_MANUAL: 1
# DETAILS:
#   - user:123 email → origin-wins (auto)
#   - cart:456 items → crdt-merge (auto)
#   - config:789 timeout → manual-review
```

## Conmutación por Error al Origen

Cuando un nodo del borde no puede servir una solicitud localmente, conmuta al origen con rendimiento degradado.

### Jerarquía de Conmutación

```
Solicitud → Nodo del Borde
  ├── 1. Acerto en Caché Local → Servir inmediatamente (< 5ms)
  ├── 2. Acerto en Par del Borde → Obtener del par (< 20ms)
  ├── 3. Conmutación al Origen → Obtener del origen (< 200ms)
  └── 4. Contenido Estático → Servir contenido obsoleto (sin conexión)
```

### Configuración de Conmutación

```yaml
fallback:
  levels:
    - name: "local-cache"
      timeout: 0ms
      on_miss: "edge-peer"
    - name: "edge-peer"
      timeout: 50ms
      on_miss: "origin"
    - name: "origin"
      timeout: 150ms
      on_miss: "stale-content"
    - name: "stale-content"
      max_staleness: 24h
      on_miss: "error"
```

### Obsoleto-Mientras-Se-Revalida

```bash
# Configurar política de obsoleto-mientras-se-revalida
edge-cli cache policy set \
  --resource "/api/products/*" \
  --stale-while-revalidate 60s \
  --stale-if-error 300s
```

## Lecturas/Escrituras Primero Local

Todas las operaciones se realizan localmente primero y luego se sincronizan con el origen.

### Flujo de Escritura

```
Escritura del Cliente → WAL Local → Reconocer al Cliente
                                      ↓
                                 Sincronización en Segundo Plano
                                      ↓
                                 Actualización del Origen
                                      ↓
                                 Confirmar Sincronización
```

### Flujo de Lectura

```
Lectura del Cliente → Almacén Local → Devolver al Cliente
                        ↓ (async)
                  Verificación de Sincronización → Actualizar si es más reciente
```

### Implementación

```javascript
// Operación de escritura primero local
async function localFirstWrite(key, value) {
  // 1. Escribir en WAL local
  const walEntry = await localDB.writeToWAL(key, value);
  
  // 2. Reconocer al cliente inmediatamente
  acknowledgeToClient(walEntry.id);
  
  // 3. Encolar para sincronización en segundo plano
  syncQueue.enqueue({
    type: 'write',
    key,
    value,
    timestamp: Date.now(),
    walEntryId: walEntry.id
  });
}
```

## Sincronización en Segundo Plano

La sincronización se ejecuta continuamente en segundo plano para reconciliar los cambios locales con el origen.

### Estrategias de Sincronización

| Estrategia | Cuándo Usar | Ancho de Banda | Impacto en Latencia |
|------------|-------------|----------------|---------------------|
| Oportunista | Períodos de baja conectividad | Bajo | Ninguno |
| Programada | Patrones predecibles | Medio | Bajo |
| Continua | Necesidades de alta consistencia | Alto | Ninguno |
| Bajo demanda | Activaciones manuales | Variable | Ninguno |

### Gestión de Cola de Sincronización

```bash
# Monitorear cola de sincronización
edge-cli sync queue status --node edge-node-01

# Salida:
# PENDING: 45
# IN_PROGRESS: 3
# COMPLETED: 12,847
# FAILED: 12
# OLDEST_PENDING: 2026-06-23T10:15:00Z
# ESTIMATED_COMPLETION: 2026-06-23T10:25:00Z
```

### Prevención de Conflictos

```bash
# Habilitar bloqueo optimista para escrituras concurrentes
edge-cli sync config set \
  --node edge-node-01 \
  --optimistic-locking true \
  --retry-on-conflict 3
```

---
[Volver al Perfil de Computación en el Borde](./README.es.md)
