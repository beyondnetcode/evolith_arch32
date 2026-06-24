# BMAD Agent Orchestration Engine

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

**Purpose:** Executes BMAD workflows end-to-end, coordinating agents through dependency-aware step sequencing with state tracking and handoff validation.

## Overview

The orchestration engine automates the execution of multi-agent BMAD workflows. It parses workflow definitions, manages step state transitions, dispatches work to agents, and enforces handoff contracts between steps.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    orchestrate.mjs                          │
│                      (Entry Point)                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
       ┌──────────────┼──────────────┬──────────────┐
       ▼              ▼              ▼              ▼
┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────┐
│ Workflow │  │    State     │  │   Step   │  │  Artifact    │
│  Parser  │  │   Machine    │  │ Executor │  │  Registry    │
└──────────┘  └──────────────┘  └──────────┘  └──────────────┘
       │              │              │              │
       └──────────────┴──────────────┴──────────────┘
                      │
                      ▼
              ┌──────────────┐
              │   Handoff    │
              │   Enforcer   │
              └──────────────┘
```

## Components

| Component | File | Purpose |
|-----------|------|---------|
| **Workflow Parser** | `workflow-parser.mjs` | Reads YAML workflows, validates dependency graph (no cycles) |
| **State Machine** | `state-machine.mjs` | Manages step states with atomic persistence |
| **Step Executor** | `step-executor.mjs` | Dispatches to agents or CI scripts |
| **Artifact Registry** | `artifact-registry.mjs` | Tracks deliverables with file hashing |
| **Handoff Enforcer** | `handoff-enforcer.mjs` | Validates step outputs before next step |

## State Machine

Steps progress through states:

```
pending → ready → running → completed
                   ↓         ↓
                 failed    blocked
                   ↓
                 ready (retry)
```

| State | Description |
|-------|-------------|
| `pending` | Initial state, dependencies not yet met |
| `ready` | All dependencies completed, ready to execute |
| `running` | Currently executing |
| `completed` | Finished successfully |
| `failed` | Execution failed (can be retried) |
| `blocked` | Cannot proceed (can be retried) |

## Usage

### Dry Run (parse and show plan)

```bash
node .bmad-core/engine/orchestrate.mjs governance-gap --dry-run
```

### Execute Workflow

```bash
node .bmad-core/engine/orchestrate.mjs governance-gap
```

### Check Instance Status

```bash
node .bmad-core/engine/orchestrate.mjs --status <instance-id>
```

### List All Instances

```bash
node .bmad-core/engine/orchestrate.mjs --list
```

### Generate Handoff Report

```bash
node .bmad-core/engine/orchestrate.mjs --report <instance-id>
```

## Workflow YAML Format

```yaml
name: Workflow Name
description: What this workflow does
version: 1.0.0

steps:
  - id: step-id
    agent: analyst|pm|architect|sm|dev|qa|devops|docs
    action: >
      Description of what the agent should do.
    deliverable: "path/to/output.md"
    dependsOn: [previous-step-id]
    validationScripts:
      - ci/01-validate-docs.mjs
    schemaRef: path/to/schema.json
```

## Agent Types

| Agent | Role |
|-------|------|
| `analyst` | Requirements analysis and functional specification |
| `pm` | Product requirements and UX definition |
| `architect` | Technical architecture and design patterns |
| `sm` | Task breakdown and sprint planning |
| `dev` | Implementation and code development |
| `qa` | Quality assurance and validation |
| `devops` | Operations, CI/CD, and evidence recording |
| `docs` | Documentation and bilingual parity |

## State Persistence

All state is persisted atomically to `.bmad-core/state/`:

- `workflow-instances.json` — Active workflow instances with step states
- `artifact-manifest.json` — Registry of all artifacts with file hashes

## Idempotency

The engine is idempotent:
- Re-running a completed step is a no-op
- State transitions are validated (invalid transitions throw errors)
- Artifact registration is deduplicated by path

## Error Handling

- Workflow parsing validates structure and dependency graph (no cycles)
- State transitions are validated against allowed transitions
- Handoff enforcement checks dependencies and deliverables before execution
- Failed steps can be retried by transitioning back to `ready`
