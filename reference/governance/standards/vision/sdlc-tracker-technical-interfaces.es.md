# SDLC Tracker — Diseño de Interfaces Técnicas

> **Bilingual Navigation:** [English Version](./sdlc-tracker-technical-interfaces.md)

**Estado:** Borrador — Pendiente de revisión del Architecture Board
**Responsable:** Evolith Architecture Board
**Última actualización:** 2026-06-09

---

## 1. Propósito

Este documento define la arquitectura de interfaces técnicas que permite al
**Evolith SDLC Tracker** orquestar el CLI, el servidor MCP, servicios REST
y agentes autónomos a través de los 5 Phase Gates del SDLC.

El Tracker es una plataforma independiente. No extiende el CLI — lo
**llama** junto con otros servicios como proveedores de evaluación sin estado,
persistiendo todo el estado en su propia base de datos.

---

## 2. Principio Arquitectónico — Separación de Responsabilidades

```
┌─────────────────────────────────────────────────────────────┐
│                     SDLC Tracker                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Orquestador  │  │  Evaluador   │  │     Servicio      │  │
│  │  de Procesos │  │  de Gates    │  │     Chatbox       │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  │
│         │                 │                   │              │
│  ┌──────▼─────────────────▼───────────────────▼──────────┐  │
│  │                 Gateway REST API                       │  │
│  └──────────────────────────┬───────────────────────────┘   │
│                             │                                │
│  ┌──────────────────────────▼───────────────────────────┐   │
│  │           State Store (Base de Datos Tracker)         │   │
│  │   SatelliteProject · SDLCProcess · PhaseExecution     │   │
│  │   GateEvaluation · ChatboxSession · AgentRun          │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │  llama (evaluación sin estado)
          ┌────────────┼────────────────┐
          │            │                │
   MCP HTTP/SSE    REST API        Evolith Core
  (tools CLI)   (satélites)     (reglas solo lectura)
```

**Invariante clave:** El CLI y el servidor MCP son **sin estado**. Reciben una
solicitud, evalúan contra los rulesets del Core y devuelven un resultado. El
Tracker escribe el resultado en su propia base de datos. Ni el Core ni el CLI
escriben en la base de datos del Tracker.

---

> **Ratificación de contrato:** el envelope de salida, el schema `GateEvidence`, los flags globales y el naming definidos abajo quedan ratificados por el [ADR 0073](../../../architecture/adrs/core/0073-unified-cli-output-contract.es.md) (estado: Aprobado 2026-06-10). Ante conflicto, prevalece el ADR.

## 3. Análisis de Brechas — Qué Necesita el CLI para Soportar el Tracker

La tabla a continuación lista lo que debe agregarse al CLI existente
(`@evolith/smart-cli`) para que el Tracker funcione. El CLI **permanece sin
estado** en todos los casos.

| Brecha | Qué se necesita | Capa CLI | Nueva tool MCP | Nuevo endpoint REST |
|--------|----------------|---------|:---:|:---:|
| **Validación con contexto de fase** | Evaluación de gate aceptando parámetro de fase | `application` | Sí — `evolith-gate-evaluate` | No |
| **Emisión de eventos** | Webhook POST al Tracker cuando completa un gate | `infrastructure` | No | No — webhook saliente |
| **Endpoint chatbox** | Endpoint HTTP conversacional con sesión (texto entrada, stream de salida) | `core` | Sí — `evolith-chat` | Sí — `POST /chat` |
| **Evidencia estructurada de gate** | Las tools de gate deben retornar evidencia JSON estructurada | `domain` | Extender tools existentes | No |
| **Resolvedor de contexto de fase** | Aceptar `{ phase, projectId, rulesetRef }` como input en todas las tools MCP | `application` | Extender tools existentes | No |
| **Disparador de agente autónomo** | Agente que evalúa todos los gates en una transición de fase sin llamada humana | `core` | Sí — `evolith-phase-advance` | Sí — `POST /phase/advance` |

---

## 4. Contratos de Interfaces

### 4.1 Tracker → CLI/MCP (Evaluación de Gates)

**Protocolo:** MCP HTTP/SSE — `POST /message`, respuestas vía `GET /sse`

