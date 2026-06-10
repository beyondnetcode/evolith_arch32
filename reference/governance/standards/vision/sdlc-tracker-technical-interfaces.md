# SDLC Tracker — Technical Interface Design

> **Bilingual Navigation:** [Versión en Español](./sdlc-tracker-technical-interfaces.es.md)

**Status:** Draft — Pending Architecture Board Review
**Owner:** Evolith Architecture Board
**Last Updated:** 2026-06-09

---

## 1. Purpose

This document defines the technical interface architecture that enables the
**Evolith SDLC Tracker** to orchestrate the CLI, MCP server, REST services,
and autonomous agents across the 5 SDLC Phase Gates.

The Tracker is an independent platform. It does not extend the CLI — it
**calls** the CLI and other services as stateless evaluation providers,
persisting all state in its own database.

---

## 2. Architectural Principle — Separation of Concerns

```
┌─────────────────────────────────────────────────────────────┐
│                     SDLC Tracker                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │   Process    │  │    Gate      │  │     Chatbox       │  │
│  │ Orchestrator │  │  Evaluation  │  │     Service       │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  │
│         │                 │                   │              │
│  ┌──────▼─────────────────▼───────────────────▼──────────┐  │
│  │                    REST API Gateway                    │  │
│  └──────────────────────────┬───────────────────────────┘   │
│                             │                                │
│  ┌──────────────────────────▼───────────────────────────┐   │
│  │              State Store (Tracker DB)                 │   │
│  │   SatelliteProject · SDLCProcess · PhaseExecution     │   │
│  │   GateEvaluation · ChatboxSession · AgentRun          │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │  calls (stateless evaluation)
          ┌────────────┼────────────────┐
          │            │                │
   MCP HTTP/SSE    REST API        Evolith Core
  (CLI tools)    (satellites)     (read-only rules)
```

**Key invariant:** The CLI and MCP server are **stateless**. They receive a
request, evaluate against Core rulesets, and return a result. The Tracker
writes the result to its own database. Neither Core nor the CLI write to the
Tracker database.

---

## 3. Gap Analysis — What the CLI Needs to Support the Tracker

The table below lists what must be added to the existing CLI (`@evolith/smart-cli`)
for the Tracker to function. The CLI **remains stateless** in all cases.

| Gap | What Is Needed | CLI Layer | New MCP Tool | New REST Endpoint |
|-----|---------------|-----------|:---:|:---:|
| **Phase-scoped validation** | Gate evaluation accepting a phase context parameter | `application` | Yes — `evolith-gate-evaluate` | No |
| **Event emission** | Webhook POST to Tracker when gate completes | `infrastructure` | No | No — outbound webhook |
| **Chatbox endpoint** | Session-aware conversational HTTP endpoint (text in, streamed text out) | `core` | Yes — `evolith-chat` | Yes — `POST /chat` |
| **Structured gate evidence** | Gate tools must return structured JSON evidence (not just pass/fail) | `domain` | Extend existing tools | No |
| **Phase context resolver** | Accept `{ phase, projectId, rulesetRef }` as input on all MCP tools | `application` | Extend existing tools | No |
| **Autonomous agent trigger** | Agent that evaluates all gates for a phase transition without human call | `core` | Yes — `evolith-phase-advance` | Yes — `POST /phase/advance` |

---

## 4. Interface Contracts

### 4.1 Tracker → CLI/MCP (Gate Evaluation)

**Protocol:** MCP HTTP/SSE — `POST /message`, responses via `GET /sse`

```typescript
// Request payload (JSON-RPC 2.0)
interface GateEvaluateRequest {
  jsonrpc: '2.0';
  id: string;
  method: 'tools/call';
  params: {
    name: 'evolith-gate-evaluate';
    arguments: {
      phase: 'discovery' | 'design' | 'construction' | 'qa' | 'release';
      projectPath: string;       // satellite repo path
      rulesetRef: string;        // reference to Core ruleset (e.g. "rulesets/phase-gates/design.yaml")
      evidenceMode: 'full' | 'summary';
    };
  };
}

// Response (via SSE data event)
interface GateEvaluateResponse {
  jsonrpc: '2.0';
  id: string;
  result: {
    content: Array<{
      type: 'text';
      text: string;              // structured JSON evidence as text
    }>;
  };
}

// Parsed evidence structure
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

### 4.2 Tracker REST API (Frontend + CI/CD)

**Base URL:** `https://tracker.evolith.io/api/v1`  
**Auth:** Bearer token (delegated to UMS)

```typescript
// Satellite registration
// POST /satellites
interface RegisterSatelliteRequest {
  name: string;
  repoUrl: string;
  rulesetRef: string;            // points to Evolith Core
}
interface RegisterSatelliteResponse {
  id: string;                    // SatelliteProject.id
  createdAt: string;
}

// Start SDLC process
// POST /satellites/:id/processes
interface StartProcessResponse {
  processId: string;             // SDLCProcess.id
  currentPhase: string;
  startedAt: string;
}

// Advance phase (triggers gate evaluation)
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

// Get process status
// GET /processes/:id
interface ProcessStatusResponse {
  processId: string;
  satelliteId: string;
  currentPhase: string;
  phases: PhaseExecution[];
  driftIndex: number;            // 0–100, 0 = no drift
}

// Get gate history
// GET /processes/:id/gates
interface GateHistoryResponse {
  gates: GateEvaluation[];
}
```

