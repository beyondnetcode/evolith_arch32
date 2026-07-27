# @beyondnet/evolith-agent-runtime

> **Navegación bilingüe:** [English version](./README.md)

Evolith Agent Runtime: una capa agéntica desacoplada que opera Evolith Core
mediante Puertos y Adaptadores (Arquitectura Hexagonal). Orquesta, recuerda,
valida y ejecuta capacidades del Core a través de puertos. **No** reemplaza a
`.harness` (el ejecutor oficial gobernado) y **no** depende de Hermes ni de
ningún framework de LLM (esos son adaptadores opcionales y reemplazables).

Documentación de arquitectura: [`reference/core/architecture/foundations`](../../../reference/core/architecture/foundations/README.es.md)
· Decisión: [core/ADR-0102](../../../reference/core/architecture/adrs/core/0102-evolith-agent-runtime.es.md).

<a name="egress-de-red-y-tratamiento-de-datos"></a>

#### Egress de red y tratamiento de datos

> **Este paquete es el único de Evolith que puede contactar a un tercero, y no lo hace por defecto.** Léelo antes de desplegarlo. Disclosure a nivel de repositorio: [SECURITY.md](../../../SECURITY.md).

| Elemento | Disclosure |
|---|---|
| Componente | `GeminiProvider` (`src/providers/GeminiProvider.ts`), export público de este paquete |
| Endpoint | un `POST` HTTPS a `https://generativelanguage.googleapis.com/v1beta/models/<modelo>:generateContent`, modelo por defecto `gemini-2.5-flash`. No se contacta ningún otro host. |
| Sub-encargado | **Google LLC (Gemini API)**. El contenido de los prompts enviados por este camino es tratado por Google bajo sus términos para esa API. |
| Estado por defecto | **DESACTIVADO.** Sin configurar, el provider no abre ningún socket: audita el intento rechazado y lanza `LlmEgressDisabledError`. Todos los demás adaptadores por defecto son in-memory o stub, así que el paquete no hace ninguna llamada de red de fábrica. |
| Opt-in | `EVOLITH_LLM_EGRESS=true` (o `1`), o un `new GeminiProvider({ enabled: true })` explícito. No hay activación implícita. |
| Gate humano | **Obligatorio por llamada.** Activar el flag no basta: cada llamada debe estar autorizada por `SupervisedAssistantClient` (que consulta un `IApprovalPort` y estampa su decisión en la invocación) o por un `IApprovalPort` inyectado en el provider (`new GeminiProvider({ approval })`). Sin ninguno de los dos ⇒ `LlmEgressUnsupervisedError` y ningún socket. La supervisión nunca se autoconcede, y una llamada nunca cuesta más de una aprobación humana. |
| Credencial | `EVOLITH_LLM_API_KEY`, con `GEMINI_API_KEY` como alternativa; viaja en la cabecera `x-goog-api-key` de la petición, nunca en la URL. Sin key, la llamada se rechaza antes de abrir un socket. |
| Límites | timeout de 30.000 ms con `AbortController`; 60.000 bytes / ~15.000 tokens estimados (`DEFAULT_EGRESS_BUDGET`), aplicados sobre los bytes exactos a enviar y fallando cerrado en vez de truncar. |
| Tratamiento de la respuesta | el envelope de Gemini y el JSON interno se validan contra esquemas declarados (`GEMINI_RESPONSE_SCHEMA`, `ASSISTANT_PROPOSAL_SCHEMA`) en lugar de castearse. |

**Qué se transmite.** Por `IAssistantTransport.invoke` (el seam gobernado): el
intent de la petición, el id opcional de tool, los parámetros de la petición, el
flag `dryRun` y el catálogo gobernado de skills (solo id y descripción). Por el
seam deprecado `generateStructuredJson`: el system prompt y el user prompt del
llamador tal cual. Ambos pasan antes por redacción de secretos con 8 clases de
patrones — claves privadas PEM, JWT, access key ids de AWS, API keys de Google,
PAT de GitHub, tokens de Slack, tokens `Bearer` y asignaciones genéricas de
`KEY`/`SECRET`/`TOKEN`/`PASSWORD`.

**Qué no se transmite.** El id de tenant, el id de producto, el id de iniciativa,
la referencia de workspace y la identidad del solicitante quedan excluidos del
payload por construcción, igual que el contenido del repositorio.

**Auditoría.** Cada intento, incluidos los rechazos, emite una línea JSON
`[evolith:llm-egress]` sin contenido (provider, endpoint, propósito, resultado,
bytes, tokens estimados, número de redacciones, estado HTTP, duración, id de
correlación y el gate que la autorizó) a través de `ILlmEgressAudit`; inyecta tu
propio sink para enrutarla. El contenido de prompts y respuestas nunca se loguea.
Los intentos rechazados —incluido un intento sin supervisión— también se auditan,
de modo que un intento de bypass queda visible.

