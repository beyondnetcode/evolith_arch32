# Evolith CLI Data Models

> **Audience:** Developers, Architects  
> **Purpose:** Document all data models, interfaces, and schemas for the Evolith CLI  
> **Bilingual:** [Español](./data-models.es.md)

---

## Table of Contents

1. [Core Interfaces](#1-core-interfaces)
2. [Entity Definitions](#2-entity-definitions)
3. [Configuration Schemas](#3-configuration-schemas)
4. [MCP Protocol Types](#4-mcp-protocol-types)
5. [Tool Catalog Structure](#5-tool-catalog-structure)

---

## 1. Core Interfaces

### 1-1 Runtime Configuration

```typescript
interface Runtime {
  id: string;
  name: string;
  version: string;
  framework: string;
  defaultTools: string[];
  compatibleArchitectures: ArchitecturePattern[];
}
```

### 1-2 Monorepo Options

```typescript
interface MonorepoOption {
  id: string;
  name: string;
  description: string;
  workspaceConfig: string;
  buildCommand: string;
}
```

### 1-3 Architecture Patterns

```typescript
interface ArchitecturePattern {
  id: string;
  name: string;
  description: string;
  layers: string[];
  folderStructure: string[];
  requiredRulesets: string[];
}
```

---

## 2. Entity Definitions

### 2-1 Phase Entity

```typescript
class Phase {
  readonly value: string;
  readonly label: string;
  readonly description: string;
  readonly gateChecks: GateCheck[];
  readonly artifacts: string[];
  readonly order: number;

  canTransitionTo(other: Phase): boolean {
    return other.order === this.order + 1;
  }

  static readonly ORDER: Record<string, number> = {
    'phase-0': 0,
    'phase-1': 1,
    'phase-2': 2,
    'phase-3': 3,
    'phase-4': 4,
    'phase-5': 5,
  };
}
```

### 2-2 Project Entity

```typescript
interface ProjectConfigData {
  name: string;
  runtimeId: string;
  monorepoId: string;
  architectureId: string;
  database: string;
  apiProtocol: string;
  ciCd: string;
  observability: string;
  tools: string[];
  agents: string[];
}

class Project {
  public readonly id: string;
  public phase: string;
  public readonly createdAt: Date;
  public config: ProjectConfigData;

  constructor(
    name: string,
    runtime: Runtime,
    monorepo: MonorepoOption,
    architecture: ArchitecturePattern,
    phase: string = 'phase-0'
  );

  transitionTo(phase: string): void;
  setConfig(key: keyof ProjectConfigData, value: unknown): void;
  getConfig(): Readonly<ProjectConfigData>;
  isPhase(phase: string): boolean;
}
```

### 2-3 Tool Entity

```typescript
class Tool {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly category: string,
    public readonly phase: string,
    public readonly isRuntimeAware: boolean,
    public readonly commands: string[],
    public readonly platformCheck?: string
  );

  requiresPlatformCheck(): boolean;
}
```

### 2-4 Transition and Gate Results

```typescript
interface GateCheck {
  id: string;
  description: string;
  required: boolean;
  validator: (context: ValidationContext) => Promise<GateResult>;
}

class GateResult {
  constructor(
    public readonly id: string,
    public readonly passed: boolean,
    public readonly description: string,
    public readonly required: boolean,
    public readonly error?: string
  );

  static pass(id: string, description: string, required: boolean): GateResult;
  static fail(id: string, description: string, required: boolean, error: string): GateResult;
}

class TransitionResult {
  constructor(
    public readonly success: boolean,
    public readonly fromPhase: string,
    public readonly toPhase: string,
    public readonly gateResults: GateResult[],
    public readonly executedTools: string[],
    public readonly warnings: string[],
    public readonly errors: string[]
  );

  hasBlockingErrors(): boolean;
  hasRequiredGateFailures(): boolean;

  static success(from: string, to: string, gates: GateResult[], tools: string[]): TransitionResult;
  static failure(from: string, to: string, gates: GateResult[], errors: string[]): TransitionResult;
}
```

---

## 3. Configuration Schemas

### 3-1 evolith.yaml Schema

```typescript
interface EvolithConfig {
  apiVersion: 'evolith.dev/v1';
  kind: 'Satellite';
  coreRef: {
    version: string;
    path: string;
  };
  governance: {
    version: string;
    adrRegistry: Array<{
      id: string;
      status: 'proposed' | 'accepted' | 'rejected' | 'superseded' | 'deprecated';
    }>;
  };
  product: {
    name: string;
    type: 'library' | 'application' | 'service';
    runtime: string;
  };
  sdlc: {
    currentPhase: string;
    phaseHistory: Array<{
      phase: string;
      enteredAt: string;
      exitedAt?: string;
    }>;
  };
  agents: {
    installed: Array<{
      name: string;
      version: string;
      installedAt: string;
    }>;
  };
}
```

### 3-2 Agent Configuration Schema

```typescript
interface AgentConfig {
  id: string;
  name: string;
  version: string;
  template: string;
  ruleset: {
    id: string;
    version: string;
    rules: Rule[];
  };
  prompts: string[];
  installedAt: string;
  metadata: {
    author: string;
    description: string;
    tags: string[];
  };
}
```

### 3-3 Ruleset Schema

```typescript
interface Ruleset {
  id: string;
  name: string;
  version: string;
  description: string;
  rules: Rule[];
  applicableTo: string[];
  phase: string;
}

interface Rule {
  id: string;
  severity: 'error' | 'warning' | 'info';
  description: string;
  validator: string;
  errorMessage: string;
}
```

---

## 4. MCP Protocol Types

### 4-1 Tool Definitions

```typescript
interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}
```

### 4-2 Tool Input Schemas

```typescript
// validate tool
interface ValidateInput {
  path?: string;
  format?: 'json' | 'table' | 'yaml' | 'markdown';
  ruleset?: string;
  verbose?: boolean;
}

// adr-create tool
interface ADRCreateInput {
  title: string;
  context: string;
  decision: string;
  status?: 'proposed' | 'accepted';
}

// agent-install tool
interface AgentInstallInput {
  name: string;
  template?: string;
  version?: string;
}

// sdlc-handoff tool
interface SDLCHandOffInput {
  toPhase: string;
  force?: boolean;
  artifacts?: string[];
}
```

---

## 5. Tool Catalog Structure

### 5-1 Tool Catalog JSON

```json
{
  "version": "1.0.0",
  "lastUpdated": "2026-06-06T00:00:00Z",
  "tools": [
    {
      "id": "context-mapper",
      "name": "Context Mapper",
      "category": "discovery",
      "phase": "phase-0",
      "isRuntimeAware": false,
      "commands": ["evolith-cli sdlc init discovery"],
      "dependencies": [],
      "platformCheck": null
    },
    {
      "id": "ddd-model",
      "name": "DDD Model Generator",
      "category": "architecture",
      "phase": "phase-1",
      "isRuntimeAware": true,
      "commands": ["evolith-cli sdlc init ddd-model"],
      "runtimes": ["nodejs", "dotnet"],
      "dependencies": ["mermaid"],
      "platformCheck": null
    }
  ],
  "categories": {
    "discovery": { "label": "Discovery", "color": "#3b82f6" },
    "architecture": { "label": "Architecture", "color": "#8b5cf6" },
    "scaffolding": { "label": "Scaffolding", "color": "#10b981" },
    "validation": { "label": "Validation", "color": "#f59e0b" },
    "quality": { "label": "Quality", "color": "#ef4444" }
  }
}
```

### 5-2 Runtime Catalog Entry

```typescript
interface RuntimeCatalog {
  runtimes: Runtime[];
  monorepoOptions: MonorepoOption[];
  architecturePatterns: ArchitecturePattern[];
}
```

---

## Version

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-06-06 | Evolith Team | Initial data model documentation |