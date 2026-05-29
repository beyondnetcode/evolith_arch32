# Harness AI Agent — Enterprise Platform Evaluation

> **Bilingual navigation:** [Español](./harness-platform-evaluation.es.md)  
> **Owner:** Evolith Architecture Board  
> **Status:** Evaluation — Recommended for Phase 2 adoption  
> **Last reviewed:** 2026-05-27

> **Disambiguation:** This document evaluates **Harness.io** (the enterprise DevOps platform) and its AI Agent capabilities as an orchestration layer for the Evolith AI Architecture Assistant. This is distinct from "Harness Engineering" (the methodology for wrapping AI models, documented in [01-harness-engineering](../01-harness-engineering/harness-reference.md)).

---

## 1. What Is Harness AI Agent?

Harness is an enterprise DevOps platform providing CI/CD, cloud cost management, feature flags, security testing, and — relevant here — **Harness AI (AIDA)**: an AI-native layer embedded across the platform that can:

- **Generate and review code** via AI Developer (Code Intelligence)
- **Automate pipeline workflows** with AI-driven orchestration
- **Root-cause analysis** for failed pipelines
- **Governance and approval workflows** for AI-generated changes
- **Self-hosted deployment** for private knowledge isolation

### Harness AI Agent vs. Other Tools in the Ecosystem

| Capability | Claude Code | GitHub Copilot | Cursor / Cline | **Harness AI Agent** |
|---|---|---|---|---|
| IDE code generation | Yes | Yes | Yes | No |
| PR review automation | Yes | Yes | No | Yes |
| Pipeline orchestration | No | No | No | Yes |
| Multi-agent workflow | Yes | No | No | Yes |
| Human approval loops | Yes | No | No | Yes |
| Private deployment | Yes | No | No | Yes |
| CI/CD integration | No | Yes | No | Yes |
| Governance workflows | No | No | No | Yes |
| Cost tracking | No | No | No | Yes |
| Knowledge base RAG | Yes | No | No | Yes (via MCP / custom) |

**Conclusion:** Harness AI Agent is uniquely positioned as the **orchestration and governance layer** — not as the primary code assistant, but as the platform that manages AI workflows, approval chains, and pipeline automation across all other tools.

---

## 2. Recommended Architecture: Harness as Orchestrator

```
┌──────────────────────────────────────────────────────────────────┐
│                    EVOLITH AI ECOSYSTEM                          │
│                                                                  │
│  IDE LAYER (Developer tools)                                     │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐  │
│  │   Claude   │ │   Cursor   │ │   Cline    │ │   Copilot    │  │
│  │   Code     │ │            │ │   / Roo    │ │              │  │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └──────┬───────┘  │
│        │              │              │               │           │
│        └──────────────┴──────────────┴───────────────┘           │
│                              │                                   │
│                   Evolith Knowledge Layer (RAG)                  │
│                   [ADRs · Patterns · Standards]                  │
│                              │                                   │
│  ┌───────────────────────────▼──────────────────────────────┐   │
│  │              HARNESS AI AGENT PLATFORM                   │   │
│  │                                                          │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │   │
│  │  │ Orchestrator│  │ Approval     │  │ Pipeline        │ │   │
│  │  │ Agent       │  │ Workflows    │  │ Automation      │ │   │
│  │  │             │  │ (HITL)       │  │                 │ │   │
│  │  └─────────────┘  └──────────────┘  └─────────────────┘ │   │
│  │                                                          │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │   │
│  │  │ Compliance  │  │ Multi-agent  │  │ Cost &          │ │   │
│  │  │ Gate        │  │ Coordination │  │ Governance      │ │   │
│  │  └─────────────┘  └──────────────┘  └─────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌───────────────────────────▼──────────────────────────────┐   │
│  │           DELIVERY LAYER (GitHub Actions / CI)           │   │
│  │  ADR compliance gate · Coverage gate · Security scan     │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Integration Possibilities

### 3.1 Harness as Architecture Compliance Gate

Harness pipelines can integrate a custom **Architecture Compliance Step** that:
- Calls the Evolith RAG API
- Validates the PR diff against ADR constraints
- Blocks pipeline if hard constraints are violated
- Generates a compliance report as a PR comment

```yaml
# Example Harness pipeline step
- step:
    type: Plugin
    name: Evolith Architecture Gate
    identifier: evolith_arch_gate
    spec:
      connectorRef: evolith_rag_connector
      image: evolith/arch-gate:latest
      settings:
        adr_registry_url: ${EVOLITH_KNOWLEDGE_BASE_URL}
        fail_on_hard_violations: true
        report_warnings: true
        phase: ${PRODUCT_PHASE}
        runtime: ${PRODUCT_RUNTIME}
```

### 3.2 Harness AI + ADR Review Workflow

When a developer proposes a new ADR via PR, Harness orchestrates:

```
PR opened with new ADR
        │
        ▼
[Harness] Trigger: AI ADR Review Pipeline
        │
        ▼