**Cableado previsto (HITL).** Inyecta `GeminiProvider` como el
`IAssistantTransport` de `SupervisedAssistantClient`, que a su vez está apagado
por defecto y exige una aprobación humana explícita antes de alcanzar el
transport. No hay un segundo puerto: el método `generateStructuredJson` con forma
de `ILLMProvider` está `@deprecated` y solo se conserva para que los consumidores
congelados de 1.x sigan compilando, y pasa por el mismo núcleo gobernado **y** por
el mismo gate humano — sin un approval port inyectado se niega a enviar nada.

**Limitaciones honestas.** La redacción se basa en patrones, no es un control DLP.
Los controles anteriores están cubiertos por pruebas unitarias con un `fetch`
inyectado y no se han ejercitado contra el endpoint real de Google. El timeout y
el presupuesto se heredan del propio revisor de CI del repositorio y no están
ajustados para prompts interactivos grandes, que fallan cerrado. El tarball que
está hoy en npm es anterior a este endurecimiento: hasta que llegue la siguiente
release al registry, trata el `GeminiProvider` publicado como no gobernado y no lo
actives.

## Instalación

Este paquete forma parte de los workspaces del monorepo Evolith. Constrúyelo con
el resto del grafo (`npm run build` en la raíz) o de forma aislada:

```bash
npm --workspace @beyondnet/evolith-agent-runtime run build
npm --workspace @beyondnet/evolith-agent-runtime test
```

## Inicio rápido

```ts
import { createAgentRuntime, parseAgentRuntimeRequest } from '@beyondnet/evolith-agent-runtime';

const { runtime, deps } = createAgentRuntime(); // adaptadores stub/in-memory seguros
const result = await runtime.handle(parseAgentRuntimeRequest({
  intent: 'validate_discovery_gate', tool: 'validate-discovery-gate',
  tenant: 'acme', initiative: 'init_001', phase: 'discovery', gate: 'prd_readiness',
  parameters: { requiredArtifacts: ['prd'], presentArtifacts: ['prd'] },
}));
```

Un ejemplo ejecutable: `examples/validate-discovery-gate.mjs`.

## Arquitectura

El paquete es hexagonal: `domain` (contratos, puertos, tokens), `application`
(el servicio de orquestación + mapeadores puros), `adapters` (tecnología
concreta) y una factory `bootstrap`. Ningún framework ni LLM es dependencia del
dominio.

## Puertos

`IAgentRuntime`, `IHarnessPort`, `ICoreEvaluationPort`, `IPolicyValidationPort`,
`ITrackerTracePort`, `IMemoryPort`, `ISkillRegistryPort`, `ISchedulerPort`,
`ICommunicationGatewayPort`, `IApprovalPort`, `IAgentEnginePort`.

## Adaptadores

Los valores por defecto son in-memory/stub. Adaptadores reales:
`HarnessProcessAdapter` (lee `.harness/manifest.yaml`),
`OpaCliPolicyValidationAdapter`, `HttpTrackerTraceAdapter`,
`InProcessCoreEvaluationAdapter` / `HttpCoreEvaluationAdapter` (ejecutan el Core
stateless real, in-process o vía el Core API), `FileSchedulerAdapter` /
`FileMemoryAdapter` (durables, respaldados por archivo) y `HermesAgentAdapter`
(motor opcional).

## Versionado y estabilidad de contrato

Este paquete sigue **SemVer**. La superficie pública son los tres exports por
subpath declarados en `package.json` — `.` (principal), `./ports` y
`./adapters`. El guardián `public-surface.spec.ts` congela la superficie de
valores en runtime de `.` y `./adapters`, de modo que añadir, quitar o renombrar
un export público es un cambio deliberado y revisado.

- **`./ports`** es una superficie solo de tipos (interfaces de puerto + tipos de
  contrato canónicos). Se congela a nivel de tipos — el `tsc` del consumidor es
  el guardián.
- **`schemaVersion`** en `EvaluationResult` (y cualquier otro contrato
  versionado) es independiente de la versión del paquete: se sube **solo** ante
  un cambio incompatible de la forma de ese contrato, nunca por campos aditivos.
- **Deprecación:** un export público se marca `@deprecated` (nombrando su
  reemplazo) por al menos un minor antes de quitarlo; quitar o renombrar va en un
  **major**, los exports aditivos van en un **minor**.

## Scripts

```bash
npm run build                  # tsc -> dist/
npm test                       # jest
npm run example:discovery-gate # ejecuta el ejemplo extremo a extremo (tras build)
```