### 4.3 Chatbox API (Developer In-UI)

**Endpoint:** `POST /chat/sessions` (create), `POST /chat/sessions/:id/messages` (send)  
**Protocol:** HTTP with SSE streaming response

```typescript
// Create chatbox session
// POST /chat/sessions
interface CreateSessionRequest {
  processId: string;             // ties session to active SDLC process
  phase: string;
  modelRef?: string;             // LLM model; falls back to configured default
}
interface CreateSessionResponse {
  sessionId: string;             // ChatboxSession.id
  contextSnapshot: {
    phase: string;
    currentGateStatus: string;
    recentViolations: number;
  };
}

// Send message (response streamed via SSE)
// POST /chat/sessions/:id/messages
interface SendMessageRequest {
  role: 'user';
  content: string;
  toolHint?: 'evolith-validate' | 'evolith-metrics' | 'auto';
}
// SSE stream events:
// data: {"type":"token","value":"..."}
// data: {"type":"tool_call","tool":"evolith-validate","result":{...}}
// data: {"type":"done","turnId":"..."}

// Offline/degraded fallback:
// If no LLM API key is configured, the chatbox routes all queries through
// MCP tools only and returns structured text (no generative response).
```

### 4.4 Agent Interface (Autonomous Gate Evaluation)

**Trigger:** Phase transition event from the Process Orchestrator  
**Protocol:** Internal event bus → Agent runner → MCP tool calls

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
  id: string;                    // AgentRun.id
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
  gateEvaluationId: string;      // ref to GateEvaluation created
  startedAt: string;
  completedAt: string;
}
```

### 4.5 Satellite CI Integration

Satellites call the Tracker from their CI pipeline to report events and
receive gate verdicts synchronously.

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

## 5. Tracker Database — Entity Model

```typescript
interface SatelliteProject {
  id: string;
  name: string;
  repoUrl: string;
  rulesetRef: string;            // read-only pointer to Evolith Core
  registeredAt: string;
  active: boolean;
}

interface SDLCProcess {
  id: string;
  satelliteId: string;           // ref SatelliteProject
  currentPhase: 'discovery' | 'design' | 'construction' | 'qa' | 'release' | 'completed';
  startedAt: string;
  completedAt?: string;
  status: 'active' | 'blocked' | 'completed' | 'abandoned';
}

interface PhaseExecution {
  id: string;
  processId: string;             // ref SDLCProcess
  phase: string;
  enteredAt: string;
  exitedAt?: string;
  outcome?: 'passed' | 'failed' | 'skipped';
  notes?: string;
}

interface GateEvaluation {
  id: string;
  phaseExecutionId: string;      // ref PhaseExecution
  gateId: string;
  rulesetRef: string;            // Core ruleset used (read-only reference)
  rulesetVersion: string;
  evaluationMode: 'sync' | 'async' | 'agent';
  verdict: 'passed' | 'failed' | 'skipped' | 'pending';
  evidencePayload: GateEvidence; // full structured evidence (see §4.1)
  evaluatedAt: string;
  evaluatedBy: 'human' | 'agent' | 'ci';
}

interface ChatboxSession {
  id: string;
  processId: string;             // ref SDLCProcess
  phaseExecutionId: string;      // ref PhaseExecution
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
  processId: string;             // ref SDLCProcess
  triggerEvent: AgentTriggerEvent;
  agentType: string;
  toolCallLog: Array<{ tool: string; input: object; output: object; durationMs: number }>;
  outcome: 'passed' | 'failed' | 'error';
  gateEvaluationId?: string;    // ref GateEvaluation produced
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}
```

---

## 6. Design Prompt for Architecture Specification

The following prompt captures the full design scope for the Claude Design agent
tasked with defining the complete Tracker system architecture. It serves as the
canonical reference for the Architecture Spec-Driven phase of the Tracker itself.

**Scope:** The design agent must produce (A) C4 Level-1 System Context Diagram,
(B) C4 Level-2 Container Diagram, (C) full interface contracts for all five
integration surfaces (MCP, REST, Chatbox, Agents, CI webhooks), (D) Gate data
model, (E) ChatboxSession data model, (F) CLI extension requirements table, and
(G) technology recommendations for each Tracker container.

**Constraints for the design agent:**
- CLI hexagonal architecture must be preserved and remain stateless
- Tracker database is internal — no direct external write access
- MCP HTTP/SSE is canonical for AI/agent consumers; REST for non-AI consumers
- Chatbox must degrade gracefully without an LLM API key (MCP-tools-only mode)
- All gate evaluations must carry full traceability: ruleset ref + version + timestamp

---

## 7. Relationship to Evolith Core

| Concern | Owned By | Access |
|---------|---------|--------|
| Rulesets and governance definitions | Evolith Core | Read-only from Tracker |
| SDLC process state | Tracker DB | Write/read by Tracker only |
| Gate evaluation logic | CLI / MCP tools | Called by Tracker, stateless |
| Chatbox session history | Tracker DB | Write/read by Tracker only |
| Agent execution records | Tracker DB | Write/read by Tracker only |

Any rule change must follow the **Upstream Immutability** principle: proposed
as an ADR to `evolith_arch32`, approved by the Architecture Board, then
inherited by the Tracker.

---

*This document is the technical companion to [Evolith Product Vision Master](./evolith-product-vision-master.md) §2.2.6.*