[Agent 1] Validate ADR template completeness
  - Context section present?
  - Decision clearly stated?
  - Consequences documented?
  - References existing ADRs?
        │
        ▼
[Agent 2] Check for conflicts with existing ADRs
  - Semantic similarity search against ADR corpus
  - Detect if new ADR supersedes an existing one
  - Detect contradictions
        │
        ▼
[Human Approval] Architecture Board notification
  - Harness approval gate with Board member list
  - Minimum 2 approvals required
  - Rejection requires documented rationale
        │
        ▼
[Agent 3] On approval: Update ADR index + trigger knowledge re-ingestion
```

### 3.3 Harness Multi-Agent Workflow for Feature Development

```
Developer creates feature branch
        │
        ▼
[Harness Trigger] AI-Assisted Feature Pipeline
        │
   ┌────┴──────────────────────────────────────┐
   │                                           │
   ▼                                           ▼
[Architect Agent]                    [Coder Agent]
  Query: "Which ADRs apply           Generate: scaffold following
  to this feature?"                  canonical pattern CP-04
  Output: ADR list + constraints     Output: code skeleton
   │                                           │
   └────────────────┬──────────────────────────┘
                    │
                    ▼
            [Reviewer Agent]
            Validate generated code
            against retrieved ADRs
                    │
            ┌───────┴──────────┐
            │                  │
        VIOLATIONS          ALL PASS
         FOUND                 │
            │                  ▼
            ▼           [QA Agent]
     Return to         Generate test
     Coder Agent       scaffold
     with fix                  │
     instructions              ▼
                    [Human Review Gate]
                    Developer reviews
                    all AI output
                    before commit
```

### 3.4 Private Knowledge Isolation

Harness supports **self-hosted deployment** and **private AI model routing**, enabling:
- ADRs and proprietary standards never leave the corporate network
- AI models can be self-hosted (Llama, Mistral) or corporate-contracted (Claude, GPT-4 via private API)
- Knowledge base stored in private vector store (Qdrant self-hosted)
- All AI traffic stays within VPC perimeter

---

## 4. Governance Model

### 4.1 Harness Approval Gates in the AI Workflow

| Gate | Trigger | Approvers | SLA |
|---|---|---|---|
| ADR Draft Review | New ADR PR opened | Architecture Board (2 of 3) | 48h |
| Hard Violation Override | AI blocks a pattern as violation | Architecture Board (unanimous) | 24h |
| New Tool Adoption | AI flags unknown tool | Architect + Security Engineer | 72h |
| Production Infra Change | AI-generated IaC targets prod | Engineering Manager + DevOps Lead | 24h |
| Knowledge Base Update | Evolith version bump | Architecture Board | 1 week |

### 4.2 Audit Trail

Every AI action in the Harness workflow is logged with:
- Agent ID and version
- Knowledge base version used
- ADRs retrieved in context
- Human approvals recorded
- Violations found and disposition

This creates a **full traceability chain**: requirement → ADR → AI suggestion → human approval → commit.

---

## 5. Security and Private Knowledge Controls

| Control | Implementation |
|---|---|
| **Network isolation** | All Harness agents run in private VPC; no external AI API calls without approved connector |
| **Knowledge classification** | ADRs tagged `public` / `internal` / `confidential`; confidential ADRs excluded from vendor contexts |
| **Credential isolation** | AI agents access knowledge base via service accounts with read-only scopes |
| **Audit logging** | All AI queries and responses logged to immutable audit trail (extends ADR-0016) |
| **Model governance** | Only models approved via ADR-AI-003 can be invoked from Harness pipelines |
| **Data residency** | Self-hosted Harness + self-hosted vector store ensures data never leaves region |

---

## 6. Evaluation Summary

| Dimension | Score | Notes |
|---|---|---|
| Orchestration capability | [Excellent] | Native multi-agent, approval workflows, pipeline integration |
| Knowledge base integration | [Good] | Via MCP or custom plugin; not native RAG |
| IDE experience | [Limited] | Not a developer IDE tool; best as CI/CD layer |
| Self-hosted support | [Excellent] | Full self-hosted option for private deployments |
| Governance workflows | [Excellent] | Native HITL approval gates, audit trails |
| Cost | [Medium] | Enterprise pricing; justified for large org use |
| Setup complexity | [Medium] | Requires pipeline configuration expertise |
| Multi-agent support | [Excellent] | Native agent orchestration |

### Recommendation

**Adopt Harness AI Agent as the orchestration and governance layer (Phase 2+).**

- **Phase 1:** Use harness engineering approach (AGENTS.md + system prompts) in IDE tools
- **Phase 2:** Add Harness AI pipeline steps for compliance gates and ADR review workflows
- **Phase 3:** Full multi-agent orchestration via Harness for feature development pipelines

Harness is **not a replacement** for IDE tools (Claude Code, Cursor, Copilot). It is the **enterprise control plane** that governs what AI agents can do and ensures human oversight at critical decision points.

---

*Part of the [AI Architecture Assistant Strategy](./ai-architecture-assistant-strategy.md)*
