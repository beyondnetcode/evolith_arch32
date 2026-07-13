# Edit-time enforcement — the cross-agent hook (GT-526)

Evolith enforces architecture at three READ→CONTROL surfaces:

1. **Pre-generation** — the MCP server exposes the contract to the agent before it writes (GT-520).
2. **Edit-time** — **this surface**: block the offending change *in-flight*, as the agent writes,
   before the PR.
3. **PR/CI** — the authoritative enforcer run on the diff (GT-518).

The edit-time gate is a **fast, single-file static check**: it scans the imports of the file the
agent is about to write and rejects the write if it crosses a layer boundary (the classic AI drift:
a `domain` file reaching into `infrastructure`). It never restores a toolchain — the full enforcer
run (PR/CI) stays the source of truth.

The decision is a pure, vendor-agnostic core function (`evaluateEdit` / `EditBoundaryRule` in
`@beyondnet/evolith-core-domain`). This CLI ships the **adapter** that feeds it from any agent.

## Command

```
evolith enforce edit --rules <boundary-rules.json> [--payload <json>] [--vendor <name>] [--format json]
```

- `--rules` — the **compiled boundary contract**: a JSON `EditBoundaryRule[]` (or
  `{ "boundaryRules": [...] }`). Produce it with the C4/Structurizr compiler (GT-528) or author it
  by hand — see [`examples/edit-hook-boundary-rules.json`](../examples/edit-hook-boundary-rules.json).
- The **hook payload** is read from **stdin** (the agent pipes it), or inline via `--payload`.
- `--vendor` forces a specific payload adapter (`claude-code` | `generic`); default is auto-detect.
- Exit codes: **`0` = allow**, **`2` = block** (a non-writing tool call or an unrecognized payload
  is allowed — the gate never blocks what it cannot evaluate).

Each `EditBoundaryRule`:

```jsonc
{
  "ruleId": "HXA-01",
  "adrRef": "ADR-0002",
  "appliesTo": "src/domain/",                 // path prefix the edited file must match
  "forbiddenImports": ["../infrastructure"],  // import specifiers rejected in matching files
  "severity": "error",                         // "error" blocks; "warning" reports but allows
  "message": "Domain must not depend on Infrastructure (ADR-0002)."
}
```

## Cross-agent neutrality

The payload adapter is a registry, not a vendor `switch`. Two adapters ship today:

- **`claude-code`** — parses the Claude Code `PreToolUse` payload
  (`{ tool_name, tool_input, cwd }`) for `Write` (full `content`), `Edit` (the replacement
  `new_string`) and `MultiEdit` (every `new_string`). Absolute paths are made repo-relative
  against `cwd` so rules stay author-friendly.
- **`generic`** — any other agent (Cursor, Copilot, a CI bot) can emit the canonical shape
  directly: `{ "filePath": "...", "content": "..." }` (aliases: `file_path`/`path`,
  `text`/`new_string`). A new vendor needs **zero code** here — only that its wrapper emit this JSON.

## Wire it into Claude Code (PreToolUse)

Add to `.claude/settings.json` (project) or `~/.claude/settings.json` (user):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "evolith-cli enforce edit --rules .evolith/boundary-rules.json"
          }
        ]
      }
    ]
  }
}
```

Claude Code pipes the `PreToolUse` JSON to the command on stdin. On exit `2` it blocks the pending
tool call and shows the printed Violations to the model, which then self-corrects in the same loop.
A ready-made wrapper (honoring `EVOLITH_BOUNDARY_RULES`) is in
[`examples/claude-code-pretooluse-hook.sh`](../examples/claude-code-pretooluse-hook.sh).

## Wire it into another agent (Cursor / Copilot / custom)

Have the agent's pre-write hook POST the canonical shape and honor the exit code:

```bash
echo '{"filePath":"src/domain/order.ts","content":"import \"../infrastructure/db\";"}' \
  | evolith-cli enforce edit --rules .evolith/boundary-rules.json --vendor generic
# exits 2 → block the write
```
