# Seguridad MCP: Permisos y Guardarraíles

## Resumen Ejecutivo

Conectar un motor de inferencia no determinista (LLM) directamente con sus APIs de backend introduce nuevos vectores de ataque. Un agente "convencido" mediante jailbreak puede intentar abusar de sus herramientas. Por lo tanto, la seguridad en el arnés MCP es innegociable.

Este documento define controles de seguridad obligatorios para despliegues MCP en producción, con ejemplos de implementación de la referencia del CLI de Evolith.

---

## 1. Modelo de Mínimo Privilegio

Aplique el principio de privilegio mínimo a nivel de Herramientas.

### 1.1 Separación por Función

**Regla:** Un agente de informes de BI NUNCA debe recibir acceso a un Servidor MCP que exponga herramientas de escritura (`BORRAR`, `ACTUALIZAR`, `CREAR`).

**Patrón de Implementación:**

```typescript
// Servidor MCP de Evolith - Filtrado de herramientas por rol
interface AgenteRol {
  id: string;
  herramientasPermitidas: string[];      // Whitelist
  herramientasDenegadas: string[];       // Blacklist (defensa en profundidad)
  mutativasPermitidas: boolean;
}

const roles: Record<string, AgenteRol> = {
  'analista-bi': {
    id: 'analista-bi',
    herramientasPermitidas: [
      'evolith-gate-status',
      'evolith-architecture-evaluate',
      'evolith-validate',
      'evolith-moscow-analyze',
      'evolith-moscow-export',
    ],
    herramientasDenegadas: [
      'evolith-auto-fix',        // Mutativa - no permitida
      'evolith-phase-advance',   // Transición SDLC - no permitida
      'evolith-sdlc-handoff',    // Mutativa - no permitida
      'evolith-agent-handoff',   // Cambio de configuración - no permitida
    ],
    mutativasPermitidas: false,
  },
  'arquitecto': {
    id: 'arquitecto',
    herramientasPermitidas: ['*'],         // Todas las herramientas
    herramientasDenegadas: [],
    mutativasPermitidas: true,
  },
};

// El servidor aplica filtrado basado en rol
class EvolithMcpServer {
  private filtrarHerramientasPorRol(herramientas: Tool[], rol: AgenteRol): Tool[] {
    return herramientas.filter(herramienta => {
      // Verificar whitelist
      if (!rol.herramientasPermitidas.includes('*') && !rol.herramientasPermitidas.includes(herramienta.name)) {
        return false;
      }
      // Verificar blacklist (defensa en profundidad)
      if (rol.herramientasDenegadas.includes(herramienta.name)) {
        return false;
      }
      // Verificar restricción de mutativas
      if (herramienta.mutative && !rol.mutativasPermitidas) {
        return false;
      }
      return true;
    });
  }
}
```

### 1.2 Alcances Dinámicos

**Regla:** El arnés debe filtrar el catálogo de herramientas inyectado en el LLM basado en la identidad del usuario final que opera a través del agente.

**Implementación:**

```typescript
// Servidor MCP de Evolith - Transporte HTTP con autenticación
async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  // 1. Autenticar usuario/agente
  const auth = this.validateAuth(req, res);
  if (!auth) return;
  
  // 2. Extraer identidad de usuario y roles
  const usuario = await this.autenticarUsuario(req.headers.authorization);
  const roles = await this.usuarioRepositorio.obtenerRoles(usuario.id);
  
  // 3. Computar permisos efectivos de herramientas
  const todasHerramientas = this.registry.listTools();
  const herramientasPermitidas = this.filtrarHerramientasPorRol(todasHerramientas, roles);
  
  // 4. Devolver catálogo filtrado al LLM
  return { tools: herramientasPermitidas.map(t => t.schema) };
}
```

---

## 2. Guardarraíles Obligatorios para Producción

Para que un Servidor MCP sea aprobado por Seguridad Corporativa, **debe** implementar los cuatro controles:

### 2.1 Autenticación Sólida

**Requisito:** Si usa HTTP/SSE, validación de tokens mTLS o tokens Bearer de corta duración (OAuth2).

