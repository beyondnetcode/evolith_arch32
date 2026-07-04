# Evolith AI Architecture Assistant — Strategy & Work Plan

> **Bilingual navigation:** [Español](./ai-architecture-assistant-strategy.es.md)  
> **Owner:** Evolith Architecture Board  
> **Status:** Approved for Incremental Adoption  
> **Last reviewed:** 2026-05-27

---

## 1. Vision

### 1.1 The Core Idea

> **Every AI coding agent that touches corporate software must reason as if the Principal Architect is in the room.**

The Evolith knowledge base — 57+ ADRs, blueprints, canonical patterns, DDD rules, SDLC standards, governance policies, naming conventions, and observability standards — becomes the **enterprise-grade memory** of every AI assistant in the organization.

This is not about building a chatbot. It is about making the architectural standards **self-enforcing** through AI — so that no matter which tool a developer, vendor, or agent uses (Claude, Copilot, Cursor, Codex, Roo, Cline, Continue), they always get architecture-aligned suggestions, rejections, and explanations.

### 1.2 The Principal Architect Persona

The AI Architecture Assistant operates as a **Principal Architect** persona with four behavioral modes:

```
┌─────────────────────────────────────────────────────────────────┐
│               EVOLITH AI ARCHITECTURE ASSISTANT                 │
│                   "Principal Architect"                         │
├─────────────────┬───────────────────────────────────────────────┤
│ MODE            │ BEHAVIOR                                      │
├─────────────────┼───────────────────────────────────────────────┤
│  GUIDE        │ Proactively explains the right architectural  │
│                 │ approach before code is written               │
├─────────────────┼───────────────────────────────────────────────┤
│  VALIDATE     │ Reviews generated code against ADRs and       │
│                 │ standards; flags violations with citations     │
├─────────────────┼───────────────────────────────────────────────┤
│  QUERY        │ Answers "which ADR governs X?" or             │
│                 │ "what is the canonical pattern for Y?"         │
├─────────────────┼───────────────────────────────────────────────┤
│  BLOCK        │ Rejects suggestions that violate              │
│                 │ non-negotiable constraints (hard guardrails)   │
└─────────────────┴───────────────────────────────────────────────┘
```

---

## 2. Knowledge Ingestion Strategy

### 2.1 The Knowledge Pyramid

```
                        ┌─────────────────┐
                        │  LIVE CONTEXT   │  ← Current file, PR diff,
                        │   (In-prompt)   │    active conversation
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │   RETRIEVED     │  ← RAG: semantic search over
                        │   KNOWLEDGE     │    vectorized Evolith corpus
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │    INJECTED     │  ← AGENTS.md, system prompt,
                        │   FOUNDATION    │    harness rules (always present)
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │    TRAINED      │  ← Fine-tuned model or
                        │   KNOWLEDGE     │    cached base knowledge
                        └─────────────────┘
```

### 2.2 Ingestion Pipeline

```
EVOLITH REPOSITORY                    AI KNOWLEDGE BASE
─────────────────                     ─────────────────

reference/core/architecture/adrs/          ┌─────────────────────┐
  *.md files (57+ ADRs)     ──────── │  ADR Vector Store   │
                                       │  (chunked by section│
reference/core/architecture/                │   + metadata tags)  │
  blueprints/*.md           ──────── │  Blueprint Store    │
                                       └─────────────────────┘
reference/core/sdlc/
  standards/**/*.md         ──────── ┌─────────────────────┐
                                       │  Standards Store    │
reference/core/architecture/                │  (enforcement rules │
  canonical-patterns/*.md   ──────── │   + code examples)  │
                                       └─────────────────────┘
AGENTS.md / .harness/rules/ ──────── ┌─────────────────────┐
  global-rules.md                      │  System Prompt Core │
                                       │  (always injected)  │
                                       └─────────────────────┘
```

### 2.3 Chunking Strategy per Artifact Type

| Artifact | Chunk unit | Metadata tags | Retrieval trigger |
|---|---|---|---|
| ADR | One chunk per section (Context / Decision / Consequences) | `adr_id`, `runtime`, `phase`, `domain`, `status` | "how do I…", "which ADR…", "should I use…" |
| Blueprint | One chunk per C4 level / diagram | `layer`, `component`, `runtime` | "how does X connect to Y", "what is the topology" |
| Canonical Pattern | Full pattern as single chunk | `pattern_name`, `runtime`, `adr_ref`, `phase` | "show me the pattern for…", "how to implement…" |
| Engineering Standard | One chunk per rule/principle | `standard_type`, `enforcement`, `severity` | "is this allowed", "validate this code" |
| Naming Convention | Full conventions table | `runtime`, `layer`, `artifact_type` | "how should I name…", "is this naming correct" |
| Governance Policy | One chunk per policy item | `policy_type`, `mandatory`, `board_approval` | "do I need approval for…", "what is the process" |
| SDLC / DoD | One chunk per stage checklist | `phase`, `role`, `gate_type` | "is this ready to ship", "what is the DoD" |

