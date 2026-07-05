# AGENTS.md Corporate Standard

## What is AGENTS.md?

The `AGENTS.md` file is the **lowest effort, highest impact** harness artifact in a repository. It serves as the "induction session" (onboarding) for any artificial intelligence agent (Claude Code, Cursor, Copilot, custom agents) accessing the workspace.

An agent without an `AGENTS.md` must rediscover the stack, guess test commands, and stumble upon known antipatterns. With `AGENTS.md`, the agent instantly inherits the expert context accumulated by the human team.

## Mandatory Standard Structure

Every repository implementing Level 1 or higher AI-Augmentation must possess an `AGENTS.md` file in its root directory with the following strict anatomy:

```markdown
<!-- ## Project -->
[Concise 2-line description explaining the business purpose of this project]

<!-- ## Build & Run -->
- Build: `[Exact command, e.g., npm run build]`
- Test: `[Command for unit tests, e.g., npx nx run test my-app]`
- Lint: `[Lint and fix command, e.g., npm run lint -- --fix]`

<!-- ## Architecture -->
- Runtime: [Node.js vXX / .NET X.X / Android SDK XX]
- DB: [Engine, e.g., PostgreSQL 16 + Drizzle ORM]
- Key modules: [Short list of critical modules or layers in this repo]

<!-- ## Conventions -->
- [Critical convention 1, e.g., Use Result Monad for service returns]
- [Critical convention 2, e.g., UI components must be Server Components by default]

<!-- ## Agent Rules -->
- [Rule preventing known error 1, e.g., NEVER delete existing tests to make a fix pass]
- [Rule preventing known error 2, e.g., If editing a Drizzle entity, run 'npm run db:generate' immediately]

<!-- ## Out of Bounds -->
- [Which parts of the repo MUST NOT BE TOUCHED, e.g., Do not modify files in /legacy folder or CI/CD workflows]
```

## Hashimoto Principle for Harness
We adopt the evolutionary rule proposed by the agentic engineering ecosystem:

> **"For every repetitive error the agent commits, an explicit new rule must be added to the Agent Rules section of AGENTS.md to prevent its perpetual recurrence."**

## Recommended Evolution Additions

The minimum structure above is mandatory. Mature repositories SHOULD also add:

- explicit references to local harness playbooks or recurring runbooks,
- runtime authority notes clarifying where official stack rules live,
- product-specific multi-tenancy, API, or compliance rules when those mistakes recur,
- synchronization notes reminding contributors to update `AGENTS.md` whenever the architecture or stack changes materially.

## AGENTS.md vs CLAUDE.md
- **`AGENTS.md`**: Tool-agnostic. Works for any agent consuming the workspace (e.g., GPT-4o with terminal access, Devin, etc.).
- **`CLAUDE.md`**: Specific standard natively recognized by `claude-code`. It is recommended that if you use Claude Code, you have a `CLAUDE.md` which can be a symbolic link or a simplified copy strictly focused on the commands Claude consumes best.

---
[Back to Index](./README.md)
