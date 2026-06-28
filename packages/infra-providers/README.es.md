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
| `DiskRulesetRepository` | `IRulesetRepository` | Carga + valida rulesets de gobernanza desde disco vía `loadAllRulesets(corePath)`; **lanza** error ante cualquier ruleset malformado/inválido |
| `WebhookAdapter` | `IWebhookNotifier` | Entrega de webhooks HTTP vía `notify(url, evidence)` — guard SSRF de esquema, timeout por intento, sin reintento en 4xx, backoff exponencial, headers de contexto `x-evolith-*` |
| `MoscowPrioritizationService` | — | Servicio MoSCoW con estado, respaldado por filesystem: CRUD + reporte (7 métodos, persiste en `.evolith/moscow/<phase>.json`) |

> Los providers de filesystem, logger y config son pequeñas factories:
> `createFileSystem()`, `createLogger(context)`, `createConfigParser(format)`.
> Las clases de logger/config mostradas arriba implementan el port factory
> `*Provider` y devuelven el `ILogger` / `IConfigParser` interno. El argumento
> `format` de `createConfigParser` se acepta pero se ignora — la clase que
> instancias (`YamlConfigParserProvider` vs `JsonConfigParserProvider`) determina
> el formato.

### Detalle de los providers

- **`NodeFileSystemProvider`** — implementa tanto `IFileSystemProvider` (la
  factory `createFileSystem()`) como `IFileSystem`. Métodos: `exists`,
  `existsSync`, `readFile`, `readFileBuffer`, `readJson`, `writeFile`,
  `writeJson` (indentación de 2 espacios), `readdir` (devuelve `DirEntry[]` con
  `isDirectory()`/`isFile()`), `readdirNames`, `remove`, `ensureDir`,
  `ensureFile`, `stat`, `mkdir` (recursivo), `copy`. Las rutas relativas se
  resuelven contra `cwd` si se indica, o contra `process.cwd()`.
- **Loggers** — `NestLoggerProvider` envuelve el `Logger` de `@nestjs/common`
  (`info` mapea a `.log`). `ConsoleLoggerProvider` imprime
  `[timestamp] [LEVEL] [context] msg`. `NoOpLoggerProvider` es silencioso pero
  bufferiza las entradas; el logger devuelto también expone los helpers de test
  `getLogs()` y `clear()` (fuera del contrato `ILogger`).