### 2.4 Semantic Index Design

Each document chunk is stored with a structured metadata envelope:

```json
{
  "chunk_id": "adr-0002-decision",
  "source": "reference/core/architecture/adrs/nodejs/0002-clean-architecture-nestjs.md",
  "artifact_type": "ADR",
  "adr_id": "0002",
  "section": "decision",
  "runtime": ["nodejs", "typescript"],
  "phase": ["1", "2", "3"],
  "domain": ["architecture", "hexagonal", "clean-architecture"],
  "status": "approved",
  "severity": "mandatory",
  "keywords": ["hexagonal", "ports", "adapters", "nestjs", "boundaries"],
  "last_updated": "2026-05-27",
  "version": "1.0"
}
```

This envelope enables **filtered retrieval** — the agent queries by runtime, phase, and domain before hitting the vector similarity search, dramatically reducing hallucination risk.

---

## 3. How Each Knowledge Type Is Exposed to AI

### 3.1 ADRs → Decision Context

ADRs are the most critical artifact. The AI must be able to:
- Cite the ADR when making a suggestion
- Explain why the decision was made (context section)
- List the consequences (trade-offs)
- Point to the superseding ADR if applicable

**Prompt pattern for ADR retrieval:**
```
When a developer asks about [TOPIC], retrieve the relevant ADR(s) and:
1. State which ADR governs this (with ID and title)
2. Summarize the decision in one sentence
3. Explain the primary trade-off
4. If the question implies a violation, explain why and cite the constraint
```

### 3.2 DDD Rules → Domain Protection

```
RULE: Domain layer has zero infrastructure imports.

AI enforcement pattern:
- DETECT: Any import from ORM, HTTP, SDK, or persistence library inside
  a class that inherits from AggregateRoot, Entity, or ValueObject
- BLOCK: "This violates ADR-0002 (Hexagonal Architecture). The domain
  layer must not import [detected library]. Move this logic to an
  infrastructure adapter implementing [suggested port interface]."
- SUGGEST: Generate the correct Port interface + Adapter skeleton
```

### 3.3 Coding Standards → Real-time Validation

| Standard | AI Behavior | Severity |
|---|---|---|
| SOLID principles | Flag violations in PR review mode | Warning |
| No God Classes | Detect if class has >3 responsibilities | Error |
| No raw SQL in domain | Block any `SELECT` inside domain classes | Hard block |
| Naming conventions (ADR-0056) | Validate names against Ubiquitous Language glossary | Warning |
| No `^` or `~` in dependencies | Detect in package.json/csproj, auto-fix | Auto-fix |
| Test coverage ≥70% | Warn if new code reduces coverage | Warning |
| Result Pattern for error handling | Suggest when try/catch is used in domain | Suggestion |

### 3.4 Architecture Patterns → Generative Guidance

Canonical patterns (CP-01..08) are exposed as **code generation templates**:

```
QUERY: "I need to implement a repository for tenant-isolated data"

AI RESPONSE:
→ Retrieves: CP-04 (Multi-Tenant RLS Repository)
→ Generates: Scaffold of the pattern adapted to the current runtime
→ Cites: ADR-0010 (Multi-Tenancy), ADR-0044 (Configurable Security)
→ Warns: "Remember to inject TenantContext via SESSION_CONTEXT —
          never hardcode tenant_id in queries"
```

### 3.5 Governance Policies → Approval Routing

```
POLICY ENFORCEMENT TREE:

New tool/library proposed by AI or developer?
  → Check Approved Tools Catalog (03-tools-catalog)
  → If not listed: "This tool requires Architecture Board ADR approval
    before adoption. Use [alternative from catalog] instead."

New architectural pattern not in ADR registry?
  → "This pattern is not in the Evolith ADR registry. Create an ADR
    proposal at reference/core/architecture/adrs/[runtime]/ following the
    template, then request Board review."

Cross-schema SQL join detected?
  → "Hard violation of ADR-0031 (Schema-per-Context). This is
    architecturally prohibited. Expose data via domain events or
    an explicit API contract."
```

