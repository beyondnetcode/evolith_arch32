> **Navegación bilingüe:** [View English version](./0111-quality-signal-provider-port.md)

# ADR-0111: Puerto de Proveedores de Señales de Calidad — Evidencia Externa vía Adaptadores

> **Firma del agente:** Agente Arquitecto (Winston)

## Estado
Propuesto (2026-07-13 — Consejo de Arquitectura)

## Fecha
2026-07-13

## Contexto y Problema

Evolith Core es un Motor de Evaluación stateless y determinista: recibe un
`EvaluationContext` y devuelve un `EvaluationResult`, gobernado por contratos,
rulesets y OPA ([ADR-0101](./0101-core-stateless-evaluation-engine.md)). La suite
se posiciona como una capa de *gobernanza de arquitectura para la era de la IA*
que conecta las decisiones arquitectónicas con la calidad técnica, el testing, el
performance, la documentación y la ejecución a lo largo del SDLC.

Cumplir ese posicionamiento exige **evidencia**: los criterios que el Core deriva
de un diseño/blueprint ([ADR-0104](./0104-topology-driven-advisory-design-governance.md))
valen lo que valgan las señales que confirman o refutan la conformidad en build y
runtime. Ya existe un ecosistema rico de herramientas externas que producen esas
señales — auditores de runtime (p. ej. Lighthouse), plataformas de testing
autónomo (p. ej. TestSprite), auditores de contenido/discoverability
multi-agente (p. ej. Claude SEO) y metodologías de revisión estructural de código
(p. ej. la rúbrica de revisión "thermo-nuclear").

El riesgo es obvio y recurrente: si el Core — o cada superficie (CLI, Portal,
agent-runtime) — integra estas herramientas directamente, acoplamos un motor
determinista a tecnología volátil de terceros, metemos red/side-effects en un
evaluador stateless, filtramos código a nubes externas y hacemos crecer N×M
integraciones a medida sin normalización, sin provenance y sin política uniforme.

El problema: **¿cómo enriquecen las herramientas externas de calidad/evidencia la
evaluación del Evolith Core sin convertirse jamás en dependencia del Core, y
dejando que cada tenant elija cuáles están activas?**

## Objetivo y Alcance

Definir la costura por la que cualquier productor externo de calidad/evidencia
alimenta al Core. En alcance: (1) un único puerto de salida
`IQualitySignalProvider`, (2) un modelo canónico `Evidence` con provenance
obligatoria, (3) la regla de que el Core consume `Evidence` **inline en su
contexto** y nunca ejecuta proveedores, y (4) un **registro** de proveedores
declarativo y por tenant que selecciona qué adaptadores están activos.

Fuera de alcance: las implementaciones concretas de los adaptadores y sus
elecciones específicas de proveedor (cada una se delega a un ADR de Plataforma
acompañante, p. ej. un ADR Node.js para el adaptador Lighthouse), y los productos
de scorecard/gate que consumen la evidencia resultante (se registran aparte).

## Opciones Consideradas

### Opción A: El Core llama a las herramientas directamente

Que `core-domain` invoque Lighthouse/TestSprite/etc. durante la evaluación.
Rechazada: rompe la statelessness ([ADR-0101](./0101-core-stateless-evaluation-engine.md)),
mete I/O de red y side-effects no deterministas dentro del motor determinista, y
acopla el Core a herramientas concretas.

### Opción B: Una integración a medida por herramienta en cada superficie

Cada superficie (CLI, Portal, agent-runtime) cablea cada herramienta ad hoc.
Rechazada: drift N×M, sin normalización compartida, provenance inconsistente (o
ausente), y sin forma de evaluar las señales uniformemente contra política.
Además reimplementa el trabajo de adaptador/normalización ya establecido para los
connectors Port/Cortex y Jira.

### Opción C: Puerto único de proveedor + ACL canónica de Evidence + registro por tenant (elegida)

Los productores externos implementan un puerto de salida y emiten un objeto
`Evidence` normalizado (una capa anticorrupción). La capa de orquestación ejecuta
los proveedores *activos*, recolecta `Evidence[]` y la pasa inline al Core. Un
registro por tenant declara qué proveedores están activos. Elegida: mantiene el
Core puro, hace cada proveedor enchufable, elegible por tenant y desechable, y
reutiliza el patrón connector-adaptador que la suite ya practica.

