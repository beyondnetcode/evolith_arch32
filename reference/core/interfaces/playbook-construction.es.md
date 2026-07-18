# Playbook — Fase de Construction

> Navegación bilingüe: [English](./playbook-construction.md)

El recorrido por construction: convertir un diseño aprobado en un satélite en marcha
y gobernado, y luego demostrar que pasa el gate de construction. Cada paso funciona
idénticamente en **CLI**, **MCP** (para un agente) y **REST** (para el Tracker) —
el request/response exacto de cada operación está en el
[catálogo de construction](how-to-construction.md).

> **Modelo.** El Core es un motor de evaluación stateless: le envías contexto y
> devuelve un verdict ADR-0073. La CLI es tu herramienta local de referencia; un
> agente usa las tools MCP; el Tracker orquesta sobre REST. Las tools MCP mutativas
> (`scaffold`, `generate`, escrituras de filesystem) exigen `{ apply, approvalToken }`.

## 1 — Scaffold del workspace

Materializa el workspace Nx para tu fase de madurez (1 modular-monolith → 2
`distributed-modules` → 3 `microservices`).

- CLI: `evolith-cli scaffold --frontend react --orm prisma --phase 1`
- MCP: `evolith-scaffold` (mutativa — pasa `apply` + `approvalToken`; `dryRun:true` para previsualizar)

Empieza con `--dry-run` / `dryRun:true` para ver los comandos `nx`/`npm` exactos antes
de escribir nada. Ver [`scaffold-architecture`](how-to-construction.md#scaffold-architecture).

## 2 — Generar código de dominio a partir del diseño

Si tu diseño incluye un `classDiagram` DDD en Mermaid, genera el scaffold hexagonal
en lugar de escribir el boilerplate a mano.

- CLI: `evolith-cli sdlc generate domain --from ddd-model.md`
- MCP: `evolith-sdlc-generate`

Ver [`sdlc-generate`](how-to-construction.md#generate-code-from-ddd-models).

## 3 — Validar lo que construiste

Dos checks complementarios — corre ambos:

| Check | Sirve para | Operación |
| --- | --- | --- |
| **Validación de satélite** | Rulesets de gobernanza, topología, gates de fase | [`validate-satellite`](how-to-construction.md#validate-satellite-compliance) |
| **Validación componible** | Resolución multi-modo inteligente (SDLC + arquitectura + ADR + ad-hoc) | [`composable-validate`](how-to-construction.md#composable-validation) |
| **Drift de arquitectura** | Nivel de madurez declarado vs detectado | [`detect-drift`](how-to-construction.md#detect-architecture-drift) |

- CLI: `evolith-cli validate --satellite . --core <core>` · `evolith-cli validate --composable` · `evolith-cli drift --path .`
- Un verdict fallido sale con código **distinto de cero** — CI puede condicionar directamente sobre él.
- Si los rulesets del Core no pueden resolverse obtienes `RULESET_NOT_FOUND` (el mismo
  código en las tres superficies) — apunta `--core` / `corePath` a tu checkout del Core.

## 4 — Evaluar el contexto de construction

Corre la evaluación stateless completa (gates + compliance + arquitectura) sobre tu
contexto.

- CLI: `evolith-cli evaluate --workspace . --core <core> --phase construction`
- MCP: `evolith-evaluate` · REST: `POST /api/v1/evaluate`

El `success` del sobre significa *que la evaluación corrió*; el **verdict vive en
`data`** y el **exit code lo refleja**. Ver [`evaluate`](how-to-construction.md#evaluate-an-evaluationcontext).

## 5 — Confirmar el gate de construction

El punto de decisión: evaluar el gate de la fase construction y leer su evidencia.

- CLI: `evolith-cli gate evaluate --phase construction --satellite . --core <core>`
- MCP: `evolith-gate-evaluate` · REST: `POST /api/v1/gates/:gateId/evaluate`

Un `verdict: "failed"` con `violations` por artefacto te dice exactamente qué
evidencia falta (ver la respuesta real en el catálogo). Corrige los gaps y vuelve a
correr. Opcionalmente, mide la completitud de artefactos de fases posteriores con
[`phase-artifacts-evaluate`](how-to-construction.md#downstream-phase-artifact-completeness).

## Bucle típico

```
scaffold → generate → (edit code) → validate + drift → evaluate → gate
                              ↑___________________________________|
                                 iterate until the gate passes
```

Cuando `gate evaluate --phase construction` devuelve un verdict aprobado (exit 0),
haz el handoff a **QA** — ver el [playbook de QA](playbook-qa.md).
