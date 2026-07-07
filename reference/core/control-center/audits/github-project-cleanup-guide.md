# GitHub Project Cleanup Guide

**Date:** 2026-06-16  
**Purpose:** Remove orphan items and synchronize GitHub Project with canonical backlog

---

## Canonical Backlog (Source of Truth)

**Location:** `reference/core/control-center/backlog-post-gt93.md`

### Items That SHOULD Exist (24 total)

#### GAPs (11 items) - All DONE
| ID | Title | Status |
|----|-------|--------|
| GAP-001 | Fix 21 failing tests | DONE |
| GAP-002 | Fix ConfirmationService TTY tests | DONE |
| GAP-003 | Raise statement coverage to 80% | DONE |
| GAP-004 | Raise branch coverage to 67% | DONE |
| GAP-005 | Add tests for zero-coverage files | DONE |
| GAP-006 | Document auto-fix in architecture | DONE |
| GAP-007 | Remove emoji from documentation | DONE |
| GAP-008 | Complete tool design principles | DONE |
| GAP-009 | Complete MCP security guidelines | DONE |
| GAP-010 | Audit BFF documentation coherence | DONE |
| GAP-011 | Fix WizardService implementation drift | DONE |

#### Opportunities (10 items) - All DONE
| ID | Title | Status |
|----|-------|--------|
| OPP-001 | Implement auto-fix domain strategies | DONE |
| OPP-002 | Add MCP distributed tracing | DONE |
| OPP-003 | Eliminate test console noise | DONE |
| OPP-004 | Optimize pre-commit validation | DONE |
| OPP-005 | Add MCP metrics dashboard | DONE |
| OPP-006 | Expand auto-fix strategies (8+) | DONE |
| OPP-007 | Add wizard validation steps | DONE |
| OPP-008 | Parallelize test execution | DONE |
| OPP-009 | Generate HTML coverage reports | DONE |
| OPP-010 | Add confirmation timeout config | DONE |

#### Archive (3 items) - Excluded from Project
| ID | Title | Reason |
|----|-------|--------|
| OPP-011 | Complete senior architectural assessment | Template not used |
| OPP-012 | Archive stale planning documents | Low value |
| OPP-013 | Complete harness platform evaluation | Not applicable |

---

## Items to DELETE from GitHub Project

### Orphan Items (Release Pipeline Noise)

These were auto-created by release-please during the sprint. They are NOT part of the backlog:

- DELETE Release Pipeline Failed (multiple instances, issues #21-#30)
  - **Action:** Already closed (9 issues)
  - **Status:** DONE Cleaned up

### Any Item Without GAP- or OPP- Prefix

**Criteria for deletion:**
1. Title does NOT start with `GAP-` or `OPP-`
2. No description field
3. No associated GitHub issue/PR
4. Created during release pipeline failures

**Common patterns to delete:**
- "Release 1.1.0" (release-please artifacts)
- "DELETE Release Pipeline Failed" (CI noise)
- Any item without clear GAP/OPP ID

---

## Manual Cleanup Steps

### Step 1: Open GitHub Project
URL: https://github.com/users/beyondnetcode/projects/1/views/1

### Step 2: Filter by Status
- View all items (not just "Backlog" or "DONE")

### Step 3: Identify Orphans
Look for items that:
- DELETE Don't have GAP-XXX or OPP-XXX in title
- DELETE Have empty description field
- DELETE Were created on 2026-06-15/16 during release failures

### Step 4: Delete Orphans
For each orphan item:
1. Click on the item to open details
2. Click "..." menu
3. Select "Delete item"
4. Confirm deletion

### Step 5: Verify Final Count
After cleanup, you should have exactly:
- **21 items** (11 GAPs + 10 OPPs) - all in DONE status
- **0 items** in Backlog status (all completed!)

---

## Synchronization Check

After cleanup, run:

```bash
node .harness/scripts/sync-project-board.mjs
```

Expected output:
```
DONE Todo está sincronizado.
```

---

## Validation Checklist

- [ ] All GAP-001 through GAP-011 exist and are DONE
- [ ] All OPP-001 through OPP-010 exist and are DONE
- [ ] No items with "Release Pipeline" in title
- [ ] No items without GAP-/OPP- prefix
- [ ] Total item count: 21 (not 25+)
- [ ] Sync script reports "Todo está sincronizado"

---

## Notes

- **OPP-011, OPP-012, OPP-013** are intentionally excluded (Archive status)
- Release-please PR #23 was merged (release 1.1.0)
- All 9 release pipeline issues (#21-#30) have been closed
- Stale PR #20 has been closed

---

[Volver al índice](../README.md)
