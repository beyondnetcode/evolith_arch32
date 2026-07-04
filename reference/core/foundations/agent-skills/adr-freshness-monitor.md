# ADR Freshness Monitor

## Purpose

Scans all ADRs in `reference/core/architecture/adrs/` and reports staleness based on last git modification date. Flags ADRs older than 180 days as `stale` and older than 365 days as `critical`.

## Contract

| Field | Value |
|-------|-------|
| ID | `adr-freshness-monitor` |
| Owner | `@architect` |
| Version | `1.0.0` |
| Inputs | `reference/core/architecture/adrs/` directory |
| Outputs | Freshness report (JSON) |

## Algorithm

1. **Collect ADR files** — Walk `reference/core/architecture/adrs/core/` recursively, collecting `NNNN-*.md` files (excluding ES versions, README, and matrix files).
2. **Get last modified date** — For each ADR, run `git log -1 --format=%ad --date=iso` to get last modification timestamp.
3. **Classify status** — Apply thresholds:
   - `>365 days` → `critical`
   - `>180 days` → `stale`
   - Otherwise → `healthy`
4. **Aggregate counts** — Count ADRs in each category.
5. **Output report** — Produce JSON with per-ADR details and summary counts.

## Usage

```bash
node .harness/scripts/skills/adr-freshness-monitor.mjs
```

### Flags

| Flag | Description |
|------|-------------|
| `--help`, `-h` | Show help message |
| `--stale-threshold <days>` | Override stale threshold (default: 180) |
| `--critical-threshold <days>` | Override critical threshold (default: 365) |

## Output Format

```json
{
  "generatedAt": "2026-06-23T00:00:00.000Z",
  "totalAdrs": 68,
  "summary": {
    "total": 68,
    "staleCount": 12,
    "criticalCount": 3,
    "healthyCount": 53
  },
  "critical": [
    {
      "file": "reference/core/architecture/adrs/core/0010-legacy-auth.md",
      "lastModified": "2025-01-15T10:30:00.000Z",
      "daysSinceModification": 525,
      "status": "critical"
    }
  ],
  "stale": [],
  "healthy": []
}
```

## Integration

This skill wraps the existing `.harness/scripts/adr-freshness-monitor.mjs` and adds the skill contract layer. The underlying implementation is shared.
