# Modelos de Datos del Smart CLI

> **Audiencia:** Desarrolladores, Arquitectos  
> **Propósito:** Documentar todos los modelos de datos, interfaces y esquemas del Smart CLI  
> **Bilingual:** [English](./data-models.md)

---

## Tabla de Contenidos

1. [Interfaces Core](#1-interfaces-core)
2. [Definiciones de Entidades](#2-definiciones-de-entidades)
3. [Esquemas de Configuración](#3-esquemas-de-configuración)
4. [Tipos del Protocolo MCP](#4-tipos-del-protocolo-mcp)
5. [Estructura del Catálogo de Herramientas](#5-estructura-del-catálogo-de-herramientas)

---

## 1. Interfaces Core

### 1-1 Configuración de Runtime

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

### 1-2 Opciones de Monorepo

```typescript
interface MonorepoOption {
  id: string;
  name: string;
  description: string;
  workspaceConfig: string;
  buildCommand: string;
}
```

### 1-3 Patrones de Arquitectura

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

## 2. Definiciones de Entidades

### 2-1 Entidad Phase

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

### 2-2 Entidad Project

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

### 2-3 Entidad Tool

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

### 2-4 Transición y Resultados de Gate

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

## 3. Esquemas de Configuración

### 3-1 Esquema evolith.yaml

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

### 3-2 Esquema de Configuración de Agente

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

### 3-3 Esquema de Ruleset

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

## 4. Tipos del Protocolo MCP

### 4-1 Definiciones de Herramientas

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

### 4-2 Esquemas de Entrada de Herramientas

```typescript
// herramienta validate
interface ValidateInput {
  path?: string;
  format?: 'json' | 'table' | 'yaml' | 'markdown';
  ruleset?: string;
  verbose?: boolean;
}

// herramienta adr-create
interface ADRCreateInput {
  title: string;
  context: string;
  decision: string;
  status?: 'proposed' | 'accepted';
}

// herramienta agent-install
interface AgentInstallInput {
  name: string;
  template?: string;
  version?: string;
}

// herramienta sdlc-handoff
interface SDLCHandOffInput {
  toPhase: string;
  force?: boolean;
  artifacts?: string[];
}
```

---

## 5. Estructura del Catálogo de Herramientas

### 5-1 Catálogo de Herramientas JSON

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
      "commands": ["smart-cli sdlc init discovery"],
      "dependencies": [],
      "platformCheck": null
    },
    {
      "id": "ddd-model",
      "name": "DDD Model Generator",
      "category": "architecture",
      "phase": "phase-1",
      "isRuntimeAware": true,
      "commands": ["smart-cli sdlc init ddd-model"],
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

### 5-2 Entrada del Catálogo de Runtime

```typescript
interface RuntimeCatalog {
  runtimes: Runtime[];
  monorepoOptions: MonorepoOption[];
  architecturePatterns: ArchitecturePattern[];
}
```

---

## Versión

| Versión | Fecha | Autor | Cambios |
|---------|------|-------|---------|
| 1.0.0 | 2026-06-06 | Equipo Evolith | Documentación inicial de modelos de datos |