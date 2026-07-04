# Model Selection Guide and Complexity Tree


---

## Cost vs Reasoning Capability Axiom
No todos los problemas exigen el "modelo más inteligente".
Elegir el último modelo de frontera (por ejemplo, Opus, GPT-4o, Ultra) para una tarea simple de clasificación de texto resulta en un **aumento de 10 a 50 veces el costo financiero** y una latencia inaceptable.

Adoptamos un árbol jerárquico para hacer coincidir el problema con el motor correcto.

---
## The 3 Tiers of Operation
| Nivel | Ejemplo de categoría de modelo | Caso de uso recomendado | Peso del costo |
| :--- | :--- | :--- | :--- |
| **Nivel 1: Flash/Haiku** | Géminis 1.5 Flash / Claude 3.5 Haiku | Resúmenes de alta velocidad, extracción de etiquetas, clasificación rápida, finalización de códigos sencilla. | $ (Mínimo) |
| **Nivel 2: Pro / Soneto** | Géminis 1.5 Pro / Claude 3.5 Soneto | Programación general, refactorización, ejecución multiherramienta, razonamiento complejo, modelado de datos. | $$ (Optimizado) |
| **Nivel 3: Ultra/Opus** | Géminis 1.0 Ultra / GPT-4 Turbo / Claude 3 Opus | Planificación estratégica de varios pasos, matemáticas complejas, auditoría legal profunda, conciliación de múltiples documentos. | $$$$ (Extremo) |

---
## Selection Decision Tree
Haga las siguientes preguntas secuenciales para determinar el modelo mínimo viable:

1. **¿Es esta una transformación 1 a 1?** (por ejemplo, la entrada A produce la salida B con reglas simples)
 * -> Utilice **Nivel 1 (Flash)**.
2. **¿Requiere el uso de herramientas externas (MCP)?**
 * -> **En caso afirmativo (1 o 2 herramientas):** Pruebe primero el Nivel 1.
 * -> **Si es así (> 3 herramientas complejas):** Avance al **Nivel 2 (Pro/Sonnet)** para evitar alucinaciones en argumentos JSON.
3. **¿El contexto supera los 100.000 tokens?** (por ejemplo, leer un repositorio de código completo o 5 archivos PDF largos)
 * -> Exigir modelos de ventana alta como **Gemini 1.5 Pro** (hasta 2 millones de tokens).
4. **¿Es este un sistema de producción crítico que genera resultados legales/financieros?**
 * -> Mandato **Nivel 2 o Nivel 3** respaldado por un canal determinista Human-in-the-Loop.
## Benchmarking Metric
Definimos **RPT (Razonamiento por token)** como nuestra métrica de rendimiento interna. Cuando se lanza un nuevo modelo, nuestro Comité de IA ejecuta un conjunto automatizado de cinco tareas de dominio estándar. Sólo los modelos que pasan estas pruebas están autorizados oficialmente para agregarse al catálogo de producción.

---
[Volver al índice](./README.md)