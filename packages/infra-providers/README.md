# @evolith/infra-providers

> Infrastructure adapters for the Evolith governance framework.

[![npm version](https://img.shields.io/npm/v/@evolith/infra-providers)](https://www.npmjs.com/package/@evolith/infra-providers)
[![license](https://img.shields.io/npm/l/@evolith/infra-providers)](./LICENSE)

## Overview

`@evolith/infra-providers` supplies the **concrete infrastructure adapters** that implement the ports defined in `@evolith/core-domain`. It handles filesystem I/O, logging, YAML/JSON config parsing, ruleset loading from disk, and webhook delivery.

These adapters are injected into the domain at runtime — the domain itself has zero infrastructure dependencies.

## Installation

```bash
npm install @evolith/infra-providers
```

## Providers

| Export | Implements | Description |
|--------|-----------|-------------|
| `NodeFileSystemProvider` | `IFileSystemProvider` (+ `IFileSystem`) | Full filesystem adapter using Node.js `fs` + `fs-extra` |
| `NestLoggerProvider` | `ILoggerProvider` | Factory for a NestJS `Logger`-backed `ILogger` |
| `ConsoleLoggerProvider` | `ILoggerProvider` | Factory for a plain `console.*` `ILogger` (useful in scripts/tests) |
| `NoOpLoggerProvider` | `ILoggerProvider` | Factory for a silent `ILogger` (testing) |
| `YamlConfigParserProvider` | `IConfigParserProvider` | Factory for a `.yaml` / `.yml` `IConfigParser` |
| `JsonConfigParserProvider` | `IConfigParserProvider` | Factory for a `.json` `IConfigParser` |
| `DiskRulesetRepository` | `IRulesetRepository` | Loads governance rulesets from disk via `loadAllRulesets(corePath)` |
| `WebhookAdapter` | `IWebhookNotifier` | HTTP webhook delivery with retry — `notify(url, evidence)` |
| `MoscowPrioritizationService` | — | MoSCoW prioritization logic (`MoscowItem`, `MoscowAnalysis`, `MoscowPriority`) |

> Each provider is a small factory: `createFileSystem()`, `createLogger(context)`,
> `createConfigParser(format)`. The logger/config classes shown above implement the
> `*Provider` factory port and hand back the inner `ILogger` / `IConfigParser`.

## Usage

```ts
import {
  NodeFileSystemProvider,
  YamlConfigParserProvider,
  ConsoleLoggerProvider,
  DiskRulesetRepository,
} from '@evolith/infra-providers';

// IFileSystem — concrete Node.js adapter
const fs = new NodeFileSystemProvider().createFileSystem();

// IConfigParser — createConfigParser takes the source format
const configParser = new YamlConfigParserProvider().createConfigParser('yaml');

// ILogger — createLogger takes a context label
const logger = new ConsoleLoggerProvider().createLogger('ruleset');

// DiskRulesetRepository(fs: IFileSystem, logger: ILogger)
const rulesetRepo = new DiskRulesetRepository(fs, logger);

const rules = await rulesetRepo.loadAllRulesets('/path/to/core');
```

### With NestJS

```ts
import { Module } from '@nestjs/common';
import { NodeFileSystemProvider, DiskRulesetRepository } from '@evolith/infra-providers';

@Module({
  providers: [
    { provide: 'IFileSystem', useClass: NodeFileSystemProvider },
    { provide: 'IRulesetRepository', useClass: DiskRulesetRepository },
  ],
  exports: ['IFileSystem', 'IRulesetRepository'],
})
export class InfraModule {}
```

## Part of the Evolith suite

| Package | Role |
|---------|------|
| [`@evolith/core-domain`](https://www.npmjs.com/package/@evolith/core-domain) | Domain logic and rule engine (defines the ports this package implements) |
| **`@evolith/infra-providers`** | Infrastructure adapters ← you are here |
| [`@evolith/core`](../core) | Facade barrel over `core-domain` |
| [`@evolith/sdk`](../sdk-client) | Typed HTTP/MCP client |

Consumed by **`apps/core-api`** and **`packages/mcp-server`**, which wire these
adapters into the `core-domain` ports at runtime.

## License

MIT — Copyright © 2026 BeyondNet Code. See [LICENSE](./LICENSE) for details.