```typescript
// Payload de solicitud (JSON-RPC 2.0)
interface GateEvaluateRequest {
  jsonrpc: '2.0';
  id: string;
  method: 'tools/call';
  params: {
    name: 'evolith-gate-evaluate';
    arguments: {
      phase: 'discovery' | 'design' | 'construction' | 'qa' | 'release';
      projectPath: string;       // ruta del repositorio satélite
      rulesetRef: string;        // referencia al ruleset del Core
      evidenceMode: 'full' | 'summary';
    };
  };
}

// Estructura de evidencia parseada
interface GateEvidence {
  gateId: string;
  phase: string;
  verdict: 'passed' | 'failed' | 'skipped';
  rulesetRef: string;
  rulesetVersion: string;
  violations: Array<{
    ruleId: string;
    severity: 'error' | 'warning';
    location: string;
    message: string;
  }>;
  evaluatedAt: string;           // ISO 8601
  evaluatedBy: 'human' | 'agent' | 'ci';
}
```

### 4.2 REST API del Tracker (Frontend + CI/CD)

**URL Base:** `https://tracker.evolith.io/api/v1`  
**Auth:** Bearer token (delegado al UMS)

```typescript
// Registro de satélite
// POST /satellites
interface RegisterSatelliteRequest {
  name: string;
  repoUrl: string;
  rulesetRef: string;            // apunta a Evolith Core
}

// Iniciar proceso SDLC
// POST /satellites/:id/processes
interface StartProcessResponse {
  processId: string;
  currentPhase: string;
  startedAt: string;
}

// Avanzar fase (dispara evaluación de gate)
// POST /processes/:id/advance
interface AdvancePhaseRequest {
  triggeredBy: 'human' | 'agent' | 'ci';
  notes?: string;
}
interface AdvancePhaseResponse {
  processId: string;
  previousPhase: string;
  currentPhase: string;
  gateVerdict: 'passed' | 'failed' | 'blocked';
  gateEvaluationId: string;
}

// Obtener estado del proceso
// GET /processes/:id
interface ProcessStatusResponse {
  processId: string;
  satelliteId: string;
  currentPhase: string;
  phases: PhaseExecution[];
  driftIndex: number;            // 0-100, 0 = sin drift
}
```

### 4.3 API Chatbox (Desarrollador en UI)

**Endpoint:** `POST /chat/sessions` (crear), `POST /chat/sessions/:id/messages` (enviar)  
**Protocolo:** HTTP con respuesta streaming vía SSE

```typescript
// Crear sesión de chatbox
// POST /chat/sessions
interface CreateSessionRequest {
  processId: string;
  phase: string;
  modelRef?: string;             // LLM; usa el default configurado si se omite
}

// Enviar mensaje (respuesta via stream SSE)
// POST /chat/sessions/:id/messages
interface SendMessageRequest {
  role: 'user';
  content: string;
  toolHint?: 'evolith-validate' | 'evolith-metrics' | 'auto';
}
// Eventos SSE:
// data: {"type":"token","value":"..."}
// data: {"type":"tool_call","tool":"evolith-validate","result":{...}}
// data: {"type":"done","turnId":"..."}

// Modo degradado (sin clave LLM):
// El chatbox enruta todas las consultas solo a través de tools MCP
// y retorna texto estructurado sin respuesta generativa.
```

### 4.4 Interfaz de Agentes (Evaluación Autónoma de Gates)

**Disparador:** Evento de transición de fase del Orquestador de Procesos  
**Protocolo:** Event bus interno → Runner de agente → Llamadas a tools MCP

```typescript
interface AgentTriggerEvent {
  type: 'phase.transition.requested';
  processId: string;
  fromPhase: string;
  toPhase: string;
  triggeredBy: 'human' | 'ci';
  timestamp: string;
}

interface AgentRunRecord {
  id: string;
  processId: string;
  triggerEvent: AgentTriggerEvent;
  agentType: 'gate-evaluator';
  toolCallLog: Array<{
    tool: string;
    input: object;
    output: object;
    durationMs: number;
  }>;
  outcome: 'passed' | 'failed' | 'error';
  gateEvaluationId: string;
  startedAt: string;
  completedAt: string;
}
```

### 4.5 Integración CI de Satélites

Los satélites llaman al Tracker desde su pipeline CI para reportar eventos
y recibir veredictos de gate de forma sincrónica.

```typescript
// POST /webhooks/ci-event
interface CIEventRequest {
  satelliteId: string;
  event: 'build.completed' | 'tests.passed' | 'coverage.reported';
  phase: string;
  payload: {
    branch: string;
    commitSha: string;
    coverage?: number;
    testsPassed?: number;
    testsFailed?: number;
  };
}
interface CIEventResponse {
  accepted: boolean;
  gateVerdict?: 'passed' | 'failed' | 'pending';
  message?: string;
}
```

