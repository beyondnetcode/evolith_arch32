# Evolith CLI Architecture

## Overview

The Evolith CLI is a NestJS-based command-line application that provides governance, standards validation, and tool selection capabilities for satellite repositories. It follows Clean Architecture principles with clear separation of concerns.

## Architecture Layers

```
src/
├── commands/          # Presentation Layer (CLI commands)
├── application/       # Application Layer (Use Cases)
├── domain/            # Domain Layer (Entities, Services, Business Rules)
├── infrastructure/    # Infrastructure Layer (External integrations)
└── core/              # Core Layer (Shared utilities, DI, abstractions)
```

### Presentation Layer (`commands/`)

Commands are the entry points that handle user interaction. Each command:
- Extends `CommandRunner` from nest-commander
- Uses `@clack/prompts` for interactive input
- Delegates business logic to application use cases
- Formats output for human or JSON consumption

**Commands:**
- `adr/` - ADR management (create, list, get, update, matrix)
- `standards/` - Standards management (init, list, get, validate, export)
- `validate/` - Repository validation against Evolith standards
- `handoff/` - Tool handoff between phases
- `init/` - Repository initialization

### Application Layer (`application/use-cases/`)

Use cases orchestrate domain services to fulfill specific business operations:
- `ValidateSatelliteUseCase` - Validates satellite repository compliance
- `HandoffToolUseCase` - Manages tool handoff between phases

### Domain Layer (`domain/`)

Domain services encapsulate business logic:
- `ADRService` - ADR CRUD operations and matrix generation
- `StandardsService` - Standards registration and validation
- `PhaseService` - Phase and tool selection logic
- `ToolSelectionService` - Runtime-aware tool selection
- `PlatformDetectionService` - Runtime environment detection

### Infrastructure Layer (`infrastructure/`)

External integrations and platform-specific implementations:
- `cli/` - Command executor and prompt providers
- `catalog/` - JSON catalog loader for runtimes and tools
- `file-system/` - Node.js file system abstraction

### Core Layer (`core/`)

Shared utilities and framework:
- `abstractions/` - Interfaces for dependency injection
  - `interfaces/` - IFileSystem, ILogger, IConfigParser
  - `providers/` - Node.js specific implementations
- `di/` - DIContainer for service registration and resolution
- `errors/` - EvolithError base class and error codes
- `observability/` - Structured logging, timing, error reporting

## Dependency Injection

The `DIContainer` provides service location with singleton/transient scopes:

```typescript
const container = getContainer();
container.registerSingleton('IService', () => new Service());
container.registerTransient('IFactory', () => new Factory());

const service = container.resolve('IService');
```

## Catalogs

Runtime and tool selection is driven by JSON catalogs:

- `config/runtimes.json` - Supported runtimes (nodejs, typescript, dotnet, python)
- `config/tool-catalog.json` - Tools grouped by phase (0-5)
- `config/cli-commands-matrix.json` - Command support matrix per runtime

## Observability

AOP-based observability with:
- `StructuredLogger` - JSON structured logging with context
- `@Timed` decorator - Operation duration tracking
- `ErrorReporter` - Error aggregation with correlation IDs
- `CommandWatcher` - Command execution telemetry

## Commands Pattern

All commands follow the same pattern:

1. Parse options via `@Option` decorators
2. Show intro with `p.intro()`
3. Execute business logic via use cases
4. Format and display results
5. Show outro with status color (green/yellow/red)

## Build and Test

```bash
npm run build    # Compile TypeScript
npm run test     # Run Jest test suite
npm run lint     # ESLint validation
npm run typecheck # TypeScript type checking
```

## Extending the CLI

To add a new command:

1. Create `commands/<feature>/<feature>.command.ts`
2. Implement `CommandRunner` interface
3. Add use case in `application/use-cases/`
4. Register any new domain services
5. Add tests in `<feature>.command.spec.ts`
6. Update catalogs if adding new tools/runtimes