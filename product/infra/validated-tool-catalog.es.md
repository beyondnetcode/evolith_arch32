# Catálogo de Herramientas Validadas de Evolith

> **Navegación bilingüe:** [English version](./validated-tool-catalog.md)

> **Tipo de Documento:** Estándar Corporativo
> **Estado:** Activo
> **Fecha:** 2026-06-06
> **Propósito:** Definir las herramientas validadas por fase, patrón de arquitectura y runtime. El CLI usa este catálogo para la selección interactiva de herramientas.

---

## 1. Criterios de Validación de Herramientas

Una herramienta es "validada" por Evolith Core cuando:
- Tiene aprobación por ADR o una entrada explícita en un estándar corporativo
- Tiene un rango de versiones definido (mín/máx)
- Tiene capacidad de ejecución por CLI (integrada o scriptable)
- Tiene criterios de salida documentados si la herramienta cambia

Las herramientas que NO están en este catálogo requieren aprobación del Architecture Board y un ADR antes de usarse.

---

## 2. Fase 1 — Herramientas de Estructura

### 2.1 Orquestación de Monorepo

| Herramienta | Versión | Categoría | Acción CLI | Notas |
|------|---------|----------|------------|-------|
| **Nx** | 18.x+ | Monorepo | `evolith-cli init --monorepo=nx` | Nativo de NestJS, tags estrictos de librerías |
| **NPM Workspaces** | 10.x+ | Monorepo | `evolith-cli init --monorepo=npm` | Más simple, sin fronteras estrictas |
| **Ambos (Nx + NPM)** | 18.x+ / 10.x+ | Monorepo | `evolith-cli init --monorepo=both` | Nx para CI, NPM para desarrollo local |

**Prompt de Selección:**
```
Which monorepo orchestrator?
  [nx]      Nx — Strict library isolation, affected graph, CI optimization
  [npm]     NPM Workspaces — Simpler, flat structure
  [both]    Both — Nx for CI/CD, NPM for local development
```

### 2.2 Patrón de Arquitectura

| Patrón | Herramientas | Acción CLI | Notas |
|---------|-------|------------|-------|
| **Clean Architecture** | NestJS + Capas | `evolith-cli init --arch=clean` | Controller → Service → Repository |
| **Hexagonal (Puertos y Adaptadores)** | NestJS + Ports | `evolith-cli init --arch=hexagonal` | Ports de dominio, adapters de infraestructura |
| **DDD (Domain-Driven Design)** | NestJS + patrones DDD | `evolith-cli init --arch=ddd` | Agregados, Objetos de Valor, Domain Events |
| **Clean + Hexagonal** | Combinado | `evolith-cli init --arch=clean-hex` | Estructura limpia + ports explícitos |
| **Hexagonal + DDD** | Combinado | `evolith-cli init --arch=hex-ddd` | Ports + modelo de dominio rico |
| **Clean + Hex + DDD** | Stack Completo | `evolith-cli init --arch=full` | Todos los patrones combinados |

**Prompt de Selección:**
```
Select architecture pattern:
  [clean]       Clean Architecture — Simple layer separation
  [hexagonal]   Hexagonal — Ports and Adapters isolation
  [ddd]         DDD — Rich domain model with bounded contexts
  [clean-hex]   Clean + Hexagonal — Layered with port isolation
  [hex-ddd]     Hexagonal + DDD — Ports with rich domain
  [full]        Full Stack — Clean + Hexagonal + DDD
```

### 2.3 Selección de Runtime

| Runtime | Versión | Flag CLI | Notas |
|---------|---------|----------|-------|
| **Node.js / TypeScript** | 20.x LTS | `evolith-cli init --runtime=nodejs` | NestJS, TypeORM, Jest |
| **.NET / C#** | .NET 8+ | `evolith-cli init --runtime=dotnet` | EF Core, xUnit, MediatR |
| **Android / Kotlin** | Última | `evolith-cli init --runtime=android` | Jetpack Compose, Hilt |

---

## 3. Fase 2 — Herramientas de Gobernanza

### 3.1 ACL (Anti-Corruption Layer)

| Herramienta | Propósito | Acción CLI |
|------|---------|------------|
| **ACL Schema Validator** | Validar datos externos contra schemas Core | `evolith-cli validate --ruleset=acl` |
| **Transformation Logger** | Rastrear todas las transformaciones de datos externos | Auto-instrumentado |
| **External System Adapters** | Conectores Jira, Linear, GitHub, Confluence | Por integración |

### 3.2 Documentación

