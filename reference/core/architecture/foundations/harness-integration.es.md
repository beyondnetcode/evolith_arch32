# Evolith Agent Runtime — Integración con .harness

> **Navegación bilingüe:** [English version](./harness-integration.md)

El runtime trata a `.harness` como **proveedor de capacidades** oficial mediante
`IHarnessPort`. Descubre lo que `.harness` declara y lo ejecuta; nunca lo
reimplementa ni lo reemplaza (regla de diseño #4).

## Por qué .harness sigue siendo el ejecutor

`.harness` es el mecanismo versionado, auditable y gobernado que realmente
ejecuta scripts, playbooks, validators, audits y skills. El runtime añade
decisión, gobernanza y trazabilidad a su alrededor. La frontera la impone el
puerto: el runtime solo conoce `IHarnessPort`, y el `HarnessProcessAdapter`
concreto es el único código que sabe cómo lanzar scripts de `.harness`.

## La convención del manifest

Un archivo nuevo, [`.harness/manifest.yaml`](../../../../.harness/manifest.yaml),
hace descubrible a `.harness`. Es la declaración única y versionada de cada
capacidad que el runtime puede invocar:

```yaml
version: 1
capabilities:
  - name: sdlc-phase-gate-validator
    type: validator
    description: Validate a SDLC phase/gate by checking required vs presented artifacts.
    entry: .harness/playbooks/sdlc-phase-gate-validator.mjs
    runner: node
    inputs:
      gate: { type: string }
      requiredArtifacts: { type: array, items: { type: string } }
      presentArtifacts: { type: array, items: { type: string } }
    outputs:
      status: { type: string }
      missing_artifacts: { type: array }
    permissions: [read:repo, run:validator]
    requiresApproval: false
    emitsTrace: true
    requiresPolicy: true
    policyRef: evolith.gates.discovery
```

## Campos de declaración de una capacidad

Cada capacidad declara su contrato y su postura de gobernanza:

| Campo | Significado |
|---|---|
| `name` | Id único de la capacidad (referenciado por una skill) |
| `type` | `playbook` / `validator` / `audit` / `script` / `skill` / `adapter` |
| `description` | Resumen humano |
| `entry` | Ruta relativa al repo que ejecuta el runner |
| `runner` | `node` / `opa` / `shell` — cómo se lanza el entry |
| `inputs` | Argumentos declarados (esquema laxo) |
| `outputs` | Salidas declaradas que emite la capacidad |
| `permissions` | Scopes requeridos para ejecutar |
| `requiresApproval` | Si un humano debe aprobar primero (HITL) |
| `emitsTrace` | Si la ejecución publica un evento de traza al Tracker |
| `requiresPolicy` | Si el resultado debe pasar validación de OPA |
| `policyRef` | Paquete OPA opcional contra el que evaluar |

## Descubrimiento y ejecución

`HarnessProcessAdapter` lee el manifest, expone `discover()`/`describe()` y
`execute()` lanza el entry:

- `runner: node` ejecuta `node <entry> --args <json>`,
- `runner: opa` ejecuta el binario incluido `.harness/bin/opa`,
- `runner: shell` ejecuta el entry mediante `sh -c`.

La salida estándar se captura; si es JSON, se vuelve el `HarnessExecutionResult.data`
estructurado. Cuando un script imprime texto humano, el resultado recurre a la
señal de salida del proceso, que sigue siendo un resultado gobernado válido.

## Paso de contexto (tenant/producto/iniciativa)

Tenant/producto/iniciativa se pasan **por ejecución** como una carga de entorno
(`AGENT_RUNTIME_CONTEXT`), nunca embebidos en `.harness` (regla de diseño #8). Por
eso la misma capacidad sirve a cada tenant y `.harness` permanece libre de estado
de tenant.

## Mapeo de skills a capacidades de harness

Un `SkillDescriptor` (en el SkillRegistry) mapea un intent a una capacidad. Para
una skill respaldada por harness, `harnessCapability` nombra la entrada del
manifest; para una skill compuesta, `.harness` produce los hechos y el Core los
evalúa. Consulta el catálogo sembrado en
[`default-skills.ts`](../../../../src/packages/agent-runtime/src/adapters/skills/default-skills.ts)
y [Extender](./extending.es.md) para agregar las tuyas.
