# Requirements Traceability Mapper

## Purpose

Maps epics, stories, and requirements to ADRs, governance rulesets, and test artifacts. Detects orphan requirements — items with no linked ADR, no governance rule, or no test coverage.

## Contract

| Field | Value |
|-------|-------|
| ID | `requirements-traceability-mapper` |
| Owner | `@analyst` |
| Version | `1.0.0` |
| Inputs | Epic/story files, ADR index (`reference/core/architecture/adrs/`), governance rulesets (`reference/core/sdlc/standards/`) |
| Outputs | Traceability matrix (JSON) |

## Algorithm

1. **Scan epics/stories** — Parse markdown files in `docs/planning-artifacts/` for story IDs, acceptance criteria, and linked references.
2. **Scan ADRs** — Parse `reference/core/architecture/adrs/core/` for ADR numbers, titles, and status.
3. **Scan rulesets** — Parse governance standards for rule IDs and their scope.
4. **Build mappings** — For each story, detect explicit links to ADRs (`ADR-NNNN`) and rules (`R-NN`).
5. **Detect orphans** — Flag stories with no ADR link, no rule link, or no test reference.
6. **Output matrix** — Produce JSON with per-story linkage status and orphan list.

## Usage

```bash
node .harness/scripts/skills/requirements-traceability-mapper.mjs
```

### Flags

| Flag | Description |
|------|-------------|
| `--help`, `-h` | Show help message |
| `--format json\|md` | Output format (default: `json`) |
| `--story-dir <path>` | Override story directory (default: `docs/planning-artifacts/`) |

## Output Format

```json
{
  "generatedAt": "2026-06-23T00:00:00.000Z",
  "totalStories": 12,
  "linked": 9,
  "orphans": 3,
  "matrix": [
    {
      "storyId": "STORY-001",
      "title": "Implement auth flow",
      "linkedAdrs": ["ADR-0012"],
      "linkedRules": ["R-25"],
      "hasTestRef": true,
      "status": "complete"
    }
  ],
  "orphanReport": [
    {
      "storyId": "STORY-005",
      "title": "Add logging",
      "missingLinks": ["adr", "rule"],
      "severity": "warning"
    }
  ]
}
```
