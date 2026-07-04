# Authorized Model Catalog (May 2026 Horizon)

Below are the only LLM families authorized by the Architecture Committee for integration into corporate products. Any non-listed model requires a temporary authorization ticket for testing.

## Authorized Commercial Families (Via Enterprise Gateway)

### Google Gemini Family
* **Gemini 1.5 Pro**: Recommended for massive code reading due to its 2M token window. Top capability for cross-repository structural reasoning.
* **Gemini 1.5 Flash**: Recommended for cheap and fast extraction of structured metadata from images or large volumes of text.

### Anthropic Claude Family
* **Claude 3.5 Sonnet**: Current global benchmark for native software coding and deterministic tool calling. Designated primary model for IDEs and local agents.
* **Claude 3.5 Haiku**: Fastest performance for sub-second latency classification.

### OpenAI GPT Family
* **GPT-4o**: Highly robust for legacy workflow logic and complex function calling where native compatibility requires OpenAI's historical standard.
* **o1 (Reasoning Series)**: Authorized only for scientific calculation or intense algorithmic optimization tasks. Blocked for conversational chatbots due to high cost per reasoning token.

## Authorized Open Source / Local Families (Self-Hosted)

### Meta Llama 3.x Series
* **Llama 3.1 70B / 405B**: Primary alternative for absolute data sovereignty. Must run on internal Kubernetes/GPU clusters (vLLM).
* **Llama 3.1 8B**: For edge runtimes or fast embedded micro-agents.

---
*Notice: Models listed here are derived from standard industry leaderboards and pass our internal RPT (Reasoning Per Token) benchmarks.*

---
[Back to Index](./README.md)