## Decisión y Fundamentos

### 1. Un puerto de salida, propiedad de la orquestación — no del Core

`IQualitySignalProvider` vive en la capa de orquestación/aplicación
(agent-runtime y las superficies del SDLC), **no** en `core-domain`. Todo el I/O
del proveedor — Chrome headless, llamadas a la nube, auditorías LLM — ocurre
detrás de este puerto.

```ts
// capa de orquestación (NO core-domain)
interface IQualitySignalProvider {
  readonly id: string;                 // "lighthouse" | "testsprite" | ...
  supports(ctx: CollectionContext): boolean;
  collect(target: CollectionTarget): Promise<Evidence>;
}
```

### 2. El Core solo conoce el modelo canónico `Evidence`

`Evidence` es la única superficie que ve el Core. Entra en el `EvaluationContext`
**inline**, exactamente como hoy entran los archivos fuente vía el precedente de
repository-access / `OverlayFileSystem` ([ADR-0080](./0080-remote-repository-reference-contract.md),
[ADR-0101](./0101-core-stateless-evaluation-engine.md)). El Core es indiferente a
qué herramienta produjo una señal.

```ts
// core-domain — lo ÚNICO que el Core importa
interface Evidence {
  source: string;                      // opaco para el Core
  dimension: string;                   // "performance" | "a11y" | "code-quality" | "testing" | ...
  metrics: Record<string, number>;
  findings: Finding[];
  determinism: 'deterministic' | 'probabilistic';   // Lighthouse vs basado en LLM
  provenance: Provenance;              // collectedBy, adapterVersion, artifactHash, timestamp
}
```

### 3. El Core nunca ejecuta proveedores

La recolección es un asunto de orquestación con side-effects. El Core recibe
`Evidence[]` ya recolectada y la evalúa contra criterios derivados y política.
Esto preserva el determinismo y mantiene al evaluador libre de red y de
acoplamiento a proveedores. Si una dimensión no tiene evidencia, el Core la
reporta como `no-evidence`, nunca como un fallo que él causó.

### 4. Los proveedores se seleccionan por tenant, de forma declarativa

Un registro por tenant (mismo espíritu que el SSOT del registro de skills y el
manifest de `.harness`, respetando el aislamiento multi-tenant —
[ADR-0010](./0010-multi-tenancy-architecture-strategy.md),
[ADR-0106](./0106-master-tenant-context-projections.md)) declara qué proveedores
están activos y su configuración. La selección es opt-in y vive en configuración,
no en el Core.

```yaml
qualitySignals:
  providers:
    - { id: lighthouse,     enabled: true,  config: { categories: [performance, a11y, seo] } }
    - { id: thermo-nuclear, enabled: true }
    - { id: testsprite,     enabled: false }   # nube/propietario → opt-in, off por defecto
```

### 5. Los adaptadores viven en el borde, con frontera vigilada

Los adaptadores concretos viven en `@evolith/infra-providers` (junto a los
connectors Port/Cortex y Jira), importados de forma lazy para que el paquete
compile con ninguno instalado. `lint:boundaries` prohíbe que cualquier import de
tercero o de adaptador llegue a `core-domain`. Los proveedores de nube/propietarios
(p. ej. TestSprite) aíslan su egress de código en la frontera del adaptador y por
defecto quedan deshabilitados.

### 6. La provenance es obligatoria y gobierna

Toda `Evidence` lleva provenance (`collectedBy` / `adapterVersion` /
`artifactHash` / `timestamp`) y un flag `determinism`, de modo que las señales son
auditables ([ADR-0016](./0016-immutable-business-audit-trail.md)) y la política
puede ponderarlas o hacer gate sobre ellas (p. ej. tratar la evidencia
probabilística como advisory y exigir evidencia determinista para un gate duro).

## Evidencia y Criterios de Evaluación

- **Statelessness preservada**: el Core importa solo `Evidence`; un grep debe
  mostrar cero imports de proveedor/adaptador en `core-domain`. Mismo criterio
  aplicado a Hermes en [ADR-0102](./0102-evolith-agent-runtime.md).