### 3.6 Security Rules → Zero-Tolerance Guardrails

```
HARD BLOCKS (AI must never generate or approve):
  × SDK imports (AWS, Azure, etc.) outside infrastructure adapters
  × Raw SQL with string concatenation (SQL injection risk)
  × Hardcoded secrets or credentials in any layer
  × Cross-tenant data access without SESSION_CONTEXT validation
  × Stored procedures containing business logic (ADR violation)
  × Direct database access from controllers or use cases

SOFT WARNINGS (AI flags and explains):
  ~ Missing OWASP input validation on DTOs
  ~ Missing rate limiting on public endpoints
  ~ Missing correlation_id in log statements
  ~ JWT expiry longer than 1 hour without refresh strategy
```

### 3.7 Observability Standards → Auto-instrumentation Guidance

```
TRIGGER: New service method created

AI BEHAVIOR:
1. Check if OpenTelemetry span is added
2. Check if structured log with correlation_id is present
3. Check if exception is caught and logged with trace context
4. If missing: suggest OTel instrumentation code following
   ADR-0007 (OTel + Loki) with W3C TraceContext headers
```

### 3.8 Testing Standards → Coverage Guardian

```
TRIGGER: Code generation or PR review

AI BEHAVIOR:
1. Generate unit test alongside every new use case (ADR-0052)
2. Suggest Testcontainers integration test for repository implementations
3. Remind: "This use case has external dependencies — add a contract
   test per the Contract Testing Guideline"
4. Block PR merge suggestion if coverage estimate drops below 70%
```

---

## 4. AI Agent Reasoning Framework

### 4.1 The 5-Step Architecture Reasoning Chain

Every AI agent involved in architectural decisions follows this reasoning chain before generating output:

```
STEP 1 — CONTEXT CLASSIFICATION
  Determine: Is this a domain, application, or infrastructure concern?
  Rule: Domain concerns have zero infrastructure coupling allowed.

STEP 2 — ADR LOOKUP
  Query: Which ADRs govern this concern?
  Action: Retrieve top-3 relevant ADRs by semantic similarity + metadata filter.

STEP 3 — PHASE AWARENESS
  Determine: Which Evolith phase is this product in? (1, 2, or 3)
  Rule: Never suggest Phase 3 patterns for a Phase 1 product.

STEP 4 — CONSTRAINT CHECK
  Validate: Does the proposed solution violate any hard constraint?
  If YES → Block and explain.
  If NO → Proceed with generation.

STEP 5 — CITATION
  Every suggestion MUST include:
  - Which ADR(s) authorize it
  - Which phase it belongs to
  - Whether it is mandatory or optional
```

### 4.2 Confidence Tiers

```
┌─────────────────────────────────────────────────────────────┐
│  TIER 1 — AUTHORITATIVE (ADR exists, approved, mandatory)  │
│  AI responds with full confidence + ADR citation            │
│  Example: "Use Hexagonal Architecture. See ADR-0002."       │
├─────────────────────────────────────────────────────────────┤
│  TIER 2 — GUIDED (Standard exists, no explicit ADR)        │
│  AI responds with recommendation + standard citation         │
│  Example: "Engineering Manifesto §3 prohibits God Classes." │
├─────────────────────────────────────────────────────────────┤
│  TIER 3 — INFERRED (No explicit rule, derived from pattern)│
│  AI responds with suggestion + explicit uncertainty flag     │
│  Example: "No ADR exists for this. Suggest reviewing with   │
│  your Architecture Board before proceeding."                │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Agent Ecosystem — Roles and Responsibilities

### 5.1 The Multi-Agent Architecture

```
                    ┌─────────────────────────────┐
                    │    ORCHESTRATOR AGENT        │
                    │  Routes queries to the       │
                    │  right specialist agent      │
                    └──────────────┬──────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │              │           │            │              │
