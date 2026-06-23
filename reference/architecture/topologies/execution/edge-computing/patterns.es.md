# Guía de Patrones de Computación en el Borde

> **Navegación Bilingüe:** [English](./patterns.md) | [Español](./patterns.es.md)

**Propietario:** Ingeniería de Plataforma
**Topología:** Computación en el Borde

## Funciones del Borde

Las funciones del borde ejecutan código del lado del servidor más cercano al cliente, reduciendo la latencia y mejorando la experiencia del usuario.

### Ciclo de Vida de la Función

```
Solicitud → Enrutador de Funciones → Función del Borde → Respuesta
                         ↓
                    Inicio en Frío (si es necesario)
                         ↓
                    Inicializar Runtime
                         ↓
                    Ejecutar Handler
                         ↓
                    Devolver Respuesta
```

### Plantillas de Funciones

```javascript
// Función básica del borde
export default async function handler(request) {
  const { url, method, headers } = request;
  
  // Procesar en el borde
  const response = await processRequest(request);
  
  return new Response(response.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Edge-Location': process.env.EDGE_LOCATION,
      'X-Edge-Node': process.env.EDGE_NODE_ID
    }
  });
}
```

### Optimización de Inicio en Frío

| Estrategia | Tiempo de Inicio en Frío | Caso de Uso |
|------------|-------------------------|-------------|
| Instancias pre-calentadas | < 50ms | Funciones de alto tráfico |
| Restauración de instantánea | < 100ms | Funciones de tráfico medio |
| Inicialización lazy | 200-500ms | Funciones de bajo tráfico |
| Dependencias empaquetadas | < 100ms | Todas las funciones |

## Integración CDN

La computación en el borde extiende las capacidades CDN tradicionales con procesamiento de contenido dinámico.

### Arquitectura CDN + Borde

```
┌─────────────────────────────────────────────────┐
│  Capa de Borde CDN                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │ Caché       │  │ Cómputo del │  │Almacenam.│ │
│  │ Estático    │  │ Borde       │  │ del Borde│ │
│  │ (Activos)   │  │ (Funciones) │  │         │ │
│  └─────────────┘  └─────────────┘  └─────────┘ │
└─────────────────────────────────────────────────┘
                         │
                    ┌────┴────┐
                    │ Origen  │
                    └─────────┘
```

### Integración Caché-Cómputo

```yaml
cdn_edge:
  routes:
    - path: "/static/*"
      handler: "cache-serve"
      cache_ttl: 3600s
    - path: "/api/*"
      handler: "edge-function"
      cache_ttl: 0s
    - path: "/dynamic/*"
      handler: "edge-compute"
      cache_ttl: 60s
      stale_while_revalidate: 30s
```

## Datos Primero Local

La arquitectura de datos primero local prioriza el almacenamiento local y la sincronización sobre las bases de datos centralizadas.

### Flujo de Datos

```
Aplicación → Almacén Local → Sincronización en Segundo Plano → Origen
                ↓ (lectura)
          Consulta Local (rápida)
                ↓ (escritura)
          Escritura Local → Cola → Sincronización
```

### Patrones de Almacenamiento Local

```javascript
// Wrapper de IndexedDB para datos primero local
class LocalFirstDB {
  constructor(dbName) {
    this.db = await openDB(dbName, 1, {
      upgrade(db) {
        db.createObjectStore('documents', { keyPath: 'id' });
        db.createObjectStore('sync-queue', { autoIncrement: true });
      }
    });
  }
  
  async read(id) {
    // Leer del almacén local primero
    const local = await this.db.get('documents', id);
    if (local) return local;
    
    // Conmutar a la red si no está en el almacén local
    const remote = await fetchFromOrigin(id);
    await this.db.put('documents', remote);
    return remote;
  }
  
  async write(data) {
    // Escribir localmente primero
    await this.db.put('documents', data);
    
    // Encolar para sincronización
    await this.db.add('sync-queue', {
      type: 'write',
      data,
      timestamp: Date.now()
    });
  }
}
```

## Service Workers

Los service workers habilitan capacidades sin conexión y procesamiento en segundo plano en el borde.

### Arquitectura de Service Worker

```
┌─────────────────────────────────────────────┐
│  Navegador / Runtime del Borde              │
│  ┌─────────────────────────────────────┐   │
│  │  Service Worker                     │   │
│  │  - Intercepción de solicitudes      │   │
│  │  - Gestión de caché                 │   │
│  │  - Sincronización en segundo plano  │   │
│  │  - Notificaciones push              │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Registro de Service Worker

```javascript
// Registrar service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', {
    scope: '/',
    type: 'module'
  });
}

// sw.js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

## Sincronización Write-Behind

La sincronización write-behind reconoce las escrituras localmente y sincroniza asincrónicamente con el origen.

### Arquitectura Write-Behind

```
Escritura del Cliente → Almacén Local → Reconocer → Sincronización en Segundo Plano → Origen
                       ↓
                 Registro WAL
                       ↓
                 Detección de Conflictos
                       ↓
                 Estrategia de Resolución
```

### Implementación

```javascript
class WriteBehindSync {
  constructor(localDB, syncQueue) {
    this.localDB = localDB;
    this.syncQueue = syncQueue;
  }
  
  async write(key, value) {
    // Escribir en el almacén local
    await this.localDB.put(key, value);
    
    // Agregar al registro WAL
    const walEntry = await this.localDB.addToWAL({
      key,
      value,
      timestamp: Date.now(),
      status: 'pending'
    });
    
    // Encolar para sincronización en segundo plano
    await this.syncQueue.enqueue({
      type: 'write-behind',
      walEntryId: walEntry.id,
      retryCount: 0
    });
    
    return { success: true, walEntryId: walEntry.id };
  }
}
```

## CRDTs (Tipos de Datos Replicados sin Conflictos)

Los CRDTs permiten la resolución automática de conflictos sin coordinación.

### Tipos de CRDT

| Tipo | Operación | Caso de Uso |
|------|-----------|-------------|
| G-Counter | Incrementar | Conteos de likes, contadores de vistas |
| PN-Counter | Incrementar/Decrementar | Saldos, conteos de votos |
| G-Set | Agregar | Listas de etiquetas, listas de seguidores |
| OR-Set | Agregar/Eliminar | Carritos de compras, listas de usuarios |
| LWW-Register | Establecer | Preferencias de usuario |
| MV-Register | Establecer (multi-valor) | Edición colaborativa |

### Implementación de CRDT

```javascript
// CRDT G-Counter para conteo distribuido
class GCounter {
  constructor(nodeId) {
    this.nodeId = nodeId;
    this.counts = new Map();
  }
  
  increment() {
    const current = this.counts.get(this.nodeId) || 0;
    this.counts.set(this.nodeId, current + 1);
  }
  
  merge(other) {
    for (const [node, count] of other.counts) {
      const current = this.counts.get(node) || 0;
      this.counts.set(node, Math.max(current, count));
    }
  }
  
  value() {
    return Array.from(this.counts.values())
      .reduce((sum, count) => sum + count, 0);
  }
}
```

### Sincronización de CRDT

```bash
# Configurar sincronización CRDT para nodos del borde
edge-cli crdt sync configure \
  --type g-counter \
  --sync-interval 5s \
  --conflict-strategy merge \
  --nodes "edge-node-01,edge-node-02,edge-node-03"
```

---
[Volver al Perfil de Computación en el Borde](./README.es.md)