- **`DiskRulesetRepository(fs: IFileSystem, logger: ILogger)`** — ver
  [Cómo funciona internamente](#cómo-funciona-internamente).
- **`WebhookAdapter`** — ver [Cómo funciona internamente](#cómo-funciona-internamente).
- **`MoscowPrioritizationService`** — ver [Priorización MoSCoW](#priorización-moscow).

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

`DiskRulesetRepository` tiene un constructor plano `(fs: IFileSystem, logger:
ILogger)` sin metadata `@Inject`, y `NodeFileSystemProvider`/`NestLoggerProvider`
son factories (el valor inyectable es el resultado de `createFileSystem()` /
`createLogger()`, no la clase provider). Cablealos con `useFactory` para que las
dependencias se resuelvan — esto refleja cómo los registran `apps/core-api` y
`packages/mcp-server`:

```ts
import { Module } from '@nestjs/common';
import type { IFileSystem, ILogger } from '@evolith/core-domain/domain/interfaces';
import {
  NodeFileSystemProvider,
  NestLoggerProvider,
  DiskRulesetRepository,
} from '@evolith/infra-providers';

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

### Entrega de webhooks

```ts
import { WebhookAdapter } from '@evolith/infra-providers';

// Todas las opciones son opcionales; se muestran los valores por defecto.
const notifier = new WebhookAdapter({
  timeoutMs: 10_000,        // timeout por intento (AbortController)
  maxAttempts: 3,           // 1 = sin reintento
  baseDelayMs: 250,         // base del backoff exponencial
  allowedProtocols: ['http:', 'https:'], // guard SSRF de esquema
  // fetchImpl / sleepImpl se pueden inyectar para tests
});

// `evidence` es un objeto GateEvidence de core-domain.
await notifier.notify('https://example.com/hooks/gate', evidence);
```

`notify` hace POST de `JSON.stringify(evidence)` con `Content-Type:
application/json`. Cuando hay un request context de core-domain activo
(`AsyncLocalStorage`), también emite los headers `x-correlation-id`,
`x-evolith-initiative`, `x-evolith-tenant` y `x-evolith-phase`. **Lanza** error
cuando el esquema de la URL no está permitido, ante una respuesta 4xx (sin
reintento), o tras agotar todos los intentos en errores 5xx/de red.

### Priorización MoSCoW

```ts
import { MoscowPrioritizationService } from '@evolith/infra-providers';

// Por defecto usa NodeFileSystemProvider; inyecta { fileSystem, logger } en tests.
const moscow = new MoscowPrioritizationService();

const analysis = await moscow.createAnalysis('/path/to/repo', 'discovery', [
  { description: 'Auth', priority: 'MUST', category: 'security', rationale: '…', phase: 'discovery' },
]);
// -> persiste en /path/to/repo/.evolith/moscow/discovery.json

const md = moscow.generateReport(analysis); // reporte Markdown
const { valid, issues } = moscow.validateAnalysis(analysis);
```

Métodos públicos:

| Método | Comportamiento |
|--------|----------------|
| `createAnalysis(repoPath, phase, items)` | Asigna ids `<PHASE>-001`, calcula los contadores del summary, escribe `.evolith/moscow/<phase>.json`, devuelve el `MoscowAnalysis` |
| `loadAnalysis(repoPath, phase)` | Lee el artefacto JSON, o `null` si no existe |
| `updateItem(repoPath, phase, itemId, updates)` | Modifica un item, recalcula el summary, persiste; `null` si falta el análisis/item |
| `removeItem(repoPath, phase, itemId)` | Elimina un item, recalcula summary + total, persiste; `null` si falta |
| `listAnalyses(repoPath)` | Lista `{ phase, path, updatedAt }` por cada `*.json` bajo `.evolith/moscow` |
| `validateAnalysis(analysis)` | Devuelve `{ valid, issues[] }` — marca sin items, sin `MUST`, `>60%` `MUST`, prioridades inválidas, ids duplicados |
| `generateReport(analysis)` | Renderiza un reporte Markdown (tabla resumen + items agrupados por prioridad + issues de validación) |

`MoscowPriority` es `MUST | SHOULD | COULD | WONT` (la cuarta prioridad es
`WONT`). `MoscowItem` es `{ id, description, priority, category, rationale,
phase }`; `MoscowAnalysis` lleva `{ repository, phase, items[], summary
{ must, should, could, wont, total }, createdAt, updatedAt }`.

## Cómo funciona internamente

### DiskRulesetRepository

`loadAllRulesets(corePath)`:

1. Resuelve `<corePath>/rulesets`. Si el directorio no existe, devuelve `[]`
   (sin error).
2. Recorre recursivamente los subdirectorios (profundidad máxima 4) recogiendo
   los archivos `*.rules.json`.
3. Para cada archivo excepto `phase-gates.rules.json` (excluido —
   `PhaseGateValidator` en `core-domain` gestiona los rulesets de gates SDLC),
   valida contra `rulesets/schema/ruleset-standard.schema.json` usando Ajv
   (`allErrors: true` + `ajv-formats`). El schema compilado se carga de forma
   perezosa y se cachea en el primer uso.
4. Normaliza cada entrada de `rules` / `principles` a un `NormalizedRule`
   (`{ id, severity, category, title, description, blocking, validationQuery?,
   sourceFile }`). La severidad se mapea a MoSCoW (`MUST` / `MUST NOT` /
   `SHOULD` / `COULD`), y `category` se deriva de un campo `category` explícito
   o de un mapa por prefijo de id.
5. Ante cualquier JSON malformado o fallo de validación de schema registra el
   error y **vuelve a lanzar** (`Ruleset validation error in <file>: …`). Los
   consumidores deben esperar que la carga falle de inmediato en lugar de
   omitir silenciosamente un archivo inválido.

### WebhookAdapter

`notify(url, evidence)` ejecuta un bucle de intentos acotado por `maxAttempts`:

- Valida primero el esquema de la URL (`assertSafeUrl`) — esquemas distintos de
  `http:`/`https:` (o URLs no parseables) lanzan error antes de cualquier
  llamada de red (guard SSRF).
- Cada intento crea un `AbortController` que aborta tras `timeoutMs`.
- `2xx` (`response.ok`) resuelve con éxito.
- `4xx` se trata como permanente y **nunca se reintenta** — lanza de inmediato.
- `5xx` y errores de red/timeout se registran y se reintentan con backoff
  exponencial (`baseDelayMs * 2^(attempt-1)`) hasta agotar `maxAttempts`, y
  entonces lanza `Webhook delivery failed after N attempt(s): …`.
- `fetchImpl`/`sleepImpl` son inyectables para tests deterministas; `fetch` se
  enlaza de forma tardía para que un mock global reasignado tras la construcción
  se respete.

## Prerequisitos

- Node.js 20+ (igual que el resto de la suite Evolith).
- `@nestjs/common` es una dependencia de runtime (incluida transitivamente); el
  `NestLoggerProvider` y los ejemplos de cableado NestJS asumen una app host
  NestJS.
- `DiskRulesetRepository` espera un directorio `<corePath>/rulesets` con el
  layout de la convención `ruleset-standard.schema.json` (provisto por
  `@evolith/core`).

## Resolución de problemas

| Síntoma | Causa / solución |
|---------|------------------|
| `Ruleset validation error in <file>` lanzado desde `loadAllRulesets` | Un archivo `*.rules.json` está malformado o falla el schema estándar. La carga falla de inmediato — corrige el archivo afectado; se reporta por ruta. |
| `loadAllRulesets` devuelve `[]` | `<corePath>/rulesets` no existe. Apunta `corePath` al directorio que contiene `rulesets/`. |
| `Webhook URL protocol not allowed` / `Invalid webhook URL` | La URL destino no es `http:`/`https:` (o no es parseable). Ajusta la URL o pasa `allowedProtocols`. |
| `Webhook delivery failed with status: 4xx` | Un 4xx es permanente y no se reintenta. Corrige la request/endpoint. |
| NestJS `Nest can't resolve dependencies of DiskRulesetRepository` | Cablealo con `useFactory` + `inject: ['IFileSystem', 'ILogger']` (ver [Con NestJS](#con-nestjs)), no con `useClass`. |

## Contribuir

Build, tests y cobertura:

```bash
npm run build      # tsc
npm test           # jest
npm run test:cov   # jest --coverage
```

Las contribuciones siguen las guías a nivel de repositorio en el
[`CONTRIBUTING.md` raíz](../../CONTRIBUTING.md).

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
