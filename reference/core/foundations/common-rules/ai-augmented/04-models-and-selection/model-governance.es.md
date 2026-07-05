# Model Governance: DPA, Privacy and Cost Control


---

## 1. Data Privacy & DPA (Mandatory)
NUNCA ingrese código fuente, PII confidencial o datos financieros privados en niveles web "gratuitos" o de "consumidor" (por ejemplo, ChatGPT / Claude Web gratuito estándar sin inicio de sesión empresarial).

* **Política:** SÓLO consumimos API que declaran oficialmente retención cero con fines de capacitación según un DPA (Acuerdo de procesamiento de datos) empresarial ejecutado.
* **Enrutamiento aprobado:** Todas las llamadas a modelos DEBEN atravesar puertas de enlace corporativas (p. ej., Azure OpenAI, AWS Bedrock, Vertex AI) que garantizan matemáticamente que los datos permanezcan dentro de la jurisdicción de VPC y no se utilicen para volver a entrenar los modelos base globalmente.
## 2. Token Quotas & Budget Management
Un bucle agente no supervisado puede consumir cientos de dólares en minutos si entra en un bucle recursivo infinito.

* **Pasos máximos:** Todos los bucles de agentes deben poseer un límite inquebrantable (límite máximo) de iteraciones recursivas (recomendado: `max_iterations = 10`).
* **Disyuntor de presupuesto:** Implemente una ventana de consumo deslizante en el nivel de contenedor HTTP. Si el costo agregado de un flujo de ejecución cruza `LIMIT_USD` (configurable por entorno), el contenedor arroja instantáneamente un error `402 Pago requerido/Cuota excedida`, desconectando al agente.
## 3. Vendor Lock-in Mitigation
El panorama de LLM cambia cada 3 meses. Vincular todo nuestro backend explícitamente al SDK propietario de un único proveedor representa un alto riesgo sistémico.

* **Política de estandarización:** Utilice conectores uniformes como el **formato OpenAI SDK** (aceptado como estándar de facto por múltiples proveedores alternativos) u orquestadores como **LiteLLM**/**Vercel AI SDK** para desacoplar la interfaz de la implementación subyacente.
* Lo ideal es que cambiar del `modelo A` al `modelo B` solo requiera cambiar una variable de entorno (`LLM_MODEL_ID`).

---
[Volver al índice](./README.md)