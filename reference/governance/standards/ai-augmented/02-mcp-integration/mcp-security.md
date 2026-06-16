# MCP Security: Permissions and Guardrails

## Executive Summary

Connecting a non-deterministic inference engine (LLM) directly with your backend APIs introduces new attack vectors. An agent "convinced" via jailbreak may try to abuse its tools. Therefore, security in the MCP harness is non-negotiable.

This document defines mandatory security controls for production MCP deployments, with implementation examples from the Evolith CLI reference.

---

## 1. Minimum Privilege Model

Apply the least privilege principle at the Tooling level.

### 1.1 Separation by Role

**Rule:** A BI report agent must NEVER receive access to an MCP Server exposing write tools (`DELETE`, `UPDATE`, `CREATE`).

**Implementation Pattern:**

```typescript
// Evolith MCP Server - Tool filtering by role
interface AgentRole {
  id: string;
  allowedTools: string[];      // Whitelist
  deniedTools: string[];       // Blacklist (defense in depth)
  mutativeAllowed: boolean;
}

const roles: Record<string, AgentRole> = {
  'bi-analyst': {
    id: 'bi-analyst',
    allowedTools: [
      'evolith-gate-status',
      'evolith-architecture-evaluate',
      'evolith-validate',
      'evolith-moscow-analyze',
      'evolith-moscow-export',
    ],
    deniedTools: [
      'evolith-auto-fix',        // Mutative - not allowed
      'evolith-phase-advance',   // SDLC transition - not allowed
      'evolith-sdlc-handoff',    // Mutative - not allowed
      'evolith-agent-handoff',   // Configuration change - not allowed
    ],
    mutativeAllowed: false,
  },
  'architect': {
    id: 'architect',
    allowedTools: ['*'],         // All tools
    deniedTools: [],
    mutativeAllowed: true,
  },
};

// Server enforces role-based filtering
class EvolithMcpServer {
  private filterToolsByRole(tools: Tool[], role: AgentRole): Tool[] {
    return tools.filter(tool => {
      // Check whitelist
      if (!role.allowedTools.includes('*') && !role.allowedTools.includes(tool.name)) {
        return false;
      }
      // Check blacklist (defense in depth)
      if (role.deniedTools.includes(tool.name)) {
        return false;
      }
      // Check mutative restriction
      if (tool.mutative && !role.mutativeAllowed) {
        return false;
      }
      return true;
    });
  }
}
```

### 1.2 Dynamic Scopes

**Rule:** The harness must filter the tool catalog injected into the LLM based on the identity of the final user operating through the agent.

**Implementation:**

```typescript
// Evolith MCP Server - HTTP transport with auth
async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  // 1. Authenticate user/agent
  const auth = this.validateAuth(req, res);
  if (!auth) return;
  
  // 2. Extract user identity and roles
  const user = await this.authenticateUser(req.headers.authorization);
  const roles = await this.userRepository.getRoles(user.id);
  
  // 3. Compute effective tool permissions
  const allTools = this.registry.listTools();
  const allowedTools = this.filterToolsByRole(allTools, roles);
  
  // 4. Return filtered catalog to LLM
  return { tools: allowedTools.map(t => t.schema) };
}
```

---

## 2. Mandatory Guardrails for Production

For an MCP Server to be approved by Corporate Security, it **must** implement all four controls:

### 2.1 Robust Authentication

**Requirement:** If using HTTP/SSE, validation of mTLS tokens or short-lived Bearer tokens (OAuth2).

**Implementation (Evolith MCP Server):**

```typescript
// sdk/cli/src/infrastructure/mcp/server.ts

private validateAuth(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  // If no API key configured, allow all (development mode)
  if (!this.apiKey) return true;

  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const apiKeyHeader = req.headers['x-api-key'] as string | undefined;

  // Support two authentication patterns:
  // 1. Bearer token (OAuth2 compatible)
  // 2. X-API-Key header (service-to-service)
  if (bearerToken !== this.apiKey && apiKeyHeader !== this.apiKey) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Unauthorized', 
      message: 'Invalid or missing API key',
      errorCode: 'AUTH_001'
    }));
    return false;
  }

  return true;
}

// Usage:
// const server = new EvolithMcpServer(
//   'http', 
//   49100, 
//   process.env.MCP_API_KEY  // Required in production
// );
```

