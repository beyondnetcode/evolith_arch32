# Authorized Model Catalog (May 2026 Horizon)


---

## Authorized Commercial Families (Via Enterprise Gateway)

### Google Gemini Family
* **Gemini 1.5 Pro**: Recomendado para lectura masiva de códigos debido a su ventana de token de 2M. Máxima capacidad para el razonamiento estructural entre repositorios.
* **Gemini 1.5 Flash**: Recomendado para la extracción rápida y económica de metadatos estructurados de imágenes o grandes volúmenes de texto.
### Anthropic Claude Family
* **Claude 3.5 Sonnet**: punto de referencia global actual para codificación de software nativo y llamadas deterministas a herramientas. Modelo primario designado para IDE y agentes locales.
* **Claude 3.5 Haiku**: rendimiento más rápido para clasificación de latencia inferior a un segundo.
### OpenAI GPT Family
* **GPT-4o**: Altamente robusto para la lógica de flujo de trabajo heredada y llamadas de funciones complejas donde la compatibilidad nativa requiere el estándar histórico de OpenAI.
* **o1 (Serie de Razonamiento)**: Autorizado sólo para cálculo científico o tareas intensas de optimización algorítmica. Bloqueado para chatbots conversacionales debido al alto costo por token de razonamiento.
## Authorized Open Source / Local Families (Self-Hosted)

### Meta Llama 3.x Series
* **Llama 3.1 70B / 405B**: Alternativa principal para la soberanía absoluta de los datos. Debe ejecutarse en clústeres internos de Kubernetes/GPU (vLLM).
* **Llama 3.1 8B**: Para tiempos de ejecución perimetrales o microagentes integrados rápidos.

---
*Aviso: Los modelos enumerados aquí se derivan de tablas de clasificación estándar de la industria y pasan nuestros puntos de referencia internos RPT (razonamiento por token).*

---
[Volver al índice](./README.md)