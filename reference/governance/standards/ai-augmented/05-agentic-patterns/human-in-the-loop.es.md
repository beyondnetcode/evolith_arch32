# Human-in-the-Loop: Mandatory Validation Points


---

## Definition and Objectives
El patrón **Human-in-the-Loop (HITL)** establece barreras forzadas en el flujo de ejecución donde el agente autónomo se ve obligado a pausar su estado y solicitar aprobación humana física y explícita para continuar.

Nuestra arquitectura asume que **NINGÚN AGENTE ES 100% CONFIABLE** en escenarios con ramificaciones en el mundo físico o legal.
## Which decisions ALWAYS require human approval?
En este ecosistema corporativo las siguientes acciones NO PUEDEN ser autónomas:

1. **Operaciones Destructivas Irreversibles:** Eliminación de registros de bases de datos de producción, cancelaciones masivas de suscripciones, eliminación de repositorios.
2. **Cambios en la configuración de la infraestructura (producción):** Modificación de reglas de firewall, desactivación de balanceadores de carga, cambio de cuotas de escalado automático.
3. **Comunicaciones Externas Firmadas:** Envío de correos electrónicos masivos a clientes reales, publicación en redes sociales corporativas en nombre de la marca, envío de ofertas comerciales vinculantes.
4. **Transacciones económicas por encima del umbral:** Cualquier desembolso, movimiento de dinero o reembolso que exceda el `AUTO_APPROVAL_THRESHOLD` configurado de cada producto.
## Implementation Patterns

### A. Interruption via Tool Callback
El arnés intercepta la invocación de la herramienta antes de enviarla al backend real:
1. El agente solicita "ejecutar_pago (monto: 5000)".
2. El arnés detecta que "5000 > límite".
3. Harness guarda el estado de la conversación y envía un webhook a un canal de aprobación de Slack o al panel de administración.
4. La ejecución entra en suspensión (`Suspendida`).
5. Tras la aprobación manual, el webhook activa el arnés y concluye la ejecución de la herramienta con el resultado real.
### B. Pre-Execution Plan Review
Se utiliza junto con el patrón Planificar y ejecutar. El Agente genera la lista de 10 comandos Bash que pretende ejecutar. El sistema muestra la lista al desarrollador, quien debe hacer clic en "Aprobar y ejecutar" para continuar.
## Critical Anti-Pattern: The Illusion of Control
**Los agentes con acceso ilimitado a herramientas destructivas que se basan únicamente en el mensaje del sistema ("No elimine nada importante") representan una negligencia operativa grave.** El control DEBE residir en el código compilado del arnés, no en las intenciones textuales del modelo.

---
[Volver al índice](./README.md)