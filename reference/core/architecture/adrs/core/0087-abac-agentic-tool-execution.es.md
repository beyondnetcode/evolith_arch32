> **Bilingual Navigation:** [View English version](./0087-abac-agentic-tool-execution.md)

# ADR-0087: Control de Acceso Basado en Atributos (ABAC) para Ejecución de Herramientas Agénticas

## Estado
Accepted

## Fecha
2026-06-20

## Contexto y Problema
El ADR-0082 (Límite de Confianza) y el ADR-0083 (Autorización de Acciones y Auditoría) establecieron que los agentes requieren capacidades delegadas con alcance estrictamente limitado. Sin embargo, estos ADRs definen un perímetro estático — las restricciones del sandbox no varían según la identidad o los atributos del usuario humano que inició la sesión del agente.

Esto crea un **problema de diputado confundido**: un agente invocado por un rol `viewer` (solo lectura) podría, en principio, intentar las mismas llamadas a herramientas MCP que uno invocado por un rol `architect`, porque la verificación de autorización ocurre únicamente a nivel del sandbox, no a nivel de la solicitud.

## Decisión
Establecemos **Control de Acceso Basado en Atributos (ABAC)** para todas las ejecuciones de herramientas MCP dentro de la Topología de IA Agéntica. Las decisiones de autorización DEBEN evaluarse en el momento de la invocación de la herramienta utilizando las siguientes cuatro dimensiones:

### Modelo de Decisión ABAC

| Dimensión | Descripción | Ejemplo |
|---|---|---|
| **Sujeto** | Los claims JWT del usuario humano (roles, tenant, contexto) | `roles: ["developer"]`, `tenant: "acme"` |
| **Acción** | La herramienta MCP específica solicitada | `evolith-write-file`, `evolith-deploy` |
| **Recurso** | El bounded context / dominio en el que opera la herramienta | `billing`, `identity`, `governance` |
| **Entorno** | La topología de runtime activa | `development`, `staging`, `production` |

### Esquema de Entrada OPA Requerido
Todas las evaluaciones de políticas para llamadas a herramientas MCP DEBEN recibir la siguiente estructura de entrada:

```json
{
  "user": {
    "id": "string",
    "roles": ["string"],
    "tenant": "string"
  },
  "tool_name": "string",
  "resource_domain": "string",
  "environment": "string"
}
```

### Requisito de Paridad Dual-Engine
Según el ADR-0041, la lógica de autorización DEBE implementarse en **ambos**:
1. Un evaluador TypeScript nativo (para cumplimiento en línea dentro del sandbox)
2. Una política OPA `.rego` correspondiente (para gobernanza de políticas como código)

La política de referencia se encuentra en [`src/rulesets/opa/abac-mcp-tool-access.rego`](../../../../../src/rulesets/opa/abac-mcp-tool-access.rego).

## Consecuencias

### Positivas
- Los agentes que operan en nombre de un `viewer` están estrictamente limitados a herramientas de solo lectura, independientemente de lo que solicite el prompt del sistema del agente.
- Los cambios de política (ej., restringir `evolith-deploy` a `production`) se aplican centralmente en OPA sin cambios de código.
- Las decisiones de autorización son auditables — cada decisión de llamada a herramienta puede reconstruirse desde los logs de evaluación de OPA.

### Negativas
- Cada manejador de herramientas MCP debe extenderse para extraer y reenviar el contexto de usuario al evaluador OPA.
- La validación del JWT debe realizarse aguas arriba (en el BFF/API Gateway) antes de iniciar la sesión del agente.

## Referencias
- [ADR-0041: Evaluación de Políticas Dual-Engine](./0041-dual-engine-policy-evaluation.md)
- [ADR-0081: Aislamiento del Sandbox de IA Agéntica](./0081-agentic-ai-sandbox-isolation.md)
- [ADR-0082: Límite de Confianza de IA Agéntica](./0082-agentic-ai-trust-boundary.md)
- [ADR-0083: Autorización de Acciones y Auditoría de IA Agéntica](./0083-agentic-ai-action-authorization-audit.md)
- [ADR-0086: Telemetría y Control de Costos de IA Agéntica](./0086-agentic-ai-telemetry-cost-control.md)
- [Política ABAC de Referencia](../../../../../src/rulesets/opa/abac-mcp-tool-access.rego)

---
[Volver al Índice de ADRs Core](./README.md)

> **Agent Signature:** Architect Agent
