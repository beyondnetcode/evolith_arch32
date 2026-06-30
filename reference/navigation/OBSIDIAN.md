# Obsidian Vault (Internal Authoring & Navigation)

> **Bilingual navigation:** [Versión en Español](./OBSIDIAN.es.md)  
> **Navigation hub:** [README](./README.md)

This repository ships a **minimal Obsidian vault** as an *internal* lens for authoring and navigating the ~1,400 markdown documents under `reference/`, `rulesets/`, and `wiki/`. It is an optional convenience for maintainers — **nothing here is part of a delivered product surface.**

## What this is — and is not

| It **is** | It is **not** |
|---|---|
| A local desktop lens over the existing `.md` files | A new documentation surface to publish |
| Graph view + backlinks over the **8,500+ existing markdown links** (no migration) | A replacement for GitHub rendering, the wiki, or the auto-generated indexes |
| Fast local search / quick-switcher across all docs | Anything that runs in CI or "enforces" governance |
| Versioned config (`app.json`, `core-plugins.json`, `graph.json`) | Obsidian Publish / Sync (both disabled) |

> **It does not touch the products.** The vault config lives in `.obsidian/` at the repo root and is ignored by every build. The **CLI, CORE-API, MCP server, and Agent Runtime** compile from their own scoped folders (`sdk/*`, `apps/*`, `packages/*`) and never read `.obsidian/`. There is zero code change.

## How to open it

1. Install [Obsidian](https://obsidian.md) (free for personal and commercial use).
2. **Open folder as vault** → select the repository root (`evolith/`).
3. Obsidian detects the committed `.obsidian/` config and applies it automatically.

## What the committed config does

- **Excludes noise** (`userIgnoreFilters`): `node_modules`, `.claude` (worktrees), `packages`, `apps`, build/coverage dirs. You see ~730 reference docs, not 20,000 files.
- **Keeps links GitHub-safe**: new links are created as **relative markdown links** (`useMarkdownLinks: true`, `newLinkFormat: relative`), never `[[wikilinks]]`. This preserves GitHub rendering and the existing link style.
- **Hides the Spanish mirror in the graph**: the graph filter `-path:".es.md"` collapses each EN/ES pair into one node, so the graph shows concepts, not duplicates.
- **Color-codes the graph** by domain: ADRs, governance, rulesets, products, navigation hubs.

## Conventions (please keep)

- **Do not introduce `[[wikilinks]]` in committed docs.** They break GitHub rendering. Use relative markdown links — Obsidian is configured to do this for you.
- `alwaysUpdateLinks` is **on**: moving/renaming a file inside Obsidian will rewrite inbound links across the repo. Review the diff before committing.
- Attachments pasted into notes land in `reference/governance/sdlc/assets/`.

## Versioned vs. ignored

| Committed | Ignored (per-user / churn) |
|---|---|
| `.obsidian/app.json` | `.obsidian/workspace.json` |
| `.obsidian/core-plugins.json` | `.obsidian/workspace-mobile.json` |
| `.obsidian/graph.json` | `.obsidian/cache`, `.obsidian/*.json` writes by themes/plugins |

## Roadmap (not yet implemented)

A future, opt-in **Phase 2** would add YAML frontmatter (`status`, `owner`, `created`, `lang`, `topology`) to docs — migrated from the existing `**Status:**` / `**Owner:**` text fields. That frontmatter would let the [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin generate living indexes (replacing hand-maintained ones), and — more importantly — it could be validated in CI and consumed by the inventory generator independently of Obsidian. This phase is **not** part of the current change.

---

[Back to Navigation Hub](./README.md) · [Reference Hub](../README.md)
