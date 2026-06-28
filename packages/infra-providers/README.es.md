# @evolith/infra-providers

> Adaptadores de infraestructura para el framework de gobernanza Evolith.

[![npm version](https://img.shields.io/npm/v/@evolith/infra-providers)](https://www.npmjs.com/package/@evolith/infra-providers)
[![license](https://img.shields.io/npm/l/@evolith/infra-providers)](./LICENSE)

## Resumen

`@evolith/infra-providers` aporta los **adaptadores concretos de infraestructura** que implementan los ports definidos en `@evolith/core-domain`. Se encarga de la E/S de filesystem, el logging, el parseo de configuración YAML/JSON, la carga de rulesets desde disco y la entrega de webhooks.

Estos adaptadores se inyectan en el dominio en tiempo de ejecución — el dominio en sí no tiene dependencias de infraestructura.

## Instalación

```bash
npm install @evolith/infra-providers
```

## Providers

| Export | Implementa | Descripción |
|--------|-----------|-------------|
| `NodeFileSystemProvider` | `IFileSystemProvider` | Adaptador completo de filesystem con `fs` de Node.js + `fs-extra` |
| `NestLoggerProvider` | `ILogger` | Wrapper del `LoggerService` de NestJS |
| `ConsoleLoggerProvider` | `ILogger` | Logger plano sobre `console.*` (útil en scripts/tests) |
| `NoOpLoggerProvider` | `ILogger` | Logger silencioso (testing) |
| `YamlConfigParserProvider` | `IConfigParser` | Parsea archivos `.yaml` / `.yml` |
| `JsonConfigParserProvider` | `IConfigParser` | Parsea archivos `.json` |
| `DiskRulesetRepository` | `IRulesetRepository` | Carga rulesets de gobernanza desde disco |
| `WebhookAdapter` | — | Entrega de webhooks HTTP con reintento |
| `MoscowPrioritizationService` | — | Lógica de priorización MoSCoW |

## Uso

```ts
import {
  NodeFileSystemProvider,
  YamlConfigParserProvider,
  ConsoleLoggerProvider,
  DiskRulesetRepository,
} from '@evolith/infra-providers';

// IFileSystem — adaptador concreto de Node.js
const fs = new NodeFileSystemProvider().createFileSystem();

// IConfigParser — createConfigParser recibe el formato de origen
const configParser = new YamlConfigParserProvider().createConfigParser('yaml');

// ILogger — createLogger recibe una etiqueta de contexto
const logger = new ConsoleLoggerProvider().createLogger('ruleset');

// DiskRulesetRepository(fs: IFileSystem, logger: ILogger)
const rulesetRepo = new DiskRulesetRepository(fs, logger);

const rules = await rulesetRepo.loadAllRulesets('/path/to/core');
```

### Con NestJS

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

## Parte de la suite Evolith

| Package | Rol |
|---------|------|
| [`@evolith/core-domain`](https://www.npmjs.com/package/@evolith/core-domain) | Lógica de dominio y motor de reglas |
| **`@evolith/infra-providers`** | Adaptadores de infraestructura ← estás aquí |

## Licencia

MIT — Copyright © 2026 BeyondNet Code. Ver [LICENSE](./LICENSE) para más detalles.
