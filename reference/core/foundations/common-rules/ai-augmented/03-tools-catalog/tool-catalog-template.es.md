# Tool Documentation Template


---

## [TOOL_SYSTEM_NAME]
*(Por ejemplo, `order_management_cancel_order`)*
### Intent and Rationale
Explique brevemente **por qué** existe esta herramienta y en qué escenario debe invocarla el modelo.
### Signature & Arguments
| Argumento | Tipo | ¿Requerido? | Descripción y gama |
| :--- | :--- | :--- | :--- |
| `arg_uno` | `cadena` | Sí | Explicación de uso. |
| `arg_dos` | `enumeración` | No | Conjunto de valores permitidos `[A, B, C]`. |
### Deterministic Verification Strategy
¿Cómo se valida la integridad de la salida?
- [] Cobertura de prueba unitaria (%)
- [] Validación del esquema JSON
- [] Afirmaciones de condiciones previas (por ejemplo, no se puede cancelar un pedido ya entregado)
### Side Effects Table
* **¿Modifica la base de datos?** [Sí/No]
* **¿Envía notificación externa?** [Sí/No]
* **¿Costo financiero por uso?** [Costo aproximado en llamadas informáticas/API]
### Usage Example for Model
```json
{
 "name": "order_management_cancel_order",
 "arguments": {
 "orderId": "TX-9812",
 "reason": "CUSTOMER_REQUEST"
 }
}
```

---
[Volver al índice](./README.md)
