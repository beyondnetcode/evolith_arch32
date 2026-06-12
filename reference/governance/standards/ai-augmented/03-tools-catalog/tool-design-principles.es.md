# Design Principles for Intelligent Tools


---

## Context
Un LLM no ve el código; solo ve la documentación. Una herramienta exquisitamente escrita con metadatos mal descritos da como resultado un agente inútil.

Seguir estos 5 principios maximiza la probabilidad de una llamada de herramienta exitosa en un 90%.

---
## 1. Semantic Determinism (Clear Naming)
El nombre de la herramienta debe ser muy explícito y evitar jerga profesional ajena a la acción.
* `hacer_trabajar`
* `datos_proceso`
* `calcular_impuesto_de_envío`
* `fetch_user_by_email`
## 2. The Principle of Hyper-Explicitness in Descriptions
Una descripción no es para un humano, es para un motor de búsqueda de espacio vectorial.
* `"Consultas de productos."`
* `"Recupera el catálogo detallado de productos activos. OBLIGATORIO cuando el usuario solicita disponibilidad, precios o niveles de stock. NO utilice esto para consultas de facturación."`
## 3. Strict Schemas (Zod / JSON Schema)
Nunca defina un argumento como una "cadena" suelta. Utilice `enTODO` y restricciones siempre que sea posible para restringir la "creatividad" del modelo.
* **Argumento vago:** `estado: cadena`
* **Argumento estricto:** `estado: "PENDIENTE" | "ENVIADO" | "ENTRADO"`
## 4. High Idempotence (Safe to Retry)
Los agentes frecuentemente ingresan en bucles de reintento recursivos en caso de falla. Si una herramienta falla a la mitad, ejecutarla nuevamente NO DEBE generar efectos secundarios duplicados (por ejemplo, cargar una tarjeta de crédito dos veces). Las herramientas deben aceptar `idempotency_key` cuando sea relevante.
## 5. Semantic Error Handling
Si la herramienta falla, envíe una explicación textual que ayude al modelo a comprender cómo solucionar la llamada.
*`Error interno del servidor HTTP 500` (El agente se da por vencido).
* `{"error": "Formato no válido", "detalles": "El código postal debe tener 5 dígitos numéricos. Se encontró 'ABC4'. Corrija y vuelva a intentarlo."}` (El agente razona, reformula y vuelve a llamar exitosamente).

---
[Volver al índice](./README.md)