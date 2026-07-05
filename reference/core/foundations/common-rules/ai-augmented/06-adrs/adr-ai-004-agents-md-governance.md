# ADR-AI-004: AGENTS.md as mandatory artifact in projects adopting level 1+

* **Status:** Proposed
* **Date:** 2026-05-11

## Context
Artificial intelligence agents entering a repository lack historical memory from session to session. Without explicit context, they rediscover the environment every session, guessing test/lint commands and often violating team stylistic conventions, which causes frustration among developers who must fix their code ("cleaning up the AI mess").

## Decision
Any project adopting AI-Augmentation Level 1 (AI-Assisted) or higher is REQUIRED to create and maintain an `AGENTS.md` file in the project/workspace root directory, strictly following the corporate structure defined in `01-harness-engineering/agents-md-standard.md`.

## Consequences
* **Dramatic reduction in initial hallucinations:** The agent knows exactly how to compile and which conventions to follow from the very first chat turn.
* **AI Auto-Onboarding:** Facilitates seamless use of multiple agent CLI tools (Claude, Aider, Mentat).
* **Maintenance:** Humans must remember to update `AGENTS.md` if changing a critical test command, or risk disorienting the agent. It is recommended to add a rule within the file itself reminding the Agent to update it upon architectural changes.

---
[Back to Index](./README.md)
