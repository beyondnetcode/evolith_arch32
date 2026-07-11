# Evolith Agent Runtime

> **Navegación bilingüe:** [English version](./README.md)

El Evolith Agent Runtime es una **capa agéntica** desacoplada que opera Evolith
Core mediante **Puertos y Adaptadores** (`Ports & Adapters` / Arquitectura
Hexagonal). Orquesta, conversa, recuerda, automatiza y **ejecuta** capacidades
del Core a través de puertos, sin acoplarse a ningún framework de agente
concreto. Hermes Agent, Swarms (OpenAI), otro framework o una implementación propia son
simplemente adaptadores reemplazables.

Implementación: [`packages/agent-runtime`](../../../../src/packages/agent-runtime/README.es.md)
· Registro de decisión: [core/ADR-0102](../adrs/core/0102-evolith-agent-runtime.es.md).

## Qué es el Evolith Agent Runtime

Es la capa que se ubica entre quien llama (Evolith Tracker, chat, CLI, un cliente
externo) y la maquinaria gobernada de Evolith Core:

```text
Evolith Tracker / Chat / CLI / Cliente externo
        -> Evolith Agent Runtime
        -> Puertos
        -> Adaptadores
        -> .harness / Evolith Core / OPA / Tracker / Memoria / Scheduler / Hermes
```

**No** reemplaza a `.harness` (el ejecutor oficial, versionado y gobernado) y
**no** depende de Hermes ni Swarms. Los coordina detrás de puertos, 
permitiendo incluso un enrutado multimotor dinámico.

## Documentos

| Documento | Propósito |
|---|---|
| [Arquitectura](./architecture.es.md) | Capas, flujo de ejecución, diagramas, separación de responsabilidades |
| [Puertos y Adaptadores](./ports-and-adapters.es.md) | El catálogo de puertos y los adaptadores que los satisfacen |
| [Integración con .harness](./harness-integration.es.md) | Cómo el runtime descubre y ejecuta capacidades de `.harness` |
| [Casos prácticos](./practical-cases.es.md) | Ejemplos extremo a extremo de cada caso de uso obligatorio |
| [Extender](./extending.es.md) | Cómo agregar skills, adaptadores, usar el CLI/chat y enchufar Hermes |
| [Desplegar en VPS (Coolify)](../../../../product/infra/vps-coolify/agent-runtime-deploy.es.md) | Desplegar el servicio HTTP del runtime en `evolithruntime.beyondnet.cloud` |

## Inicio rápido

```ts
import { createAgentRuntime, parseAgentRuntimeRequest } from '@beyondnet/evolith-agent-runtime';

const { runtime } = createAgentRuntime(); // adaptadores in-memory/stub seguros

const result = await runtime.handle(
  parseAgentRuntimeRequest({
    tenant: 'tenant_demo',
    product: 'evolith_tracker',
    initiative: 'init_001',
    phase: 'discovery',
    gate: 'prd_readiness',
    requested_by: 'tracker_chat',
    intent: 'validate_discovery_gate',
    tool: 'validate-discovery-gate',
    parameters: { requiredArtifacts: ['prd'], presentArtifacts: ['prd'] },
  }),
);
// result.status === 'passed' | 'blocked' | 'warning' | 'error'
```

Hay un script ejecutable en
[`packages/agent-runtime/examples/validate-discovery-gate.mjs`](../../../../src/packages/agent-runtime/examples/validate-discovery-gate.mjs).

## Patrón de interacción de clientes

Los clientes usan un patrón de **comando/evento**:

- `POST /v1/agent/handle` envía un comando y espera un único
  `AgentRuntimeResult` final.
- `POST /v1/agent/stream` envía un comando y mantiene abierto un stream de
  eventos para progreso, resultados de tools, violaciones de política,
  solicitudes de aprobación y salida final.
- SSE es solo un transporte de eventos servidor-a-cliente. No transporta
  comandos del cliente de regreso al runtime; las acciones adicionales del
  cliente son requests HTTP o MCP explícitos correlacionados con la tarea activa.
- Los agentes deben llamar tools MCP o comandos del Agent Runtime directamente.
  No deben conectarse a Tracker para contexto gobernado, tools, estado tenant ni
  decisiones de aprobación.

## Garantías clave

- Toda integración externa pasa por un **puerto**; la tecnología concreta vive
  solo en **adaptadores**.
- `.harness` se trata como **proveedor de capacidades** oficial, nunca se
  reemplaza.
- Hermes es un **adaptador opcional** detrás de `IAgentEnginePort`; el dominio
  nunca lo importa.
- Las decisiones del agente pasan por contratos, validaciones, rulesets y OPA; el
  runtime no puede saltarse gates ni reescribir reglas.
- Tenant / producto / iniciativa llegan como **contexto** por petición, nunca
  embebidos en `.harness`.

## Estado: MVP frente a futuro

El MVP entrega el flujo completo con adaptadores stub/in-memory más adaptadores
reales de `.harness` (proceso), OPA (CLI) y Tracker por HTTP. El scheduling
durable, un adaptador de Core en proceso para producción y el cliente real de
Hermes son puntos de extensión documentados, aún no cableados. Consulta
[Arquitectura](./architecture.es.md) para la tabla de alcance completa.
