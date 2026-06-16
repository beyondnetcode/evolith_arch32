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

See [Evolith MCP Tools Catalog](./evolith-mcp-tools.md) for the complete list of 11 tools:

- `evolith-agent-handoff` - Create agent configuration files
- `evolith-architecture-evaluate` - Evaluate architecture patterns
- `evolith-gate-status` - Get phase gate validation status
- `evolith-moscow-analyze` - Run MoSCoW prioritization
- `evolith-moscow-export` - Export MoSCoW results
- `evolith-sdlc-handoff` - Generate SDLC handoff artifacts
- `evolith-validate` - Validate project artifacts
- `evolith-phase-advance` - Propose phase transitions
- `evolith-auto-fix` - **Auto-fix architectural violations** (GT-115)
- `evolith-alias` - Manage CLI command aliases
- `evolith-schema` - Generate phase-gate schemas

All tools follow the [Tool Design Principles](./tool-design-principles.md) for deterministic, agent-consumable behavior.

---
[Back to Index](./README.md)