---

## 5. Base de Datos del Tracker — Modelo de Entidades

```typescript
interface SatelliteProject {
  id: string;
  name: string;
  repoUrl: string;
  rulesetRef: string;            // puntero de solo lectura a Evolith Core
  registeredAt: string;
  active: boolean;
}

interface SDLCProcess {
  id: string;
  satelliteId: string;
  currentPhase: 'discovery' | 'design' | 'construction' | 'qa' | 'release' | 'completed';
  startedAt: string;
  completedAt?: string;
  status: 'active' | 'blocked' | 'completed' | 'abandoned';
}

interface PhaseExecution {
  id: string;
  processId: string;
  phase: string;
  enteredAt: string;
  exitedAt?: string;
  outcome?: 'passed' | 'failed' | 'skipped';
  notes?: string;
}

interface GateEvaluation {
  id: string;
  phaseExecutionId: string;
  gateId: string;
  rulesetRef: string;            // referencia al ruleset del Core (solo lectura)
  rulesetVersion: string;
  evaluationMode: 'sync' | 'async' | 'agent';
  verdict: 'passed' | 'failed' | 'skipped' | 'pending';
  evidencePayload: GateEvidence;
  evaluatedAt: string;
  evaluatedBy: 'human' | 'agent' | 'ci';
}

interface ChatboxSession {
  id: string;
  processId: string;
  phaseExecutionId: string;
  startedAt: string;
  modelRef: string;
  turns: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    toolCalls?: Array<{ tool: string; input: object; output: object }>;
    timestamp: string;
    tokenUsage?: { prompt: number; completion: number };
  }>;
  closedAt?: string;
}

interface AgentRun {
  id: string;
  processId: string;
  triggerEvent: AgentTriggerEvent;
  agentType: string;
  toolCallLog: Array<{ tool: string; input: object; output: object; durationMs: number }>;
  outcome: 'passed' | 'failed' | 'error';
  gateEvaluationId?: string;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}
```

---

## 6. Prompt de Diseño para Especificación de Arquitectura

El siguiente prompt captura el alcance completo de diseño para el agente Claude Design
encargado de definir la arquitectura completa del sistema Tracker. Sirve como referencia
canónica para la fase Architecture Spec-Driven del propio Tracker.

**Alcance:** El agente de diseño debe producir (A) Diagrama de Contexto del Sistema C4
Nivel 1, (B) Diagrama de Contenedores C4 Nivel 2, (C) contratos completos de interfaces
para las cinco superficies de integración (MCP, REST, Chatbox, Agentes, webhooks CI),
(D) modelo de datos de Gate, (E) modelo de datos de ChatboxSession, (F) tabla de
requisitos de extension del CLI, y (G) recomendaciones tecnologicas para cada contenedor
del Tracker.

**Restricciones para el agente de diseño:**
- La arquitectura hexagonal del CLI debe preservarse y permanecer sin estado
- La base de datos del Tracker es interna — sin acceso de escritura externo directo
- MCP HTTP/SSE es la interfaz canonica para consumidores IA/agentes; REST para no-IA
- El Chatbox debe degradar sin clave LLM (modo solo tools MCP)
- Todas las evaluaciones de gate deben llevar trazabilidad completa: ref ruleset + version + timestamp

---

## 7. Relación con Evolith Core

| Responsabilidad | Propietario | Acceso |
|-----------------|------------|--------|
| Rulesets y definiciones de gobernanza | Evolith Core | Solo lectura desde el Tracker |
| Estado de procesos SDLC | BD del Tracker | Lectura/escritura solo por el Tracker |
| Lógica de evaluación de gates | CLI / MCP tools | Llamado por el Tracker, sin estado |
| Historial de sesiones de chatbox | BD del Tracker | Lectura/escritura solo por el Tracker |
| Registros de ejecución de agentes | BD del Tracker | Lectura/escritura solo por el Tracker |

Cualquier cambio de regla debe seguir el principio de **Inmutabilidad Upstream**:
propuesto como ADR a `evolith_arch32`, aprobado por el Architecture Board, luego
heredado por el Tracker.

---

*Este documento es el complemento técnico de [Evolith Product Vision Master](./evolith-product-vision-master.es.md) §2.2.6.*
