# Architecture View: Flows & Governance

> **Bilingual Navigation:** [Versión en Español](./view-by-flow.es.md)

**Status:** Approved  
**Parent:** [C4 Master Architecture](../C4-MASTER-ARCHITECTURE.md)

## 1. Flow Overview

This view details the step-by-step systemic flow of how Evolith enforces its governance rules. It demonstrates the traceability from the Tracker SaaS (where the process is requested) through the Core Engine (where it is evaluated) to the final output.

## 2. Standard Gate Evaluation Flow

This sequence shows how an automated or human-triggered gate assessment occurs.

```mermaid
sequenceDiagram
    autonumber
    actor User as Engineer (via Tracker/CLI)
    participant Tracker as Evolith Tracker BFF
    participant CoreAPI as Core API
    participant Resolver as Workspace Resolver
    participant OPA as OPA Evaluator
    participant Redis as Cache

    User->>Tracker: Request Gate Evaluation (e.g. "RC Stamped")
    Tracker->>CoreAPI: POST /api/v1/evaluate { workspaceRef, kinds, evidence, phaseId, gateId }
    
    CoreAPI->>Resolver: Resolve workspaceRef
    Resolver-->>CoreAPI: Absolute Corpus Path
    
    CoreAPI->>Redis: Get ruleset for Phase/Gate
    alt Cache Miss
        CoreAPI->>Disk: Read rulesets/phase-gates/phase-gates.rules.json
        CoreAPI->>Redis: Set ruleset
    end
    
    CoreAPI->>OPA: Execute native/OPA evaluators (input = EvaluationContext + rulesets)
    OPA-->>CoreAPI: EvaluationResult (overallVerdict + non-binding recommendation)
    
    CoreAPI-->>Tracker: Technical Evaluation Result
    Tracker->>Tracker: Update Canonical State (Gate Decision)
    Tracker-->>User: Present Final Verdict
```

## 3. Agentic Workflow (Command/Event)

This sequence shows how an AI Agent is governed in real time when performing multi-step tasks. The caller sends explicit commands; SSE is only one possible transport for server-to-client events after the command is accepted.

```mermaid
sequenceDiagram
    autonumber
    actor Tracker as Tracker SaaS
    participant RuntimeAPI as Agent Runtime Command/Event API
    participant Orch as AgentOrchestrator
    participant Boundary as OPA Boundary Enforcer
    participant LLM as External LLM
    participant Exec as .harness Exec Port

    Tracker->>RuntimeAPI: Submit command (POST /v1/agent/handle or /v1/agent/stream)
    RuntimeAPI-->>Tracker: Return result envelope or accept command and open event stream
    
    Orch->>LLM: Send Context & Allowed Tools
    loop Until Task Complete
        LLM-->>Orch: Tool Call (e.g. validate_code)
        
        Orch->>Boundary: Can the LLM run this tool on these files?
        Boundary-->>Orch: Allowed (or Denied)
        
        alt Allowed
            Orch->>Exec: Run tool script
            Exec-->>Orch: Script Output
            Orch-->>RuntimeAPI: Emit tool-result event
            Orch->>LLM: Return Output
        else Denied
            Orch-->>RuntimeAPI: Emit violation event
            Orch->>LLM: Error - Action not permitted
        end
    end
    
    Orch-->>RuntimeAPI: Emit final-output event
    RuntimeAPI-->>Tracker: Deliver events over SSE or equivalent event stream
```

---
[Back to Master Architecture](../C4-MASTER-ARCHITECTURE.md)