- **Precedente**: la ingesta de contexto inline ya funciona para archivos fuente
  vía el modelo repository-access ([ADR-0080](./0080-remote-repository-reference-contract.md));
  `Evidence` sigue la forma idéntica.
- **Reutilización**: el patrón de adaptador de salida está probado por los
  connectors Port/Cortex (GT-527) y Jira (GT-529); este ADR lo generaliza a los
  productores de evidencia.
- **Exigibilidad**: la frontera del dominio es verificable por máquina vía
  `lint:boundaries`.
- **Prueba de fuego (ADR de Core)**: si Lighthouse, TestSprite, Claude SEO y la
  rúbrica thermo-nuclear desaparecieran mañana, la decisión (puerto + Evidence
  canónica + registro) se mantiene — son adaptadores ilustrativos, no el sujeto
  de la decisión.

## Consecuencias, Riesgos y Trade-offs

Positivo: el Core se mantiene puro y determinista; cualquier productor de
evidencia se vuelve enchufable, elegible por tenant y desechable; la provenance
hace cada señal auditable y evaluable por política; el lazo de conformidad
diseño/runtime ([ADR-0104](./0104-topology-driven-advisory-design-governance.md))
se cierra con evidencia real.

Negativo / trade-offs: una indirección extra (recolección → normalización →
evaluación); los proveedores difieren en determinismo, así que los consumidores
deben respetar el flag `determinism` en vez de tratar toda la evidencia por igual;
los proveedores probabilísticos (basados en LLM) requieren disciplina de
confianza/normalización. Riesgos: drift de adaptador o de registro (mitigado con
adaptadores versionados y un registro explícito) y egress de código para
proveedores de nube (mitigado con aislamiento en la frontera del adaptador y
opt-in off por defecto). Ningún proveedor puede jamás ser dependencia dura de la
suite.

## Referencias

- Lighthouse — motor de auditoría de runtime (Apache-2.0), API programática Node
  con salida JSON: <https://github.com/GoogleChrome/lighthouse> *(adaptador ilustrativo)*
- TestSprite — testing autónomo con IA; CLI/MCP OSS sobre nube propietaria (por
  créditos): <https://www.testsprite.com/> *(adaptador ilustrativo, opt-in)*
- Claude SEO — skill pack multi-agente MIT (patrón score + plan por severidad):
  <https://github.com/AgricIDaniel/claude-seo> *(referencia de patrón)*
- Revisión de calidad thermo-nuclear — rúbrica de revisión estructural:
  <https://github.com/cursor/plugins/blob/main/cursor-team-kit/skills/thermo-nuclear-code-quality-review/SKILL.md>
  *(referencia de metodología)*

## Decisiones y Estándares Relacionados

- [ADR-0101](./0101-core-stateless-evaluation-engine.md) — Core como Motor de
  Evaluación stateless (el contrato que consume `Evidence`).
- [ADR-0102](./0102-evolith-agent-runtime.md) — capa agéntica de ports & adapters;
  este ADR aplica el mismo principio a los productores de evidencia y reutiliza la
  capa de orquestación que ejecuta los proveedores.
- [ADR-0104](./0104-topology-driven-advisory-design-governance.md) — deriva los
  criterios que esta evidencia confirma o refuta (el lazo de conformidad).
- [ADR-0080](./0080-remote-repository-reference-contract.md) — precedente de
  ingesta de contexto inline (`OverlayFileSystem`).
- [ADR-0010](./0010-multi-tenancy-architecture-strategy.md),
  [ADR-0106](./0106-master-tenant-context-projections.md) — aislamiento de tenant
  para el registro de proveedores por tenant.
- [ADR-0016](./0016-immutable-business-audit-trail.md) — garantías de
  auditoría/provenance para la evidencia recolectada.
- [core/ADR-0005](./0005-automated-sast-quality-gates.md),
  [core/ADR-0018](./0018-testing-pyramid-quality-gates.md) — consumidores de
  quality-gate de la evidencia producida por este puerto.
- ADR de Plataforma acompañante (follow-on): adaptador Node.js para el proveedor
  Lighthouse — registra la elección concreta de proveedor/runtime según el
  estándar de autoría de ADRs.
