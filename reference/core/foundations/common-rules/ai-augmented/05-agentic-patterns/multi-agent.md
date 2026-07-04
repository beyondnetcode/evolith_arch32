# Pattern: Multi-Agent Orchestration

Divide and conquer. This pattern utilizes a network of specialized agents, where each possesses its own System Prompt, its own tools, and context limited to its specific role, coordinated by a central Supervisor.

## Benefits
- Drastically reduces hallucinations by limiting the number of tools per agent.
- Enables using different models for different tasks (e.g., Gemini to read code, GPT-4o mini to summarize errors).
- Facilitates granular testing of each specialist in isolation.

---
[Back to Index](./README.md)
