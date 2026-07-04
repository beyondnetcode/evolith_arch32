# Gap Prioritization Engine

## Purpose

Reads `gap-tracking.md`, calculates priority score by multiplying impact × urgency, detects stagnant gaps (>30 days without status change), and produces a prioritized gap report.

## Contract

| Field | Value |
|-------|-------|
| ID | `gap-prioritization-engine` |
| Owner | `@po` |
| Version | `1.0.0` |
| Inputs | `reference/core/control-center/gaps/gap-tracking.md`, `gap-closure-evidence.json` |
| Outputs | Prioritized gap report (JSON) |

## Algorithm

1. **Parse gap-tracking.md** — Extract all `GT-*` entries with status, criticality, complexity, and last-modified date.
2. **Parse closure evidence** — Read `gap-closure-evidence.json` for DONE gaps to exclude from active list.
3. **Calculate priority** — For each active gap: `priority = impact × urgency` where:
   - Impact: P0=4, P1=3, P2=2, P3=1
   - Urgency: based on days since creation (newer = higher)
4. **Detect stagnation** — Flag gaps with no status change in >30 days as `stagnant`.
5. **Rank and output** — Sort by priority descending, produce JSON report with per-gap scoring.

## Usage

```bash
node .harness/scripts/skills/gap-prioritization-engine.mjs
```

### Flags

| Flag | Description |
|------|-------------|
| `--help`, `-h` | Show help message |
| `--stagnant-threshold <days>` | Override stagnant detection threshold (default: 30) |
| `--include-done` | Include DONE gaps in output |

## Output Format

```json
{
  "generatedAt": "2026-06-23T00:00:00.000Z",
  "totalActive": 8,
  "stagnantCount": 2,
  "gaps": [
    {
      "id": "GT-100",
      "title": "Implement rate limiting",
      "status": "evaluated",
      "criticality": "P0",
      "complexity": "M",
      "impact": 4,
      "urgency": 3.5,
      "priority": 14.0,
      "daysSinceCreation": 45,
      "stagnant": false
    }
  ],
  "stagnantGaps": [
    {
      "id": "GT-095",
      "title": "Old gap",
      "daysSinceStatusChange": 62,
      "currentStatus": "candidate"
    }
  ]
}
```
