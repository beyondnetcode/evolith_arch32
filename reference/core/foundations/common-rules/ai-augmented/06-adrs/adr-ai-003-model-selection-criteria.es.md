# ADR-AI-003: Selection criteria and governance for language models


---

## Context
El uso no gobernado de modelos de lenguaje (LLM) introduce riesgos sistémicos: fugas masivas de privacidad si los datos se cargan en API públicas gratuitas, dependencia de un único proveedor que puede duplicar los precios sin previo aviso y uso indiscriminado de modelos costosos para tareas computacionalmente triviales.
## Decision
Adoptar un modelo de gobernanza híbrido:
1. **OSS autohospedado (Llama 3.x, etc.) como primera opción** para tareas internas que no requieren un razonamiento crítico superior ni procesamiento de PII sin procesar.
2. **API comerciales federadas (AWS Bedrock, Azure AI) SÓLO si existe un DPA firmado** que prohíbe el reentrenamiento del modelo utilizando nuestros datos.
3. Uso del **Catálogo Oficial de Modelos**, clasificando los modelos en Tiers (Large, Flash, Local) y asignándolos según la complejidad de la tarea para optimizar costos.
## Alternatives Considered
* **Libertad total del equipo:** Rechazado rotundamente por los auditores legales debido al riesgo irrecuperable de filtración de datos de los clientes.
* **Proveedor corporativo único (p. ej., solo OpenAI):** Descartado para evitar la dependencia del proveedor durante interrupciones prolongadas del servicio; Preferimos una estrategia de múltiples nubes agnóstica a través de adaptadores unificados.
## Consequences
* **Blindaje Legal:** Cumplimiento garantizado de la normativa de privacidad.
* **Eficiencia financiera:** Reducción del 30-40 % en el gasto simbólico al obligar al uso de modelos pequeños para tareas no críticas.
* **Latencia inicial más alta:** El arranque de clústeres de inferencia locales para OSS requiere tiempo de configuración inicial de la infraestructura de GPU.

---
[Volver al índice](./README.md)