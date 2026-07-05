# Tool Documentation Template

Any custom tool exposed to the agent must follow this canonical internal documentation pattern to enable proper evaluation before going to production.

---

## [TOOL_SYSTEM_NAME]
*(E.g., `order_management_cancel_order`)*

### Intent and Rationale
Briefly explain **why** this tool exists and in what scenario the model must invoke it.

### Signature & Arguments
| Argument | Type | Required? | Description and Range |
| :--- | :--- | :--- | :--- |
| `arg_one` | `string` | Yes | Explanation of usage. |
| `arg_two` | `enum` | No | Set of allowed values `[A, B, C]`. |

### Deterministic Verification Strategy
How is output integrity validated?
- [] Unit test coverage (%)
- [] JSON Schema validation
- [] Pre-condition assertions (E.g., Can't cancel an already delivered order)

### Side Effects Table
* **Modifies Database?** [Yes/No]
* **Sends external Notification?** [Yes/No]
* **Financial cost per use?** [Approx cost in computing/API calls]

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
[Back to Index](./README.md)