┌───────▼──────┐ ┌─────▼──────┐ ┌─▼──────────┐ ┌─────▼──────┐ ┌─────▼──────┐
│  ARCHITECT   │ │  REVIEWER  │ │  CODER     │ │  QA        │ │  DEVOPS    │
│  AGENT       │ │  AGENT     │ │  AGENT     │ │  AGENT     │ │  AGENT     │
│              │ │            │ │            │ │            │ │            │
│ ADR lookup   │ │ PR review  │ │ Code gen   │ │ Test gen   │ │ Pipeline   │
│ Pattern rec  │ │ Compliance │ │ Pattern    │ │ Contract   │ │ Infra IaC  │
│ Phase advice │ │ validation │ │ scaffold   │ │ coverage   │ │ OTel setup │
│ Board rules  │ │ Hard block │ │ Refactor   │ │ QA gates   │ │ Runbooks   │
└──────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘
```

### 5.2 Agent Profiles

#### Architect Agent
- **Knows:** All ADRs, blueprints, governance policies, phase criteria
- **Can:** Answer "which ADR?", propose new ADRs, evaluate extraction readiness, explain architectural decisions
- **Integrates with:** Claude, GitHub Copilot Chat, Cursor AI panel
- **Human approval required:** Before any new ADR is committed

#### Reviewer Agent
- **Knows:** Engineering Manifesto, anti-pattern blacklist, naming conventions, security rules
- **Can:** Review PRs, flag violations with citations, block merge on hard violations, generate review reports
- **Integrates with:** GitHub Actions (automated PR review), CodeQL, Copilot PR Summaries
- **Human approval required:** Final merge decision always stays with Tech Lead

#### Coder Agent
- **Knows:** Canonical patterns, runtime ADRs, coding standards, Hexagonal rules
- **Can:** Generate scaffolding following canonical patterns, implement use cases, create port+adapter pairs, write boilerplate to standard
- **Integrates with:** Cursor, Cline, Roo, Continue, Codex, Claude Code
- **Human approval required:** Before committing any generated code

#### QA Agent
- **Knows:** Testing pyramid standards, contract testing guide, ADR-0018/0052/0053
- **Can:** Generate unit tests, suggest contract tests, verify coverage, flag missing integration test scenarios
- **Integrates with:** GitHub Actions, Copilot, Cline
- **Human approval required:** Before merging tests that change contract definitions

#### DevOps Agent
- **Knows:** Infrastructure ADR-0028, OTel standards, Gitflow, CI/CD quality gates, runbooks
- **Can:** Generate IaC for OSS-first stack, configure OTel pipelines, validate pipeline quality gates, draft runbook entries
- **Integrates with:** GitHub Actions, Harness Platform, Terraform/Pulumi
- **Human approval required:** Before any infrastructure change reaches production

### 5.3 AI Assistance by Role

| Role | Primary AI interaction | Key knowledge injected | Hard guardrails |
|---|---|---|---|
| **Architect** | ADR queries, pattern guidance, phase evaluation | All ADRs + blueprints | Cannot approve ADR that violates Board-level constraints |
| **Developer** | Code generation, refactoring, pattern scaffold | Runtime ADRs + canonical patterns | Cannot generate domain code with infra imports |
| **QA / SDET** | Test generation, coverage analysis, contract test | Testing pyramid ADRs + contract guide | Cannot reduce test coverage below 70% |
| **DevOps / SRE** | IaC generation, pipeline config, runbook draft | Infra ADRs + OTel standards | Cannot generate proprietary cloud SDK without adapter wrapper |
| **Product Owner** | Story review, scope boundary check | SDLC standard + DoD | Cannot approve stories that bypass architecture review |
| **Provider / Vendor** | Contract validation, integration checklist | Agnostic baseline + contract ADRs | Cannot integrate without completed Vendor Risk Assessment |

---

## 6. Guardrails and Governance

### 6.1 The Three Guardrail Layers

```
LAYER 1 — SYSTEM PROMPT (Always active, injected by harness)
  Content: Evolith identity, core principles, hard blocks, phase context
  Scope: Every AI session touching corporate code
  Override: Impossible without Architecture Board approval

LAYER 2 — RAG GUARDRAILS (Retrieved on demand)
  Content: Specific ADR constraints, pattern rules, standard violations
  Scope: Context-sensitive — activates when relevant domain detected
  Override: Requires documented ADR exception

LAYER 3 — CI/CD GATES (Post-generation validation)
  Content: Linting rules, boundary checks, coverage gates, security scan
  Scope: Every commit and PR — AI output treated same as human output
  Override: Impossible — automated and non-bypassable
