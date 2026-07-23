# ADR-0122: Shell Execution Safety Standard

> **Bilingual Navigation:** [Versión en Español](./0122-shell-execution-safety-standard.es.md)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-23 |
| **Deciders** | Architecture Board |
| **Technical Story** | OWASP A03 — Injection (CWE-78, CWE-88) |

## Context

Multiple components executed shell commands: the MCP scaffold tool used `exec()`, the Core API OPA evaluator used `exec()`, and the agent-runtime harness process adapter used `sh -c` with string interpolation. The CLI had `execute()` (shell) and `executeFile()` (shell-free) methods.

## Decision

### 1. Default to Shell-Free Execution
- All new command execution MUST use `execFile()` or `spawn()` with argument arrays.
- `exec()` (shell) is PROHIBITED for new code.
- Existing `exec()` usage MUST be migrated to `execFile()` with a tracked GT-xx item.

### 2. User Input Never Reaches the Shell
- Parameters derived from user input MUST NOT be interpolated into shell command strings.
- Pass user-controlled values via environment variables or `spawn()` argument arrays.

### 3. Allowlist Validation
- Parameters that determine which binary or script to execute MUST be validated against an allowlist.
- Example: `frontend` → `['react', 'angular', 'vue']` before passing to NxWorkspaceStrategy.

### 4. Shell Runner in Harness
- The `shell` runner in `HarnessProcessAdapter` MUST pass arguments via stdin or environment variables, NOT via command-line string interpolation.
- Shell scripts MUST read from `$AGENT_RUNTIME_ARGS` or stdin.

### 5. Deprecation Policy
- `execute()` (shell) and `NpmProvider.exec()` are deprecated.
- All callers MUST migrate to `executeFile()` within 90 days.

## Consequences

- The `GT-346` (shell injection surface closed) pattern is now a corporate standard.
- All new CI scripts and harness capabilities must use shell-free execution.
- The `CommandExecutor.executeFile()` is the canonical safe execution method.

## Related ADRs

- ADR-0073 (Unified CLI Output Contract)
- GT-346 (Shell injection surface closed)
- GT-251 (Command injection in update command fixed)
