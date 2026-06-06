# Evolith SDLC Handoff Protocol

## Overview

The Handoff Protocol defines how knowledge, context, and artifacts are transferred between SDLC phases and between AI agents operating in different phases.

## Phase Transition Flow

```
Phase 0          Phase 1          Phase 2          Phase 3          Phase 4
(Discovery)  --> (Analysis)  --> (Design)   --> (Build)   --> (Deploy)
     |               |               |               |               |
     v               v               v               v               v
Generate         Generate         Generate         Generate         Generate
Handoff          Handoff          Handoff          Handoff          Handoff
Manifest         Manifest         Manifest         Manifest         Manifest
```

## Handoff Manifest Structure

Each phase produces a `handoff-manifest.json` that captures:

```json
{
  "version": "1.0",
  "metadata": {
    "repository": "my-satellite",
    "fromPhase": "phase-1",
    "toPhase": "phase-2",
    "createdAt": "2024-01-15T10:00:00Z",
    "duration": "3d 4h 12m"
  },
  "artifacts": {
    "produced": [
      { "name": "requirements.md", "type": "document", "size": 15420 },
      { "name": "architecture-draft.md", "type": "document", "size": 8320 },
      { "name": "sdlc-manifest.json", "type": "json", "size": 2100 }
    ],
    "validated": [
      { "name": "adr-0002.md", "status": "accepted" },
      { "name": "adr-0018.md", "status": "accepted" }
    ]
  },
  "context": {
    "decisions": [
      {
        "adrId": "ADR-0002",
        "decision": "Use Hexagonal Architecture",
        "rationale": "Separation of concerns for long-term maintainability"
      }
    ],
    "constraints": [
      "Must support Node.js 20+ runtime",
      "PostgreSQL required for persistence",
      "REST API for external communication"
    ],
    "risks": [
      { "id": "R-001", "description": "Migration complexity", "mitigation": "Phased approach" }
    ]
  },
  "agents": {
    "handoffFrom": {
      "name": "evolith-analysis-agent",
      "version": "1.0.0",
      "sessionId": "sess-abc123"
    },
    "handoffTo": {
      "name": "evolith-design-agent",
      "version": "1.0.0"
    }
  },
  "quality": {
    "gateStatus": "passed",
    "checksPerformed": ["architecture-review", "adr-compliance", "constraint-validation"],
    "metrics": {
      "coverage": "85%",
      "techDebtIndex": "2.3"
    }
  },
  "recommendations": [
    "Prioritize ADR-0002 implementation in Phase 2",
    "Consider PostgreSQL connection pooling for scale"
  ]
}
```

## Tool Handoff

When one AI agent completes its work and another begins, the following tools facilitate the transfer:

### evolith-sdlc-handoff

Generate a handoff manifest for a phase transition:

```javascript
await mcp.callTool('evolith-sdlc-handoff', {
  path: '/repo',
  fromPhase: 'phase-1',
  toPhase: 'phase-2'
});
```

### evolith-sdlc-status

Check current phase and pending handoffs:

```javascript
await mcp.callTool('evolith-sdlc-status', {
  path: '/repo'
});
```

## Agent-to-Agent Protocol

When two AI agents need to share context:

1. **Source agent** generates the manifest before completing
2. **Target agent** reads the manifest at start of session
3. **Validation** ensures all required artifacts exist
4. **Checkpoint** records successful handoff in evolith.yaml

### Example: Cursor AI to Claude AI Handoff

**Cursor AI (completing Phase 1):**
```
> smart-cli sdlc handoff --from phase-1 --to phase-2
✓ Handoff manifest created: .evolith/phase-1/handoff.json
✓ Context artifacts: 3 files
✓ ADRs validated: 2
✓ Ready for Phase 2
```

**Claude Desktop (starting Phase 2):**
```
> smart-cli sdlc receive --from phase-1
✓ Received context from phase-1
✓ Loaded 3 artifacts
✓ 2 ADRs applied to design decisions
✓ Ready to proceed with architecture design
```

## Artifact Categories

| Category | Description | Examples |
|----------|-------------|----------|
| `requirements` | User needs and constraints | `user-stories.md`, `constraints.json` |
| `architecture` | Design decisions and structure | `adr-*.md`, `architecture.md` |
| `technical` | Implementation specifications | `api-spec.yaml`, `schema.sql` |
| `quality` | Testing and validation results | `test-plan.md`, `coverage-report.json` |
| `deployment` | Release and deployment configs | `docker-compose.yml`, `deploy-checklist.md` |

## Quality Gates

Each phase transition requires:

1. **Artifacts Complete** - All required artifacts produced
2. **ADR Compliance** - All relevant ADRs accepted
3. **Constraint Validation** - No unmet constraints
4. **Agent Signature** - Both handoff-from and handoff-to agents recorded

## Integration with MCP

AI agents using the Evolith MCP server automatically get:

- Access to handoff manifests via `resources/list`
- Handoff generation via `evolith-sdlc-handoff`
- Phase status via `evolith-sdlc-status`
- Context injection via `prompts/get` (handoff template)

## Example: Complete Phase Transition

```javascript
// In your AI agent (e.g., Claude Desktop with Evolith MCP)

const manifest = await callTool('evolith-sdlc-handoff', {
  path: '/my-project',
  fromPhase: 'phase-1',
  toPhase: 'phase-2'
});

// Review the manifest
console.log('Handoff includes:', manifest.artifacts.produced.length, 'artifacts');
console.log('Decisions made:', manifest.context.decisions.length);

// Proceed with Phase 2 work
await callTool('evolith-architecture-validate', {
  path: '/my-project',
  level: 'F2'
});
```