| Herramienta | Propósito | Acción CLI |
|------|---------|------------|
| **Bilingual Docs** | Documentación EN + ES | `evolith-cli docs --bilingual` |
| **ADR Registry** | Registros de Decisión Arquitectónica | `evolith-cli docs --adr` |
| **Harness Scripts** | Hooks de validación pre-commit | `evolith-cli init --hooks` |

---

## 4. Fase 3 — Herramientas de Arquitectura

### 4.1 Mapeo de Bounded Contexts

| Herramienta | Propósito | Acción CLI |
|------|---------|------------|
| **Context Mapper** | Definir bounded contexts | `evolith-cli sdlc handoff --phase=3 --context-map` |
| **Contract Registry** | Documentar contratos inter-contexto | Auto-generado |
| **Event Schema Registry** | Definiciones de eventos de dominio | `evolith-cli docs --events` |

### 4.2 Protocolo de API

| Protocolo | Caso de Uso | Acción CLI |
|----------|----------|------------|
| **REST (OpenAPI v3)** | APIs externas | `evolith-cli init --api=rest` |
| **gRPC (Protobuf)** | Servicios internos | `evolith-cli init --api=grpc` |
| **Ambos** | REST externo, gRPC interno | `evolith-cli init --api=hybrid` |

### 4.3 Enforcement de Arquitectura (Analizadores de Frontera)

Analizadores estáticos que aplican fronteras de módulo/capa y ciclos por runtime. El Core enruta las reglas con `enforce.engine === 'enforcer'` hacia estos vía el `EnforcerEvaluator` (GT-514); el espejo legible por máquina es `src/rulesets/enforcement/enforcer-catalog.json`. El pinning exacto de versiones se rastrea en GT-519. La columna **Adaptador** refleja el estado del adaptador Core de cada herramienta (`src/packages/core-domain/.../enforcement/adapters/`); una entrada del catálogo puede existir antes que su adaptador.

| Herramienta | Versión | Runtime | Propósito | Adaptador | ADR |
|------|---------|---------|---------|---------|-----|
| **dependency-cruiser** | 16.x | node | Análisis de fronteras de módulo/capa + ciclos (TS/JS) | Implementado (GT-515, en progreso) | ADR-0002 |
| **NetArchTest** | 1.3.x | dotnet | Reglas de capa y dirección de dependencias (.NET) | Implementado (GT-524, en progreso; ejecución real bloqueada por GT-512) | ADR-0002 |
| **Deptrac** | 2.x | php | Enforcement de fronteras de capa (PHP) | Catalogado, adaptador pendiente (GT-521) | ADR-0002 |
| **import-linter** | 2.x | python | Contratos de import, basado en grimp (Python) | Catalogado, adaptador pendiente (GT-521) | ADR-0002 |
| **Conftest** | 0.56.x | iac | Chequeos de política OPA/Rego para manifests IaC/config | Catalogado, adaptador pendiente (GT-521) | ADR-0002 |

---

## 5. Fase 4 — Herramientas de Producción

### 5.1 CI/CD

| Herramienta | Versión | Acción CLI |
|------|---------|------------|
| **GitHub Actions** | CI primario | `evolith-cli init --ci=github` |
| **GitLab CI** | CI alternativo | `evolith-cli init --ci=gitlab` |
| **Azure DevOps** | CI empresarial | `evolith-cli init --ci=azure` |

### 5.2 Contenedores y Orquestación

| Herramienta | Versión | Acción CLI |
|------|---------|------------|
| **Docker** | Containerización | `evolith-cli init --container=docker` |
| **Docker Compose** | Orquestación local (Fases 1-2) | Por defecto |
| **Kubernetes (K8s)** | Orquestación de producción (Fase 3+) | `evolith-cli init --k8s` |
| **Helm** | Gestión de charts | `evolith-cli init --helm` |

### 5.3 Observabilidad

| Herramienta | Propósito | Acción CLI |
|------|---------|------------|
| **OpenTelemetry** | Trazas/Métricas | `evolith-cli init --otel` |
| **Prometheus** | Recolección de métricas | Auto-configurado |
| **Jaeger/Tempo** | Trazado distribuido | `evolith-cli init --tracing=jaeger` |
| **Loki** | Agregación de logs | `evolith-cli init --logging=loki` |

### 5.4 Seguridad

| Herramienta | Propósito | Acción CLI |
|------|---------|------------|
| **OpenBao** | Gestión de secretos (fork de Vault) | `evolith-cli init --secrets=openbao` |
| **Trivy** | Escaneo de vulnerabilidades | `evolith-cli init --security=trivy` |
| **Snyk** | Escaneo de dependencias | `evolith-cli init --security=snyk` |

---

## 6. Conjuntos de Herramientas por Runtime

### 6.1 Node.js / TypeScript

