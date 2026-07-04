# Model Selection Guide and Complexity Tree

## Cost vs Reasoning Capability Axiom
Not every problem demands the "Smartest Model."
Choosing the latest frontier model (e.g., Opus, GPT-4o, Ultra) for a simple text classification task results in a **10x to 50x increase in financial cost** and unacceptable latency.

We adopt a hierarchical tree to match the problem with the right engine.

---

## The 3 Tiers of Operation

| Tier | Model Category Example | Recommended Use Case | Cost Weight |
| :--- | :--- | :--- | :--- |
| **Tier 1: Flash / Haiku** | Gemini 1.5 Flash / Claude 3.5 Haiku | High-speed summaries, label extraction, fast classification, simple code completions. | $ (Minimal) |
| **Tier 2: Pro / Sonnet** | Gemini 1.5 Pro / Claude 3.5 Sonnet | General programming, refactoring, multi-tool execution, complex reasoning, data modeling. | $$ (Optimized) |
| **Tier 3: Ultra / Opus** | Gemini 1.0 Ultra / GPT-4 Turbo / Claude 3 Opus | Multi-step strategic planning, complex math, deep legal audit, multi-document reconciliation. | $$$$ (Extreme) |

---

## Selection Decision Tree

Ask the following sequential questions to determine the minimum viable model:

1. **Is this a 1-to-1 transformation?** (e.g., Input A yields Output B with simple rules)
 * -> Use **Tier 1 (Flash)**.
2. **Does it require using External Tools (MCP)?**
 * -> **If Yes (1-2 tools):** Try Tier 1 first.
 * -> **If Yes (> 3 complex tools):** Advance to **Tier 2 (Pro/Sonnet)** to prevent hallucinations in JSON arguments.
3. **Does the context exceed 100k tokens?** (e.g., reading an entire code repository or 5 long PDFs)
 * -> Mandate high-window models like **Gemini 1.5 Pro** (up to 2M tokens).
4. **Is this a critical production system generating legal/financial outputs?**
 * -> Mandate **Tier 2 or Tier 3** backed by a deterministic Human-in-the-Loop pipeline.

## Benchmarking Metric
We define **RPT (Reasoning Per Token)** as our internal performance metric. When a new model is released, our AI Committee executes an automated suite of 5 standard domain tasks. Only models passing these tests are officially authorized for production catalog addition.

---
[Back to Index](./README.md)
