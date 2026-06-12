# ADR 0069: Implementación del Protocolo del Servidor MCP

## Estado
Propuesto

## Fecha
2026-06-06

## Contexto

Evolith Core proporciona rulesets de gobernanza (ACL, Open-Core Boundary, Executive Scorecards) que los agentes de IA deben consumir para aplicar decisiones arquitectónicas. Actualmente, los agentes acceden a la gobernanza a través de comandos CLI manuales o lectura directa de archivos. Esto crea dos problemas:

1. **Aplicación inconsistente:** Los agentes pueden no ejecutar validaciones de manera consistente sin integración de herramientas
2. **Sin protocolo estandarizado:** Cada agente implementa lógica personalizada para analizar artefactos Evolith

El Model Context Protocol (MCP) proporciona una forma estandarizada para que los modelos de IA interactúen con herramientas y recursos externos. Implementar un servidor MCP para Evolith permite:
- Claude Desktop y otros agentes compatibles con MCP para consumir gobernanza Evolith nativamente
- Aplicación de validación consistente en todas las implementaciones de agentes
- Una única fuente de verdad para acceso a rulesets mediante herramientas, recursos y prompts

## Decisión

Implementaremos un servidor MCP (`evolith-mcp-server`) que expone la gobernanza de Evolith a través de JSON-RPC 2.0 sobre transporte stdio. El servidor NO se convertirá en una nueva fuente de verdad — proxyará la lógica existente de la capa de servicios del SDK.

---

## 1. Arquitectura

### 1.1 Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                      Cliente MCP (Claude Desktop)           │
└─────────────────────────────────────────────────────────────┘
                              │ stdio (JSON-RPC 2.0)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Servidor MCP Evolith                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Handler de  │  │ Recursos    │  │ Prompts     │         │
│  │ Herramientas│  │             │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Capa de Servicios SDK                   │
│  ┌─────────────────┐  ┌────────────────────────┐           │
│  │RulesetValidator │  │ArchitectureValidation  │           │
│  └─────────────────┘  └────────────────────────┘           │
│  ┌─────────────────┐  ┌────────────────────────┐           │
│  │AgentInstallation│  │SdlcOperations          │           │
│  └─────────────────┘  └────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Transporte

- **Protocolo:** JSON-RPC 2.0 sobre stdio
- **Paquete:** `@modelcontextprotocol/sdk`
- **Clase de Transporte:** `StdioServerTransport`
- **Sin HTTP/WebSocket:** El servidor MCP es un subproceso, no un servicio de red

### 1.3 SDK como Única Fuente de Verdad

El servidor MCP NO DEBE implementar lógica de negocio directamente. Delega a la capa de servicios SDK:

```
McpServer.tools/call → SDKService.method() → Respuesta JSON-RPC
```

Esto asegura:
- CLI y MCP comparten lógica de validación idéntica
- Las correcciones de errores solo necesitan ocurrir en un lugar (SDK)
- La extracción del SDK permanece posible en futuras fases

---

## 2. Capacidades MCP

### 2.1 Herramientas (30+)

| Nombre de Herramienta | Argumentos | Retorna |
|-----------|-----------|---------|
| `evolith-validate` | `path: string, format?: string, ruleset?: string` | Resultado de validación JSON |
| `evolith-agent-install` | `name: string, template?: string, dir?: string` | Confirmación de instalación |
| `evolith-agent-list` | `dir?: string` | Lista de agentes instalados |
| `evolith-agent-validate` | `name: string, dir?: string` | Validación del ruleset del agente |
| `evolith-agent-upgrade` | `name: string, dir?: string` | Resultado de actualización |
| `evolith-agent-remove` | `name: string, dir?: string` | Confirmación de eliminación |
| `evolith-architecture-validate` | `path: string, level?: F1\|F2\|F3` | Validación arquitectónica |
| `evolith-sdlc-handoff` | `path: string, fromPhase: string, toPhase: string` | Manifiesto de transferencia |
| `evolith-sdlc-status` | `path: string` | Estado del phase gate actual |
| `evolith-config-get` | `key: string` | Valor de configuración |
| `evolith-config-set` | `key: string, value: string` | Confirmación de establecimiento |

### 2.2 Recursos (12)

| URI del Recurso | Descripción |
|--------------|-------------|
| `evolith://rulesets` | Lista de nombres y rutas de rulesets disponibles |
| `evolith://ruleset/{name}` | Contenido completo de un ruleset específico |
| `evolith://ruleset/{name}/rule/{code}` | Una regla individual de un ruleset |
| `evolith://phase-gates` | Definiciones actuales de phase gates |
| `evolith://phase-gate/{phase}` | Requisitos de un phase gate específico |
| `evolith://agents` | Lista de agentes instalados |
| `evolith://agent/{name}` | Configuración y reglas del agente |
| `evolith://repository/config` | Contenido del evolith.yaml del repositorio |
| `evolith://governance/version` | Versión del esquema de gobernanza |
| `evolith://core/version` | Versión del esquema core |
| `evolith://open-core/artifacts` | Lista de artefactos Open-Core |
| `evolith://acl/rules` | Resumen del ruleset ACL |