```

### 6.2 Human-in-the-Loop Policy

Extends **ADR-AI-005 (Human-in-the-Loop Policy)**:

| Action | AI autonomy | Human required |
|---|---|---|
| Code suggestion in IDE | Full autonomy | Developer reviews before accepting |
| PR automated review | Full autonomy | Tech Lead makes final merge decision |
| New ADR draft | AI drafts, architect reviews | Architecture Board votes |
| Architecture pattern generation | AI generates scaffold | Developer reviews before committing |
| Infra change (staging) | AI generates, DevOps reviews | DevOps approves |
| Infra change (production) | AI generates, DevOps reviews | Engineering Manager approves |
| Hard block override | AI cannot override | Architecture Board only |

### 6.3 AI-Generated Code Compliance Validation

Every piece of AI-generated code passes through this automated validation chain before it can be committed:

```
AI generates code
      │
      ▼
[GATE 1] eslint-plugin-boundaries
  → Block if domain imports infrastructure
  → Block if cross-module dependency violation

[GATE 2] Architecture-aware linter rules
  → Validate naming against ADR-0056 / Ubiquitous Language glossary
  → Validate class responsibilities (no God Classes)

[GATE 3] Security static analysis
  → Scan for hardcoded secrets
  → Scan for SQL injection patterns
  → Scan for missing input validation

[GATE 4] Test coverage check
  → Estimate coverage impact
  → Block if projected coverage < 70%

[GATE 5] ADR citation check (new — AI-specific)
  → Verify that AI-generated architectural decisions cite an ADR
  → Flag undocumented architectural choices for Board review

All gates PASS → Commit allowed
Any gate FAILS → Commit blocked + explanation returned to AI agent
```

### 6.4 Versioned Architectural Memory

The AI knowledge base is **versioned alongside the codebase**:

```
Evolith repo version  →  Knowledge base snapshot
──────────────────────────────────────────────────
main branch           →  Latest approved standards
v1.0 tag              →  Standards as of v1.0 release
feature/new-adr       →  Draft standards (review mode)
```

**Rule:** A product repository on Evolith v1.x ADRs must use the v1.x knowledge snapshot. Upgrading to v2.x ADRs requires explicit migration ADR in the child repository.

---

## 7. Prompt Engineering Strategy

### 7.1 System Prompt Template (Base Layer)

```markdown
# Evolith Principal Architect — System Prompt

You are the Principal Architect of this codebase, operating under the
Evolith corporate architecture standard.

## Your Identity
- You enforce the Evolith architecture standards at all times
- You cite ADRs by ID when making or evaluating decisions
- You never generate code that violates the hard constraints below
- You always indicate which phase (1/2/3) a recommendation belongs to
- You distinguish between mandatory and optional standards

## Current Context
- Product phase: {{PHASE}}
- Runtime: {{RUNTIME}}
- Bounded context: {{CONTEXT}}

## Hard Constraints (Non-negotiable)
1. Domain layer MUST NOT import infrastructure libraries
2. No raw SQL inside domain or application layers
3. No hardcoded secrets anywhere
4. No cross-schema SQL joins (ADR-0031)
5. No microservice extraction without 2-of-4 criteria (ADR-0045)
6. All external integrations MUST go through Port/Adapter boundary

