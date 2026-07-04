# Harness Recommendations by Runtime

Official recommendations for implementing the harness according to the authorized runtimes in the corporate technology matrix.

---

## Node.js / TypeScript

The JavaScript ecosystem is the most mature in agentic support frameworks thanks to its natural asynchrony and dynamism.

* **Recommended Harness Frameworks:**
 * **Vercel AI SDK:** Standard for fast streaming and structured output.
 * **LangChain.js / LangGraph:** For complex state graph flows.
 * **Mastra:** Recommended for building lightweight local micro-agents with optimized tool calling.
* **Tool Calling:** Use JSON Schema via Zod to define tool input interfaces, guaranteeing strong typing (Type-Safety) from the model to code execution.
* **AGENTS.md Integration:** Consume via Nx or native NPM scripts.
* **Governance:** Native integration with Husky for instantaneous pre-commit verifications.

---

## .NET / C#

The .NET environment excels in typed robustness and performance in long-running background processes with agentic oversight.

* **Recommended Harness Frameworks:** 
 * **Microsoft Semantic Kernel:** The canonical corporate choice for integrating models with native C# code.
 * **Microsoft AutoGen:** For experimental multi-agent simulations.
* **Tool Calling:** Utilizing native C# Reflection and annotations/attributes (`[KernelFunction]`) to expose domain methods directly to the model without heavy wrappers.
* **Typical Use Cases:** Complex file batch processing, entity extraction in legacy flows, and intelligent data validation.
* **Hooks:** Strict integration with `dotnet test` and Roslyn Analyzers during pre-commit.

---

## Android / Kotlin

The role of AI in mobile devices is bounded by battery consumption, memory, and latency.

* **Bounded Scope:** Android agents should typically be designed as **clients** requesting orchestration from a robust backend-hosted agent. Recursive, complex agentic loops in local runtime are discouraged.
* **Recommended SDKs:**
 * **Google AI SDK for Android:** For direct inference with Gemini in fast tasks.
 * **Firebase Genkit:** Simplified integration if the Firebase ecosystem is already in place.
* **Use Cases:**
 * Dynamic Generative UI based on the app's current state.
 * Offline-capable contextual help assistants (if using AICore or small on-device models).
 * Structured data extraction from local images (Intelligent OCR).

---
[Back to Index](./README.md)
