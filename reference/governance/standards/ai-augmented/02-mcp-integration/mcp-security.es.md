# MCP Security: Permissions and Guardrails


---

## Minimum Privilege Model
Aplique el principio de privilegio mínimo a nivel de herramientas:

* **Separación por función:** Un agente de informes de BI NUNCA debe recibir acceso a un servidor MCP que exponga herramientas de escritura (`BORRAR`, `ACTUALIZAR`).
* **Alcances Dinámicos:** El arnés debe filtrar el catálogo de herramientas inyectado en el LLM en función de la identidad del usuario final que opera a través del agente.
## Mandatory Guardrails for Production
Para que un Servidor MCP sea aprobado por Seguridad Corporativa, debe implementar:

1. **Autenticación sólida:** 
 * Si se utiliza HTTP/SSE, validación de tokens mTLS o tokens portadores de corta duración (OAuth2).
 * No confíe en la seguridad debido a la oscuridad dentro de la red interna.
2. **Registro de auditoría irrevocable:** 
 * Cada solicitud de `CallTool` debe registrarse en una base de datos inmutable con: `timestamp`, `agent_id`, `human_user_id`, `tool_name`, `input_arguments` y `response_hash`.
3. **Límite de tasa adaptativa:**
 * Limite no solo las solicitudes por segundo, sino también el costo financiero acumulativo (por ejemplo, no más de $10 USD en llamadas API geolocalizadas por agente por hora).
4. **Zona de pruebas de ejecución:**
 * Las herramientas que permiten la ejecución de scripts, consultas SQL sin formato o comandos del sistema DEBEN ejecutarse en contenedores efímeros (Docker/gVisor) con acceso a la red estrictamente bloqueado o incluido en la lista blanca.
## The Great Warning of Veracity
> [!PRECAUCIÓN]
> **El modelo no valida la verdad.** El LLM asume CUALQUIER RESPUESTA devuelta por una herramienta es verdad absoluta y basará su razonamiento en ella.
> Si un atacante compromete su servidor MCP para devolver datos falsos, engañará instantáneamente a su Agente. La integridad de los datos de salida de la herramienta es tan importante como la desinfección de los datos de entrada.
## Mandatory Human-in-the-Loop
Cualquier herramienta categorizada como **"Destructiva"** (Eliminar base de datos, cancelar suscripción masiva, ejecutar pago masivo) requiere que el arnés intercepte la llamada, establezca el estado en `PENDING_APPROVAL` y espere a que un humano haga clic físicamente en un botón antes de ejecutar el código de backend.

---
[Volver al índice](./README.md)