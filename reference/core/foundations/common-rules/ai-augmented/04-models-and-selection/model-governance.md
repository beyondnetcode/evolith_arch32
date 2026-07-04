# Model Governance: DPA, Privacy and Cost Control

Operating with LLMs requires legally shielding company data assets and economically bounding operational spend.

## 1. Data Privacy & DPA (Mandatory)
NEVER input source code, confidential PII, or private financial data into "free" or "consumer" web tiers (e.g., standard free ChatGPT / Claude Web without Enterprise login).

* **Policy:** We ONLY consume APIs that officially declare zero retention for training purposes under an executed Enterprise DPA (Data Processing Agreement).
* **Approved Routing:** All model calls MUST traverse corporate gateways (e.g., Azure OpenAI, AWS Bedrock, Vertex AI) that mathematically guarantee data stays within VPC jurisdiction and is not used to globally retrain base models.

## 2. Token Quotas & Budget Management
An unmonitored agentic loop can consume hundreds of dollars in minutes if it enters an infinite recursive loop.

* **Max Steps:** All agent loops must possess an unbreakable limit (hard cap) of recursive iterations (Recommended: `max_iterations = 10`).
* **Budget Circuit Breaker:** Implement a sliding consumption window at the HTTP wrapper level. If the aggregated cost of an execution flow crosses `LIMIT_USD` (configurable per environment), the wrapper instantly throws a `402 Payment Required / Quota Exceeded` error, disconnecting the agent.

## 3. Vendor Lock-in Mitigation
The LLM landscape shifts every 3 months. Tying our entire backend explicitly to a single vendor's proprietary SDK represents high systemic risk.

* **Standardization Policy:** Use uniform connectors like the **OpenAI SDK format** (accepted as de facto standard by multiple alternative vendors) or orchestrators like **LiteLLM** / **Vercel AI SDK** to decouple the interface from the underlying implementation.
* Switching from `model-A` to `model-B` should ideally only require changing one environment variable (`LLM_MODEL_ID`).

---
[Back to Index](./README.md)
