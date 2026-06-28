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
| `NodeFileSystemProvider` | `IFileSystemProvider` (+ `IFileSystem`) | Adaptador completo de filesystem con `fs` de Node.js + `fs-extra` |
| `NestLoggerProvider` | `ILoggerProvider` | Factory de un `ILogger` respaldado por el `Logger` de NestJS |
| `ConsoleLoggerProvider` | `ILoggerProvider` | Factory de un `ILogger` plano sobre `console.*` (útil en scripts/tests) |
| `NoOpLoggerProvider` | `ILoggerProvider` | Factory de un `ILogger` silencioso (testing) |
| `YamlConfigParserProvider` | `IConfigParserProvider` | Factory de un `IConfigParser` para `.yaml` / `.yml` |
| `JsonConfigParserProvider` | `IConfigParserProvider` | Factory de un `IConfigParser` para `.json` |
| `DiskRulesetRepository` | `IRulesetRepository` | Carga rulesets de gobernanza desde disco vía `loadAllRulesets(corePath)` |
| `WebhookAdapter` | `IWebhookNotifier` | Entrega de webhooks HTTP con reintento — `notify(url, evidence)` |
| `MoscowPrioritizationService` | — | Lógica de priorización MoSCoW (`MoscowItem`, `MoscowAnalysis`, `MoscowPriority`) |

> Cada provider es una pequeña factory: `createFileSystem()`, `createLogger(context)`,
> `createConfigParser(format)`. Las clases de logger/config mostradas arriba
> implementan el port factory `*Provider` y devuelven el `ILogger` / `IConfigParser`
> interno.

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
| [`@evolith/core-domain`](https://www.npmjs.com/package/@evolith/core-domain) | Lógica de dominio y motor de reglas (define los ports que este paquete implementa) |
| **`@evolith/infra-providers`** | Adaptadores de infraestructura ← estás aquí |
| [`@evolith/core`](../core) | Barrel fachada sobre `core-domain` |
| [`@evolith/sdk`](../sdk-client) | Cliente tipado HTTP/MCP |

Consumido por **`apps/core-api`** y **`packages/mcp-server`**, que cablean estos
adaptadores en los ports de `core-domain` en tiempo de ejecución.

## Licencia

MIT — Copyright © 2026 BeyondNet Code. Ver [LICENSE](./LICENSE) para más detalles.