**Implementación (Servidor MCP de Evolith):**

```typescript
// sdk/cli/src/infrastructure/mcp/server.ts

private validateAuth(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  // Si no hay clave API configurada, permitir todo (modo desarrollo)
  if (!this.apiKey) return true;

  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const apiKeyHeader = req.headers['x-api-key'] as string | undefined;

  // Soportar dos patrones de autenticación:
  // 1. Token Bearer (compatible OAuth2)
  // 2. Header X-API-Key (servicio-a-servicio)
  if (bearerToken !== this.apiKey && apiKeyHeader !== this.apiKey) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Unauthorized', 
      message: 'Clave API inválida o faltante',
      errorCode: 'AUTH_001'
    }));
    return false;
  }

  return true;
}

// Uso:
// const server = new EvolithMcpServer(
//   'http', 
//   49100, 
//   process.env.MCP_API_KEY  // Requerido en producción
// );
```

**Checklist de Producción:**

- [ ] Clave API almacenada en gestor de secretos (no en código)
- [ ] Claves rotadas cada 90 días
- [ ] mTLS habilitado para comunicación servicio-a-servicio
- [ ] Flujo OAuth2 para agentes面向用户
- [ ] Expiración de token aplicada (máx 1 hora para tokens bearer)

### 2.2 Registro de Auditoría Irrevocable

**Requisito:** Cada solicitud `CallTool` debe registrarse en una base de datos inmutable.

**Implementación (Servidor MCP de Evolith):**

```typescript
// sdk/cli/src/infrastructure/mcp/metrics.service.ts

export interface ToolMetrics {
  toolName: string;
  callCount: number;
  successCount: number;
  errorCount: number;
  totalLatencyMs: number;
  lastCalled: string;  // Timestamp ISO 8601
}

export class McpMetricsService {
  private metrics: McpMetrics;

  recordToolCall(toolName: string, latencyMs: number, success: boolean): void {
    this.metrics.totalRequests++;
    
    // Registrar entrada de auditoría inmutable
    const auditEntry = {
      timestamp: new Date().toISOString(),
      toolName,
      latencyMs,
      success,
      // En producción, también registrar:
      // - agent_id: extraído del token de autenticación
      // - human_user_id: desde sesión de usuario
      // - input_arguments_hash: SHA256 de entrada (privacidad)
      // - response_hash: SHA256 de salida (integridad)
    };
    
    // En producción: await auditLogRepository.save(auditEntry);
    this.metrics.toolMetrics.set(toolName, /* ... */);
  }
  
  recordError(errorCode: string): void {
    // Rastrear tipos de error para monitoreo de seguridad
    const count = this.metrics.errorMetrics.get(errorCode) || 0;
    this.metrics.errorMetrics.set(errorCode, count + 1);
  }
}

// Uso en manejador de ejecución de herramienta:
this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const startTime = Date.now();

  try {
    const result = await tool.execute(args);
    const latencyMs = Date.now() - startTime;
    
    // AUDITORÍA: Éxito
    this.metricsService.recordToolCall(name, latencyMs, true);
    
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    
    // AUDITORÍA: Fallo
    this.metricsService.recordToolCall(name, latencyMs, false);
    this.metricsService.recordError(message.substring(0, 50));
    
    return { 
      content: [{ type: 'text', text: JSON.stringify({ error: true, message }) }],
      isError: true 
    };
  }
});
```

**Schema de Registro de Auditoría (Producción):**

```typescript
interface AuditLogEntry {
  // Identidad
  agentId: string;           // Identificador de cliente MCP
  humanUserId: string;       // Usuario final (si aplica)
  sessionId: string;         // Sesión de conversación
  
  // Acción
  toolName: string;
  inputArgumentsHash: string;  // SHA256 (privacidad - no registrar args crudos)
  responseHash: string;        // SHA256 (verificación de integridad)
  
  // Timing
  timestamp: string;           // ISO 8601 UTC
  latencyMs: number;
  
  // Resultado
  success: boolean;
  errorCode?: string;
  
  // Inmutabilidad
  sequenceNumber: number;      // Monótonamente creciente
  previousHash: string;        // Cadena de custodia (estilo blockchain)
  signature: string;           // Firma digital (HMAC-SHA256)
}
```

