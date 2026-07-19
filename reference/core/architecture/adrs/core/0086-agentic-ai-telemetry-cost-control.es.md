> **Bilingual Navigation:** [View English version](./0086-agentic-ai-telemetry-cost-control.md)

# ADR-0086: Estándar de Telemetría y Control de Costos para IA Agéntica

## Estado
Accepted

## Fecha
2026-06-20

## Contexto
La adopción de la Topología de IA Agéntica en Evolith introduce agentes autónomos que iteran, razonan y llaman a herramientas externas (MCP) a través de múltiples ciclos. A diferencia de las solicitudes de API deterministas estándar, las interacciones agénticas (como los bucles ReAct) pueden consumir cantidades muy variables de tokens LLM por interacción de usuario.
Sin una observabilidad estricta, un bucle atascado o una alucinación puede agotar los presupuestos de la API rápidamente, y se vuelve imposible atribuir costos a dominios, usuarios o flujos de trabajo específicos.

## Decisión
Establecemos un esquema **OpenTelemetry (OTel)** estandarizado para todas las rutas de ejecución de IA Agéntica. Cualquier sistema que invoque un LLM (ya sea a través de API directa, LangChain o SDKs personalizados) DEBE emitir trazas OTel que abarquen tanto las convenciones estándar de IA generativa como atributos específicos de Evolith.

Los atributos de telemetría obligatorios son:

### 1. Atributos Estándar de IA Generativa (Convenciones Semánticas)
- `gen_ai.system`: El proveedor del LLM (ej., `openai`, `anthropic`, `gemini`, `ollama`).
- `gen_ai.request.model`: El modelo específico invocado (ej., `gpt-4o`, `claude-3-5-sonnet`).
- `gen_ai.usage.prompt_tokens`: Conteo de tokens de entrada.
- `gen_ai.usage.completion_tokens`: Conteo de tokens de salida.
- `gen_ai.usage.total_cost_usd`: Costo calculado o emitido por proxy en USD.

### 2. Atributos Agénticos Específicos de Evolith
- `evolith.agent.session_id`: Un UUID que agrupa un bucle de razonamiento autónomo continuo de múltiples pasos (abarcando múltiples llamadas LLM).
- `evolith.mcp.tool_calls`: Un arreglo de herramientas MCP solicitadas por el agente durante el paso.
- `evolith.domain`: El bounded context (contexto delimitado) que inició el flujo de trabajo agéntico.

## Consecuencias
### Positivas
- **Atribución de Costos**: Las organizaciones pueden consultar plataformas APM (como Datadog, Jaeger o Grafana Tempo) para calcular costos exactos en USD por `evolith.domain` o por `session_id`.
- **Detección de Anomalías**: Los bucles descontrolados pueden ser detectados y alertados sumando los `prompt_tokens` agrupados por `session_id`.
- **Perfilado de Rendimiento**: Obtenemos un seguimiento preciso de latencia (Tiempo Hasta el Primer Token - TTFT) a través de diferentes modelos subyacentes.

### Negativas
- **Sobrecarga de Instrumentación**: Los SDKs y BFFs deben ser aumentados o envueltos (wrapped) para garantizar que estos atributos se inyecten correctamente.
- **Requisito de Proxy**: Para hacer cumplir el `total_cost_usd` de forma segura sin depender de la honestidad del cliente, las organizaciones podrían necesitar desplegar un LLM Gateway (como LiteLLM o un proxy interno) para emitir estas métricas con autoridad.

> **Agent Signature:** Architect Agent
