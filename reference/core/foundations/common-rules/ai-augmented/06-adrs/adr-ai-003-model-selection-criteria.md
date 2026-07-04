# ADR-AI-003: Selection criteria and governance for language models

* **Status:** Proposed
* **Date:** 2026-05-11

## Context
Ungoverned use of language models (LLMs) introduces systemic risks: massive privacy leaks if data is uploaded to free public APIs, reliance on a single vendor that can double prices without warning, and indiscriminate use of expensive models for computationally trivial tasks.

## Decision
Adopt a hybrid governance model:
1. **Self-Hosted OSS (Llama 3.x, etc.) as first option** for internal tasks not requiring superior critical reasoning or processing raw PII.
2. **Federated Commercial APIs (AWS Bedrock, Azure AI) ONLY if a signed DPA exists** prohibiting model retraining using our data.
3. Usage of the **Official Model Catalog**, classifying models into Tiers (Large, Flash, Local) and assigning them according to task complexity to optimize costs.

## Alternatives Considered
* **Total Team Freedom:** Flatly rejected by legal auditors due to the unrecoverable risk of client data leaks.
* **Single Corporate Vendor (e.g., Only OpenAI):** Discarded to avoid Vendor Lock-In during prolonged service outages; we prefer an agnostic multi-cloud strategy via unified adapters.

## Consequences
* **Legal Shielding:** Guaranteed compliance with privacy regulations.
* **Financial Efficiency:** 30-40% reduction in token expenditure by forcing the use of small models for non-critical tasks.
* **Higher Initial Latency:** Bootstrapping local inference clusters for OSS requires initial GPU infrastructure setup time.

---
[Back to Index](./README.md)