## When You Don't Know
If no ADR governs a situation, say so explicitly and recommend
creating one rather than improvising a solution.
```

### 7.2 Role-Specific Prompt Overlays

**Developer overlay:**
```markdown
Focus on: Code generation following canonical patterns.
Always include: ADR citation, phase label, test scaffold.
Never: Suggest architecture changes without architect review.
```

**Reviewer overlay:**
```markdown
Focus on: Compliance validation against ADR registry.
Format: Violation table (Rule | ADR | Severity | Suggested fix).
Never: Approve code that violates hard constraints.
```

**Architect overlay:**
```markdown
Focus on: Decision reasoning, trade-off analysis, phase planning.
Format: Structured ADR draft when proposing new decisions.
Always: Reference existing ADRs before proposing new ones.
```

### 7.3 Context Injection Template per Tool

| Tool | Injection method | File | Content |
|---|---|---|---|
| Claude Code | `AGENTS.md` + project instructions | `AGENTS.md` | Base system prompt + ADR index |
| GitHub Copilot | `.github/copilot-instructions.md` | repo root | Architecture rules summary |
| Cursor | `.cursorrules` | repo root | Evolith rules + ADR quick reference |
| Continue | `.continue/config.json` | repo root | Context docs list pointing to ADRs |
| Cline / Roo | System prompt in tool config | per workspace | Full harness + architecture context |
| Codex | System prompt via API | programmatic | Layered context per task type |

---

## 8. Incremental Implementation Roadmap

### Phase 0 — Foundation (Weeks 1-4)
**Goal:** AGENTS.md + system prompts per tool. Minimal viable architecture assistant.

```
□ Write base AGENTS.md for Evolith repo (harness foundation)
□ Create .cursorrules with top-20 architecture rules
□ Create .github/copilot-instructions.md with ADR summary
□ Define ADR metadata schema (JSON envelope per chunk)
□ Tag all existing ADRs with metadata (runtime, phase, domain, severity)
□ Export ADR index as machine-readable JSON/YAML
```

### Phase 1 — RAG Knowledge Base (Weeks 5-10)
**Goal:** Vectorized corpus, semantic search, ADR retrieval in context.

```
□ Choose vector store (Chroma / Qdrant / Pinecone / Azure AI Search)
□ Build ingestion pipeline: MD → chunks → embeddings → vector store
□ Implement metadata-filtered retrieval
□ Build MCP server exposing ADR query as tool (extends ADR-AI-002)
□ Test retrieval accuracy: 20 benchmark queries vs. expected ADRs
□ Write ADR-AI-006: Knowledge Base Governance and Versioning
```

### Phase 2 — Specialist Agents (Weeks 11-18)
**Goal:** Architect Agent and Reviewer Agent operational.

```
□ Deploy Architect Agent with ADR lookup + pattern recommendation
□ Deploy Reviewer Agent with compliance validation + hard blocks
□ Integrate Reviewer Agent into GitHub Actions PR pipeline
□ Build ADR citation validator (Gate 5 in compliance chain)
□ Write role-specific prompt overlays for developer / QA / DevOps
□ Pilot with one product team: collect metrics (violations caught, time saved)
```

### Phase 3 — Full Agent Ecosystem (Weeks 19-30)
**Goal:** All 5 specialist agents operational across all tools.

```
□ Deploy Coder Agent with canonical pattern scaffold generation
□ Deploy QA Agent with test generation + coverage validation
□ Deploy DevOps Agent with IaC + OTel pipeline generation
□ Multi-agent orchestration via Harness (see Harness evaluation doc)
□ Versioned knowledge base synced with Evolith release tags
□ Dashboard: AI compliance rate, violations blocked, ADRs cited
```

### Phase 4 — Enterprise Governance (Weeks 31+)
**Goal:** Architecture Board integrated in AI approval workflows.

```
□ AI-drafted ADR proposals routed to Board via GitHub Issues
□ Knowledge base audit: quarterly review of AI suggestions vs. ADRs
□ Provider onboarding: Vendor AI tools receive Evolith knowledge package
□ Cross-product knowledge sharing: ADR discoveries from satellite repos
□ AI maturity assessment using 07-maturity-model framework
```

---

## 9. Risks and Limitations

| Risk | Impact | Probability | Mitigation |
|---|---|---|---|
| **Hallucinated ADR citations** | High — wrong architecture guidance | Medium | Citation validator gate (Phase 1) + retrieval grounding |
| **Stale knowledge base** | Medium — outdated rules enforced | Medium | Versioned snapshots + CI sync pipeline |
| **Over-restriction** | Low — blocks valid solutions | Low | Confidence tiers + Tier 3 uncertainty flag |
| **Context window limits** | Medium — incomplete ADR context | Medium | Chunking strategy + metadata filtering reduces noise |
| **Vendor dependency** | Medium — tool-specific prompt formats | Medium | Abstract harness layer, tool adapters |
| **AI as oracle** | High — teams stop thinking architecturally | Medium | HITL policy + mandatory architect review for ADR changes |
| **Private knowledge leakage** | High — ADRs sent to external AI | Low | Private deployment (Harness self-hosted), data classification |

---

## References

- [Harness Platform Evaluation](./harness-platform-evaluation.md)
- [Knowledge Taxonomy for AI](./knowledge-taxonomy.md)
- [Visual Ecosystem Diagrams](./visuals/README.md)
- [ADR-AI-001: Harness Engineering Strategy](../06-adrs/adr-ai-001-harness-strategy.md)
- [ADR-AI-002: MCP as Integration Standard](../06-adrs/adr-ai-002-mcp-as-integration-standard.md)
- [ADR-AI-005: Human-in-the-Loop Policy](../06-adrs/adr-ai-005-human-in-the-loop-policy.md)
- [Agentic Patterns](../05-agentic-patterns/patterns-overview.md)
- [Engineering Manifesto](../../engineering/engineering-manifesto.md)

---

<div align="center">
  <sub>Evolith — Enterprise Architecture Platform | AI Architecture Assistant Strategy</sub>
</div>
