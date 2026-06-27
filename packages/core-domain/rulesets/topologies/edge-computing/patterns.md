# Edge Computing — Patterns Guide

> **Bilingual Navigation:** [English](./patterns.md) | [Español](./patterns.es.md)

**Owner:** Platform Engineering
**Topology:** Edge Computing

## Edge Functions

Edge functions execute server-side code closest to the client, reducing latency and improving user experience.

### Function Lifecycle

```
Request → Function Router → Edge Function → Response
                         ↓
                    Cold Start (if needed)
                         ↓
                    Initialize Runtime
                         ↓
                    Execute Handler
                         ↓
                    Return Response
```

### Function Templates

```javascript
// Basic edge function
export default async function handler(request) {
  const { url, method, headers } = request;
  
  // Process at the edge
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

### Cold Start Optimization

| Strategy | Cold Start Time | Use Case |
|----------|-----------------|----------|
| Pre-warmed instances | < 50ms | High-traffic functions |
| Snapshot restore | < 100ms | Medium-traffic functions |
| Lazy initialization | 200-500ms | Low-traffic functions |
| Bundled dependencies | < 100ms | All functions |

## CDN Integration

Edge computing extends traditional CDN capabilities with dynamic content processing.

### CDN + Edge Architecture

```
┌─────────────────────────────────────────────────┐
│  CDN Edge Layer                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │ Static Cache│  │ Edge Compute│  │ Edge    │ │
│  │ (Assets)    │  │ (Functions) │  │ Storage │ │
│  └─────────────┘  └─────────────┘  └─────────┘ │
└─────────────────────────────────────────────────┘
                         │
                    ┌────┴────┐
                    │ Origin  │
                    └─────────┘
```

### Cache-Compute Integration

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

## Local-First Data

Local-first data architecture prioritizes local storage and synchronization over centralized databases.

### Data Flow

```
Application → Local Store → Background Sync → Origin
                ↓ (read)
          Local Query (fast)
                ↓ (write)
          Local Write → Queue → Sync
```

### Local Storage Patterns

```javascript
// IndexedDB wrapper for local-first data
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
    // Read from local store first
    const local = await this.db.get('documents', id);
    if (local) return local;
    
    // Fallback to network if not in local store
    const remote = await fetchFromOrigin(id);
    await this.db.put('documents', remote);
    return remote;
  }
  
  async write(data) {
    // Write locally first
    await this.db.put('documents', data);
    
    // Queue for sync
    await this.db.add('sync-queue', {
      type: 'write',
      data,
      timestamp: Date.now()
    });
  }
}
```

## Service Workers

Service workers enable offline capabilities and background processing at the edge.

### Service Worker Architecture

```
┌─────────────────────────────────────────────┐
│  Browser / Edge Runtime                     │
│  ┌─────────────────────────────────────┐   │
│  │  Service Worker                     │   │
│  │  - Request interception             │   │
│  │  - Cache management                 │   │
│  │  - Background sync                  │   │
│  │  - Push notifications               │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Service Worker Registration

```javascript
// Register service worker
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

## Write-Behind Sync

Write-behind sync acknowledges writes locally and synchronizes asynchronously to the origin.

### Write-Behind Architecture

```
Client Write → Local Store → Acknowledge → Background Sync → Origin
                  ↓
            Write-Ahead Log
                  ↓
            Conflict Detection
                  ↓
            Resolution Strategy
```

### Implementation

```javascript
class WriteBehindSync {
  constructor(localDB, syncQueue) {
    this.localDB = localDB;
    this.syncQueue = syncQueue;
  }
  
  async write(key, value) {
    // Write to local store
    await this.localDB.put(key, value);
    
    // Add to write-ahead log
    const walEntry = await this.localDB.addToWAL({
      key,
      value,
      timestamp: Date.now(),
      status: 'pending'
    });
    
    // Queue for background sync
    await this.syncQueue.enqueue({
      type: 'write-behind',
      walEntryId: walEntry.id,
      retryCount: 0
    });
    
    return { success: true, walEntryId: walEntry.id };
  }
}
```

## CRDTs (Conflict-free Replicated Data Types)

CRDTs enable automatic conflict resolution without coordination.

### CRDT Types

| Type | Operation | Use Case |
|------|-----------|----------|
| G-Counter | Increment | Like counts, view counters |
| PN-Counter | Increment/Decrement | Balances, vote counts |
| G-Set | Add | Tag lists, follower lists |
| OR-Set | Add/Remove | Shopping carts, user lists |
| LWW-Register | Set | User preferences |
| MV-Register | Set (multi-value) | Collaborative editing |

### CRDT Implementation

```javascript
// G-Counter CRDT for distributed counting
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

### CRDT Synchronization

```bash
# Configure CRDT sync for edge nodes
edge-cli crdt sync configure \
  --type g-counter \
  --sync-interval 5s \
  --conflict-strategy merge \
  --nodes "edge-node-01,edge-node-02,edge-node-03"
```

---
[Back to Edge Computing Profile](./README.md)
