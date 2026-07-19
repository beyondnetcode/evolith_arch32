# Evolith CLI — Product Vision

> **Bilingual Navigation:** [Versión en Español](./VISION.es.md)
> **Status:** Draft
> **Owner:** Evolith Architecture Board
> **Last Updated:** 2026-06-06

---

## 1. Vision Statement

**Evolith CLI** is the intelligent command-line interface that makes Evolith governance accessible to every developer. It transforms complex architecture decisions into guided, conversational experiences — enabling teams to build compliant software without becoming governance experts.

> *"From complex governance to simple commands."*

---

## 2. Conceptual Image

### 2-1 The Evolith CLI as an AI Companion

```mermaid
graph TB
    subgraph User["Developer Experience"]
        DEV["👨‍💻 Developer"]
        NAT["Natural Language\n'I need to validate my repo'"]
        CONV["Conversational Flow"]
    end

    subgraph CLI["Evolith CLI Engine"]
        PARSE["Intent Parser"]
        CONTEXT["Context Engine\n(Evolith Core)"]
        GUIDANCE["Guided Wizard"]
        EXEC["Smart Execution"]
    end

    subgraph Output["Outcome"]
        VALID["Validated ✓"]
        REPORT["Report / Artifact"]
        CONFIG["Generated Config"]
    end

    DEV --> NAT
    NAT --> CONV
    CONV --> PARSE
    PARSE --> CONTEXT
    CONTEXT --> GUIDANCE
    GUIDANCE --> EXEC
    EXEC --> VALID
    EXEC --> REPORT
    EXEC --> CONFIG

    style User fill:#1e3a5f,stroke:#3b82f6,color:#fff
    style CLI fill:#065f46,stroke:#10b981,color:#fff
    style Output fill:#4a1d96,stroke:#a855f7,color:#fff
```

### 2-2 The CLI as a Window to Evolith Core

```mermaid
graph TB
    subgraph EvolithCore["Evolith Core\n(Reference Corpus)"]
        CORE_ADRS["ADRs"]
        CORE_RULES["Rulesets"]
        CORE_STDS["Standards"]
        CORE_TAX["Taxonomy"]
    end

    subgraph SmartCLI["Evolith CLI\n(Interoperability Layer)"]
        CLI_CMD["Commands\ninit, validate, adr, agents, sdlc"]
        CLI_MCP["MCP Server\nTools + Resources"]
        CLI_INT["Intelligent Context"]
    end

    subgraph Users["Developer Ecosystem"]
        IDE["Cursor / Claude\n(AI Assistants)"]
        TERMINAL["Direct Terminal\nUsage"]
        CI["CI/CD Pipelines"]
    end

    Users --> CLI_CMD
    Users --> CLI_MCP
    CLI_CMD --> CORE_ADRS
    CLI_CMD --> CORE_RULES
    CLI_CMD --> CORE_STDS
    CLI_CMD --> CORE_TAX
    CLI_MCP --> CORE_ADRS
    CLI_MCP --> CORE_RULES

    style EvolithCore fill:#1e3a5f,stroke:#3b82f6,color:#fff
    style SmartCLI fill:#065f46,stroke:#10b981,color:#fff
    style Users fill:#4a1d96,stroke:#a855f7,color:#fff
```

---

## 3. Core Value Propositions

### 3-1 For Individual Developers

| Before (Without Evolith CLI) | After (With Evolith CLI) |
|---------------------------|------------------------|
| Read 50 pages of ADRs | Ask: `evolith-cli adr suggest --context authentication` |
| Manually validate 20 rules | Run: `evolith-cli validate --ruleset acl` |
| Guess architecture patterns | Get guided: `evolith-cli init --wizard` |
| Search docs for hours | `evolith-cli architecture ask "What's the auth pattern?"` |

### 3-2 For Teams

```mermaid
graph LR
    subgraph Before["Without Evolith CLI"]
        A1["Inconsistent\nChoices"]
        A2["Governance\nDebt"]
        A3["Knowledge\nSilos"]
    end

    subgraph After["With Evolith CLI"]
        B1["Guided\nDecisions"]
        B2["Automatic\nCompliance"]
        B3["Shared\nKnowledge"]
    end

    A1 -.->|"Friction"| B1
    A2 -.->|"Risk"| B2
    A3 -.->|"Bottleneck"| B3

    style Before fill:#9f1239,stroke:#f43f5e,color:#fff
    style After fill:#065f46,stroke:#10b981,color:#fff
```