### 2.3 Prompts (6)

| Nombre del Prompt | Propósito |
|-------------|---------|
| `evolith/validate-repository` | Plantilla para validar un repositorio contra la gobernanza |
| `evolith/agent-onboarding` | Plantilla para instalar y configurar un nuevo agente |
| `evolith/architecture-review` | Plantilla para realizar revisión arquitectónica F1/F2/F3 |
| `evolith/phase-gate-check` | Plantilla para verificar preparación del phase gate |
| `evolith/sdlc-handoff` | Plantilla para ejecutar transferencia de fase SDLC |
| `evolith/ruleset-analysis` | Plantilla para analizar un ruleset para cumplimiento |

---

## 3. Requisitos de Implementación

### 3.1 Dependencias del Paquete

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0"
  }
}
```

### 3.2 Estructura del Proyecto

```
sdk/cli/
├── src/
│   ├── cli/
│   │   ├── index.ts              # Punto de entrada CLI
│   │   └── commands/
│   │       └── mcp.ts            # Comando 'smart-cli mcp'
│   ├── mcp/
│   │   ├── server.ts             # Clase McpServer
│   │   ├── tools/
│   │   │   ├── validate.ts       # Herramienta evolith-validate
│   │   │   ├── agent.ts          # Herramientas de gestión de agentes
│   │   │   ├── architecture.ts   # Herramientas de validación arquitectónica
│   │   │   └── sdlc.ts           # Herramientas SDLC
│   │   ├── resources/
│   │   │   └── index.ts          # Handlers de recursos
│   │   └── prompts/
│   │       └── index.ts          # Plantillas de prompts
│   └── core/
│       └── services/             # Capa de servicios SDK (compartida)
└── dist/
    ├── cli.js                    # Salida CLI
    └── mcp-server.js             # Salida del servidor MCP
```

### 3.3 Implementación del Servidor

```typescript
import { Server } from '@modelcontextprotocol/sdk/server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types';

export class EvolithMcpServer extends Server {
  constructor() {
    super({
      name: 'evolith-mcp-server',
      version: '1.0.0',
    });

    this.setRequestHandler(ListToolsRequestSchema, this.handleListTools.bind(this));
    this.setRequestHandler(CallToolRequestSchema, this.handleCallTool.bind(this));
  }

  private async handleListTools() {
    return {
      tools: [
        { name: 'evolith-validate', description: 'Validar repositorio contra gobernanza Evolith', inputSchema: {...} },
        // ... más herramientas
      ]
    };
  }

