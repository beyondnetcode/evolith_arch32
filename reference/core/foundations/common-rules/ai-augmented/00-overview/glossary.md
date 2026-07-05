# Agentic Terms Glossary

* **Harness:** The ecosystem wrapping a language model, providing tools, context, permissions, and verifications to interact controlledly with the real world.
* **Tool Call:** Mechanism in which the LLM pauses generation to formally request the execution of an external function or service provided by the harness.
* **MCP (Model Context Protocol):** Open, standardized protocol (Anthropic, 2024) unifying language model connections with tools, external data sources, and predefined prompts.
* **MCP Server:** The service exposing "Resources" (read) and "Tools" (write/action) via the MCP protocol to be consumed by one or several agents.
* **MCP Client:** The software component (IDE, Agentic SDK, etc.) connecting to an MCP server to retrieve available capabilities and transmit them to the LLM.
* **Agent:** A software instance wrapping an LLM, equipped with memory and tools, capable of recursively deciding which actions to take to meet a complex goal.
* **Multi-Agent:** Architecture pattern splitting responsibilities across multiple specialized agents collaborating, often supervised by a central orchestrator.
* **Orchestrator:** Logical component managing the workflow among multiple agents, determining task sequencing and results aggregation.
* **AGENTS.md:** Mandatory documentation-as-code file read by the agent upon starting the session, containing repository rules and essential commands.
* **CLAUDE.md:** Specific harness file implementation dedicated to Claude Code (Anthropic) interactions. Similar to AGENTS.md but with optimized scopes.
* **Context Window:** Maximum information (tokens) a model can "remember" and process simultaneously in a single inference call.
* **RAG (Retrieval-Augmented Generation):** Technique injecting relevant external data into the model's context window dynamically before final response generation.
* **Human-in-the-Loop (HITL):** Design pattern inserting a pause into the agentic cycle to require explicit human validation/approval for critical actions.
* **PostToolUse Hook:** Code snippet automatically executing immediately after an agent utilizes a tool, usually to validate the result deterministically.
* **Pre-commit Hook:** Git checkpoint before committing, used to ensure AI-generated changes meet syntax and style standards.
* **System Prompt:** High-level primary instruction defining the model's identity, tone, unbreakable rules, and global operational limits at the start of the thread.
* **Harness Engineering:** Discipline focused on optimizing the model's surrounding environment (validations, API surface, permissions) to maximize agent success rates.
* **Context Engineering:** Discipline oriented toward filtering and refining which exact information is handed to the model every turn to prevent overflowing its reasoning window.
* **Prompt Engineering:** Iterative refinement technique for textual instructions sent to the LLM to condition output format and accuracy.
* **LLM (Large Language Model):** Pre-trained base model responsible for natural language inference and reasoning, the computational core of modern agents.
* **Tool:** Basic unit of external functionality exposed by the harness to the model, described in detail with JSON schemas so the model knows how to invoke it.
* **Skill (Agent Skill):** Composed capability or pre-designed flow grouping multiple tools to resolve a repeatable functional need (e.g., Refactoring Skill).
* **Plan-and-Execute:** Architectural pattern forcing the system to generate an explicit task list (planning) before initiating recursive tool invocation (execution).
* **Verification Layer:** Sequential suite of controls (Linters, Unit Tests, E2E, Contract) validating agent-generated artifacts to avoid silent regressions.

---
[Back to Index](./README.md)