**Production Checklist:**

- [ ] API key stored in secrets manager (not in code)
- [ ] Keys rotated every 90 days
- [ ] mTLS enabled for service-to-service communication
- [ ] OAuth2 flow for user-facing agents
- [ ] Token expiration enforced (max 1 hour for bearer tokens)

### 2.2 Irrevocable Audit Log

**Requirement:** Each `CallTool` request must be recorded in an immutable database.

**Implementation (Evolith MCP Server):**

```typescript
// sdk/cli/src/infrastructure/mcp/metrics.service.ts

export interface ToolMetrics {
  toolName: string;
  callCount: number;
  successCount: number;
  errorCount: number;
  totalLatencyMs: number;
  lastCalled: string;  // ISO 8601 timestamp
}

export class McpMetricsService {
  private metrics: McpMetrics;

  recordToolCall(toolName: string, latencyMs: number, success: boolean): void {
    this.metrics.totalRequests++;
    
    // Record immutable audit entry
    const auditEntry = {
      timestamp: new Date().toISOString(),
      toolName,
      latencyMs,
      success,
      // In production, also log:
      // - agent_id: extracted from auth token
      // - human_user_id: from user session
      // - input_arguments_hash: SHA256 of input (privacy)
      // - response_hash: SHA256 of output (integrity)
    };
    
    // In production: await auditLogRepository.save(auditEntry);
    this.metrics.toolMetrics.set(toolName, /* ... */);
  }
  
  recordError(errorCode: string): void {
    // Track error types for security monitoring
    const count = this.metrics.errorMetrics.get(errorCode) || 0;
    this.metrics.errorMetrics.set(errorCode, count + 1);
  }
}

// Usage in tool execution handler:
this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const startTime = Date.now();

  try {
    const result = await tool.execute(args);
    const latencyMs = Date.now() - startTime;
    
    // AUDIT: Success
    this.metricsService.recordToolCall(name, latencyMs, true);
    
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    
    // AUDIT: Failure
    this.metricsService.recordToolCall(name, latencyMs, false);
    this.metricsService.recordError(message.substring(0, 50));
    
    return { 
      content: [{ type: 'text', text: JSON.stringify({ error: true, message }) }],
      isError: true 
    };
  }
});
```

**Audit Log Schema (Production):**

```typescript
interface AuditLogEntry {
  // Identity
  agentId: string;           // MCP client identifier
  humanUserId: string;       // End-user (if applicable)
  sessionId: string;         // Conversation session
  
  // Action
  toolName: string;
  inputArgumentsHash: string;  // SHA256 (privacy - don't log raw args)
  responseHash: string;        // SHA256 (integrity verification)
  
  // Timing
  timestamp: string;           // ISO 8601 UTC
  latencyMs: number;
  
  // Result
  success: boolean;
  errorCode?: string;
  
  // Immutability
  sequenceNumber: number;      // Monotonically increasing
  previousHash: string;        // Chain of custody (blockchain-style)
  signature: string;           // Digital signature (HMAC-SHA256)
}
```

### 2.3 Adaptive Rate Limiting

**Requirement:** Limit not just requests/second, but cumulative financial cost.

**Implementation Pattern:**