  private async handleCallTool(name: string, args: Record<string, unknown>) {
    // Delegar a la capa de servicios SDK
    const service = getSdkService(name);
    const result = await service.execute(args);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
}
```

### 3.4 Integración CLI

El servidor MCP se invoca mediante el subcomando `smart-cli mcp`:

```typescript
export const mcpCommand = new Command('mcp')
  .description('Iniciar servidor MCP Evolith para integración de agentes de IA')
  .action(async () => {
    const server = new EvolithMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
  });
```

---

## 4. Cumplimiento del Protocolo

### 4.1 Requisitos JSON-RPC 2.0

- Todas las solicitudes DEBEN tener `jsonrpc: '2.0'`
- Todas las solicitudes DEBEN tener `id` (string o número)
- Las notificaciones (sin respuesta esperada) omiten `id`
- Los errores DEBEN incluir `code`, `message` y opcionalmente `data`

### 4.2 Handlers Requeridos

| Handler | Requerido | Descripción |
|---------|----------|-------------|
| `initialize` | SÍ | Anuncio de capacidades del servidor |
| `tools/list` | SÍ | Enumerar herramientas disponibles |
| `tools/call` | SÍ | Ejecutar herramienta por nombre |
| `resources/list` | SÍ | Enumerar recursos disponibles |
| `resources/read` | SÍ | Leer contenido del recurso |
| `prompts/list` | SÍ | Enumerar prompts disponibles |
| `prompts/get` | SÍ | Obtener plantilla de prompt |
| `shutdown` | SÍ | Apagado graceful del servidor |

### 4.3 Códigos de Error

| Código | Significado | Uso |
|------|---------|-------|
| `-32700` | Error de análisis | JSON inválido recibido |
| `-32600` | Solicitud inválida | Campos requeridos faltantes |
| `-32601` | Método no encontrado | Herramienta/recurso desconocido |
| `-32603` | Error interno | Fallo del servicio SDK |

---

## 5. No-Objetivos (Violaciones Arquitectónicas a Evitar)

| No-Objetivo | Razón |
|----------|--------|
| El servidor MCP NO notifica a los clientes | Patrón WatcherService rechazado (análisis de gap G-01) |
| El servidor MCP NO almacena estado | El estado vive en el sistema de archivos del repositorio |
| El servidor MCP NO se convierte en fuente de verdad | La capa de servicios SDK es la fuente de verdad |
| El servidor MCP NO expone transporte de red | Solo stdio; sin HTTP/WebSocket |

---

## 6. Consideraciones de Seguridad

### 6.1 Validación de Entrada

- Todos los argumentos de herramientas DEBEN ser validados contra esquema JSON
- Los argumentos de ruta DEBEN estar limitados al directorio raíz del repositorio
- Sin ejecución de shell desde argumentos de herramientas

### 6.2 Control de Acceso a Recursos

- Los recursos son de solo lectura (sin recursos de escritura)
- Ataques de path traversal prevenidos normalizando y validando rutas
- Respuestas grandes truncadas para prevenir DoS

### 6.3 Prevención de Inyección de Prompts

- Las plantillas de prompts no incluyen entrada de usuario cruda
- Toda entrada de usuario es escapada antes de inserción en prompts

---

## 7. Requisitos de Pruebas

### 7.1 Pruebas Unitarias

- Métodos handler de McpServer probados con servicios SDK mockeados
- Validación de argumentos de herramientas probada con entradas inválidas
- Normalización de rutas de recursos probada

### 7.2 Pruebas de Integración

- Servidor MCP iniciado como subproceso sobre stdio
- Solicitudes JSON-RPC enviadas y respuestas validadas
- Ronda completa: CLI → MCP → SDK → Respuesta

### 7.3 Pruebas de Cumplimiento de Protocolo

- Todos los handlers requeridos retornan esquema correcto
- Códigos de error correctos para escenarios de falla
- Métodos de solo notificación no retornan respuestas

---

## 8. Alineación con Phase Gates

| Fase | Entregable MCP | Criterios de Salida |
|-------|----------------|---------------|
| Fase 1 | Fundación SDK | Servicios SDK probados unitariamente 80%+ |
| Fase 2 | Completación CLI | Comandos CLI funcionales |
| Fase 3 | Servidor MCP | Herramientas, recursos, prompts MCP funcionando |
| Fase 4 | Extracción SDK | SDK publicado en npm (si aplicable) |

---

## 9. Consecuencias

### Positivas

- Agentes de IA pueden consumir gobernanza Evolith nativamente vía MCP
- Aplicación de validación consistente en todos los agentes compatibles con MCP
- CLI y MCP comparten capa de servicios SDK (única fuente de verdad)
- Protocolo estandarizado reemplaza implementaciones custom de agentes

### Negativas

- Carga de mantenimiento adicional para servidor MCP
- Pruebas de cumplimiento de protocolo añaden complejidad CI
- Dependencia de SDK MCP añade al tamaño del bundle

### Riesgos y Mitigaciones

| Riesgo | Mitigación |
|------|------------|
| Cambios en SDK MCP rompen servidor | Versionar SDK; probar en actualización |
| Transporte stdio tiene problemas de buffering | Usar StdioServerTransport oficial; probar salidas grandes |
| Esquema de protocolo evoluciona | Negociación de versión en handler initialize |

---

## 10. Referencias

- [Arquitectura Objetivo SDK/CLI/MCP](../../../../sdk/cli/docs/planning/sdk-cli-mcp-target-architecture.md)
- [Catálogo de Capacidades MCP](../../../../sdk/cli/docs/planning/mcp-capability-catalog.md)
- [Análisis de Gap G-01: Protocolo de Servidor MCP No Implementado](../../../../sdk/cli/docs/planning/sdk-cli-mcp-gap-analysis.md)
- [Estrategia de Pruebas](../../../../sdk/cli/docs/planning/testing-strategy.md)
- [Lista de Verificación de Preparación para Release](../../../../sdk/cli/docs/planning/release-readiness-checklist.md)
- [Ruleset ACL](../../../../rulesets/acl/anti-corruption-layer.rules.json)
- [Reglas de Open-Core Boundary](../../../../rulesets/governance/open-core-boundary.rules.json)
- [@modelcontextprotocol/sdk](https://modelcontextprotocol.io)




## Opciones Consideradas

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Evidencias y Criterios de Evaluación

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Decisiones y Estándares Relacionados

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

---

[Back to Index](./README.es.md)