# Repository Approved Tools Inventory

This is a baseline of approved generic tools currently usable inside the monorepo ecosystem to empower our internal agents.

## 1. Filesystem Interaction (Provided by Host / Shell)
* **`read_file`**: Read contents of a text file safely.
* **`write_to_file`**: Overwrites or creates text files. Requires verification hooks after run.
* **`ls / list_dir`**: Recursively list structure of a directory.
* **`grep_search`**: Fast substring search across codebase.

## 2. Software Life-Cycle Tools (Executed via Terminal Harness)
* **`run_command`**: Execute arbitrary bash/ps1 commands. **CRITICAL**: Highly restricted. Cannot be run in CI/CD without hard sandbox.
* **`npm_run`**: Specifically scoped to execute standard repository script triggers defined in `package.json`.
* **`git_commit`**: Allows agent to checkpoint progress automatically.

## 3. Corporate MCP Catalog (Under Active Development)
* *Coming Soon*: `confluence_search` - To provide centralized architecture context.
* *Coming Soon*: `jira_update_ticket` - To sync development progress with administrative tickets.
* *Coming Soon*: `sentry_fetch_issue` - To feed real production error logs to debug-agents.

## 4. Evolith MCP Tools (Implemented)

> **No second copy of the tool names lives here.** This page previously enumerated 11 tools, seven of which (`evolith-agent-handoff`, `evolith-architecture-evaluate`, `evolith-gate-status`, `evolith-moscow-analyze`, `evolith-moscow-export`, `evolith-alias`, `evolith-schema`) **never existed or no longer exist in code**. A hand-maintained duplicate of the tool surface drifts the moment a tool is added or renamed, so it has been removed. Do not reintroduce one.

The Evolith MCP server registers **50** governance tools. The authoritative, source-derived list is the **Tool Inventory** table in [Evolith MCP Tools Catalog](./evolith-mcp-tools.md) — reconciled from the tool registrations under `src/packages/mcp-server/src/tools/`. Verify with:

```bash
grep -rhoE "name: '(evolith-[a-z0-9-]+)'" src/packages/mcp-server/src/tools/*.ts \
  --exclude='*.spec.ts' | sort -u | wc -l   # -> 50
```

Illustrative examples only (not a catalog):

- `evolith-validate` - Validate a satellite repository against Evolith rules
- `evolith-sdlc-handoff` - Generate SDLC handoff artifacts
- `evolith-phase-advance` - Propose phase transitions
- `evolith-auto-fix` - **Auto-fix architectural violations** (GT-115)

All tools follow the [Tool Design Principles](./tool-design-principles.md) for deterministic, agent-consumable behavior.

---
[Back to Index](./README.md)