---

## 4. Product Concept: Three Modes

### 4-1 Interactive Mode (Default)

Guided wizards with rich UI:

```
┌─────────────────────────────────────────────────┐
│  🚀 Evolith CLI Init Wizard                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  Let's set up your satellite repository.        │
│                                                 │
│  ◆ Project Name: [________________]             │
│                                                 │
│  ◆ Runtime:                                     │
│    ○ NodeJS / TypeScript                        │
│    ○ .NET / C#                                  │
│    ○ Android / Kotlin                           │
│                                                 │
│  ◆ Architecture:                                │
│    ○ Clean Architecture                         │
│    ○ Hexagonal (Ports & Adapters)               │
│    ○ DDD (Domain-Driven Design)                 │
│                                                 │
│  ◆ Monorepo:                                    │
│    ○ None (standalone)                          │
│    ○ Nx                                         │
│    ○ NPM Workspaces                             │
│                                                 │
│  ◆ Install Agents:                              │
│    □ @architect (recommended)                   │
│    □ @validator                                 │
│                                                 │
│           [Cancel]              [Create →]      │
└─────────────────────────────────────────────────┘
```

### 4-2 Batch Mode (CI/CD)

Silent execution with JSON output:

```bash
evolith-cli init --config project.yaml --output json | tee setup-report.json
```

### 4-3 MCP Mode (AI Integration)

stdio JSON-RPC for AI assistants:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "evolith-validate",
    "arguments": { "path": "/repo", "format": "summary" }
  }
}
```

---

## 5. Experience Principles

### 5-1 Five-Star Developer Experience

```mermaid
graph TB
    E1["✨ Progressive Disclosure\nStart simple, reveal depth on demand"]
    E2["🔮 Predictive Guidance\nAnticipate needs before asked"]
    E3["🛡️ Safe by Default\nBlock errors, enable exploration"]
    E4["⚡ Instant Feedback\nEvery action has visible result"]
    E5["🌐 Context-Aware\nKnows your project, your phase, your goals"]

    E1 --> E2 --> E3 --> E4 --> E5 --> E1

    style E1 fill:#1e3a5f,stroke:#3b82f6,color:#fff
    style E2 fill:#065f46,stroke:#10b981,color:#fff
    style E3 fill:#4a1d96,stroke:#a855f7,color:#fff
    style E4 fill:#c2410c,stroke:#f97316,color:#fff
    style E5 fill:#9f1239,stroke:#f43f5e,color:#fff
```

### 5-2 Minimal Cognitive Load

```
┌─────────────────────────────────────────────────────────────┐
│                    cognitive load curve                      │
│                                                             │
│   ▲                                                         │
│   │         Without CLI        │    With Evolith CLI          │
│   │                            │                            │
│ 4 │    ┌───────────────────    │    ┌─                     │
│   │    │ Complex decisions     │    │  Guided defaults     │
│ 3 │    │ buried in docs        │    │  Context-aware help  │
│   │    └───────────────────────    │  ─────────────────────│
│ 2 │                                 │                      │
│   │                              ───┘                       │
│ 1 │    ┌─────────────────────────────────────────          │
│   │    │ Simple commands, clear outcomes                   │
│   │    └───────────────────────────────────────────────────
│   └────────────────────────────────────────────────────────►
│         Novice          Intermediate        Expert
│                        Developer Skill
└─────────────────────────────────────────────────────────────┘
```

---

## 6. User Journey: First 5 Minutes

### 6-1 Discovery → Production in 5 Minutes

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant CLI as Evolith CLI
    participant Core as Evolith Core
    participant Repo as New Repo

    Dev->>CLI: evolith-cli init
    CLI->>CLI: Show wizard
    Dev->>CLI: Enter: name=my-app, runtime=nodejs
    CLI->>Core: Load defaults for nodejs
    Core-->>CLI: Recommended patterns + tools
    CLI->>Dev: Show recommendations
    Dev->>CLI: Accept defaults
    CLI->>Repo: Create structure + evolith.yaml
    CLI->>Repo: Install @architect agent
    CLI->>Core: Register satellite
    Core-->>Repo: Confirmed + coreRef
    CLI-->>Dev: ✓ Ready! Run: evolith-cli validate

    Note over Dev,Repo: 5 minutes to production-ready satellite
```

### 6-2 Typical Session Flows