### 2.3 Límite de Tasa Adaptativo

**Requisito:** Limitar no solo solicitudes/segundo, sino costo financiero acumulativo.

**Patrón de Implementación:**

```typescript
interface RateLimitConfig {
  // Limitación básica de tasa
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  
  // Limitación basada en costo (para herramientas con impacto financiero)
  maxCostPerHour: number;      // Equivalente USD
  maxCostPerDay: number;
  
  // Límites específicos por herramienta
  toolLimits: Record<string, {
    maxCallsPerHour: number;
    requiresApproval: boolean;
  }>;
}

const productionLimits: RateLimitConfig = {
  requestsPerSecond: 10,
  requestsPerMinute: 300,
  requestsPerHour: 1000,
  
  // Ejemplo: API de geolocalización cuesta $0.01 por llamada
  maxCostPerHour: 10.00,     // Máx $10/hora = 1000 llamadas
  maxCostPerDay: 100.00,
  
  toolLimits: {
    'evolith-auto-fix': {
      maxCallsPerHour: 50,
      requiresApproval: true,  // Humano-en-el-bucle
    },
    'evolith-phase-advance': {
      maxCallsPerHour: 10,
      requiresApproval: true,
    },
  },
};

class AdaptiveRateLimiter {
  private counters = new Map<string, Counter>();
  
  async checkLimit(agentId: string, toolName: string): Promise<RateLimitResult> {
    const counter = this.counters.get(agentId) || new Counter();
    
    // Verificar límites básicos de tasa
    if (counter.requestsPerSecond >= config.requestsPerSecond) {
      return { allowed: false, reason: 'RATE_LIMIT_SECOND' };
    }
    
    // Verificar límites específicos de herramienta
    const toolLimit = config.toolLimits[toolName];
    if (toolLimit && counter.toolCalls[toolName] >= toolLimit.maxCallsPerHour) {
      return { allowed: false, reason: 'TOOL_LIMIT_HOURLY' };
    }
    
    // Verificar límites de costo (si la herramienta tiene costo)
    const toolCost = this.getToolCost(toolName);
    if (counter.costPerHour + toolCost > config.maxCostPerHour) {
      return { allowed: false, reason: 'COST_LIMIT_HOURLY' };
    }
    
    return { allowed: true };
  }
}
```

### 2.4 Zona de Pruebas de Ejecución

**Requisito:** Las herramientas que permiten ejecución de scripts, consultas SQL crudas, o comandos de sistema DEBEN ejecutarse en contenedores efímeros.

**Patrón de Implementación:**

```typescript
// Pseudo-código para ejecución en sandbox
import { Docker } from 'dockerode';
import { v4 as uuidv4 } from 'uuid';

class SandboxedExecutor {
  private docker = new Docker();
  
  async executeInSandbox(
    command: string,
    options: SandboxOptions
  ): Promise<ExecutionResult> {
    const containerId = `evolith-sandbox-${uuidv4()}`;
    
    try {
      // Crear contenedor efímero
      const container = await this.docker.createContainer({
        Image: 'evolith/sandbox:latest',
        Cmd: ['sh', '-c', command],
        HostConfig: {
          NetworkMode: 'none',           // Sin acceso a red por defecto
          Memory: 512 * 1024 * 1024,     // Límite 512MB
          CpuShares: 512,                // 50% de un CPU
          ReadonlyRootfs: true,          // Sistema de archivos solo-lectura
          Tmpfs: {                       // Sistema de archivos temporal writable
            '/tmp': 'rw,noexec,nosuid,size=100m'
          },
        },
        Env: [
          'NO_NETWORK=1',
          'MAX_FILE_SIZE=10MB',
        ],
      });
      
      // Iniciar contenedor con timeout
      await container.start();
      const result = await Promise.race([
        container.wait(),
        timeout(options.timeoutMs || 30000),
      ]);
      
      // Extraer logs
      const logs = await container.logs({ stdout: true, stderr: true });
      
      return {
        success: result.StatusCode === 0,
        output: logs.toString(),
        exitCode: result.StatusCode,
      };
    } finally {
      // Limpieza: remover contenedor
      const container = this.docker.getContainer(containerId);
      await container.remove({ force: true });
    }
  }
}
```

