# What is this section and how to use it

## Fundamental Difference: AI as a Tool vs AI as a Component

It is crucial to distinguish between two ways of incorporating Artificial Intelligence into our ecosystem:

1. **AI as a Development Tool:** The use of copilots (GitHub Copilot, Claude Code) during the software life cycle to accelerate code writing, refactoring, or debugging. No product architecture changes required.
2. **AI Integrated in the Product:** When the product incorporates agents, model calls, or agentic flows to solve business problems at runtime. This requires strict architectural oversight.

## Why Harness Engineering Matters More Than the Model

It is often assumed that the intelligence of an agentic solution depends 100% on the chosen model. Empirical data shows the opposite:

* **LangChain Case:** Managed to improve agent performance from **52.8% to 66.5%** solely by changing the harness, without modifying the underlying model.
* **Can.ac Case (Hashline Benchmark, 2026):** A researcher achieved a success rate increase from **6.7% to 68.3%** strictly by altering the editing and validation format provided by the harness.

The **harness** is the secure and structured environment we give the model to operate: well-described tools, clear rules, bounded contexts, and automated validation systems.

## The Evolution of Engineering with AI

Industry focus has rapidly matured toward more deterministic environments:

| Phase | Period | Primary Focus | Description |
| :--- | :--- | :--- | :--- |
| **Prompt Engineering** | 20222024 | Optimizing Instructions | "Asking well" to get an acceptable response in text format. |
| **Context Engineering** | 2025 | Building Context Windows | Use of RAG, dynamic memory, and MCP to give the right data at the right time. |
| **Harness Engineering** | 2026 | Designing Runtime Environment | Definition of architectural constraints, verification hooks, permissions, and deterministic control loops. |

## When NOT to Adopt this Section

Not all projects benefit from agentic integration. Adoption of this augmented architecture is discouraged in the following scenarios:

* **Teams without Base Maturity:** If the team has not implemented a robust testing pyramid, CI/CD, or clean architecture, AI will exponentially multiply technical debt.
* **Unvalidated MVP Products:** Costs and latency of agentic flows usually slow down the initial market validation cycle.
* **Ultra-Critical Systems without Supervision:** Strict real-time operations or decisions directly affecting human lives without a deterministic checkpoint or human supervision (Human-in-the-loop).

---
[Back to Index](./README.md)