```typescript
interface RateLimitConfig {
  // Basic rate limiting
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  
  // Cost-based limiting (for tools with financial impact)
  maxCostPerHour: number;      // USD equivalent
  maxCostPerDay: number;
  
  // Tool-specific limits
  toolLimits: Record<string, {
    maxCallsPerHour: number;
    requiresApproval: boolean;
  }>;
}

const productionLimits: RateLimitConfig = {
  requestsPerSecond: 10,
  requestsPerMinute: 300,
  requestsPerHour: 1000,
  
  // Example: geolocation API costs $0.01 per call
  maxCostPerHour: 10.00,     // Max $10/hour = 1000 calls
  maxCostPerDay: 100.00,
  
  toolLimits: {
    'evolith-auto-fix': {
      maxCallsPerHour: 50,
      requiresApproval: true,  // Human-in-the-loop
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
    
    // Check basic rate limits
    if (counter.requestsPerSecond >= config.requestsPerSecond) {
      return { allowed: false, reason: 'RATE_LIMIT_SECOND' };
    }
    
    // Check tool-specific limits
    const toolLimit = config.toolLimits[toolName];
    if (toolLimit && counter.toolCalls[toolName] >= toolLimit.maxCallsPerHour) {
      return { allowed: false, reason: 'TOOL_LIMIT_HOURLY' };
    }
    
    // Check cost limits (if tool has cost)
    const toolCost = this.getToolCost(toolName);
    if (counter.costPerHour + toolCost > config.maxCostPerHour) {
      return { allowed: false, reason: 'COST_LIMIT_HOURLY' };
    }
    
    return { allowed: true };
  }
}
```

### 2.4 Execution Sandbox

**Requirement:** Tools enabling execution of scripts, raw SQL queries, or system commands MUST run in ephemeral containers.

**Implementation Pattern:**

```typescript
// Pseudo-code for sandboxed execution
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
      // Create ephemeral container
      const container = await this.docker.createContainer({
        Image: 'evolith/sandbox:latest',
        Cmd: ['sh', '-c', command],
        HostConfig: {
          NetworkMode: 'none',           // No network access by default
          Memory: 512 * 1024 * 1024,     // 512MB limit
          CpuShares: 512,                // 50% of one CPU
          ReadonlyRootfs: true,          // Read-only filesystem
          Tmpfs: {                       // Writable temp filesystem
            '/tmp': 'rw,noexec,nosuid,size=100m'
          },
        },
        Env: [
          'NO_NETWORK=1',
          'MAX_FILE_SIZE=10MB',
        ],
      });
      
      // Start container with timeout
      await container.start();
      const result = await Promise.race([
        container.wait(),
        timeout(options.timeoutMs || 30000),
      ]);
      
      // Extract logs
      const logs = await container.logs({ stdout: true, stderr: true });
      
      return {
        success: result.StatusCode === 0,
        output: logs.toString(),
        exitCode: result.StatusCode,
      };
    } finally {
      // Cleanup: remove container
      const container = this.docker.getContainer(containerId);
      await container.remove({ force: true });
    }
  }
}
```

**Sandbox Security Controls:**

| Control | Implementation | Purpose |
|---------|----------------|---------|
| Network Isolation | `NetworkMode: 'none'` | Prevent data exfiltration |
| Memory Limit | `Memory: 512MB` | Prevent DoS |
| CPU Limit | `CpuShares: 512` | Prevent resource exhaustion |
| Read-only Root | `ReadonlyRootfs: true` | Prevent persistence |
| Tmpfs Only | Writable only in `/tmp` | Controlled write access |
| Timeout | `30s max` | Prevent hanging |
| No Privilege | Default user (non-root) | Prevent escalation |

---

## 3. The Great Warning of Veracity

> [!CAUTION]
> **The model does not validate truth.** The LLM assumes ANY RESPONSE returned by a tool is absolute truth and will build its reasoning upon it.
> 
> If an attacker compromises your MCP Server to return fake data, they will instantly deceive your Agent. Tool output data integrity is just as important as input sanitization.

### Defense Strategies

1. **Response Signing:** Cryptographically sign tool responses
2. **Source Verification:** Cross-reference critical data with secondary sources
3. **Anomaly Detection:** Flag responses that deviate from historical patterns
4. **Human Review:** Require human approval for high-stakes decisions

---

## 4. Mandatory Human-in-the-Loop

**Rule:** Any tool categorized as **"Destructive"** requires the harness to intercept the call, set status to `PENDING_APPROVAL`, and wait for human confirmation.

### 4.1 Destructive Tool Classification

```typescript
const DESTRUCTIVE_TOOLS = [
  'evolith-auto-fix',        // Modifies source code
  'evolith-phase-advance',   // Changes SDLC state
  'evolith-sdlc-handoff',    // Creates/modifies artifacts
  'evolith-agent-handoff',   // Creates agent configs
  'evolith-alias',           // Modifies CLI configuration
  'evolith-schema',          // Overwrites schema files
];

interface ToolMetadata {
  name: string;
  mutative: boolean;
  destructive: boolean;
  requiresApproval: boolean;
  approvalLevel: 'none' | 'user' | 'admin' | 'dual-control';
}
```

