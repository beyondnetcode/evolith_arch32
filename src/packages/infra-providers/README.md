# @beyondnet/evolith-infra-providers

> Infrastructure adapters for the Evolith governance framework.

[![npm version](https://img.shields.io/npm/v/@beyondnet/evolith-infra-providers)](https://www.npmjs.com/package/@beyondnet/evolith-infra-providers)
[![license](https://img.shields.io/npm/l/@beyondnet/evolith-infra-providers)](./LICENSE)

## Overview

`@beyondnet/evolith-infra-providers` supplies the **concrete infrastructure adapters** that implement the ports defined in `@beyondnet/evolith-core-domain`. It handles filesystem I/O, logging, YAML/JSON config parsing, ruleset loading from disk, and webhook delivery.

These adapters are injected into the domain at runtime — the domain itself has zero infrastructure dependencies.

## Installation

```bash
npm install @beyondnet/evolith-infra-providers
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
| `DiskRulesetRepository` | `IRulesetRepository` | Loads + validates governance rulesets from disk via `loadAllRulesets(corePath)`; **throws** on any malformed/invalid ruleset |
| `WebhookAdapter` | `IWebhookNotifier` | HTTP webhook delivery via `notify(url, evidence)` — SSRF scheme guard, per-attempt timeout, 4xx-no-retry, exponential backoff, `x-evolith-*` context headers |
| `MoscowPrioritizationService` | — | Stateful, filesystem-backed MoSCoW CRUD + report service (7 methods, persists to `.evolith/moscow/<phase>.json`) |

> The filesystem, logger and config providers are small factories:
> `createFileSystem()`, `createLogger(context)`, `createConfigParser(format)`.
> The logger/config classes shown above implement the `*Provider` factory port
> and hand back the inner `ILogger` / `IConfigParser`. `createConfigParser`'s
> `format` argument is currently accepted but ignored — the class you instantiate
> (`YamlConfigParserProvider` vs `JsonConfigParserProvider`) determines the format.

### Provider details

- **`NodeFileSystemProvider`** — implements both `IFileSystemProvider` (the
  `createFileSystem()` factory) and `IFileSystem`. Methods: `exists`,
  `existsSync`, `readFile`, `readFileBuffer`, `readJson`, `writeFile`,
  `writeJson` (2-space indent), `readdir` (returns `DirEntry[]` with
  `isDirectory()`/`isFile()`), `readdirNames`, `remove`, `ensureDir`,
  `ensureFile`, `stat`, `mkdir` (recursive), `copy`. Relative paths resolve
  against `cwd` when supplied, otherwise against `process.cwd()`.
- **Loggers** — `NestLoggerProvider` wraps `@nestjs/common` `Logger` (`info` maps
  to `.log`). `ConsoleLoggerProvider` prints `[timestamp] [LEVEL] [context] msg`.
  `NoOpLoggerProvider` is silent but buffers entries; the returned logger also
  exposes `getLogs()` and `clear()` test helpers (beyond the `ILogger` contract).
- **`DiskRulesetRepository(fs: IFileSystem, logger: ILogger)`** — see
  [How it works internally](#how-it-works-internally).
- **`WebhookAdapter`** — see [How it works internally](#how-it-works-internally).
- **`MoscowPrioritizationService`** — see [MoSCoW prioritization](#moscow-prioritization).

## Usage

```ts
import {
  NodeFileSystemProvider,
  YamlConfigParserProvider,
  ConsoleLoggerProvider,
  DiskRulesetRepository,
} from '@beyondnet/evolith-infra-providers';

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

`DiskRulesetRepository` has a plain constructor `(fs: IFileSystem, logger: ILogger)`
with no `@Inject` metadata, and `NodeFileSystemProvider`/`NestLoggerProvider` are
factories (the injectable value is the result of `createFileSystem()` /
`createLogger()`, not the provider class). Wire them with `useFactory` so the
dependencies resolve — this mirrors how `apps/core-api` and `packages/mcp-server`
register them:

```ts
import { Module } from '@nestjs/common';
import type { IFileSystem, ILogger } from '@beyondnet/evolith-core-domain/domain/interfaces';
import {
  NodeFileSystemProvider,
  NestLoggerProvider,
  DiskRulesetRepository,
} from '@beyondnet/evolith-infra-providers';

@Module({
  providers: [
    {
      provide: 'IFileSystem',
      useFactory: () => new NodeFileSystemProvider().createFileSystem(),
    },
    {
      provide: 'ILogger',
      useFactory: () => new NestLoggerProvider().createLogger('Infra'),
    },
    {
      provide: 'IRulesetRepository',
      useFactory: (fs: IFileSystem, logger: ILogger) => new DiskRulesetRepository(fs, logger),
      inject: ['IFileSystem', 'ILogger'],
    },
  ],
  exports: ['IFileSystem', 'ILogger', 'IRulesetRepository'],
})
export class InfraModule {}
```

### Webhook delivery

```ts
import { WebhookAdapter } from '@beyondnet/evolith-infra-providers';

// All options are optional; defaults shown.
const notifier = new WebhookAdapter({
  timeoutMs: 10_000,        // per-attempt AbortController timeout
  maxAttempts: 3,           // 1 = no retry
  baseDelayMs: 250,         // exponential backoff base
  allowedProtocols: ['http:', 'https:'], // SSRF scheme guard
  // fetchImpl / sleepImpl can be injected for tests
});

// `evidence` is a core-domain GateEvidence object.
await notifier.notify('https://example.com/hooks/gate', evidence);
```

`notify` POSTs `JSON.stringify(evidence)` with `Content-Type: application/json`.
When a core-domain request context is active (`AsyncLocalStorage`), it also emits
`x-correlation-id`, `x-evolith-initiative`, `x-evolith-tenant` and
`x-evolith-phase` headers. It **throws** when the URL scheme is not allowed, on a
4xx response (no retry), or after exhausting all attempts on 5xx/network errors.

### MoSCoW prioritization

```ts
import { MoscowPrioritizationService } from '@beyondnet/evolith-infra-providers';

// Defaults to NodeFileSystemProvider; inject { fileSystem, logger } in tests.
const moscow = new MoscowPrioritizationService();

const analysis = await moscow.createAnalysis('/path/to/repo', 'discovery', [
  { description: 'Auth', priority: 'MUST', category: 'security', rationale: '…', phase: 'discovery' },
]);
// -> persisted to /path/to/repo/.evolith/moscow/discovery.json

const md = moscow.generateReport(analysis); // Markdown report
const { valid, issues } = moscow.validateAnalysis(analysis);
```

Public methods:

| Method | Behavior |
|--------|----------|
| `createAnalysis(repoPath, phase, items)` | Assigns ids `<PHASE>-001`, computes the summary counts, writes `.evolith/moscow/<phase>.json`, returns the `MoscowAnalysis` |
| `loadAnalysis(repoPath, phase)` | Reads the JSON artifact, or `null` if absent |
| `updateItem(repoPath, phase, itemId, updates)` | Patches an item, recomputes summary, persists; `null` if the analysis/item is missing |
| `removeItem(repoPath, phase, itemId)` | Removes an item, recomputes summary + total, persists; `null` if missing |
| `listAnalyses(repoPath)` | Lists `{ phase, path, updatedAt }` for every `*.json` under `.evolith/moscow` |
| `validateAnalysis(analysis)` | Returns `{ valid, issues[] }` — flags no items, no `MUST`, `>60%` `MUST`, invalid priorities, duplicate ids |
| `generateReport(analysis)` | Renders a Markdown report (summary table + items grouped by priority + any validation issues) |

`MoscowPriority` is `MUST | SHOULD | COULD | WONT` (the fourth priority is
`WONT`). `MoscowItem` is `{ id, description, priority, category, rationale,
phase }`; `MoscowAnalysis` carries `{ repository, phase, items[], summary
{ must, should, could, wont, total }, createdAt, updatedAt }`.

## Prerequisites

- Node.js 20+ (matches the rest of the Evolith suite).
- `@nestjs/common` is a runtime dependency (pulled in transitively); the
  `NestLoggerProvider` and NestJS wiring examples assume a NestJS host app.
- `DiskRulesetRepository` expects a `<corePath>/rulesets` directory laid out per
  the `ruleset-standard.schema.json` convention (provided by `@beyondnet/evolith-core`).

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `Ruleset validation error in <file>` thrown from `loadAllRulesets` | A `*.rules.json` file is malformed or fails the standard schema. Loading fails fast — fix the offending file; it is reported by path. |
| `loadAllRulesets` returns `[]` | `<corePath>/rulesets` does not exist. Point `corePath` at the directory that contains `rulesets/`. |
| `Webhook URL protocol not allowed` / `Invalid webhook URL` | The target URL is not `http:`/`https:` (or is unparseable). Adjust the URL or pass `allowedProtocols`. |
| `Webhook delivery failed with status: 4xx` | A 4xx is permanent and not retried. Fix the request/endpoint. |
| NestJS `Nest can't resolve dependencies of DiskRulesetRepository` | Wire it with `useFactory` + `inject: ['IFileSystem', 'ILogger']` (see [With NestJS](#with-nestjs)), not `useClass`. |

## Contributing

Build, test and coverage:

```bash
npm run build      # tsc
npm test           # jest
npm run test:cov   # jest --coverage
```

Contributions follow the repo-wide guidelines in the
[root `CONTRIBUTING.md`](../../../CONTRIBUTING.md).

## How it works internally

### DiskRulesetRepository

`loadAllRulesets(corePath)`:

1. Resolves `<corePath>/rulesets`. If the directory does not exist, returns `[]`
   (no error).
2. Recursively walks subdirectories (max depth 4) collecting `*.rules.json` files.
3. For each file except `phase-gates.rules.json` (excluded — `PhaseGateValidator`
   in `core-domain` owns SDLC gate rulesets), validates against
   `rulesets/schema/ruleset-standard.schema.json` using Ajv (`allErrors: true` +
   `ajv-formats`). The compiled schema is lazily loaded and cached on first use.
4. Normalizes each `rules` / `principles` entry into a `NormalizedRule`
   (`{ id, severity, category, title, description, blocking, validationQuery?,
   sourceFile }`). Severity is mapped to MoSCoW (`MUST` / `MUST NOT` / `SHOULD` /
   `COULD`), and `category` is derived from an explicit `category` field or an
   id-prefix map.
5. On any malformed JSON or schema-validation failure it logs the error and
   **re-throws** (`Ruleset validation error in <file>: …`). Callers must expect
   loading to fail fast rather than silently skipping a bad file.

### WebhookAdapter

`notify(url, evidence)` runs an attempt loop bounded by `maxAttempts`:

- Validates the URL scheme first (`assertSafeUrl`) — non-`http:`/`https:` schemes
  (or unparseable URLs) throw before any network call (SSRF guard).
- Each attempt creates an `AbortController` aborted after `timeoutMs`.
- `2xx` (`response.ok`) resolves successfully.
- `4xx` is treated as permanent and **never retried** — it throws immediately.
- `5xx` and network/timeout errors are recorded and retried with exponential
  backoff (`baseDelayMs * 2^(attempt-1)`) until `maxAttempts` is exhausted, then
  it throws `Webhook delivery failed after N attempt(s): …`.
- `fetchImpl`/`sleepImpl` are injectable for deterministic tests; `fetch` is
  late-bound so a global mock reassigned after construction is honored.

## Part of the Evolith suite

| Package | Role |
|---------|------|
| [`@beyondnet/evolith-core-domain`](https://www.npmjs.com/package/@beyondnet/evolith-core-domain) | Domain logic and rule engine (defines the ports this package implements) |
| **`@beyondnet/evolith-infra-providers`** | Infrastructure adapters ← you are here |
| [`@beyondnet/evolith-core`](../core) | Facade barrel over `core-domain` |
| [`@beyondnet/evolith-sdk`](../sdk-client) | Typed HTTP/MCP client |

Consumed by **`apps/core-api`** and **`packages/mcp-server`**, which wire these
adapters into the `core-domain` ports at runtime.

## License

MIT — Copyright © 2026 BeyondNet Code. See [LICENSE](./LICENSE) for details.