```mermaid
graph TB
    subgraph Morning["Morning Context Check"]
        M1["evolith-cli sdlc status"] --> M2["Phase gate health"]
        M2 --> M3["Gates: 3/5 passed ✓"]
    end

    subgraph Task["Development Task"]
        T1["evolith-cli validate"] --> T2["Rule checks: 15 passed"]
        T2 --> T3["Warnings: 2 (non-blocking)"]
        T3 --> T4["Fix suggestion: Run evolith-cli docs --fix"]
    end

    subgraph Review["Code Review"]
        R1["evolith-cli adr list"] --> R2["Show: 5 ADRs active"]
        R2 --> R3["Check: ADR-0023 still valid?"]
        R3 --> R4["Decision: still applies ✓"]
    end

    style Morning fill:#1e3a5f,stroke:#3b82f6,color:#fff
    style Task fill:#065f46,stroke:#10b981,color:#fff
    style Review fill:#4a1d96,stroke:#a855f7,color:#fff
```

---

## 7. Brand Identity

### 7-1 Visual Concept

```
╔═══════════════════════════════════════════════════════════════╗
║                                                                ║
║     ██████╗ ███████╗███╗   ██╗ ██████╗  ██████╗ ██████╗      ║
║     ██╔══██╗██╔════╝████╗  ██║██╔════╝ ██╔═══██╗██╔══██╗     ║
║     ██████╔╝█████╗  ██╔██╗ ██║██║  ███╗██║   ██║██████╔╝     ║
║     ██╔═══╝ ██╔══╝  ██║╚██╗██║██║   ██║██║   ██║██╔══██╗     ║
║     ██║     ███████╗██║ ╚████║╚██████╔╝╚██████╔╝██║  ██║     ║
║     ╚═╝     ╚══════╝╚═╝  ╚═══╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝     ║
║                                                                ║
║              ╔═══════════════════════════════╗                ║
║              ║    evolith-cli — evolve smart    ║                ║
║              ╚═══════════════════════════════╝                ║
║                                                                ║
║     Colors:                                                    ║
║       Primary: #3B82F6 (Blue — Trust)                         ║
║       Accent:  #10B981 (Green — Success)                      ║
║       Dark:    #1E3A5F (Navy — Professional)                  ║
║       Alert:   #EF4444 (Red — Attention)                      ║
║                                                                ║
╚═══════════════════════════════════════════════════════════════╝
```

### 7-2 Logo Concept

```mermaid
graph TB
    subgraph LogoConcept["Logo: The Smart Pointer"]
        ICON["▶"]
        TEXT["evolith-cli"]
        CONTEXT["evolve → smart"]
    end

    style ICON fill:#10b981,stroke:#10b981,color:#fff
    style TEXT fill:#1e3a5f,stroke:#3b82f6,color:#fff
    style CONTEXT fill:#4a1d96,stroke:#a855f7,color:#fff
```

**Concept:** The play button (▶) represents forward motion, intelligent progression, and action. The arrow suggests guidance toward better architecture decisions.

---

## 8. Success Metrics

### 8-1 Developer Adoption KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first successful validation | < 2 min | Telemetry |
| Commands executed per session | > 5 | Analytics |
| MCP tool usage by AI assistants | Growing | Integration logs |
| Adherence index of CLI-guided projects | > 85% | Periodic audit |

### 8-2 Quality Gates

```mermaid
graph TB
    G1["✓ Syntax Valid"] --> G2["✓ Semantics Valid"]
    G2 --> G3["✓ Context-Aware"]
    G3 --> G4["✓ Best Practice Aligned"]
    G4 --> G5["✓ Production Ready"]

    style G1 fill:#1e3a5f,stroke:#3b82f6,color:#fff
    style G2 fill:#065f46,stroke:#10b981,color:#fff
    style G3 fill:#4a1d96,stroke:#a855f7,color:#fff
    style G4 fill:#c2410c,stroke:#f97316,color:#fff
    style G5 fill:#9f1239,stroke:#f43f5e,color:#fff
```

---

## 9. Roadmap

| Phase | Focus | Milestone |
|-------|-------|-----------|
| **Beta** | Core commands | validate, init, adr, agents |
| **v1.0** | MCP integration | Full tool suite + AI assistant support |
| **v1.1** | Phase guidance | Interactive SDLC wizard |
| **v2.0** | Autonomous agents | Self-healing architecture compliance |

---

*Evolith CLI — Making Evolith governance accessible, one command at a time.*

---

[Back to CLI Index](../README.md)