### 4.2 Implementation (Evolith Confirmation Service)

```typescript
// sdk/cli/src/infrastructure/mcp/confirmation.service.ts

export class ConfirmationService {
  async confirmMutation(
    toolName: string,
    targetDescription: string,
  ): Promise<boolean> {
    // Skip in non-interactive mode (CI/automation)
    if (this.skipConfirm) {
      return true;
    }

    // Check if TTY is available
    if (!this.stdin.isTTY) {
      this.logger.warn(`Cannot confirm in non-interactive mode`);
      return false;
    }

    // Show confirmation prompt
    const prompt = `WARN  MUTATIVE OPERATION
   Tool: ${toolName}
   Target: ${targetDescription}

   Proceed? (y/N): `;

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

// Usage in MCP server:
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
          message: `Operation '${tool.name}' cancelled by user.`,
        }),
      }],
    };
  }
}
```

### 4.3 Approval Levels

| Level | When Required | Example |
|-------|---------------|---------|
| `none` | Read-only operations | `evolith-gate-status`, `evolith-validate` |
| `user` | Local file modifications | `evolith-auto-fix` (developer workstation) |
| `admin` | Production changes | `evolith-phase-advance` (production tenant) |
| `dual-control` | High-risk operations | Database migrations, bulk payments |

---

## 5. Threat Modeling

### 5.1 Attack Vectors

| Threat | Description | Mitigation |
|--------|-------------|------------|
| **Prompt Injection** | Attacker crafts input to bypass tool restrictions | Input validation, output filtering |
| **Tool Abuse** | Agent convinced to misuse legitimate tools | Rate limiting, audit logging |
| **Data Exfiltration** | Tool returns sensitive data to unauthorized agent | Role-based filtering, response redaction |
| **Privilege Escalation** | Agent gains access to higher-privilege tools | Dynamic scoping, auth enforcement |
| **Replay Attack** | Attacker replays valid tool calls | Idempotency keys, timestamp validation |
| **Supply Chain** | Compromised tool implementation | Code signing, integrity verification |

### 5.2 Security Controls Matrix

| Control | Implementation Status | Priority |
|---------|----------------------|----------|
| Authentication | DONE API key + Bearer token | P0 |
| Authorization | WARN Role-based filtering (planned) | P0 |
| Audit Logging | DONE Metrics service (basic) | P1 |
| Rate Limiting | TODO Not implemented | P1 |
| Sandbox | TODO Not implemented | P2 |
| Human-in-the-Loop | DONE Confirmation service | P0 |
| Idempotency | WARN Partial (planned) | P1 |

---

## 6. Compliance Checklist

Before deploying an MCP Server to production, verify:

### Authentication & Authorization
- [ ] API key required for HTTP transport
- [ ] Bearer tokens expire within 1 hour
- [ ] Role-based tool filtering implemented
- [ ] Service accounts have minimal permissions

### Audit & Monitoring
- [ ] All tool calls logged with timestamps
- [ ] Agent identity captured in audit log
- [ ] Human user identity captured (if applicable)
- [ ] Error tracking enabled
- [ ] Metrics dashboard available

### Rate Limiting
- [ ] Requests per second limited
- [ ] Requests per hour limited
- [ ] Cost-based limits configured (if applicable)
- [ ] Tool-specific limits for destructive operations

### Human-in-the-Loop
- [ ] Destructive tools identified and tagged
- [ ] Confirmation required for mutative operations
- [ ] Non-interactive mode properly restricted
- [ ] Approval workflow documented

### Incident Response
- [ ] Security team notified of MCP deployment
- [ ] Runbook created for security incidents
- [ ] Kill switch available to disable MCP server
- [ ] Forensic logging enabled

---

## 7. References

- [Tool Design Principles](../03-tools-catalog/tool-design-principles.md)
- [NIST AI Risk Management Framework](https://ai.nist.gov/)

---

[Back to Index](./README.md)