**Controles de Seguridad de Sandbox:**

| Control | Implementación | Propósito |
|---------|----------------|---------|
| Aislamiento de Red | `NetworkMode: 'none'` | Prevenir exfiltración de datos |
| Límite de Memoria | `Memory: 512MB` | Prevenir DoS |
| Límite de CPU | `CpuShares: 512` | Prevenir agotamiento de recursos |
| Root Solo-Lectura | `ReadonlyRootfs: true` | Prevenir persistencia |
| Solo Tmpfs | Writable solo en `/tmp` | Acceso de escritura controlado |
| Timeout | `30s máx` | Prevenir cuelgues |
| Sin Privilegio | Usuario por defecto (non-root) | Prevenir escalada |

---

## 3. La Gran Advertencia de Veracidad

> [!PRECAUCIÓN]
> **El modelo no valida la verdad.** El LLM asume CUALQUIER RESPUESTA devuelta por una herramienta es verdad absoluta y basará su razonamiento en ella.
> 
> Si un atacante compromete su Servidor MCP para devolver datos falsos, engañará instantáneamente a su Agente. La integridad de datos de salida de herramienta es tan importante como la desinfección de entrada.

### Estrategias de Defensa

1. **Firma de Respuestas:** Firmar criptográficamente respuestas de herramientas
2. **Verificación de Fuente:** Cruzar datos críticos con fuentes secundarias
3. **Detección de Anomalías:** Flaggear respuestas que se desvían de patrones históricos
4. **Revisión Humana:** Requerir aprobación humana para decisiones de alto riesgo

---

## 4. Humano-en-el-Bucle Obligatorio

**Regla:** Cualquier herramienta categorizada como **"Destructiva"** requiere que el arnés intercepte la llamada, establezca el estado en `PENDING_APPROVAL`, y espere confirmación humana.

### 4.1 Clasificación de Herramientas Destructivas

```typescript
const HERRAMIENTAS_DESTRUCTIVAS = [
  'evolith-auto-fix',        // Modifica código fuente
  'evolith-phase-advance',   // Cambia estado SDLC
  'evolith-sdlc-handoff',    // Crea/modifica artefactos
  'evolith-agent-handoff',   // Crea configs de agente
  'evolith-alias',           // Modifica configuración CLI
  'evolith-schema',          // Sobrescribe archivos de schema
];

interface ToolMetadata {
  name: string;
  mutative: boolean;
  destructive: boolean;
  requiresApproval: boolean;
  approvalLevel: 'none' | 'user' | 'admin' | 'dual-control';
}
```

### 4.2 Implementación (Servicio de Confirmación de Evolith)

```typescript
// sdk/cli/src/infrastructure/mcp/confirmation.service.ts

export class ConfirmationService {
  async confirmMutation(
    toolName: string,
    targetDescription: string,
  ): Promise<boolean> {
    // Saltar en modo no interactivo (CI/automatización)
    if (this.skipConfirm) {
      return true;
    }

    // Verificar si TTY está disponible
    if (!this.stdin.isTTY) {
      this.logger.warn(`No se puede confirmar en modo no interactivo`);
      return false;
    }

    // Mostrar prompt de confirmación
    const prompt = `WARN  OPERACIÓN MUTATIVA
   Herramienta: ${toolName}
   Objetivo: ${targetDescription}

   ¿Proceder? (y/N): `;

    return new Promise<boolean>((resolve) => {
      const rl = readline.createInterface({
        input: this.stdin,
        output: this.stdout,
      });

      rl.question(prompt, (answer) => {
        rl.close();
        const confirmed = answer.toLowerCase().trim() === 'y';
        resolve(confirmed);
      });
    });
  }
}

// Uso en servidor MCP:
if (tool.mutative) {
  const confirmed = await this.confirmationService.confirmMutation(
    tool.name,
    targetDescription
  );
  
  if (!confirmed) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: true,
          status: 'CONFIRMATION_DENIED',
          message: `Operación '${tool.name}' cancelada por usuario.`,
        }),
      }],
    };
  }
}
```