| Categoría | Herramienta | Versión | Flag CLI |
|----------|------|---------|----------|
| Framework | NestJS | 10.x+ | `--runtime=nodejs` |
| ORM | TypeORM | Última | `--orm=typeorm` |
| ORM | Drizzle | Última | `--orm=drizzle` |
| Validación | class-validator | Última | Por defecto |
| Testing | Jest | 29.x | `--test=jest` |
| Linting | ESLint + Prettier | 8.x / 3.x | Por defecto |
| Compilador | @swc/core | Última | `--fast-build` |

### 6.2 .NET / C#

| Categoría | Herramienta | Versión | Flag CLI |
|----------|------|---------|----------|
| Framework | ASP.NET Core | .NET 8+ | `--runtime=dotnet` |
| ORM | Entity Framework Core | 8.x | `--orm=efcore` |
| CQRS | MediatR | Última | `--cqrs=mediatr` |
| Testing | xUnit | Última | `--test=xunit` |
| Logging | Serilog | Última | `--logging=serilog` |

### 6.3 Android / Kotlin

| Categoría | Herramienta | Versión | Flag CLI |
|----------|------|---------|----------|
| Framework | Jetpack Compose | Última | `--runtime=android` |
| DI | Hilt | Última | `--di=hilt` |
| Base de datos | Room | Última | `--db=room` |
| Networking | Retrofit | Última | `--net=retrofit` |

---

## 7. Flujo de Selección de Herramientas

Al ejecutar `evolith-cli init` o `evolith-cli sdlc handoff`, el CLI presenta la selección de herramientas según la fase actual:

```
┌─────────────────────────────────────────────────────────────┐
│  Evolith Tool Selection                                     │
├─────────────────────────────────────────────────────────────┤
│  Phase: 1 - Structure                                       │
│                                                             │
│  1. Monorepo Orchestrator                                   │
│     > [Nx] [NPM Workspaces] [Both]                         │
│                                                             │
│  2. Architecture Pattern                                    │
│     > [Clean] [Hexagonal] [DDD] [Clean+Hex] [Hex+DDD] [Full]│
│                                                             │
│  3. Database                                                │
│     > [PostgreSQL] [MongoDB] [SQL Server] [Both]           │
│                                                             │
│  4. API Protocol                                            │
│     > [REST] [gRPC] [Both (REST external, gRPC internal)]  │
│                                                             │
│  [Continue] [Back] [Show Summary] [Help]                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Estructura del Catálogo de Herramientas del CLI

```typescript
interface EvolithTool {
  id: string;
  name: string;
  version: string;
  phase: 'phase-0' | 'phase-1' | 'phase-2' | 'phase-3' | 'phase-4';
  category: 'monorepo' | 'architecture' | 'database' | 'api' | 'ci' | 'container' | 'observability' | 'security';
  runtime?: 'nodejs' | 'dotnet' | 'android' | 'agnostic';
  validated: boolean;
  cliCommand?: string;
  description: string;
  alternatives?: string[];
  adrReference?: string;
}
```

---

## 9. Agregar Nuevas Herramientas

Para agregar una herramienta al catálogo:

1. Crear un ADR que referencie la herramienta
2. Registrar el gap/feature en `reference/core/control-center/gaps/gap-tracking.md` (tablero único de seguimiento)
3. Implementar la integración CLI si es ejecutable
4. Actualizar este catálogo con las restricciones de versión

---

## 10. Herramientas Rechazadas

Herramientas explícitamente rechazadas por Evolith Core (requieren ADR para revertir):

| Herramienta | Categoría | Razón |
|------|----------|--------|
| Bun | Runtime | No auditado, compatibilidad del ecosistema no probada |
| Deno | Runtime | Preparación para producción no confirmada |
| Prisma | ORM (Node.js) | Problemas de rendimiento en escenarios de alta carga (requiere ADR) |
| Sequelize | ORM | No recomendado, usar TypeORM/Drizzle |
| Mocha | Testing | Usar Jest por consistencia |
| Fastify | Web Host | Salvo ADR aprobado, usar NestJS/Express |

---

## Referencias

- [Stack Tecnológico Autoritativo - Agnóstico](../../reference/core/architecture/blueprints/authoritative-tech-stack-agnostic.es.md)
- [Stack Tecnológico Autoritativo - Node.js](../../reference/core/architecture/blueprints/authoritative-tech-stack-nodejs.es.md)
- [Stack Tecnológico Autoritativo - .NET](../../reference/core/architecture/blueprints/authoritative-tech-stack-dotnet.es.md)
- [Ruleset de Phase Gates](../../src/rulesets/sdlc/phase-gates.rules.json)
- [Tablero de Gaps](../../reference/core/control-center/gaps/gap-tracking.es.md)
