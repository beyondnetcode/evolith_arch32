# Patterns Overview: Agentic Pattern Catalog

## When do you need an agent?
Not every LLM problem requires an autonomous agentic loop. If the task can be resolved in a single direct model call (One-shot completion), **do not use an agent**. Agents add latency, computational cost, and non-determinism that is only justified if there is dynamic exploration of the problem.

Use agents when the outcome of Step 1 conditions what Step 2 should be, and the decision tree is too large to be programmed with traditional deterministic code.

## Available Patterns Matrix

| Pattern | Canonical Use Case | Complexity | Human-in-Loop |
| :--- | :--- | :--- | :--- |
| **Single Agent** | Bounded task (e.g., generate a readme, fix a specific syntactic bug) with limited tools. | Low | Optional |
| **Plan & Execute** | Tasks requiring guaranteed logical sequentiality (e.g., Refactoring 5 files in strict order). | Medium | Recommended |
| **Multi-Agent** | Systems where multiple domains of expertise converge (e.g., Architect Agent + QA Agent + Cybersecurity Agent). | High | Mandatory |
| **Human-in-the-Loop** | Operational decisions modifying the real world with legal, financial, or physical consequences. | Variable | Mandatory |

## The Boris Tane Principle
We adopt Boris Tane's directive as internal architectural law:

> **"Separating planning from execution is the most important architectural decision you will make in your agent."**

When we allow an agent to plan and execute step by step without intermediate control, the agent "forgets" the original plan halfway through. Separating the Planner from the Executor allows us to validate the route BEFORE the system spends money and time on faulty execution.

---
[Back to Index](./README.md)
