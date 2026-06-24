> **Navegacion Bilingue:** [English Version](./0002-mcp-integration-protocol.md)

# ADR-0002: Protocolo de Integracion MCP para Invocacion de Herramientas de Agentes

## Status
Aceptado

## Date
2026-06-23

## Contexto y Problema
El Model Context Protocol (MCP) es la interfaz estandar a traves de la cual los agentes de IA descubren e invocan herramientas dentro del ecosistema Evolith. A medida que crece el numero de herramientas registradas por MCP en repositorios satelite, los puntos de integracion se vuelven fragiles: los agentes pueden invocar herramientas sin verificacion de capacidades, las respuestas de herramientas pueden exceder los esquemas esperados, y las cadenas de herramientas entre agentes pueden crear acoplamiento oculto entre contextos delimitados de lo contrario independientes.

Sin un protocolo formal de integracion, el registro de herramientas MCP se convierte en un espacio libre donde cualquier agente puede exponer o consumir cualquier herramienta, violando el principio de menor privilegio y haciendo imposible razonar sobre el radio de impacto de los cambios de herramientas.

El script `mcp-smoke.mjs` actualmente valida la disponibilidad del servidor MCP pero no aplica limites de capacidad, cumplimiento de esquemas de respuesta, ni propagacion de presupuesto en cadenas de herramientas. A medida que aumenta la autonomia de los agentes, estas brechas se convierten en riesgos arquitectonicos.

## Decision
Definimos el **Protocolo de Integracion MCP** con cinco reglas obligatorias para todos los productores y consumidores de herramientas dentro de Evolith.

### 1. Contrato de Registro de Herramientas
Cada herramienta MCP DEBE registrarse con:
- Un ID de herramienta unico siguiendo el formato `{dominio}.{capacidad}.{version}`
- Un JSON Schema para parametros de entrada y payload de salida
- Una etiqueta de capacidad declarada (`solo-lectura`, `mutacion`, `efecto-secundario`)
- Un nivel de confianza explicito (`confiable`, `sandboxed`, `no-confiable`)

El registro se guarda en el artefacto de registro de herramientas y es validado por `validate-rulesets.mjs`.

### 2. Control de Acceso Basado en Capacidades
La invocacion de herramienta agente-a-herramienta DEBE ser gobernada por una matriz de capacidades. Los agentes reciben un conjunto de etiquetas de capacidad permitidas al momento de creacion. Un agente con capacidad `solo-lectura` NO DEBE invocar herramientas etiquetadas como `mutacion` o `efecto-secundario`. Las violaciones se registran en OpenTelemetry con `access_control.violation` como nombre de evento.

### 3. Validacion de Esquema de Respuesta
Todas las respuestas de herramientas MCP DEBEN validarse contra el esquema de salida registrado antes de ser consumidas por agentes aguas abajo. Las respuestas invalidas activan un circuit breaker y un span de error en OpenTelemetry. El patron de validacion refleja `review-result.mjs`: fallo cerrado, esquema versionado, con codigos de error explicitos para payloads malformados.

### 4. Propagacion de Presupuesto en Cadenas de Herramientas
Cuando el Agente A invoca la Herramienta T que activa al Agente B, el presupuesto original de ejecucion (tokens, tiempo, profundidad) DEBE propagarse y decrementarse. Las cadenas de herramientas que agotan su presupuesto se terminan con `AGENT_LOOP_BREAKER`. La propagacion de presupuesto usa el header `X-Agent-Depth` definido en ADR-0092.

### 5. Protocolo de Cambios Incompatibles
Modificar el esquema de entrada o salida de una herramienta MCP constituye un cambio incompatible. Los productores de herramientas DEBEN:
- Publicar el nuevo esquema de version al menos un ciclo de release antes de la aplicacion
- Mantener compatibilidad hacia atras durante una ventana de deprecacion
- Notificar a todos los consumidores registrados via el bus de eventos del registro de herramientas

## Consecuencias

### Positivas
- **Seguridad**: El control de acceso basado en capacidades previene la escalada de privilegios a traves de cadenas de herramientas.
- **Confiabilidad**: La validacion de esquema de respuesta detecta la deriva del proveedor antes de que se propague.
- **Observabilidad**: La propagacion de presupuesto permite el seguimiento de costos de extremo a extremo en cadenas de agentes.
- **Evolucionabilidad**: El protocolo de cambios incompatibles previene fallos de integracion silenciosos.

### Negativas
- **Sobrecarga de registro**: Cada herramienta nueva requiere documentacion de esquema antes de poder usarse.
- **Latencia**: La validacion de respuestas agrega una pequena sobrecarga por llamada a cada invocacion de herramienta.

### Neutrales
- **Alcance de migracion**: Las herramientas existentes sin registrar deben catalogarse y registrarse antes de que este protocolo entre en vigor. El artefacto de registro de herramientas sirve como lista de verificacion de migracion.

## Referencias
- [ADR-0001: Ingenieria de Harness](./0001-harness-engineering.es.md)
- [ADR-0004: AGENTS.md Artefacto Obligatorio](./0004-agents-md-mandatory-artifact.es.md)
- [ADR-0087: ABAC para Ejecucion de Herramientas Agentic](../core/0087-abac-agentic-tool-execution.es.md)
- [ADR-0092: Prevencion de Bucles Infinitos de Agentes](../core/0092-agent-infinite-loop-prevention.es.md)
- [mcp-smoke.mjs](../../../../.harness/scripts/mcp-smoke.mjs)
- [validate-rulesets.mjs](../../../../.harness/scripts/validate-rulesets.mjs)

---
[Volver al Indice de ADRs](../README.es.md)

> **Firma del Agente:** Agente Arquitecto
