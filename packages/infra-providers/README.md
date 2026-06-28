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
| `NodeFileSystemProvider` | `IFileSystemProvider` | Full filesystem adapter using Node.js `fs` + `fs-extra` |
| `NestLoggerProvider` | `ILogger` | NestJS `LoggerService` wrapper |
| `ConsoleLoggerProvider` | `ILogger` | Plain `console.*` logger (useful in scripts/tests) |
| `NoOpLoggerProvider` | `ILogger` | Silent logger (testing) |
| `YamlConfigParserProvider` | `IConfigParser` | Parses `.yaml` / `.yml` files |
| `JsonConfigParserProvider` | `IConfigParser` | Parses `.json` files |
| `DiskRulesetRepository` | `IRulesetRepository` | Loads governance rulesets from disk |
| `WebhookAdapter` | — | HTTP webhook delivery with retry |
| `MoscowPrioritizationService` | — | MoSCoW prioritization logic |

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
| [`@evolith/core-domain`](https://www.npmjs.com/package/@evolith/core-domain) | Domain logic and rule engine |
| **`@evolith/infra-providers`** | Infrastructure adapters ← you are here |

## License

MIT — Copyright © 2026 BeyondNet Code. See [LICENSE](./LICENSE) for details.