### 4.3 Niveles de Aprobación

| Nivel | Cuándo se Requiere | Ejemplo |
|-------|-------------------|---------|
| `none` | Operaciones solo-lectura | `evolith-gate-status`, `evolith-validate` |
| `user` | Modificaciones de archivos locales | `evolith-auto-fix` (workstation desarrollador) |
| `admin` | Cambios en producción | `evolith-phase-advance` (tenant producción) |
| `dual-control` | Operaciones de alto riesgo | Migraciones de BD, pagos masivos |

---

## 5. Modelado de Amenazas

### 5.1 Vectores de Ataque

| Amenaza | Descripción | Mitigación |
|---------|-------------|------------|
| **Inyección de Prompt** | Atacante crafta entrada para saltar restricciones de herramienta | Validación de entrada, filtrado de salida |
| **Abuso de Herramienta** | Agente convencido de usar mal herramientas legítimas | Limitación de tasa, registro de auditoría |
| **Exfiltración de Datos** | Herramienta devuelve datos sensibles a agente no autorizado | Filtrado por rol, redacción de respuesta |
| **Escalada de Privilegio** | Agente gana acceso a herramientas de mayor privilegio | Alcance dinámico, aplicación de autenticación |
| **Ataque de Replay** | Atacante replayea llamadas de herramienta válidas | Claves de idempotencia, validación de timestamp |
| **Cadena de Suministro** | Implementación de herramienta comprometida | Firma de código, verificación de integridad |

### 5.2 Matriz de Controles de Seguridad

| Control | Estado de Implementación | Prioridad |
|---------|-------------------------|----------|
| Autenticación | DONE Clave API + token Bearer | P0 |
| Autorización | WARN Filtrado por rol (planeado) | P0 |
| Registro de Auditoría | DONE Servicio de métricas (básico) | P1 |
| Limitación de Tasa | No implementado | P1 |
| Sandbox | No implementado | P2 |
| Humano-en-el-Bucle | DONE Servicio de confirmación | P0 |
| Idempotencia | WARN Parcial (planeado) | P1 |

---

## 6. Checklist de Cumplimiento

Antes de desplegar un Servidor MCP a producción, verifique:

### Autenticación y Autorización
- [ ] Clave API requerida para transporte HTTP
- [ ] Tokens Bearer expiran dentro de 1 hora
- [ ] Filtrado de herramientas por rol implementado
- [ ] Cuentas de servicio tienen permisos mínimos

### Auditoría y Monitoreo
- [ ] Todas las llamadas de herramienta registradas con timestamps
- [ ] Identidad de agente capturada en registro de auditoría
- [ ] Identidad de usuario humano capturada (si aplica)
- [ ] Rastreo de errores habilitado
- [ ] Dashboard de métricas disponible

### Limitación de Tasa
- [ ] Solicitudes por segundo limitadas
- [ ] Solicitudes por hora limitadas
- [ ] Límites basados en costo configurados (si aplica)
- [ ] Límites específicos de herramienta para operaciones destructivas

### Humano-en-el-Bucle
- [ ] Herramientas destructivas identificadas y etiquetadas
- [ ] Confirmación requerida para operaciones mutativas
- [ ] Modo no interactivo correctamente restringido
- [ ] Flujo de aprobación documentado

### Respuesta a Incidentes
- [ ] Equipo de seguridad notificado de despliegue MCP
- [ ] Runbook creado para incidentes de seguridad
- [ ] Kill switch disponible para deshabilitar servidor MCP
- [ ] Registro forense habilitado

---

## 7. Referencias

- [Principios de Diseño de Herramientas](../03-tools-catalog/tool-design-principles.es.md)
- [NIST AI Risk Management Framework](https://ai.nist.gov/)

---

[Volver al índice](./README.es.md)
