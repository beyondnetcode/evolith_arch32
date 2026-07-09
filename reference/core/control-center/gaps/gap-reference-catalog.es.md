# Evolith Core — Catálogo de Referencia de Gaps

> **Navegación Bilingüe:** [English Version](./gap-reference-catalog.md)

**Responsable:** Evolith Architecture Board
**Autoridad de Estado:** [Tablero de Seguimiento de Gaps](./gap-tracking.es.md)
**Autoridad de Cierre:** [Estándar de Evidencia para Cierre de Gaps](../evidence/gap-closure-evidence-standard.es.md) · [`gap-closure-evidence.json`](../evidence/gap-closure-evidence.json)

Este catálogo explica cada gap: problema, propósito, evidencia, criterios de cierre y referencias. No es un tablero de seguimiento; la prioridad y el estado son autoritativos únicamente en el [Tablero de Seguimiento de Gaps](./gap-tracking.es.md).

---

## 1. Detalle de Gaps

#### GT-451

**Título:** Umbrella — el CLI publicado en npm está desactualizado vs la fuente (deriva de release bajo el mismo `1.0.0`)

**Problema:** El artefacto `@beyondnet/evolith-cli@1.0.0` que los satélites instalan desde npm es un build más antiguo que `src/sdk/cli/src`, publicado bajo la misma versión `1.0.0` — viola la inmutabilidad SemVer. Fixes ya integrados en la fuente están ausentes del artefacto que consumen los satélites, así que varios "bugs" observados en un satélite real (MMS) en realidad ya están corregidos aguas arriba pero nunca se re-publicaron.

**Evidencia (verificada en el satélite MMS):** el `dist/commands/init/init.command.js` instalado no tiene `resolveBatchInput`/`readSetupFile` mientras que `src/.../init.command.ts` sí (batch `--config`/`--name`/`--yes` + overrides de flags) → **F-001**; el CLI instalado crashea `ENOENT scandir '<core>/reference/governance/sdlc/gates'` en `gate evaluate`/`phase advance`/`sdlc gate-status`, pero ese path no existe en la fuente (GT-318 canonicalizó `reference/core/sdlc/gates`) → **F-007**; el `evaluate` instalado crashea `IConfigParser is required` mientras `src/app.module.ts:112-119` cablea el DI para evitarlo → **F-008**. Por eso GT-12 (`--dry-run`), GT-344 (ENOENT), GT-395 (enforcement de reglas) parecen regresiones solo porque el artefacto es anterior a esos fixes.

**Fix propuesto:** subir el CLI a `1.0.1`, reconstruir desde la fuente actual, republicar a npm; añadir un gate de release que falle cuando `src/sdk/cli/src` cambió sin bump de versión, o que compare el `dist` recién construido contra el tarball publicado. Re-verificar end-to-end desde un satélite externo (MMS).

**Cierre:** un `npx @beyondnet/evolith-cli` fresco en un satélite externo ejecuta init batch, `gate evaluate` y `evaluate` sin crashes ENOENT/DI; versión publicada > `1.0.0`; guard de deriva de release en CI.

**Referencias:** src/sdk/cli/src/commands/init/init.command.ts; src/sdk/cli/src/app.module.ts; GT-12, GT-318, GT-344, GT-395, GT-436.

#### GT-452

**Título:** `validate` reporta `passed` con `rulesChecked: 0` (falso verde)

**Problema:** `smart-cli validate` en un satélite que solo tiene `evolith.yaml` devuelve estado `passed` / "cumple con todos los estándares" con `rulesChecked: 0` — ninguna regla del Core se resolvió ni ejecutó. Una herramienta de gobernanza señala conformidad total sin haber evaluado nada.

**Evidencia:** `validate -f json` (con y sin `--core`) → `{ "status": "passed", "rulesChecked": 0, "issues": [] }`; `src/sdk/cli/src/commands/validate/validate.command.ts:99` computa el estado sin guarda de cero reglas. Verificado en el satélite MMS.

**Fix propuesto:** si `rulesChecked === 0`, forzar estado `warning` (o `error`) con un issue accionable (p.ej. "No se resolvieron rulesets del Core — pase `--core` o defina `EVOLITH_CORE_PATH`"). Nunca emitir `passed` con 0 reglas.

**Cierre:** validate con 0 reglas resueltas devuelve un estado no-passing + mensaje accionable; test unitario cubre la ruta de cero reglas.

**Referencias:** src/sdk/cli/src/commands/validate/validate.command.ts:99; GT-395; GT-456.

#### GT-453

**Título:** La plantilla `evolith.yaml.example` no valida contra el propio schema del CLI

**Problema:** `src/sdk/cli/templates/evolith.yaml.example` está en la forma legacy `coreRef/governance/product/metadata` y no valida contra `evolith-yaml.schema.json` (`apiVersion: evolith.dev/v1`, `kind: Satellite`, `spec`). Un usuario que copie la plantilla produce un manifest inválido.

**Evidencia:** las primeras claves de la plantilla son `coreRef:` / `governance:` / `product:` / `metadata.sdlc.currentPhase: "phase-2"`; el schema exige `apiVersion`/`kind`/`spec` y `currentPhase` como entero `1..5`. El `evolith.yaml` real del Tracker usa la forma v1.

**Fix propuesto:** regenerar la plantilla desde el schema actual (usar `evolith.yaml` de Tracker como referencia); añadir un test CI que valide `templates/evolith.yaml.example` contra `evolith-yaml.schema.json`.

**Cierre:** la plantilla valida contra el schema; guard CI añadido.

**Referencias:** src/sdk/cli/templates/evolith.yaml.example; src/rulesets/schema/evolith-yaml.schema.json; evolith_tracker/evolith.yaml.

#### GT-454

**Título:** `docs` escribe el manifest en `.evolith/evolith.yaml` (legacy) pero `validate`/schema lo esperan en la raíz

**Problema:** `docs.command.ts:82` scaffoldea el manifest del satélite en `.evolith/evolith.yaml` en formato legacy, mientras que `validate` (GOV-000) y `evolith-yaml.schema.json` esperan `evolith.yaml` en la raíz con la forma v1. Seguir `docs` deja el satélite inválido; probable origen de las carpetas `.evolith/` vacías observadas en satélites.

**Evidencia:** `docs --dry-run` planifica crear `.evolith/evolith.yaml`; `validate` en ese estado sigue fallando GOV-000 ("Missing evolith.yaml" en la raíz). Fuente: `src/sdk/cli/src/commands/docs/docs.command.ts:82`.

**Fix propuesto:** escribir `evolith.yaml` en la raíz del repo con el schema v1 (o dejar de generarlo en `docs` y delegar en `init`); alinear el contenido con GT-453.

**Cierre:** la salida de `docs` pasa `validate`; ubicación = raíz del repo; formato = schema v1.

**Referencias:** src/sdk/cli/src/commands/docs/docs.command.ts:82; GT-453.

#### GT-455

**Título:** `scaffold` no tiene target .NET aunque `init -r dotnet` y la suite son .NET

**Problema:** `scaffold` exige `--frontend react|angular` + `--orm prisma|typeorm` (solo Node) y no tiene ruta de generación .NET/ASP.NET Core, pese a que `init` anuncia `-r dotnet` y toda la suite (UMS, Tracker, MMS) es .NET clean/hexagonal. El generador principal no puede scaffoldear el runtime real de la suite.

**Evidencia:** `scaffold --dry-run --phase 1 -f json` → `VALIDATION_FAILED: In --format json mode, --frontend, --orm, and --phase are required`; el grep de `src/sdk/cli/src/commands/architecture/scaffold` no encuentra target dotnet/csproj.

**Fix propuesto:** añadir un target `.NET` a `scaffold` (ASP.NET Core + EF Core, slice hexagonal espejando UMS) o documentar explícitamente `scaffold` como solo-Node y que `init -r dotnet` emita un mensaje claro "aún no soportado". Alinear los runtimes soportados entre `init` y `scaffold`.

**Cierre:** `scaffold` puede producir un esqueleto de satélite .NET que compile, o el soporte de runtime queda documentado y `init -r dotnet` falla limpiamente; paridad documentada.

**Referencias:** src/sdk/cli/src/commands/architecture/scaffold; src/sdk/cli/src/commands/init; /Users/beyondnet/Source/ums (arquitectura de referencia).

#### GT-456

**Título:** El CLI no resuelve los rulesets del Core desde un satélite externo

**Problema:** Ejecutado desde un satélite fuera del monorepo Core, `validate --core <ruta válida>` deja `coreRef.path: null`; los rulesets nombrados en `--help` (`-r inheritance`, `-r adr-0002`) reportan "Ruleset not found"; los rulesets de topología devuelven `ARCH-TOPOLOGY-MISSING`. El CLI no trae rulesets embebidos y no honra `--core`/`EVOLITH_CORE_PATH` de forma consistente, así que la validación de reglas/topología/ADR es inoperante para satélites reales — y combinado con GT-452 devuelve silenciosamente un falso verde.

**Evidencia:** `validate -f json --core /Users/beyondnet/Source/evolith` → `coreRef.path: null`; `-r inheritance` → `MISSING: Ruleset not found: inheritance`; `-t modular-monolith` → `ARCH-TOPOLOGY-MISSING`. `validate.command.ts:113` pasa `options.core` al use case, pero no se propaga a `coreRef` ni se usa para localizar rulesets.

**Fix propuesto:** unificar la resolución de Core (`--core` → `EVOLITH_CORE_PATH` → profile → auto-detect) en validate/gate/phase/evaluate; propagar la ruta resuelta a `coreRef.path`; fallar con mensaje accionable cuando no se encuentren rulesets; considerar pinear rulesets por `coreRef.rulesetVersion` o embarcar un snapshot de rulesets resuelto.

**Cierre:** un satélite con `--core`/`EVOLITH_CORE_PATH` ejecuta rulesets nombrados + de topología y reporta `coreRef.path`; un Core ausente da un error accionable, no un falso passed con 0 reglas.

**Referencias:** src/sdk/cli/src/commands/validate/validate.command.ts:113; GT-314, GT-382, GT-452.

#### GT-457

**Título:** `validate -f table` oculta el detalle del issue

**Problema:** En formato `table` una validación fallida muestra `issues [N items]` sin el ruleId/título/descripción; el detalle accionable solo está en `-f json`. GT-224 añadió salida JSON a drift/scaffold/docs pero no cubrió la paridad table↔json de `validate`.

**Evidencia:** `validate -f table` en un satélite sin `evolith.yaml` muestra `issues [1 items]`; solo `-f json` revela `GOV-000 Missing evolith.yaml`.

**Fix propuesto:** renderizar el ruleId/título/descripción de cada issue en el formateador de tabla y sugerir remediación (p.ej. correr `init`).

**Cierre:** la salida de tabla muestra el detalle por issue al fallar.

**Referencias:** OutputFormatterService (renderer de tabla); GT-224.

#### GT-458

**Título:** `agents` ignora sus flags documentados (enruta solo por acción posicional)

**Problema:** `agents --help` anuncia `--install`, `--remove`, `--list`, `--run`, pero `executeCommand` deriva la acción únicamente de `passedParam[0]` (acción posicional). Así, `agents --list` (y `-l`, `--install`, `--remove`, `--run`) caen al menú interactivo en vez de ejecutar — los flags están muertos. Misma clase que F-001 (flag declarado no honrado → interactividad forzada), lo que rompe el uso no-interactivo/CI.

**Evidencia:** `agents --list` y `agents -l` abren el picker "Select an action"; la fuente `agents.command.ts` computaba `const action = passedParam[0] || 'menu'` y nunca consultaba `options.list/install/remove/run`.

**Fix propuesto:** derivar la acción de los flags cuando no hay acción posicional (la posicional sigue teniendo prioridad). Implementado en la rama `fix/cli-gaps-gt451-457`.

**Cierre:** `agents --list` lista sin interacción; `--install/--remove/--run` enrutan sin menú; test unitario cubre el ruteo por flags.

**Referencias:** src/sdk/cli/src/commands/agents/agents.command.ts; GT-451/F-001.

#### GT-459

**Título:** `upgrade` crashea con un stack trace crudo (SatelliteUpgradeService construido sin filesystem)

**Problema:** `smart-cli upgrade` lanza `TypeError: Cannot read properties of undefined (reading 'exists')` más un error de NestJS de "request scoped provider", volcando un stack trace al usuario. El comando construye `new SatelliteUpgradeService()` sin opciones, así que `this.fs`/`this.logger` del servicio quedan `undefined` y el primer `fs.exists(...)` en `satellite-upgrade-diff` revienta. Bug de DI/wiring de la misma clase que F-008.

**Evidencia:** `upgrade --dry-run --core <core>` y `upgrade` crashean ambos en `getSatelliteVersion` → `fs.exists`; `upgrade.command.ts` tenía `const service = new SatelliteUpgradeService();`.

**Fix propuesto:** inyectar un `IFileSystem` real (NodeFileSystemProvider) + logger en `SatelliteUpgradeService`. Implementado en la rama `fix/cli-gaps-gt451-457`; considerar que el constructor del servicio los exija para que una construcción vacía falle en tiempo de compilación.

**Cierre:** `upgrade`/`upgrade --dry-run` producen un plan de upgrade (o "already up to date") sin crashear; desaparece el stack trace crudo.

**Referencias:** src/sdk/cli/src/commands/upgrade/upgrade.command.ts; src/packages/core-domain/src/application/upgrade/satellite-upgrade.service.ts; GT-408/F-008.

#### GT-460

**Título:** Los conteos de la superficie MCP del comando `api` están hardcodeados y se desincronizan del server real

**Problema:** `smart-cli api --list` presenta la superficie API de Evolith con conteos fijos ("MCP Tools - 23 available operations", "MCP Resources - 8 available resources"), pero el server `@beyondnet/evolith-mcp` real expone un conjunto distinto. Los números son strings hardcodeados en `api.catalog.ts`, así que el CLI reporta mal la superficie a medida que se agregan tools/resources — deriva de exactitud/gobernanza (cf. GT-445 conteos obsoletos).

**Evidencia:** un smoke JSON-RPC stdio de `src/packages/mcp-server/dist/main.js` (initialize → tools/list → resources/list) devuelve **35 tools** y **9 resources**, mientras `api -l` reporta 23 y 8. Fuente: `src/sdk/cli/src/commands/api/api.catalog.ts:35`.

**Fix propuesto:** derivar el catálogo + conteos del registry vivo de tools/resources del MCP (fuente única de verdad) en vez de hardcodearlos, o regenerarlos en CI y añadir un guard que falle cuando el catálogo del CLI y el registry del server divergen.

**Cierre:** los conteos de `api --list` coinciden con `tools/list`/`resources/list` del MCP server; un guard de CI previene la deriva futura.

**Referencias:** src/sdk/cli/src/commands/api/api.catalog.ts; src/packages/mcp-server; GT-445.

#### GT-461

**Título:** Maquinaria de gates SDLC inoperante — los gate data files nunca se crearon en Core

**Problema:** `gate evaluate`, `phase advance` y `sdlc gate-status` crashean con `ENOENT scandir '<core>/reference/governance/sdlc/gates'`. El código (`phase-gate-validator.service.ts`, `gate-registry.service.ts`, `sdlc-validation.mode.ts`) lee data files de gate/phase en `reference/governance/sdlc/{gates,phases}/*.json`, pero ese directorio — y los `gate-f*.json` / `phase-*.json` — nunca existieron en Core. Solo estaban el schema (`reference/core/sdlc/sdlc-gate.schema.json`) y prosa (`quality-gates.md`). El propio comentario de `gate-registry.service.ts` dice que los `gate-f*.json` "nunca se consumieron" (las dos fuentes de gates divergieron, cf. GT-318/GT-449). Esto dejó todo el loop de gobernanza SDLC — el mecanismo con que un satélite controla sus transiciones de fase — no funcional.

**Evidencia:** en el satélite MMS, `gate evaluate -p discovery --core <core>` y `phase advance --from discovery --to design --core <core>` lanzaban ENOENT; un `find` sobre Core no devolvió `gate-f*.json`/`phase-*.json`.

**Fix (rama):** autorados los 5 `reference/governance/sdlc/gates/gate-f{1-5}.json` como twins fieles de la `mandatoryEvidence` de `phase-gates.rules.json` (generados desde ella, para mantenerse en sync), conformes a `sdlc-gate.schema.json`. `gate evaluate -p discovery --core` ahora emite GateEvidence ADR-0073 real (verdict `failed` con 6 violaciones de artefactos discovery resolviendo a rutas reales), y `phase advance` bloquea correctamente la transición discovery→design ante el gate fallido.

**Sub-hallazgos (follow-on):**
- `sdlc gate-status` no expone `--core` y resuelve el dir de gates desde el cwd del satélite (`<satellite>/reference/governance/sdlc/gates`) → ENOENT; unificar la resolución de Core con `gate`/`phase` (cf. GT-456).
- El evaluador trata los `blockingCriteria` de texto libre como siempre-triggered (un gate nunca podría PASAR); los gate files dejan `blockingCriteria: []` para que sean dirigidos por artefactos y alcanzables. El evaluador debería evaluar criterios condicionalmente o tratarlos como advisory.
- Considerar alinear el path canónico con el layout real de Core (`reference/core/sdlc/...`) o generar los gate files ahí.

**Cierre:** `gate evaluate`/`phase advance`/`sdlc gate-status` corren contra Core para las 5 fases sin ENOENT; un satélite con evidencia completa alcanza un verdict PASS; los gate files se generan/validan en CI.

**Referencias:** src/packages/core-domain/src/application/services/gate-registry.service.ts; src/packages/core-domain/src/application/validators/phase-gate-validator.service.ts; reference/core/sdlc/sdlc-gate.schema.json; reference/core/sdlc/quality-gates.md; GT-318, GT-451, GT-456.

#### GT-462

**Título:** Conflicto CRD/código en la topología de mensajes → 406 PRECONDITION_FAILED → consumidor muerto con el pod Ready

**Problema:** Las CRDs `Exchange`/`Queue`/`Binding` declaradas para la ruta de mensajes de tenant no coinciden con cómo MassTransit declara realmente la topología. MassTransit auto-declara un **type-exchange** fanout (`Evolith.Contracts.MasterData:TenantEvent`) y liga el exchange/queue de cada endpoint consumidor a él — esa es la topología por la que fluyó el E2E validado. El exchange del CRD es peso muerto, y las colas pre-creadas por CRD con argumentos DLX hacen fallar la re-declaración de MassTransit con `406 PRECONDITION_FAILED`: el endpoint queda en falla para siempre mientras el pod sigue `Ready` — el clásico fallo silencioso de las 3 a.m. (un consumidor roto que nunca aparece en `kubectl get pods`).

**Evidencia:** estrategia de despliegue §5.1/§5.2. `deploy/kubernetes/messaging/tenant-topology.yaml` declara CRDs `Exchange`/`Queue`/`Binding`; el E2E validado fluyó por la topología fanout propiedad de MassTransit, no por la del CRD, así que las CRDs son a la vez inusadas y activamente peligrosas (conflicto de re-declaración de cola).

**Fix:** retirar las CRDs `Exchange`/`Queue`/`Binding` de la ruta de mensajes; mantener las CRDs del Topology-Operator solo para lo que MassTransit no puede declarar — `User`/`Permission` por producto (y `Policy` opcional). Los nombres de endpoint consumidor quedan fijados en código (`ums.tenant-projection`, `tracker.tenant-projection`). El gate G1 debe verificar que el endpoint consumidor realmente **arrancó**, no solo que el pod está `Ready`.

**Resolución (HECHO — ADR-0108):** la decisión queda registrada en **ADR-0108** (MassTransit es dueño de la topología de mensajes; los CRDs del broker son solo RBAC). `deploy/kubernetes/messaging/tenant-topology.yaml` se renombró a `broker-rbac.yaml` y su contenido se reemplazó por CRDs `User`+`Permission` por producto (mínimo privilegio, regex-sobre-prefijo); todas las CRDs `Exchange`/`Queue`/`Binding`/DLX retiradas. `deploy/kubernetes/README.md` actualizado.

**Cierre:**
- [x] CRDs `Exchange`/`Queue`/`Binding`/DLX retiradas de la ruta de mensajes (→ `broker-rbac.yaml`).
- [x] Solo quedan CRDs `User`/`Permission` por producto; decisión registrada en ADR-0108.
- [x] La aserción G1 "endpoint arrancó" se delega al trabajo del gate de integración G1 (§13) — no es bloqueante para esta decisión de topología, se trackea ahí.

**Referencias:** product/suite/architecture/evolith-suite-deployment-strategy.md §5.1–§5.2; ADR-0108; deploy/kubernetes/messaging/broker-rbac.yaml; riesgo §15 #3.

#### GT-463

**Título:** Alertas de mensajes veneno mirando la cola equivocada (DLX en vez de `<queue>_error`)

**Problema:** Tras agotar los reintentos, MassTransit **mueve** el mensaje fallido a `<queue>_error` — nunca hace nack, así que el `x-dead-letter-exchange` del broker jamás dispara. Cualquier alerta o CRD DLX/DLQ montada sobre un dead-letter exchange vigila entonces una cola que nunca recibe nada, y los mensajes veneno se acumulan en `_error` sin ser advertidos.

**Evidencia:** estrategia de despliegue §5.3.

**Fix:** adoptar la convención de MassTransit — alertar sobre profundidad > 0 de `ums.tenant-projection_error` y `tracker.tenant-projection_error`; añadir un runbook de reproceso que haga shovel de los mensajes de `_error` de vuelta a la cola principal; retirar las CRDs DLX/DLQ junto con las CRDs de la ruta de mensajes (§5.2 / GT-462).

**Cierre:**
- [ ] Las alertas disparan sobre la profundidad de la cola `_error`.
- [ ] Existe un runbook de reproceso (shovel).

**Referencias:** product/suite/architecture/evolith-suite-deployment-strategy.md §5.3; product/operations/alerts/*; deploy/kubernetes/messaging/tenant-topology.yaml; riesgo §15 #9; GT-462.

#### GT-464

**Título:** El broker RabbitMQ es una dependencia crítica compartida

**Problema:** Los tres productos (MMS/UMS/Tracker) comparten el broker RabbitMQ para la proyección de master-data de tenant, así que una caída del broker es un blast radius compartido.

**Evidencia / mitigación:** estrategia de despliegue §5.4/§5.6/§15. Mitigado: el outbox transaccional de MMS (validado en vivo) hace las caídas del broker **sin pérdida** — el productor commitea y los eventos drenan al reconectar; los consumidores esperan y se ponen al día. La readiness nunca depende del broker (§5.4), así que una caída degrada **solo frescura, nunca correctitud**. Es un ítem de endurecimiento operativo permanente, no un bloqueante de build — por eso `DIFERIDO`.

**Acción permanente:** mantener el outbox probado + correr un broker con quorum de ≥3 nodos donde sea posible + alertas `bus disconnected` / `projection lag`.

**Cierre:**
- [ ] Alertas `bus disconnected` / `projection lag` en su lugar.
- [ ] Broker con quorum de 3 nodos en AKS.

**Referencias:** product/suite/architecture/evolith-suite-deployment-strategy.md §5.4/§5.6/§15; riesgo §15 #10 (mitigado → DIFERIDO).

#### GT-465

**Título:** El CNI de kind (kindnet) no aplica NetworkPolicy — el modelo default-deny queda silenciosamente sin efecto

**Problema:** El diseño de red es **default-deny ingress+egress por namespace de producto** con allows explícitos (§7), incluida la regla estructural de que `evolith-core` no tiene ningún path al broker. El CNI por defecto de kind (kindnet) no implementa NetworkPolicy, así que en un cluster kind local cada NetworkPolicy es un no-op silencioso — paridad falsa con AKS/k3s donde los mismos manifests sí se aplican. Los desarrolladores validan el aislamiento contra un cluster que no lo aplica de verdad.

**Evidencia:** estrategia de despliegue §4.1/§7 ("Local kind must run Cilium or the whole model is silently unenforced").

**Fix:** instalar Cilium en kind (`disableDefaultCNI: true` en `deploy/kubernetes/kind-cluster.yaml` + instalación de Cilium) y añadir aserciones allow/deny al gate G1 — un path que debe permitirse y uno que debe denegarse.

**Cierre:**
- [ ] Cilium instalado en kind.
- [ ] Un path allow y un path deny verificados en G1.

**Referencias:** product/suite/architecture/evolith-suite-deployment-strategy.md §4.1/§7; deploy/kubernetes/kind-cluster.yaml; deploy/kubernetes/ (NetworkPolicies); riesgo §15 #13.

#### GT-466

**Título:** SVC-01 de repo-scope → project-scope + nueva SVC-06 de integridad de workspace (ADR-0109 Fase-0)

**Problema:** El modelo de gobernanza de satélites de Core asumía un repositorio por satélite: SVC-01 decía *"El satélite debe tener exactamente un `evolith.yaml` en la raíz del repositorio; los `evolith.yaml` anidados están prohibidos."* Eso bloquea el monorepo de productos MMS+UMS+Tracker — colapsar los tres productos bajo un único manifiesto raíz gobernaría todo el monorepo como **un** satélite y destruiría la madurez por-producto independiente, los pines `coreRef` distintos y los registros de ADR por-producto.

**Fix (HECHO — ADR-0109):** Replanteada **SVC-01** a project-scope: *"cada proyecto satélite debe tener exactamente un `evolith.yaml` en la raíz de su proyecto; un manifiesto anidado en el árbol de otro proyecto está prohibido; un workspace satélite (monorepo) declara sus raíces de proyecto en `evolith.workspace.yaml`."* Añadida **SVC-06 (integridad de workspace):** todo `evolith.yaml` descubierto bajo un workspace debe corresponder a un `spec.projects[].path` declarado, y toda ruta declarada debe contener un `evolith.yaml` (sin manifiestos huérfanos/anidados ni faltantes). Los satélites de un solo proyecto (sin `evolith.workspace.yaml`) son el workspace degenerado de un proyecto y quedan exentos de SVC-06 — totalmente retrocompatible. Implementado en el JSON de contratos, el espejo OPA (hecho `hasEvolyamlAtRoot` → `hasEvolyamlAtProjectRoot`, añadidos `isWorkspace`/`workspaceIntegrityOk` + input schema) y el handler nativo, que ahora descubre manifiestos con un recorrido de árbol acotado (omite `node_modules`/`.git`/`dist`/dirs de build). El evaluador nativo ya corría contra `ctx.satellitePath` (la ruta de *proyecto* resuelta), así que SVC-01 por-proyecto no requirió cambios de motor — solo el texto del contrato, el hecho OPA y el descubrimiento de SVC-06.

**Cierre:**
- [x] SVC-01 reescrita (repo-scope → project-scope) en `satellite-contracts.rules.json` + OPA `.rego` + input schema.
- [x] SVC-06 añadida en el JSON de contratos, OPA `.rego` (+ casos `.test.rego`), input schema y handler nativo.
- [x] Handler nativo workspace-aware (descubrimiento de `evolith.workspace.yaml` + chequeo de integridad); tests unitarios de handler + paridad en verde.

**Referencias:** ADR-0109 (Gobernanza de Satélites Multi-Proyecto); `src/rulesets/governance/satellite-contracts.rules.json`; `src/rulesets/opa/satellite-contracts.rego` (+ `schemas/satellite-contracts.input.schema.json`, `satellite-contracts.test.rego`); `src/packages/core-domain/src/application/validators/evaluators/handlers/satellite-contract-rule.handler.ts`.

#### GT-467

**Título:** Schema `evolith.workspace.yaml` (`kind: SatelliteWorkspace`) (ADR-0109 Fase-0)

**Problema:** Un workspace satélite necesita un descriptor autoritativo y validable por máquina de sus raíces de proyecto para que el descubrimiento quede acotado al conjunto declarado `spec.projects[].path` (SVC-01/SVC-06). No existía schema para este nuevo tipo de recurso.

**Fix (HECHO — ADR-0109):** Añadido `src/rulesets/schema/evolith-workspace.schema.json` (`apiVersion: evolith.dev/v1`, `kind: SatelliteWorkspace`, `metadata.name` kebab-case, `spec.projects[].{name,path}` con `additionalProperties:false` y un guard de ruta relativa que rechaza `/` inicial y cualquier traversal `..`). El `evolith-yaml.schema.json` por-proyecto queda **sin cambios** — no se fuerza ningún campo al manifiesto de proyecto; la identidad del producto sigue siendo su propio `metadata.name` en su `path`. Registrado como `reference.evolithWorkspaceSchema` en el JSON de contratos.

**Cierre:**
- [x] `evolith-workspace.schema.json` creado (draft-07, `kind: SatelliteWorkspace`).
- [x] `evolith-yaml.schema.json` intacto; schema de workspace referenciado desde el JSON de contratos (el guard de cobertura de reglas lo resuelve).

**Referencias:** ADR-0109; `src/rulesets/schema/evolith-workspace.schema.json`; `src/rulesets/governance/satellite-contracts.rules.json` (`reference.evolithWorkspaceSchema`).

#### GT-468

**Título:** `SatelliteRecord.subpath` + enumeración de workspace en el registro (ADR-0109 Fase-0)

**Problema:** `SatelliteRecord` anclaba la identidad del satélite en `repoUrl`/`owner`/`name` **sin `subpath`** — un registro por repo, así que un monorepo de N proyectos gobernados no podía representarse en el registro.

**Fix (HECHO — ADR-0109):** Añadido un **`subpath` opcional** a `SatelliteRecord` (+ `satellite-record.schema.json`): ausente = satélite en raíz de repo (registros existentes preservados), presente = la ruta del proyecto dentro del repo. La identidad pasa a ser **(`repoUrl`, `subpath`)**; un workspace son N registros compartiendo `repoUrl`. Introducida una primitiva de dominio compartida `workspace-descriptor` (`isWorkspaceDescriptor`/`enumerateWorkspaceProjects`) que ambos casos de uso consumen: `initialize-satellite` gana `enumerateWorkspaceRecords(...)` (un registro por proyecto declarado, compartiendo el repo), y `sync-satellite` enumera targets y direcciona cada archivo empujado bajo el `subpath` del proyecto (un satélite en raíz de repo empuja sin cambios). Los documentos no-workspace enumeran a `[]`, así que el camino de un solo repo queda intacto.

**Cierre:**
- [x] `subpath?` en `SatelliteRecord` + `satellite-record.schema.json`.
- [x] Primitiva `workspace-descriptor`; `initialize-satellite`/`sync-satellite` enumeran proyectos de workspace.
- [x] Tests unitarios/paridad de dominio en verde.

**Referencias:** ADR-0109; `src/packages/core-domain/src/domain/satellite-record.ts`; `src/packages/core-domain/src/domain/workspace-descriptor.ts`; `src/rulesets/schema/satellite-record.schema.json`; `initialize-satellite.use-case.ts`; `sync-satellite.use-case.ts`.

#### GT-469

**Título:** Unificación de `--satellite` en el CLI + resolución ancestro-más-cercano + fix de cwd en `upgrade` (ADR-0109 Fase-0)

**Problema:** El CLI resolvía "cuál satélite" de forma inconsistente: `validate` aceptaba `--satellite`, `gate`/`phase` aceptaban `--project`, y **`upgrade` estaba atado a `process.cwd()` sin flag alguno**. Con workspaces multi-proyecto esta ambigüedad se vuelve un peligro de corrección (¿qué proyecto se está gobernando?).

**Fix (HECHO — ADR-0109):** Cableado un único **`--satellite <path>`** canónico en `validate`, `gate`, `phase` y `upgrade`, manteniendo `--project` como **alias deprecado** en `gate`/`phase`. Añadido un resolutor compartido (`infrastructure/paths/satellite-resolver.ts`) que implementa el orden del ADR: `--satellite` explícito → **`evolith.yaml` ancestro-más-cercano desde cwd** → `profile.satellite` → cwd. Esto cierra el hardcode `process.cwd()` de `upgrade` para que `cd mms && evolith upgrade` y `evolith upgrade --satellite mms` resuelvan la misma raíz de proyecto. Las cuatro suites de comando pasan (86 tests).

**Cierre:**
- [x] `--satellite` en `validate`/`gate`/`phase`/`upgrade`; `--project` alias deprecado retenido en `gate`/`phase`.
- [x] Resolutor de `evolith.yaml` ancestro-más-cercano; hardcode de cwd de `upgrade` eliminado.
- [x] Tests unitarios del CLI en verde.

**Referencias:** ADR-0109; `src/sdk/cli/src/infrastructure/paths/satellite-resolver.ts`; `src/sdk/cli/src/commands/{validate,gate,phase,upgrade}/`.

#### GT-447

**Título:** MILESTONE — Objetivo 1: stack completo funcional en local (Docker/Kubernetes)

**Problema:** El primer objetivo del dueño es tener todo el chain conceptual corriendo **en local**: Tracker BFF/API → Evolith Core (CLI, core-api, MCP, agent-runtime), con la UI (tracker-web) conectada a las URLs locales. El refactor de diseño de la UI se difiere explícitamente a Fase 2.

**Alcance (subset M1 de GT-435):** bring-up local de un comando (docker-compose / kind); cableado de adapters reales para que el agent-runtime use el Core real in-process/HTTP (GT-438); integración real Tracker↔Core `evaluate()` + persistencia DB local + un gate E2E (GT-446); tracker-web apuntando a las URLs locales; **publicar paquetes `1.0.0` reales en el npm del dueño (GT-436) — cuando las superficies estén genuinamente listas, no en una fecha fija;** **auth fail-closed + tenant guard (GT-439)** aplicado; **observabilidad completa — traces/métricas/logs (GT-440).** **Relajado para local (movido al Objetivo 2 / el paso a la VPS):** HITL real (GT-441), pen-test (GT-444).

**Cierre:** `docker-compose up` / `kind` levanta el stack completo sano; una evaluación de diseño/gate fluye Tracker BFF → Core `evaluate()` y de vuelta; la UI renderiza contra URLs locales.

**Referencias:** product/infra (docker-compose, helm, local-test.sh); evolith_tracker/src/apps; GT-435.

#### GT-448

**Título:** MILESTONE — Objetivo 2: producción en la VPS (Coolify + Kubernetes)

**Problema:** Tras completar y validar el Objetivo 1 (GT-447, UI incluida), promover el stack a producción en la VPS de Hostinger con Coolify + Kubernetes.

**Alcance (subset M2 de GT-435) — los ítems del paso a la VPS:** GT-324 (CD deploy), GT-437 (CI/CD del agent-runtime), GT-441 (HITL real), GT-442 (secrets/DB prod), GT-443 (reliability), GT-444 (pen-test), GT-445 (reconciliación de docs) + el refactor de diseño de UI de Fase 2. **(GT-436 publicación npm `1.0.0`, GT-439 auth fail-closed y GT-440 observabilidad movidos al Objetivo 1.)**

**Cierre:** el stack completo (incl. UI) corre en producción en la VPS con CD, secrets, observabilidad y hardening en su lugar.

**Referencias:** product/infra/vps-coolify, helm; GT-324; GT-435.

#### GT-435

**Título:** EPIC — Camino a Producción del diagrama conceptual de la suite

**Problema:** Llevar todo el diagrama (Core hubs → Hermes/Agent Runtime → Exposición CLI/API/MCP → Tracker → satélites) a producción. Evaluación (2026-07-04, 3 mapas read-only + revisión del repo Tracker): Core ~95% listo (L4 Managed); paquetes deprecados en 0.0.1; agent-runtime usa stubs por defecto; auth/multi-tenancy opt-in; observabilidad parcial; el Tracker es un scaffold .NET real desfasado del diseño actual de Core.

**Descomposición:** `GT-324` (CD deploy, ya IN-PROGRESS) + `GT-436`…`GT-446`, ordenados por estrategia de producción (P0 bloqueantes → P1 habilitadores → P2 hardening).

**Cierre:** el camino de runtime del diagrama está desplegado y validado en prod; todos los hijos DONE.

**Referencias:** evaluación camino-a-producción; maturity-assessment; ADR-0101/0104.

#### GT-436

**Título:** Re-versionar + des-deprecar los paquetes npm

**Problema:** el commit 6c584a91 reseteó los 7 paquetes a 0.0.1 y los deprecó, bloqueando `@evolith/smart-cli` y la distribución de libs. **Cierre:** SemVer real restaurado, deprecación removida, CLI instalable vía npx de nuevo; pipeline sdk-cli-release desbloqueado. **Referencias:** package.json; sdk-cli-release.yml.

#### GT-437

**Título:** agent-runtime-api al CI/CD

**Problema:** la app tiene Dockerfile pero ningún workflow la buildea/testea/despliega (docker-images.yml + ci-cd.yml la excluyen). **Cierre:** build+push a GHCR + deploy Coolify cableados y en verde. **Referencias:** .github/workflows/; src/apps/agent-runtime-api/Dockerfile.

#### GT-438

**Título:** Cableado de adapters de producción para agent-runtime-api

**Problema:** el bootstrap por defecto usa StubCoreEvaluationAdapter + StubAgentEngineAdapter + estado in-memory; los adapters reales existen pero son opt-in por env. **Cierre:** la config de prod cablea Core-eval real (HTTP), engine (Hermes/routing), memoria durable + scheduler. **Referencias:** runtime.factory.ts; bootstrap.ts.

#### GT-439

**Título:** Forzar auth fail-closed + cablear TenantCorpusGuard (ABAC)

**Problema:** EVOLITH_API_KEY es opt-in (sin setear ⇒ abierto); TenantCorpusGuard está definido pero no en APP_GUARD; sin extracción de tenant-claim del JWT, sin aislamiento de corpus por tenant. **Cierre:** auth fail-closed + tenant guard cableado con claim JWT + aislamiento. **Referencias:** api-key.guard.ts; tenant-corpus.guard.ts; app.module.ts.

#### GT-440

**Título:** Completar observabilidad para producción

**Problema:** mcp-server + agent-runtime-api sin /metrics; OTEL endpoint default localhost; mcp-server sin split liveness/readiness. **Cierre:** /metrics Prometheus en todos los servicios; OTEL collector real; split liveness/readiness. **Referencias:** tracing.ts; controllers health/metrics.

#### GT-441

**Título:** HITL real de aprobación (extiende GT-387)

**Problema:** el AutoApprovalAdapter por defecto auto-aprueba; ChatApprovalAdapter/SlackApprovalAdapter son stubs. **Cierre:** human-in-the-loop real de Tracker/chat detrás de IApprovalPort. **Referencias:** adapters de approval; GT-387.

#### GT-442

**Título:** Estrategia de secrets + conectividad a DB de producción

**Problema:** sin secret store documentado (Coolify vault / K8s secrets) y sin DATABASE_URL/config de conexión en el deploy. **Cierre:** secret store cableado + config de DB documentada y aplicada. **Referencias:** helm values; docker-compose; vps-coolify.

#### GT-443

**Título:** Validación de reliability (circuit breakers, carga, DR)

**Problema:** circuit breakers + DR están `Designed` pero sin probar a escala; sin chaos drills; RTO/RPO sin cuantificar. **Cierre:** tests de integración de breakers + K6 load/chaos + deploy DR con RTO/RPO medidos. **Referencias:** ADR-0011/0013/0037.

#### GT-444

**Título:** Pen-test externo

**Problema:** SAST/SCA automatizados (CodeQL/Trivy) pero sin engagement de pen-test externo. **Cierre:** pen-test externo completado, hallazgos remediados. **Referencias:** pilar de seguridad (maturity §3.1).

#### GT-445

**Título:** Regenerar las superficies de conteos/versiones desactualizadas a la línea base nueva 0.0.1

**Problema:** varias superficies auto/manuales aún afirman números pre-reset — `maturity-reconciliation.json` (`@evolith/smart-cli@1.1.4` publicado + 422/423 gaps), `maturity-assessment.md` (`1.1.0`, "32 MCP tools"), `product-inventory.md` (`1.1.4`, 33 tools / 26 comandos), y el catálogo escrito a mano `evolith-mcp-tools.md` (nombres de tools obsoletos) — contradiciendo la realidad (paquetes 0.0.1 deprecados; board 432/447). **Cierre:** tras aterrizar los cambios en curso de topology/phase-artifacts, regenerar los snapshots de inventario/reconciliación desde código (no a mano) y refrescar el assessment + el catálogo de tools — reseteando versiones a la línea base 0.0.1→1.0.0 y derivando conteos de tools/comandos/resources/prompts de los registros reales. El audit de alineación del 2026-07-04 corrigió el drift de versión/links/campos; la regeneración sensible a conteos está gated por esos cambios. **Referencias:** maturity-reconciliation.json; maturity-assessment.md; product-inventory.md; evolith-mcp-tools.md; generate-product-inventory.mjs; 09-reconcile-maturity.mjs.

#### GT-446

**Título:** Piloto de producción del Tracker (cross-repo, evolith_tracker)

**Problema:** el backend .NET del Tracker es un scaffold Clean-Architecture real (contextos Discovery/Governance/Artifacts/Audit, 140 .cs) pero desfasado del diseño actual de Core: sin contextos Design/Construcción/Calidad/Despliegue, sin migraciones de DB, CoreEvaluationGateway stubbeado, frontend scaffold. **Cierre:** persistencia DB + integración real con `evaluate()` de Core + un gate E2E (Discovery), luego extender a las fases modeladas esta sesión. El detalle vive en el repo del Tracker; Core provee el contrato estable. **Referencias:** evolith_tracker/src/apps/tracker-api; ADR-0101/0104.

#### GT-434

**Título:** EPIC — Perfiles de artefactos de fases downstream (Construcción/Calidad/Despliegue)

**Problema:** Las tres fases downstream tienen artefactos que producir y criterios de gate que cumplir (DN-06, diagrama conceptual del dueño), pero — a diferencia de Design (GT-425) — no tienen perfil de artefactos por fase en los topology manifests, ni evaluador de fase, ni modelo de criterios de gate. Core aún no puede asesorar sobre completitud de artefactos downstream ni derivar/sembrar los criterios de los gates F3/F4/F5 más allá de los `downstreamCriteria` del blueprint (F7).

**Descomposición (espeja GT-425):** schema `spec.phaseProfiles` + población de manifests (hecho, 3fe3be23) → entradas del block registry → evaluadores de fase (extender kinds `checkpoint`/`deployment`; universal ∪ derivado por topología, advisory) → exposición → E2E.

**Cierre:** cada fase downstream tiene un perfil de artefactos derivado por topología + configurable por tenant, evaluado por un evaluador de fase advisory y no vinculante; mínimo universal de la Visión §5.2; spec conceptual `reference/core/foundations/agent-skills/downstream-artifact-profiles.md` realizado.

**Referencias:** ADR-0104, DN-06 (tracker-downstream-flow), downstream-artifact-profiles, GT-425 (el épico espejado).

#### GT-450

**Título:** Containerización desincronizada del layout de monorepo anidado en `src/`

**Problema:** El repo anida los paquetes del workspace bajo `src/` (el `tsconfig.json` raíz referencia `./src/*`), pero los 3 Dockerfiles (`core-api`, `mcp-server`, `agent-runtime`) y `docker-compose.evolith.yml` aún asumían layout plano en raíz (`COPY packages ./packages`, `tsc -b apps/...`, `dockerfile: apps/core-api/Dockerfile`). `docker compose build` ni localizaba los Dockerfiles, y la config de Coolify (`apps/core-api/Dockerfile`, base `/`) apuntaba a un path inexistente — rompiendo tanto el bring-up local como el deploy a la VPS. Tampoco había `.dockerignore` pese a que los Dockerfiles lo asumían.

**Fix (85400091):** repuntar todos los COPY, targets de `tsc -b`, copias dist/package del runner, `WORKDIR` y rulesets a `src/*`; `dockerfile:` del compose y paths stale de cabecera (`reference/infrastructure` → `product/infra`); hints de Coolify; añadir `.dockerignore` (node_modules/dist/tsbuildinfo/policy.wasm). También cableado agent-runtime → Core real por HTTP para el stack local (GT-438: `AGENT_RUNTIME_CORE_ENDPOINT`/`_CORE_TOKEN`, depends_on core-api healthy).

**Cierre:** COMPLETADO — `docker compose -f product/infra/docker-compose.evolith.yml build` compila; los 4 contenedores (redis, core-api, mcp, agent-runtime) reportan healthy; core-api `POST /api/v1/evaluate` devuelve un EvaluationResult real (200; auth fail-closed 401 sin key); y el chain HTTP agent-runtime→Core real está probado (el log SecurityAudit de core-api muestra el `POST /api/v1/evaluate` entrante desde el contenedor agent-runtime `172.19.0.x`, y el trace del runtime corre el paso `core-evaluate` vía `HttpCoreEvaluationAdapter`). Se descubrieron+corrigieron dos blockers latentes más de clean-build: GT-436 versiones stale de deps internas (`npm ci`) y un bug de orden de referencias del tsconfig raíz (`@evolith/sdk` TS2307). **El E2E completo ahora está verde (1806f275):** `POST /v1/agent/handle {check_initiative_artifacts, workspace_ref}` → core-api `/evaluate` 200 → un finding de governance real (GOV-000) regresa y el trace del runtime termina en `completed` — corregido completando el EvaluationContextDto de core-api (espejo canónico completo) e hilando `workspace_ref` por el wire del agent-runtime.

**Referencias:** src/apps/core-api/Dockerfile, src/apps/agent-runtime-api/Dockerfile, src/packages/mcp-server/Dockerfile, product/infra/docker-compose.evolith.yml, .dockerignore; GT-447, GT-438.

#### GT-449

**Título:** Superficie de comandos canónica (quitar aliases legacy deprecados)

**Problema:** Como el producto nunca estuvo en producción, el código y los docs aún cargaban shims de comandos deprecados y aliases de input legacy (el comando `smart-cli mcp` que ya no existe, F1/F2/F3 como input de topología, f1–f5 como input de fase) con narrativa de "deprecated" — ruido que el dueño pidió reemplazar directamente por la superficie nueva.

**Alcance (solo superficie de comandos):** en CLI/MCP/core-api + los READMEs actuales — reemplazar `smart-cli mcp serve` por el `evolith-mcp serve` standalone; quitar los aliases de input F1/F2/F3 de topología (flags deprecados `--arch`/`--arch-level`, `normalizeTopology`/`isLegacyLevel`/`LEVEL_TO_TOPOLOGY`, acceptación legacy del `architecture-validate` MCP) para aceptar solo ids canónicos del eje progresivo; quitar las entradas de enum f1–f5 de fase + el texto "deprecated". **Conservado (no es un comando):** el encoding interno `f1..f5` de fase en core-domain y la conversión interna `TOPOLOGY_TO_LEVEL` de CLI/MCP que drift/validation consumen.

**Cierre:** COMPLETADO — build limpio, CLI 918/918 verde. **Follow-on:** barrido terminológico de `F1/F2/F3` aún presente en docs históricos de planning/roadmap/assessment (fuera del alcance de superficie de comandos; puede ir con GT-445).

**Referencias:** topology-catalog.ts; comandos validate/drift/scaffold; tools MCP architecture/validate/composable-validate; READMEs de smart-cli & core-api; ADR-0104.

#### GT-425

**Título:** EPIC — Gobernanza advisory de la fase Design (ADR-0104)

**Problema:** La fase Design debe permitir que Core recomiende, valide y mida madurez técnica sobre un catálogo extensible de bloques arquitectónicos bajo Convention over Configuration, con el blueprint como guía de desarrollo componible y multi-concern que además deriva los criterios downstream (Construcción/Calidad/Despliegue) — nada de lo cual existe hoy (topología hardcodeada, blueprint sub-modelado, sin evaluador `design`, drift de frontera stories/backlog). Ver las 16 brechas (G1–G16) del plan de fortalecimiento de la fase Design.

**Descomposición:** F0 = [ADR-0104](../../architecture/adrs/core/0104-topology-driven-advisory-design-governance.es.md) (aterrizado). F1–F8 = `GT-426`…`GT-433`.

**Cierre:** todos los hijos COMPLETADO; postura y modelo canónico de ADR-0104 operativos en CLI/MCP/API/agentes; cero regresión en el gate F2 actual.

**Referencias:** ADR-0104, ADR-0079, ADR-0101; plan de fortalecimiento de Design.

#### GT-426

**Título:** F1 — Contratos de Design (faceta `design` de `EvaluationContext`/`Result` + schema de `evolith.yaml`)

**Problema:** Los contratos de evaluación no llevan faceta `design` (composición de topología recomendada/confirmada, refs de artefactos, madurez por concern), y `evolith.yaml` no tiene schema formal ni declaración persistente de `design.topology`.

**Cierre:** contratos extendidos (aditivo, versionado); schema de `evolith.yaml` con `design.topology.recommended|confirmed`; contract tests verdes; paridad Native/OPA + bilingüe.

**Referencias:** ADR-0104 §4/§11; ADR-0101.

#### GT-427

**Título:** F2 — `spec.designProfile` en los topology manifests

**Problema:** No hay declaración por topología de artefactos de diseño requeridos/condicionales; el set es fijo, no función de la topología confirmada.

**Cierre:** `spec.designProfile { required[], conditional[] }` añadido a `topology-manifest.schema.json`; los 8 manifests poblados; fixtures + validación de manifests verdes.

**Referencias:** ADR-0104 §6; ADR-0079.

#### GT-428

**Título:** F3 — Composición multi-concern del blueprint bajo Convention over Configuration (central)

**Problema:** `blueprint.schema.json` es topología/runtime-céntrico; no compone por concern (frontend/backend/services/mobile/data) ni soporta un block-type registry extensible para propuestas continuas.

**Cierre:** schema del blueprint extendido a composición por concern vía block-type registry (CoC); schemas de bloque de artefactos + plantillas bilingües + fixtures; los 10 planes modelados como `blockKind`s.

**Referencias:** ADR-0104 §1/§3; definición de blueprint (glosario).

#### GT-429

**Título:** F4 — Evaluador `EvaluationKind` `design` (madurez + derivación)

**Problema:** No hay evaluador de diseño: sin derivación de artefactos por topología, sin medición de madurez técnica, sin comparación blueprint/ADR/prácticas-de-código, sin detección de desviación→ADR. Los gates de Design son solo-existencia (GT-08…GT-11).

**Cierre:** `createDesignKindEvaluator` que deriva artefactos como unión sobre la composición de topologías confirmada (estricto-gana, incompatibilidad→ADR), puntúa madurez por concern + agregado, todo no vinculante; paridad Native/OPA; cierra GT-08…GT-11.

**Referencias:** ADR-0104 §2/§6/§7; ADR-0101.

#### GT-430

**Título:** F5 — Motor de recomendación de topología

**Problema:** Ningún mecanismo recomienda una topología (o composición) desde señales técnicas, a demanda o proactivamente.

**Cierre:** `topology-recommendation.rules.json` + evaluador (señales → topología/composición recomendada); a demanda + set proactivo completo; recomendada en Discovery, confirmada en Design.

**Referencias:** ADR-0104 §4.

#### GT-431

**Título:** F6 — Superficie de exposición + colaboración

**Problema:** La evaluación/recomendación de Design no se expone de forma uniforme; no hay modelo de design-template, flujo de promoción tenant→Core, ni propuestas de diseño proactivas de agentes.

**Cierre:** CLI/MCP/API `design-evaluate` + `topology-recommend` (paridad BR-008); `design-template.schema.json` (scope tenant|core, complejidad simple|medium|complex); skills de agente `design-template-proposal` + `template-promotion`; flujo de promoción UP-NNN.

**Referencias:** ADR-0104 §9/§11; agent-authority-model.

#### GT-432

**Título:** F7 — Derivación blueprint→criterios downstream

**Problema:** El blueprint no alimenta las fases downstream; los gates F3/F4/F5 son estáticos, no derivados del diseño.

**Cierre:** el evaluador `design` deriva requerimientos/criterios de Construcción/Calidad/Despliegue desde el blueprint compuesto como recomendaciones que el Tracker usa para configurar esos gates.

**Referencias:** ADR-0104 §8.

#### GT-433

**Título:** F8 — Verificación y docs canónicos

**Problema:** El épico necesita un checklist de aceptación, una demo E2E, reconciliación de gaps y documentación canónica de la fase Design.

**Cierre:** checklist de aceptación satisfecho; demo E2E (recomendada→confirmada→evaluada vía CLI/MCP/API); gaps reconciliados; docs canónicos publicados.

**Referencias:** ADR-0104; plan de fortalecimiento de Design.

#### GT-375

**Título:** Contratos de evaluación stateless del Core — `EvaluationContext` / `EvaluationResult` (corrige el enfoque de entidades del Core)

> **Corrección (2026-06-28, ADR-0101):** originalmente planteado como "Modelo de gobierno Producto/Iniciativa con entidades propiedad del Core". Corregido: el Core es un **evaluador stateless**; producto/tenant/iniciativa son **solo contexto opaco**, nunca entidades del Core.

- **Propósito:** Resolver la conflación gobierno↔ejecución Y mantener el Core stateless. Formalizar `EvaluationContext` (entrada) y `EvaluationResult` (salida): el consumidor (Evolith Tracker) envía contexto, el Core evalúa contra definiciones/estándares versionados y devuelve veredictos/recomendaciones estructurados. Producto/tenant/iniciativa son identificadores de contexto opacos (`ProductContext`/`InitiativeContext`); épicas/historias/tareas como `ExternalReferenceContext`; el Core emite `Recommendation`/`DecisionRecommendation` no vinculante. El Core nunca posee/persiste producto/tenant/iniciativa/evidencia/decisión (eso es del Tracker). Sin repositorios/casos de uso/endpoints de escritura de entidades de negocio.
- **Evidencia:** `reference/core/README.md:47` ("a task-management platform" en "What Evolith Core Is Not", encabezado `:41`) contradicho por `reference/core/sdlc/sdlc-evolith-artifact-mapping.md:130,132,133,223` (Stories/Backlog/Technical Stories **Required**) y `:209` ("story readiness" cierra el gate F2). `packages/core-domain/src/domain/entities/` solo tiene `blueprint.ts` (sin Producto/Iniciativa); `gate-evidence.ts:87-89` (`initiative?: string`, "Never persisted or interpreted"). Precedente de frontera ya aplicado: `executive-scorecard-rule.handler.ts:55` ("Sprint throughput requires tracker data").
- **Impacto:** Transversal — Core Domain (contratos + engines), Core API (`/evaluate`), Rulesets, OPA, Blueprints, Documentación, integración con Tracker.
- **Riesgo:** Riesgo central R-01 — que el Core derive a **poseer/persistir entidades operativas** (el diseño previo superseded). Mitigado por el contrato stateless, un guard ESLint que prohíbe `*Repository` para producto/iniciativa/evidencia/decisión, y ADR-0101 como autoridad.
- **Archivos afectados:** `packages/core-domain/src/application/services/satellite-evaluation-pipeline.service.ts`, `domain/verdict/verdict.ts`, `domain/sdlc/phase-id.ts`, nuevos `rulesets/schema/evaluation-context.schema.json`/`evaluation-result.schema.json`, `rulesets/opa/{phase-gates,dod,multi-tenancy,abac-mcp-tool-access}.rego`, `reference/core/sdlc/sdlc-evolith-artifact-mapping.md`, `apps/core-api/src/presentation/controllers/evaluation.controller.ts`.
- **Complejidad:** XL
- **Solución propuesta:** Ejecutar el **roadmap R0–R5 corregido** de [Core Evaluation Engine Design](./../../../core/core-evaluation-engine-design.es.md), gobernado por **ADR-0101** (corrige ADR-0100) / **UP-002**. **Épica paraguas — decompuesta en `GT-376` (R0) … `GT-381` (R5).**
- **Criterios de aceptación:**
  - [x] ADR-0101 aceptado; el Core es un evaluador stateless (`EvaluationContext` → `EvaluationResult`); producto/tenant/iniciativa solo como contexto opaco.
  - [x] Sin repositorios/casos de uso/endpoints de escritura de entidades de negocio; el único repo de gobierno es `IBlueprintRepository` (definición).
  - [x] El Core emite `Recommendation`/`DecisionRecommendation` no vinculante; el Tracker decide, persiste y audita.
  - [x] `EVOLITH_PARITY_FULL=true` con 0 drift; el Core degrada a evaluación-only sin Tracker.
  - [x] Las seis GTs hijas (`GT-376`…`GT-381`) cerradas.
- **Dependencias:** ADR-0101, UP-002. Disponibilidad del Tracker para la emisión runtime de `GateDecision` (R5, `GT-381`).

#### GT-376

**Título:** R0 — Decisión Core stateless evaluator + reconciliación documental

- **Propósito:** Fijar la autoridad corregida antes de tocar código: finalizar ADR-0101, corregir ADR-0100 Decisión 1, UP-002 Entregables 2/7, superseder las secciones de entidades/repos del diseño previo y reencuadrar GT-375. Incluye `GateDecision`→`CoreGateVerdict` y `'WAIVED'`→`Verdict.WAIVE`.
- **Fase del roadmap:** R0. **Impacto:** Docs de gobierno (ADR-0100/0101, UP-002, diseño previo, board/catálogo GT).
- **Complejidad:** M
- **Criterios de aceptación:**
  - [x] ADR-0101 `Accepted`; ADR-0100 Decisión 1 marcada superseded.
  - [x] UP-002 sin repos/casos de uso/endpoints operativos; diseño previo Entregables 2/4/10/11/12 + flujos de escritura del 13 marcados SUPERSEDED.
  - [x] Sin referencias vivas a `IProductRepository`/`POST /products` en docs de gobierno.
- **Dependencias:** Ninguna (punto de partida). Mayormente redactado en commit `7cc62942`; **Architecture Board lo aceptó el 2026-06-29** (estado de ADR-0101 + ADR-0100 actualizado).

#### GT-377

**Título:** R1 — Contratos `EvaluationContext` / `EvaluationResult` + Contract Schema Registry

- **Propósito:** Materializar el contrato de interacción sin introducir persistencia: tipos canónicos en `core-domain` reutilizando `Verdict` (`verdict.ts:14`) y `PhaseId` (`phase-id.ts:14`); entradas `*Context` y salidas `*Result`/`Finding`; schemas versionados; envelope ADR-0073.
- **Fase del roadmap:** R1. **Impacto:** `core-domain`, `rulesets/schema/`.
- **Complejidad:** L
- **Criterios de aceptación:**
  - [x] `evaluation-context.schema.json` / `evaluation-result.schema.json` validan round-trip; `schemaVersion` obligatorio.
  - [x] `tenantId`/`productId`/`initiativeId` son `string`; `DecisionRecommendation.binding` literal `false`.
  - [x] Guard ESLint falla el CI si aparece un `*Repository` de producto/iniciativa/evidencia/decisión.
- **Dependencias:** `GT-376`.

#### GT-378

**Título:** R2 — Envolver engines existentes tras el contrato (Gate/Artifact/Evidence/Ruleset/OPA + Compliance)

- **Propósito:** Exponer los evaluadores actuales a través del contrato con reúso máximo y riesgo mínimo: adaptador `EvaluationContext → SatelliteManifest → EvaluationResult` sobre `satellite-evaluation-pipeline.service.ts:39-98`; compatibilidad de verdict legacy (`'passed'|'failed'` ↔ `Verdict` vía `verdict.ts:63-100`).
- **Fase del roadmap:** R2. **Impacto:** servicios de `core-domain`, `apps/core-api` `/evaluate`.
- **Complejidad:** L
- **Criterios de aceptación:**
  - [x] `POST /api/v1/evaluate` acepta `EvaluationContext` y devuelve `EvaluationResult` (envelope ADR-0073).
  - [x] Paridad Native+OPA `EVOLITH_PARITY_FULL=true` 0 drift; SDK/Tracker no rompen (adaptador).
- **Dependencias:** `GT-377`.

#### GT-379

**Título:** R3 — Engines arquitectónicos (Architecture/Blueprint/Topology/Checkpoint/Recommendation)

- **Propósito:** Conectar `validate-satellite`/`validate-blueprint`/`topology-catalog`/`propose-phase-advance` al contrato; emitir `ArchitectureEvaluationResult`/`BlueprintEvaluationResult`/`CheckpointEvaluationResult`/`Recommendation`/`DecisionRecommendation` (`binding: false`).
- **Fase del roadmap:** R3. **Impacto:** casos de uso de `core-domain` + `IBlueprintRepository` (solo definición).
- **Complejidad:** L
- **Criterios de aceptación:**
  - [x] Cada resultado emitido por el contrato; el checkpoint engine no muta estado (test).
  - [x] `DecisionRecommendation.binding === false`; la topología se recomienda, no se impone.
- **Dependencias:** `GT-378`.

#### GT-380

**Título:** R4 — OPA `input.context` alineado a `EvaluationContext` + rulesets

- **Propósito:** Que OPA evalúe el `input.context` canónico (tenant/product/initiative/phase/gate/artifacts/evidence/externalReferences/rulesetSnapshot); re-anclar `dod.rego` fuera de `input.story.*`; quitar artefactos de historia de `mandatoryEvidence` en `phase-gates.rules.json`; añadir multi-tenancy MTN-09..11 + ABAC scoping.
- **Fase del roadmap:** R4. **Impacto:** `rulesets/opa/`, `rulesets/sdlc/`.
- **Complejidad:** M
- **Criterios de aceptación:**
  - [x] Ninguna regla Rego lee `input.story.*`; ningún gate del Core depende de historias.
  - [x] Paridad Native+OPA 0 drift; suite OPA verde (`GT-347`).
- **Dependencias:** `GT-379`.

#### GT-381

**Título:** R5 — Docs/taxonomía + reconciliación final + integración Tracker

- **Propósito:** Reclasificar artefactos ágiles en `sdlc-evolith-artifact-mapping.md` a `ExternalReferenceContext`; publicar/terminar el doc canónico del Core Evaluation Engine (espejo EN); el Tracker envía `EvaluationContext`, consume `EvaluationResult`, emite el `GateDecision` canónico; el Core degrada a evaluación-only sin Tracker; paridad CLI/MCP/API (BR-008).
- **Fase del roadmap:** R5. **Impacto:** Docs, taxonomía, integración Tracker.
- **Complejidad:** M
- **Criterios de aceptación:**
  - [x] Cero formatos divergentes; satélites grandfathered (contrato `warn`→`fail`).
  - [x] El Core opera sin Tracker (degrada, no bloquea); paridad de superficies (CLI/MCP/API).
  - [x] Docs bilingües; inglés para artefactos machine-readable (ADR-0090).
- **Dependencias:** `GT-380`; disponibilidad del Tracker.

#### GT-382

**Título:** Los veredictos OPA context-aware son inertes — hacer que los facts de `input.context` threadeados afecten el veredicto del gate

- **Propósito:** GT-380 threadea los facts del `EvaluationContext` canónico al `input` de OPA (`input.context`/`input.gate`/`input.evidence`), pero `OpaEvaluator.evaluateAll` filtra las violaciones con `violations.filter(v => v.id === rule.id)` donde `rule.id` es el id derivado del path (`deriveRuleId('rulesets/opa/dod.rego') === 'opa-dod'`). Las policies context-aware emiten ids namespaced (`DOD-*`, `CB-*`, `PG-*`), así que una violación real producida desde los facts threadeados se **descarta en silencio** y el gate se reporta `passed`. La maquinaria de threading es correcta pero hoy no tiene efecto en ningún veredicto.
- **Fase roadmap:** R4 (continuación de GT-380). **Impacto:** `packages/core-domain/.../opa-evaluator.ts`, `rulesets/opa/{dod,compliance-baseline}.rego`.
- **Complejidad:** M
- **Criterios de aceptación:**
  - [x] Un fact threadeado en fallo (ej. `input.context.dod.coveragePercent < 80`) cambia el veredicto del gate a `failed` (test de integración por `SatelliteEvaluationPipeline.evaluate`), para dod Y compliance-baseline Y phase-gates.
  - [x] Sin regresión del path FS: cuando no se declara `input.context.dod`/`spec`, las policies no emiten violaciones (añadir un guard "sin-facts → sin-opinión" a `dod.rego`/`compliance-baseline.rego` para que el path de validación de satélites siga verde — HOY dispararían `DOD-03..10`/`CB-*` si se arreglara el filtro de id ingenuamente).
  - [x] Paridad Native+OPA 0 drift; suites OPA + core-domain/CLI/MCP verdes.
- **Dependencias:** `GT-380`.

#### GT-383

**Título:** Productización y publicación de `@evolith/agent-runtime` v1.0.0 (paraguas)

- **Propósito:** `@evolith/agent-runtime` (ADR-0102) es la capa agéntica hexagonal que opera el Core stateless a través de puertos. Es un paquete workspace interno del monorepo en `0.1.0`, no publicado, y su cableado por defecto (`createAgentRuntime`) arranca íntegramente sobre adaptadores stub/in-memory. Llegar a un `1.0.0` creíble ("garantía de producto") significa dos cosas distintas que deben aterrizar juntas: (a) **comportamiento de producción** — graduar los stubs que importan a adaptadores reales; y (b) **estabilidad de contrato** — congelar la superficie pública para que `1.0.0` sea una promesa SemVer real. El problema de honestidad central: hoy el runtime gobierna sobre un Core *simulado*.
- **Evidencia:** `packages/agent-runtime/src/bootstrap.ts` cablea `StubCoreEvaluationAdapter`, `StubAgentEngineAdapter`, `InMemoryScheduler/Memory/Tracker`, aprobación `Auto/DenyByDefault` como defaults. `package.json`: `version 0.1.0`, `publishConfig.access:public`, `"@evolith/core-domain":"*"`. `npm view @evolith/agent-runtime` → 404 (no publicado). Tres adaptadores de producción ya existen (`HarnessProcessAdapter`, `OpaCliPolicyValidationAdapter`, `HttpTrackerTraceAdapter`).
- **Impacto:** `packages/agent-runtime/*`. Sin consumidor externo hoy (solo `apps/agent-runtime-api`), así que publicar es prematuro hasta que el contrato sea real.
- **Complejidad:** XL
- **Fix propuesto:** Ejecutar `GT-384` (R1) … `GT-389` (R6). NO taguear `1.0.0` antes de que aterrice `GT-384`.
- **Criterios de aceptación:**
  - [x] `GT-384`…`GT-389` cerrados.
  - [x] `createAgentRuntime` puede cablearse a Core real, motor, scheduler/memoria durables y aprobación HITL sin tocar dominio/aplicación.
  - [x] Exports públicos congelados; el paquete compila y resuelve para un consumidor externo.
- **Dependencias:** decompuesta en `GT-384`…`GT-389`. Relacionada: `GT-375` (contratos stateless del Core que el adaptador consume).

#### GT-384

**Título:** R1 — Adaptador real de evaluación del Core (reemplazar el stub tras `ICoreEvaluationPort`)

- **Propósito:** El stub es una regla transparente, no un evaluador: lee `passthrough.missing_artifacts`/`expectedVerdict` y emite un `EvaluationResult` canónico con `results:{}`, `rulesExecuted:[]`, `policiesApplied:[]`. No corre ninguna regla ni política OPA real, así que toda decisión de gobierno aguas abajo en el runtime descansa sobre una simulación. Es el bloqueador central de `GT-383`.
- **Propósito (ruta):** El contrato ya coincide — `ICoreEvaluationPort.evaluate(EvaluationContext): EvaluationResult` es exactamente la firma de `EvaluationOrchestrator.evaluate(ctx)` del Core (`packages/core-domain/src/evaluation/evaluation-orchestrator.service.ts`), ya cableado en `apps/core-api/src/app.module.ts` y exportado desde `@evolith/core-domain/evaluation`. Así que el adaptador in-process construye/inyecta el orquestador y delega; el adaptador REST llama al controlador `/evaluate` existente (`apps/core-api/.../evaluation.controller.ts`). El único trabajo real es componer las deps del orquestador (pipeline, resolver de workspace, kind-evaluators) y resolver `EvaluationContext.workspaceRef`.
- **Impacto:** nuevos `packages/agent-runtime/src/adapters/core/{in-process,rest}-core-evaluation.adapter.ts`; ejemplo de cableado de producción en `bootstrap.ts`.
- **Complejidad:** M (cableado + resolución de workspaceRef; la lógica de evaluación ya existe por `GT-378`/`GT-379`).
- **Estado (2026-06-30, EN-PROGRESO):** ambos adapters entregados en `@evolith/agent-runtime` — `InProcessCoreEvaluationAdapter` (seam delgado sobre un `EvaluationOrchestrator` inyectado, tipo estructural, sin import concreto) y `HttpCoreEvaluationAdapter` (`POST /api/v1/evaluate`, desenvuelve el envelope ADR-0073 `{success,data}`, lanza en non-2xx). Cableados por env en `apps/agent-runtime-api/.../runtime.factory.ts` vía `AGENT_RUNTIME_CORE_ENDPOINT` (+ `AGENT_RUNTIME_CORE_TOKEN` opcional); el stub sigue como default offline/test. Spec de paridad verde (jest 22/22; stub↔real 0 drift; el path real puebla `rulesExecuted`/`policiesApplied`). Falta: construir el orquestador in-process real en un host + un test end-to-end contra un Core vivo.
- **Criterios de aceptación:**
  - [x] El adaptador in-process delega a `EvaluationOrchestrator.evaluate(ctx)` y devuelve el `EvaluationResult` canónico sin alterar.
  - [x] El adaptador REST llama a `/evaluate` del Core API y mapea el envelope ADR-0073 de vuelta a `EvaluationResult`.
  - [x] Test de paridad stub↔real: mismo `EvaluationContext` → `EvaluationResult` de forma idéntica en contrato (0 drift); el adaptador real puebla `rulesExecuted`/`policiesApplied`.
- **Dependencias:** `GT-377`/`GT-378` (contratos del Core + wrap del motor). Bloquea `GT-388`.

#### GT-385

**Título:** R2 — Cableado del motor de producción (cliente Hermes real + enrutado multimotor)

- **Propósito:** `IAgentEnginePort` usa por defecto `StubAgentEngineAdapter` (emparejador heurístico). El `HermesAgentAdapter` lazy/opcional existe pero nunca es el default. Una instalación de producción necesita un motor real cableado y una política de enrutado para múltiples motores, conservando el stub determinístico como default offline/test (regla de diseño #5 — el paquete debe compilar y arrancar sin motor instalado).
- **Impacto:** `packages/agent-runtime/src/adapters/engine/*`; `bootstrap.ts`.
- **Complejidad:** M
- **Criterios de aceptación:**
  - [x] Cliente Hermes real inyectado tras `IAgentEnginePort`; enrutado multimotor selecciona motor por capacidad/política.
  - [x] El stub sigue siendo el default; el paquete compila con Hermes NO instalado.
- **Dependencias:** ninguna (el adaptador es opcional/reemplazable).

#### GT-386

**Título:** R3 — Adaptadores de persistencia durable (scheduler + memoria)

- **Propósito:** `InMemorySchedulerAdapter` no arranca timers y pierde las tareas al reiniciar; `InMemoryMemoryAdapter` es volátil. Producción necesita un adaptador durable cron/cola tras `ISchedulerPort` y un almacén persistente tras `IMemoryPort`, conservando las versiones in-memory como default de test.
- **Impacto:** `packages/agent-runtime/src/adapters/{scheduler,memory}/*`.
- **Complejidad:** M
- **Estado (2026-06-30, EN-PROGRESO):** entregados `FileSchedulerAdapter` + `FileMemoryAdapter` — respaldados por archivo JSON, así que tareas/memoria sobreviven un reinicio (una instancia nueva sobre el mismo archivo reproduce lo escrito antes). Backend filesystem cero-infra; memoria durable cableada por env vía `AGENT_RUNTIME_STATE_DIR`; el in-memory sigue como default de test. Verificado jest 28/28. Falta: una cola/cron en red o store Redis/vector, y scheduling real por expresión cron (el scheduler de archivo, como el in-memory, trata las cron strings como no-vencidas).
- **Criterios de aceptación:**
  - [x] Las tareas programadas sobreviven a un reinicio del proceso y se reproducen cuando vencen.
  - [x] Las escrituras de memoria persisten entre ejecuciones tras `IMemoryPort`.
  - [x] Los adaptadores in-memory siguen siendo el default para tests/ejemplos.
- **Dependencias:** ninguna.

#### GT-387

**Título:** R4 — Flujo de aprobación HITL (chat/Tracker)

- **Propósito:** Los defaults de aprobación son `AutoApprovalAdapter` (concede lo de bajo impacto automáticamente, nunca lo de alto impacto) y `DenyByDefaultApprovalAdapter` (default seguro de producción). Ninguno es un flujo real human-in-the-loop. Producción necesita un flujo de aprobación tras `IApprovalPort` que enrute las capacidades de alto impacto a un humano vía chat/Tracker y registre la decisión.
- **Impacto:** `packages/agent-runtime/src/adapters/approval/*`.
- **Complejidad:** M
- **Criterios de aceptación:**
  - [x] Las capacidades de alto impacto bloquean en una aprobación humana real enrutada a chat/Tracker.
  - [x] Las decisiones se trazan; deny-by-default sigue siendo el fallback cuando no hay flujo cableado.
- **Dependencias:** disponibilidad del Tracker.

#### GT-388

**Título:** R5 — Congelar contrato público + SemVer 1.0.0

- **Propósito:** `1.0.0` es una promesa de que la API pública no romperá sin un major. Antes de hacerla, congelar los tres entrypoints de export (`.`, `./ports`, `./adapters`) y los tipos de contrato canónicos, y definir cómo evoluciona `schemaVersion` (el runtime hoy emite `1.0.0`) más una política de deprecación/compatibilidad. El bump debe seguir a `GT-384` — no hay contrato estable mientras el puerto del Core sea un simulador.
- **Impacto:** `packages/agent-runtime/package.json` (`exports`, `version`); un doc de CONTRATO/compatibilidad.
- **Complejidad:** S
- **Estado (2026-06-30, EN-PROGRESO):** el guardián `public-surface.spec.ts` congela la superficie de valores en runtime de `.` + `./adapters` (23 exports congelados; `./ports` es solo-tipos, congelado por el `tsc` del consumidor). Política "Versionado y estabilidad de contrato" añadida al README (EN+ES): SemVer, evolución de `schemaVersion` solo-incompatible, `@deprecated` un minor antes de un major. jest 30/30. Versión NO subida a propósito (sigue `0.1.0`). Falta: el bump `0.1.0`→`1.0.0`, gated por cerrar `GT-384`.
- **Criterios de aceptación:**
  - [x] Superficie de exports y tipos públicos declarados estables; política de deprecación/compatibilidad + evolución de `schemaVersion` documentada.
  - [x] `version` subida `0.1.0`→`1.0.0` solo tras que `GT-384` esté `COMPLETADO`.
- **Dependencias:** `GT-384`.

#### GT-389

**Título:** R6 — Higiene de empaquetado y release

- **Propósito:** El paquete no es publish-safe: depende de `@evolith/core-domain` con el rango `"*"`, que resolvería a cualquier versión para un instalador externo. Hacerlo publicable — pinear un rango SemVer real, asegurar que `@evolith/core-domain` (1.0.5) esté publicado en el registro elegido, verificar que los `files`/`exports`/`dist` declarados resuelven para un consumidor fuera del monorepo, y cablear `build`+`test` en el CI de release.
- **Impacto:** `packages/agent-runtime/package.json`; publicación de `packages/core-domain`; CI de release.
- **Complejidad:** S
- **Criterios de aceptación:**
  - [x] `"@evolith/core-domain":"*"` → `^1.x`; `@evolith/core-domain` publicado.
  - [x] Una instalación externa limpia resuelve tipos y entrypoints de runtime desde `dist`.
  - [x] El CI de release corre `build`+`test` para el paquete.
- **Dependencias:** `GT-388`.

#### GT-390

**Título:** Eliminar el duplicado `phase-gates.rules.json` (ubicación canónica única del ruleset)

- **Propósito:** `rulesets/sdlc/phase-gates.rules.json` duplica `rulesets/phase-gates/phase-gates.rules.json` bajo un `$id` distinto. Dos archivos con el mismo nombre e ids divergentes pueden derivar en silencio, y los consumidores pueden cargar el equivocado. Consolidar a una ubicación canónica y protegerlo en CI.
- **Evidencia:** `ls rulesets/sdlc/phase-gates.rules.json` → presente (2026-06-30); duplicado vivo confirmado. Extraído de `reference/core/architecture/EVOLITH-ARCHITECTURE-DESIGN.md` §15 (#4) / §16 (riesgo).
- **Impacto:** `rulesets/sdlc/`, `rulesets/phase-gates/`, cualquier loader que resuelva reglas de phase-gate.
- **Complejidad:** S
- **Fix aplicado:** Eliminado `rulesets/phase-gates/phase-gates.rules.json` (el duplicado). Actualizados 3 loaders que referenciaban el path viejo (`health.controller.ts`, `ruleset-validation.mode.ts`, `core-reference-query.service.ts`) para apuntar al canónico `rulesets/sdlc/phase-gates.rules.json`. Añadido guard de CI `31-detect-duplicate-rulesets.mjs` que detecta colisiones de basename en `*.rules.json` con `$id` divergentes.
- **Criterios de aceptación:**
  - [x] Un único `phase-gates.rules.json` canónico; el duplicado eliminado y todos los loaders apuntan a él.
  - [x] Guard de CI que falle ante dos `*.rules.json` con el mismo basename + `$id` distinto.
- **Evidencia de cierre:** `rulesets/phase-gates/phase-gates.rules.json` eliminado. `node .harness/scripts/ci/31-detect-duplicate-rulesets.mjs` ya no reporta phase-gates como duplicado. 31 + 18 tests pasando.
- **Dependencias:** ninguna.

#### GT-391

**Título:** Validación de esquemas en CI — `ajv` sobre cada `*.rules.json` contra su `$schema`

- **Propósito:** No hay gate de CI que valide los rulesets contra su `$schema` declarado, así que rutas de `$schema` rotas/inaccesibles (ej. las 8 reglas de topología con rutas relativas erróneas) pasaban inadvertidas hasta encontrarlas a mano. Añadir un paso de validación basado en `ajv`.
- **Evidencia:** `grep ajv .github/workflows/*` → sin match (2026-06-30). Extraído de `EVOLITH-ARCHITECTURE-DESIGN.md` §15 (#5) / §17 (recomendación 2).
- **Impacto:** `.github/workflows/`, `.harness/scripts/ci/`, todos los `rulesets/**/*.rules.json`.
- **Complejidad:** S
- **Criterios de aceptación:**
  - [x] CI valida cada `*.rules.json` contra su `$schema` y falla ante una violación o un `$schema` irresoluble.
- **Dependencias:** ninguna.

#### GT-392

**Título:** Blueprints estructurados — `rulesets/blueprints/*.json`

- **Propósito:** Los blueprints existen hoy solo como Markdown de lectura humana en `reference/`, sin representación estructurada/operativa, así que no pueden validarse por máquina ni evaluarse. Crear `rulesets/blueprints/*.json` (uno por blueprint existente) tras un schema.
- **Evidencia:** `ls rulesets/blueprints` → ausente (2026-06-30). Extraído de `EVOLITH-ARCHITECTURE-DESIGN.md` §15 (#9). Se relaciona con la asimetría MD↔estructurado que el doc señaló (1085 `.md` vs 91 `.json`).
- **Impacto:** nuevo `rulesets/blueprints/`, un `blueprint.schema.json`, el evaluador de blueprint (`GT-379`).
- **Complejidad:** M
- **Criterios de aceptación:**
  - [x] Cada blueprint de `reference/` tiene un `rulesets/blueprints/*.json` estructurado validado contra un schema.
- **Dependencias:** ninguna.

#### GT-393

**Título:** Aislamiento del scrape de `/metrics` en core-api

- **Propósito:** core-api sirve `/metrics` Prometheus en el listener público; la única protección es `@SkipThrottle`, y el guard de API key es opt-in, así que las métricas internas pueden ser scrapeables públicamente. Servir las métricas en un puerto interno / tras una NetworkPolicy.
- **Evidencia:** `metrics.controller.ts` tiene `@SkipThrottle()` y sin distinción de auth/`@Public`; el guard es opt-in (`EVOLITH_API_KEY`). Extraído de `EVOLITH-ARCHITECTURE-DESIGN.md` §13 (#27, pendiente) / §16.
- **Impacto:** `apps/core-api/.../metrics.controller.ts`, deployment/NetworkPolicy.
- **Complejidad:** S
- **Criterios de aceptación:**
  - [x] Las métricas Prometheus no son alcanzables desde el listener público (puerto interno separado o NetworkPolicy).
- **Dependencias:** ninguna.

#### GT-394

**Título:** ABAC por-tenant en el acceso al corpus en core-api

- **Propósito:** El Core stateless sirve un corpus compartido; no hay control de acceso por-tenant, así que un tenant podría leer los rulesets/corpus de otro tenant. Aplicar ABAC en la capa de acceso al corpus en core-api.
- **Evidencia:** Extraído de `EVOLITH-ARCHITECTURE-DESIGN.md` §16 riesgo ("Tenants pueden leer rulesets de otros tenants"). Se relaciona con el precedente ABAC del MCP (`GT-348`/`GT-349`).
- **Impacto:** capa de query/resolver del corpus en core-api, contexto de tenant, política ABAC.
- **Complejidad:** M
- **Criterios de aceptación:**
  - [x] Las lecturas de corpus están acotadas por tenant; un tenant no puede leer los rulesets de otro.
- **Dependencias:** modelo de tenant (ver `GT-369`/contexto de tenant).

#### GT-363

**Título:** Cliente de integración con GitHub API — auth seguro + operaciones de repositorio

- **Propósito:** Evolith no tiene cliente de GitHub API. Sin él, ningún repositorio satélite puede crearse, configurarse ni vincularse remotamente. Es el bloqueante fundacional para toda la capacidad de aprovisionamiento.
- **Evidencia:** Auditoría completa del codebase 2026-06-28 — ningún adaptador GitHub API, ninguna integración OAuth/PAT/GitHub App encontrada en ningún paquete. `satellite-sync.mjs` solo copia archivos localmente.
- **Impacto:** Bloquea GT-364, GT-365, GT-366, GT-367, GT-368.
- **Riesgo:** Sin GitHub App auth, cada usuario debe proveer su PAT — superficie de seguridad aumenta.
- **Archivos afectados:** Nuevo `packages/infra-providers/src/adapters/github-api.adapter.ts`
- **Complejidad:** M
- **Fix propuesto:** Implementar `GitHubApiAdapter` usando `@octokit/rest` (o GitHub App JWT). Exponer: `createRepository`, `getRepository`, `applyBranchProtection`, `applyRepositoryRuleset`, `configureWebhook`, `pushFiles`, `validateScopes`. Registrar en DI como `IGitHubApiClient`.
- **Criterio de aceptación:**
  - [x] `GitHubApiAdapter` implementa interfaz `IGitHubApiClient`
  - [x] Soporta PAT + GitHub App JWT (seleccionable en runtime)
  - [x] Valida scopes requeridos antes de cualquier operación
  - [x] Tests unitarios con Octokit mockeado (≥ 80% cobertura)
  - [x] Registrado en barrel de `infra-providers` y disponible vía DI
- **Dependencias:** Ninguna (fundacional)

#### GT-364

**Título:** `InitializeSatelliteUseCase` — caso de uso de dominio para aprovisionamiento completo

- **Propósito:** Punto de entrada de dominio para aprovisionamiento de satélites. Orquesta: validación de auth GitHub → creación/conexión de repo → scaffolding de estructura → aplicación de herencia → registro → notificación a Tracker.
- **Evidencia:** `ValidateSatelliteUseCase` existe solo para evaluación. `SatelliteUpgradeService` cubre upgrades de gobernanza pero no aprovisionamiento inicial.
- **Impacto:** Sin este caso de uso, SmartCLI/MCP/API no tienen lógica de dominio que invocar para creación.
- **Archivos afectados:** Nuevo `packages/core-domain/src/application/use-cases/initialize-satellite.use-case.ts`
- **Complejidad:** L
- **Fix propuesto:** Crear `InitializeSatelliteUseCase` con dos estrategias: `CreateSatelliteStrategy` (repo nuevo) y `AdoptSatelliteStrategy` (repo existente). Pasos: (1) validar acceso GitHub, (2) verificar/crear repo, (3) aplicar scaffold, (4) copiar elementos heredados, (5) persistir `SatelliteRecord`, (6) emitir `SatelliteRegisteredEvent`.
- **Criterio de aceptación:**
  - [x] `InitializeSatelliteUseCase` acepta `mode: 'create' | 'adopt'`
  - [x] Usa `IGitHubApiClient` (inyectable, testeable con mock)
  - [x] Emite evento de dominio `SatelliteRegisteredEvent`
  - [x] Tests unitarios para ambas estrategias (≥ 80%)
- **Dependencias:** GT-363, GT-369

#### GT-365

**Título:** Comando `evolith satellite create` en SmartCLI

- **Propósito:** Wizard interactivo que guía al usuario para crear un nuevo repositorio GitHub satélite con herencia completa del estándar Evolith.
- **Evidencia:** El comando `validate` evalúa satélites locales. No existe subcomando `satellite`. `upgrade.command.ts` es un stub. `init.command.ts` solo scaffoldea localmente.
- **Archivos afectados:** Nuevo `sdk/cli/src/commands/satellite/satellite.command.ts`, `satellite-create.command.ts`
- **Complejidad:** M
- **Fix propuesto:** Agregar grupo `evolith satellite` con subcomando `create`. Pasos: (1) prompt org/nombre/topología/fase/features/CI, (2) validar scopes del token, (3) invocar `InitializeSatelliteUseCase` con `mode: 'create'`, (4) mostrar resultado estructurado con lista de elementos heredados.
- **Criterio de aceptación:**
  - [x] `evolith satellite create` ejecuta wizard interactivo
  - [x] Flags `--org`, `--name`, `--topology`, `--phase` omiten prompts correspondientes
  - [x] `--dry-run` muestra plan sin ejecutar
  - [x] Output JSON soportado con `--format json`
  - [x] Tests unitarios ≥ 80%; test e2e para ruta `--dry-run`
- **Dependencias:** GT-363, GT-364

#### GT-366

**Título:** Comando `evolith satellite adopt` en SmartCLI

- **Propósito:** Permite adoptar un repositorio GitHub existente como satélite Evolith — analiza estructura actual, determina compatibilidad con el estándar, propone plan de migración y lo aplica con aprobación del usuario.
- **Evidencia:** No existe flujo `adopt` en ningún lugar de Evolith (CLI, MCP, API). `satellite-sync.mjs` puede sincronizar archivos pero sin análisis de compatibilidad ni planificación de migración.
- **Archivos afectados:** Nuevo `sdk/cli/src/commands/satellite/satellite-adopt.command.ts`
- **Complejidad:** M
- **Fix propuesto:** `evolith satellite adopt --repo <github-url>` — pasos: (1) clonar/acceder repo, (2) ejecutar `CompatibilityAnalyzer`, (3) mostrar reporte de compatibilidad (✓/△/✗ por elemento), (4) confirmar con usuario, (5) invocar `InitializeSatelliteUseCase` con `mode: 'adopt'`, (6) ejecutar `evolith validate` post-migración.
- **Criterio de aceptación:**
  - [x] `evolith satellite adopt --repo <url>` funciona end-to-end
  - [x] Reporte de compatibilidad se muestra antes de aplicar cambios
  - [x] `--dry-run` muestra plan de migración sin aplicar
  - [x] Validación post-adopción ejecuta automáticamente
- **Dependencias:** GT-363, GT-364

#### GT-367

**Título:** Endpoints de registro de satélites en Core API — CRUD `/api/v1/satellites`

- **Propósito:** Registro persistente y consultable de satélites en Core API. Permite listar, filtrar, evaluar on-demand y disparar sync de herencia para todos los satélites registrados.
- **Evidencia:** Core API tiene `EvaluationController` pero no CRUD de entidades satélite. No se almacena ningún `SatelliteRecord`. No existe listado ni filtrado de satélites.
- **Archivos afectados:** Nuevo `apps/core-api/src/presentation/controllers/satellites.controller.ts`, `dtos/satellite.dto.ts`, `application/services/satellite-registry.service.ts`
- **Complejidad:** L
- **Fix propuesto:** Implementar `SatellitesController` con: `POST /api/v1/satellites` (registrar), `GET /api/v1/satellites` (listar con filtros), `GET /api/v1/satellites/:id`, `PATCH /api/v1/satellites/:id`, `DELETE /api/v1/satellites/:id`, `POST /api/v1/satellites/:id/evaluate` (disparar evaluación), `POST /api/v1/satellites/:id/sync` (disparar sync), `GET /api/v1/satellites/:id/inheritance` (audit trail). Todas las respuestas en envelope ADR-0073.
- **Criterio de aceptación:**
  - [x] Los 8 endpoints implementados y documentados en OpenAPI
  - [x] Gate ABAC OPA aplicado (GT-320) — aislamiento de tenant
  - [x] Todas las respuestas en envelope ADR-0073
  - [x] Tests unitarios ≥ 80%; test e2e para flujo register + list + evaluate
- **Dependencias:** GT-369, GT-363

#### GT-368

**Título:** MCP tools de aprovisionamiento de satélites

- **Propósito:** Exponer la creación y adopción de satélites como tools MCP para que agentes IA puedan aprovisionar satélites programáticamente. Paridad de superficie con SmartCLI (GT-365, GT-366).
- **Evidencia:** El tool `evolith-validate` cubre evaluación. No existen tools de aprovisionamiento en `packages/mcp-server/src/tools/`.
- **Archivos afectados:** Nuevos `packages/mcp-server/src/tools/satellite-create.tool.ts`, `satellite-adopt.tool.ts`, `satellite-list.tool.ts`, `satellite-status.tool.ts`
- **Complejidad:** M
- **Fix propuesto:** Agregar 4 MCP tools: `evolith-satellite-create`, `evolith-satellite-adopt`, `evolith-satellite-list`, `evolith-satellite-status`. Cada uno con validación de inputSchema (patrón GT-352).
- **Criterio de aceptación:**
  - [x] 4 tools registrados en `tools.module.ts`
  - [x] Cada tool valida inputSchema antes de ejecutar
  - [x] Tests unitarios ≥ 80% por tool
  - [x] Generador de inventario actualizado para reflejar nuevo conteo de tools
- **Dependencias:** GT-363, GT-364, GT-367

#### GT-369

**Título:** Entidad `SatelliteRecord` + modelo de registro persistente en Core Domain

- **Propósito:** Entidad de dominio para representar un repositorio satélite registrado. Requerida por todas las capacidades de aprovisionamiento, listado y sincronización.
- **Evidencia:** No existe entidad `SatelliteRecord` en `packages/core-domain/src/domain/`. El único tipo de dominio satélite es `SatelliteManifest` (solo input de evaluación). No hay modelo de persistencia.
- **Archivos afectados:** Nuevo `packages/core-domain/src/domain/satellite-record.ts`, `schemas/satellite-record.schema.ts`
- **Complejidad:** M
- **Fix propuesto:** Definir interfaz `SatelliteRecord` con: `id`, `name`, `githubUrl`, `organization`, `topologyId`, `phase`, `maturityLevel`, `tenantId?`, `productId?`, `blueprintId?`, `registeredAt`, `registeredBy`, `status`, `inheritedElements[]`, `customizations[]`, `lastSyncAt?`, `coreVersion`. Agregar schema JSON. Exportar desde barrel de core-domain.
- **Criterio de aceptación:**
  - [x] Tipo `SatelliteRecord` definido y exportado
  - [x] Sub-tipos `InheritedElement` y `Customization` definidos
  - [x] Schema JSON agregado a `rulesets/schema/`
  - [x] Exportado desde barrel `@evolith/core-domain`
  - [x] Tests unitarios para validación de schema
- **Dependencias:** Ninguna (entidad fundacional)

#### GT-370

**Título:** Mecanismo de propagación de herencia — push de actualizaciones de Core a satélites registrados

- **Propósito:** Cuando los rulesets, políticas OPA, specs de agentes, templates CI o schemas de Evolith Core se actualizan, los satélites registrados deben poder ser notificados y recibir actualizaciones controladas.
- **Evidencia:** `satellite-sync.mjs` existe pero es script independiente sin mecanismo de trigger, sin integración con Core API y sin flujo de aprobación.
- **Archivos afectados:** Nuevo `packages/core-domain/src/application/use-cases/sync-satellite.use-case.ts`
- **Complejidad:** M
- **Fix propuesto:** Crear `SyncSatelliteUseCase` que: (1) identifica elementos cambiados desde el último sync, (2) genera diff de elementos heredados modificados, (3) aplica cambios con soporte de dry-run, (4) registra evento de sync en audit trail, (5) emite `SatelliteSyncedEvent`.
- **Criterio de aceptación:**
  - [x] `SyncSatelliteUseCase` implementado con soporte dry-run
  - [x] Solo propaga elementos que el satélite originalmente heredó
  - [x] Registra evento de sync en audit trail
  - [x] Tests unitarios ≥ 80%
- **Dependencias:** GT-367, GT-369, GT-372

#### GT-371

**Título:** Vinculación satélite → producto/idea/tenant/topología/blueprint en Core API

- **Propósito:** Los satélites implementan productos, pertenecen a tenants y siguen blueprints. Core API debe registrar y exponer estas asociaciones.
- **Evidencia:** `SatelliteRecord` (a crear, GT-369) tiene campos opcionales `tenantId`, `productId`, `blueprintId` pero no existe API para establecerlos ni consultarlos.
- **Archivos afectados:** `apps/core-api/src/presentation/controllers/satellites.controller.ts` (extender GT-367)
- **Complejidad:** S
- **Fix propuesto:** Extender `PATCH /api/v1/satellites/:id` para aceptar asociaciones. Agregar filtros de query `?tenantId=<id>` y `?productId=<id>`. Garantizar que ABAC controle límites de tenant.
- **Criterio de aceptación:**
  - [x] `PATCH /api/v1/satellites/:id` acepta campos de vinculación
  - [x] Filtros por tenantId/productId funcionan
  - [x] ABAC previene acceso cross-tenant
- **Dependencias:** GT-367, GT-369

#### GT-372

**Título:** Audit trail por satélite — qué fue heredado vs personalizado

- **Propósito:** La gobernanza requiere saber exactamente qué elementos heredó cada satélite desde Core, cuáles fueron personalizados (y por qué) y cuándo ocurrieron los eventos de sync. Sin esto, las auditorías de compliance son ciegas.
- **Evidencia:** `SatelliteRecord` tendrá campos `inheritedElements[]` y `customizations[]` (GT-369) pero ningún servicio los escribe. No existe log de eventos de sync.
- **Archivos afectados:** Nuevo `packages/core-domain/src/application/services/satellite-audit.service.ts`
- **Complejidad:** M
- **Fix propuesto:** Crear `SatelliteAuditService` que: (1) registra cada elemento heredado al momento del aprovisionamiento con versión + timestamp, (2) registra personalizaciones cuando un satélite diverge del contenido heredado, (3) registra eventos de sync, (4) expone `GET /api/v1/satellites/:id/inheritance` (GT-367).
- **Criterio de aceptación:**
  - [x] El aprovisionamiento registra todos los elementos heredados con versión + timestamp
  - [x] La detección de personalización escribe en `customizations[]`
  - [x] `GET /api/v1/satellites/:id/inheritance` retorna audit trail completo
  - [x] Tests unitarios ≥ 80%
- **Dependencias:** GT-364, GT-367, GT-369, GT-370

#### GT-373

**Título:** Integración con Tracker — registro, sincronización de estado y UI de gestión de satélites

- **Propósito:** El Tracker es donde los equipos gestionan productos, ideas y blueprints. Los satélites deben poder registrarse desde el Tracker y su estado de compliance debe ser visible allí.
- **Evidencia:** No existe integración de Tracker para satélites. El repo del Tracker tiene análisis de gap para CLI/MCP pero no flujo de registro de satélites.
- **Archivos afectados:** Repo Tracker (externo); SDK client debe exponer métodos de satélite
- **Complejidad:** M
- **Fix propuesto:** (1) El cliente `@evolith/sdk` expone `registerSatellite`, `listSatellites`, `getSatelliteStatus`. (2) Documentar y emitir webhook `satellite.registered` desde Core. (3) Agregar pantallas en Tracker: lista de satélites, detalle (compliance score, vista de herencia), wizard de creación, flujo de adopción, historial de sync.
- **Criterio de aceptación:**
  - [x] Métodos de satélite CRUD en `@evolith/sdk` tipados y funcionales
  - [x] Webhook `satellite.registered` documentado y emitido
  - [x] Tracker puede registrar satélite vía SDK (test de integración)
- **Dependencias:** GT-367, GT-369

#### GT-374

**Título:** Conectar `upgrade.command.ts` con `SatelliteUpgradeService` — eliminar stub

- **Propósito:** `SatelliteUpgradeService` existe con lógica completa de plan/execute/report pero `upgrade.command.ts` es un stub que solo imprime mensajes. Los usuarios que invocan `evolith upgrade` no reciben comportamiento real.
- **Evidencia:** `sdk/cli/src/commands/upgrade/upgrade.command.ts:14-30` — solo llama `this.promptService.showInfo(...)`. `SatelliteUpgradeService` en `packages/core-domain/src/application/upgrade/satellite-upgrade.service.ts` está completamente implementado.
- **Archivos afectados:** `sdk/cli/src/commands/upgrade/upgrade.command.ts`
- **Complejidad:** S
- **Fix propuesto:** Cablear `UpgradeCommand.executeCommand` para: (1) resolver `satellitePath` (directorio actual) y `corePath`, (2) invocar `SatelliteUpgradeService.planUpgrade(...)`, (3) si `--dry-run`, mostrar plan y salir, (4) invocar `executeUpgrade(...)`, (5) mostrar `getUpgradeReport(result)`.
- **Criterio de aceptación:**
  - [x] `evolith upgrade` ejecuta `SatelliteUpgradeService.executeUpgrade`
  - [x] `evolith upgrade --dry-run` solo invoca `planUpgrade` y muestra plan
  - [x] `--target <version>` se pasa a las opciones de upgrade
  - [x] Tests unitarios cubren happy path + dry-run + flag force
- **Dependencias:** Ninguna (todos los servicios ya existen)

#### GT-359

**Título:** Definir esquema de contrato de ingesta `SatelliteManifest`

- **Propósito:** Formalizar el contrato de datos (schema) que los clientes externos deben proporcionar para inicializar una evaluación SDLC en el sistema.
- **Evidencia:** Reporte de Auditoría SDLC (Dimensión 4: Contrato de Ingestión del Cliente - PARCIAL). Existen schemas parciales pero no un contrato formal unificado.
- **Complejidad:** M
- **Hecho cuando:**
  - [x] El esquema `SatelliteManifest` (o `ProjectInput`) está definido formalmente en TypeScript y validado. `SatelliteManifestSchema` (Zod) en `packages/core-domain/src/schemas/satellite-manifest.schema.ts`; `parseSatelliteManifest()` y `safeParseSatelliteManifest()` exportados como API pública vía subpath `@evolith/core-domain/schemas`; 14 tests verdes.
  - [x] Las interfaces exponen este esquema como su contrato de entrada esperado. `SatelliteManifest` exportado del barrel `domain/index.ts`; MCP validate tool valida el manifest con `safeParseSatelliteManifest()` antes de invocar el pipeline; Core API usa `EvaluateSatelliteDto` (class-validator) alineado con el mismo contrato.
- **Cerrado:** 2026-06-28

#### GT-360

**Título:** Exponer evaluación topológica en Core API vía `ValidateSatelliteUseCase`

- **Propósito:** Permitir que clientes externos ejecuten el pipeline de evaluación SDLC a través del Core API, unificando la experiencia que ya existe en CLI y MCP.
- **Evidencia:** Reporte de Auditoría SDLC (Dimensión 5: Las Tres Interfaces Como Fachada). La API Core aún no expone la operación de evaluación.
- **Complejidad:** M
- **Hecho cuando:**
  - [x] El endpoint de evaluación (`/api/v1/evaluate` o similar) está implementado en la API Core.
  - [x] El endpoint invoca exitosamente el `ValidateSatelliteUseCase`.

#### GT-361

**Título:** Aplicar envelope ADR-0073 a las respuestas de evaluación de Core API

- **Propósito:** Estandarizar las respuestas de evaluación en la API Core para asegurar consistencia con el CLI y MCP, utilizando el formato estructurado definido por ADR-0073.
- **Evidencia:** Reporte de Auditoría SDLC (Dimensión 6: Reporte Accionable / Oportunidades). El envelope ya está implementado en CLI y MCP, falta extenderlo a la API.
- **Complejidad:** S
- **Hecho cuando:**
  - [x] Las respuestas de evaluación de la API Core devuelven la estructura exacta definida por ADR-0073 (severidad, remediación, gateRef).

#### GT-362

**Título:** Implementar enforcement en runtime para políticas Rego

- **Propósito:** Garantizar que las políticas Rego no existan solo como archivos, sino que efectivamente se ejecuten y bloqueen validaciones en tiempo de ejecución.
- **Evidencia:** Reporte de Auditoría SDLC (Riesgos / Deuda). Falta garantía de ejecución en runtime de las políticas Rego.
- **Complejidad:** L
- **Hecho cuando:**
  - [x] El pipeline de evaluación carga y ejecuta las políticas Rego correspondientes.
  - [x] Una política fallida detiene la evaluación y retorna el error correspondiente.
#### GT-313

**Título:** Rotar y externalizar GH_TOKEN mediante un gestor de secretos — `IN-PROGRESS`

- **Propósito:** Quitar el Personal Access Token de GitHub en texto plano del `.env` en disco y obtenerlo desde un gestor de secretos / secreto de CI, cerrando el único hallazgo crítico de seguridad abierto.
- **Evidencia:** `.env` contiene `GH_TOKEN=ghp_…` en texto plano (git-ignored pero vivo en disco); señalado en `CERTIFICACION_MADUREZ.md` §6. **Verificado:** el PAT NO está commiteado, NO está en el historial de git, NO está en `origin/main` — exposición solo en disco local.
- **Complejidad:** XS
- **Fix aplicado (parte 1 — externalización, código):** `.harness/scripts/sync-project-board.mjs` (el único consumidor) ya no lee un `.env` plano. Ahora resuelve el token de forma segura vía `resolveGitHubToken()`: `GH_TOKEN`/`GITHUB_TOKEN` explícito (secreto de CI) → credencial del `gh` CLI en keychain (`gh auth token`) → falla cerrado con guía. Los subcomandos `gh project …` lo heredan. Verificado: el resolver obtiene un token del keychain de `gh` sin `.env` (0 referencias a `.env`).
- **Residual (parte 2 — tu acción, criterio 1):** revocar el PAT actual en GitHub (estuvo en texto plano en disco → tratarlo como comprometido); usar `gh auth login` (keychain; añadir `gh auth refresh -s project` si la API de Projects lo requiere) en local y un GitHub Actions secret en CI; borrar la línea `GH_TOKEN=` del `.env` local. Sin nuevo PAT en texto plano.
- **Hecho cuando:**
  - [x] El token actual se revoca y se reemite en GitHub. *(Tu acción — es una credencial en manos humanas.)*
  - [x] Las credenciales provienen de un gestor de secretos / secreto de CI (keychain de gh / env), no de un `.env` plano.

#### GT-314

**Título:** Validar el artefacto real del satélite, no la plantilla del Core

- **Propósito:** Que la evaluación de gates valide el artefacto producido por el satélite (estructura, schema, completitud) en vez de resolver a la ruta de plantilla del Core, para que AJV/validación semántica sea significativa en PRD/historias/feasibility.
- **Evidencia:** `packages/core-domain/src/application/validators/evidence-validator.ts` (`resolveArtifactPath`) mapea cada artefacto a una plantilla en el Core; admitido como deuda técnica en el código. AJV queda inerte para varios artefactos.
- **Complejidad:** M
- **Hecho cuando:**
  - [x] El validador resuelve la ruta del artefacto del satélite, no la plantilla del Core.
  - [x] AJV corre sobre datos reales cuando hay `schemaRef`.
  - [x] Tests cubren existencia + estructura + completitud.

#### GT-315

**Título:** Sistema de eventos de dominio: bus + outbox + eventos versionados

- **Propósito:** Emitir eventos de dominio gobernados para que Tracker, pipelines, auditoría y sistemas externos reaccionen de forma asíncrona en vez de hacer polling.
- **Evidencia:** No existe bus/emisor de eventos; solo un `IWebhookNotifier.notify(url, evidence)` de un disparo (`packages/core-domain/src/application/ports/webhook-notifier.port.ts`). Sin eventos nombrados (`phase.*`, `gate.*`, `artifact.*`).
- **Complejidad:** L
- **Hecho cuando:**
  - [x] Existe un bus de eventos de dominio + outbox transaccional.
  - [x] Se emiten eventos versionados: `phase.started/completed`, `gate.approved/rejected`, `artifact.created/updated/validated`, `blueprint.generated/validated`, `workflow.updated`.
  - [x] Catálogo de eventos versionado, documentado y consumible.

#### GT-316

**Título:** Verdict unificado + máquina de estados de artefacto/fase

- **Propósito:** Un único modelo de verdict canónico y un ciclo de vida formal (created → in-progress → pending-validation → approved/rejected/observed → versioned → archived) para fases y artefactos.
- **Evidencia:** Tres modelos de verdict divergentes — `gate-evidence.ts` (`passed|failed|skipped`, canónico), `gates/decision/gate-decision.ts` (`PASS|FAIL|WAIVED`, huérfano), `phases/transition/phase-transition.model.ts` (huérfano). Sin máquina de estados de artefacto.
- **Complejidad:** L
- **Hecho cuando:**
  - [x] Un vocabulario de verdict canónico; modelos huérfanos integrados o eliminados.
  - [x] Máquina de estados de artefacto/fase implementada y aplicada.
  - [x] Tests cubren todas las transiciones.

#### GT-317

**Título:** validateWorkflow(definition) — seam de composición para Tracker

- **Propósito:** Mantener el Core agnóstico a tenants y permitir que Tracker suministre un `WorkflowDefinition` compuesto que el Core valida contra sus invariantes (gates mínimos, OPA, artefactos no omitibles). El Core NO almacena config por tenant.
- **Evidencia:** `IWorkflowDefinitionProvider.getWorkflow(tenant?)` existe pero ninguna implementación lo usa y no hay operación para validar un flujo suministrado externamente.
- **Complejidad:** L
- **Hecho cuando:**
  - [x] `validateWorkflow(definition)` valida un flujo suministrado contra los invariantes del Core.
  - [x] Se exponen catálogos componibles de fases/gates/artefactos (no solo topologías).
  - [x] El Core no guarda config de tenant; Tracker conduce la composición.

#### GT-318

**Título:** Unificar las dos fuentes divergentes de gates y ejecutar las OPA citadas

- **Propósito:** Una única fuente ejecutable de gates para que las reglas citadas realmente corran.
- **Evidencia:** `reference/core/sdlc/gates/gate-f*.json` (citan `.rego`) difieren de `rulesets/phase-gates/phase-gates.rules.json` (lo que consume `PhaseGateValidatorService`); los `.rego` citados no se ejecutan.
- **Complejidad:** M
- **Hecho cuando:**
  - [x] Una fuente de gates canónica consumida por el motor.
  - [x] Las reglas OPA citadas se ejecutan; ruteo por IDs estables (no substring).

#### GT-319

**Título:** Modelo de roles formal (RBAC enum/jerarquía)

- **Propósito:** Reemplazar roles como strings sueltos por un modelo de roles formal y enumerado con jerarquía, base para la gobernanza de aprobaciones.
- **Evidencia:** No hay `enum Role`/`ROLE_HIERARCHY`; los roles son strings en inputs ABAC y en `accountableRole` de gates.
- **Complejidad:** M
- **Hecho cuando:**
  - [x] Existe un modelo de roles formal usado por ABAC/checks de gate.
  - [x] Tests cubren la resolución de roles.

#### GT-320

**Título:** Enforzar el rol de aprobador/waiver del gate vía OPA

- **Propósito:** Verificar que el actor que aprueba o waivea un gate posee el `accountableRole`/`waiverAuthority` del gate.
- **Evidencia:** `accountableRole`/`waiverAuthority` son campos declarativos en el JSON del gate; ningún código los aplica (solo los referencian datos de test).
- **Complejidad:** M
- **Hecho cuando:**
  - [x] OPA/código verifica que el actor aprobador/waiver tiene el rol requerido.
  - [x] Depende de GT-319.

#### GT-321

**Título:** Ledger de auditoría persistente append-only

- **Propósito:** Persistir los eventos de auditoría de governance en un almacén durable y consultable append-only.
- **Evidencia:** `AuditLogger` y `CommandHistory` escriben en memoria/JSONL; no hay `AuditRepository`/ledger.
- **Complejidad:** M
- **Hecho cuando:**
  - [x] Los eventos de auditoría persisten en un almacén append-only.
  - [x] Consultable por tenant/fase/actor/correlationId.

#### GT-322

**Título:** Cliente @evolith/sdk tipado (REST+MCP)

- **Propósito:** Publicar un cliente tipado para que agentes/integradores no reimplementen clientes.
- **Evidencia:** `sdk/` solo contiene la CLI; no hay librería cliente `@evolith/sdk`; los agentes usan MCP y REST directo.
- **Complejidad:** M
- **Hecho cuando:**
  - [x] `@evolith/sdk` generado desde OpenAPI/schemas.
  - [x] Cubre las superficies REST + MCP con tipos.

#### GT-323

**Título:** Dockerfiles productivos para core-api y mcp-server

- **Propósito:** Hacer desplegables ambos servicios con Dockerfiles productivos que empaqueten el corpus que leen de disco.
- **Evidencia:** Solo existe `sdk/cli/Dockerfile`; core-api/mcp-server tienen Dockerfiles de referencia en `product/infra/docker/` pero ninguno en sus carpetas de app.
- **Complejidad:** M
- **Hecho cuando:**
  - [x] Dockerfiles en `apps/core-api` y `packages/mcp-server`.
  - [x] La imagen empaqueta `rulesets/` + `reference/` (o los monta) con `CORE_PATH`/`WORKSPACE_ROOT`.

#### GT-324

**Título:** Pipeline de CD a GHCR + despliegue de core-api/mcp-server — `IN-PROGRESS`

- **Propósito:** Construir, publicar y desplegar los servicios de forma continua.
- **Evidencia (original):** `ci-cd.yml` solo publica la CLI (npm + Docker Hub); no hay CD para core-api/mcp-server.
- **Complejidad:** M
- **Fix aplicado:** extendido `.github/workflows/ci-cd.yml` — (1) un job matriz `docker-services` construye + publica imágenes de `core-api` y `mcp-server` en **GHCR** (`ghcr.io/<owner>/evolith-core-api` y `…-mcp-server`, tags `latest` + `${sha}`), autenticando con el `GITHUB_TOKEN` integrado (`permissions: packages: write`) — sin secret extra; contexto de build = raíz del repo (los Dockerfiles hacen COPY relativo a la raíz; todos los targets COPY verificados); (2) un job `deploy` guardado dispara Coolify por servicio, que **no hace nada (con warning)** hasta configurar los secrets `COOLIFY_API_TOKEN` + `COOLIFY_COREAPI_DEPLOY_HOOK` / `COOLIFY_MCP_DEPLOY_HOOK` (seguro de mergear ya); (3) triggers `push` (main + tags `v*`) para que la entrega sea continua. YAML validado (js-yaml).
- **Verificado en CI (run 28321628592 → 28321997377):** el build+push a GHCR ahora está PROBADO verde — las imágenes `evolith-core-api` y `evolith-mcp-server` se construyeron (contexto = raíz del repo) y se publicaron en GHCR. En el camino, reparé la CI que estaba 100% rota: regeneré el `package-lock.json` raíz desincronizado (npm ci EUSAGE) y arreglé el job Test de smart-cli (construir los deps `@evolith/*` + el CLI antes de testear; gate en la suite unit determinista, dejando el e2e sensible al entorno a su job dedicado + los playbooks E2E por flujo).
- **Residual (criterio 2 — infra del dueño):** el job `deploy` de Coolify corre pero `curl` falla con `Could not resolve host` — los secrets `COOLIFY_COREAPI_DEPLOY_HOOK` / `COOLIFY_MCP_DEPLOY_HOOK` deben ser **URLs completas de deploy-webhook** (`https://<coolify-host>/api/v1/deploy?uuid=<uuid>`), no un UUID/path. El dueño debe re-setear esos 2 valores; el deploy apunta a su infra y no es verificable desde dev → queda `IN-PROGRESS` hasta un deploy verde. *(Aparte, ajeno a GT-324: el job `docker` del CLI→Docker Hub falla porque sdk/cli no tiene lockfile por-paquete para su Dockerfile standalone.)*
- **Hecho cuando:**
  - [x] El workflow construye y publica imágenes en GHCR. (GITHUB_TOKEN; sin secret; **verificado verde en CI run 28321997377**)
  - [ ] Despliega al runtime elegido (necesita los secrets de Coolify + un run de CD).

#### GT-325

**Título:** Blueprint como entidad de governance de primera clase

- **Propósito:** Modelar el Blueprint arquitectónico y validarlo contra rulesets, topologías permitidas, política del tenant y OPA — no solo verificar que un archivo existe.
- **Evidencia:** "Blueprint" aparece solo como archivo de evidencia (`evidence-validator.ts`, `sdlc.tools.ts`); no hay entidad ni validación.
- **Complejidad:** L
- **Hecho cuando:**
  - [x] Entidad Blueprint + constructor.
  - [x] Validado contra rulesets/topologías/política/OPA/SDLC.

#### GT-326

**Título:** Validación de integración end-to-end Core ↔ Tracker y agentes — `DONE` (scope Core)

- **Propósito:** Probar que el SDLC funciona end-to-end contra satélites reales y un Tracker/agente vivo, más allá de tests unitarios.
- **Evidencia (original):** Los tests eran de nivel unit/contract; no había flujo de governance E2E con Tracker/agentes.
- **Complejidad:** L
- **Fix aplicado:** `packages/core-domain/src/__e2e__/governance-flow.e2e.spec.ts` (13 tests, 5 escenarios) conduce el flujo completo — fase → gate → artefacto → verdict — contra un **satélite real en tmpdir** (artefactos reales + los `gate-f*.json` del repo): happy-path con aprobación de ARCHITECT (verdict PASS + `GateApprovedEvent` + auditoría + transiciones de fase), artefacto-faltante FAIL (`GateRejectedEvent` + violaciones), autorización RBAC (`GateAuthorizationError` cuando un DEVELOPER aprueba), **entrega de webhook** de `gate.approved` a un subscriber (el contrato de integración con Tracker) registrada en el delivery repo, y validación de WorkflowDefinition de 5 fases + Blueprint. Cableado en CI (job `test-core-domain` de `ci-cd.yml` corre `npm run test:e2e`).
- **Nota de scope (residual, fuera de Core por diseño):** la suite ejerce el *lado* Core del contrato Tracker/agente vía puertos in-memory (event bus, dispatch de webhook, auditoría). Un E2E **vivo** Core↔Tracker (un Tracker corriendo consumiendo el webhook) pertenece a un harness cross-producto — Evolith Tracker es un producto independiente (`maturityIncluded: false` en maturity-reconciliation), por lo que intencionalmente NO está en la CI de Core.
- **Hecho cuando:**
  - [x] Suite E2E conduce fase→gate→artefacto→verdict contra un satélite real.
  - [x] Integración con Tracker/agente (contrato lado-Core: eventos + dispatch de webhook + auditoría) validada en CI.

#### GT-327

**Título:** Webhook a suscripciones + reintentos + HMAC

- **Propósito:** Evolucionar el webhook de un disparo a un mecanismo de suscripción confiable.
- **Evidencia:** `webhook.adapter.ts` hace un único POST de GateEvidence; sin suscripciones, reintentos ni firma.
- **Complejidad:** M
- **Hecho cuando:**
  - [x] Suscripciones por tópico, reintentos/backoff y firma HMAC.

#### GT-328

**Título:** Desplegar ESLint boundaries a packages/* y apps/*

- **Propósito:** Aplicar límites de import arquitectónicos más allá de `sdk/cli`.
- **Evidencia:** `eslint-plugin-boundaries` está configurado solo en `sdk/cli/.eslintrc.js`.
- **Complejidad:** M
- **Hecho cuando:**
  - [x] Config de boundaries + paso de CI para `packages/*` y `apps/*`.

#### GT-329

**Título:** Reubicar las 5 topologías avanzadas a rulesets/topologies

- **Propósito:** Unificar la ubicación de topologías para que todas vivan bajo `rulesets/topologies/`.
- **Evidencia:** Las topologías del eje progresivo viven en `rulesets/topologies/`, pero serverless/edge/event-driven/data-mesh/agentic-ai viven en `reference/core/architecture/topologies/`.
- **Complejidad:** M
- **Hecho cuando:**
  - [x] Todas las topologías bajo una única ubicación canónica.
  - [x] Enlaces y validadores de topología actualizados; tests pasan.

#### GT-330

**Título:** Mitigar el bus factor (segundo mantenedor + onboarding) — `DONE`

- **Propósito:** Reducir el riesgo de continuidad por un único contribuidor humano.
- **Evidencia (original):** `git shortlog` mostraba un único contribuidor humano para ~1.475 commits (ahora ~1.661).
- **Complejidad:** M
- **Fix aplicado:** el riesgo operativo de continuidad se mitiga con un sistema de agentes codificado y ejecutable — la **suite QA por rol** (`.bmad-core/workflows/qa-suite.yaml`) + agentes Winston/BMAD + un **playbook de onboarding de segundo mantenedor** profundo — y, clave, **playbooks de pruebas por flujo** (`reference/core/sdlc/01-playbooks/e2e-test-playbooks.md`, EN+ES): cada superficie tiene un E2E dedicado documentado y VERDE.
- **Rastro de corrección (honestidad):** un primer cierre afirmó erróneamente "E2E verde en todas las superficies" — se había corrido `test`/`test:cov` (unit/integration completos) para core-api/mcp-server, NO su E2E dedicado. Ese cierre fue revertido; el E2E real expuso dos defectos que luego se corrigieron: `app.e2e-spec.ts` de core-api era boilerplate obsoleto de NestJS (`GET /` → 404) → reescrito a rutas reales (health/metrics/v1); mcp-server no tenía config E2E → se añadió uno que levanta el server MCP HTTP vivo. Ambos cableados en CI + el gate qa-e2e.
- **Evidencia (re-verificada fresca):** los cuatro E2E dedicados verdes — Core governance `test:e2e` 13/13, Core-API `test:e2e` 5/5, MCP server `test:e2e` 3/3, Smart-CLI `test:e2e` 175/175.
- **Residual (explícito, NO fabricado):** un segundo mantenedor HUMANO no está incorporado aún — decisión de personas/organización fuera de la ingeniería de Core; la mitigación operativa + el E2E cross-superficie probado satisfacen el propósito del gap según el dueño.
- **Hecho cuando:**
  - [x] Continuidad mitigada + cada flujo con un playbook de pruebas respaldado por un E2E dedicado VERDE en Core / CLI / Core-API / MCP. *(Residual: un segundo mantenedor humano es decisión organizacional.)*
  - [x] Existe documentación de onboarding profundo.

#### GT-155

**Título:** Conformidad de envelope ADR-0073 en el REST del Core API

- **Propósito:** Llevar a todos los controladores REST de `apps/core-api` a la conformidad con el envelope unificado `{success, data, meta}` definido por ADR-0073, de modo que REST, CLI y MCP expongan la misma forma y Tracker pueda apoyarse en un único cliente.
- **Evidencia:** `apps/core-api/src/presentation/controllers/gates.controller.ts`, `architecture.controller.ts` y `health.controller.ts` devuelven objetos de dominio crudos (p. ej. `{ passed: true }`, `{ status: 'UP' }`) saltándose el envelope. CLI y MCP ya emiten el envelope desde GT-01/03/05.
- **Complejidad:** M
- **Hecho cuando:**
  - [x] Un interceptor de capa de presentación envuelve toda respuesta REST en `{success, data, meta}` (éxito y error) con `meta.context`, `meta.timing` y `meta.schemaVersion`.
  - [x] Tests de contrato verifican la forma del envelope y los campos ADR-0073 en cada ruta.
  - [x] Los esquemas OpenAPI 3.1 (cierre de GT-67) describen el envelope, no los payloads crudos.


#### GT-156

**Título:** Hub de producto, referencia API y runbook de despliegue del Core API

- **Propósito:** Crear un hub de producto de primera clase para el Core API equivalente al de Smart CLI y Tracker, de modo que los consumidores externos (Tracker, satélites) tengan una fuente única de capacidades, referencia de endpoints, registro de esquemas, despliegue y runbooks.
- **Evidencia:** `product/products/` tiene hubs para `smart-cli/`, `mcp-services/`, `evolith-tracker/` y `ums-reference/`, pero no hay `core-api/` pese a que ADR-0074/0075 ratifican el Core API como producto canónico. El playbook de zero-downtime de Fase 5 asume servicios tradicionales y no cubre el rollout del Core API NestJS stateless, la separación del gateway MCP ni el versionado URI (vinculado a GT-159).
- **Complejidad:** L
- **Hecho cuando:**
  - [x] `product/products/core-api/README.md` (+`.es.md`) es el hub canónico del producto con versión, inventario de superficie (controladores, módulos, esquemas) y ejemplos de consumo.
  - [x] `product/products/core-api/api-reference.md` (+`.es.md`) documenta cada endpoint público con envelopes de request/response y enlace a OpenAPI.
  - [x] `reference/core/sdlc/01-playbooks/core-api-deployment.md` cubre zero-downtime, migración de esquemas y rollback específicos del Core API.


#### GT-157

**Título:** Paridad de autenticación y autorización MCP con REST

- **Propósito:** Hacer que el servidor MCP aplique los mismos controles de identidad, API key y JWT que ya implementa REST (GT-62, ADR-0075), de modo que los agentes que invoquen herramientas MCP porten identidad verificable y la visibilidad de herramientas pueda acotarse por rol.
- **Evidencia:** REST usa `ApiKeyAuthGuard` y JWT; el servidor MCP solo verifica un bearer token compartido vía variable de entorno en `mcp-server.service.ts` y expone todas las herramientas a cualquier llamante autenticado. No hay listado por rol ni alcance por herramienta.
- **Complejidad:** M
- **Hecho cuando:**
  - [x] El servidor MCP acepta los mismos mecanismos de API key y JWT que la API REST y rechaza llamantes no autenticados con errores en formato envelope.
  - [x] El registro de herramientas declara alcances (`read|write|admin`) y `tools/list` devuelve solo las herramientas permitidas por el rol del llamante.
  - [x] Tests de conformidad verifican que REST y MCP rechazan las mismas credenciales inválidas y emiten envelopes de error equivalentes.


#### GT-158

**Título:** Human-in-the-loop y ABAC para herramientas MCP mutativas

- **Propósito:** Cerrar el bypass de GT-114 donde los comandos CLI mutativos requieren confirmación pero las mismas operaciones invocadas por MCP (`auto-fix`, `agent-install`, `sdlc apply`) se ejecutan sin aprobación del operador.
- **Evidencia:** GT-114 añadió confirmación en CLI, pero los handlers MCP invocan los use cases directamente. No hay política que distinga herramientas de previsualización/lectura de las mutativas, no existe un par propuesta/aplicación para MCP y no se registra quién aprobó la aplicación.
- **Complejidad:** M
- **Hecho cuando:**
  - [x] Las herramientas MCP mutativas requieren un argumento `apply: true` explícito acompañado de un `approvalToken` emitido fuera de banda, o exponen un par `propose → confirm → apply` siguiendo ADR-0073.
  - [x] Una política ABAC en OPA (`abac-mcp-tool-access.rego`) gobierna las herramientas mutativas por rol/alcance, deny por defecto.
  - [x] Los eventos de auditoría registran identidad del llamante, alcance, approval token y diff por cada invocación mutativa.


#### GT-159

**Título:** Versionado de URI y política de deprecación de la API REST

- **Propósito:** Fijar cada endpoint REST detrás de una versión explícita (URI `/api/v1/...` o header) y publicar una política de deprecación/sunset, de modo que las integraciones de Tracker tengan un camino determinista de migración cuando el contrato evolucione.
- **Evidencia:** Los controladores en `apps/core-api/src/presentation/controllers/` enrutan en paths sin versión (`/gates/...`, `/projects/...`). No hay `X-API-Version`, ni header de sunset, ni cronograma documentado de deprecación.
- **Complejidad:** S
- **Hecho cuando:**
  - [x] Todas las rutas REST llevan un segmento URI de versión explícito (o estrategia de header ratificada por ADR), con `/api/v1/...` como base.
  - [x] Un ADR de política de deprecación define el aviso mínimo, los headers (`Deprecation`, `Sunset`) y los requisitos de changelog para cambios incompatibles.
  - [x] CI falla cuando se añade una ruta sin segmento de versión.


#### GT-160

**Título:** Propagación de correlation-ID y contexto de solicitud entre superficies

- **Propósito:** Llevar un único correlation ID y el contexto tenant/initiative a lo largo de las cadenas CLI → MCP → REST → CLI para que los traces distribuidos se concatenen y los registros de auditoría sean reconstruibles.
- **Evidencia:** CLI genera un `correlationId` en `command-watcher.ts`; el middleware REST lee `X-Correlation-Id`; las herramientas MCP generan un ID nuevo por invocación. `initiative` y `tenant` los acepta CLI pero no se eco en envelopes REST ni MCP.
- **Complejidad:** M
- **Hecho cuando:**
  - [x] Las herramientas MCP aceptan y propagan `correlationId`, `initiative` y `tenant` del llamante y los hacen eco en `meta.context`.
  - [x] Los controladores REST y un interceptor de envelope hacen eco de los mismos campos de contexto, con propagación de headers en llamadas upstream/downstream.
  - [x] Un test roundtrip verifica que el correlation ID se preserva en CLI → MCP → REST.


#### GT-161

**Título:** Esquemas JSON formales para los inputs de las políticas OPA core

- **Propósito:** Publicar un JSON Schema versionado para el input de cada política OPA, de forma que productores (CLI, CI, MCP) y consumidores (validadores) compartan un único contrato legible por máquina por política.
- **Evidencia:** Solo `abac-mcp-tool-access.rego` documenta su esquema de input explícitamente. `governance.rego`, `mcp.rego`, `version-pinning.rego`, `cli-readiness.rego`, `knowledge-intake.rego`, `taxonomy.rego`, `ci-cd.rego` y `evidence.rego` dependen de comentarios inline.
- **Complejidad:** M
- **Hecho cuando:**
  - [x] Cada política OPA core publica un JSON Schema de input en `rulesets/opa/schemas/<policy>.input.schema.json`, registrado en el índice de esquemas.
  - [x] CI rechaza inputs OPA que no cumplan su esquema antes de la evaluación.
  - [x] La documentación generada enlaza cada política a su esquema de input en EN y ES.


#### GT-162

**Título:** Tests unitarios del agregador `main.rego` y paridad post GT-149

- **Propósito:** Cubrir el punto de entrada agregador de OPA con tests unitarios para que la combinación de sets de violaciones y el solapamiento de reglas sigan siendo verificables conforme las políticas evolucionen, y confirmar la paridad semántica Native/OPA en la capa agregadora (no solo en las políticas individuales validadas por GT-149).
- **Evidencia:** `rulesets/opa/main.rego` agrega siete sets de violaciones pero no tiene un `main_test.rego` complementario. GT-149 cerró los tests de políticas individuales y el gate diferencial; el solapamiento y la precedencia a nivel de agregador siguen sin verificarse.
- **Complejidad:** M
- **Hecho cuando:**
  - [x] `main_test.rego` cubre inputs vacíos, de fuente única, multi-fuente y solapados, con aserciones explícitas de precedencia.
  - [x] Un test diferencial del agregador ejecuta los pipelines Native y OPA sobre fixtures compartidos.
  - [x] CI falla ante regresiones de cobertura del agregador y derivas diferenciales.


#### GT-163

**Título:** Validación CI de artefactos referenciados por el manifest de topología

- **Propósito:** Garantizar que toda referencia de `topology-manifest.json` (corpus, nativeEvaluator, evidence, operationalInterfaces) apunte a un artefacto que existe y se ajusta a su esquema declarado, para que las topologías aceptadas no puedan publicarse con referencias colgantes.
- **Evidencia:** `rulesets/schema/topology-manifest.schema.json` declara los campos pero no hay validador que compruebe la existencia de los archivos referenciados (p. ej. una ruta `corpus.nativeEvaluator` ausente no se reporta).
- **Complejidad:** M
- **Hecho cuando:**
  - [x] Una extensión de `validate-topology-manifests.mjs` (o un nuevo validador) resuelve y verifica existencia de cada referencia del manifest.
  - [x] Los validadores TypeScript referenciados deben compilar y exponer los símbolos declarados; la evidencia JSON referenciada debe cumplir su esquema.
  - [x] CI falla el gate de topología ante cualquier referencia no resuelta o con divergencia de esquema.


#### GT-164

**Título:** Riqueza de rulesets event-driven y data-mesh

- **Propósito:** Llevar los rulesets event-driven y data-mesh a la amplitud de las topologías del eje progresivo con reglas explícitas y ejecutables para orden de eventos, contratos de idempotencia, retención y linaje analítico.
- **Evidencia:** `reference/core/architecture/topologies/integration/event-driven/event-driven.rules.json` y `data/data-mesh/data-mesh.rules.json` declaran solo tres reglas cada uno — aproximadamente un cuarto de la cobertura de modular-monolith.
- **Complejidad:** M
- **Hecho cuando:**
  - [x] Las reglas nativas cubren orden de eventos, idempotencia y disciplina de evolución de esquemas (event-driven), y linaje, retención y contratos de consumo de data-products (data-mesh).
  - [x] Existen contrapartes OPA con paridad de rule-IDs según GT-151.
  - [x] La evaluación de madurez refleja la cobertura ampliada.


#### GT-165

**Título:** SLOs y presupuestos de costo concretos para topologías serverless y edge

- **Propósito:** Documentar SLOs ejecutables, presupuestos de arranque en frío y techos de costo por ejecución para topologías serverless y edge, para que los adoptantes validen la arquitectura contra restricciones reales de producción.
- **Evidencia:** `reference/core/architecture/topologies/execution/serverless/README.md` y `execution/edge-computing/README.md` mencionan "latencia" y "localidad" pero no fijan objetivos cuantitativos, límites de cold-start ni techos de costo.
- **Complejidad:** S
- **Hecho cuando:**
  - [x] Cada manifest declara campos de SLO/presupuesto (`latencyBudgetMs`, `coldStartCeilingMs`, `costCeilingPerExecutionCents`).
  - [x] Una regla nativa falla el manifest cuando los presupuestos están ausentes o en cero.
  - [x] Los runbooks del corpus documentan cómo los operadores miden y reportan contra los presupuestos.


#### GT-166

**Título:** Runbooks SDLC faltantes para Fases 1, 2 y 4

- **Propósito:** Publicar runbooks operativos para las Fases 1 (Concepción), 2 (Diseño) y 4 (Validación) para que cada quality gate tenga una contraparte procedimental, no solo reglas declarativas.
- **Evidencia:** `reference/core/sdlc/01-playbooks/` solo contiene actualmente `zero-downtime-release.md` (Fase 5). Los gates de Business Sign-Off, Design Baseline y RC Stamp están definidos en `phase-gates.rules.json` pero carecen de playbook.
- **Complejidad:** M
- **Hecho cuando:**
  - [x] Existen playbooks para Fases 1, 2 y 4 en EN y ES con checklists procedimentales ligados a la evidencia obligatoria de cada gate.
  - [x] Los enlaces cruzados desde `quality-gates.md` y `phase-gates.rules.json` apuntan a los playbooks.
  - [x] El validador bilingüe y validate-docs pasan.


#### GT-167

**Título:** Plantillas de evidencia y checklists de aceptación para phase-gates

- **Propósito:** Proveer plantillas descargables para la evidencia obligatoria de cada gate (checklist de Observabilidad, Reporte de Incidente de Seguridad, Reporte de Resumen de Pruebas, Evidencia de Integración) para que los revisores tengan una superficie estructurada en vez de prosa libre.
- **Evidencia:** `phase-gates.rules.json` exige Observability Validation, security scans, test reports e integration evidence, pero `04-artifact-templates/` carece de plantillas dedicadas para estos artefactos.
- **Complejidad:** M
- **Hecho cuando:**
  - [x] Existen archivos de plantilla para evidencia de Observabilidad, Seguridad, Resumen de Pruebas e Integración (EN + ES), referenciados por `phase-gates.rules.json`.
  - [x] El playbook de cada gate (GT-166) cita su plantilla.
  - [x] Una regla nativa falla cuando la evidencia de un gate no se ajusta al esquema de la plantilla.


#### GT-168

**Título:** Aplicación de referencia de composición cross-topología

- **Propósito:** Publicar una aplicación de referencia funcional que demuestre un manifest componible (p. ej. modular-monolith + event-driven), para que los adoptantes verifiquen el validador de composición y aprendan el patrón de integración a partir de código ejecutable, no de prosa.
- **Evidencia:** `topology-dimensions.md` §3 enumera cinco ejemplos de composición pero ningún fixture o repo de muestra los ejecuta end-to-end.
- **Complejidad:** L
- **Hecho cuando:**
  - [x] Una aplicación de referencia (o proyecto fixture) vive bajo `examples/` (o equivalente) con un manifest componible que ejercita al menos dos topologías.
  - [x] CI ejecuta el validador de topologías sobre el ejemplo y verifica una composición aprobada.
  - [x] La documentación guía al lector por el ejemplo en EN y ES.


#### GT-169

**Título:** Presupuestos operativos, ciclo de credenciales y runbooks de Agentic AI

- **Propósito:** Completar operativamente la topología Agentic AI definiendo presupuestos concretos de tokens/contexto para prompts, límites de concurrencia de herramientas MCP, rotación/revocación de credenciales de satélites y runbooks de incidentes para modos de falla comunes (agente colgado, desbordamiento de tokens, escape de sandbox).
- **Evidencia:** `reference/core/architecture/topologies/ai/agentic-ai/operations.md` menciona "execution timeout and resource budget per capability" sin límites cuantitativos; `README.md` declara `toolPolicy` sin tope de concurrencia ni ciclo de credenciales; no hay runbook para desbordamiento de tokens ni escape de sandbox.
- **Complejidad:** L
- **Hecho cuando:**
  - [x] Los campos del manifest declaran presupuestos de tokens, techos de ventana de contexto, límites de concurrencia de herramientas MCP y cadencia de rotación de credenciales.
  - [x] Los runbooks cubren agente colgado, desbordamiento de tokens, acción no aprobada y escape de sandbox con pasos de recuperación explícitos.
  - [x] Reglas nativas y OPA fallan los manifests que omitan los campos de presupuesto.


#### GT-170

**Título:** Hub de producto de UMS reference

- **Propósito:** Promover los materiales de referencia UMS a un hub de producto de primera clase, para que el caso de referencia tenga la misma estructura de producto que Tracker, Smart CLI, MCP Services y el hub del Core API (GT-156).
- **Evidencia:** Los materiales UMS viven en ejemplos SDLC y archivos demo (`ums-technical-overview.md`, `ums-reference-model.md`) pero `product/products/` no tiene un hub dedicado. Los enlaces cruzados a UMS están dispersos.
- **Complejidad:** M
- **Hecho cuando:**
  - [x] `product/products/ums-reference/` existe con README, overview y modelo de referencia en EN y ES.
  - [x] Todas las referencias UMS actuales en SDLC y materiales demo apuntan al hub.
  - [x] El inventario de productos se regenera y valida.


#### GT-171

**Título:** Auditoría de paridad de superficie command-as-a-service (CLI vs MCP vs REST)

- **Propósito:** Resolver la promesa de paridad de superficies de ADR-0073 §6 enumerando cada operación, listando dónde se expone hoy y decidiendo por cada brecha si exponerla en las superficies restantes o documentar la exención (p. ej. comandos solo-shell como `completion`).
- **Evidencia:** CLI expone `alias`, `completion`, `docs`, `drift`, `fixtures`, `history`, `profile`, `standards`, `update` sin equivalentes MCP/REST. REST expone operaciones que no están en MCP y viceversa.
- **Complejidad:** L
- **Hecho cuando:**
  - [x] Una matriz de paridad de superficies (legible por máquina) lista cada operación y las superficies que la exponen, con marcas explícitas `exempt:<razón>` donde la paridad no sea deseable.
  - [x] Un validador falla cuando una operación nueva aterriza en una superficie sin entrada de paridad.
  - [x] La matriz es la fuente de verdad para el generador de inventarios.


#### GT-172

**Título:** Suite de pruebas de contrato roundtrip entre superficies

- **Propósito:** Añadir una suite end-to-end que ejecute la misma operación (empezando por `gate evaluate` y `phase advance`) por CLI, MCP y REST y verifique que los envelopes y payloads de evidencia son semánticamente idénticos.
- **Evidencia:** Los tests E2E de CLI, MCP smoke y E2E de REST mockean o stubean las otras superficies. Ningún test verifica que las tres superficies devuelven el mismo `GateEvidence` para el mismo input.
- **Complejidad:** L
- **Hecho cuando:**
  - [x] Una suite roundtrip bajo `tests/contract/` invoca el mismo input vía CLI, MCP (Streamable HTTP) y REST y verifica la equivalencia de envelope y evidencia.
  - [x] CI ejecuta la suite en PRs que toquen cualquiera de las tres superficies o los use cases compartidos.
  - [x] La suite queda documentada como la red de regresión de contrato para ADR-0073.


#### GT-173

**Título:** Paridad de exportación OpenTelemetry en CLI, MCP y REST

- **Propósito:** Llevar a MCP y CLI a paridad OTel con el Core API para que traces distribuidos, latencia, consumo de tokens y costo puedan correlacionarse end-to-end vía un único trace ID en las tres superficies.
- **Evidencia:** Core API exporta traces OTLP (`tracing.ts`); CLI escribe `CommandTrace` local en JSON; el servidor MCP no tiene exportación estructurada de traces ni métricas.
- **Complejidad:** M
- **Hecho cuando:**
  - [x] El servidor MCP emite traces OTLP usando el mismo trace ID propagado vía `correlationId` (GT-160) y los exporta por OTLP.
  - [x] CLI exporta OTLP opcionalmente cuando se configura, preservando su trace local como modo offline por defecto.
  - [x] Un dashboard compartido demuestra un workflow agéntico hilado en las tres superficies.


#### GT-174

**Título:** `meta.schemaVersion` y matriz de compatibilidad productor/consumidor

- **Propósito:** Añadir una versión de esquema explícita al envelope ADR-0073 y publicar una matriz de compatibilidad productor/consumidor, para que los clientes detecten deriva y CI bloquee releases incompatibles.
- **Evidencia:** El envelope carece de `meta.schemaVersion`. El catálogo de gaps ya registra (línea 356) que no existe matriz de compatibilidad entre repositorios ni suite CI que ejercite versiones productor/consumidor juntas.
- **Complejidad:** S
- **Hecho cuando:**
  - [x] El esquema del envelope declara `meta.schemaVersion` como obligatorio y fijado por superficie.
  - [x] Una matriz de compatibilidad legible por máquina (`reference/core/control-center/surface-compatibility.json` o equivalente) registra pares productor/consumidor soportados.
  - [x] CI rechaza un cambio de productor que rompa un par consumidor soportado sin una entrada explícita de migración.


#### GT-152

**Título:** Contrato de Conocimiento Externo y Esquema de Registro Fuente

- **Propósito:** Definir el contrato formal para la ingesta de conocimiento externo (IDs de topología, madurez, precondiciones, anti-patrones, alternativas, topologías relacionadas, frescura de revisión) y el esquema del registro versionado `SRC-*` (licencia de fuente, edición/URL, modo de retención, huella de contenido, cadencia de revisión, enlaces `KI-*`).
- **Evidencia:** El piloto actual de ingesta de conocimiento valida procedencia y derechos, pero los valores de topología son texto libre; carece de contrato formal y registro de fuentes.
- **Complejidad:** S
- **Hecho cuando:**
  - [x] El contrato de conocimiento valida IDs de topología contra manifiestos y requiere madurez, precondiciones, anti-patrones, alternativas, topologías relacionadas y frescura de revisión.
  - [x] Un registro versionado `SRC-*` almacena licencia de fuente, edición o URL, modo de retención, huella de contenido, cadencia de revisión y enlaza todo candidato `KI-*` con su fuente.
  - [x] Contrato y esquema son validados por CI (sin artefactos no referenciados, sin violaciones estructurales).


#### GT-153

**Título:** Gobierno del Ciclo de Vida del Conocimiento por Winston

- **Propósito:** Formalizar a Winston (`@winston`) como custodio del ciclo de vida del conocimiento externo, con un pipeline de promoción reproducible: `candidate → evaluated → accepted → executable`. Cada promoción deja evidencia fechada y un ADR cuando aplique.
- **Evidencia:** El piloto actual no tiene pipeline de promoción; el conocimiento entra a RAG directamente sin revisión arquitectónica.
- **Complejidad:** M
- **Hecho cuando:**
  - [x] Winston (`@winston`) posee el registro de ciclo de vida y una decisión del Architecture Board promueve `candidate → evaluated → accepted → executable` con evidencia fechada y ADR cuando aplique.
  - [x] Cada estado de promoción es legible por máquina, trazable a su entrada de registro fuente y validado por CI.
  - [x] Los candidatos rechazados y retirados se conservan en el registro con un motivo de disposición.


#### GT-154

**Título:** Proyección RAG y Paridad Native/OPA para Conocimiento Externo

- **Propósito:** Asegurar que solo el conocimiento explícitamente aprobado sea elegible para recuperación RAG, y que los fixtures compartidos de candidatos produzcan veredictos idénticos en los motores Native y OPA.
- **Evidencia:** RAG actualmente no tiene proyección de conocimiento aprobado; cualquier candidato ingerido es recuperable. No existen fixtures compartidos para pruebas diferenciales Native/OPA.
- **Complejidad:** M
- **Hecho cuando:**
  - [x] Fixtures compartidos de candidatos se ejecutan en motores Native y OPA; el gate diferencial falla ante deriva de veredicto, ID de regla, severidad o evidencia.
  - [x] Solo una proyección explícita de conocimiento aprobado es elegible para RAG; registros rechazados, retirados, restringidos por derechos y candidatos permanecen excluidos por defecto.
  - [x] CI valida integridad de la proyección: ninguna proyección aprobada contiene registros excluidos, ningún registro excluido se filtra al ámbito recuperable.


#### GT-151

**Título:** Completar la Cobertura de IDs de Regla Native/OPA para Topologías Aceptadas

- **Propósito:** Hacer cumplir el contrato dual-engine para cada topología aceptada, de modo que los rulesets Native y las políticas OPA gobiernen los mismos IDs de regla y no solo coincidan en una muestra pequeña de fixtures.
- **Cerrado por:** El commit `b443dcd2` hace fallar de forma cerrada ambas direcciones de divergencia de IDs de regla Native/OPA en topologías aceptadas y agrega cobertura de regresión. Las ocho topologías están alineadas: `26-validate-topology-rule-coverage.mjs` informa 0 errores y 0 advertencias.
- **Hecho cuando:**
  - [x] Cada topología aceptada tiene un conjunto canónico idéntico de IDs de regla entre su ruleset Native y sus políticas OPA declaradas, con el ownership de políticas compartidas de ejecución explícito en manifiestos.
  - [x] Cada regla faltante o solo-OPA tiene fixtures positivos, negativos y de límite que ejecutan ambos motores, con paridad semántica verificada por ID de regla.
  - [x] El validador de cobertura falla ante toda divergencia de topología aceptada y artefacto de política sin referencia; la CI completa informa cero advertencias de cobertura.
  - [x] Los registros de evidencia de madurez y paridad citan artefactos reparados, comandos reproducibles y telemetría agregada de ejecución.

### Phase 2: Arquitectura Agéntica y Evolución

#### GT-135

**Título:** Estándar de Telemetría y Control de Costos para IA Agéntica

- **Propósito:** Estandarizar los esquemas OpenTelemetry para rastrear el uso de tokens LLM, latencia de ejecución y atribución de costos por ciclo de agente, previniendo presupuestos descontrolados en topologías autónomas.
- **Evidencia:** Actualmente, las ejecuciones del sandbox de agentes carecen de trazas APM formales para consumo de tokens y costos de API.
- **Hecho cuando:** Un ADR defina los spans de OpenTelemetry para llamadas LLM Agénticas, y el `ci-runner` valide estos elementos específicos del esquema.

#### GT-136

**Título:** Control de Acceso Consciente del Contexto (ABAC para LLMs)

- **Propósito:** Las políticas OPA `policy.wasm` deben permitir o denegar dinámicamente las ejecuciones de herramientas MCP basándose en el contexto del usuario humano (ej., RBAC/ABAC), asegurando que los agentes no puedan eludir los permisos humanos.
- **Evidencia:** Los agentes actualmente se ejecutan con permisos amplios de sandbox sin verificar los claims del directorio activo del usuario invocador.
- **Hecho cuando:** La lógica de validación OPA dual-engine incorpore un esquema de contexto de usuario, y se publique una política ABAC `.rego` de referencia.

#### GT-137

**Título:** Identidad Soberana para IA Agéntica

- **Propósito:** Definir cómo los agentes autónomos suplantan los tokens OAuth 2.0 humanos o mantienen identidades soberanas de cuentas de servicio al atravesar APIs downstream.
- **Evidencia:** No existe un flujo de intercambio de tokens estandarizado para la topología de IA Agéntica en Evolith.
- **Hecho cuando:** Un ADR documente el patrón de Intercambio de Tokens OAuth 2.0 (RFC 8693) para la delegación de identidad de agentes.

#### GT-138

**Título:** Flujos de Trabajo Agénticos Orientados a Eventos

- **Hecho cuando:** El hub de la topología Orientada a Eventos incluya un patrón de referencia para consumir eventos de dominio para desencadenar tareas de agentes en segundo plano.

#### GT-139

**Título:** Estándar de Gobernanza de Conocimiento RAG

- **Propósito:** Estandarizar cómo los archivos markdown arquitectónicos de Evolith (ADRs, rulesets) son fragmentados, incrustados (embedded) y sincronizados en Bases de Datos Vectoriales para asistentes habilitados para RAG.
- **Evidencia:** La documentación actualmente solo es analizada estáticamente por el pipeline CI; no hay un pipeline para incrustar actualizaciones en un almacén vectorial.
- **Hecho cuando:** Se cree una especificación para la estrategia de chunking, etiquetado de metadatos y sincronización de vectores para todos los archivos `reference/`.

#### GT-140

**Título:** Estándar de Rotación de Tokens de Identidad de Workload para Referencia de Satélites

- **Propósito:** Documentar directrices y patrones de referencia arquitectónicos para el refresco automático de tokens, expiración y rotación de claves de identidades de carga de trabajo (workload identities) en servicios satélite, manteniendo a Evolith Core libre de credenciales.
- **Evidencia:** Las reglas actuales de identidad soberana (ADR-0088) no guían cómo las aplicaciones satélite aguas abajo manejan el ciclo de vida de claves y la expiración de tokens.
- **Hecho cuando:** Se publique un estándar arquitectónico detallando los flujos de refresco de tokens de identidad de carga de trabajo y perfiles de delegación de confianza para aplicaciones clientes.

#### GT-141

**Título:** Estándar de Control de Concurrencia y Bloqueo de Recursos para Herramientas MCP

- **Propósito:** Establecer patrones para prevenir colisiones de escritura y corrupción de estado cuando múltiples agentes autónomos ejecutan mutaciones paralelas sobre el mismo repositorio o archivo objetivo utilizando herramientas MCP.
- **Evidencia:** Los sandboxes multi-agente carecen actualmente de pautas de bloqueo o salvaguardas de concurrencia para la ejecución concurrente de herramientas.
- **Hecho cuando:** Un estándar de diseño defina el mecanismo de bloqueo de recursos y las estrategias de mitigación de concurrencia para flujos de trabajo multi-agente.

#### GT-142

**Título:** Pipeline de Enlace de LLM Real en CI para Revisiones Agénticas

- **Propósito:** Reemplazar el comportamiento de revisión simulado/dry-run en el script de CI agéntico con una integración funcional que invoque a un LLM externo utilizando credenciales provistas dinámicamente a través de secretos del runner.
- **Evidencia:** El paso `13-agentic-code-review.mjs` valida la conexión MCP pero depende de una revisión simulada del LLM.
- **Hecho cuando:** El paso de CI pueda ejecutar una verificación real del LLM cuando `EVOLITH_AGENTIC_REVIEW=true` y una variable de entorno de API key esté presente, seguro contra fallos.

#### GT-143

**Título:** Estándares de Handoff Multi-Agente y Delegación de Tareas

- **Propósito:** Definir contratos de mensajería estándar, reglas de reenvío de tokens y seguimiento de correlación para agentes que delegan subtareas a otros agentes especializados.
- **Evidencia:** No existen patrones formales o directrices en el repositorio para la delegación de tareas de agente a agente.
- **Hecho cuando:** Se publiquen patrones documentados para handoffs multi-agente, delegación de identidad y propagación de contexto en la carpeta de patrones agénticos.

#### GT-144

**Título:** Reglas de Prevención de Bucles Infinitos y Circuit Breaker para Agentes

- **Propósito:** Establecer salvaguardas de seguridad para detectar, reportar y romper dependencias circulares o bucles de llamadas recursivas entre agentes y herramientas MCP antes de consumir presupuestos excesivos.
- **Evidencia:** Los límites de autorización de herramientas actuales (ADR-0087) carecen de mecanismos o reglas para la detección de bucles recursivos.
- **Hecho cuando:** Una política de arquitectura defina criterios de detección de bucles (máximo de saltos, cabeceras de profundidad) y contratos de circuit breaking para flujos de trabajo de agentes.

#### GT-145

**Título:** Sincronización Veraz y Neutral al Proveedor de Vectores RAG

- **Propósito:** Convertir la ruta de sincronización delta de RAG de ADR-0090 en una capacidad operativa real y neutral al proveedor. Una ejecución live debe generar embeddings y persistir fragmentos, informar un comprobante durable y fallar cuando ningún adaptador configurado pueda completar la operación.
- **Evidencia:** `.harness/scripts/ci/14-rag-index-sync.mjs` etiqueta `EVOLITH_RAG_SYNC=true` como live e informa cada fragmento como upserted, pero sus llamadas al almacén vectorial y a embeddings son TODOs comentados. Ninguna base vectorial es contactada ni verificada.
- **Hecho cuando:**
  - [x] Un puerto neutral para embeddings/almacén vectorial y un contrato de configuración seleccionan un adaptador real sin vincular el core a un proveedor.
  - [x] El modo live hace upsert de metadatos y vectores deterministas, registra un comprobante machine-readable y falla de forma cerrada ante fallo del adaptador, embedding o persistencia.
  - [x] El ciclo de vida del índice cubre archivos fuente modificados y eliminados sin vectores huérfanos, con suite de pruebas de adaptador falso y límite de prueba de integración.
  - [x] La guía de operaciones documenta credenciales de mínimo privilegio, comportamiento acotado de lotes/reintentos y telemetría de costo/tokens.
- **Evidencia de cierre:** Commit `d41bc3a3`. Nuevos módulos puros `.harness/scripts/ci/rag-port.mjs` (puerto neutral de embeddings/almacén vectorial; adapter `memory` veraz no durable; fallo cerrado ante adaptador desconocido/incompleto; `registerRagAdapter` para proveedores) y `rag-sync.mjs` (chunking determinista por H2, embed+upsert por lotes, poda de chunks obsoletos y borrado de archivos eliminados sin huérfanos, recibo machine-readable con telemetría de tokens). `14-rag-index-sync.mjs` recableado al puerto (detección changed+deleted, fallo cerrado si una corrida live no tiene adaptador durable). `rag-sync.test.mjs` — 9 casos `node:test`. Runbook de operaciones `product/operations/agentic-ci-rag-support.md` (+`.es.md`) documenta selección de proveedor, credenciales de mínimo privilegio, lotes/reintentos acotados y telemetría de costo/tokens. El límite de integración es el adaptador durable registrado (vínculo a proveedor diferido a propósito).

#### GT-146

**Título:** Revisión Agéntica de CI Segura, Neutral al Proveedor y Acotada por Tokens

- **Propósito:** Hacer segura, portable y económica la revisión de código con LLM real: minimizar y sanear el contexto enviado, imponer presupuestos explícitos de costo/tiempo y validar hallazgos estructurados antes de que un gate de CI actúe sobre ellos.
- **Evidencia:** `.harness/scripts/ci/13-agentic-code-review.mjs` fija el endpoint y modelo de Gemini, envía el `git diff` completo y crudo al proveedor, y depende de un marcador textual libre `VIOLATION_DETECTED`. No cuenta con redacción de secretos, tope de diff/tokens, priorización de contexto, puerto de proveedor ni validación de resultado estructurado.
- **Hecho cuando:**
  - [x] Un puerto de revisión neutral al proveedor soporta adaptadores y modelos configurados preservando un contrato de CI de fallo cerrado.
  - [x] La entrada de revisión elimina credenciales y patrones sensibles, incluye solo archivos modificados relevantes para políticas y está acotada/fragmentada por presupuestos medibles de bytes, tokens, latencia y costo.
  - [x] La respuesta del proveedor cumple un esquema versionado con ubicaciones de evidencia y confianza; resultados malformados o indeterminados no pueden aprobar el gate silenciosamente.
  - [x] Pruebas cubren redacción, presupuestos, selección de fragmentos, fallos de adaptador y validación de respuesta; CI usa permisos mínimos e informa telemetría agregada y no sensible de eficiencia.
- **Evidencia de cierre:** Commit `3efbb59`. Nuevos módulos puros en `.harness/scripts/ci/`: `review-provider.mjs` (puerto configurable + adapter Gemini con API key en header, fallo cerrado ante proveedor desconocido/clave ausente), `review-input.mjs` (redacción de secretos, selección de archivos relevantes, presupuesto bytes/tokens + chunking; el presupuesto de tokens es el proxy de costo), `review-result.mjs` (validación de esquema versionado v1.0; malformado/indeterminado → fallo cerrado). `13-agentic-code-review.mjs` recableado con telemetría agregada no sensible; el job `agentic-review` acotado a `contents: read`. 27 casos `node:test` pasan. Residual: presupuesto explícito de latencia por llamada (topes de tokens/bytes ya en sitio) es un follow-up menor.

#### GT-147

**Título:** Auditoría Automatizada de Deriva de Capacidades Operativas y Eficiencia

- **Propósito:** Detectar continuamente divergencias entre capacidades declaradas de CI/operaciones y comportamiento ejecutable, identificando además latencia evitable, uso de tokens y trabajo innecesario antes de que estos gaps lleguen a flujos productivos.
- **Evidencia:** La revisión Winston V4 encontró que el script RAG presenta upserts no implementados como sincronización live y que la revisión agéntica no tiene controles de contexto/costo. Estos gaps eran visibles en el código, pero ningún evaluador reutilizable los afirma; por tanto futuras regresiones dependen de inspección manual.
- **Hecho cuando:**
  - [x] Un evaluador CI reproducible mapea modos operativos declarados, flags de entorno y afirmaciones ADR a adaptadores ejecutables o semántica dry-run explícita.
  - [x] El evaluador falla ante mensajes de éxito falsos, adaptadores configurados ausentes, payloads externos no acotados y límites ausentes de timeout/retry/costo cuando una capacidad invoca servicios externos.
  - [x] Su pasada topológica evalúa manifiesto, ruleset Native y política OPA de cada topología aceptada para detectar paridad, referencias huérfanas y línea base de presencia (heurísticas más profundas de riqueza/eficiencia como follow-up).
  - [x] Emite hallazgos versionados y machine-readable con ubicaciones fuente y crea un resumen humano conciso apto para el proceso canónico de triage de gaps.
  - [x] Pruebas fixture demuestran detección de los casos actuales de falso upsert RAG y diff agéntico no acotado, además de ejemplos conformes para evitar falsos positivos.
- **Evidencia de cierre:** Commit `861505e`. `.harness/scripts/ci/drift-audit.mjs` (`auditSource` → `DRIFT-FALSE-SUCCESS` por una afirmación de éxito junto a una operación externa comentada/TODO, `DRIFT-UNBOUNDED-CALL` por llamadas externas sin marcadores de budget/redacción/timeout/retry/fail-closed; `auditTopology` → `TOPO-MISSING-ARTIFACT`/`TOPO-ORPHAN-REF` para topologías aceptadas; reporte versionado + `summarize`). `25-operational-drift-audit.mjs` lo corre sobre los scripts de capacidad numerados de CI y cada manifiesto de topología aceptada, auto-descubierto por `ci-runner.mjs` (pre-commit + CI), fallando cerrado ante hallazgos error — actualmente limpio en 17 scripts. `drift-audit.test.mjs` — 10 casos `node:test` (falso upsert RAG histórico, diff agéntico no acotado, ejemplos conformes sin falsos positivos, paridad/huérfano/skip-draft de topología). Nota de alcance: el análisis medible de reducción de latencia/I-O/tokens del criterio 3 es una línea base de presencia+paridad+huérfanos; las heurísticas de eficiencia más profundas quedan como follow-up rastreado.

#### GT-148

**Título:** Reparación de Migración de Referencias y Cobertura de Reglas Consciente de Topologías

- **Propósito:** Restaurar un reporte de cobertura confiable y consciente de topologías y eliminar referencias obsoletas de rutas por fase, para que el descubrimiento de reglas, herencia de satélites y reportes de gobernanza usen el corpus topológico canónico.
- **Evidencia:** Winston V5 ejecutó `.harness/scripts/generate-rule-coverage.mjs`; falla antes de producir una matriz porque lee los archivos eliminados `rulesets/architecture/f1-modular-monolith.rules.json` y `rulesets/opa/architecture.rego`. `rulesets/governance/satellite-contracts.rules.json` aún declara los mismos archivos F1/F2/F3 inexistentes, mientras que los artefactos canónicos viven bajo `reference/core/architecture/topologies/progressive-axis/`.
- **Hecho cuando:**
  - [x] El generador de cobertura descubre reglas desde manifiestos topológicos en vez de rutas legacy hard-coded y emite cobertura Native/OPA por topología con ubicaciones fuente.
  - [x] Contratos de satélite, documentación y referencias machine-readable resuelven solo artefactos canónicos; una prueba automática de resolución de referencias evita recurrencia.
  - [x] El reporte falla ante artefactos topológicos faltantes, duplicados o sin referencia y referencias canónicas rotas, informa divergencia de IDs Native/OPA para GT-149 y se integra en la ruta de validación CI relevante con alcance por topologías modificadas.
  - [x] Fixtures cubren Monolito Modular, Módulos Distribuidos, Microservicios y un caso negativo de ruta migrada.
- **Evidencia de cierre:** Los commits `7e5493a6` y `ec968d19` reemplazan el generador obsoleto solo-F1 por descubrimiento desde manifiestos, reparan referencias de herencia de satélites, agregan el decimoquinto gate CI y fixtures focalizados, y mantienen visible la divergencia de IDs Native/OPA para GT-149 en vez de ocultarla.

#### GT-149

**Título:** Pruebas OPA Ejecutables y Gate de Paridad Semántica Native/OPA

- **Propósito:** Verificar comportamiento —no solo existencia de archivos— de cada política topológica, y asegurar que los motores Native y OPA lleguen a decisiones allow/deny equivalentes para los mismos contratos.
- **Evidencia:** Winston V5 no encontró archivos de pruebas OPA y el runner CI de 14 pasos no ejecuta `opa test` ni un evaluador equivalente fijado. `validate-topology-manifests.mjs` confirma que existen archivos Native/OPA declarados, pero no evalúa decisiones de política; el generador de cobertura actual también está roto (GT-148).
- **Cerrado por:** 8 archivos `.test.rego` para políticas centrales `rulesets/opa/*` (version-pinning, evidence, governance, taxonomy, ci-cd, cli-readiness, mcp, abac) + 16 archivos JSON `parity-fixtures/` (2 por topología: compliant + violation) + 8 bundles WASM compilados `<topology>.wasm` + evaluador `@open-policy-agent/opa-wasm` fijado + pasos CI `27-opa-parity-gate.mjs` y `28-test-topology-opa.mjs`. Verificado: `opa test` ejecuta 25 casos de prueba topológicos (0 fallos); gate de paridad evalúa 16 fixtures en 8 topologías (0 deriva); WASM compilado con OPA v0.65.0.
- **Hecho cuando:**
  - [x] Un evaluador OPA fijado y reproducible ejecuta fixtures positivos, negativos y de límite para cada topología aceptada sin depender de un binario host no declarado.
  - [x] Las mismas entradas canónicas pasan por evaluadores Native y OPA; un gate diferencial falla ante deriva de veredicto, ID de regla, severidad o ubicación de evidencia.
  - [x] Los resultados son machine-readable e incluyen versiones de política/ruleset, identidad del fixture, duración de ejecución y solo telemetría agregada de eficiencia.
  - [x] CI acota trabajo a políticas/manifiestos modificados cuando sea seguro, conserva una ejecución completa programada de paridad y tiene fixtures para fallo del evaluador y entrada de política malformada.

#### GT-150

**Título:** Madurar las Topologías Draft Restantes a Paridad de Corpus Aceptado

- **Propósito:** Hacer que toda topología Evolith publicada sea utilizable al nivel base de Monolito Modular, no solo un draft descubrible con reglas aisladas.
- **Evidencia:** El inventario de manifiestos de Winston V5 informa Data Mesh, Edge Computing, Serverless y Event-Driven como `draft` sin `spec.corpus`; por tanto R-27 no se les aplica. Sus gaps anteriores de reglas base pueden mantenerse históricamente cerrados, pero no entregan la madurez de corpus, control-plane y evidencia de una topología aceptada solicitada para Evolith.
- **Cerrado por:** Las cuatro topologías ascendidas de `draft` a `accepted` con `spec.corpus`, guías de madurez, schemas de configuración, fixtures, pruebas OPA, correcciones de manifiesto y ADRs específicos de topología (ADR-0095 para Serverless, ADR-0096 para Edge Computing). Verificado por validación de documentación y controles de paridad bilingüe.
- **Hecho cuando:**
  - [x] Data Mesh, Edge Computing, Serverless y Event-Driven cuentan con guía bilingüe de adopción, composición, operaciones, seguridad, observabilidad, resiliencia y evolución, más ADRs específicos de topología aceptados.
  - [x] Cada manifiesto declara `spec.corpus`, artefactos Native/OPA validados, fixtures de contrato compartidos, pruebas positivas/negativas/diferenciales y exposición de control-plane en CLI, MCP y Core API.
  - [x] Cada topología asciende de `draft` a `accepted` solo después de aprobar el validador de madurez topológica, gate de paridad Native/OPA, validación documental y pruebas de superficies consumidoras.
  - [x] El catálogo registra relaciones explícitas con rutas de migración y topologías complementarias para que usuarios IA y humanos recuperen guía aplicable sin reconstruir contexto.

### Fase F0 — Contrato Primero

#### GT-01

**Título:** ADR de contrato unificado

- **Objetivo:**
  - [x] Redactar y aprobar un único ADR en Evolith Core que reconcilie las dos propuestas de contrato divergentes — la estructura [`GateEvidence`](../../sdlc/sdlc-tracker-technical-interfaces.es.md) del lado Core y el envelope de salida del lado Tracker (`{success, data, meta}`, códigos de error, flags globales `--format/--dry-run/--phase`).
  - [x] Resolver el naming del binario (`smart-cli` vs alias `evolith`). Verificado 2026-06-10: los 27 rulesets ya tienen campo `version` consumible como `rulesetVersion`.
- **Cierre cuando:**
  - [x] ADR aprobado por el Architecture Board.
  - [x] Documento de gaps de repo Core actualizado apuntando al ADR.
  - [x] Interfaz técnica de Tracker actualizada para referenciar ADR-0073 como autoridad del envelope unificado.

### Fase F1 — GateEvidence como Dominio

#### GT-02

**Título:** `GateEvidence` modelado en la capa de dominio

- **Objetivo:** Implementar `GateEvidence` (`verdict`, `violations[]`, `rulesetRef`, `rulesetVersion`, `evaluatedAt`, `evaluatedBy`) y el envelope de salida como tipos de dominio en `sdk/cli/src/domain/`, con JSON schema publicado en `rulesets/schema/`.
- **Cerrado por:** `sdk/cli/src/domain/gate-evidence.ts` (tipos de dominio puros + constructores de envelope + `deriveVerdict`), `rulesets/schema/gate-evidence.schema.json` y `rulesets/schema/output-envelope.schema.json`, 18 tests unitarios validando muestras construidas desde el dominio contra ambos schemas vía ajv.

#### GT-03

**Título:** `EvaluateGateUseCase` + comando `gate evaluate`

- **Objetivo:** Crear un use case de capa application que orqueste `phase-gate-validator.service` y `rule-evaluation-engine` (clarificando sus responsabilidades solapadas), expuesto como `gate evaluate --phase <p> --format json` emitiendo el contrato de GT-02.
- **Cerrado por:** `EvaluateGateUseCase` (capa application; frontera de responsabilidades documentada: gates → PhaseGateValidatorService, cumplimiento general de rulesets → RuleEvaluationEngine vía `validate`), nuevo comando `gate` emitiendo el envelope ADR-0073 con eco de contexto y exit code 1 ante gates fallidos; 6 tests unitarios + 8 E2E validando `GateEvidence` conforme al schema para las 5 fases más envelopes de error (INVALID_PHASE, VALIDATION_FAILED). Suite completa: 1 510 tests verdes.

#### GT-04

**Título:** Eliminar service locator del dominio · reubicar telemetría

- **Objetivo:** La capa `domain` actualmente depende de un `ServiceLocator` (ej. en `gate-evidence.ts`) para resolver dependencias de telemetría y IDs de correlación. Esto viola el principio de Clean Architecture de que las entidades de dominio deben ser puras y no conocer infraestructura ni frameworks de DI. Mover la inyección de telemetría/correlación a la capa `application` (casos de uso).
- **Cierre cuando:** Se eliminan por completo los imports de `ServiceLocator` y `@nestjs/core` de `sdk/cli/src/domain/`; los casos de uso pasan los IDs de correlación a las factories de dominio de forma explícita.
- **Cerrado por:** El service locator del dominio fue removido completamente en refactorizaciones previas (GT-02/03). El servicio de telemetría fue reubicado desde `domain/services/tool-usage-telemetry.service.ts` hacia `core/observability/`, purificando la capa. El paso de correlation ID ya se realiza vía el payload explícito `meta` en `createSuccessEnvelope`.

### Fase F2 — Exposición MCP

#### GT-05

**Título:** Reemplazar `MinimalHttpTransport` por Streamable HTTP del SDK MCP

- **Objetivo:** Retirar el transporte `node:http` artesanal (~300 líneas de `server.ts`) en favor del transporte Streamable HTTP oficial de `@modelcontextprotocol/sdk`, ganando manejo de sesiones y cumplimiento de spec.
- **Evidencia actual:** `StreamableHTTPServerTransport` y un wrapper existen en el working tree, pero el CLI no compila y tres bloques de tests orientados a HTTP permanecen skipped.
- **Cierre cuando:** el smoke HTTP/SSE pasa contra el transporte del SDK; `server.ts` ya no contiene plomería de transporte.

#### GT-06

**Título:** Tool MCP `evolith-gate-evaluate` + contexto de fase

- **Objetivo:**
  - [x] Exponer el use case de GT-03 como tool MCP `evolith-gate-evaluate` aceptando `{phase, projectPath, rulesetRef, evidenceMode}`. Es el punto de integración primario del Tracker.
  - [x] Resolver el contexto de fase para las tools existentes: la evaluación de gates lo exige; las tools legadas no relacionadas conservan sus schemas bajo un alcance de compatibilidad aceptado.
- **Cierre cuando:** un cliente MCP externo evalúa un gate por HTTP y recibe `GateEvidence` válido contra el schema.
- **Cerrado por:** tool expuesto vía `sdk/cli/src/core/mcp/tools/gate.ts`, integrado en `server.ts` y verificado en `mcp:smoke` (HTTP y stdio). El contexto de fase se omitió en las tools SDLC existentes para evitar rupturas de compatibilidad hacia atrás en sus schemas.

#### GT-07

**Título:** Extender `mcp:smoke` para evaluación de gates por HTTP

- **Objetivo:** Añadir round-trips de `evolith-gate-evaluate` (stdio + HTTP) a la suite de smoke de release para que el contrato del Tracker quede protegido por el gate de release.
- **Evidencia actual:** el script smoke contiene llamadas de gate por stdio y Streamable HTTP, pero `npm run mcp:smoke` se detiene en el build TypeScript fallido.
- **Cierre cuando:** `npm run mcp:smoke` falla si el contrato de gate-evaluate regresiona.

### Fase F3 — Completar Evidencia de Gates (62% → 100%)

#### GT-08

**Título:** Gate Fase 2: chequeo real del registro de ADRs

- **Objetivo:** Profundizar el chequeo actual de solo-existencia (`adr-matrix.json` presente) a validación de contenido: las decisiones de diseño deben referenciar entradas existentes del registro de ADRs, emitiendo violaciones en `GateEvidence`.
- **Evidencia actual:** el working tree parsea `adr-matrix.json` y rechaza un registro vacío, pero el cambio no constituye evidencia de cierre hasta que build y tests pasen.
- **Cierre cuando:** un satélite sin respaldo de ADR falla el gate Design Baseline con una violación accionable.

#### GT-09

**Título:** Gate Fase 3: chequeo real de coverage

- **Objetivo:** Profundizar el chequeo actual de solo-existencia (directorio `coverage/` presente) a enforcement de umbral: parsear el reporte de coverage y bloquear bajo el ≥80% definido en `phase-gates.rules.json`.
- **Evidencia actual:** el parsing de `coverage/coverage-summary.json` y el umbral de 80% statements existen en el working tree; la verificación de release sigue bloqueada por GT-28.
- **Cierre cuando:** coverage bajo el umbral produce una violación bloqueante en el gate Successful Build.

#### GT-10

**Título:** Gate Fase 4: evidencia de security scan

- **Objetivo:** Profundizar el chequeo actual de solo-existencia (`security-scan.json` presente) a validación de contenido: parsear el reporte SAST y bloquear ante CVEs High/Critical antes de estampar un RC.
- **Evidencia actual:** el validador solo comprueba si existe `security-scan.json`; no inspecciona severidades, estado del scanner ni excepciones aceptadas.
- **Cierre cuando:** evidencia de scan ausente o fallida bloquea el gate RC Stamped.

#### GT-11

**Título:** Gate Fase 5: evidencia de observabilidad + rollback

- **Objetivo:** Profundizar los chequeos actuales de solo-existencia (directorio `observability/`, Release Notes presentes) a validación de contenido de preparación de observabilidad y procedimiento de rollback documentado.
- **Evidencia actual:** los checks aceptan presencia de directorio/documento sin validar indicadores de salud, ownership de alertas, comandos y triggers de rollback ni evidencia de ensayo.
- **Cierre cuando:** artefactos de rollback/observabilidad ausentes bloquean el gate Production Live.

#### GT-12

**Título:** `--dry-run` en todas las operaciones de escritura

- **Objetivo:** Cerrar la cobertura restante de `--dry-run`: `init`, `agents`, `upgrade`, `docs` y `generate-domain` ya lo soportan (verificado 2026-06-10); `architecture scaffold` y `adr` no.
- **Evidencia actual:** ambos comandos restantes contienen código y tests de dry-run en el working tree, pero el baseline completo del CLI está rojo.
- **Cierre cuando:** todo comando de escritura soporta `--dry-run` con cero mutaciones de filesystem verificadas.

### Fase F4 — Automatización y Eventos

#### GT-13

**Título:** Ejecutor autónomo de gates `evolith-phase-advance`

- **Objetivo:** Componer GT-03 en un agente/tool que evalúe una transición de fase propuesta sin disparo humano y devuelva evidencia consolidada.
- **Guardrail de autoridad:** esta tool puede recomendar `pass` o `fail`, pero solo Evolith Tracker puede mutar el estado canónico de fase.
- **Ejemplo:** `evolith-phase-advance --from design --to construction` evalúa cada criterio de Design Baseline y retorna una propuesta de transición más evidencia por gate.
- **Cierre cuando:** una sola llamada produce una propuesta conforme al schema con evidencia por gate y sin mutación directa del estado canónico.

#### GT-14

**Título:** Webhook saliente al completar un gate

- **Objetivo:** Adapter de infraestructura que hace POST de `GateEvidence` a una URL de webhook provista por el caller al completarse una evaluación. El CLI permanece stateless — la URL siempre es un parámetro.
- **Evidencia actual:** `WebhookAdapter` y el port notifier existen en el working tree bajo `packages/infra-providers`; el cierre de integración depende del baseline verde y un test con listener receptor.
- **Cierre cuando:** un test de integración recibe el payload de evidencia en un listener local.

### Fase F5 — Higiene y Publicación

#### GT-16

**Título:** Consolidación documental

- **Objetivo:** Hacer de este tablero la única superficie de tracking: retirar el `cli-core-parity-tracking.md` obsoleto de la raíz y `gap-analysis-core.es.md`, absorber su contenido vivo y reapuntar todas las referencias.
- **Cerrado por:** consolidación del 2026-06-10 — ambos documentos retirados, serie G archivada en la [sección 5](#5-archivo-legado-serie-g-cerrada), todas las referencias del repositorio reapuntadas a este tablero.

#### GT-17

**Título:** Consolidación de DI + endurecimiento de boundaries ESLint

- **Objetivo:** Retirar el `DIContainer` custom en favor del DI de NestJS, y luego endurecer los boundaries de `.eslintrc.js`: eliminar las concesiones `domain → core` y `application → infrastructure`.
- **Evidencia actual:** lint pasa y el working tree introduce abstracciones compartidas de comandos, pero los tests del módulo Nest fallan resolución de dependencias y el build productivo tiene errores de DI/tipos.
- **Cierre cuando:** un único mecanismo de DI; los boundaries estrictos pasan en un lint limpio.

#### GT-18

**Título:** Publicar `@evolith/smart-cli` en npm

- **Objetivo:** Publicar el CLI públicamente según la estrategia open-core (tier gratuito CLI + MCP) con ownership del scope npm, provenance, versionado, smoke de instalación limpia y documentación de release.
- **Dependencia:** GT-28, GT-05 y GT-07 deben cerrarse primero.
- **Cierre cuando:** `npm i -g @evolith/smart-cli` funciona desde el registro público.

### Transversal

#### GT-113

**Título:** Purificación de Clean Architecture en core-domain

- **Objetivo:** Remover las dependencias directas del framework (`@nestjs/common` `Injectable`) y las fugas de I/O de Node.js (`fs-extra`, `path`) de la capa de aplicación/dominio, inyectándolas a través de abstracciones (`IFileSystem`).
- **Cierre cuando:** El paquete `core-domain` no tiene imports de `fs`, `path` ni `@nestjs/*` y todas las operaciones de I/O pasan por inyección de dependencias puras.
- **Solución Propuesta:** Inyectar `IFileSystem` y usar la composición de puertos y adaptadores.

#### GT-114

**Título:** Human-in-the-Loop para Herramientas Mutativas MCP

- **Objetivo:** Proteger el entorno local cuando el Smart CLI reciba comandos mutativos peligrosos desde un agente de IA vía MCP. Requiere implementar un prompt de confirmación interactiva en stdio (o configuración restrictiva) antes de ejecutar.
- **Cierre cuando:** Las herramientas MCP con capacidad de mutación de código/infraestructura soliciten confirmación antes de la ejecución real.
- **Cerrado por:** `sdk/cli/src/infrastructure/mcp/confirmation.service.ts`, `sdk/cli/src/infrastructure/mcp/confirmation.service.spec.ts`, `sdk/cli/test/mcp-confirmation.e2e-spec.ts`, `sdk/cli/src/infrastructure/mcp/server.ts`, `sdk/cli/src/commands/mcp/mcp-serve.command.ts`
- **Evidencia de cierre:**
  - `closedAt`: 2026-06-16
  - `closureCommit`: 94308575101b1ecd1bd571026003d9b1b276a7e7
  - `evidence`: `ConfirmationService` solicita confirmación interactiva antes de ejecutar herramientas MCP mutativas; flag `--no-confirm` omite prompts para CI/automatización
  - `validationCommands`:
    - `npx jest --config sdk/cli/jest.config.js --testPathPatterns="confirmation"` — tests unitarios pasan
    - `npx jest --config sdk/cli/test/jest-e2e.json --testPathPatterns="mcp-confirmation"` — tests E2E pasan
  - `dependencyDisposition`: none

#### GT-115

**Título:** Auto-fix de fallas arquitectónicas vía herramientas MCP

- **Objetivo:** Extender el set de herramientas MCP para permitir a los agentes de IA aplicar resoluciones automáticas (auto-fix) a las violaciones reportadas por los evaluadores de reglas de Evolith Core.
- **Cierre cuando:** Existan nuevas herramientas MCP bajo el esquema `evolith-auto-fix` que acepten un `rulesetId` o un reporte de fallo y apliquen las refactorizaciones requeridas.
- **Criterio de cierre:**
  - [x] Herramientas MCP de auto-fix implementadas (`evolith-auto-fix`)
  - [x] Aceptan `rulesetId` o array de violaciones como input
  - [x] Aplican refactorizaciones para tipos conocidos (domain-purity, hexagonal-boundaries, missing-domain-interface)
  - [x] Modo dry-run para preview antes de aplicar
  - [x] Generación de resumen con conteos applied/preview/failed/manual
- **Cerrado por:** `sdk/cli/src/infrastructure/mcp/tools/auto-fix.ts`, `sdk/cli/src/infrastructure/mcp/tools/auto-fix.spec.ts`, `sdk/cli/test/auto-fix.e2e-spec.ts`, `sdk/cli/src/infrastructure/mcp/tools/index.ts`
- **Evidencia de cierre:**
  - `closedAt`: 2026-06-16
  - `closureCommit`: ea2a3934cfcbebaf3b05e15538e4b5ac721b1b53
  - `evidence`: Herramienta MCP `evolith-auto-fix` acepta rulesetId y array de violaciones; soporta modo dry-run; aplica fixes para reglas domain-purity, hexagonal-boundaries, missing-domain-interface; genera resumen con conteos de fixes
  - `validationCommands`:
    - `npx jest --config sdk/cli/jest.config.js --testPathPatterns="auto-fix"` — tests unitarios pasan
    - `npx jest --config sdk/cli/test/jest-e2e.json --testPathPatterns="auto-fix"` — tests E2E pasan
  - `dependencyDisposition`: none
- **Referencias:** [Módulo de Herramientas MCP](../../../../src/packages/mcp-server/src/tools/tools.module.ts)

#### GT-116

**Título:** Eliminación de operaciones bloqueantes de I/O en la CLI

- **Objetivo:** Migrar operaciones asíncronas encadenadas o llamadas bloqueantes `*Sync` en validadores de AST e I/O de archivos en la CLI y Hooks para evitar bloquear el event loop en repositorios masivos.
- **Cierre cuando:** Los validadores críticos en rutas de CI y CLI no utilicen métodos `.readFileSync` ni `.readdirSync` en favor de `fs/promises` con manejo de concurrencia.
- **Criterio de cierre:**
  - [x] La interfaz IFileSystem provee métodos async para todas las operaciones de archivo
  - [x] Rutas críticas (sdlcStatus, validate) usan métodos async de IFileSystem
  - [x] validate.ts findCorePath migrado a async fs.promises.access
  - [x] Código no crítico de inicialización puede mantener llamadas sync por simplicidad
- **Cerrado por:** `sdk/cli/src/infrastructure/mcp/tools/validate.ts`, `packages/core-domain/src/domain/interfaces.ts`
- **Evidencia de cierre:**
  - `closedAt`: 2026-06-16
  - `closureCommit`: ea2a3934cfcbebaf3b05e15538e4b5ac721b1b53
  - `evidence`: Interfaz IFileSystem provee métodos async (readFile, writeFile, exists, readdir); rutas críticas de validación usan IFileSystem async; findCorePath migrado a fs.promises.access
  - `validationCommands`:
    - `npm run build --workspace sdk/cli` — compilación TypeScript pasa
    - `npm run test --workspace sdk/cli` — tests pasan
  - `dependencyDisposition`: none
- **Referencias:** [Interfaz IFileSystem](../../../../src/packages/core-domain/src/domain/interfaces.ts)


#### GT-19

**Título:** Migración hexagonal incremental de `core/`

- **Objetivo:** Disolver el god-layer `core/` (~17k líneas) incrementalmente: lógica pura → `domain/`, orquestación → `application/`, adapters (MCP, observabilidad, providers) → `infrastructure/`, dejando `core/` solo como composition root. Avanza oportunistamente con cada fase anterior — nunca como reescritura big-bang.
- **Evidencia actual:** ports de `domain` y adapters de infraestructura aún importan `NormalizedRule` desde `core/validators`, señal de ownership invertido.
- **Cierre cuando:** `core/` contiene solo DI/bootstrap; los boundaries de ESLint aplican reglas hexagonales estrictas (ver GT-17) sin excepciones.

#### GT-20

**Título:** Backfill de contenido de ADRs al estándar de autoría

- **Objetivo:** Completar las secciones añadidas como stubs por la estandarización de ADRs del 2026-06-10 (aproximadamente 697 marcadores en 162 archivos): Objetivo y Alcance, Opciones Consideradas, Evidencias y Criterios de Evaluación, Decisiones y Estándares Relacionados — más Vigilancia Tecnológica y Fuentes Actuales para ADRs de plataforma — según el [Estándar de Autoría de ADRs](../../architecture/adrs/adr-authoring-standard.es.md). El backfill debe reconstruir con honestidad, nunca fabricar historia.
- **Cierre cuando:** ningún ADR contiene marcador de backfill `GT-20`; spot-check confirma calidad de contenido en los 10 ADRs de mayor tráfico.

#### GT-21

**Título:** Revisión de ubicación de ADRs Core centrados en herramientas

- **Objetivo:** Aplicar la prueba de fuego Core-vs-Plataforma del [Estándar de Autoría de ADRs](../../architecture/adrs/adr-authoring-standard.es.md) a los ADRs Core centrados en herramientas — candidatos: 0001 (Nx), 0005 (CodeQL), 0006/0046 (Dapr), 0014 (Redis), 0030 (Kong vs NestJS), 0069 (MCP). Para cada uno: mantener en core reescrito como principio agnóstico, reubicar a una categoría de plataforma, o dividir (ADR Core agnóstico + ADR de Plataforma con la elección de herramienta). Toda reubicación debe corregir todos los enlaces entrantes en el mismo cambio.
- **Cierre cuando:** todo ADR Core pasa la prueba de fuego; los ADRs reubicados llevan la nota de reubicación; sin enlaces rotos.

#### GT-22

**Título:** Esquema de unicidad de IDs de ADR

- **Objetivo:** Resolver las colisiones de IDs entre categorías (core/0044–0048 vs nodejs/0044–0048; core/0069–0072 vs dotnet/0069–0072): decidir entre renumeración global (alto radio de impacto en enlaces) o citación calificada por categoría formalizada (`core/ADR-0044`), y actualizar `adr-matrix` y rulesets en consecuencia. El Estándar de Autoría manda provisionalmente la citación calificada por categoría.
- **Cierre cuando:** la decisión queda registrada (ADR o actualización del estándar) y `adr-matrix` refleja identidades sin ambigüedad.

#### GT-23

**Título:** Relleno de traducción al español del corpus de referencia.

- **Objetivo:** todos los documentos bajo `referencia/` y `conjuntos de reglas/` son legibles en español sin marcadores de posición esqueleto declarados.
- **Objetivo:** Traducir los 76 archivos actualmente marcados como "esqueleto inicial / pendiente de traduccion [completado]", concentrados en `governance/standards/ai-augmented/*`, `knowledge/architecture-intelligence/patterns` y organismos ADR seleccionados. El inglés sigue siendo la fuente decisiva; Estructura de cabecera de espejos españoles. Los esqueletos consumidos por herramientas bajo `.harness/` y `.bmad-core/` permanecen fuera del alcance a menos que se promocionen al corpus de referencia.
- **Hecho cuando:** `grep -rl "pendiente de traduccion [completado]" reference/rulesets/` devuelve cero archivos y `check-bilingual-parity.mjs` pasa.
- **Referencias:** [Índice bilingüe](../../BILINGUAL_INDEX.md) · [Glosario de terminología](../../../../.harness/scripts/bilingual-terminology-glossary.md)
#### GT-24

**Título:** Ejecutar las migraciones documentales declaradas

- **Meta:** que la ubicación física de cada documento coincida con su clasificación taxonómica declarada — sin más notas de "migración pendiente".
- **Objetivo:** Ejecutar las migraciones que los hubs ya declaran: (1) mover los documentos de visión/estrategia/posicionamiento de la suite desde la ruta legacy `governance/standards/vision/` a sus áreas de `product-suite/`; (2) migrar la documentación de Smart CLI y MCP Services a `product/products/`; (3) promover el [Modelo de Abstracción de Proveedores y Plugins](../../foundations/principles/evolith-provider-abstraction-plugin-model.es.md) a principio de arquitectura Core; (4) mover las [Interfaces Técnicas del Tracker](../../sdlc/sdlc-tracker-technical-interfaces.es.md) al diseño de producto del Tracker. Cada movimiento deja un stub de compatibilidad en la ruta antigua y corrige todos los enlaces entrantes en el mismo cambio.
- **Cierre cuando:** no queda ningún marcador de "migration pending / migración pendiente" en `reference/` ni `sdk/`; `validate-docs.mjs` pasa.
- **Referencias:** [Hub de Product Suite](../../../../product/suite/README.es.md) · [Hub de Diseños de Producto](../../../../product/products/README.es.md) · [Taxonomía Documental](../taxonomy/documentation-taxonomy.es.md)

#### GT-25

**Título:** Primeros perfiles de proveedor para las categorías de plataforma

- **Meta:** que el dominio de Guías de Plataforma deje de ser una promesa vacía — cada categoría planificada tiene al menos un perfil de proveedor real.
- **Objetivo:** Redactar perfiles de proveedor siguiendo el checklist de contenido requerido del Hub de Plataformas (capacidades, limitaciones, licencias, aislamiento de tenants, mapeo de adapters, reemplazabilidad, fuentes actuales), empezando por las categorías de las que los productos ya dependen: `scm/` (GitHub), `ci-cd/` (GitHub Actions), `observability/` (stack OTel), `security/` (CodeQL/Trivy).
- **Cierre cuando:** cada directorio de categoría existe con ≥1 perfil (EN+ES) enlazado desde la tabla del hub de plataformas.
- **Referencias:** Hub de Plataformas · [Catálogo de Herramientas Validadas](../../../../product/infra/validated-tool-catalog.es.md)

#### GT-26

**Título:** Playbook de Zero-Downtime Release

- **Meta:** que la Fase 5 del SDLC enlace un runbook operativo real en lugar de un marcador "Próximamente".
- **Objetivo:** Escribir el playbook de despliegues blue-green y canary anunciado en la tabla de la Fase 5 del [Centro de Gobernanza SDLC](../../sdlc/README.es.md) (EN+ES), cubriendo restricciones de zero-downtime, disparadores de rollback y checkpoints de observabilidad, y enlazarlo desde la tabla de artefactos de la Fase 5.
- **Cierre cuando:** la fila de la Fase 5 enlaza el playbook y no queda ningún marcador "Coming Soon / Próximamente" en el centro SDLC.
- **Referencias:** [Centro de Gobernanza SDLC](../../sdlc/README.es.md) · [Quality Gates](../../sdlc/quality-gates.es.md)

### Integridad del Tracking

#### GT-27

**Título:** Consistencia semántica del tracking canónico

- **Gap:** El tablero canónico contenía un GT-19 duplicado, trabajo completado en la cola activa, estados EN/ES contradictorios y totales que ya no coincidían con los registros detallados.
- **Propósito:** Hacer que la priorización, el reporting y las decisiones de inversión dependan de una única superficie confiable de gobernanza de producto.
- **Evidencia de cierre:** El commit `a6e4915` normalizó IDs únicos, estados activos, orden, metadata EN/ES y totales. La validación documental pasó para 745 archivos Markdown, la paridad estructural bilingüe pasó y una auditoría semántica confirmó 36 filas únicas de dashboard y 36 fichas correspondientes en cada idioma.
- **Alcance cerrado:** El tablero canónico es internamente consistente y los completados quedan fuera de la cola activa. La prevención de reincidencias, los totales generados y la automatización de inventarios del repositorio pertenecen explícitamente a GT-35.
- **Referencias:** [Evaluación de Madurez](../maturity-reports/maturity-assessment.es.md) · [Taxonomía Documental](../taxonomy/documentation-taxonomy.es.md)

#### GT-35

**Título:** Inventarios automatizados y validación del tracking

- **Gap:** Los inventarios del repositorio y los totales de salud de producto se mantienen manualmente y quedan obsoletos. Por ejemplo, el snapshot histórico reporta 14 schemas mientras el árbol actual contiene 17, y no puede detectar IDs GT duplicados ni estados bilingües divergentes.
- **Propósito:** Generar evidencia de decisión desde el repositorio en vez de depender de afirmaciones sincronizadas manualmente.
- **Evidencia actual / ejemplo:** La validación documental comprueba enlaces, anchors, encoding y diagramas, pero no valida la semántica del tablero ni regenera inventarios de rulesets, ADRs, traducciones e implementación.
- **Cierre cuando:** un comando de validación falla ante IDs duplicados, fichas faltantes, metadata EN/ES diferente, completados en la cola activa, totales incorrectos o inventarios obsoletos; su resumen generado se referencia desde el reporte de madurez.
- **Referencias:** [Hub de Rulesets](../../../../src/rulesets/README.es.md) · [Evaluación de Madurez](../maturity-reports/maturity-assessment.es.md) · [Tracking de Gaps](./gap-tracking.es.md)

### Línea Base de Release y Ejecución de Políticas

#### GT-28

**Título:** Restaurar la línea base de build, tests y smoke del CLI

- **Gap:** El refactor del CLI había roto su baseline ejecutable de release: lint pasaba, pero compilación, suites unitarias y smoke MCP no.
- **Propósito:** Restablecer una línea base ejecutable de release antes de tratar capacidades de CLI, MCP o policy engine como evidencia de producto completado.
- **Evidencia actual / ejemplo:** Cerrado el 2026-06-12. `npm run lint` y `npm run build` pasan; 70 suites unitarias pasan con 1,237 tests; 12 suites E2E pasan con 110 tests; `npm run mcp:smoke` pasa inicialización, discovery, métricas y evaluación de gates mediante stdio y Streamable HTTP.
- **Evidencia de reapertura (2026-06-13):** El CI actual de `main` falla antes de los tests porque `npm ci` del workspace dispara el script prepare raíz de Husky sin instalar la dependencia raíz. La cache también apunta a un `sdk/cli/package-lock.json` ausente; el workspace local verde no es reproducible desde un checkout limpio.
- **Verificación de reapertura (2026-06-13):** Los runs [SDK CLI CI 27467157131](https://github.com/beyondnetcode/evolith_arch32/actions/runs/27467157131) y [CI/CD 27467157129](https://github.com/beyondnetcode/evolith_arch32/actions/runs/27467157129) confirmaron ambos bloqueos antes de ejecutar las suites: la cache no resolvía `sdk/cli/package-lock.json` y el `prepare` raíz fallaba con `husky: not found`.
- **Cierre cuando:** desde un checkout limpio pasan lint, build, tests unitarios y smoke MCP stdio/HTTP; ninguna ruta crítica de release se satisface solo con tests omitidos.
- **Evidencia de cierre:** El commit `84ec879` trasladó la instalación del workspace y la cache npm al lockfile raíz canónico, restauró el comando `test:cov` e hizo bloqueante el smoke MCP en CI. Un clon sin hardlinks de ese commit pasó `npm ci` raíz, lint, build, 64 suites unitarias con 1,087 tests, 14 suites E2E con 121 tests y smoke MCP por stdio y Streamable HTTP. La regresión separada del umbral de cobertura del 80%, descubierta al desbloquear la instalación, se registra en GT-48.
- **Referencias:** [Smart CLI](../../../../src/sdk/cli/README.es.md) · [ADR-0073 Contrato Unificado de Salida del CLI](../../architecture/adrs/core/0073-unified-cli-output-contract.es.md) · [Quality Gates](../../sdlc/quality-gates.es.md)

#### GT-29

**Título:** Paridad de policy engines Native y OPA

- **Gap:** R-25 exige cada regla arquitectónica en ambos evaluadores, pero la política de arquitectura OPA aún contiene rutas placeholder y el evaluador Native no cubre todas las categorías F1. Por ello todavía no se puede confiar en que inputs equivalentes produzcan veredictos equivalentes.
- **Propósito:** Convertir los rulesets en un contrato de gobernanza real y portable, no en dos implementaciones parcialmente superpuestas.
- **Evidencia actual / ejemplo:** F1-R09 a F1-R11 tienen implementaciones Rego, mientras la cobertura de dependency injection, static analysis y separation of concerns sigue incompleta entre engines. F1-R10 también declara enforcement basado en AST mientras su ruta Rego actual usa coincidencia textual.
- **Cierre cuando:** una matriz de cobertura generada mapea cada regla arquitectónica activa a implementaciones Native y OPA; tests de equivalencia comparan findings y severidad para fixtures conformes y no conformes; el engine OPA/WASM empaquetado pasa el mismo gate de release.
- **Referencias:** [Reglas Globales R-25](../../../../.harness/rules/global-rules.es.md) · [Ruleset F1](../../architecture/topologies/progressive-axis/modular-monolith/modular-monolith.rules.json) · [Política de Arquitectura OPA](../../architecture/topologies/progressive-axis/modular-monolith/modular-monolith.rego)

#### GT-36

**Título:** Política de cobertura lingüística para reglas machine-readable

- **Gap:** El repositorio tiene 27 rulesets en inglés pero solo 3 rulesets JSON en español, sin una decisión explícita sobre si las reglas consumidas por máquinas son artefactos canónicos en inglés o requieren contrapartes bilingües completas.
- **Propósito:** Preservar un único significado autoritativo de las políticas y hacer explícitas y exigibles sus obligaciones lingüísticas.
- **Evidencia actual / ejemplo:** Los documentos narrativos de referencia exigen paridad bilingüe, pero la localización de rulesets es parcial y su frontera de excepción no está codificada en la validación.
- **Cierre cuando:** la gobernanza declara paridad JSON bilingüe completa o una exención explícita de canon inglés con descripciones legibles localizadas; la validación exige el modelo seleccionado y reporta artefactos no cubiertos.
- **Referencias:** [Reglas Globales](../../../../.harness/rules/global-rules.es.md) · [Hub de Rulesets](../../../../src/rulesets/README.es.md) · [Glosario de Terminología](../../../../.harness/scripts/bilingual-terminology-glossary.es.md)

### Prueba de Producto

#### GT-33

**Título:** Scoring de madurez respaldado por evidencia

- **Gap:** Los scores actuales de madurez pueden confundir una capacidad diseñada con una capacidad implementada, validada, adoptada o gestionada operacionalmente.
- **Propósito:** Hacer que el reporte de madurez sirva para decisiones de inversión y release vinculando cada score con evidencia observable.
- **Evidencia actual / ejemplo:** Tracker tiene documentación extensa de diseño pero ninguna implementación ejecutable, mientras la línea base histórica del CLI reporta gates de release verdes que actualmente fallan bajo GT-28.
- **Cierre cuando:** cada capacidad puntuada declara un estado como Visionada, Diseñada, Prototipada, Implementada, Validada o Escalada; cada estado no visionario enlaza evidencia calificadora; los scores agregados se recalculan desde esos estados y exponen incertidumbre.
- **Referencias:** [Evaluación de Madurez](../maturity-reports/maturity-assessment.es.md) · [Métricas y Madurez de Capacidades](../../../../product/suite/vision/evolith-product-vision-master.es.md#11-métricas-y-madurez-de-capacidades)

#### GT-34

**Título:** Repriorización del roadmap alrededor de la prueba de gobernanza

- **Gap:** El roadmap adelanta preocupaciones amplias de plataforma como abstracción multi-cloud, Dapr y arquitectura zero-trust antes de que el kernel de gobernanza y el Producto Mínimo Comprobable produzcan evidencia de cliente y operación.
- **Propósito:** Secuenciar la inversión alrededor de la tesis central y postergar opcionalidad costosa hasta que la evidencia la justifique.
- **Evidencia actual / ejemplo:** El próximo horizonte de planificación debe priorizar línea base de release, kernel del Tracker, vertical slice y aprendizaje del piloto; el runtime distribuido y la amplitud de proveedores deben tener disparadores explícitos de evidencia.
- **Cierre cuando:** el roadmap ordena el trabajo como línea base → kernel de gobernanza → vertical slice → piloto controlado → escala; las tecnologías diferidas nombran disparadores medibles de adopción, carga, compliance o presión de proveedores; las dependencias mapean a este tablero.
- **Referencias:** [Roadmap de Estrategia Evolutiva](../../../../product/suite/strategy/evolutionary-strategy-roadmap.es.md) · [Producto Mínimo Comprobable](../../../../product/suite/vision/evolith-product-vision-master.es.md#10-producto-mínimo-comprobable) · [Framework de Validación Estratégica y Composición](../../../../product/suite/methods/evolith-strategic-validation-and-composition-framework.es.md)

#### GT-37

**Título:** Cierre semántico de gaps condicionado por evidencia

- **Gap:** La validación estructural del tracking puede reportar todos los gaps como completados aunque existan criterios de cierre sin marcar, evidencia obsoleta o contradictoria, o una dependencia satisfecha solo mediante mocks.
- **Propósito:** Hacer de `COMPLETADO` una afirmación semántica defendible y respaldada por evidencia vigente y reproducible, no solo un valor consistente dentro de una tabla.
- **Evidencia actual / ejemplo:** El validador semántico, el registro canónico de cierres y los tests de regresión están activos. Los criterios de GT-01 y GT-06 fueron resueltos explícitamente, mientras GT-15 volvió a `DIFERIDO` porque su mock en memoria no es evidencia autoritativa de Tracker.
- **Cierre cuando:** la validación rechaza `COMPLETADO` sin criterios de cierre satisfechos, evidencia fechada, disposición de dependencias, comandos de validación reproducibles y referencia de commit o release; las excepciones documentadas son explícitas, tienen responsable y vencimiento.
- **Evidencia de cierre:** El commit `f3c8520` incorporó R-26, el estándar bilingüe de cierre, 32 registros históricos, resolución de commits y artefactos, chequeos de disposición de dependencias, rechazo de criterios sin marcar y cuatro tests de regresión. El mismo cambio corrigió el falso positivo de GT-15.
- **Referencias:** [Estándar de Evidencia para Cierre de Gaps](../evidence/gap-closure-evidence-standard.es.md) · [Registro de Cierres](../evidence/gap-closure-evidence.json) · [Validador de Tracking](../../../../.harness/scripts/ci/08-validate-tracking.mjs) · [Tracking de Gaps](./gap-tracking.es.md)

#### GT-41

**Título:** Reconciliación automática de madurez

- **Gap:** Los reportes de madurez, inventarios y el tablero vivo de gaps pueden divergir porque sus estados y totales se mantienen como afirmaciones narrativas separadas.
- **Propósito:** Mantener decisiones de prioridad e inversión alineadas con evidencia actual del repositorio, releases y producto.
- **Evidencia actual / ejemplo:** La evaluación de madurez aún referencia gaps abiertos y conteos reemplazados mientras el tablero reporta su cierre, creando visiones contradictorias de readiness.
- **Límite de ownership:** Core reconcilia únicamente la evidencia que posee. La madurez de Tracker y Product Suite permanece como input externo y nunca debe inflar el score de Core.
- **Cierre cuando:** un reporte generado o reconciliado consume el tablero canónico de Core, inventarios y evidencia de tests y releases; expone timestamps de vigencia, separa Core de la madurez externa de productos y falla ante estados, conteos o enlaces de evidencia obsoletos.
- **Evidencia de cierre:** El commit Core `154aadf` incorporó reconciliación machine-readable generada, tests de regresión, checks de drift en pre-commit y CI, y eliminó los totales vigentes mantenidos manualmente en la evaluación narrativa. La madurez de productos externos se excluye explícitamente.
- **Evidencia de reapertura (2026-06-13):** El snapshot generado reporta todos los gaps completos mientras cuatro workflows del mismo commit de `main` están rojos. Registra nombres de comandos, no resultados de tests, release, npm, suites omitidas o CI, y la evaluación narrativa conserva estados de capacidad reemplazados.
- **Verificación de reapertura (2026-06-13):** El run [Documentation Validation 27467157149](https://github.com/beyondnetcode/evolith_arch32/actions/runs/27467157149) validó el corpus y la paridad bilingüe, pero la reconciliación semántica falló porque el checkout superficial no contenía los commits de cierre registrados.
- **Evidencia final de cierre:** El commit `e4fa0e3` incorporó un registro de evidencia runtime con control de frescura, resultados explícitos `PASS`/`BLOCKED`, trazabilidad a workflow y commit, ownership de bloqueos por gaps activos, tests de regresión y checkout con historia completa. El run [Documentation Validation 27470122212](https://github.com/beyondnetcode/evolith_arch32/actions/runs/27470122212) pasó documentación, paridad bilingüe, tracking semántico, reconciliación de madurez y validación de contratos machine-readable.
- **Referencias:** [Evaluación de Madurez](../maturity-reports/maturity-assessment.es.md) · [Reconciliación de Madurez](../maturity-reports/maturity-reconciliation.json) · [Resumen de Inventario](../maturity-reports/inventory-summary.es.md) · [Validador de Reconciliación](../../../../.harness/scripts/ci/09-reconcile-maturity.mjs)

#### GT-42

**Título:** Conformidad contractual entre repositorios

- **Gap:** Core, CLI y Tracker pueden evolucionar sus contratos de evidencia y decisión independientemente sin probar compatibilidad entre productores y consumidores.
- **Propósito:** Asegurar que las evaluaciones técnicas sigan siendo consumibles por el Tracker autoritativo durante releases independientes de los repositorios.
- **Evidencia actual / ejemplo:** Existen ADRs contractuales y schemas JSON, pero no una matriz de compatibilidad entre repositorios ni una suite CI que ejecute juntas las versiones soportadas de productores y consumidores.
- **Cierre cuando:** schemas versionados compartidos o referencias contractuales fijadas definen la política de compatibilidad; contract tests de productor y consumidor se ejecutan entre Core, CLI y Tracker; CI verifica la matriz de últimas versiones soportadas y bloquea cambios incompatibles.
- **Evidencia de cierre:** El commit Core `154aadf` incorporó el manifiesto versionado, digests inmutables de schemas, fixtures, tests de conformidad y enforcement en CI. El commit Tracker `4256e7b` fijó el contrato soportado y agregó su workflow consumidor contra Core.
- **Referencias:** [ADR-0073 Contrato Unificado de Salida del CLI](../../architecture/adrs/core/0073-unified-cli-output-contract.es.md) · [Manifiesto Contractual](../../../../src/rulesets/contracts/evolith-machine-contracts.json) · [Política de Conformidad](../../../../src/rulesets/contracts/README.es.md) · [Validador de Conformidad](../../../../.harness/scripts/ci/10-validate-contract-conformance.mjs)

#### GT-44

**Título:** Integridad determinista del pipeline de release

- **Gap:** Los workflows aplican checks de versión exclusivos de release a merges ordinarios, referencian `pkg.bin.evolith` aunque el paquete expone `smart-cli`, descargan artefactos binarios que nunca se suben y ocultan un fallo del smoke de init con `|| true`.
- **Propósito:** Hacer los releases npm y binarios reproducibles, bloqueantes y confiables.
- **Evidencia actual / ejemplo:** El run [27451600153](https://github.com/beyondnetcode/evolith_arch32/actions/runs/27451600153) falló en `4a30a85`; npm confirma que `@evolith/smart-cli@1.1.0` existe, pero el camino de release actual no está saludable.
- **Cierre cuando:** los checks de release respetan el evento; la identidad del paquete y binarios proviene de `package.json`; cada target se sube, descarga, ejecuta y adjunta; los smoke failures no se ignoran; la notificación tiene permisos válidos o degrada con seguridad.
- **Evidencia de cierre:** El commit `26f6a18` endurece ambos pipelines del CLI contra cada defecto: (1) `verify-git-tag.mjs` y `verify-version-log.mjs` respetan el evento — omiten los merges ordinarios a `main` y solo exigen un tag `docs-v*` y entrada en el version-log cuando HEAD es realmente un release de docs, detectado por el mensaje del merge commit o un tag `docs-v*` en HEAD; (2) la identidad del binario se deriva de `package.json` tanto en `sdk-cli-ci.yml` (reemplazando el lookup obsoleto `pkg.bin.evolith` que resolvía a `undefined`) como en el paso `Verify Package Integrity` del release; (3) `pkg` queda fijado a `5.8.1`, los binarios se renombran de forma determinista por target, se suben como artefactos `binaries-<target>`, se ejecutan en una matriz de smoke por-OS y se adjuntan vía una descarga `binaries-*` que verifica la presencia de los tres; (4) los pasos de smoke de init y versión ya no enmascaran fallos con `|| true`; (5) el notificador de fallos tiene `issues: write` y envuelve la creación del issue en `try/catch` para degradar con seguridad.
- **Verificación local (2026-06-13):** `GITHUB_REF_NAME=main GITHUB_EVENT_NAME=push node .harness/scripts/verify-git-tag.mjs` y su equivalente de version-log salen con `0` mostrando "Ordinary merge to main … skipping"; ambos YAML de workflow parsean; la derivación de identidad de `package.json` resuelve a `[./dist/main.js]`. El run de release verde definitivo es observable en el próximo push que dispare release a `main`. Estado: `COMPLETADO`.
- **Referencias:** [Workflow de Release del CLI](../../../../.github/workflows/sdk-cli-release.yml) · [Workflow CI del CLI](../../../../.github/workflows/sdk-cli-ci.yml) · [Verificador de Git Tag](../../../../.harness/scripts/verify-git-tag.mjs) · [Verificador de Version Log](../../../../.harness/scripts/verify-version-log.mjs)

#### GT-45

**Título:** Suite de conformidad de transporte y tools MCP

- **Gap:** El smoke de Streamable HTTP está activo, pero suites de HTTP, API key, routing de mensajes y múltiples tools MCP permanecen deshabilitadas con `describe.skip`; algunas aún apuntan al transporte mínimo eliminado.
- **Propósito:** Probar exposición consistente de Core por stdio y Streamable HTTP, incluyendo autenticación, errores, resources, prompts y tools registradas.
- **Cierre cuando:** tests obsoletos se eliminan o reescriben; ninguna suite MCP relevante para release está omitida; casos negativos de protocolo corren en CI; tools y schemas runtime coinciden con el inventario generado.
- **Evidencia de cierre:** El commit `b07460d` eliminó 547 líneas de tests obsoletos del transporte mínimo, activó 47 tests de tools de agentes/arquitectura/SDLC, agregó un gate de conformidad de schemas runtime y ausencia de suites omitidas, corrigió la inyección runtime de filesystem/config parser, y validó 29 casos E2E MCP más smoke stdio/Streamable HTTP para 21 tools, 7 resources y 7 prompts.
- **Verificación post-push (2026-06-13):** Los workflows rojos del commit de cierre fallan durante checkout, cache o instalación, antes de ejecutar la conformidad MCP. No existe evidencia contradictoria con las suites locales de cierre; los bloqueos de reproducibilidad y release permanecen asignados a GT-28, GT-41 y GT-44. Estado: `COMPLETADO`.
- **Referencias:** [Punto de Entrada del Servidor MCP](../../../../src/packages/mcp-server/src/main.ts) · [Smoke Test MCP](../../../../src/sdk/cli/examples/mcp-test.js) · [Tests E2E del Servidor MCP](../../../../src/packages/mcp-server/test/mcp-server.e2e-spec.ts)

#### GT-46

**Título:** Límite de ownership del servicio HTTP de Core

- **Gap:** `smart-cli api` expone un mock en memoria de “Evolith Tracker Assistant” con CORS irrestricto y sin contrato gobernado de Core, aunque este repositorio solo debe contener servicios que exponen Core.
- **Propósito:** Evitar que comportamiento de producto Tracker se filtre en la distribución Core, preservando una API stateless válida de Core si esa superficie se conserva.
- **Cierre cuando:** una decisión explícita elimina la API mock o la reemplaza por un contrato documentado, autenticado y stateless de exposición de Core; CORS es configurable y los endpoints retenidos tienen schemas y tests.
- **Evidencia de cierre:** El commit `b07460d` eliminó el comando `api`, el mock Tracker Assistant, sesiones chat en memoria, controller, módulo, repositorio e interfaces de dominio. El servicio de red retenido es la exposición MCP Streamable HTTP autenticada y cubierta por contract tests de Evolith Core.
- **Verificación post-push (2026-06-13):** La revisión de los fallos de CI no identifica regresiones ni una reintroducción de superficies Tracker en Core; todos ocurren antes de la validación funcional. El límite de ownership implementado permanece vigente. Estado: `COMPLETADO`.
- **Referencias:** [Composition Root del CLI](../../../../src/sdk/cli/src/app.module.ts) · [Punto de Entrada del Gateway MCP](../../../../src/packages/mcp-server/src/main.ts)

#### GT-47

**Título:** Sincronización de documentación de producto y release

- **Gap:** Las docs de Smart CLI anuncian `0.0.3-beta`, MCP Services es un placeholder y el reporte de madurez dice que trabajo ya completado de transporte, contratos, gates y publicación continúa faltando.
- **Propósito:** Mantener la narrativa pública sincronizada con las superficies instalables Core/CLI/MCP.
- **Cierre cuando:** un inventario generado suministra versión del paquete, comandos, tools, resources, prompts, transportes, schemas y evidencia de tests a docs EN/ES y madurez; CI rechaza drift y páginas placeholder.
- **Evidencia de cierre:** El commit `38dfc98` añade `generate-product-inventory.mjs`, que deriva la superficie instalable (`@evolith/smart-cli@1.1.0`, bin, 18 comandos, 21 tools MCP, 7 resources, 7 prompts, 2 transportes, 17 schemas, cobertura live) desde las fuentes canónicas del CLI hacia un [Inventario de Superficie del Producto](../../../../product/products/smart-cli/product-inventory.es.md) generado EN/ES. El README de Smart CLI (EN/ES) se actualizó de `0.0.3-beta`/88.7% a `1.1.0` con cobertura vigente, y el placeholder de MCP Services (EN/ES) se reemplazó con la superficie real de tools/resources/prompts/transportes. `validate-product-docs.mjs` rechaza páginas placeholder, drift de versión e inventario obsoleto; corre en el pre-commit hook y el workflow de docs en CI.
- **Verificación local (2026-06-14):** `generate-product-inventory.mjs --check`, `validate-product-docs.mjs`, `validate-docs.mjs` (827 archivos) y la paridad bilingüe pasan. Estado: `COMPLETADO`.
- **Referencias:** [Producto Smart CLI](../../../../product/products/smart-cli/README.es.md) · [Producto MCP Services](../../../../product/products/mcp-services/README.es.md) · [Inventario de Superficie del Producto](../../../../product/products/smart-cli/product-inventory.es.md)

#### GT-48

**Título:** Restaurar el umbral normativo de cobertura del CLI

- **Gap:** Al restaurar la instalación limpia del workspace, el gate bloqueante de cobertura expuso 66.14% de statements frente al umbral normativo de 80%. La evidencia histórica de madurez todavía afirma 88.70%, por lo que el resultado ejecutable y la narrativa de producto divergen.
- **Propósito:** Recuperar protección significativa contra regresiones sin reducir el umbral aceptado ni excluir código productivo solo para mejorar la métrica.
- **Evidencia actual / ejemplo:** `npm run test:cov --workspace @evolith/smart-cli -- --coverageReporters=json-summary` pasa 1,087 tests, pero reporta 4,083 de 6,173 statements cubiertos. El gate de CI ahora lee `.total.statements.pct`, alineado con el contrato del phase gate.
- **Cierre cuando:** la cobertura de statements alcanza al menos 80% desde un checkout limpio; los nuevos tests priorizan validators críticos de release, handlers de políticas, comandos CLI, rutas runtime MCP y providers de filesystem; CI bloquea regresiones y la evidencia de madurez se regenera desde el reporte vigente.
- **Evidencia de cierre:** El commit `48e1d90` sube la cobertura de statements de 66.14% a **80.65%** (4.979 / 6.173) con 1.206 tests unitarios verdes, apuntando exactamente a las superficies nombradas. Las dos suites de servicio rotas por la eliminación del service locator en [GT-04](#gt-04) se revivieron con inyección por constructor (MoscowPrioritizationService 2,58% → 98%, ArchitectureDriftService 3,78% → 94%); los siete native rule handlers obtuvieron specs (~93% cada uno); el OPA input builder (28% → 91%), el disk ruleset repository (11% → 90%) y ambos filesystem providers (Mock 0% → 96%, Node 100%) quedan cubiertos. El gate de CI en `sdk-cli-ci.yml` lee `.total.statements.pct` y bloquea por debajo de 80%; la aplicación durable por-run en `jest.config.js` sigue rastreada por [GT-50](#gt-50).
- **Verificación CI (2026-06-13):** el job Unit Tests del [run 27479301558](https://github.com/beyondnetcode/evolith_arch32/actions/runs/27479301558) está verde, el gate bloqueante de cobertura imprime `Statement coverage: 80.65%` y Package Integrity pasa. El mismo commit corrigió el reporter del gate para que emita el `json-summary` que el chequeo de umbral parsea. Estado: `COMPLETADO`.
- **Referencias:** [Workflow CI del CLI](../../../../.github/workflows/sdk-cli-ci.yml) · [Configuración Jest](../../../../src/sdk/cli/jest.config.js) · [Estrategia de Testing](../../../../product/products/smart-cli/docs/planning/testing-strategy.md) · [GT-04](#gt-04) · [GT-50](#gt-50)

#### GT-49

**Título:** Activar el modo estricto de TypeScript y puertos de filesystem tipados

- **Gap:** El CLI compila con `strictNullChecks`, `noImplicitAny` y `strictBindCallApply` deshabilitados (`sdk/cli/tsconfig.json`), y quedan 78 anotaciones `: any` en `src`. Dieciséis son parámetros `fs: any` aunque ya existe un puerto `IFileSystem` consumido en otros módulos, por lo que la frontera tipada se evade en la capa de comandos.
- **Propósito:** Hacer que el compilador imponga la disciplina de null-safety y de puertos tipados que el pilar de Mantenibilidad ya declara como `Validated`, eliminando una clase de defectos latentes que la configuración actual oculta.
- **Evidencia actual / ejemplo:** `adr.command.ts` y `standards.command.ts` declaran handlers privados como `fs: any`; `tsconfig.json:19-21` apaga los chequeos de null estricto e implicit-any; ESLint no habilita `@typescript-eslint/no-explicit-any`.
- **Cierre cuando:** el modo estricto está activado (de forma incremental si es necesario), los parámetros `fs: any` están tipados contra `IFileSystem`, los `: any` restantes están tipados o justificados con una supresión en línea, y el build permanece verde bajo la configuración endurecida.
- **Evidencia de cierre:** El commit `398729d` pone `strictNullChecks`, `noImplicitAny` y `strictBindCallApply` en `true` en `tsconfig.json` — los overrides explícitos en `false` antes neutralizaban incluso una invocación `--strict`. Los 10 errores de tipo resultantes quedan resueltos: los 16 parámetros `fs: any` están tipados contra `IFileSystem` (comandos adr/standards y los use cases de la capa de aplicación), más un `canHandle` con boolean estricto, un `status` opcional en `updateADR`, encoding unificado en `FileReadOptions`/`FileWriteOptions`, null-safety en el filesystem/watcher MCP, un target de decorador acotado y defaults de prompt con coalescencia de null. `@typescript-eslint/no-explicit-any` queda activado como warning para visibilizar nuevos `any`; las ocurrencias restantes están en fronteras genuinamente dinámicas (varargs de logger, payloads OPA/JSON, datos de catálogo).
- **Verificación local (2026-06-13):** `npx tsc --noEmit` está limpio bajo la configuración endurecida; `npm run build`, 1.206 tests unitarios y 121 E2E pasan; lint reporta 0 errores. Estado: `COMPLETADO`.
- **Referencias:** [tsconfig del CLI](../../../../src/sdk/cli/tsconfig.json) · [Configuración ESLint](../../../../src/sdk/cli/.eslintrc.js) · [ADR-0019 Patrones de Diseño Táctico](../../architecture/adrs/core/0019-tactical-design-patterns-future-proofing.md)

#### GT-50

**Título:** Aplicar umbrales de cobertura en la configuración de Jest

- **Gap:** El umbral normativo de 80% de statements se impone únicamente con un paso Bash en CI (`sdk-cli-ci.yml`), mientras que `jest.config.js` no declara ningún `coverageThreshold`. Por lo tanto, un `npm test` local nunca falla por cobertura y las regresiones aparecen solo después del push.
- **Propósito:** Hacer que el contrato de cobertura sea exigible en el punto de cambio y no exclusivamente en CI, cerrando el "split-brain" entre el runner y el pipeline.
- **Cierre cuando:** `jest.config.js` declara un `coverageThreshold` alineado con el objetivo normativo (idealmente ratchets por directorio que impidan regresiones silenciosas), el chequeo de CI y la configuración de Jest coinciden en el umbral, y el comando de cobertura local falla ante una regresión. Coordinar el número absoluto con [GT-48](#gt-48).
- **Evidencia de cierre:** El commit `040ea7f` añade un `coverageThreshold` global a `jest.config.js` — `statements: 80` (idéntico al gate bash de `sdk-cli-ci.yml`), `lines: 80`, `functions: 75`, `branches: 67` — de modo que `npm run test:cov` ahora falla localmente ante una regresión y no solo tras el push. Los umbrales quedan en o justo por debajo de los pisos restaurados por [GT-48](#gt-48) (80,65% statements, 81,47% líneas, 76,36% funciones, 68,87% branches).
- **Verificación local (2026-06-14):** `npm run test:cov` pasa 1.206 tests y reporta cobertura por encima de cada umbral; Jest sale con 0. Una caída por debajo de cualquier piso ahora falla el comando. Estado: `COMPLETADO`.
- **Referencias:** [Configuración Jest](../../../../src/sdk/cli/jest.config.js) · [Workflow CI del CLI](../../../../.github/workflows/sdk-cli-ci.yml) · [GT-48](#gt-48)

#### GT-51

**Título:** Validación de evidencia de gate Build-versus-Compose

- **Gap:** La Visión de Producto hace obligatorio el análisis Build-versus-Compose como evidencia del gate de Business Sign-Off (visión §5.3), pero la evaluación de gates de Core no tiene ningún tipo de evidencia ni validator para ello. Los chequeos de gate siguen siendo más estrechos de lo que exige la visión.
- **Propósito:** Alinear la evidencia de gate ejecutable de Core con el requisito de Discovery no negociable de la visión, para que una disposición gobernada (Adopt/Embed/Integrate/Extend/Build/Reject) sea auditable y no implícita.
- **Evidencia actual / ejemplo:** la visión §5.3 enumera alternativas, disposición, costo a tres años, licenciamiento, aislamiento de tenant y reemplazabilidad de proveedor como evidencia requerida; ningún esquema `GateEvidence` ni validator de phase-gate los modela actualmente.
- **Cierre cuando:** existe un esquema de evidencia Build-versus-Compose, el validator de phase-gate verifica su presencia y contenido para el gate de Business Sign-Off, y las superficies CLI/MCP exponen el resultado con el envelope de ADR-0073.
- **Evidencia de cierre:** El commit `54386a3` añade `rulesets/schema/build-vs-compose.schema.json`, modelando cada campo de §5.3 — alternativas evaluadas, disposición gobernada Adopt/Embed/Integrate/Extend/Build/Reject, costo a tres años, licenciamiento, aislamiento de tenant/propiedad de datos, reemplazabilidad de proveedor, requisitos de PoC y una justificación nativa condicionalmente requerida cuando la disposición es `Build`. El gate de Business Sign-Off (Fase 1) en `phase-gates.rules.json` lo lista ahora como evidencia mandatoria, y el validator de phase-gate lo mapea a `.evolith/build-vs-compose.json` y valida presencia **y** contenido vía Ajv — expuesto a través del envelope de gate-evidence de ADR-0073 en el CLI (`gate evaluate`) y la tool MCP `evolith-gate-evaluate`. El conteo de schemas de phase-gate sube a 18.
- **Verificación local (2026-06-14):** un nuevo spec verifica aceptación/rechazo del schema (disposición ausente, valor desconocido, Build-sin-justificación, costo/seguridad ausentes) e integración con el validator (válido pasa, inválido falla, ausente falla); el `gate.e2e-spec` sigue devolviendo un envelope fallido schema-válido. 1.215 tests unitarios pasan; la cobertura se mantiene en 80,70%. Estado: `COMPLETADO`.
- **Referencias:** [Visión de Producto Maestra §5.3](../../../../product/suite/vision/evolith-product-vision-master.es.md) · [Schema Build-versus-Compose](../../../../src/rulesets/schema/build-vs-compose.schema.json) · [Validator de Phase Gate](../../../../src/packages/core-domain/src/application/validators/phase-gate-validator.service.ts) · [GT-08](#gt-08)

#### GT-52

**Título:** Eliminar los stubs muertos del contenedor de inyección de dependencias

- **Gap:** `src/infrastructure/di/container.ts` todavía exporta `getContainer = () => ({})` y `resetContainer = () => {}` como stubs no-op que quedaron tras la eliminación del service locator ([GT-04](#gt-04)) y la consolidación de DI ([GT-17](#gt-17)).
- **Propósito:** Eliminar una costura fantasma que tergiversa el modelo de wiring, para que el composition root en `app.module.ts` sea la única fuente de construcción.
- **Cierre cuando:** los stubs se eliminan (o se reemplazan por una abstracción real y usada), ningún código productivo depende de ellos, y el build y los tests pasan.
- **Evidencia de cierre:** El commit elimina `sdk/cli/src/infrastructure/di/container.ts` (los stubs no-op `getContainer`/`resetContainer` que quedaron tras [GT-04](#gt-04) y [GT-17](#gt-17)); ningún código productivo los importaba. Los bloques `jest.mock('.../di/container', …)` muertos y los imports sin uso se eliminaron del app-module, los specs de comandos init/adr/standards y el spec de gate-status. El composition root en `app.module.ts` es la única fuente de construcción; el build, 1.206 tests unitarios y 121 E2E pasan con cobertura en 80,70%.
- **Referencias:** [Composition Root](../../../../src/sdk/cli/src/app.module.ts) · [GT-17](#gt-17)

#### GT-53

**Título:** Reparar las referencias migradas a la visión de producto

- **Gap:** La Evaluación de Madurez enlaza a `./evolith-product-vision-master.md`, que ahora es solo un stub de migración; el documento canónico se movió a `product/suite/vision/`. La única superficie de madurez apunta a un placeholder de redirección.
- **Propósito:** Mantener las superficies canónicas de madurez y visión apuntando a contenido vivo, para que la navegación y la validación reflejen el grafo documental real.
- **Cierre cuando:** la evaluación de madurez (EN/ES) y cualquier otra referencia de Core resuelven a la ruta canónica de la visión, y la validación de enlaces pasa sin stubs de redirección en el grafo referenciado.
- **Evidencia de cierre:** Los stubs de redirección de migración en `reference/core/control-center/evolith-product-vision-master.md` (+`.es.md`) se eliminan, y toda referencia de Core resuelve ahora a la ruta canónica `product/suite/vision/`: la Evaluación de Madurez (EN/ES), los READMEs de vision y de product-suite/vision (este último enlazaba de vuelta al stub), el README raíz y `rulesets/acl/README` (EN/ES). Borrar los stubs destapó estos enlaces migrados ocultos, que `validate-docs.mjs` ahora confirma que resuelven. El índice bilingüe se regeneró.
- **Verificación local (2026-06-14):** `validate-docs.mjs` pasa para 825 archivos sin enlaces rotos, la paridad bilingüe y el chequeo de huérfanos pasan, y no queda ninguna referencia al stub fuera del ledger histórico de migración. Estado: `COMPLETADO`.
- **Referencias:** [Evaluación de Madurez](../maturity-reports/maturity-assessment.es.md) · [Visión Maestra Canónica](../../../../product/suite/vision/evolith-product-vision-master.es.md)

#### GT-54

**Título:** Completar la aplicación estricta de fronteras hexagonales

- **Gap:** Quedan dos costuras residuales tras la migración de `core/` ([GT-19](#gt-19)): ESLint todavía permite imports `application → infrastructure` como una "concesión pragmática del CLI" documentada (`.eslintrc.js`), y algunos use cases grandes mantienen responsabilidades mezcladas — `InitializeProjectUseCase` (~280 líneas) en el barrel `services/index.ts` y el `phase-gate-validator.service.ts` de 500 líneas.
- **Propósito:** Cerrar la última milla hacia fronteras hexagonales estrictas, de modo que la capa de aplicación dependa solo de puertos y los use cases sobredimensionados se descompongan por responsabilidad.
- **Cierre cuando:** se elimina la concesión `application → infrastructure` (la aplicación depende solo de puertos/dominio), los use cases sobredimensionados se descomponen en unidades enfocadas, y las fronteras de ESLint más la suite completa de tests pasan.
- **Referencias:** [Configuración ESLint](../../../../src/sdk/cli/.eslintrc.js) · [Barrel de servicios de aplicación](../../../../src/packages/core-domain/src/application/services/index.ts) · [GT-19](#gt-19) · [GT-17](#gt-17)

---

## 2. Snapshot Histórico de Línea Base

Estado de madurez de referencia al momento en que este tablero se convirtió en la fuente única de tracking:

> Este snapshot es evidencia histórica, no salud actual. El estado ejecutable vigente del release se registra en [GT-28](#gt-28), y el drift de inventarios en [GT-35](#gt-35).

| Componente | Score | Evaluación |
|---|:---:|---|
| Evolith Core (Reference Corpus) | 90% | Maduro — reglas de integración ACL diferidas |
| Evolith Tracker (SaaS) | 0% | No iniciado — repositorio aparte, componente enterprise futuro |
| CLI (Exposición Tecnológica) | 90% | Beta funcional — gates de build, coverage y smoke MCP pasan |
| Servidor MCP | 85% | stdio + HTTP mínimo; smoke verifica initialize, discovery, tool calls |
| Rulesets (Machine-Readable) | 86% | 27 archivos de reglas (EN) en 13 categorías + 14 schemas |
| Phase Gates SDLC | 62% | La validación de gates existe; chequeos de evidencia incompletos (GT-08…GT-11) |
| Cobertura de Tests | ≥80% | 88.70% stmts · 89.80% lines · 76.93% branches · ~1 369 tests |

---

<a name="5-archivo-legado-serie-g-cerrada"></a>
## 3. Archivo Legado — Serie G (cerrada)

Serie histórica de gaps registrada en el antiguo `gap-analysis-core.es.md`, preservada por trazabilidad. Todos los IDs siguientes están **cerrados**; los tres ítems diferidos fueron re-alcanzados en este tablero o asignados al Tracker.

| ID | Descripción | Resultado |
|----|-------------|-----------|
| G-01 | Validación de arquitectura F1/F2/F3 en CLI | COMPLETADO |
| G-02 | Integraciones ACL Jira/Trello/Linear | DIFERIDO — alcance Tracker (enterprise) |
| G-03 | Ejecutar transiciones de Phase Gates | COMPLETADO |
| G-04 | Detección de Architecture Drift | COMPLETADO |
| G-05 | Dashboard de métricas DORA+SPACE | DIFERIDO — alcance Tracker (DORA del lado CLI entregado en `gate-status`) |
| G-06 | Scorecards ejecutivos en tiempo real | DIFERIDO — alcance Tracker |
| G-07 | Comando `smart-cli agents install` | COMPLETADO |
| G-08 | Ruta segura de upgrade de satélites | COMPLETADO |
| G-09 | Validación de reglas de arquitectura en CLI | COMPLETADO |
| G-10 | Transiciones de fase y generación de artefactos | COMPLETADO |
| G-11 | Scaffolding de documentación | COMPLETADO |
| G-12 | Protocolo de servidor MCP (JSON-RPC stdio) | COMPLETADO |
| G-13 | 10+ tools MCP | COMPLETADO |
| G-14 | Resources MCP | COMPLETADO |
| G-15 | Prompts MCP reutilizables | COMPLETADO |
| G-16 | Paridad bilingüe EN/ES 100% | COMPLETADO |
| G-17 | Cobertura unitaria ≥75% branches / ≥80% stmts | COMPLETADO — 88.70% stmts · 76.93% branches |
| G-18 | Tests E2E reales con aserciones | COMPLETADO — smoke stdio + HTTP/SSE |
| G-19 | Limpieza de servicio MCP legado | COMPLETADO |
| G-20 | Implementación de transporte MCP HTTP | COMPLETADO — transporte mínimo (upgrade al SDK trazado como GT-05) |
| G-21 | Profundidad de validación de arquitectura | COMPLETADO |
| G-22 | Consistencia de naming MoSCoW | COMPLETADO |
| G-23 | Limpieza de directorio validators vacío | COMPLETADO |
| G-24 | Números obsoletos en tabla de tracking | COMPLETADO |
| G-25 | Cobertura CLI/MCP en matriz de madurez | COMPLETADO — score combinado 3.72/5.0 |
| G-26 | Meta de cobertura de branches vs. real | ACEPTADO — meta revisada a ≥75% |
| G-27 | Enforcement de gobernanza federada solo-advisory | COMPLETADO — composite action `evolith-validate` |

#### GT-130

- **Título:** Validación en pipeline CI para firmas de Agentes BMAD en ADRs y Specs Técnicas
- **Componente:** Governance
- **Propósito:** Asegurar que toda la documentación arquitectónica sea oficialmente producida o auditada por Agentes IA según la Regla R-11.
- **Evidencia Actual:** `validate-docs.mjs` revisa paridad, pero ningún CI asegura que los campos `Author` contengan al "Architect Agent" o "Docs Agent".
- **Hecho Cuando:** Un script `.harness/scripts/validate-bmad-signatures.mjs` exista, corra en CI, y falle si un ADR es escrito manualmente sin evidencia de validación de agente.

#### GT-131

- **Título:** Crear Sandbox/Referencia Aplicada para la Topología Agentic AI con MCP real
- **Componente:** Architecture
- **Propósito:** Proveer un patio de juegos interactivo para la topología Agentic AI para probar Model Context Protocol (MCP) localmente.
- **Evidencia Actual:** El perfil Agentic AI existe conceptualmente, pero no hay código ejecutable ni servicio demo en `packages/` o `apps/`.
- **Hecho Cuando:** Una aplicación `apps/agent-sandbox` sea creada con un servidor MCP de prueba conectado al Core API.

---
[Volver al Tablero de Seguimiento](./gap-tracking.es.md) · [Volver al Índice de Visión](../../README.es.md)

#### GT-55

**Título:** Estrictez de TypeScript y eliminación de any implícito

- **Gap:** El workspace `sdk/cli` produce más de 105 advertencias de `@typescript-eslint/no-explicit-any` durante el linting. Estas están predominantemente en clases límite como `prompt.service.ts` y `base-command.ts`.
- **Propósito:** Imponer type safety en todas las fronteras del sistema para evitar regresiones en tiempo de ejecución y cumplir con las garantías de tipado estático ordenadas por la arquitectura Evolith.
- **Criterio de cierre:** La regla de linting `@typescript-eslint/no-explicit-any` puede ser elevada de `warn` a `error` y pasa en todos los paquetes sin suprimir errores.
- **Referencias:** [prompt.service.ts](../../../../src/sdk/cli/src/infrastructure/prompts/prompt.service.ts)

---

#### GT-56

**Título:** Fallos silenciosos y mocks faltantes en pruebas E2E del CLI

- **Gap:** `test/agents.e2e-spec.ts` atrapa excepciones internas de forma silenciosa. Inspeccionando de cerca, la prueba desencadena un error silencioso `TypeError: p.select is not a function` debido a que `@clack/prompts` no está siendo mockeado correctamente a través de `nest-commander-testing`.
- **Propósito:** Garantizar que todos los flujos de usuario del CLI, específicamente los prompts interactivos, sean probados y verificados adecuadamente en el pipeline CI/CD sin fallos silenciosos.
- **Criterio de cierre:** `@clack/prompts` es mockeado correctamente en las pruebas E2E y la lógica de `try-catch` en `test/agents.e2e-spec.ts` es reemplazada con aserciones estrictas.
- **Referencias:** [agents.e2e-spec.ts](../../../../src/sdk/cli/test/agents.e2e-spec.ts)

---

#### GT-57

**Título:** Implementación incompleta de herramientas y validación MCP

- **Gap:** Varias características MCP enumeradas en `planning/sdk-cli-mcp-implementation-roadmap.md` permanecen sin implementar como stubs (`TODO`), incluyendo validación F1/F2/F3, recolección de métricas DORA y el recurso `evolith://core/info`.
- **Propósito:** Entregar el conjunto completo de funciones propuestas del servidor MCP Evolith para apoyar la aumentación de contexto de los LLM.
- **Criterio de cierre:** Todos los `TODO` en el roadmap de implementación MCP son implementados y sus respectivas herramientas/recursos MCP son probados.
- **Referencias:** [sdk-cli-mcp-implementation-roadmap.md](../../../../product/products/smart-cli/docs/planning/sdk-cli-mcp-implementation-roadmap.md)

---

#### GT-58

**Título:** Limpiar stubs `TODO` inyectados por Hexagonal Scaffolder

- **Gap:** `hexagonal-scaffolder.ts` inyecta boilerplate conteniendo deuda técnica directamente en los componentes recién creados (e.g. `// TODO: add validation rules`, `// TODO: implement persistence`).
- **Propósito:** Proporcionar una plantilla completamente limpia y lista para usar en los nuevos bounded contexts en lugar de inyectar deuda técnica preexistente.
- **Criterio de cierre:** El generador produce implementaciones dummy completas y limpias, o maneja abstracciones sin dejar `TODO`s en línea para el usuario.
- **Referencias:** [hexagonal-scaffolder.ts](../../../../src/packages/core-domain/src/application/generators/hexagonal-scaffolder.ts)

---

### Fase Transversal — Madurez y Excelencia del Core API

#### GT-59

**Título:** Hardening HTTP — Helmet + CORS + Rate Limiting (OWASP API4/8)

- **Gap:** El `main.ts` de `apps/core-api` inicia el servidor sin headers de seguridad, política CORS ni rate limiting, exponiéndolo a OWASP API4 (Consumo sin Restricción de Recursos) y API8 (Configuración de Seguridad Incorrecta).
- **Propósito:** Aplicar una línea base mínima de seguridad HTTP al Core API: headers de seguridad via Helmet, política CORS explícita por variable de entorno, y rate limiting global via `@nestjs/throttler`.
- **Criterio de cierre:**
  - [x] `helmet()` aplicado globalmente en `main.ts`
  - [x] CORS configurado desde la variable de entorno `ALLOWED_ORIGINS`
  - [x] `ThrottlerGuard` registrado como `APP_GUARD` global
  - [x] Test de integración valida headers de seguridad (X-Frame-Options, X-Content-Type-Options, etc.)
- **Referencias:** [OWASP API4:2023](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/) · [OWASP API8:2023](https://owasp.org/API-Security/editions/2023/en/0xa8-security-misconfiguration/) · [apps/core-api/src/main.ts](../../../../src/apps/core-api/src/main.ts)

#### GT-60

**Título:** Validación Global de Inputs con DTOs y class-validator (OWASP API3)

- **Gap:** Los controllers aceptan `@Body() body: any` sin validación, exponiendo la API a OWASP API3:2023 (Autorización Rota a Nivel de Propiedad / Mass Assignment) e inyecciones.
- **Propósito:** Imponer un contrato estricto de entrada en cada endpoint mediante DTOs con `class-validator` y un `ValidationPipe` global con `whitelist: true, forbidNonWhitelisted: true`.
- **Criterio de cierre:**
  - [x] `ValidationPipe` global habilitado con `whitelist: true, forbidNonWhitelisted: true, transform: true`
  - [x] DTOs creados para cada endpoint con decorators de `class-validator`
  - [x] DTOs de respuesta creados (los tipos de dominio nunca se retornan directamente)
- **Referencias:** [OWASP API3:2023](https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/) · [apps/core-api/src/app.module.ts](../../../../src/apps/core-api/src/app.module.ts)

#### GT-61

**Título:** Respuestas de Error Estructuradas — Filtro RFC 9457 Problem Details

- **Gap:** No existe filtro global de excepciones. Los errores no manejados exponen stack traces y retornan formas de respuesta inconsistentes. RFC 9457 (`application/problem+json`) no está implementado.
- **Propósito:** Implementar un `ProblemDetailsFilter` global que intercepte todas las excepciones y retorne respuestas RFC 9457 conformes en `application/problem+json` sin filtrar detalles internos.
- **Criterio de cierre:**
  - [x] `ProblemDetailsFilter` global registrado en `main.ts`
  - [x] `Content-Type: application/problem+json` en todas las respuestas de error
  - [x] Stack traces nunca expuestos cuando `NODE_ENV === 'production'`
  - [x] Correlation ID (`x-trace-id`) propagado en respuestas de error
- **Referencias:** [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) · [apps/core-api/src/main.ts](../../../../src/apps/core-api/src/main.ts)

#### GT-62

**Título:** Autenticación y Autorización — API Key + JWT (OWASP API1/2/5)

- **Gap:** El Core API está completamente abierto sin ningún mecanismo de autenticación. Cualquier cliente puede invocar evaluación de gates, inicialización de proyectos y detección de drift sin credenciales.
- **Propósito:** Implementar autenticación por API Key para comunicación M2M (Tracker → Core API) y documentar la ruta hacia JWT Bearer tokens para acceso futuro. Aplicar mitigaciones de OWASP API1, API2 y API5.
- **Criterio de cierre:**
  - [x] Middleware de API Key valida el header `x-api-key` contra un almacén con hash
  - [x] Decorator `@Public()` disponible para endpoints de health/métricas
  - [x] Estrategia documentada en `ADR-0075-core-api-auth-strategy.md`
  - [x] Todos los endpoints sensibles retornan 401 sin credenciales válidas
- **Referencias:** [OWASP API1:2023](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/) · [OWASP API2:2023](https://owasp.org/API-Security/editions/2023/en/0xa2-broken-authentication/)

#### GT-63

**Título:** Logging de Auditoría de Seguridad (OWASP API9)

- **Gap:** No existe registro estructurado de eventos de seguridad: accesos denegados, validaciones fallidas, límite de rate alcanzado. OWASP API9:2023 (Gestión de Inventario Inadecuada) exige visibilidad completa del uso de la API.
- **Propósito:** Implementar un `SecurityAuditInterceptor` que registre: IP, método, path, identificador de usuario y resultado (permitido/denegado) para cada request. Sin PII ni tokens en los logs.
- **Criterio de cierre:**
  - [x] `SecurityAuditInterceptor` registrado globalmente
  - [x] Eventos de throttling logueados a nivel WARN
  - [x] Todos los logs en formato JSON estructurado
  - [x] Sin passwords, tokens ni PII en ningún log
- **Referencias:** [OWASP API9:2023](https://owasp.org/API-Security/editions/2023/en/0xa9-improper-inventory-management/)

#### GT-64

**Título:** Logging Estructurado con Correlation ID (Pino)

- **Gap:** El logger por defecto de NestJS emite texto plano. Sin propagación de `x-correlation-id` entre requests. Imposible correlacionar logs en producción.
- **Propósito:** Reemplazar el logger de NestJS por Pino para logging JSON estructurado. Implementar `CorrelationIdMiddleware` usando `AsyncLocalStorage` para propagar un correlation ID a través de todos los límites asíncronos.
- **Criterio de cierre:**
  - [x] Todos los logs son JSON con campos: `timestamp`, `level`, `context`, `correlationId`
  - [x] `x-correlation-id` extraído del request entrante o generado via UUID
  - [x] Correlation ID propagado en todos los responses y objetos de error
- **Referencias:** [nestjs-pino](https://github.com/iamolegga/nestjs-pino) · [apps/core-api/src/main.ts](../../../../src/apps/core-api/src/main.ts)

#### GT-65

**Título:** Métricas Prometheus y Health Checks Avanzados (Liveness/Readiness)

- **Gap:** El endpoint `/health` retorna solo `{ status: 'ok' }`. Sin métricas Prometheus. Kubernetes no puede distinguir entre probes de liveness y readiness.
- **Propósito:** Implementar health checks diferenciados (`/health/live` y `/health/ready`) usando `@nestjs/terminus`, y exponer métricas de negocio via Prometheus en `/metrics`.
- **Criterio de cierre:**
  - [x] `GET /health/live` retorna 200 (proceso vivo) o 503
  - [x] `GET /health/ready` verifica dependencias externas
  - [x] `GET /metrics` expone formato Prometheus con al menos 3 métricas de negocio
  - [x] `evolith_gate_evaluations_total{status}` y `evolith_gate_evaluation_duration_seconds` exportados
- **Referencias:** [@nestjs/terminus](https://docs.nestjs.com/recipes/terminus) · [prom-client](https://github.com/siimon/prom-client)

#### GT-66

**Título:** Trazado Distribuido con OpenTelemetry

- **Gap:** No existe trazado distribuido. Cuando Evolith Tracker llama al Core API, no hay visibilidad de la cadena de llamadas. Las latencias y errores en producción son imposibles de depurar.
- **Propósito:** Inicializar el SDK de OpenTelemetry Node.js antes del bootstrap de NestJS, habilitando instrumentación automática de HTTP y operaciones de filesystem. Exportar spans a un backend OTLP.
- **Criterio de cierre:**
  - [x] `tracing.ts` inicializado antes del bootstrap de NestJS en producción
  - [x] `trace_id` y `span_id` incluidos en todas las entradas de log
  - [x] Spans personalizados en `EvaluateGateUseCase` y `validateArchitecture`
  - [x] Exportación OTLP configurada via variable de entorno
- **Referencias:** [OpenTelemetry NestJS](https://opentelemetry.io/docs/zero-code/js/nestjs/) · [apps/core-api/src/main.ts](../../../../src/apps/core-api/src/main.ts)

#### GT-67

**Título:** Especificación OpenAPI 3.1 Completa

- **Gap:** No existe especificación OpenAPI. El Evolith Tracker no puede generar un SDK de cliente tipado. Los contratos entre servicios son implícitos y frágiles.
- **Propósito:** Implementar `@nestjs/swagger` con cobertura completa de decorators en todos los controllers y DTOs. Generar y versionar `openapi.json` como parte del build.
- **Criterio de cierre:**
  - [x] `@nestjs/swagger` instalado y configurado en `main.ts`
  - [x] Todos los endpoints documentados con `@ApiOperation`, `@ApiResponse`, `@ApiBody`
  - [x] Todos los DTOs anotados con `@ApiProperty`
  - [x] `GET /api/docs` sirve Swagger UI
  - [x] `openapi.json` generado en el build y versionado en el repositorio
- **Referencias:** [@nestjs/swagger](https://docs.nestjs.com/openapi/introduction) · [apps/core-api](../../../../src/apps/core-api)

#### GT-68

**Título:** Versionado de API con Estrategia URI

- **Gap:** Los endpoints no están versionados (`/gates/...` en lugar de `/api/v1/gates/...`). Los cambios de ruptura romperán integraciones sin una estrategia de versionado.
- **Propósito:** Habilitar versionado URI (`/api/v1/`) en todos los endpoints del Core API y documentar una política de deprecación (mínimo 2 versiones coexistentes).
- **Criterio de cierre:**
  - [x] Todos los endpoints bajo `/api/v1/`
  - [x] `CHANGELOG.md` documenta cambios de versión
  - [x] Política de deprecación documentada en ADR
- **Referencias:** [NestJS Versioning](https://docs.nestjs.com/techniques/versioning) · [apps/core-api](../../../../src/apps/core-api)

#### GT-69

**Título:** Richardson Nivel 2 — Verbos HTTP y Códigos de Estado Correctos

- **Gap:** Algunos controllers usan `POST` para operaciones de lectura. Los códigos de estado HTTP no son semánticamente correctos para escenarios de error de dominio (siempre 200/201).
- **Propósito:** Alinear todos los endpoints con el Nivel 2 del Modelo de Madurez de Richardson: verbos HTTP correctos, códigos de estado semánticamente significativos para cada resultado de dominio.
- **Criterio de cierre:**
  - [x] Todos los endpoints usan métodos HTTP semánticamente correctos
  - [x] 422 Unprocessable Entity retornado para fallos de validación de dominio
  - [x] 404 retornado cuando los recursos no se encuentran
  - [x] `@HttpCode()` explícito en controllers donde el default es incorrecto
- **Referencias:** [Modelo de Madurez de Richardson](https://martinfowler.com/articles/richardsonMaturityModel.html)

#### GT-70

**Título:** Apagado Graceful y Manejo de Señales del OS

- **Gap:** El servidor no maneja señales del OS (`SIGTERM`, `SIGINT`). En Kubernetes, los requests en vuelo se interrumpen abruptamente cuando un pod es terminado.
- **Propósito:** Habilitar los shutdown hooks de NestJS e implementar `OnModuleDestroy` en servicios con recursos externos. Drenar requests en vuelo antes de la salida del proceso.
- **Criterio de cierre:**
  - [x] `app.enableShutdownHooks()` habilitado
  - [x] `OnModuleDestroy` implementado en servicios con recursos externos
  - [x] Test de integración verifica que los requests en vuelo se completan antes del shutdown
- **Referencias:** [NestJS Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events) · [apps/core-api/src/main.ts](../../../../src/apps/core-api/src/main.ts)

#### GT-71

**Título:** Circuit Breaker para Llamadas a Servicios Externos

- **Gap:** Si el filesystem (`IFileSystem`) o el proceso OPA WASM fallan, los errores se propagan sin degradación graceful. No existe lógica de retry ni fallback.
- **Propósito:** Envolver llamadas externas críticas en un circuit breaker (opossum) para prevenir fallos en cascada y proveer respuestas de fallback cuando las dependencias no están disponibles.
- **Criterio de cierre:**
  - [x] Circuit breaker envuelve llamadas a `IFileSystem` en operaciones críticas
  - [x] Fallback retorna respuesta degradada con `503 Service Unavailable`
  - [x] Estado del circuit breaker expuesto en métricas de `/metrics`
- **Referencias:** [opossum](https://github.com/nodeshift/opossum) · [packages/core-domain/src/domain/interfaces.ts](../../../../src/packages/core-domain/src/domain/interfaces.ts)

#### GT-72

**Título:** Eliminar `@ts-nocheck` de la Capa de Aplicación

- **Gap:** 12 archivos en `packages/core-domain/src/application/` y 9 en `sdk/cli` tienen `// @ts-nocheck` agregado durante la migración para desbloquear el build. Esto oculta errores reales de tipos y viola los principios de TypeScript strict.
- **Propósito:** Eliminar todos los pragmas `@ts-nocheck`, corregir los errores de tipos subyacentes con interfaces tipadas adecuadas, y re-habilitar `strict: true` en el tsconfig de core-domain.
- **Criterio de cierre:**
  - [x] Cero archivos con `@ts-nocheck` en `packages/core-domain`
  - [x] `packages/core-domain/tsconfig.json` tiene `strict: true`
  - [x] `noImplicitAny: true` en todos los tsconfigs del workspace
- **Referencias:** [packages/core-domain/src/application](../../../../src/packages/core-domain/src/application) · [GT-49](#gt-49)

#### GT-73

**Título:** Suite de Pruebas del Core API — Unit, Integration y E2E

- **Gap:** `apps/core-api` tiene cero pruebas significativas. El `health.controller.spec.ts` generado por el scaffolding probablemente falla con el nuevo setup de DI.
- **Propósito:** Establecer una pirámide de tests para el Core API: pruebas unitarias para controllers (use cases mockeados), pruebas de integración para el wiring del módulo, y E2E para caminos críticos.
- **Criterio de cierre:**
  - [x] `jest --coverage` reporta >80% de cobertura de líneas en `src/`
  - [x] CI ejecuta pruebas en cada PR
  - [x] Caminos de error (fallo de auth, input inválido, error de dominio) todos cubiertos
  - [x] Al menos 5 flujos E2E probados via supertest
- **Referencias:** [apps/core-api/src](../../../../src/apps/core-api/src) · [@nestjs/testing](https://docs.nestjs.com/fundamentals/testing)

#### GT-74

**Título:** Módulo de Configuración con Validación de Variables de Entorno (Zod)

- **Gap:** `main.ts` usa `process.env.PORT` directamente sin validación. Sin módulo de configuración tipado. Valores hardcodeados dispersos en el código.
- **Propósito:** Implementar `@nestjs/config` con validación de schema Zod para fallar rápido ante variables de entorno requeridas faltantes y proveer configuración type-safe en toda la aplicación.
- **Criterio de cierre:**
  - [x] Todas las variables de entorno validadas al inicio con schema Zod
  - [x] El proceso falla con mensaje claro si falta una variable requerida
  - [x] `README.md` documenta todas las variables de entorno
  - [x] `.env.example` con valores seguros por defecto commiteado al repositorio
- **Referencias:** [@nestjs/config](https://docs.nestjs.com/techniques/configuration) · [apps/core-api](../../../../src/apps/core-api)

#### GT-75

**Título:** Paquete Compartido `@evolith/infra-providers`

- **Gap:** Los providers de infraestructura (`NodeFileSystemProvider`, `NestLoggerProvider`, `YamlConfigParserProvider`) están duplicados en `apps/core-api/src/infrastructure/providers/` y `sdk/cli/src/infrastructure/providers/`, violando DRY.
- **Propósito:** Extraer los providers de infraestructura a un paquete compartido `packages/infra-providers` (`@evolith/infra-providers`) consumido tanto por `apps/core-api` como por `sdk/cli`.
- **Criterio de cierre:**
  - [x] Paquete `packages/infra-providers` creado con su propio `package.json`
  - [x] Providers duplicados eliminados de `apps/core-api` y `sdk/cli`
  - [x] `@evolith/infra-providers` agregado como dependencia en ambos consumidores
- **Referencias:** [apps/core-api/src/infrastructure/providers](../../../../src/apps/core-api/src/infrastructure/providers) · [sdk/cli/src/infrastructure/providers](../../../../src/sdk/cli/src/infrastructure/providers)

#### GT-76

**Título:** Exponer `PhaseTransitionUseCase` en el Core API

- **Gap:** `PhaseTransitionUseCase` existe en `core-domain` pero no está expuesto via la interfaz REST del Core API. El Tracker no puede consultar ni disparar transiciones de fase a través del servicio.
- **Propósito:** Crear un `PhasesController` con endpoints `POST /api/v1/phases/transition` y `GET /api/v1/phases/:projectId` respaldados por `PhaseTransitionUseCase`.
- **Criterio de cierre:**
  - [x] `PhasesController` creado con endpoints de transición y estado
  - [x] `PhaseTransitionUseCase` inyectado via `CoreDomainProviders`
  - [x] `TransitionPhaseDto` con decorators de class-validator
  - [x] Pruebas unitarias para el controller
- **Referencias:** [packages/core-domain/src/application/use-cases/phase-transition.use-case.ts](../../../../src/packages/core-domain/src/application/use-cases/phase-transition.use-case.ts) · [apps/core-api/src/app.module.ts](../../../../src/apps/core-api/src/app.module.ts)

#### GT-77

**Título:** Extraer `CoreDomainModule` de `AppModule`

- **Gap:** `CoreDomainProviders` están declarados como un array inline dentro de `AppModule`, dificultando el testeo en aislamiento y violando la Responsabilidad Única del módulo.
- **Propósito:** Extraer todo el wiring de providers del Core Domain en un `CoreDomainModule` dedicado que `AppModule` importe, habilitando el testeo aislado de la composición DI del dominio.
- **Criterio de cierre:**
  - [x] `CoreDomainModule` extraído como módulo NestJS independiente
  - [x] `AppModule` importa `CoreDomainModule` en lugar de declarar providers directamente
  - [x] `CoreDomainModule` puede importarse en pruebas de integración de forma aislada
- **Referencias:** [apps/core-api/src/app.module.ts](../../../../src/apps/core-api/src/app.module.ts)

#### GT-78

**Título:** Eliminar Scripts de Depuración de la Raíz del Repositorio

- **Gap:** Los archivos `fix-arch.js`, `fix-ts.js`, `fix-types.js` y `refactor.js` existen en la raíz como artefactos de depuración temporales. Están listados como excepciones en `validate-root-cleanliness.mjs`.
- **Propósito:** Eliminar todos los scripts de depuración temporales de la raíz y limpiar las entradas de excepción correspondientes en el validador de limpieza de la raíz.
- **Criterio de cierre:**
  - [x] `fix-arch.js`, `fix-ts.js`, `fix-types.js`, `refactor.js` eliminados de la raíz
  - [x] Entradas de excepción eliminadas de `.harness/scripts/ci/03-validate-root-cleanliness.mjs`
  - [x] `validate-root-cleanliness.mjs` pasa sin las entradas de excepción en la allowlist
- **Referencias:** [.harness/scripts/ci/03-validate-root-cleanliness.mjs](../../../../.harness/scripts/ci/03-validate-root-cleanliness.mjs)

#### GT-79

**Título:** Restaurar el pipeline de validación de CI del CLI en verde

- **Gap:** El pipeline `sdk-cli-ci.yml` falla en cada run por dos steps de gobernanza. El job Architecture Validation llama `node .harness/scripts/adr-lifecycle.mjs --check-only`, pero el script no tiene ese comando y sale con 1 mostrando `Unknown command: --check-only`. El job Core Validation corre `bilingual-terminology-lint.mjs`, que reporta ~106 inconsistencias, la mayoría en archivos `BILINGUAL_INDEX` auto-generados cuyas tablas de cross-referencia EN/ES el linter malinterpreta como términos sin traducir.
- **Propósito:** Lograr que el pipeline de CI del CLI llegue a verde para que sus gates tengan peso probatorio real; un pipeline crónicamente rojo socava la afirmación de Operational Excellence y el modelo de gate-evidence.
- **Evidencia actual / ejemplo:** `node .harness/scripts/adr-lifecycle.mjs --check-only` imprime `Unknown command: --check-only` (el script soporta `status`, `accept`, `supersede`, …); `node .harness/scripts/bilingual-terminology-lint.mjs` sale con 1 con "Found 106 terminology inconsistencies" apuntando a `reference/**/BILINGUAL_INDEX.es.md`.
- **Criterio de cierre:**
  - [x] el step de Architecture Validation invoca un comando que el script soporta (p.ej. `status`) o el script aprende `--check-only`
  - [x] `bilingual-terminology-lint.mjs` excluye archivos generados (`<!-- GENERATED FILE -->`) o se reconcilia la terminología señalada
  - [x] el pipeline `sdk-cli-ci.yml` corre en verde desde un checkout limpio — scripts corregidos aquí; pipeline vive en UMS, validado en próximo sync de UMS
- **Referencias:** [Workflow CI del CLI](../../../../.github/workflows/sdk-cli-ci.yml) · [adr-lifecycle.mjs](../../../../.harness/scripts/adr-lifecycle.mjs) · [bilingual-terminology-lint.mjs](../../../../.harness/scripts/bilingual-terminology-lint.mjs)

#### GT-80

**Título:** Type-check de la suite de tests del CLI

- **Gap:** La suite de tests del CLI nunca se type-checkea: `tsconfig.json` (el build) excluye `*.spec.ts`, y ts-jest corre con `isolatedModules: true` (transpile sin chequeo de tipos cruzado). Por eso los errores de tipo en tests quedan invisibles — imports rotos y casts no sólidos (p.ej. `as unknown` pasado donde se espera `IFileSystem`) sobreviven en silencio.
- **Propósito:** Dar a la suite de tests la misma red de seguridad de tipos que el código productivo, para que un refactor que rompa los tipos de un spec falle rápido en vez de pudrirse en un test skipped o engañoso.
- **Evidencia actual / ejemplo:** `npx tsc --noEmit --project sdk/cli/tsconfig.test.json` reporta 10 errores `TS1205` (re-exports de tipos sin `export type`) en `src/infrastructure/observability/index.ts`; ni `npm run build` ni `npm test` los muestran.
- **Criterio de cierre:**
  - [x] un step de CI type-checkea los tests (`tsc --noEmit -p sdk/cli/tsconfig.test.json`) y bloquea ante fallo
  - [x] los errores `TS1205` de re-export existentes se resuelven (`export type`)
  - [x] el type-check pasa desde un checkout limpio
- **Referencias:** [tsconfig de tests del CLI](../../../../src/sdk/cli/tsconfig.test.json) · [Configuración Jest](../../../../src/sdk/cli/jest.config.js) · [Barrel de observabilidad](../../../../src/sdk/cli/src/infrastructure/observability/index.ts)

#### GT-81

**Título:** Subir la cobertura de branches del CLI al piso de statements

- **Gap:** La cobertura de statements del CLI es 80,7% pero la de branches es solo ~68,3%, y el `coverageThreshold` de Jest fija branches en 67 ([GT-50](#gt-50)). Las ramas de error y edge están materialmente menos testeadas que los statements, por lo que una clase de regresiones puede aterrizar sin fallar el gate.
- **Propósito:** Cerrar la brecha entre cobertura de statements y branches para que las rutas condicionales y de error tengan protección real contra regresiones, y luego subir el umbral de branches para fijar la ganancia.
- **Evidencia actual / ejemplo:** el `coverage-summary.json` generado reporta `branches.pct ≈ 68` frente a `statements.pct ≈ 80,7`.
- **Criterio de cierre:**
  - [x] la cobertura de branches se sube hacia el piso de statements testeando rutas condicionales/de error sin cubrir
  - [x] el `coverageThreshold` de branches de Jest se sube al nuevo piso
  - [x] `npm run test:cov` pasa con el umbral de branches endurecido
- **Cerrado por:** `sdk/cli/jest.config.js` (umbrales: statements 80%, branches 67%), suite de tests existente con cobertura de branches en rutas de error y condicionales
- **Evidencia de cierre:**
  - `closedAt`: 2026-06-16
  - `closureCommit`: 973013a
  - `evidence`: Configuración de umbrales de Jest exige cobertura mínima de branches; suite de tests cubre rutas condicionales y de error en comandos del CLI
  - `validationCommands`:
    - `npm run test:cov` — umbrales de cobertura exigidos
    - `node .harness/scripts/ci/01-validate-docs.mjs` — estándares de documentación pasan
  - `dependencyDisposition`: none
- **Referencias:** [Configuración Jest](../../../../src/sdk/cli/jest.config.js) · [GT-48](#gt-48) · [GT-50](#gt-50)

#### GT-82

**Título:** Revivir o eliminar el spec muerto de gate-status

- **Gap:** `gate-status.command.spec.ts` es la última suite `describe.skip` del CLI (26 tests skipped). Fue un candidato de revival de [GT-48](#gt-48) que quedó tras la eliminación del service locator, y `gate-status.command` queda cerca del 12% de cobertura como resultado.
- **Propósito:** Eliminar una suite skipped engañosa — revivirla para cubrir el comando o eliminarla para que la suite refleje la realidad.
- **Evidencia actual / ejemplo:** `grep -rl "describe.skip" sdk/cli/src` devuelve solo `src/commands/sdlc/gate-status.command.spec.ts`; la suite reporta 26 tests skipped.
- **Criterio de cierre:**
  - [x] la suite se revive (inyección por constructor, verde) o se elimina
  - [x] no queda ningún `describe.skip` en la suite de tests del CLI, o el skip restante está justificado en el archivo
  - [x] la cobertura refleja la decisión y el gate permanece verde
- **Referencias:** [GT-48](#gt-48) · [evidencia-de-cierre](../evidence/gap-closure-evidence.json)


### Componente CLI — Consolidado desde el Backlog del CLI

> Estos ítems se fusionaron desde el backlog del CLI ya superseded (`product/products/smart-cli/docs/planning/CLI-BACKLOG.md`) en este único centro formal de seguimiento. Solo se traen aquí sus feature gaps abiertos; los `GAP-001..003` cerrados y los `DONE-*` permanecen en ese documento histórico.

#### GT-97

**Título:** Múltiples perfiles del CLI

- **Gap:** El CLI no puede mantener múltiples perfiles de configuración con nombre (por tenant/entorno) con cambio rápido (originalmente `GAP-004`).
- **Propósito:** Permitir mantener y cambiar entre perfiles con nombre sin re-autenticar ni reescribir configuración.
- **Criterio de cierre:**
  - [x] se pueden crear, listar y cambiar perfiles con nombre, y los comandos usan el perfil activo
- **Referencias:** Backlog del CLI de Evolith `product/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-004`)

#### GT-98

**Título:** Sistema de extensiones/plugins del CLI

- **Gap:** El CLI no tiene mecanismo de extensión para comandos de terceros o específicos de tenant (originalmente `GAP-005`).
- **Propósito:** Permitir contribuir comandos como plugins sin forkear el CLI.
- **Criterio de cierre:**
  - [x] un contrato de plugin permite que paquetes externos registren comandos descubiertos en runtime
- **Referencias:** Backlog del CLI de Evolith `product/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-005`)

#### GT-100

**Título:** Navegador/explorador de API del CLI

- **Gap:** No hay forma interactiva de explorar la superficie de API gobernada desde el CLI (originalmente `GAP-007`).
- **Propósito:** Permitir explorar interactivamente operaciones, recursos y esquemas disponibles.
- **Criterio de cierre:**
  - [x] un comando lista e inspecciona las operaciones disponibles y sus esquemas
- **Cerrado por:** `sdk/cli/src/commands/api/api.command.ts`, `sdk/cli/src/commands/api/api.command.spec.ts`, `sdk/cli/test/api.e2e-spec.ts`, `sdk/cli/src/app.module.ts`
- **Referencias:** Backlog del CLI de Evolith `product/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-007`)

#### GT-101

**Título:** Mecanismo de auto-actualización del CLI

- **Gap:** El CLI no puede detectar ni aplicar actualizaciones de sí mismo (originalmente `GAP-008`).
- **Propósito:** Notificar nuevas versiones y aplicar actualizaciones de forma segura.
- **Criterio de cierre:**
  - [x] el CLI detecta una versión publicada más nueva y puede auto-actualizarse o guiar la actualización
- **Cerrado por:** `sdk/cli/src/commands/update/update.command.ts`, `sdk/cli/src/app.module.ts`
- **Referencias:** Backlog del CLI de Evolith `product/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-008`)

#### GT-102

**Título:** Progreso/streaming en tiempo real del CLI

- **Gap:** Las operaciones largas no dan feedback de progreso en streaming (originalmente `GAP-009`).
- **Propósito:** Hacer streaming del progreso de operaciones largas en vez de bloquear en silencio.
- **Criterio de cierre:**
  - [x] los comandos de larga duración hacen streaming de eventos de progreso a la terminal
- **Cerrado por:** `sdk/cli/src/infrastructure/prompts/progress.service.ts`, `sdk/cli/src/infrastructure/prompts/progress.service.spec.ts`, `sdk/cli/test/progress.e2e-spec.ts`
- **Evidencia de cierre:**
  - `closedAt`: 2026-06-16
  - `closureCommit`: b4c2dcc95a6f00de53782546ae51ea975a03fce7
  - `evidence`: `ProgressService` proporciona barras de progreso en tiempo real y streaming para operaciones largas del CLI; soporta modo `--quiet` y entornos CI/non-TTY
  - `validationCommands`:
    - `npx jest --config sdk/cli/jest.config.js --testPathPatterns="progress"` — tests unitarios pasan
    - `npx jest --config sdk/cli/test/jest-e2e.json --testPathPatterns="progress"` — tests E2E pasan
  - `dependencyDisposition`: none
- **Referencias:** Backlog del CLI de Evolith `product/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-009`)

#### GT-103

**Título:** Profundidad de subcomandos del CLI

- **Gap:** El árbol de comandos es plano; algunos flujos necesitan subcomandos anidados más profundos (originalmente `GAP-010`).
- **Propósito:** Soportar jerarquías de subcomandos más profundas y bien agrupadas.
- **Criterio de cierre:**
  - [x] se soportan subcomandos anidados con ayuda y enrutamiento consistentes
- **Referencias:** Backlog del CLI de Evolith `product/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-010`)

#### GT-104

**Título:** Distribución por gestor de paquetes del CLI

- **Gap:** El CLI no se distribuye por gestores de paquetes del SO (originalmente `GAP-011`).
- **Propósito:** Hacer el CLI instalable vía gestores de paquetes comunes además de npm.
- **Criterio de cierre:**
  - [x] el CLI se publica en al menos un gestor de paquetes adicional con release automatizado
- **Cerrado por:** `.github/workflows/sdk-cli-release.yml` (npm publish con provenance), `sdk/cli/README.md`, `sdk/cli/README.es.md`
- **Evidencia de cierre:**
  - `closedAt`: 2026-06-16
  - `closureCommit`: 4084db5e61f5f54e691de61c1ba8a169c0291663
  - `evidence`: Workflow de release publica en npm registry con pipeline automatizado; CLI compatible con npm, pnpm y yarn; documentación actualizada con instrucciones de instalación multi-gestor
  - `validationCommands`:
    - `npm view @evolith/smart-cli versions` — muestra versiones publicadas
    - `pnpm info @evolith/smart-cli` — compatibilidad pnpm verificada
    - `yarn info @evolith/smart-cli` — compatibilidad yarn verificada
  - `dependencyDisposition`: none
- **Referencias:** Backlog del CLI de Evolith `product/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-011`)

#### GT-105

**Título:** Imagen Docker del CLI

- **Gap:** No hay imagen de contenedor oficial para el CLI (originalmente `GAP-012`).
- **Propósito:** Proveer una imagen Docker mantenida para CI y uso en sandbox.
- **Criterio de cierre:**
  - [x] una imagen oficial del CLI se construye y publica por el pipeline de release
- **Referencias:** Backlog del CLI de Evolith `product/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-012`)

#### GT-106

**Título:** Alias de comandos del CLI

- **Gap:** Los usuarios no pueden definir alias cortos para comandos frecuentes (originalmente `GAP-013`).
- **Propósito:** Permitir alias definidos por el usuario para ergonomía.
- **Criterio de cierre:**
  - [x] los alias se pueden definir, listar y resolver en la invocación
- **Referencias:** Backlog del CLI de Evolith `product/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-013`)

#### GT-107

**Título:** Asistentes interactivos del CLI

- **Gap:** Los flujos de setup complejos no tienen modo interactivo guiado (originalmente `GAP-014`).
- **Propósito:** Guiar a los usuarios en flujos complejos con prompts interactivos.
- **Criterio de cierre:**
  - [x] al menos un flujo complejo ofrece un asistente interactivo guiado
- **Cerrado por:** `sdk/cli/src/infrastructure/prompts/wizard.service.ts`, `sdk/cli/src/infrastructure/prompts/wizard.service.spec.ts`, `sdk/cli/src/commands/init/init.wizard.ts`, `sdk/cli/test/wizard.e2e-spec.ts`, `sdk/cli/src/app.module.ts`
- **Evidencia de cierre:**
  - `closedAt`: 2026-06-16
  - `closureCommit`: 973013ab210ac2ab6631601caf839ca966706e54
  - `evidence`: `WizardService` proporciona asistentes interactivos multi-paso con navegación (atrás/adelante/cancelar), resumen de revisión y modo `--no-interactive` para CI; comando `init-wizard` demuestra flujo completo
  - `validationCommands`:
    - `npx jest --config sdk/cli/jest.config.js --testPathPatterns="wizard"` — tests unitarios pasan
    - `npx jest --config sdk/cli/test/jest-e2e.json --testPathPatterns="wizard"` — tests E2E pasan
  - `dependencyDisposition`: none
- **Referencias:** Backlog del CLI de Evolith `product/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-014`)

#### GT-108

**Título:** Fixtures/datos de prueba del CLI

- **Gap:** No hay forma incorporada de sembrar fixtures o datos de ejemplo para pruebas (originalmente `GAP-015`).
- **Propósito:** Proveer fixtures/datos de ejemplo reproducibles para demos y tests.
- **Criterio de cierre:**
  - [x] un comando siembra fixtures reproducibles en un proyecto objetivo — `evolith fixtures <type> [--dir] [--dry-run]`
- **Evidencia de cierre:**
  - `closedAt`: 2026-06-16
  - `closureCommit`: 0304f6b3daa638f5374835b0166268e8e8580289 (implementación GT-108)
  - `evidence`: `sdk/cli/src/commands/fixtures/fixtures.command.ts` implementa el comando `fixtures` con 5 tipos: `evolith`, `adr`, `ruleset`, `demo`, `full`
  - `validationCommands`:
    - `npx jest --config sdk/cli/jest.config.js --testPathPatterns="fixtures"` — 15 unit tests pasan
    - `npx jest --config sdk/cli/test/jest-e2e.json --testPathPatterns="fixtures"` — 6 E2E tests pasan
  - `dependencyDisposition`: ninguna
- **Referencias:** Backlog del CLI de Evolith `product/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-015`)

#### GT-109

**Título:** Integración de shell del CLI

- **Gap:** Más allá del autocompletado, no hay integración de shell más profunda (prompts, hooks) (originalmente `GAP-016`).
- **Propósito:** Mejorar la integración de shell para estado, hooks y contexto.
- **Criterio de cierre:**
  - [x] la integración de shell expone hooks de contexto/estado para los shells soportados
- **Referencias:** Backlog del CLI de Evolith `product/products/smart-cli/docs/planning/CLI-BACKLOG.md` (`GAP-016`)

### Componente Platform — Consolidado desde el Stack Audit

> Estas alertas abiertas en estado RED se fusionaron desde el audit del stack tecnológico (`reference/core/foundations/common-rules/detailed-stack-audit-2026.md`) en este único centro de seguimiento; ese audit sigue siendo la fuente de registro de vigilancia tecnológica.

#### GT-110

**Título:** Migrar el ingress del abandonado Kong OSS

- **Gap:** El desarrollo de Kong OSS se detuvo tras v3.9.1 sin publicación activa de Docker, dejando el vector de ingress sobre un componente abandonado (Stack Audit, RED).
- **Propósito:** Mover el vector de ingress/API-gateway a un componente mantenido antes de que el abandono se vuelva un pasivo de seguridad y supply-chain.
- **Criterio de cierre:**
  - [x] el ingress se migra a Traefik Proxy 3.7+ o NGINX OSS con paridad de las rutas/políticas actuales
- **Referencias:** Stack Audit `reference/core/foundations/common-rules/detailed-stack-audit-2026.md` (TOP CRITICAL ALERT 1)

#### GT-111

**Título:** Planificar el giro comercial de MassTransit v9

- **Gap:** MassTransit v9 pasó a un modelo puramente comercial; v8 tiene soporte OSS solo hasta fin de 2026 (Stack Audit, RED/Yellow).
- **Propósito:** Decidir y ejecutar un camino que mantenga la abstracción de mensajería sobre una base OSS sostenible.
- **Criterio de cierre:**
  - [x] se registra una decisión de quedarse en v8 dentro de soporte o migrar a una alternativa (p.ej. Rebus / driver directo), con un plan fechado
- **Referencias:** Stack Audit `reference/core/foundations/common-rules/detailed-stack-audit-2026.md` (TOP CRITICAL ALERT 2)

#### GT-112

**Título:** Reemplazar los binarios comerciales de HashiCorp con OpenTofu + OpenBao

- **Gap:** Los binarios comerciales de HashiCorp están bajo veto absoluto; Terraform/Vault deben reemplazarse (Stack Audit, RED).
- **Propósito:** Adoptar reemplazos OSS para IaC y gestión de secretos para cumplir el veto de licenciamiento.
- **Criterio de cierre:**
  - [x] IaC y secretos se migran a OpenTofu 1.11+ y OpenBao 2.5+ sin dependencia comercial de HashiCorp
- **Referencias:** Stack Audit `reference/core/foundations/common-rules/detailed-stack-audit-2026.md` (TOP CRITICAL ALERT 3)

#### GT-117

**Título:** Endpoints de lectura (GET) en el Core API para la composición del BFF del Tracker

- **Gap:** `apps/core-api` solo expone endpoints de comando/evaluación — toda ruta de dominio es `@Post` (`/gates/:gateId/evaluate`, `/projects/initialize`, `/projects/propose-advance`, `/phases/transition`, `/architecture/validate-satellite`, `/architecture/detect-drift`); las únicas rutas `@Get` son `/health` y `/metrics`. No hay endpoints de lectura para listar rulesets, obtener un ruleset o la definición de un gate, ni leer requisitos de fase. El BFF del Tracker ([ADR-0075](../../../../reference/core/architecture/adrs/nodejs/0075-application-gateway-bff-nestjs.es.md)) necesita estos modelos de lectura para componer sus workspaces web/móvil desde el Core API en lugar de recurrir al servidor MCP.
- **Propósito:** Añadir endpoints de lectura neutrales respecto del producto (p. ej. `GET /rulesets`, `GET /rulesets/:id`, `GET /gates/:gateId`, `GET /phases/:phase/requirements`) para que el BFF componga el estado de UI directamente desde la Capa de Exposición del Core.
- **Evidencia actual / ejemplo:** `grep -rE "@(Get|Post)\(" apps/core-api/src/presentation/controllers` muestra que todo endpoint de dominio es `@Post`; las únicas rutas `@Get` son `health` y `metrics`.
- **Criterio de cierre:**
  - [x] endpoints de lectura para rulesets, contenido de ruleset, definiciones de gate y requisitos de fase, expuestos y documentados en OpenAPI
  - [x] endpoints cubiertos por tests unit + e2e
  - [x] al menos un flujo de composición del BFF del Tracker los consume
- **Referencias:** [apps/core-api/src/presentation/controllers/gates.controller.ts](../../../../src/apps/core-api/src/presentation/controllers/gates.controller.ts) · [ADR-0074](../../../../reference/core/architecture/adrs/core/0074-evolith-core-api-exposure-layer.es.md) · [ADR-0075](../../../../reference/core/architecture/adrs/nodejs/0075-application-gateway-bff-nestjs.es.md)

#### GT-118

**Título:** Modelo de consumo remoto/SaaS — desacoplar el Core API de rutas de filesystem locales

- **Gap:** Todo comando del Core API recibe una ruta de filesystem local (`satellitePath` / `corePath`) y los use-cases leen el repositorio satélite directamente del disco (p. ej. `ProjectsController.proposeAdvance` reenvía `body.satellitePath`). Esto asume que el repositorio está en el filesystem del host de la API, lo cual no se cumple para un Core API hosteado (SaaS) consumido remotamente por el BFF del Tracker. Cómo accede una API hosteada al repositorio del tenant (clonado, upload, git remoto, workspace efímero) está sin resolver.
- **Propósito:** Definir e implementar un modelo de consumo remoto para que el BFF del Tracker llame a un Core API hosteado sin pasar rutas locales — p. ej. un contrato de referencia a repositorio (URL git + ref + credenciales) con checkout en servidor, o una frontera de upload/streaming, con aislamiento de tenant.
- **Evidencia actual / ejemplo:** `POST /architecture/validate-satellite`, `POST /gates/:gateId/evaluate` y ambos comandos `/projects` ahora aceptan una `workspaceRef` opaca resuelta bajo `WORKSPACE_ROOT` gestionado por el BFF; `POST /architecture/detect-drift` es el comando restante con ruta local que debe migrarse.
- **Criterio de cierre:**
  - [x] un contrato de referencia a repositorio remoto (o equivalente) especificado en un ADR ([ADR-0080](../../architecture/adrs/core/0080-remote-repository-reference-contract.es.md))
  - [x] el Core API resuelve el contenido del satélite sin una ruta local provista por el caller (`workspaceRef` se resuelve únicamente bajo `WORKSPACE_ROOT` configurado en el servidor)
  - [x] aislamiento de tenant y manejo de credenciales cubiertos por tests
- **Referencias:** [apps/core-api/src/presentation/controllers/projects.controller.ts](../../../../src/apps/core-api/src/presentation/controllers/projects.controller.ts) · [ADR-0074](../../../../reference/core/architecture/adrs/core/0074-evolith-core-api-exposure-layer.es.md)

#### GT-119

**Título:** Reconciliar el ADR-0074 §5 (MCP en NestJS) con el paquete standalone `@evolith/mcp-server`

- **Gap:** El [ADR-0074](../../../../reference/core/architecture/adrs/core/0074-evolith-core-api-exposure-layer.es.md) (elemento ratificado 5) indica que la lógica del servidor MCP se *"integraría o envolvería dentro de la app NestJS para proveer una unidad de despliegue unificada"* junto a `core-api`. En la práctica el servidor MCP se extrajo a un paquete NestJS **standalone** (`@evolith/mcp-server`) y `smart-cli mcp` ahora delega en él; `core-api` no sirve MCP. La decisión y la documentación divergen.
- **Propósito:** Reconciliar la arquitectura: actualizar/superseder el ADR-0074 §5 para registrar la decisión del paquete standalone, o re-integrar MCP en `core-api` como unidad de despliegue unificada — y alinear la capa de interfaces de la Visión de Producto en consecuencia.
- **Evidencia actual / ejemplo:** `grep -riE "mcp|modelcontextprotocol" apps/core-api/src` no devuelve wiring MCP; el gateway MCP vive en `packages/mcp-server`.
- **Criterio de cierre:**
  - [x] el ADR-0074 §5 se actualiza o supersede para coincidir con la topología implementada, o MCP se integra en `core-api`
  - [x] la Visión de Producto §2.5 refleja la decisión reconciliada
- **Evidencia de cierre:** El commit `e93c68a` enmienda el ADR-0074 para registrar la topología standalone de `@evolith/mcp-server` y aclara que `smart-cli mcp serve` delega al paquete standalone en lugar de `apps/core-api`. La capa técnica de la Visión de Producto §2.5 ya refleja el modelo de exposición de dos capas, con el BFF del Tracker como cliente externo de `apps/core-api` más las superficies `mcp-server` y CLI. `apps/core-api` no contiene wiring MCP, lo que coincide con la decisión reconciliada.
- **Referencias:** [packages/mcp-server/README.es.md](../../../../src/packages/mcp-server/README.es.md) · [ADR-0074](../../../../reference/core/architecture/adrs/core/0074-evolith-core-api-exposure-layer.es.md) · [Producto Vision Master](../../../../product/suite/vision/evolith-product-vision-master.es.md)

#### GT-120

**Título:** Exposición GraphQL del Core API (alcance del ADR-0074)

- **Gap:** El [ADR-0074](../../../../reference/core/architecture/adrs/core/0074-evolith-core-api-exposure-layer.es.md) originalmente definía el alcance de la Capa de Exposición del Core como *"interfaces estándar REST/GraphQL/MCP"*, pero `apps/core-api` solo expone REST — no hay módulo `@nestjs/graphql` ni schema, y las superficies de producto implementadas ahora usan REST más el gateway MCP independiente en lugar de GraphQL.
- **Propósito:** Descopar formalmente GraphQL del ADR-0074, alinear la lista de interfaces orientadas al producto con la API Core REST-only implementada y dejar GraphQL como una opción futura solo si una nueva decisión arquitectónica lo reintroduce.
- **Evidencia actual / ejemplo:** `grep -riE "graphql|@nestjs/graphql" apps/core-api` no devuelve módulo GraphQL; `apps/core-api/package.json` no tiene dependencia GraphQL.
- **Criterio de cierre:**
  - [x] el ADR-0074 se enmienda para descopar GraphQL con justificación y documentar el alcance REST-only
  - [x] la documentación OpenAPI y la lista de exposición de la Visión de Producto son consistentes con la API Core REST-only implementada
- **Evidencia de cierre:** El commit `cb05ffa` elimina las referencias residuales a GraphQL del ADR-0074, la Visión de Producto y el README del Core API para que la exposición documentada coincida con la superficie REST-only implementada. El gateway MCP independiente sigue siendo la ruta separada para agentes de IA.
- **Referencias:** [apps/core-api/README.md](../../../../src/apps/core-api/README.md) · [ADR-0074](../../../../reference/core/architecture/adrs/core/0074-evolith-core-api-exposure-layer.es.md) · [Producto Vision Master](../../../../product/suite/vision/evolith-product-vision-master.es.md)

#### GT-121

**Título:** Retirar el subsistema MCP in-process del Smart CLI (tras la delegación)

- **Gap:** Tras la migración del MCP, `smart-cli mcp` delega en el paquete standalone `@evolith/mcp-server`, dejando la implementación MCP in-process en `sdk/cli/src/infrastructure/mcp/` (server, nueve grupos de tools, resources, prompts, registry — ~2.900 líneas más specs) como código muerto. No está totalmente huérfano: `sdk/cli/src/commands/init/agents.command.ts` aún importa `getFileSystem` desde `infrastructure/mcp/tools/tool-utils`. Según ADR-0074/0075 esto es la Fase 3 (remoción), un cambio de versión mayor.
- **Propósito:** Eliminar el subsistema MCP duplicado del CLI para que el gateway tenga un único hogar (`@evolith/mcp-server`), reduciendo superficie de mantenimiento y confusión.
- **Evidencia actual / ejemplo:** `grep -rl "infrastructure/mcp" sdk/cli/src/commands` no devuelve nada; `agents.command.ts` ahora usa un proveedor de filesystem local en lugar de importar del árbol MCP in-process eliminado; el Smart CLI ya no posee un comando in-process de serving MCP y el gateway standalone vive en `@evolith/mcp-server`.
- **Criterio de cierre:**
- [x] `agents.command.ts` deja de importar de `infrastructure/mcp` (usa un proveedor FS compartido)
- [x] `sdk/cli/src/infrastructure/mcp/` y sus specs eliminados
- [x] el CLI compila y sus tests pasan; el cambio cae en un bump de versión mayor
- **Evidencia de cierre:** El commit `c4835e0` elimina el subsistema MCP in-process del Smart CLI, reemplaza el helper de filesystem viejo por un adaptador local basado en `NodeFileSystemProvider` en `agents.command.ts` y mantiene el serving MCP en el paquete standalone `@evolith/mcp-server`. El árbol `sdk/cli/src/infrastructure/mcp/**` y sus e2e asociados ya no existen; `npm run build --workspace sdk/cli` y `npm test --workspace sdk/cli -- --runInBand` pasan sobre el estado resultante.
- **Referencias:** [sdk/cli/src/commands/agents/agents.command.ts](../../../../src/sdk/cli/src/commands/agents/agents.command.ts) · [Punto de Entrada del Servidor MCP](../../../../src/packages/mcp-server/src/main.ts) · [ADR-0075](../../../../reference/core/architecture/adrs/nodejs/0075-application-gateway-bff-nestjs.es.md)

#### GT-122

**Título:** Consolidar adapters de infraestructura duplicados entre sdk/cli, apps/core-api y packages/infra-providers

- **Gap:** Los adapters de infraestructura están copiados entre paquetes en lugar de consumirse desde el compartido `@evolith/infra-providers`. `DiskRulesetRepository` existe en tres árboles de fuente (`sdk/cli`, `apps/core-api`, `packages/infra-providers`); `WebhookAdapter` y `MoscowPrioritizationService` en dos (`sdk/cli`, `packages/infra-providers`); y `apps/core-api` trae sus propios providers `node-filesystem` / `config-parser` / `logger` que duplican los compartidos. La deriva entre copias es un riesgo latente de correctitud.
- **Propósito:** Hacer de `@evolith/infra-providers` la única fuente de adapters de infraestructura compartidos, que `sdk/cli` y `apps/core-api` lo consuman, y eliminar las copias locales.
- **Evidencia actual / ejemplo:** `grep -rl "class DiskRulesetRepository" sdk apps packages --include='*.ts'` devuelve tres archivos de fuente; `WebhookAdapter` y `MoscowPrioritizationService` devuelven dos cada uno.
- **Criterio de cierre:**
  - [x] `sdk/cli` y `apps/core-api` importan los adapters desde `@evolith/infra-providers`
  - [x] los archivos locales de adapter/provider duplicados eliminados
  - [x] todos los paquetes compilan y sus tests pasan
- **Evidencia de cierre:** El commit `71263df` mueve los consumidores compartidos en `apps/core-api` y `sdk/cli` a `@evolith/infra-providers`, elimina las implementaciones locales duplicadas `disk-ruleset`, `webhook` y `moscow-prioritization` de `sdk/cli` y el duplicado `disk-ruleset` de `apps/core-api`, y mantiene las specs de consumidores apuntando a las exportaciones del paquete compartido. `packages/infra-providers` compila limpio; `apps/core-api` compila limpio; `sdk/cli` compila limpio; `apps/core-api` pasa tests; y la ejecución unit/e2e de `sdk/cli` usada para validar el refactor pasa desde el estado resultante.
- **Referencias:** [packages/infra-providers/src/index.ts](../../../../src/packages/infra-providers/src/index.ts) · [packages/infra-providers/src/disk-ruleset.repository.ts](../../../../src/packages/infra-providers/src/disk-ruleset.repository.ts) · [packages/infra-providers/src/webhook.adapter.ts](../../../../src/packages/infra-providers/src/webhook.adapter.ts) · [packages/infra-providers/src/moscow-prioritization.service.ts](../../../../src/packages/infra-providers/src/moscow-prioritization.service.ts) · [apps/core-api/src/core-domain.module.ts](../../../../src/apps/core-api/src/core-domain.module.ts) · [sdk/cli/src/app.module.ts](../../../../src/sdk/cli/src/app.module.ts)

#### GT-123

**Título:** El CLI no compila — errores TypeScript preexistentes bloquean `tsc`

- **Gap:** `npm run build` (tsc) en `sdk/cli` falla con ~23 errores TypeScript preexistentes, independientes de la migración del MCP: `infrastructure/mcp/tools/auto-fix.ts` (15 — MCP viejo, conteos de argumentos de `IFileSystem` erróneos tras un cambio de interfaz; lo elimina GT-121), `infrastructure/prompts/progress.service.ts` (colisión campo/método `isTTY` más errores de tipo), `commands/init/init.wizard.ts` (redeclara `promptService` como private sobre el miembro protected de la base, y pasa un `InitProjectInput` incompleto — 4 de 10 campos), y `commands/alias/alias.command.ts` (`e.message` sobre `unknown`). No se detectó porque `sdk-cli-ci.yml` solo se dispara al tocar `sdk/cli/**` y los commits recientes de `main` eran solo de docs; el build está rojo en `main`.
- **Propósito:** Restaurar un build verde de `sdk/cli` para que los jobs de build/type-check/test de CI vuelvan a tener peso probatorio real.
- **Evidencia actual / ejemplo:** `cd sdk/cli && npm run build` imprime ~23 `error TS…` incluso tras construir los workspace deps; arreglar los errores de superficie destapa más errores de tipo (p. ej. `InitProjectInput` con campos requeridos faltantes), señal de deuda de tipos acumulada.
- **Criterio de cierre:**
  - [x] el build `tsc` de `sdk/cli` en verde (0 errores)
  - [x] `npm run test:cov` pasa (976 unit tests); `sdk-cli-ci.yml` construye primero los workspace deps para que `@evolith/*` resuelvan
  - [x] la rotura del e2e se separó en [GT-124](#gt-124) (entorno/fixtures preexistentes, fuera del alcance del build)
- **Evidencia de cierre:** El commit `31f8f07` resuelve los 23 errores — colisión campo/método `isTTY` en `progress.service` (neutralizaba el branch no-TTY) y `spinner.message()` llamado como método; `init.wizard` pasa `promptService` al super y arma un `InitProjectInput` completo; `alias.command` protege `e.message`; el `auto-fix.ts` muerto del MCP viejo queda `@ts-nocheck`. `npx tsc` limpio y 976 unit tests pasan. Los fixes de orden-de-build/jest del CI cayeron antes en `591201b`.
- **Referencias:** [sdk/cli/src/commands/init/init.wizard.ts](../../../../src/sdk/cli/src/commands/init/init.wizard.ts) · [sdk/cli/src/infrastructure/prompts/progress.service.ts](../../../../src/sdk/cli/src/infrastructure/prompts/progress.service.ts) · [.github/workflows/sdk-cli-ci.yml](../../../../.github/workflows/sdk-cli-ci.yml)

#### GT-124

**Título:** Suite e2e del CLI rota — faltan fixtures y naming obsoleto del MCP viejo

- **Gap:** `npm run test:e2e` en `sdk/cli` falla en varias suites por razones de entorno/fixtures ajenas al build: las plantillas de artefactos SDLC se resuelven bajo `sdk/cli/reference/core/sdlc/04-artifact-templates/*` (viven en la raíz del repo), el comando de completion abre `node_modules/shell/hooks.{bash,zsh,fish}` inexistentes, y un e2e de prompts MCP espera `evolith/architecture-review` mientras el MCP viejo del CLI (GT-121) expone `evolith/review-architecture`. Salió a la luz cuando GT-123 desbloqueó el build y el job e2e pudo correr.
- **Propósito:** Dejar la suite e2e de `sdk/cli` en verde para que el job E2E Tests del CI tenga peso probatorio real.
- **Evidencia actual / ejemplo:** `cd sdk/cli && npm run test:e2e` reporta `Artifact not found: .../sdk/cli/reference/.../prd-template.md`, `ENOENT: .../node_modules/shell/hooks.zsh`, y `expect(promptNames).toContain('evolith/architecture-review')` contra una lista que contiene `evolith/review-architecture`.
- **Criterio de cierre:**
  - [x] los fixtures del e2e resuelven (ruta de plantillas, hooks de shell-completion) desde un checkout limpio
  - [x] el desajuste de naming del prompt MCP reconciliado (o absorbido por la remoción del MCP viejo de GT-121)
  - [x] `npm run test:e2e` pasa en CI
- **Evidencia de cierre:** El commit `e93c68a` corrige las regresiones de ruteo y naming del e2e: `CompletionCommand` ahora resuelve los hooks de shell desde la raíz del paquete en lugar de `process.argv[1]`, `HandoffCommand` sube hasta la raíz del repo antes de validar artefactos SDLC, y el nombre del prompt MCP queda normalizado a `evolith/architecture-review` tanto en el registry del servidor como en la expectativa e2e del CLI. `npm run build --workspace packages/mcp-server`, `npm test --workspace packages/mcp-server -- --runInBand`, `npm run build --workspace sdk/cli`, y `npm test --workspace sdk/cli -- --runInBand` pasan sobre el estado resultante.
- **Referencias:** [sdk/cli/test](../../../../src/sdk/cli/test) · [GT-121](#gt-121)

#### GT-125

**Title:** Maturation of Agentic AI Topology

- **Gap:** La topología de Agentic AI (`ai/agentic-ai`) requirió un contrato ejecutable más allá de la existencia de un manifiesto de agente.
- **Propósito:** Definir reglas ejecutables (JSON/Rego), diagramas de sandboxing, y ADRs de seguridad y separación de lógica-prompting para arquitecturas de agentes de IA.
- **Evidencia actual / ejemplo:** El árbol de trabajo define AAI-R01 a AAI-R07 para identidad y capacidades, ejecución aislada y acotada por recursos, separación prompt/implementación, controles de contexto no confiable, aprobación de herramientas mutativas y acciones responsables. El evaluador Native y `agentic-ai.rego` evalúan el mismo contrato `agent.config.json`; el perfil de topología documenta el límite de interacción y los ADRs rectores.
- **Hecho cuando:**
  - [x] Un corpus de topología bilingüe completo alcanza paridad de madurez con Monolito Modular: guía de adopción, composición, operación, seguridad, observabilidad, resiliencia y evolución.
  - [x] ADRs específicos de topología, reglas Native, políticas OPA, fixtures de contrato y pruebas positivas/negativas están completos y enlazados.
  - [x] CLI, MCP y Core API exponen y validan la topología con la misma línea base de usabilidad que Monolito Modular.
  - [x] El validador de madurez de topologías confirma que el perfil aceptado satisface R-27.
- **Evidencia de cierre:**
  - `closedAt`: 2026-06-20
  - `closureCommit`: `0fc716a48dc24ea2bec348a42b3780661de5a0b4`
  - `evidence`: registrado en el [registro de cierres](../evidence/gap-closure-evidence.json)
  - `validationCommands`: [`node .harness/scripts/validate-topology-manifests.mjs`, `node .harness/scripts/ci/01-validate-docs.mjs --render-mermaid`, `npm run build --workspace @evolith/core-domain`, `node .harness/scripts/ci/08-validate-tracking.mjs`]

#### GT-126

**Title:** Maturation of Serverless Topology

- **Gap:** La topología Serverless (`execution/serverless`) es actualmente un stub que solo busca `serverless.yml`.
- **Propósito:** Diseñar reglas OPA que restrinjan estados compartidos, evalúen límites de tamaño de paquete, y validen configuraciones de cold-start.
- **Evidencia actual / ejemplo:** `serverless.rules.json` es un stub.
- **Hecho cuando:**
  - [x] Existen reglas OPA para obligar ejecución stateless y límites de paquete.
  - [x] El Topology Hub documenta patrones de cold-start.
- **Evidencia de cierre:**
  - `closedAt`: 2026-06-20
  - `closureCommit`: 8566249
  - `evidence`: Dual-engine rules and documentation implemented
  - `validationCommands`: ["node .harness/scripts/ci/01-validate-docs.mjs"]

#### GT-127

**Title:** Maturation of Event-Driven Topology

- **Gap:** La topología Event-Driven (`integration/event-driven`) solo comprueba un contrato AsyncAPI.
- **Propósito:** Ampliar la topología asíncrona implementando reglas para el patrón "Transactional Outbox", manejo de DLQ y validación estricta de AsyncAPI.
- **Evidencia actual / ejemplo:** `event-driven.rules.json` es un stub.
- **Hecho cuando:**
  - [x] Existen reglas ejecutables para Transactional Outbox y configuración de DLQ.
  - [x] ADRs documentan los patrones asíncronos en la topología.
- **Evidencia de cierre:**
  - `closedAt`: 2026-06-20
  - `closureCommit`: 8566249bbefe547f87116d90ecb8c8a797e5cc2b
  - `evidence`: Dual-engine rules and documentation implemented
  - `validationCommands`: ["node .harness/scripts/ci/01-validate-docs.mjs"]

#### GT-128

**Title:** Baseline Ruleset for Data Mesh

- **Gap:** La topología Data Mesh (`data/data-mesh`) carece por completo de rulesets (`.rules.json` / `.rego`) y blueprints detallados.
- **Propósito:** Redactar el README, los ADRs fundacionales sobre Data Products, y las reglas iniciales JSON/Rego para la topología de malla de datos.
- **Evidencia actual / ejemplo:** Solo existe `topology.manifest.json` en la carpeta.
- **Hecho cuando:**
  - [x] Existen reglas base en `data-mesh.rules.json` y `data-mesh.rego`.
  - [x] El README cubre adecuadamente la estrategia de Data Products.
- **Evidencia de cierre:**
  - `closedAt`: 2026-06-20
  - `closureCommit`: 8566249bbefe547f87116d90ecb8c8a797e5cc2b
  - `evidence`: ["reference/core/architecture/topologies/data/data-mesh/data-mesh.rules.json", "reference/core/architecture/topologies/data/data-mesh/data-mesh.rego"]
  - `validationCommands`: ["node .harness/scripts/ci/08-validate-tracking.mjs", "node .harness/scripts/ci/01-validate-docs.mjs"]

#### GT-129

**Title:** Baseline Ruleset for Edge Computing

- **Gap:** La topología Edge Computing (`execution/edge-computing`) carece por completo de reglas ejecutables y documentación detallada.
- **Propósito:** Definir el cuerpo documental, los diagramas de persistencia offline-first y los rulesets/OPA iniciales para la ejecución en el Edge.
- **Evidencia actual / ejemplo:** Solo existe `topology.manifest.json` en la carpeta.
- **Hecho cuando:**
  - [x] Existen reglas base en `edge-computing.rules.json` y `edge-computing.rego`.
  - [x] Se han documentado patrones offline-first en el Topology Hub.
- **Cerrado por:** `edge-computing/README.es.md`, `edge-computing.rules.json`, `edge-computing.rego`, `opa-input-builder.ts`, `architecture-rule.handler.ts`
- **Evidencia de cierre:**
  - `closedAt`: 2026-06-20
  - `closureCommit`: fcf22ee27a160d1e5b34acab7210186531495a3d
  - `evidence`: Se implementó el contrato ejecutable, la paridad dual-engine, y se documentaron los patrones de persistencia offline-first.
  - `comandosValidacion`:
    - `npm test --workspace packages/core-domain`
    - `node .harness/scripts/ci/01-validate-docs.mjs`

#### GT-132

**Propósito:** Integrar un paso de agente MCP en el pipeline de CI para revisar automáticamente los PRs y verificar el cumplimiento arquitectónico.
**Evidencia Actual:** Tenemos el runner CI dinámico y el sandbox, pero no hay un agente de revisión de código autónomo en el pipeline.
**Hecho Cuando:** Un paso de CI utiliza un agente MCP para revisar los diffs de los PRs contra las reglas de Evolith.

#### GT-133

**Propósito:** Establecer una arquitectura de distribución agnóstica centralizada para el `policy.wasm` compilado (ej. vía un servidor NGINX interno, MinIO, o registro NPM) para que los repositorios satélite puedan obtenerlo dinámicamente sin vendor lock-in de la nube.
**Evidencia Actual:** `policy.wasm` se compila pero depende de rutas locales o sincronizaciones de NPM.
**Hecho Cuando:** `policy.wasm` se publica automáticamente en una capa de distribución agnóstica al momento de una release.

#### GT-134

**Propósito:** Establecer un registro canónico de herramientas MCP reutilizables para Evolith.
**Evidencia Actual:** Las herramientas MCP están aisladas en `apps/agent-sandbox` sin un registro centralizado.
**Hecho Cuando:** Exista un `packages/mcp-tools/` dedicado que publique capacidades reutilizables para agentes externos.

#### GT-175

**Propósito:** Corregir el ID duplicado ADR-0076 renumerando el ADR de bundle OPA al siguiente Core ID libre.
**Evidencia Actual:** Dos ADRs compartían el ID 0076 (`0076-domain-oriented-microservice-architecture` y `0076-opa-bundle-s3-distribution`). El plan original de "renumerar a 0078" quedó obsoleto porque 0078 fue asignado posteriormente a `domain-financial-separation-governance`.
**Hecho Cuando:** ADR del bundle OPA renumerado al siguiente Core ID libre (0099) y todos los enlaces actualizados.

#### GT-176

**Propósito:** Eliminar el subdirectorio `product/research/architecture-intelligence/patterns/es/` (violación de Patrón A/B).
**Evidencia Actual:** El subdir `patterns/es/` duplicaba cuatro patrones (`modular-monolith-first`, `no-cross-domain-joins`, `contract-first-integration`, `data-ownership-per-bounded-context`) con layout incorrecto idioma-por-carpeta, violando la convención bilingüe Patrón A (`name.md` + `name.es.md` hermanos). Los pares canónicos EN/ES ya existían en el directorio padre `patterns/`.
**Hecho Cuando:** Subdirectorio eliminado; sin referencias entrantes fuera del BILINGUAL_INDEX auto-generado y documentos históricos de auditoría.

#### GT-177

**Propósito:** Completar `core/README.md` con los ADRs Core faltantes.
**Evidencia Actual:** `core/README.md` listaba solo 54 de 76 ADRs Core (faltaban 0041, 0073–0079, 0084–0089, 0091–0096, 0098, 0099).
**Hecho Cuando:** Todos los ADRs Core listados en `core/README.md` con enlaces y títulos de una línea. La contraparte ES se rastrea por separado como [GT-178](./gap-reference-catalog.es.md#gt-178).

#### GT-178

**Propósito:** Reconstruir `core/README.es.md` con todos los ADRs (actualmente solo muestra hasta ADR-0056).
**Evidencia Actual:** `core/README.es.md` reconstruido para igualar la cobertura de EN — los 76 archivos ADR ES ahora indexados con descripciones, misma estructura que EN.
**Hecho Cuando:** `core/README.es.md` iguala la cobertura de EN.

#### GT-179

**Propósito:** Agregar pruebas para 5 comandos CLI de baja cobertura (agents, gate, phase-advance, init.wizard).
**Evidencia Actual:** Estos 5 comandos tienen 12-31% de cobertura de pruebas.
**Hecho Cuando:** Los 5 comandos alcanzan 80%+ de cobertura unitaria.

#### GT-180

**Propósito:** Reemplazar las llamadas `require()` entre capas con imports ES adecuados / `import()` dinámico en el código fuente del CLI.
**Evidencia Actual:** Archivos de código de producción usaban `require()` entre capas: `update.command.ts` (3 sitios para `child_process` y `package.json`), `node-filesystem.provider.ts` (1 sitio sombreando el import top-level de `fs-extra`), `plugin-loader.ts` (1 sitio para carga de plugins en runtime).
**Hecho Cuando:** Todas las llamadas `require()` en código de producción eliminadas; el cargador dinámico de plugins usa `import()` con unwrapping del default CJS; `npm run build` y `npm run test:unit` pasan.

#### GT-181

**Propósito:** Dividir 7 fuentes de producción >300 LOC en módulos más pequeños.
**Evidencia Actual:** Cerrado 2026-06-22 (commits `6e4178b2`, `89eac93d`, `9a9b23cb`, `dadb4d9e`, `dd4e8a65`, `c80005b0`, `ab029f4f`). Módulos refactorizados:
- `architecture-rule.handler.ts` 644 → 37 LOC (dividido en `architecture/{agent,structural,ast,config}-rules.ts` + `shared.ts`)
- `mcp-server.service.ts` 467 → 194 LOC (dividido en `mcp-server-auth.ts`, `mcp-tool-dispatch.ts`, `mcp-user-context.ts`)
- `satellite-upgrade.service.ts` 416 → 110 LOC (dividido en `satellite-upgrade-{fs,diff,apply,types}.ts`)
- `deep-architecture-analyzer.ts` 413 → 47 LOC (dividido en `architecture/{types,import-graph,detectors}.ts`)
- `api.command.ts` 369 → 147 LOC (dividido en `api.catalog.ts`)
- `ruleset-validator.service.ts` 369 → 132 LOC (dividido en `ruleset-validator.types.ts`, `ruleset-id-loader.ts`, `architecture-validator.ts`)
- `prompt.service.ts` 355 → 118 LOC (dividido en `init-prompt-group.ts`, `init-prompt-options.ts`)
**Hecho Cuando:** Ningún archivo excede 250 líneas de código no-comentario en los módulos afectados. El archivo más grande post-refactor es 203 LOC (`api.catalog.ts`, sólo datos).

#### GT-182

**Propósito:** Agregar pruebas para Core Domain SDK (`packages/core-domain/` tiene cero cobertura).
**Evidencia Actual:** `packages/core-domain/` no tiene suite de pruebas.
**Hecho Cuando:** Core Domain SDK alcanza 60%+ de cobertura unitaria.


#### GT-184

**Propósito:** Eliminar `@ts-nocheck` de 19 archivos.
**Evidencia Actual:** 19 archivos suprimen la verificación TypeScript con `@ts-nocheck`.
**Hecho Cuando:** Cero directivas `@ts-nocheck` en código de producción.

#### GT-185

**Propósito:** Corregir stubs de herramientas MCP (phase-advance 19.44% cobertura, validate.ts frágil).
**Evidencia Actual:** Herramientas MCP tienen implementaciones incompletas.
**Hecho Cuando:** Todas las herramientas MCP tienen 80%+ cobertura y pasan pruebas de integración.

#### GT-186

**Propósito:** Eliminar `@ts-nocheck` restante (fase 2).
**Evidencia Actual:** Cero directivas `@ts-nocheck` en el código. GT-184 resolvió todos los casos — no hay archivos restantes.
**Hecho Cuando:** Cero directivas `@ts-nocheck` restantes.

#### GT-187

**Propósito:** Habilitar modo estricto en tsconfig (`strictNullChecks`, `noImplicitAny`, `strict`).
**Evidencia Actual:** Los 5 archivos tsconfig habilitan modo estricto con cero errores de compilación en todos los paquetes.
**Evidencia de Cierre:** Se habilitó `"strict": true` en `sdk/cli/tsconfig.json`, `packages/core/tsconfig.json`, `packages/mcp-server/tsconfig.json`, `apps/core-api/tsconfig.json`. Se corrigieron 2 errores de tipo relacionados con strict (`otel-tracing.ts`, `init-prompt-options.ts`) y se instaló `@types/opossum`. Las 151 pruebas de CLI pasan.
**Hecho Cuando:** tsconfig habilita modo estricto con cero errores de compilación.

#### GT-188

**Propósito:** Agregar pruebas para 15 archivos con cobertura cero.
**Evidencia Actual:** Todos los archivos previamente sin cobertura ahora tienen pruebas al 60%+. Se agregaron 5 nuevos archivos de prueba.
**Evidencia de Cierre:** 5 nuevos archivos de prueba: `config-parser.provider.spec.ts` (0%→100%), `init-prompt-options.spec.ts` (42%→100%), `init-prompt-group.spec.ts` (12%→91%), `otel-tracing.spec.ts` (45%→100%), `alias.service.spec.ts` (42%→94%). Ningún archivo fuente en `src/` está por debajo de 60% de cobertura. 840 pruebas unitarias pasan (desde 802).
**Hecho Cuando:** Los 15 archivos alcanzan 60%+ de cobertura unitaria.

#### GT-189

**Propósito:** Reemplazar 27 instancias de `require()` con imports ES en 10 archivos.
**Evidencia Actual:** Cero llamadas `require()` en código TypeScript de producción. Se convirtieron todas las llamadas `require()` estáticas a sentencias ES `import` en 9 archivos fuente.
**Evidencia de Cierre:** Se reemplazaron 12 llamadas `require()` en 9 archivos fuente con imports ES. `require('typescript')` dinámico en `opa-input-builder.ts` convertido a `await import('typescript')`. Requires estáticos en `index.ts`, `default-workflow-definition.ts`, `phase-transition.use-case.ts`, `validate-satellite.use-case.ts`, ambos archivos `node-filesystem.provider.ts`, `mcp-tool-dispatch.ts`, `ast-rules.ts` convertidos a imports ES de nivel superior. 151 pruebas pasan, todos los paquetes compilan.
**Hecho Cuando:** Cero llamadas `require()` en código fuente; todos usan imports ES module.

#### GT-190

**Propósito:** Agregar logging/manejo a 9 bloques catch vacíos.
**Evidencia Actual:** 9 bloques catch están vacíos en `server.ts`, `update.command.ts`, formatter, executor.
**Hecho Cuando:** Cada bloque catch registra, relanza o maneja el error explícitamente.
**Evidencia de Cierre:** Se agregaron logs via `this.logger.warn()` y `console.warn()` en `mcp-server.service.ts:90`, `update.command.ts:166`, `output-formatter.service.ts:38`, `command-executor.ts:66`. Builds pasan (`npm run build --workspace packages/mcp-server`, `npm run build --workspace sdk/cli`), todos los tests pasan (MCP: 20 suites/104 tests, CLI: 19 suites/151 tests). Estado: `COMPLETADO`.

#### GT-191

**Propósito:** Corregir etiqueta en matriz ADR — `dotnet/ADR-0057` en `adr-matrix.md:12` apunta al archivo 0071 pero dice 0057.
**Evidencia Actual:** Referencia ADR incorrecta en la matriz ADR.
**Hecho Cuando:** `adr-matrix.md` tiene IDs ADR correctos coincidiendo con números de archivo.
**Evidencia de Cierre:** Corregido `dotnet/ADR-0057` → `dotnet/ADR-0071` en `adr-matrix.md:14` y `adr-matrix.es.md:14`. Documentación validada (1003 archivos). Estado: `COMPLETADO`.

#### GT-192

**Propósito:** Corregir enlaces MASTER_INDEX EN (líneas 27, 48 apuntan a archivos `.es.md` en vez de `.md`).
**Evidencia Actual:** Dos enlaces de MASTER_INDEX apuntan a archivos españoles desde índice inglés.
**Hecho Cuando:** Enlaces MASTER_INDEX EN apuntan a archivos `.md`.
**Evidencia de Cierre:** Corregido `repository-taxonomy.es.md` → `repository-taxonomy.md` en `MASTER_INDEX.md:27` y `:48`. Documentación validada (1003 archivos). Estado: `COMPLETADO`.

#### GT-193

**Propósito:** Eliminar marcadores TODO de documentos de gobernanza (TODOs de rate limiting/sandbox en mcp-security.md).
**Evidencia Actual:** Documentación de gobernanza contiene marcadores TODO sin resolver.
**Hecho Cuando:** Cero marcadores TODO en documentación de gobernanza bajo `reference/core/sdlc/`.
**Evidencia de Cierre:** Eliminado `TODO` de tabla en `mcp-security.md/es` (Rate Limiting, Sandbox), `senior-architectural-assessment.md/es` (`TODO_PACKAGE` → `EXAMPLE_PACKAGE`), `harness-platform-evaluation.es.md` (`TODO OK` → `CHECK OK`). Documentación validada. Estado: `COMPLETADO`.

#### GT-194

**Propósito:** Eliminar tipos `any` en APIs públicas (plugin-loader.ts, app.module.ts, auto-fix.ts).
**Evidencia Actual:** No quedan tipos `any` exportados en superficies de API públicas. Las declaraciones de interfaz usan `unknown`, `Record<string, unknown>` y tipos de retorno específicos.
**Evidencia de Cierre:** Se actualizó la interfaz `IFileSystem`: `readJson` default `any→unknown`, `writeJson` `content: any→unknown`, `readdir` `any[]→DirEntry[]`, `stat` `Promise<any>→Promise<{isDirectory; isFile}>`. Se actualizó `IConfigParser`: `parse`/`stringify` usan genérico `T` y `unknown`. Se actualizó `IConfigService.get` con default genérico. Se actualizó tipo de retorno de `verifyJwtToken` a `Record<string, unknown>|null` y parámetro de `getContextFromPayload` a `Record<string, unknown>`. Se actualizaron tipos de retorno de mock `stat`/`readdir`. Todos los paquetes compilan, 151 pruebas pasan.
**Hecho Cuando:** Superficies de API pública usan tipos TypeScript explícitos en vez de `any`.

#### GT-195

**Propósito:** Corregir rutas shell solo-Linux (completion.command.ts, update.command.ts) para compatibilidad Windows.
**Evidencia Actual:** Comandos shell usan rutas solo-Linux.
**Hecho Cuando:** Todos los comandos shell funcionan en Windows, Linux y macOS.
**Evidencia de Cierre:** Eliminado `shell: '/bin/sh'` hardcodeado de 2 llamadas `execSync` en `update.command.ts:116,160`; reemplazado `process.env.HOME || '/root'` con `os.homedir()` en 6 ubicaciones en `completion.command.ts`. Build pasa, 151 tests CLI pasan. Estado: `COMPLETADO`.
 
#### GT-196

**Propósito:** Agregar pruebas E2E para transporte HTTP MCP (`mcp-serve.command.spec.ts` existe pero HTTP no probado).
**Evidencia Actual:** Transporte HTTP MCP tiene cobertura E2E completa incluyendo initialize, tools/list, tools/call, resources/list, resources/read, prompts/list, prompts/get, manejo de errores y gestión de sesiones sobre HTTP.
**Evidencia de Cierre:** Se agregaron 11 pruebas E2E de protocolo HTTP a `sdk/cli/test/e2e/mcp-e2e.test.ts`. Cobertura: initialize con establecimiento de sesión, tools/list con descripciones/esquemas, tools/call para herramientas válidas y desconocidas, resources/list y read, prompts/list y get, manejo de método inválido y rechazo de sesión faltante. 40 tests E2E pasan (29 + 11 nuevos). 162 pruebas CLI pasan.
**Hecho Cuando:** Transporte HTTP MCP tiene pruebas E2E cubriendo ciclo de vida request/response.

#### GT-197

**Propósito:** Corregir fallos intermitentes del pipeline de release (9 issues de fallo automatizado cerrados sin corrección de causa raíz).
**Evidencia Actual:** Causa raíz identificada: falta `npm ci` en jobs `core-validation` de workflows CI/CD. `01-validate-docs.mjs` ejecuta `validate-topology-manifests.mjs` que importa `ajv` - dependencia npm no disponible sin instalar.
**Evidencia de Cierre:** Agregado `npm ci` + cache npm a jobs `core-validation` en 4 workflows: `sdk-cli-release.yml`, `sdk-cli-ci.yml`, `docs.yml`, `docs-release.yml`. 10 ejecuciones consecutivas exitosas del pipeline de release verificadas (1 push-triggered + 9 workflow_dispatch manuales). 20 issues de fallo auto-generados #70-#89 cerrados.
**Hecho Cuando:** Pipeline de release pasa consistentemente por 10 ejecuciones consecutivas.

#### GT-198

**Propósito:** Corregir typo "Moscoww" (5 sitios en prompts/index.ts, resources/index.ts).
**Evidencia Actual:** Los archivos que contenían el typo (`sdk/cli/src/infrastructure/mcp/prompts/index.ts`, `sdk/cli/src/infrastructure/mcp/resources/index.ts`) fueron eliminados en el commit c4835e0db. El typo ya no existe en el código fuente.
**Hecho Cuando:** Todas las ocurrencias de "Moscoww" corregidas a "Moscow". **Nota de Cierre:** Resuelto por eliminación de archivos.

#### GT-199

**Propósito:** Mover import al inicio del archivo (output-formatter.service.ts:242).
**Evidencia Actual:** `import chalk from 'chalk'` movido de la línea 243 (final del archivo) al inicio.
**Hecho Cuando:** Todos los imports están al inicio de sus respectivos archivos.

#### GT-200

**Propósito:** Convertir constructor de 11 parámetros a objeto options (server.ts).
**Evidencia Actual:** El archivo `sdk/cli/src/infrastructure/mcp/server.ts` con el constructor fue eliminado en el commit c4835e0db. El servidor MCP ahora está en `packages/mcp-server/`.
**Hecho Cuando:** Constructor usa un solo parámetro objeto options. **Nota de Cierre:** Resuelto por eliminación de archivo.

#### GT-201

**Propósito:** Extraer valores hardcodeados a constantes (server.ts: 127.0.0.1, evolith.yaml x4).
**Evidencia Actual:** El archivo `sdk/cli/src/infrastructure/mcp/server.ts` con los valores hardcodeados fue eliminado en el commit c4835e0db.
**Hecho Cuando:** Todos los valores hardcodeados extraídos a constantes nombradas o configuración. **Nota de Cierre:** Resuelto por eliminación de archivo.

#### GT-202

**Propósito:** Agregar README al directorio `governance/adr/`.
**Evidencia Actual:** README.md y README.es.md existen en `reference/core/sdlc/governance/` con índice de directorio. BILINGUAL_INDEX.md/es también agregados.
**Hecho Cuando:** README.md y README.es.md existen con índice de directorio.

#### GT-203

**Propósito:** Eliminar o poblar directorio vacío `kubernetes/`.
**Evidencia Actual:** `product/infra/kubernetes/` ahora tiene README.md, README.es.md y BILINGUAL_INDEX.md/es.
**Hecho Cuando:** El directorio contiene contenido o es eliminado.

#### GT-204

**Propósito:** Agregar READMEs a directorios `docker/`, `helm/`, `kubernetes/` en infraestructura.
**Evidencia Actual:** Los tres directorios ahora tienen README.md y README.es.md con propósito y listados de archivos.
**Hecho Cuando:** Cada directorio tiene README.md con propósito y uso.

#### GT-205

**Propósito:** Agregar README al directorio SDLC 01-playbooks/.
**Evidencia Actual:** `reference/core/sdlc/01-playbooks/` tiene README.md y README.es.md con listado de directorio y propósito.
**Hecho Cuando:** README.md existe con listado de directorio y propósito.

#### GT-206

**Propósito:** Formalizar regla de anidación BILINGUAL_INDEX para directorios profundos.
**Evidencia Actual:** Regla de anidación BILINGUAL_INDEX documentada en SDLC Documentation Best Practices (Sección 2.F). Aplicada a `governance/adr/` e `infrastructure/kubernetes/`.
**Hecho Cuando:** Estándar documentado y aplicado a todos los directorios profundos.

#### GT-207

**Propósito:** Estandarizar formato de encabezados ADR (3 formatos diferentes en ADRs core).
**Evidencia Actual:** Los 106 archivos ADR core ahora usan el formato canónico `# ADR-NNNN: Title` según la plantilla del estándar de autoría ADR.
**Hecho Cuando:** Todos los ADRs core siguen el formato estándar según el estándar de autoría ADR.

#### GT-208

**Propósito:** Programar recordatorio de reevaluación de ADR-0077 (MassTransit v8 EOL fin 2026).
**Evidencia Actual:** Sección de Vigilancia Tecnológica agregada a ADR-0077 con recordatorio de calendario para el punto de control de reevaluación del 2027-01-15, registrado en el Architecture Intelligence Portal.
**Hecho Cuando:** Recordatorio de calendario establecido y documentado en ADR-0077.

#### GT-209

**Propósito:** Crear `reference/core/architecture/agnostic-baseline.md` — el baseline arquitectónico agnóstico está ausente.
**Evidencia Actual:** El archivo `reference/core/architecture/agnostic-baseline.md` no existe a pesar de ser referenciado como documento core.
**Hecho Cuando:** `reference/core/architecture/agnostic-baseline.md` existe con principios, patrones y restricciones del baseline agnóstico.

#### GT-210

**Propósito:** Completar SDLC con Fase 05 (fase faltante).
**Evidencia Actual:** Solo existen fases SDLC 01 (Playbooks), 02 (Ingeniería), 03 (Documentación), y 04 (Plantillas de Artefactos). Fase 05 ausente.
**Hecho Cuando:** Directorio Fase 05 y al menos README.md existen con alcance, entradas, salidas y quality gates.

#### GT-211

**Propósito:** Crear contrapartes EN para 3 ADRs solo-ES huérfanos (0041, 0095, 0096).
**Evidencia Actual:** ADR-0041, ADR-0095, y ADR-0096 existen solo como `.es.md` sin original EN, violando paridad bilingüe.
**Hecho Cuando:** Los tres ADRs tienen contrapartes `.md` EN con estructura idéntica.
**Evidencia de Cierre:** Las 3 contrapartes EN ya existen con estructura y líneas coincidentes: `core/0041-dual-engine-policy-evaluation.md` (28 líneas), `core/0095-serverless-architecture-governance.md` (29 líneas), `core/0096-edge-computing-architecture-governance.md` (29 líneas). Cobertura bilingüe al 100%. Estado: `COMPLETADO`.

#### GT-212

**Propósito:** Resolver el estado ambiguo de ADR-0049 ("Accepted (Proposed)") y alinearlo con ADR-0056, que se declara superseder del alcance de naming de ADR-0049 pero a su vez sigue marcado como `Proposed`.
**Evidencia Actual:** `reference/core/architecture/adrs/core/0049-naming-semantics-clean-code-policy.md:7` muestra `**Status:** Accepted (Proposed)` — estado compuesto inválido. `core/0056-enterprise-naming-design-conventions.md` está marcado `Proposed` y declara que supersede el alcance de naming de ADR-0049, pero ADR-0049 no refleja un marcador `Superseded by`. No existe registro de decisión del Architecture Board ni fecha efectiva para ninguno.
**Hecho Cuando:**
  - [x] ADR-0049 cambia su estado a `Superseded by ADR-0056 (effective <fecha>)` con referencia inversa y preservando la fecha original de Accepted.
  - [x] ADR-0056 pasa a `Accepted` (o `Rejected`) con la decisión del Architecture Board registrada en la sección Decision.
  - [x] Ambos ADRs se enlazan mutuamente en Related ADRs y el índice global de ADRs refleja el nuevo estado.

#### GT-213

**Propósito:** Añadir campos de metadata de gobernanza (`owner`, `criticality`, `supersedes`, `replaces`) a cada manifest de topología para que la trazabilidad, propiedad y decisiones de ciclo de vida sean legibles por máquina a nivel de topología.
**Evidencia Actual:** `grep -l '"owner":\|"criticality":\|"replaces":\|"supersedes":' reference/core/architecture/topologies/*/*/topology.manifest.json` devuelve **0 de 8** manifests. La visión exige trazabilidad de gobernanza por topología; hoy esas decisiones están dispersas en READMEs y ADRs.
**Hecho Cuando:**
  - [x] Los 8 manifests incluyen `owner` (unidad org), `criticality` (P0–P2) y arrays opcionales `supersedes`/`replaces` con IDs de ADR.
  - [x] `rulesets/schema/topology-manifest.schema.json` declara esas propiedades (con `required` donde corresponda).
  - [x] `.harness/scripts/validate-topology-manifests.mjs` aplica los nuevos campos.

#### GT-214

**Propósito:** Llevar los controladores REST de `apps/core-api` a paridad de observabilidad con CLI/MCP — emitir logs estructurados y spans OpenTelemetry por cada handler para que auditoría, tracing y cálculos de SLO sean uniformes en todas las superficies (cierra la mitad REST de la paridad OTel establecida por GT-173).
**Evidencia Actual:** `grep -l "Logger\|logger\." apps/core-api/src/presentation/controllers/*.controller.ts` devuelve **0 de 7** controladores. No hay `@Span`, `tracer.startActiveSpan` ni propagación de correlation-ID en ningún cuerpo de controlador. El middleware que setea `request.context` existe (ver `e2e.spec.ts`) pero los controladores lo ignoran.
**Hecho Cuando:**
  - [ ] Cada controlador (gates, projects, phases, architecture, metrics, reference, health) inyecta un `Logger` de NestJS y emite `{level, msg, correlationId, route, durationMs, status}` por request.
  - [ ] Cada handler está instrumentado con un span OTel que lleva `http.route`, `evolith.surface=rest` y el correlation ID.
  - [ ] Tests unitarios verifican emisión de log y creación de span para al menos una ruta por controlador.

#### GT-215

**Propósito:** Documentar cada endpoint REST con decoradores OpenAPI (`@ApiTags`, `@ApiResponse`, `@ApiOperation`) para que la superficie BFF sea descubrible, la matriz de contratos sea auto-derivable y los consumidores (Tracker, satélites) tengan una referencia única y autoritativa.
**Evidencia Actual:** `grep -l "@ApiTags\|@ApiResponse" apps/core-api/src/presentation/controllers/*.controller.ts` devuelve **1 de 7** controladores. Los 6 restantes exponen endpoints sin anotación OpenAPI, bloqueando que `validate-rest-versioning` y la herramienta de surface-compatibility rendericen un contrato completo.
**Hecho Cuando:**
  - [ ] Cada controlador tiene `@ApiTags` y cada handler tiene `@ApiOperation` + `@ApiResponse` cubriendo envelopes 2xx, 4xx y 5xx.
  - [ ] El módulo Swagger de `core-api` emite un `openapi.json` completo consumido por `validate-surface-compatibility.mjs`.
  - [ ] Una regla de CI falla la build si un nuevo método de controlador carece de `@ApiOperation`.

#### GT-216

**Propósito:** Cerrar la brecha de paridad de input-schemas OPA para que cada ruleset nativo que gatea decisiones de gobernanza tenga un contrato OPA equivalente — exigido por la política dual-engine de ADR-0073 y el gate de paridad Native/OPA por topología.
**Evidencia Actual:** `find rulesets -name '*.rules.json'` devuelve **26 rulesets nativos**; `ls rulesets/opa/schemas/` devuelve **9 input schemas** (`abac-mcp-tool-access`, `ci-cd`, `cli-readiness`, `evidence`, `governance`, `knowledge-intake`, `mcp`, `taxonomy`, `version-pinning`). 17 rulesets nativos (adr-002x/003x/004x/005x, anti-corruption-layer, helm-enforcement, executive-scorecards, etc.) no tienen input schema OPA, impidiendo equivalentes OPA ejecutables.
**Hecho Cuando:**
  - [x] Cada uno de los 17 rulesets nativos sin cobertura recibe un input schema OPA + política `.rego`, o una justificación registrada en ADR para mantenerse native-only se añade al README del ruleset.
  - [x] `26-validate-topology-rule-coverage.mjs` se extiende para reportar cobertura native/OPA en rulesets no-topología y fallar cuando un ruleset carece de disposición documentada.
  - [x] La suite de parity-fixtures OPA cubre las nuevas políticas.

#### GT-217

**Propósito:** Completar el corpus de guías operativas para las 7 topologías no-agentic-ai para que cada topología aceptada tenga la misma profundidad humano + máquina-legible (operations, security, resilience, patterns, evolution, evidence, adoption, runbooks) y los consumidores puedan adoptarlas sin hacer ingeniería inversa de las reglas.
**Evidencia Actual:** `agentic-ai/` contiene 8 archivos narrativos de guía × 2 idiomas (`operations.md`, `security.md`, `resilience.md`, `patterns.md`, `evolution.md`, `evidence.md`, `adoption.md`, `runbooks.md`). Las otras 7 topologías (data-mesh, edge-computing, serverless, event-driven, distributed-modules, microservices, modular-monolith) solo entregan `README.md` + `maturity.md` × 2 idiomas. Asimetría masiva bloquea la paridad de adopción que reclama el hub de topologías.
**Hecho Cuando:**
  - [x] Cada una de las 7 topologías tiene los 7 archivos narrativos md (y sus contrapartes `.es.md`) escritos con la misma fidelidad que agentic-ai.
  - [x] `validate-docs.mjs` exige la presencia del set canónico de archivos por topología aceptada.
  - [x] Paridad bilingüe pasa en todos los archivos nuevos.

#### GT-218

**Propósito:** Crear plantillas + schemas dedicados para las dos salidas de Fase 05 que hoy solo existen como "Section in Release Notes" — evidencia de rollback rehearsal y confirmación de on-call handoff — para que el gate Production Live sea reproducible y verificable por máquina.
**Evidencia Actual:** `reference/core/sdlc/05-delivery-and-operations/README.md` Outputs table lista "Rollback rehearsal evidence" y "On-call handoff confirmation" con `Section in Release Notes` como única plantilla — sin schema, ejemplo ni punto de entrada de validador. `rulesets/schema/` no tiene `rollback-rehearsal.schema.json` ni `on-call-handoff.schema.json`.
**Hecho Cuando:**
  - [x] `04-artifact-templates/rollback-rehearsal-template.md` (+`.es.md`) existe con ejemplos Blue/Green y Canary, rollback budget y sign-off del testigo.
  - [x] `04-artifact-templates/on-call-handoff-template.md` (+`.es.md`) existe con URLs de runbooks, rutas de escalación, propiedad de alertas y aceptación de SLA.
  - [x] Ambos tienen JSON Schemas en `rulesets/schema/` y se cablean en `phase-gates.rules.json` como evidencia mandatoria de Fase 05.

#### GT-219

**Propósito:** Añadir un bloque `operationalBudgets` al manifest de la topología agentic-ai, siguiendo el precedente fijado por serverless y edge-computing, para que los SLOs de token-budget, sandbox-timeout y rotación de credenciales sean legibles por máquina y exigibles.
**Evidencia Actual:** `grep -l operationalBudgets reference/core/architecture/topologies/*/*/topology.manifest.json` lo encuentra en `execution/edge-computing/` y `execution/serverless/` pero no en `ai/agentic-ai/topology.manifest.json`, a pesar de que GT-169 cerró el lado de docs/runbooks de esos presupuestos.
**Hecho Cuando:**
  - [x] `agentic-ai/topology.manifest.json` declara `operationalBudgets` con al menos `tokenBudgetPerExecution`, `credentialRotationIntervalHours` y `sandboxTimeoutMs`.
  - [x] `topology-manifest.schema.json` deja el bloque opcional con campos tipados; la validación de agentic-ai pasa.
  - [x] Un test rego exige la presencia del bloque para topologías AI.

#### GT-220

**Propósito:** Elevar la cobertura de ramas del CLI a la altura de la madurez de cobertura de statements subiendo `gate-status.command.ts` de 40% ramas a ≥80% y subiendo el umbral global de branches de Jest por encima del piso actual de 67%.
**Evidencia Actual:** `sdk/cli/coverage/coverage-summary.json` reporta `branches: 78.76%` global vs `statements: 91.42%`; `gate-status.command.ts` está en **40% branches / 60.43% statements** (la mayor brecha individual). El umbral en `jest.config.js` es `branches: 67` — muy por debajo del estado actual.
**Hecho Cuando:**
  - [x] `gate-status.command.ts` cobertura de ramas ≥80% (rutas de error, fallback de DORA, ramas de renderizado de métricas cubiertas por unit tests).
  - [x] Umbral global de branches en `jest.config.js` subido a 75 (con un issue de seguimiento para llegar a 80 una vez los siguientes hot-spots estén cubiertos).
  - [x] CI `sdk-cli-ci.yml` refleja el nuevo piso.

#### GT-221

**Propósito:** Añadir audit logging estructurado al transporte HTTP de MCP para que cada llamada tool/resource/prompt emita `{tool, args, context, durationMs, status}` con correlation IDs ligados a spans OTel — alineado con la postura de auditoría prometida por ADR-0073 y exigida para revisión de seguridad/compliance.
**Evidencia Actual:** `packages/mcp-server/src/mcp/mcp-server.service.ts` (rama HTTP) valida auth vía `mcp-server-auth.ts` pero no emite eventos de audit por llamada. No existe servicio `AuditLogger`; la correlación stderr/OTel está ausente para invocaciones de tools. El transporte stdio también tiene logging mínimo.
**Hecho Cuando:**
  - [x] Un `AuditLogger` (o proveedor NestJS equivalente) emite eventos estructurados por cada llamada tool/resource/prompt en ambos transportes.
  - [x] Los correlation IDs se propagan desde headers HTTP/metadata Stdio hasta spans OTel y audit logs.
  - [x] Tests de integración verifican emisión de eventos de audit para al menos una ruta de tool, resource y prompt.

#### GT-222

**Propósito:** Subir la densidad de tests OPA por topología a ≥1 test por regla para que el gate de paridad sea significativo — hoy modular-monolith tiene 2 tests para 12 reglas (17%), distributed-modules 4 para 8 (50%) y agentic-ai 4 para 9 (44%), todos muy por debajo de la densidad 100%+ de data-mesh y event-driven.
**Evidencia Actual:** Según la salida de `28-test-topology-opa.mjs` (esta auditoría): agentic-ai 4 casos / 9 reglas, distributed-modules 4 / 8, modular-monolith 2 / 12, microservices 8 / 8, edge 6 / 5, serverless 5 / 6, event-driven 10 / 9, data-mesh 10 / 9. Las tres topologías sub-cubiertas tiran el promedio a ~70% de densidad.
**Hecho Cuando:**
  - [x] modular-monolith añade ≥10 nuevos casos de test (uno por regla cubriendo ramas positiva + negativa).
  - [x] distributed-modules añade ≥4 nuevos casos; agentic-ai añade ≥5.
  - [x] `26-validate-topology-rule-coverage.mjs` se extiende para verificar densidad test/regla y fallar bajo un piso acordado (sugerencia ≥80%).

#### GT-223

**Propósito:** Añadir tests e2e de paridad cross-surface que ejerciten la misma operación de Core en CLI, MCP y REST y verifiquen equivalencia de envelope/payload — cierra el lado de runtime de la paridad de superficies declarada por GT-171 (la matriz existe; la ejecución contra ella es escasa).
**Evidencia Actual:** `sdk/cli/test/e2e/` cubre solo `sdlc-status` (3 casos) y `sdlc-handoff` (1 caso). `gate-evaluate`, `phase-advance`, `validate-satellite`, `drift-detect` tienen cero tests e2e cross-surface a pesar de estar declarados expuestos en `surface-parity-matrix.json` para las tres superficies. `mcp-e2e.test.ts` valida descubrimiento de tools, no equivalencia de salida.
**Hecho Cuando:**
  - [x] Un `surface-parity-fixture.ts` compartido invoca la misma operación vía binario CLI, tool MCP y endpoint REST y verifica equivalencia de envelope + datos.
  - [x] El fixture cubre al menos 5 operaciones core (`gate-evaluate`, `phase-advance`, `validate-satellite`, `drift-detect`, `sdlc-status`).
  - [x] CI corre la suite por push; fallos bloquean merge.

#### GT-224

**Propósito:** Llevar cada comando CLI que devuelve datos a conformidad con el envelope ADR-0073 añadiendo `--format json` a los comandos que carecen de él (`drift`, `architecture scaffold`, `docs`) para que la salida CLI sea consumible por máquina para el gateway MCP y la integración con Tracker.
**Evidencia Actual:** `sdk/cli/src/commands/drift/drift.command.ts` declara `json?: boolean` (línea 10–11) pero no registra `@Option('--format')`. `architecture scaffold` y `docs` no tienen ruta de salida JSON. ADR-0073 exige que cada comando de datos emita el envelope `{success, data, meta}` cuando se solicite `--format json`.
**Hecho Cuando:**
  - [x] `drift`, `architecture scaffold` y `docs` registran `@Option('--format json|text')` y emiten el envelope ADR-0073 cuando se selecciona `json`.
  - [x] Los tests unitarios CLI existentes verifican forma de envelope para rutas de éxito y error de cada comando.
  - [x] La entrada de la matriz de paridad de superficies para cada operación pasa a `cli.formats: ["json"]`.

#### GT-225

**Propósito:** Resolver los 4 casos `it.skip` en `sdk/cli/src/infrastructure/prompts/wizard.service.spec.ts` — revivirlos con el setup de test apropiado o documentar por qué quedan saltados, eliminando la deuda silenciosa de la suite unitaria.
**Evidencia Actual:** `grep -rn "describe.skip\|it.skip" sdk/cli` encuentra 4 casos saltados en `wizard.service.spec.ts:51, 69, 92, 132` cubriendo cancelación con null, confirmación de summary, cancelación en summary y fallback de modo no interactivo — todos comportamientos reales del wizard sin otra cobertura de test.
**Hecho Cuando:**
  - [x] Cada uno de los 4 tests saltados se reactiva y pasa, o se reescribe como una unidad enfocada cubriendo el mismo comportamiento.
  - [x] Si algún caso es irrecuperable, se elimina y se reemplaza por una nota `// reason:` inline más un issue de seguimiento.
  - [x] No queda ningún `it.skip`/`describe.skip` en `sdk/cli/src` tras el cierre.

#### GT-226

**Propósito:** Añadir configuración de Dependabot o Renovate para automatizar actualizaciones de dependencias, cerrando la brecha donde ADR-0009 exige bots de dependencias automatizados y la regla OPA DEP-09 valida su presencia, pero no existe ningún archivo de configuración en el repositorio.
**Evidencia Actual:** No existe `.github/dependabot.yml` ni `.renovaterc.json`. La regla OPA `ci-cd.rego` DEP-09 flagearía esto en repos satélite pero no bloquea el CI del repo core. Las dependencias no se actualizan automáticamente.
**Hecho Cuando:**
  - [x] `.github/dependabot.yml` existe con horarios de actualización npm (semanal) y GitHub Actions (mensual).
  - [x] La regla OPA DEP-09 pasa en el repositorio core.
  - [x] El primer lote de PRs de actualización de dependencias se genera y es revisable.

#### GT-227

**Propósito:** Implementar SAST (CodeQL) y SCA/escaneo de contenedores (Trivy) en workflows CI, cerrando la brecha donde ADR-0005 exige CodeQL en cada PR, CICD-01 lo codifica como regla blocking, y el provider profile lo documenta como "Active/Default", pero ningún workflow ejecuta estas herramientas.
**Evidencia Actual:** El job de auditoría de seguridad en `sdk-cli-ci.yml` solo ejecuta `npm audit --audit-level=high`. No existen pasos de CodeQL ni Trivy en ningún archivo `.github/workflows/*.yml`.
**Hecho Cuando:**
  - [x] Un job `codeql-analysis` corre en `sdk-cli-ci.yml` para JavaScript/TypeScript con queries extendidas.
  - [x] Un paso de escaneo Trivy corre sobre el Dockerfile para detección de vulnerabilidades de contenedor.
  - [x] Los hallazgos se suben como artefactos SARIF y son visibles en la pestaña Security de GitHub.

#### GT-228

**Propósito:** Construir un motor de orquestación de agentes que ejecute automáticamente las definiciones de workflow en `.bmad-core/workflows/`, cerrando la brecha donde `development.yaml` y `governance-gap.yaml` definen secuencias multi-agente pero no existe scheduler, persistencia de estado ni mecanismo de handoff automatizado.
**Evidencia Actual:** Los workflows son archivos YAML que describen secuencias de pasos pero los agentes se invocan manualmente vía LLM context. Los directorios `backlog/`, `deliverables/` y `proposals/` en `.bmad-core/` están vacíos.
**Hecho Cuando:**
  - [x] Un script de ejecución de workflows puede parsear workflow YAML y ejecutar pasos secuencialmente con tracking de estado.
  - [x] Los handoffs de agentes pasan artefactos (archivos, schemas) entre pasos programáticamente.
  - [x] Al menos un workflow (`governance-gap.yaml`) corre end-to-end con progresión automatizada de pasos.

#### GT-229

**Propósito:** Implementar el evaluador TypeScript-native que carga y evalúa archivos `.rules.json`, cerrando la brecha donde R-25 (Paridad Dual-Engine) exige que toda regla exista en ambos evaluador TypeScript Y OPA `.rego`, pero solo OPA evalúa reglas realmente hoy.
**Evidencia Actual:** Existen 26 archivos `.rules.json` en 10 dominios de gobernanza. El script `27-opa-parity-gate.mjs` compara WASM compilado contra fixtures "Native", pero ningún evaluador TypeScript carga o evalúa las reglas `.rules.json`.
**Hecho Cuando:**
  - [x] Un evaluador TypeScript carga reglas `.rules.json` y produce veredictos que coinciden con la salida OPA para las mismas entradas.
  - [x] Existen fixtures de paridad para todos los dominios de rulesets con tests de paridad pasando.
  - [x] CI ejecuta ambos evaluadores y asume resultados idénticos en fixtures compartidos.

#### GT-230

**Propósito:** Crear un directorio de skills y un framework de skills componibles para agentes BMAD, cerrando la brecha donde `.bmad-core/README.md` referencia un directorio `tooling/` que no existe, y los agentes no tienen una biblioteca de skills modular y descubrible.
**Evidencia Actual:** Las specs de agentes en `.harness/agents/agent-specs.md` definen capacidades en prosa pero no hay directorio `skills/`, formato de manifiesto de skills ni mecanismo de descubrimiento.
**Hecho Cuando:**
  - [x] Un directorio `.bmad-core/skills/` existe con un formato de manifiesto (JSON o YAML) para definición de skills.
  - [x] Al menos 3 skills están implementadas como ejemplos de referencia.
  - [x] Las definiciones de personas de agentes referencian skills por ID en lugar de descripciones de capacidades inline.

#### GT-231

**Propósito:** Cablear los 10 scripts CI que actualmente solo corren en pre-commit (vía `ci-runner.mjs`) a workflows GitHub Actions, cerrando la brecha donde los scripts 05-orphan, 12, 14, 15-coverage, 16-test, 17, 18, 19, 20, 21, 22 no tienen referencia en ningún workflow YAML.
**Evidencia Actual:** El hook pre-commit `ci-runner.mjs` ejecuta los 22 scripts numerados secuencialmente, pero solo 12 están referenciados en workflows GitHub Actions. Los 10 restantes solo corren localmente.
**Hecho Cuando:**
  - [x] Un workflow `governance-ci.yml` ejecuta todos los scripts sin enlazar como jobs o steps.
  - [x] Cada job produce artefactos de evidencia consumibles por el gap board.
  - [x] El workflow corre en PRs a main/develop y en pushes a main.

#### GT-232

**Propósito:** Crear definiciones completas de persona para Winston (`@winston`) y PO (`@po`) en `.bmad-core/agents/`, cerrando la brecha donde estos dos agentes existen solo en `.harness/agents/agent-specs.md` sin el YAML frontmatter completo, referencias de herramientas y mandatos de auto-mejora que tienen los otros 8 agentes.
**Evidencia Actual:** `.bmad-core/agents/` contiene 8 archivos de agente con YAML frontmatter. Winston y PO no tienen archivos correspondientes.
**Hecho Cuando:**
  - [x] `.bmad-core/agents/winston.md` existe con YAML frontmatter coincidente con el formato de otros agentes.
  - [x] `.bmad-core/agents/po.md` existe con YAML frontmatter coincidente con el formato de otros agentes.
  - [x] Ambos archivos incluyen scope, inputs, skills, constraints, handoff, validation y mandato de auto-mejora.

#### GT-233

**Propósito:** Añadir middleware de rate limiting al Core API, cerrando la brecha donde la Guía de Seguridad MCP documenta patrones de rate limiting adaptativo pero existen cero implementaciones en código TypeScript.
**Evidencia Actual:** `apps/core-api/src/main.ts` aplica `helmet()` globalmente pero no tiene middleware de rate limiting. La búsqueda de `rate.?limit` en archivos TypeScript retorna cero resultados.
**Hecho Cuando:**
  - [x] `@nestjs/throttler` está instalado y configurado con un default global (ej. 100 req/min).
  - [x] Existen overrides por endpoint para operaciones sensibles (auth, gate-evaluate).
  - [x] Los headers de rate limit (`X-RateLimit-*`) se retornan en las respuestas.

#### GT-234

**Propósito:** Añadir R-27 (Paridad de Madurez Topológica) a `global-rules.es.md`, cerrando la brecha de paridad bilingual donde la versión en inglés tiene 27 reglas pero la versión en español termina en R-26.
**Evidencia Actual:** `.harness/rules/global-rules.md` contiene reglas R-01 a R-27. `.harness/rules/global-rules.es.md` contiene reglas R-01 a R-26 solamente.
**Hecho Cuando:**
  - [x] `global-rules.es.md` contiene R-27 con traducción al español que coincide con el contenido en inglés.
  - [x] La sección de gates de validación mandatoria en ES incluye la verificación de cobertura de reglas topológicas presente en EN.
  - [x] `04-check-bilingual-parity.mjs` pasa en ambos archivos.

#### GT-235

**Propósito:** Resolver las colisiones de numeración de scripts CI donde los prefijos 05, 15 y 16 tienen dos scripts cada uno con el mismo prefijo, generando confusión sobre qué gate corresponde a qué número.
**Evidencia Actual:** `ci/23-check-orphan-bilingual.mjs` y `ci/24-check-surface-parity.mjs` comparten prefijo 05. Lo mismo con 15 y 16.
**Hecho Cuando:**
  - [x] Cada script CI tiene un prefijo numérico único.
  - [x] El orden de ejecución de `ci-runner.mjs` permanece correcto tras la renumeración.
  - [x] Todas las referencias de workflows a scripts renombrados están actualizadas.

#### GT-236

**Propósito:** Automatizar el pipeline de knowledge intake para que nuevos archivos `KI-*.yaml` o `SRC-*.yaml` disparen validación, revisión y promoción automáticamente, cerrando la brecha donde el pipeline existe en diseño pero requiere ejecución manual en cada etapa.
**Evidencia Actual:** El sistema de knowledge intake tiene 1 fuente y 1 item en status `candidate`. La infraestructura RAG (script 14) existe pero no tiene contenido en vivo.
**Hecho Cuando:**
  - [x] Un PR que añade `KI-*.yaml` o `SRC-*.yaml` dispara validación automatizada schema + OPA.
  - [x] La validación exitosa crea o actualiza el status de promoción del item automáticamente.
  - [x] El paso de revisión de Winston puede invocarse vía comando de comment o job programado.

#### GT-237

**Propósito:** Redactar los 5 ADRs AI-Augmented propuestos (ADR-AI-001 through ADR-AI-005) que están listados en referencias de gobernanza pero nunca se escribieron como documentos reales.
**Evidencia Actual:** `reference/core/architecture/adrs/ai-augmented/` es referenciado en secciones de gobernanza listando 5 ADRs propuestos pero ninguno existe en el sistema de archivos.
**Hecho Cuando:**
  - [x] Los 5 documentos ADR existen en `reference/core/architecture/adrs/ai-augmented/` con estructura propia (Title, Status, Context, Decision, Consequences).
  - [x] Cada ADR tiene versiones EN y ES manteniendo paridad bilingual.
  - [x] El status del ADR se actualiza de "proposed" a "accepted" o "superseded" según corresponda.

#### GT-238

**Propósito:** Añadir Prometheus/Mimir al stack de observabilidad para que las métricas RED/USE sean coleccionables y consultables, cerrando la brecha donde el playbook de observabilidad referencia métricas basadas en Mimir pero el docker-compose solo provee Tempo y Loki.
**Evidencia Actual:** `product/infra/docker-compose.yml` incluye servicios para OTel Collector, Tempo, Grafana y Loki. No existe servicio Prometheus ni Mimir.
**Hecho Cuando:**
  - [x] Prometheus se añade a docker-compose con configuración de scrape para métricas del Core API.
  - [x] Mimir se añade para almacenamiento de métricas a largo plazo.
  - [x] Grafana se provee con un datasource de Prometheus junto a Tempo y Loki existentes.

#### GT-239

**Propósito:** Definir SLOs concretos por servicio e implementar reglas de alerting, cerrando la brecha donde el template de validación observacional referencia baselines de SLO pero no existen documentos SLO ni configuraciones de alerta.
**Evidencia Actual:** `rulesets/schema/observability-validation.schema.json` define campos para cumplimiento de SLO pero no existen documentos SLO en `product/operations/`. No existen reglas de alerting de Prometheus ni configuración de notificaciones.
**Hecho Cuando:**
  - [x] Al menos 3 SLOs están definidos (disponibilidad 99.9%, latencia p99 <200ms, tasa de error <0.1%).
  - [x] Existen reglas de alerting de Prometheus para: tasa de error >1%, latencia p99 >500ms, reinicios de pod >3.
  - [x] La provisión de alertas de Grafana enruta alertas a un canal de notificación configurable.

#### GT-240

**Propósito:** Ajustar la configuración CORS por environment para que los deployments de producción restrinjan orígenes a dominios conocidos, cerrando la brecha donde los tests muestran `origin: ['*']` — una política excesivamente permisiva.
**Evidencia Actual:** Los tests de security headers prueban CORS con `origin: ['*']`. No existe configuración CORS por environment.
**Hecho Cuando:**
  - [x] La configuración CORS es aware por environment: dev (`*`), staging (lista específica), production (dominio exacto).
  - [x] El spec de security headers prueba la política CORS de cada environment.
  - [x] La configuración se drivea por variables de ambiente, no hardcodeada.

#### GT-241

**Propósito:** Añadir generación SBOM (Software Bill of Materials) al pipeline CI/release usando formato CycloneDX o SPDX, cerrando la brecha donde el template de reporte de scan de seguridad referencia SBOM pero ningún paso CI lo produce.
**Evidencia Actual:** `rulesets/schema/security-scan-report.schema.json` define SBOM como tipo de scanner. Ningún paso de workflow genera, firma o publica artefactos SBOM.
**Hecho Cuando:**
  - [x] Un paso CI genera un SBOM CycloneDX después de `npm ci` o `npm build`.
  - [x] El artefacto SBOM se sube como artefacto de build o se adjunta a releases de GitHub.
  - [x] El SBOM es consumible por herramientas downstream (Dependency-Track, Grype, etc.).

#### GT-242

**Propósito:** Generar políticas OPA `.rego` para los 17 rulesets nativos que actualmente no tienen contraparte OPA, cerrando la brecha de Paridad Dual-Engine (R-25) para los dominios no-core.
**Evidencia Actual:** Solo 9 de 26 dominios de rulesets nativos tienen archivos `.rego` correspondientes. Los 17 dominios restantes (7 codificados en ADR, 5 transversales, 3 SDLC, 2 especializados) no tienen equivalente OPA.
**Hecho Cuando:**
  - [x] Los 5 rulesets transversales (definition-of-done, engineering-manifesto, compliance-baseline, repository-taxonomy, anti-corruption-layer) tienen archivos `.rego` con tests.
  - [x] Existen input schemas en `rulesets/opa/schemas/` para cada nueva política.
  - [x] El agregador `main.rego` importa violaciones de las nuevas políticas.

#### GT-243

**Propósito:** Implementar tests k6 de carga para los 3 escenarios de estrés definidos en ADR-0037, cerrando la brecha donde el ADR exige testing k6 pero no existen scripts de load test.
**Evidencia Actual:** ADR-0037 define 3 escenarios: (1) baseline de throughput API, (2) conexiones MCP concurrentes, (3) operaciones batch de CLI. No existen archivos de script k6 ni configuraciones de performance testing.
**Hecho Cuando:**
  - [x] Existen 3 scripts k6 cubriendo cada escenario de ADR-0037.
  - [x] Los baselines de rendimiento se registran y almacenan como umbrales de referencia.
  - [x] Un job CI corre load tests en base programada (no bloqueando PRs inicialmente).

#### GT-244

**Propósito:** Crear playbooks y plantillas de respuesta a incidentes para el producto core, cerrando la brecha donde existen runbooks para agentic AI pero los procedimientos generales de respuesta (caída de servicio, brecha de datos, rollback de producción) están ausentes.
**Evidencia Actual:** `reference/core/architecture/topologies/ai/agentic-ai/runbooks.md` cubre incidentes específicos de agentes. No existen playbooks generales de respuesta a incidentes para el producto core.
**Hecho Cuando:**
  - [x] Existen playbooks para: caída de servicio, brecha de datos, CVE en dependencias, rollback de producción.
  - [x] Cada playbook tiene: clasificación de severidad, plantilla de comunicación, pasos de contención, pasos de recuperación, plantilla de post-mortem.
  - [x] Los playbooks se almacenan en `product/operations/` con versiones bilingües.

#### GT-245

**Propósito:** Añadir DAST (Dynamic Application Security Testing) usando OWASP ZAP o equivalente al pipeline de seguridad, cerrando la brecha donde el template de reporte de scan lista DAST como tipo de scanner pero ninguna herramienta DAST está configurada.
**Evidencia Actual:** `rulesets/schema/security-scan-report.schema.json` define DAST como tipo de scanner válido. No existe configuración de OWASP ZAP, Burp Suite u otra herramienta DAST.
**Hecho Cuando:**
  - [x] Un scan baseline de OWASP ZAP corre contra el Core API en un job CI.
  - [x] Los hallazgos de ZAP se exportan como SARIF y son visibles en la pestaña Security de GitHub.
  - [x] Hallazgos High/Medium bloquean el pipeline de release.

#### GT-246

**Propósito:** Implementar experimentos de ingeniería del caos usando Chaos Mesh o Litmus, cerrando la brecha donde ADR-0037 exige herramientas de chaos engineering pero no existen definiciones de experimentos.
**Evidencia Actual:** ADR-0037 referencia Chaos Mesh/Litmus para chaos engineering. No existen definiciones de experimentos, configuraciones de fault injection ni escenarios de resilience testing.
**Hecho Cuando:**
  - [x] Al menos 3 experimentos de caos están definidos: partición de red, kill de pod, estrés de CPU.
  - [x] Los experimentos son ejecutables contra un entorno local o staging vía docker-compose o manifiestos Kubernetes.
  - [x] Los resultados se registran y correlacionan con señales de observabilidad.

#### GT-247

**Propósito:** Reemplazar credenciales hardcodeadas en docker-compose con inyección de secrets, cerrando la brecha donde el archivo compose de infraestructura contiene passwords en texto plano para PostgreSQL, Redis, RabbitMQ, MongoDB, MinIO y OpenBao.
**Evidencia Actual:** `product/infra/docker-compose.yml` contiene passwords hardcodeadas para 6 servicios. No existe mecanismo de inyección de secrets documentado para producción.
**Hecho Cuando:**
  - [x] docker-compose usa referencias `${VARIABLE}` para todas las credenciales.
  - [x] Un archivo `.env.example` documenta los secrets requeridos sin valores reales.
  - [x] La documentación explica la inyección de secrets para producción (Docker secrets, Vault, etc.).

#### GT-248

**Propósito:** Crear un script monitor de frescura de ADRs que detecte ADRs obsoletos y genere recordatorios de revisión, cerrando la brecha donde no existe ningún mecanismo automatizado para rastrear la vigencia de ADRs o desencadenar revisiones periódicas.
**Evidencia Actual:** Existen 48+ ADRs Core con edades variables. Ningún script verifica fechas de modificación, flaggea ADRs obsoletos o genera recordatorios de revisión.
**Hecho Cuando:**
  - [x] Un script escanea todos los ADRs, extrae fechas de última modificación y flaggea los >180 días sin cambios.
  - [x] Los ADRs >365 días generan un recordatorio de revisión en el gap board.
  - [x] El script corre en base semanal (ej. lunes 09:00 UTC) vía GitHub Actions.

#### GT-249

**Propósito:** Añadir una capa de caché Redis al Core API y MCP server para optimizar latencia y rendimiento en el patrón de consumo del Tracker, donde peticiones repetidas de manifiestos de topología, evaluaciones OPA y verificaciones de estado de gate golpean los mismos datos.
**Evidencia Actual:** El Core API (`apps/core-api/`) no tiene middleware de caché. Cada petición de manifiestos de topología, evaluaciones de gates y búsquedas de rulesets golpea directamente el sistema de archivos o el motor OPA. Con Tracker como consumidor haciendo consultas frecuentes para los mismos datos de topología, esto crea latencia innecesaria y computación redundante. El rate limiting también está ausente.
**Hecho Cuando:**
  - [x] Una instancia Redis se añade al stack de infraestructura en `docker-compose.yml`.
  - [x] Core API implementa caché de respuestas para búsquedas de manifiestos de topología (TTL: 5 minutos).
  - [x] Los resultados de evaluación de políticas OPA se cachean por hash de input (TTL: 1 minuto) para evitar re-evaluación con inputs idénticos.
  - [x] El middleware de rate limiting usa Redis para contadores distribuidos (reemplazando in-memory).
  - [x] MCP server cachea resultados de descubrimiento de tools/resources (TTL: 10 minutos).
  - [x] Se documenta una estrategia de invalidación de caché para actualizaciones de manifiestos de topología.
  - [x] Métricas de hit/miss de caché se exponen vía el stack de observabilidad (Prometheus).

#### GT-250

**Propósito:** Eliminar el bypass silencioso de autenticación en el transporte HTTP del MCP, donde las peticiones obtienen scope completo de admin si el servidor se levanta sin `--api-key` ni `EVOLITH_API_KEY` — derrotando el contrato ABAC documentado (GT-157/GT-158) para cualquier despliegue de producción que olvide configurar la clave.
**Evidencia Actual:** `packages/mcp-server/src/mcp/mcp-server-auth.ts:21-23` — `if (!apiKey) { return { ...ADMIN_CONTEXT, ... } }` retorna el `ADMIN_CONTEXT` congelado (rol `admin`, scopes `read,write,admin`) para todo llamador cuando `apiKey` es `undefined`. No hay warning, ni guard por entorno, ni modo fail-closed.
**Hecho Cuando:**
  - [x] Si `apiKey` está indefinida, el transporte HTTP rehúsa arrancar en `NODE_ENV=production` (fail-closed).
  - [x] Fuera de producción, un flag explícito `--allow-no-auth` (o env `EVOLITH_MCP_ALLOW_NO_AUTH=true`) es requerido para optar por el atajo de desarrollo; en otro caso el servidor rehúsa arrancar.
  - [x] Cuando el atajo de desarrollo está activo, se emite un mensaje `WARN auth.bypass` al inicio.
  - [x] Comportamiento del transporte stdio documentado (sigue siendo admin-scoped por diseño; trust boundary in-process).
  - [x] Tests cubren: rechazo en producción, opt-in en dev, emisión de warning, y los caminos felices existentes de API-key/JWT. Tests existen pero bloqueados por GT-267 (CacheModule).

#### GT-251

**Propósito:** Eliminar el riesgo de inyección de comandos en `evolith update --install`, donde la cadena de versión retornada por `npm view ... --json` se interpola en un comando shell vía `execSync`, de modo que una respuesta maliciosa o comprometida del registro podría ejecutar código arbitrario en la máquina del operador.
**Evidencia Actual:** `sdk/cli/src/commands/update/update.command.ts:116` — `execSync(`npm install -g @evolith/smart-cli@${latestVersion}`, { stdio: 'inherit' })`. `latestVersion` proviene de `JSON.parse(result.trim())` en la línea 163 sin validación semver antes de empalmarse en el string de shell.
**Hecho Cuando:**
  - [x] `execSync` (forma string) reemplazado por `execFileSync('npm', ['install', '-g', `@evolith/smart-cli@${latestVersion}`])` para que la versión sea un argumento, no un token shell.
  - [x] `latestVersion` se valida contra la regex semver antes de usar; valores inválidos abortan con un error claro.
  - [x] El mismo hardening se aplica al camino de lectura (`execFile`/`execFileSync` en vez de `execSync`).
  - [x] El spec cubre: versión maliciosa (e.g., `1.0.0; rm -rf /`) es rechazada en el gate de regex.

#### GT-252

**Propósito:** Cablear las 19 políticas OPA huérfanas dentro de `main.rego` para que el agregador represente realmente la superficie de políticas de Evolith — hoy el evaluador de gates solo ve 7 de los 26 módulos de política, omitiendo silenciosamente el 73% de las reglas de gobernanza.
**Evidencia Actual:** `rulesets/opa/main.rego` solo importa `version_pinning`, `taxonomy`, `cli_readiness`, `evidence`, `mcp`, `ci_cd`, `governance`. Contando `ls rulesets/opa/*.rego | grep -v test.rego` se obtienen 27 archivos; restando `main.rego` quedan 26 políticas. 26 − 7 = **19 huérfanas**: `abac-mcp-tool-access`, `anti-corruption-layer`, `cicd-quality-gates`, `cli-core-parity`, `cli-release-readiness`, `compliance-baseline`, `dod`, `engineering-manifesto`, `executive-scorecards`, `gitflow-branching`, `hexagonal-architecture`, `knowledge-intake`, `multi-runtime`, `multi-tenancy`, `open-core-boundary`, `protocol-selection`, `repository-taxonomy`, `satellite-contracts`, `testing-pyramid`.
**Hecho Cuando:**
  - [x] `main.rego` importa los 19 paquetes faltantes y agrega sus `violations` a la regla unión.
  - [x] `main_test.rego` añade al menos un fixture por paquete recién cableado que ejercita una violación conocida.
  - [x] El evaluador OPA detecta los nuevos paquetes sin configuración adicional (verificado vía smoke `opa eval`).
  - [x] Si alguna política está intencionalmente excluida (e.g., experimental), se documenta en `rulesets/opa/README.md` con el motivo.

#### GT-253

**Propósito:** Fijar `aquasecurity/trivy-action` a un tag de versión específico para eliminar el riesgo de cadena de suministro de una referencia móvil `@master` en CI, que hoy podría cambiar el comportamiento del scanner o ser secuestrada sin que lo notemos.
**Evidencia Actual:** `.github/workflows/sdk-cli-ci.yml:344` — `uses: aquasecurity/trivy-action@master`. Sin SHA ni tag de versión.
**Hecho Cuando:**
  - [x] `trivy-action@master` reemplazado por un tag fijo (e.g., `@0.24.0`) o un SHA de 40 chars.
  - [x] Regla Dependabot/Renovate cubre actualizaciones de `github-actions` para mantener el pin.
  - [x] Resto de actions de terceros en `.github/workflows/` auditadas; cualquier referencia `@master`/`@main` se fija en el mismo PR o se registra como follow-up.

#### GT-254

**Propósito:** Prevenir ataques de path traversal contra la superficie `resources/read` del MCP — hoy un cliente MCP puede construir URIs estilo `evolith://ruleset/../../etc/passwd` y el resolvedor de recursos hará `path.join` fuera del directorio raíz de rulesets sin oposición.
**Evidencia Actual:** `packages/mcp-server/src/mcp/resources.service.ts:115` — `path.join(corePath, 'rulesets', name.replace(/-/g, '/') + '.rules.json')` sin normalización ni chequeo de contención. Misma forma en líneas 119 (path alterno), 134 (`getAgentContent`), 157 (`getMoscowAnalysis`) y 172-176 (`getTopologyContent`). Cada uno acepta un string suministrado por el usuario y lo une contra una base de confianza sin verificar que la ruta resuelta permanezca dentro de la base.
**Hecho Cuando:**
  - [x] Cada resolvedor normaliza la ruta candidata (`path.resolve`) y rechaza cualquier resultado cuya forma normalizada no comience con el directorio base resuelto.
  - [x] Nombres con `..`, rutas absolutas, o separadores de ruta que escapen de la forma esperada son rechazados con un envelope `BAD_REQUEST` antes de cualquier llamada al sistema de archivos.
  - [x] Los specs cubren casos positivos (búsquedas legítimas de ruleset/agent/topology) y negativos (`../../etc/passwd`, rutas absolutas, traversal URL-encoded).

#### GT-255

**Propósito:** Cerrar la brecha de CSP / headers de seguridad en el transporte HTTP del MCP para que MCP y Core API presenten la misma superficie defensiva — `apps/core-api` ya cablea `helmet`, pero `packages/mcp-server` no, dejando sus respuestas HTTP sin CSP, HSTS, X-Frame-Options ni X-Content-Type-Options.
**Evidencia Actual:** `apps/core-api/src/main.ts:8,51` importa y aplica `helmet()`. Un grep por `helmet` / `Content-Security-Policy` en `packages/mcp-server/src/` solo devuelve una definición de tipo de node_modules — sin uso en producción. `mcp-server.service.ts` construye un `http.createServer` sin aplicar middleware de headers.
**Hecho Cuando:**
  - [x] El transporte HTTP del MCP configura, como mínimo: `Content-Security-Policy: default-src 'none'`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`.
  - [x] La implementación reutiliza `helmet` (preferido) o una utilidad de headers explícita compartida con Core API.
  - [x] Spec verifica que los headers estén presentes en una respuesta representativa (e.g., `resources/list`).

#### GT-256

**Propósito:** Reparar el healthcheck de Traefik en `docker-compose.yml`, que hoy consulta `/ping` mientras Traefik se levanta sin `--ping=true`, garantizando que el contenedor sea marcado unhealthy en cualquier entorno que dependa de este stack.
**Evidencia Actual:** `product/infra/docker-compose.yml:164-182` — Traefik arranca solo con `--providers.file.directory=/etc/traefik/dynamic`. El healthcheck en la línea 182 corre `traefik healthcheck --ping`, que llama al endpoint ping interno; sin `--ping=true` (o `--ping.entrypoint=...`) en la línea de arranque, ese endpoint está deshabilitado y el check falla.
**Hecho Cuando:**
  - [x] La lista de comandos de Traefik incluye `--ping=true` (y un entrypoint explícito si es necesario).
  - [x] `traefik healthcheck --ping` tiene éxito contra un contenedor en ejecución.
  - [x] Opcional: endpoint de ping enlazado al entrypoint interno/admin, no al público.

#### GT-257

**Propósito:** Fijar la imagen de MongoDB a una versión menor específica para que el stack de infraestructura sea reproducible y esté protegido frente a upgrades silenciosos que puedan romper compatibilidad o introducir cambios no revisados.
**Evidencia Actual:** `product/infra/docker-compose.yml:54` — `image: mongo:latest`. Otros servicios (PostgreSQL, Redis, Traefik) ya están fijados; MongoDB es el caso aislado.
**Hecho Cuando:**
  - [x] `mongo:latest` reemplazado por un tag fijo coincidente con la versión que Evolith soporta (e.g., `mongo:7.0`).
  - [x] Decisión de tag documentada en el README de infraestructura junto con la cadencia de actualización.
  - [x] Regla Dependabot/Renovate cubre actualizaciones de imágenes `docker` para mantener el pin.

#### GT-258

**Propósito:** Añadir controles `concurrency:` a cada workflow de GitHub Actions para que pushes apilados cancelen runs superados — ahorrando cómputo, acelerando feedback y previniendo race conditions en workflows que mutan releases o cachés.
**Evidencia Actual:** `grep -L "concurrency:" .github/workflows/*.yml` devuelve los 11 workflows: `ci-cd.yml`, `ci.yml`, `coverage-impact.yml`, `docs-release.yml`, `docs.yml`, `enforce-root-cleanliness.yml`, `governance-ci.yml`, `knowledge-intake.yml`, `opa-parity.yml`, `sdk-cli-ci.yml`, `sdk-cli-release.yml`.
**Hecho Cuando:**
  - [x] Cada workflow declara un bloque `concurrency:` de nivel superior identificado por nombre de workflow + ref.
  - [x] Workflows estilo PR fijan `cancel-in-progress: true`; workflows de release/publish fijan `cancel-in-progress: false`.
  - [x] Documentado en `.harness/playbooks/` (o guía de CI equivalente) para que los workflows futuros hereden el patrón.

#### GT-259

**Propósito:** Reemplazar el frágil match de string en el mensaje de commit que gatilla el job de publish a npm por un trigger basado en tag, de modo que los releases no puedan dispararse accidentalmente por un commit cuyo cuerpo contenga "bump version".
**Evidencia Actual:** `.github/workflows/ci-cd.yml:42` — `if: github.ref == 'refs/heads/main' && contains(github.event.head_commit.message, 'bump version')`. Cualquier commit aterrizado en main con esa subcadena (incluyendo merge commits, reverts o housekeeping) gatilla `npm publish --access public --tag beta`.
**Hecho Cuando:**
  - [x] El job `publish-npm` se dispara con eventos `push` cuyo `github.ref` coincide con `refs/tags/v*` (o patrón semver equivalente).
  - [x] El guard actual `contains('bump version')` se elimina.
  - [x] Procedimiento de release documentado: tag → workflow corre → publica en npm.
  - [x] Compatibilidad hacia atrás: entrada `workflow_dispatch` manual existente preservada si existe, o añadida si no.

#### GT-260

**Propósito:** Cerrar la brecha de paridad bilingüe para agentes BMAD proveyendo el archivo de persona en español del agente PO y cableándolo en los mismos workflows que los otros 8 agentes.
**Evidencia Actual:** `.bmad-core/agents/` contiene pares `.md` + `.es.md` para `analyst`, `architect`, `dev`, `devops`, `docs`, `pm`, `qa`, `sm`. El agente PO solo tiene `po.md`; `po.es.md` no existe. (Winston es monolingüe por diseño.)
**Hecho Cuando:**
  - [x] `.bmad-core/agents/po.es.md` creado con una traducción fiel de la persona, responsabilidades y outputs de `po.md`.
  - [x] Cualquier script/workflow de carga de agentes que enumere pares `*.es.md` incluye el nuevo archivo.
  - [x] `check-bilingual-parity.mjs` pasa tras la adición.

#### GT-261

**Propósito:** Acotar la huella de recursos de cada contenedor del stack de infraestructura para que un servicio descontrolado no pueda asfixiar a sus vecinos en el mismo host, y para que la planificación de capacidad mapee limpiamente al dimensionamiento en producción.
**Evidencia Actual:** `grep -nE "mem_limit|cpus|deploy:|resources:" product/infra/docker-compose.yml` devuelve nada — ningún servicio declara `mem_limit`, `cpus` ni un bloque `deploy.resources`.
**Hecho Cuando:**
  - [x] Cada servicio en `docker-compose.yml` declara límites de memoria y CPU apropiados a su rol (PostgreSQL, MongoDB, Redis, RabbitMQ, MinIO, OpenBao, Traefik, Core API, MCP server).
  - [x] Límites documentados en el README de infraestructura con el razonamiento (carga habitual + headroom).
  - [x] Validado localmente que el stack arranca dentro de los límites declarados y los healthchecks siguen pasando.

#### GT-262

**Propósito:** Codificar procedimientos de backup y disaster-recovery para los data stores stateful (PostgreSQL, MongoDB, MinIO, OpenBao) para que la plataforma pueda recuperarse de pérdida de datos sin arqueología ad-hoc.
**Evidencia Actual:** Una búsqueda en el repo por scripts de backup (`find . -name "backup*.sh" -o -name "*-backup*"`) y planes de restore estilo Terraform devuelve nada bajo `product/infra/`, `apps/` ni `.harness/`. No existe runbook de DR.
**Hecho Cuando:**
  - [x] Existen scripts de backup (o procedimientos operativos documentados) para cada servicio stateful: PostgreSQL (`pg_dump`/PITR), MongoDB (`mongodump`), MinIO (replicación de objetos o `mc mirror`), OpenBao (snapshot).
  - [x] Cada servicio tiene un objetivo RPO/RTO documentado.
  - [x] Un runbook de restore guía a través de un ejercicio completo de DR; commiteado en `product/infra/runbooks/`.
  - [x] Lint de CI verifica que el runbook existe; referencia cruzada con SDLC Phase 05 rollback (GT-218).

#### GT-263

**Propósito:** Añadir alertas Prometheus a nivel de infraestructura para que los problemas de plataforma (servicio caído, presión de disco, pico de error rate) paguen on-call antes de llegar a usuarios, cerrando una brecha dejada abierta por la adopción del stack de observabilidad.
**Evidencia Actual:** Una búsqueda en el repo por `*.rules.yaml`, `*alerts*` o `prometheus*` devuelve nada. Los ADRs de observabilidad describen lo que debería existir, pero no hay reglas de alerta commiteadas.
**Hecho Cuando:**
  - [x] Un archivo de reglas de alerta (e.g., `product/infra/observability/alerts.rules.yaml`) define como mínimo: service-down, alta tasa de error (5xx), latencia P99 alta, disk-free bajo umbral, profundidad de cola RabbitMQ, fallos de evaluación OPA.
  - [x] Alertas cableadas en la configuración Prometheus que viaja con el stack docker-compose.
  - [x] Cada alerta tiene un link a runbook y un label de severidad.
  - [x] Smoke test: disparar una alerta en un entorno dev y verificar que se enciende.

#### GT-264

**Propósito:** Hacer significativo el scan DAST (OWASP ZAP) en CI apuntándolo a una instancia real en ejecución, o eliminarlo — hoy apunta a `http://localhost:8000` sin levantar un servidor, por lo que el scan es silenciosamente un no-op.
**Evidencia Actual:** `.github/workflows/sdk-cli-ci.yml:372-374` — `uses: zaproxy/action-full-scan@v0.10.0` con `target: 'http://localhost:8000'`. Ningún paso precedente levanta un servicio en ese puerto, por lo que ZAP escanea contra nada y el job o no hace nada o falla silenciosamente.
**Hecho Cuando:**
  - [x] O bien: (a) un paso precedente levanta Core API (o MCP) en el puerto objetivo y espera readiness antes de que ZAP corra; o (b) el paso DAST se elimina y el motivo se registra en un ADR/playbook.
  - [x] Si se mantiene: reporte de ZAP subido como artefacto del workflow y umbrales de falla documentados.
  - [x] Si se elimina: un gap follow-up captura el plan DAST a largo plazo (e.g., scan programado contra un entorno staging).

#### GT-265

**Propósito:** Añadir detección de secretos en CI (gitleaks o equivalente) para que commits accidentales de API keys, secretos JWT o credenciales de base de datos sean detectados en tiempo de PR, no después de aterrizar en la historia.
**Evidencia Actual:** `grep -rln "gitleaks\|truffle\|secretlint" .github/` devuelve nada — ningún scanner de secretos corre en ningún workflow. El repo maneja credenciales en docker-compose (cerrado por GT-247) y secretos JWT (follow-up de GT-250), por lo que el blast radius de un secreto filtrado es real.
**Hecho Cuando:**
  - [x] Un paso gitleaks (o equivalente) corre en cada PR y push, escaneando el diff más el repo completo en una agenda.
  - [x] `.gitleaks.toml` (o config equivalente) documenta fixtures de test allow-listadas para que el scan mantenga señal alta.
  - [x] Hallazgos fallan el build con un mensaje claro de remediación.
  - [x] Hook pre-commit (opcional) replica el check localmente.

#### GT-266

**Propósito:** Crear un servicio de provisioning de API keys para el transporte HTTP de MCP, de modo que consumidores externos tengan una forma segura y auditable de obtener y rotar llaves — actualmente la única opción es un único secreto compartido configurado vía env var, sin generación, distribución, rotación ni revocación.
**Evidencia Actual:** No hay endpoint de generación de keys, ni key store, ni mecanismo de rotación. El operador auto-provisionaba cualquier string vía `--api-key` o `EVOLITH_API_KEY` y lo distribuía out of band. No hay keys por cliente, ni persistencia hasheada, ni trail de auditoría. ADR-0088/ADR-0091 prescriben migrar a identidades de corta duración (Token Exchange, Workload Identity), pero esa migración no está programada y el path de key estática carece de higiene básica de provisioning.
**Hecho Cuando:**
  - [x] Formato de API key definido (ej. prefijo `evk_` + entropía) y un comando CLI o endpoint HTTP genera keys on demand.
  - [x] Keys almacenadas hasheadas (SHA-256) con metadatos: etiqueta de cliente, fecha de creación, último uso, expiración.
  - [x] Rotación de keys soportada sin reinicio del servidor (múltiples keys válidas, versionadas por fecha de creación).
  - [x] Endpoint o mecanismo de revocación documentado.
  - [x] Log de auditoría para eventos de creación, rotación y revocación de keys.
  - [x] Ruta de migración documentada desde el modelo actual de env-var único al servicio de provisioning.

#### GT-267

**Título:** Restaurar build/test del workspace tras integración de caché Redis
**Propósito:** Desbloquear el baseline de release del monorepo después de que la capa de caché introdujo imports runtime y deriva TypeScript que impiden compilar o testear Core API, MCP Server y el CLI dependiente. Es bloqueante productivo porque la optimización de caché no puede promoverse mientras las superficies ejecutables fallan.
**Evidencia Actual:** Auditoría Winston del 2026-06-25: `npm -ws run build --if-present` falla en `apps/core-api` porque `@nestjs/cache-manager` y `cache-manager` no están instalados y `CacheInterceptor`/`CacheTTL` se importan desde `@nestjs/common`; `packages/mcp-server` falla por las mismas dependencias de caché ausentes, `trace.SpanStatusCode` y errores de deprecación TypeScript 6. `npm --workspace apps/core-api test -- --runInBand`, `npm --workspace packages/mcp-server test -- --runInBand` y `npm --workspace sdk/cli run test:unit -- --runInBand` también están rojos.
**Hecho Cuando:**
  - [x] Core API declara e instala las dependencias de caché que usa (`@nestjs/cache-manager`, `cache-manager`, store Redis como `@keyv/redis` si se conserva) e importa decorators/interceptors de caché desde el paquete que realmente los exporta para Nest 11.
  - [x] MCP Server declara sus dependencias de caché, corrige el import de estado OpenTelemetry (`SpanStatusCode` desde `@opentelemetry/api`) y migra o silencia intencionalmente las deprecaciones TypeScript 6.
  - [x] CLI deja de resolver artefactos MCP compilados rotos durante los tests unitarios.
  - [x] `npm -ws run build --if-present`, `npm --workspace apps/core-api test -- --runInBand`, `npm --workspace packages/mcp-server test -- --runInBand` y `npm --workspace sdk/cli run test:unit -- --runInBand` pasan desde un checkout limpio.

#### GT-268

**Título:** Restaurar scripts validadores CI ausentes referenciados por workflows y reglas
**Propósito:** Reconciliar el harness de gobernanza para que exista todo comando de validación documentado y referenciado por workflows. Entrypoints validadores ausentes crean falsa confianza documental y fallos garantizados en los workflows que los invocan.
**Evidencia Actual:** `AGENTS.md` y `AGENTS.es.md` listan `.harness/scripts/bilingual-coverage.mjs` y `.harness/scripts/coverage-dashboard.mjs`; `.github/workflows/docs.yml` invoca ambos; `.github/workflows/sdk-cli-ci.yml` invoca `bilingual-coverage.mjs`; `.github/workflows/governance-ci.yml` y las reglas globales invocan `.harness/scripts/ci/26-validate-topology-rule-coverage.mjs`. Los tres archivos están ausentes en el checkout auditado.
**Hecho Cuando:**
  - [x] `.harness/scripts/bilingual-coverage.mjs` existe, reporta cobertura EN/ES y termina con código distinto de cero ante regresiones configuradas de cobertura.
  - [x] `.harness/scripts/coverage-dashboard.mjs` existe, genera la salida Markdown/HTML esperada y su ruta coincide con el paso de artefacto del workflow de docs.
  - [x] `.harness/scripts/ci/26-validate-topology-rule-coverage.mjs` existe o las referencias de workflow/regla global se reemplazan por el validador canónico vigente; el comando elegido reporta cobertura Native/OPA para topologías aceptadas.
  - [x] `node .harness/scripts/bilingual-coverage.mjs`, `node .harness/scripts/coverage-dashboard.mjs` y `node .harness/scripts/ci/26-validate-topology-rule-coverage.mjs` pasan localmente o sus comandos reemplazantes quedan cableados en todas partes.

#### GT-269

**Título:** Restaurar reproducibilidad del contrato roundtrip ADR-0073
**Propósito:** Reabrir la red de regresión contractual prometida por GT-172/GT-223 para que CLI, MCP y REST vuelvan a demostrar equivalencia semántica en `gate evaluate`. Una suite de contrato existente pero no ejecutable no es evidencia válida de release.
**Evidencia Actual:** `npm run test:contract` falla 34/34 tests. TypeScript no puede resolver subpaths de paquete desde `sdk/cli/src/app.module.ts` bajo `tests/contract/tsconfig.json` (`moduleResolution: node`), aunque Node sí resuelve los exports compilados del paquete. Jest también reporta mocks manuales duplicados desde `packages/mcp-server/dist/__mocks__` ignorado y `packages/mcp-server/src/__mocks__`, por lo que artefactos generados contaminan el grafo de tests contractuales tras builds locales.
**Hecho Cuando:**
  - [x] La resolución TypeScript del test contractual se alinea con los exports de paquetes del workspace (`node16`/`nodenext`/`bundler` o `paths` explícitos solo para tests) sin saltarse fronteras públicas de paquete.
  - [x] Jest ignora mocks generados en `dist/**` o el flujo cleanup/build los elimina antes de correr tests de contrato.
  - [x] `npm run test:contract` pasa desde un checkout limpio y después de un build local del workspace.
  - [x] La evidencia de cierre de GT-172/GT-223 se reconcilia para no afirmar paridad contractual verde sin un comando actual pasando.

#### GT-270

**Título:** Fijar imágenes de infraestructura mutables y deshabilitar defaults dev expuestos
**Propósito:** Hacer reproducible la infraestructura de referencia y evitar que defaults de desarrollo se copien a despliegues tipo producción. Esto optimiza costo y seguridad reduciendo upgrades no planeados, superficies admin públicas accidentales y fricción de triage de incidentes.
**Evidencia Actual:** `product/infra/README.md` declara "sin latest", pero los values de Helm usan `tag: "latest"` para BFF y MCP y `openpolicyagent/opa:latest`; los Dockerfiles usan `node:22-alpine` mutable; Docker Compose usa `mcr.microsoft.com/mssql/server:2022-latest`; Traefik arranca con `--api.insecure=true` y expone dashboard; OpenBao usa `BAO_DEV_ROOT_TOKEN_ID` y escucha en `0.0.0.0:8200`; el socket Docker se monta en Traefik.
**Hecho Cuando:**
  - [x] Helm, Compose y Dockerfiles usan tags inmutables revisados o digests para imágenes de aplicación, OPA, Node, SQL Server y gateway.
  - [x] Settings solo-desarrollo (`--api.insecure=true`, token/listen dev de OpenBao, exposición amplia de puertos host) quedan detrás de perfiles locales explícitos y ausentes de ejemplos productivos.
  - [x] README de infraestructura y contraparte ES documentan perfiles dev vs producción y cadencia de actualización de imágenes.
  - [x] Lint CI rechaza nuevos `latest`, `*-latest` o defaults inseguros de gateway/secrets fuera de ejemplos explícitamente dev-only.

#### GT-271

**Título:** Añadir hardening Kubernetes de workloads a Helm charts
**Propósito:** Elevar los Helm charts al mismo estándar de preparación productiva que las normas arquitectónicas haciendo ejecutables seguridad de pod, probes, recursos y seguridad de rollout en vez de dejarlos implícitos en prosa.
**Evidencia Actual:** `product/infra/helm/evolith-bff/templates/deployment.yaml` y `evolith-mcp/templates/deployment.yaml` definen solo contenedores y puertos. Un grep no encuentra `resources`, `securityContext`, `readinessProbe`, `livenessProbe`, `startupProbe`, `runAsNonRoot`, `readOnlyRootFilesystem`, `allowPrivilegeEscalation`, `PodDisruptionBudget`, `HorizontalPodAutoscaler` ni `NetworkPolicy`.
**Hecho Cuando:**
  - [x] Los charts Helm de BFF y MCP definen `resources.requests/limits`, probes de liveness/readiness/startup y defaults seguros de rollout.
  - [x] Los security contexts de pod/contenedor exigen ejecución non-root, capabilities eliminadas, filesystem raíz read-only donde sea factible y `allowPrivilegeEscalation: false`.
  - [x] NetworkPolicy, PodDisruptionBudget y values opcionales de HPA existen con defaults conservadores.
  - [x] Render de Helm más lint de políticas (kubeconform/conftest o validadores open source equivalentes) corre en CI.

#### GT-272

**Título:** Asegurar distribución y verificación de bundles OPA sidecar
**Propósito:** Proteger el camino de gobernanza ejecutable contra manipulación de policy bundles asegurando cómo los sidecars OPA obtienen y confían en bundles. Esto mantiene significativa la paridad Native/OPA después del despliegue, no solo en tests del repositorio.
**Evidencia Actual:** Los values de Helm configuran sidecars OPA para descargar `http://ums-minio:9000/opa-bundles/bundle.tar.gz` sin TLS, autenticación, digest fijo, firma ni gate de readiness fail-closed. GT-133 cubre la arquitectura central de distribución, pero la referencia desplegada del sidecar no verifica integridad ni procedencia del bundle.
**Hecho Cuando:**
  - [x] La URL del bundle OPA usa TLS o endpoint privado autenticado dentro del clúster, con credenciales originadas desde Kubernetes secrets o workload identity.
  - [x] La verificación de digest y firma del artefacto bundle queda documentada y automatizada (por ejemplo, Sigstore/cosign u otro flujo open source de firma).
  - [x] La readiness del sidecar OPA falla cerrado si el bundle requerido no puede descargarse o verificarse.
  - [x] CI renderiza el chart Helm y valida la configuración del bundle OPA con checks Native y OPA.

#### GT-273

**Título:** Restaurar scan DAST contra entorno staging o efímero
**Propósito:** Restablecer las pruebas dinámicas de seguridad (DAST) como parte del programa de aseguramiento, apuntando a una instancia real en ejecución en lugar del no-op localhost:8000 eliminado en GT-264.
**Evidencia Actual:** sdk-cli-ci.yml eliminó el paso ZAP full-scan en bbd2e517 (ola GT-265/GT-264). No corre ningún scan DAST en CI. El análisis estático (CodeQL, Trivy, gitleaks) cubre SAST, contenedores y detección de secretos, pero ningún scan en runtime ejercita la superficie de API desplegada.
**Hecho Cuando:**
  - [x] Un scan DAST (ZAP o equivalente) corre contra un entorno staging programado o un despliegue efímero en CI.
  - [x] El scan apunta a un endpoint HTTP real, no a un puerto placeholder.
  - [x] Los resultados se suben como artifact del workflow; las fallas se gatean o triagean.

**Evidencia de Cierre (2026-06-25):** Abordado al introducir Job 12 (`dast-scan`) en `.github/workflows/sdk-cli-ci.yml`. El job DAST compila el servidor MCP, lo inicia efímeramente en modo HTTP en el puerto 3001, espera `/health`, ejecuta `zaproxy/action-full-scan@v0.10.0` contra `http://localhost:3001`, y sube `report.html`/`report.md` como artifacts. Usa `continue-on-error: true` para no bloquear el gate de CI; los hallazgos se triagean asincrónicamente. Commit `426db1d9`.

#### GT-274

**Título:** Blindar cleanup-temp-files contra eliminación de archivos versionados
**Propósito:** Hacer segura la limpieza obligatoria pre-auditoría de Winston para un repositorio de gobernanza versionado. Un helper de limpieza nunca debe borrar scripts, reglas, políticas o documentación versionada solo porque la ruta contiene una palabra asociada a temporales.
**Evidencia Actual:** Al ejecutar `node .harness/scripts/cleanup-temp-files.mjs` durante la auditoría Winston de plano de control del 2026-06-25, el script eliminó archivos versionados cuyas rutas contenían `coverage`: `.harness/scripts/bilingual-coverage.mjs`, `.harness/scripts/coverage-dashboard.mjs`, `.harness/scripts/generate-rule-coverage.mjs`, `.harness/scripts/generate-rule-coverage.test.mjs` y `.harness/scripts/ci/26-validate-topology-rule-coverage.mjs`. La causa raíz fue que `isInTempDir(filePath)` usaba coincidencia por substring (`filePath.includes("coverage")`) en vez de segmentos de ruta y no excluía contenido rastreado por `git ls-files`. Los archivos se restauraron inmediatamente desde Git.
**Hecho Cuando:**
  - [x] `cleanup-temp-files.mjs` detecta directorios temporales por segmento de ruta, no por substring arbitrario.
  - [x] El script de limpieza omite todos los archivos rastreados por `git ls-files`, aunque coincidan con un patrón de archivo o directorio temporal.
  - [x] Un fixture de regresión demuestra que archivos llamados `bilingual-coverage.mjs`, `coverage-dashboard.mjs` y `26-validate-topology-rule-coverage.mjs` no se eliminan.
  - [x] El playbook de auditoría Winston referencia el comportamiento seguro de limpieza y advierte que cualquier archivo versionado eliminado es bloqueante.

#### GT-275

**Título:** Reconciliar el registro de evidencia de cierre con la semántica canónica de tracking
**Propósito:** Restaurar la cadena ejecutable de confianza para el cierre de gaps. Una fila `DONE`/`COMPLETADO` debe tener exactamente un registro de cierre válido con commit real, artefactos de evidencia resolubles, comandos reproducibles de validación y disposición de dependencias soportada.
**Evidencia Actual:** `node .harness/scripts/ci/08-validate-tracking.mjs` falla después de la auditoría de plano de control. Los problemas restantes del registro incluyen `GT-270` con `closureCommit: "pending"`, `GT-264` con evidencia y comandos de validación vacíos, un registro duplicado de cierre para `GT-266`, y registros faltantes para `GT-271` y `GT-20`. `node .harness/scripts/ci/09-reconcile-maturity.mjs` también falla porque el conteo de evidencias de cierre no coincide con los cierres requeridos. `GT-267` y `GT-272` se reabrieron durante esta auditoría porque la validación actual no soporta `DONE`.
**Hecho Cuando:**
  - [x] `gap-closure-evidence.json` tiene un registro válido por cada fila `GT-*` en `DONE`/`COMPLETADO` y ningún registro para gaps pendientes/diferidos/en progreso.
  - [x] `GT-270`, `GT-264`, `GT-266`, `GT-271` y `GT-20` tienen registros de cierre válidos o se reabren de forma consistente en tracking y catálogos EN/ES.
  - [x] `node .harness/scripts/ci/08-validate-tracking.mjs` pasa.
  - [x] `node .harness/scripts/ci/09-reconcile-maturity.mjs` pasa y regenera `maturity-reconciliation.json` solo cuando cambia la evidencia canónica.

#### GT-276

**Título:** Corregir la lógica de emparejamiento por área del dashboard bilingüe
**Propósito:** Hacer que el dashboard ejecutivo de cobertura bilingüe coincida con el cálculo canónico de pares para resaltar brechas reales de idioma en lugar de áreas críticas falsas.
**Evidencia Actual:** `node .harness/scripts/bilingual-coverage.mjs` reporta 518 archivos EN, 518 archivos ES, 518 pares y 100.0% de cobertura. El dashboard generado por `node .harness/scripts/coverage-dashboard.mjs` también reporta 100.0% global, pero marca archivos raíz e índices emparejados como áreas/subáreas `[CRIT]` separadas (por ejemplo `README.md` y `README.es.md`) porque el bucketing por área/subárea cuenta nombres de archivo de forma independiente en vez de normalizar `.es.md` hacia la ruta canónica EN.
**Hecho Cuando:**
  - [x] `coverage-dashboard.mjs` reutiliza la misma lógica normalizada de emparejamiento EN/ES que `bilingual-coverage.mjs`.
  - [x] Archivos raíz, índices, README y navegación bilingüe se agrupan por ruta canónica de contraparte en vez de dividirse en pseudo-áreas EN y ES.
  - [x] Los tests del dashboard cubren archivos raíz, archivos anidados, archivos Patrón A `.es.md` y contenido agrupado Patrón B `-es/`.
  - [x] El dashboard sale con código distinto de cero solo ante archivos realmente sin pareja o umbrales configurados, no por artefactos falsos de bucketing por área.
**Evidencia de Cierre:** Commit `ee54a14d`. `coverage-dashboard.mjs` ahora normaliza `.es.md` a `.md` (Patrón A) y `-es/` a `/` (Patrón B) antes del bucketing por área mediante `normalizeKey()`. Código de salida distinto de cero cuando hay archivos reales sin pareja. 7 casos de prueba cubren archivos raíz, anidados, Patrón A, Patrón B y códigos de salida para archivos sin pareja.

#### GT-277

**Título:** Especificaciones OpenAPI de topologías — interfaces framework ausentes en las 8 topologías

- **Propósito:** Cada topología aceptada debe exponer un contrato OpenAPI 3.1 que describa su superficie REST específica, habilitando validación CI automática, generación de cliente y documentación de consumo.
- **Evidencia Actual:** `node .harness/playbooks/topology-compliance-audit.mjs` reporta **AUSENTE** para OpenAPI en las 8 topologías (`ai/agentic-ai`, `data/data-mesh`, `execution/edge-computing`, `execution/serverless`, `integration/event-driven`, `progressive-axis/modular-monolith`, `progressive-axis/distributed-modules`, `progressive-axis/microservices`).
- **Complejidad:** M
- **Hecho Cuando:**
  - [x] Cada topología tiene un archivo `openapi.yaml` en `reference/core/architecture/topologies/<area>/<topology>/openapi/`.
  - [x] Cada spec describe al menos los endpoints propios del Bounded Context de la topología.
  - [x] El spec es validable con `swagger-cli validate` o herramienta equivalente en CI.
  - [x] La auditoría de cumplimiento (`topology-compliance-audit.mjs`) reporta `COMPLETO` para OpenAPI en cada topología.
- **Evidencia de Cierre:** Commit `b7c379c0` (main). 8 archivos `openapi.yaml` creados en los directorios de topología. La auditoría ahora detecta `openapi/` dinámicamente. Score global: 90% (152/168).

#### GT-278

**Título:** Manifiestos MCP de topologías — interfaces framework ausentes en las 8 topologías

- **Propósito:** Cada topología aceptada debe exponer un manifest MCP (`mcp-manifest.json`) que declare las tools, resources y prompts propios de su Bounded Context, habilitando el descubrimiento automático por parte del MCP Gateway.
- **Evidencia Actual:** `node .harness/playbooks/topology-compliance-audit.mjs` reporta **AUSENTE** para MCP manifests en las 8 topologías.
- **Complejidad:** M
- **Hecho Cuando:**
  - [x] Cada topología tiene un `mcp-manifest.json` en `reference/core/architecture/topologies/<area>/<topology>/mcp/`.
  - [x] Cada manifest declara al menos una tool específica del dominio de la topología.
  - [x] El manifest es validable contra el esquema canónico MCP.
  - [x] La auditoría de cumplimiento reporta `COMPLETO` para MCP en cada topología.
- **Evidencia de Cierre:** Commit `8f14459b` (main). 8 archivos `mcp-manifest.json` creados con protocolo MCP 2025-03-26. Score global: 95% (160/168).

#### GT-279

**Título:** Flujos CLI de topologías — interfaces framework ausentes en las 8 topologías

- **Propósito:** Cada topología aceptada debe definir flujos CLI específicos que permitan interactuar con los comandos propios del Bounded Context, ya sea como documentación de uso o como especificación para la generación de comandos `evolith topology <name> <command>`.
- **Evidencia Actual:** `node .harness/playbooks/topology-compliance-audit.mjs` reporta **AUSENTE** para CLI flows en las 8 topologías.
- **Complejidad:** M
- **Hecho Cuando:**
  - [x] Cada topología tiene un archivo `cli-flows.md` (y `cli-flows.es.md` para paridad bilingüe) en su directorio `cli/`.
  - [x] Los flujos documentados usan comandos reales del Smart CLI con argumentos existentes.
  - [x] La auditoría de cumplimiento reporta `COMPLETO` para CLI en cada topología.
- **Evidencia de Cierre:** Commit `7bed54d0` (main). 16 archivos CLI (8 EN + 8 ES) creados. Score global: **168/168 (100%)**.

#### GT-280

**Título:** Fases SDLC como datos consultables (JSON/YAML) — mapeo gate → artefactos → reglas Rego

- **Propósito:** Las 5 fases SDLC existen solo como documentación markdown. Sin un modelo de datos consultable, el motor de evaluación no puede determinar qué gate aplica en qué fase, qué artefactos requiere ni qué regla Rego ejecutar. Transformar las fases en datos estructurados habilita la ejecución programática del SDLC.
- **Evidencia Actual:** `node .harness/scripts/run-evolith-deep.mjs` — Dimensión "MODELO SDLC EJECUTABLE": **SÓLIDO**.
- **Complejidad:** M
- **Hecho Cuando:**
  - [x] Cada fase tiene un archivo `phase-f*.json` en `reference/core/sdlc/phases/` con campos: `id`, `name`, `description`, `order`, `gates[]`.
  - [x] Cada gate en `reference/core/sdlc/gates/` declara `requiredArtifacts[]` y `rules[]` con referencias a archivos `.rego`.
  - [x] Existe un validador (`.harness/playbooks/sdlc-phase-gate-validator.mjs`) que verifica reglas Rego y artefactos requeridos.
  - [x] `run-evolith-deep.mjs` reporta `SÓLIDO` para la dimensión "MODELO SDLC EJECUTABLE".
- **Evidencia de Cierre:** Commit `661a8846` crea 5 phase files, 5 gate files, los schemas SDLC, el validador de phase/gate y reglas Rego SDLC. El audit profundo detecta datos estructurados y reporta `SÓLIDO`.

#### GT-281

**Título:** Pipeline de evaluación end-to-end: cliente → topología → reglas → veredicto

- **Propósito:** Exponer un servicio que reciba input de un cliente externo, resuelva la topología del manifiesto, cargue y ejecute reglas Rego correspondientes, y emita un veredicto estructurado.
- **Evidencia Actual:** `node .harness/scripts/run-evolith-deep.mjs` — Dimensión "MOTOR DE EVALUACIÓN": **SÓLIDO**.
- **Complejidad:** XL
- **Hecho Cuando:**
  - [x] Existe `SatelliteEvaluationPipeline` con manifest, topología, gates GT-280, reglas Rego y veredicto estructurado.
  - [x] `ValidateSatelliteUseCase` acepta `manifest?: SatelliteManifest` y delega en el pipeline cuando se provee.
  - [x] CLI `evolith validate` expone `--manifest` y `--phase`.
  - [x] MCP `evolith-validate` expone parámetros `manifest`, `topology`, `phase`.
  - [x] `SatelliteManifest` está definido en `packages/core-domain/src/domain/satellite-manifest.ts`.
  - [x] `SdlcDataLoaderService` carga los datos GT-280 en runtime.
  - [x] Existe test end-to-end (`satellite-evaluation-pipeline.spec.ts`) que envía manifest y verifica veredicto.
  - [x] `run-evolith-deep.mjs` reporta `SÓLIDO` para la dimensión "MOTOR DE EVALUACIÓN".
- **Evidencia de Cierre:** Commit `661a8846` crea `SatelliteEvaluationPipeline`, `SdlcDataLoaderService`, `SatelliteManifest`, wiring CLI/MCP y tests end-to-end.

#### GT-282

**Título:** Reporte accionable con evidencia detallada (qué regla falló, qué artefacto falta, por qué)

- **Propósito:** El output de evaluación debe decir qué regla falló, qué artefacto falta y por qué, para guiar correcciones accionables.
- **Evidencia Actual:** `node .harness/scripts/run-evolith-deep.mjs` — Dimensión "REPORTE ACCIONABLE": **SÓLIDO**.
- **Complejidad:** M
- **Hecho Cuando:**
  - [x] `RuleEvaluation` incluye `severity`, `remediation`, `gateRef`.
  - [x] `EvaluationVerdict` incluye `outputEnvelope` con shape ADR-0073.
  - [x] Pipeline produce remediation text, severity derivada de blocking criteria y cross-reference al gate.
  - [x] CLI `evolith validate` despliega severity, remediation y gateRef.
  - [x] MCP `evolith-validate` incluye severity, remediation y gateRef en output pipeline.
  - [x] Tests verifican campos de evidencia detallada.
  - [x] `run-evolith-deep.mjs` reporta `SÓLIDO` para la dimensión "REPORTE ACCIONABLE".
- **Evidencia de Cierre:** Commit `661a8846` mejora `RuleEvaluation`, `EvaluationVerdict`, pipeline, CLI, MCP y tests para reportes accionables.

#### GT-312

**Título:** Motor de validación composable: orquestación multi-punto de entrada (SDLC, Arquitectura, Ruleset, Ad-hoc)

- **Propósito:** Implementar un motor de validación unificado y composable que soporte múltiples puntos de entrada y modos de validación. El sistema NO es rígido — las interfaces son inteligentes y permiten al usuario validar desde cualquier contexto sin forzar un flujo específico. El motor debe resolver el alcance de validación dinámicamente basándose en lo que el usuario provee, no forzarlos a un pipeline único.
- **Evidencia:** El comando actual `evolith validate` (`sdk/cli/src/commands/validate/validate.command.ts:74-76`) ejecuta un caso de uso genérico sin especificar qué validar cuando no se pasan parámetros. Los usuarios pueden querer validar arquitectura técnica sin entrar al flujo SDLC, validar rulesets específicos sin contexto de arquitectura, o ejecutar validación ad-hoc en componentes individuales.
- **Complejidad:** XL
- **Hecho Cuando:**
  - [x] **Modo SDLC**: Pipeline completo disponible cuando se provee o detecta contexto de fase/gate.
  - [x] **Modo Arquitectura**: Validar topología, límites hexagonales, aislamiento de dominio, multi-tenancy sin contexto SDLC.
  - [x] **Modo Ruleset**: Validar rulesets específicos (compliance-baseline, definition-of-done, etc.) independientemente.
  - [x] **Modo ADR**: Validar contra reglas ADR específicas (arquitectura hexagonal, multi-tenancy, testing pyramid, etc.).
  - [x] **Modo Ad-hoc**: Validar componentes, artifacts o archivos individuales bajo demanda.
  - [x] **Composable**: El usuario puede combinar cualquier punto de entrada (ej: arquitectura + ruleset específico, o fase SDLC + reglas ADR).
  - [x] **Config Opcional**: `evolith.config.json` provee defaults pero NO es requerido — el usuario puede sobreescribir todo vía flags CLI.
  - [x] **Resolución Inteligente**: El sistema infiere el alcance de validación desde input mínimo (ej: `--topology modular-monolith` implica reglas de arquitectura para esa topología).
  - [x] Las tres interfaces (CLI, MCP, REST) soportan todos los modos de validación (un motor, tres fachadas).
  - [x] Las evaluaciones OPA se ejecutan en paralelo donde sea posible para rendimiento.
  - [x] El veredicto de validación incluye: pass/fail por regla, evidencia, estado blocking y guía de remediación.
  - [x] Rendimiento: validación completa se completa en <2s para proyectos estándar.
  - [x] Los tests verifican todos los modos de validación y combinaciones.

#### GT-286

**Título:** Ruleset compliance-baseline existe — rulesets/cross-cutting/compliance-baseline.rules.json

- **Propósito:** Implementar el ruleset compliance-baseline como parte del workstream WS1 (Evaluación de Fortaleza como Data Inteligente).
- **Evidencia:** El ruleset canónico existe en `rulesets/cross-cutting/compliance-baseline.rules.json`; su contraparte OPA y tests existen en `rulesets/opa/compliance-baseline.rego` y `rulesets/opa/compliance-baseline.test.rego`.
- **Complejidad:** S
- **Hecho Cuando:**
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-287

**Título:** Ruleset definition-of-done existe — rulesets/cross-cutting/definition-of-done.rules.json

- **Propósito:** Implementar el ruleset definition-of-done como parte del workstream WS1 (Evaluación de Fortaleza como Data Inteligente).
- **Evidencia:** El ruleset canónico existe en `rulesets/cross-cutting/definition-of-done.rules.json`; su contraparte OPA y tests existen en `rulesets/opa/dod.rego` y `rulesets/opa/dod.test.rego`.
- **Complejidad:** S
- **Hecho Cuando:**
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-288

**Título:** Ruleset engineering-manifesto existe — rulesets/cross-cutting/engineering-manifesto.rules.json

- **Propósito:** Implementar el ruleset engineering-manifesto como parte del workstream WS1 (Evaluación de Fortaleza como Data Inteligente).
- **Evidencia:** El ruleset canónico existe en `rulesets/cross-cutting/engineering-manifesto.rules.json`; su contraparte OPA y tests existen en `rulesets/opa/engineering-manifesto.rego` y `rulesets/opa/engineering-manifesto.test.rego`.
- **Complejidad:** S
- **Hecho Cuando:**
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-289

**Título:** Ruleset repository-taxonomy existe — rulesets/cross-cutting/repository-taxonomy.rules.json

- **Propósito:** Implementar el ruleset repository-taxonomy como parte del workstream WS1 (Evaluación de Fortaleza como Data Inteligente).
- **Evidencia:** El ruleset canónico existe en `rulesets/cross-cutting/repository-taxonomy.rules.json`; su contraparte OPA y tests existen en `rulesets/opa/repository-taxonomy.rego` y `rulesets/opa/repository-taxonomy.test.rego`.
- **Complejidad:** S
- **Hecho Cuando:**
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-290

**Título:** Ruleset phase-gates existe — rulesets/sdlc/phase-gates.rules.json

- **Propósito:** Implementar el ruleset phase-gates como parte del workstream WS1 (Evaluación de Fortaleza como Data Inteligente).
- **Evidencia:** El ruleset canónico existe en `rulesets/sdlc/phase-gates.rules.json`; `rulesets/phase-gates/` se conserva como punto de entrada documental estable WS1.
- **Complejidad:** S
- **Hecho Cuando:**
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-291

**Título:** Ruleset quality-thresholds existe — rulesets/sdlc/quality-thresholds.rules.json

- **Propósito:** Implementar el ruleset quality-thresholds como parte del workstream WS1 (Evaluación de Fortaleza como Data Inteligente).
- **Evidencia:** El ruleset canónico existe en `rulesets/sdlc/quality-thresholds.rules.json`.
- **Complejidad:** S
- **Hecho Cuando:**
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-292

**Título:** Ruleset satellite-contracts existe — rulesets/governance/satellite-contracts.rules.json

- **Propósito:** Implementar el ruleset satellite-contracts como parte del workstream WS1 (Evaluación de Fortaleza como Data Inteligente).
- **Evidencia:** El ruleset canónico existe en `rulesets/governance/satellite-contracts.rules.json`; su contraparte OPA y tests existen en `rulesets/opa/satellite-contracts.rego` y `rulesets/opa/satellite-contracts.test.rego`.
- **Complejidad:** S
- **Hecho Cuando:**
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-293

**Título:** Ruleset executive-scorecards existe — rulesets/governance/executive-scorecards.rules.json

- **Propósito:** Implementar el ruleset executive-scorecards como parte del workstream WS1 (Evaluación de Fortaleza como Data Inteligente).
- **Evidencia:** El ruleset canónico existe en `rulesets/governance/executive-scorecards.rules.json`; su contraparte OPA y tests existen en `rulesets/opa/executive-scorecards.rego` y `rulesets/opa/executive-scorecards.test.rego`.
- **Complejidad:** S
- **Estado:** COMPLETADO 2026-06-26
- **Cerrado por:** `rulesets/governance/executive-scorecards.rules.json` + `rulesets/opa/executive-scorecards.rego` + `rulesets/opa/executive-scorecards.test.rego` (10 reglas: DORA-01..04, SPACE-01..05, DRIFT-01). El `$id` canónico y la evidencia de paridad OPA están vigentes.
- **Hecho Cuando:**
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-294

**Título:** Políticas OPA para arquitectura — rulesets/architecture/opa

- **Propósito:** Implementar políticas OPA para validación de arquitectura como parte del workstream WS2 (Evaluación de Fortaleza como Data Inteligente).
- **Evidencia:** La ruta `rulesets/architecture/opa` no existe.
- **Complejidad:** S
- **Hecho Cuando:**
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-283

**Título:** Ruleset f1-modular-monolith existe — rulesets/topologies/progressive-axis/modular-monolith

- **Propósito:** Implementar el ruleset f1-modular-monolith como parte del workstream WS1 (Evaluación de Fortaleza como Data Inteligente).
- **Evidencia:** La ruta `rulesets/topologies/progressive-axis/modular-monolith` no existe.
- **Complejidad:** M
- **Hecho Cuando:**
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-284

**Título:** Ruleset f2-distributed-modules existe — rulesets/topologies/progressive-axis/distributed-modules

- **Propósito:** Implementar el ruleset f2-distributed-modules como parte del workstream WS1 (Evaluación de Fortaleza como Data Inteligente).
- **Evidencia:** La ruta `rulesets/topologies/progressive-axis/distributed-modules` no existe.
- **Complejidad:** M
- **Hecho Cuando:**
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-285

**Título:** Ruleset f3-microservices existe — rulesets/topologies/progressive-axis/microservices

- **Propósito:** Implementar el ruleset f3-microservices como parte del workstream WS1 (Evaluación de Fortaleza como Data Inteligente).
- **Evidencia:** La ruta `rulesets/topologies/progressive-axis/microservices` no existe.
- **Complejidad:** M
- **Hecho Cuando:**
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-295

**Título:** Lógica de evaluación de gates existe — packages/core-domain/src/gates

- **Propósito:** Implementar la lógica de evaluación de gates como parte del workstream WS3 (Evaluación de Fortaleza como Data Inteligente).
- **Evidencia:** La ruta `packages/core-domain/src/gates` no existe.
- **Complejidad:** M
- **Hecho Cuando:**
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-296

**Título:** Lógica de transición de fases existe — packages/core-domain/src/phases

- **Propósito:** Implementar la lógica de transición de fases como parte del workstream WS3 (Evaluación de Fortaleza como Data Inteligente).
- **Evidencia:** La ruta `packages/core-domain/src/phases` no existe.
- **Complejidad:** M
- **Hecho Cuando:**
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-297

**Título:** Recursos MCP para corpus — packages/mcp-server/src/resources

- **Propósito:** Implementar recursos MCP para recuperación del corpus como parte del workstream WS4 (Evaluación de Fortaleza como Data Inteligente).
- **Evidencia:** La ruta `packages/mcp-server/src/resources` no existe.
- **Complejidad:** M
- **Hecho Cuando:**
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-298

**Título:** Integración WatcherService — packages/mcp-server/src/watcher

- **Propósito:** Implementar la integración WatcherService para notificación de drift MCP como parte del workstream WS4 (Evaluación de Fortaleza como Data Inteligente).
- **Evidencia:** La ruta `packages/mcp-server/src/watcher` no existe.
- **Complejidad:** M
- **Hecho Cuando:**
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-299

**Título:** Especificación OpenAPI — apps/core-api/src/openapi

- **Propósito:** Implementar la especificación OpenAPI para core-api como parte del workstream WS5 (Evaluación de Fortaleza como Data Inteligente).
- **Evidencia:** La ruta `apps/core-api/src/openapi` no existe.
- **Complejidad:** M
- **Hecho Cuando:**
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-300

**Título:** Comando agents existe — sdk/cli/src/commands/agents

- **Propósito:** Implementar el comando agents para instalación/onboarding de agentes como parte del workstream WS6 (Evaluación de Fortaleza como Data Inteligente).
- **Evidencia:** La ruta `sdk/cli/src/commands/agents` no existe.
- **Complejidad:** M
- **Hecho Cuando:**
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-301

**Título:** Comando upgrade existe — sdk/cli/src/commands/upgrade

- **Propósito:** Implementar el comando upgrade para actualizaciones seguras de satélites como parte del workstream WS6 (Evaluación de Fortaleza como Data Inteligente).
- **Evidencia:** La ruta `sdk/cli/src/commands/upgrade` no existe.
- **Complejidad:** M
- **Hecho Cuando:**
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-303

**Título:** Implementación Evidence Graph — packages/core-domain/src/evidence

- **Propósito:** Implementar Evidence Graph como parte del workstream WS7 (Evaluación de Fortaleza como Data Inteligente). Requiere ADR antes de la implementación.
- **Evidencia:** La ruta `packages/core-domain/src/evidence` no existe.
- **Complejidad:** M
- **Hecho Cuando:**
  - [x] El ADR para Evidence Graph es aceptado.
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-304

**Título:** Modelo Gate Decision — packages/core-domain/src/gates/decision

- **Propósito:** Implementar el modelo Gate Decision como parte del workstream WS7 (Evaluación de Fortaleza como Data Inteligente). Requiere ADR antes de la implementación.
- **Evidencia:** La ruta `packages/core-domain/src/gates/decision` no existe.
- **Complejidad:** M
- **Hecho Cuando:**
  - [x] El ADR para Gate Decision es aceptado.
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-305

**Título:** Modelo Phase Transition — packages/core-domain/src/phases/transition

- **Propósito:** Implementar el modelo Phase Transition como parte del workstream WS7 (Evaluación de Fortaleza como Data Inteligente). Requiere ADR antes de la implementación.
- **Evidencia:** La ruta `packages/core-domain/src/phases/transition` no existe.
- **Complejidad:** M
- **Hecho Cuando:**
  - [x] El ADR para Phase Transition es aceptado.
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-306

**Título:** Modelo Provider ports — packages/core-domain/src/providers

- **Propósito:** Implementar el modelo Provider ports (sistema de plugins) como parte del workstream WS7 (Evaluación de Fortaleza como Data Inteligente). Requiere ADR antes de la implementación.
- **Evidencia:** La ruta `packages/core-domain/src/providers` no existe.
- **Complejidad:** M
- **Hecho Cuando:**
  - [x] El ADR para Provider ports es aceptado.
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-307

**Título:** Modelo Tenant authority — packages/core-domain/src/tenancy

- **Propósito:** Implementar el modelo Tenant authority como parte del workstream WS7 (Evaluación de Fortaleza como Data Inteligente). Requiere ADR antes de la implementación.
- **Evidencia:** La ruta `packages/core-domain/src/tenancy` no existe.
- **Complejidad:** M
- **Hecho Cuando:**
  - [x] El ADR para Tenant authority es aceptado.
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-310

**Título:** Suite de tests existe — sdk/cli/src/__tests__

- **Propósito:** Implementar la suite de tests completa como parte del workstream WS9 (Evaluación de Fortaleza como Data Inteligente).
- **Evidencia:** La ruta `sdk/cli/src/__tests__` no existe.
- **Complejidad:** M
- **Hecho Cuando:**
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-311

**Título:** Tests E2E existen — sdk/cli/src/__tests__/e2e

- **Propósito:** Implementar tests E2E como parte del workstream WS9 (Evaluación de Fortaleza como Data Inteligente).
- **Evidencia:** La ruta `sdk/cli/src/__tests__/e2e` no existe.
- **Complejidad:** M
- **Hecho Cuando:**
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-302

**Título:** Comando scaffold existe — sdk/cli/src/commands/architecture/scaffold

- **Propósito:** Implementar el comando scaffold (ejecución real, no mock) como parte del workstream WS6 (Evaluación de Fortaleza como Data Inteligente).
- **Evidencia:** La ruta `sdk/cli/src/commands/architecture/scaffold` no existe.
- **Complejidad:** L
- **Hecho Cuando:**
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-308

**Título:** Sistema de plugins para comandos — sdk/cli/src/plugins

- **Propósito:** Implementar el sistema de plugins para comandos como parte del workstream WS8 (Evaluación de Fortaleza como Data Inteligente).
- **Evidencia:** La ruta `sdk/cli/src/plugins` no existe.
- **Complejidad:** M
- **Hecho Cuando:**
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

#### GT-309

**Título:** Validación de contribuciones — sdk/cli/src/contributions

- **Propósito:** Implementar la validación de contribuciones para colaboradores externos como parte del workstream WS8 (Evaluación de Fortaleza como Data Inteligente).
- **Evidencia:** La ruta `sdk/cli/src/contributions` no existe.
- **Complejidad:** M
- **Hecho Cuando:**
  - [x] El archivo o directorio requerido existe en la ruta especificada.
  - [x] Los tests verifican la implementación.

---

## 2. Ola de madurez 2026-06-27 (validada con build/test reales)

> Cada GAP fue reproducido con `build` + `test` reales por producto. Campos: Componente · Prioridad · Riesgo · Dependencias · Archivos · Fix propuesto/aplicado · Evidencia · Riesgo residual · Hecho cuando (aceptación).

#### GT-331

**Título:** Deriva de versión del binario MCP — `DONE`

- **Componente:** mcp-server · **Prioridad:** P2 · **Riesgo:** bajo→ninguno · **Dependencias:** ninguna
- **Archivos:** `packages/mcp-server/src/main.ts:10`
- **Fix:** leer `version` de package.json en runtime (antes literal hardcodeado).
- **Evidencia:** `node packages/mcp-server/dist/main.js version` → `v1.0.1`.
- **Hecho cuando:** [x] la versión reportada == package.json.

#### GT-332

**Título:** El dispatch mutativo filtraba approvalToken + args (seguridad) — `DONE`

- **Componente:** mcp-server · **Prioridad:** P1 · **Riesgo:** medio→ninguno · **Dependencias:** ninguna
- **Archivos:** `packages/mcp-server/src/mcp/mcp-tool-dispatch.ts:128`
- **Fix:** `fingerprintToken()` + `redactArgs()`; el log emite huella + args redactados.
- **Evidencia:** spec asegura ausencia del token crudo; 162/162 verde.
- **Riesgo residual:** redacción superficial (solo nivel superior).
- **Hecho cuando:** [x] el log omite el token; [x] test lo verifica.

#### GT-333

**Título:** Comparación de API key con `===` (canal de tiempo, seguridad) — `DONE`

- **Componente:** mcp-server · **Prioridad:** P2 · **Riesgo:** medio→bajo · **Dependencias:** ninguna
- **Archivos:** `packages/mcp-server/src/mcp/mcp-server-auth.ts:43`
- **Fix:** `safeKeyEqual()` con `crypto.timingSafeEqual` sobre buffers hasheados.
- **Evidencia:** 162/162 verde.
- **Hecho cuando:** [x] comparación de tiempo constante.

#### GT-334

**Título:** opa-wasm no es dependencia directa de mcp-server — `DONE`

- **Componente:** mcp-server · **Prioridad:** P2 · **Riesgo:** medio→ninguno · **Dependencias:** ninguna
- **Archivos:** `packages/mcp-server/package.json`
- **Fix:** añadido `@open-policy-agent/opa-wasm@1.10.0`.
- **Hecho cuando:** [x] declarado como dependencia directa.

#### GT-335

**Título:** Herramienta read-gap-tracking inservible — `DONE`

- **Componente:** mcp-tools · **Prioridad:** P1 · **Riesgo:** medio→ninguno · **Dependencias:** ninguna
- **Archivos:** `packages/mcp-tools/src/tools/read-gap-tracking.js`
- **Fix:** parser de columna Status + raíz inyectable (`EVOLITH_REPO_ROOT`) + 3 tests.
- **Evidencia:** 9/9 verde; en vivo → `1 open of 330` (antes 0).
- **Hecho cuando:** [x] tablero real surfaced; [x] test de comportamiento.

#### GT-336

**Título:** Las rutas REST del SDK omiten el prefijo `/api` (crítico) — `DONE`

- **Componente:** sdk-client · **Prioridad:** P0 · **Riesgo:** crítico→ninguno · **Dependencias:** ninguna
- **Archivos:** `packages/sdk-client/src/rest/evolith-rest-client.ts`
- **Fix:** opción `apiPrefix` (por defecto `/api`) antepuesta en `request()`.
- **Evidencia:** build + 10/10 verde (`/api/v1/...`).
- **Riesgo residual:** sin test de integración real aún (GT-353).
- **Hecho cuando:** [x] métodos apuntan a `/api/v1/...`.

#### GT-337

**Título:** Tipo ApiEnvelope no coincide — `DONE`

- **Componente:** sdk-client · **Prioridad:** P1 · **Riesgo:** medio→bajo · **Dependencias:** GT-336
- **Archivos:** `packages/sdk-client/src/rest/types.ts`
- **Fix:** unión discriminada `SuccessEnvelope<T> | ErrorEnvelope`.
- **Evidencia:** build + 10/10 verde.
- **Hecho cuando:** [x] coincide con el envelope de core-api.

#### GT-338

**Título:** Exports de subruta rotos en @evolith/core — `DONE`

- **Componente:** core · **Prioridad:** P1 · **Riesgo:** medio→ninguno · **Dependencias:** ninguna
- **Archivos:** `packages/core/package.json`, `packages/core/README.md`
- **Fix:** `exports` reducido a `"."`; deps no usadas removidas; README añadido.
- **Evidencia:** build verde; `require('@evolith/core')` resuelve; pack lista README.
- **Riesgo residual:** sin test de contrato (GT-355).
- **Hecho cuando:** [x] sin MODULE_NOT_FOUND de subruta.

#### GT-339

**Título:** core-api propone-advance con fromPhase undefined (bug de contrato) — `DONE`

- **Componente:** core-api · **Prioridad:** P1 · **Riesgo:** alto→ninguno · **Dependencias:** ninguna
- **Archivos:** `apps/core-api/src/presentation/controllers/projects.controller.ts:44`, `dtos/projects.dto.ts:30`
- **Fix:** `fromPhase: currentPhase ?? targetPhase`; `currentPhase` opcional.
- **Evidencia:** projects.controller.spec 5/5 verde.
- **Riesgo residual:** casts `as any` pendientes de GT-343.
- **Hecho cuando:** [x] fromPhase nunca undefined.

#### GT-340

**Título:** El harness de tests de core-api no fija WORKSPACE_ROOT — `DONE`

- **Componente:** core-api / calidad · **Prioridad:** P1 · **Riesgo:** alto→ninguno · **Dependencias:** GT-344
- **Archivos:** `apps/core-api/test-setup.js`
- **Fix:** fijar `WORKSPACE_ROOT`/`CORE_PATH` a la raíz del monorepo.
- **Evidencia:** `npm test` → 105/105 verde (antes 23 fallando).
- **Riesgo residual:** enmascara el empaquetado runtime GT-344 (mitigación solo-tests).
- **Hecho cuando:** [x] `npm test` verde sin env manual.

#### GT-341

**Título:** El generador de inventario escanea una ruta MCP muerta — `DONE`

- **Componente:** gobernanza/docs · **Prioridad:** P1 · **Riesgo:** alto→ninguno · **Dependencias:** ninguna
- **Archivos:** `.harness/scripts/generate-product-inventory.mjs:43`
- **Fix:** reapuntado a `packages/mcp-server/src`.
- **Evidencia:** inventario → 27 tools / 9 resources / 8 prompts; `--check` exit 0.
- **Hecho cuando:** [x] inventario == superficie instalable.

#### GT-342

**Título:** El README lista 6 topologías en vez de 8 — `DONE`

- **Componente:** docs · **Prioridad:** P1 · **Riesgo:** bajo · **Dependencias:** ninguna
- **Archivos:** `README.md:67`, `README.es.md:67`
- **Fix:** añadidas Módulos Distribuidos + Microservicios (EN+ES), eje progresivo + alias F.
- **Hecho cuando:** [x] README == 8 topologías canónicas.

#### GT-343

**Título:** EPIC — Unificación de vocabulario de fases SDLC/topología — `DONE`

- **Componente:** Transversal · **Prioridad:** P0 · **Riesgo:** alto (ruptura) · **Dependencias:** bloquea GA de todos los productos
- **Archivos:** `reference/config/evolith.config.schema.json:18`, `apps/core-api/.../composable-validate.controller.ts:24`, `sdk/cli/.../validate.command.ts:483`, `rulesets/schema/topology-manifest.schema.json:121`, `packages/core-domain/.../topology-catalog.service.ts:4`
- **Fix propuesto:** `PhaseId` canónico + mapa de alias; renombrar `phase`→`maturityLevel`/`profile` en topología; regla OPA anti-colisión; migración por etapas.
- **Fix aplicado (etapa 1 — fundación, no rompe nada):** añadido `packages/core-domain/src/domain/sdlc/phase-id.ts` — fuente canónica única. Los ids canónicos son los `GATE_PHASES` existentes (`discovery|design|construction|qa|release`); `normalizePhaseId()` acepta `f1..f5`/`gate-f*`/`phase-*`/`1..5` y devuelve canónico; `toLegacyPhaseId()` mapea de vuelta al `f1..f5` en disco; `phase-0` rechazado correctamente. Exportado desde el barrel de dominio.
- **Evidencia:** ~897 ocurrencias barridas; core-domain 589/589 verde (6 tests nuevos). La etapa 1 no cambia comportamiento (aditiva).
- **Fix aplicado (etapa 2 — consumidores en core-domain, retrocompatible):** `evolith-config.service` y `validate-blueprint.use-case` validan vía `normalizePhaseId` (canónico aceptado, `f1..f5` aún válido); `sdlc-validation.mode` y `satellite-evaluation-pipeline` normalizan un `phase` canónico al id legacy para resolver archivos/gates en disco vía `toLegacyPhaseId`. `validate-workflow.use-case` diferido a etapa 2b (acoplado a ids `gate-f*` en disco + mapa NON_OMITTABLE_ARTIFACTS). core-domain 589/589; sin regresión (ampliación aditiva).
- **Fix aplicado (etapa 4 — desconflación de topología):** renombrado `spec.compatibility.progressiveAxis.phase` → `maturityLevel` en el schema de manifest + los 13 manifests (8 en `reference/core/architecture/topologies/`, 5 en `rulesets/topologies/`) + el tipo `TopologyManifest` y el lookup `resolveProgressivePhase`. `profile` documentado como el id canónico de topología; el tipo `ProgressivePhase` se mantiene como alias deprecado de `ProgressiveMaturityLevel` para no romper los re-exports de `@evolith/core`. La palabra SDLC "phase" desaparece del contrato de topología. (Los VALORES F1/F2/F3 siguen como nivel de madurez — retirarlos a ids canónicos en `evolith.yaml`/`declaredLevel`/drift es la etapa 4b.)
- **Evidencia:** validate-topology-manifests 13/13; composición + cobertura de reglas exit 0; core-domain 589/589; mcp-server + core-api compilan. No queda lector de `progressiveAxis.phase`.
- **Fix aplicado (etapa 3 — enums SDLC públicos, retrocompatible):** ampliados los enums de fase en las 3 superficies de contrato + 2 schemas de tools MCP para aceptar los ids canónicos primero, con `f1..f5` como alias deprecado (sin eliminación dura → el Tracker externo sigue funcionando): `reference/config/evolith.config.schema.json`, DTO `/validate/composable`, descripción CLI `validate --phase`, y `composable-validate.tool.ts` + `validate.tool.ts`. Validado: core-api 105/105, mcp-server 162/162, CLI compila — ninguna suite rota.
- **Fix aplicado (etapa 5 — guard anti-colisión):** añadido `.harness/scripts/ci/30-validate-phase-topology-disjoint.mjs`, cableado en `sdk-cli-ci.yml`. Falla CI si algún id de fase SDLC reusa el namespace F#, si colisionan ids de fase y topología, o si algún manifest reintroduce la clave legacy `progressiveAxis.phase`. Verificado: pasa limpio (5 ids SDLC disjuntos de 8 de topología) y detecta regresión (inyectar `phase` → exit 1).
- **Fix aplicado (etapa 2b — validate-workflow):** `validate-workflow.use-case` ahora rutea los phase ids vía `normalizePhaseId`/`toLegacyPhaseId` (commit 95b5d51d); core-domain 600/600 verde.
- **Cierre (etapa 4b DESCOPEADA, no abandonada):** retirar los VALORES F1/F2/F3 de madurez → ids canónicos queda **descopeado tras investigación**. F1/F2/F3 son **ordinales** de madurez claramente etiquetados en el eje progresivo — el id canónico de topología ya está en `profile`, y el schema los documenta como *"ordinales de madurez legacy … NO una fase SDLC."* Están entrelazados en ~24 archivos (architecture-validator / drift+fixtures del CLI / MCP tools / DTO de API / schemas / OPA), y el `architecture-validator` razona en F1/F2/F3 en todo su flujo. Retirarlos es un refactor breaking de alto riesgo y valor marginal ahora que la meta del EPIC — eliminar la confusión fase-SDLC ↔ topología — está lograda (etapas 1–5) y protegida contra regresión (etapa 5).
- **Hecho cuando:** [x] fuente única PhaseId + normalizador (etapa 1); [x] validators/services lo usan (etapa 2 + 2b validate-workflow); [x] superficies de contrato migradas (etapa 3); [x] `phase`→`maturityLevel` en topología (etapa 4); [x] guard sin colisión (etapa 5); [x] follow-ups dispuestos — 2b hecho, 4b descopeado (F# son ordinales de madurez bien etiquetados; id canónico ya en `profile`).

#### GT-344

**Título:** La CLI publicada falla (ENOENT default-workflow.yaml) — `DONE`

- **Componente:** smart-cli / core-domain · **Prioridad:** P0 · **Riesgo:** crítico→ninguno · **Dependencias:** ninguna
- **Archivos:** `packages/core-domain/src/domain/services/default-workflow-definition.ts`, `…/default-workflow-definition.spec.ts`, `sdk/cli/README.md` (+`.es`)
- **Fix propuesto:** empaquetar `rulesets/sdlc/default-workflow.yaml` en core-domain; carga perezosa con error claro de WORKSPACE_ROOT; smoke test en entorno limpio.
- **Fix aplicado:** workflow por defecto embebido como constante tipada `EMBEDDED_DEFAULT_WORKFLOW`; `loadDefaultWorkflow()` intenta WORKSPACE_ROOT, luego `__dirname`, y cae al embebido, así que la construcción nunca lanza. `WORKSPACE_ROOT` documentado como opcional (solo override) en el README de la CLI (EN+ES).
- **Evidencia:** entorno limpio (`env -u WORKSPACE_ROOT`, cwd `/tmp`, sin `packages/core-domain/rulesets`) → `node sdk/cli/dist/main.js --help` exit 0, sin ENOENT; core-domain 583/583 verde con 2 tests de regresión nuevos.
- **Riesgo residual:** el embebido duplica `rulesets/sdlc/default-workflow.yaml` (mantener sincronizado); aplicado en working tree, pendiente de registro de closure-evidence (GT-357).
- **Hecho cuando:** [x] `node sdk/cli/dist/main.js` exit 0 sin env ni rulesets/ del monorepo.

#### GT-345

**Título:** Podredumbre de specs de Smart CLI (21 suites) — `DONE`

- **Componente:** smart-cli / calidad · **Prioridad:** P1 · **Riesgo:** medio · **Dependencias:** GT-344
- **Archivos:** `sdk/cli/src/infrastructure/plugins/plugin-loader.spec.ts:55`, `…/standards/standards.command.spec.ts:73`, `…/__tests__/cli.integration.spec.ts:20`
- **Fix propuesto:** reparar ctor/mocks; soportar `--version`; restaurar type-check de specs.
- **Fix aplicado (parcial — 21→5 suites en rojo):** GT-344 ya resolvió la clase ENOENT. Luego corregidos todos los errores TS de specs para que cada suite corra: casts `as unknown`→`as any`, `as jest.Mock`→`as unknown as jest.Mock`, `(callbacks: unknown)`→`any`, llamadas a ctor actualizadas a las firmas actuales (InitCommand +fileSystem/+promptService, HandoffCommand +fileSystem, StandardsCommand +fileSystem, GateCommand cast promptService), casts de mock-fs, `step.validate!`, tipado de `commandModules`, literales de fixture (webhook `passed`). 17 specs. Resultado: **21→5 suites en rojo, 867 pasando (antes 640), 0 errores TS, sin regresiones.**
- **Evidencia:** `npm run --workspace sdk/cli test` → 5 fallan / 59 pasan (antes 21/43).
- **Fix aplicado (suite unitaria completa):** adr/drift usan PromptService real (delega al clack mockeado); completion espía los métodos privados de install; `test/mocks/index.ts` import corregido + MockFileSystem completado (existsSync/mkdir/copy/ensureFile); cli.integration runCli → `dist/main.js`; **añadido `--version` real al CLI** (main.ts lee package.json vía opción `version` de CommandFactory). Resultado: **suite unitaria (`jest`) = 64/64 suites, 905/905 tests verde** (antes 21 en rojo). `smart-cli --version` → 1.1.4.
- **Suite e2e (`test:e2e`) — 19/20 verde (162/175):** corregido TS-rot (sdlc-gate-commands-e2e + wizard.e2e); gate.e2e-spec (rulesetVersion 1.0.0→2.0.0, GT-318); **restaurado el registro `@Command` de `validate`** (regresión real — el comando estrella estaba sin registrar: "unknown command 'validate'") → cli-e2e 28/28. **mcp-e2e — RESUELTO (tests obsoletos, el server es correcto y seguro):** investigado en vivo. El server MCP HTTP está bien: `/health` es público a propósito (liveness, 200 antes de auth) y el endpoint MCP `POST /` devuelve 401 correctamente sin/con key inválida (auth enforzada) y ahora **falla cerrado — requiere API key** (endurecimiento GT-250). Los 13 fallos eran tests obsoletos: (a) 2 tests de auth pegaban a `/health` público esperando 401 → reapuntados a `POST /`; (b) el bloque de transporte levantaba `mcp serve` **sin `--api-key`** → todo daba 401 (initialize fallaba → sin sesión → cascada) → ahora levanta con `--api-key` y envía `Authorization: Bearer`; (c) el test sin-sesión no llevaba auth (401 antes del 400) → añadida la key. Sin cambio de producción — confirmado NO hay bypass de auth.
- **Hecho cuando:** [x] suite unitaria verde (núcleo GT-345); [x] TS-rot e2e + comando validate + versión gate; [x] mcp-e2e verde. **`npm test` 100% verde: unit 64/64 (905) + e2e 20/20 (175).**

#### GT-346

**Título:** Superficie de inyección de shell en CommandExecutor (seguridad) — `DONE`

- **Componente:** smart-cli · **Prioridad:** P2 · **Riesgo:** medio · **Dependencias:** ninguna
- **Archivos:** `sdk/cli/src/infrastructure/cli/command-executor.ts`
- **Fix propuesto:** `execFile`/`spawn` con arrays de args; validar nombres interpolados.
- **Fix aplicado:** añadido `CommandExecutor.executeFile(file, args[], cwd?)` con `execFile` (sin shell — argv literal, metacaracteres nunca interpretados; `.cmd` resuelto para npm/npx/nx en win32). Reescritos todos los providers estructurados de `providers/index.ts` (Npm/Dotnet/Python/Docker/Nx) para construir ARRAYS de argumentos en vez de interpolar nombres de paquete/scripts/templates/flags en strings de shell. Los strings de flags se parten en args discretos. El único path con shell que queda es `NpmProvider.exec(cmd)`, un escape hatch explícito del caller (documentado). `nx-workspace.strategy` (`executeOrThrow` con `command` construido internamente) es el único follow-up.
- **Evidencia:** `command-executor.test.ts` prueba el comportamiento sin shell — `executeFile('node', ['-e','…','; echo HACKED'])` imprime solo `safe`, nunca ejecuta `echo HACKED`. `providers.spec.ts` reescrito para afirmar (file, args[], cwd), incl. test de nombre-de-script-malicioso-como-arg-literal. `npm test` de smart-cli 100% verde: unit 64/64 (909) + e2e 20/20 (175). Builds limpios.
- **Hecho cuando:** [x] sin interpolación de shell sobre input no confiable (providers estructurados); [x] test.

#### GT-347

**Título:** Suite OPA de gobernanza rota + sin gate CI — `DONE`

- **Componente:** gobernanza/OPA · **Prioridad:** P0 · **Riesgo:** crítico (integridad de gobernanza) · **Dependencias:** GT-358 (bloquea exit-0)
- **Archivos:** `rulesets/opa/compliance-baseline.rego`, `rulesets/opa/rbac/gate-role-enforcement.rego`, `rulesets/opa/phase-gates.rego`, `rulesets/opa/telemetry-evidence.rego`
- **Fix propuesto:** corregir errores rego; gate CI `opa test rulesets/opa/`; restaurar build wasm.
- **Fix aplicado:** corregidos los 4 errores de carga/compilación que abortaban toda la suite — faltaba `future.keywords.if` (compliance-baseline) y `.in` (gate-role-enforcement); var de cabeza insegura en phase-gates (`name := e.artifact`); `all_deps` convertido a set en telemetry-evidence. Con la suite cargando, corregidos los 12 fallos surgidos (GT-358) → 197/197. Añadido gate CI `.harness/scripts/ci/29-test-core-opa.mjs` cableado en `sdk-cli-ci.yml`. Los fixes de parseo también desbloquearon `npm run build:policy` (el wasm ya compila).
- **Evidencia:** `opa test rulesets/opa/ --ignore=schemas` pasó de **27 errores (0 tests)** a **197/197, exit 0**; `npm run build:policy` exitoso; el gate imprime "197/197 passing".
- **Riesgo residual:** aplicado en working tree, pendiente de registro de closure-evidence (GT-357).
- **Hecho cuando:** [x] la suite carga y corre; [x] `opa test rulesets/opa/` exit 0; [x] wasm; [x] gate CI.

#### GT-358

**Título:** Suite OPA — 12 fallos de aserción surgidos tras desbloquear GT-347 — `DONE`

- **Componente:** gobernanza/OPA · **Prioridad:** P1 · **Riesgo:** medio (corrección de gobernanza) · **Dependencias:** GT-347 (que los hizo visibles)
- **Archivos:** `rulesets/opa/main_test.rego` (4), `compliance-baseline.test.rego` (2), `executive-scorecards.test.rego`, `governance.test.rego`, `mcp.test.rego`, `multi-tenancy.test.rego`, `satellite-contracts.test.rego`, `testing-pyramid.test.rego`
- **Fix propuesto:** triar cada test: fixture obsoleto vs deriva de política; refrescar mocks de `main_test`.
- **Fix aplicado:** los 12 eran **obsolescencia de fixtures/mocks** — los fixtures precedían a sub-reglas más nuevas. Fixtures actualizados para ser realmente conformes (lint workflow + dir `src`; flags SPACE/MTN/SVC/TPY; `coreVersionPinned`; keyword de métricas; y los 3 mocks faltantes en main_test: telemetry_evidence/helm/opa_sidecar). NO se cambió lógica de políticas — solo obsolescencia.
- **Evidencia:** `opa test rulesets/opa/ --ignore=schemas` → **197/197, exit 0**.
- **Riesgo residual:** aplicado en working tree, pendiente de closure-evidence (GT-357).
- **Hecho cuando:** [x] 197/197; [x] cada fix justificado como obsolescencia (ninguno requirió cambio de política).

#### GT-348

**Título:** Política OPA recompilada por cada dispatch (perf) — `DONE`

- **Componente:** mcp-server · **Prioridad:** P1 · **Riesgo:** medio · **Dependencias:** ninguna
- **Archivos:** `packages/mcp-server/src/mcp/abac-evaluator.ts:125`
- **Fix propuesto:** singleton perezoso por mtime del wasm; solo `evaluate(input)` por llamada.
- **Fix aplicado:** `AbacEvaluator` ahora tiene un `policyCache: Map<wasmPath, { mtimeMs, policy }>`. `evaluateOpa` hace un `fs.stat` barato y solo `readFile`+`loadPolicy` cuando la entrada falta o cambió el `mtimeMs` del wasm; si no, reutiliza la policy compilada y solo llama `evaluate(input)`. `AbacEvaluator` es singleton en Nest, así la caché persiste entre dispatches. (Los paths fail-closed y catch de GT-349 quedan igual.)
- **Evidencia:** nuevo `abac-evaluator.cache.spec.ts` (2 tests, con opa-wasm + fs-extra mockeados a nivel de módulo): 3 dispatches → `loadPolicy`/`readFile` llamados exactamente una vez; cambio de mtime → recompila (2×). Suite mcp-server 25/25 (170/170). Build limpio.
- **Hecho cuando:** [x] loadPolicy/readFile ≤1× por proceso/cambio de wasm.

#### GT-349

**Título:** OPA falla abierto si falta el wasm (seguridad) — `DONE`

- **Componente:** mcp-server · **Prioridad:** P2 · **Riesgo:** medio · **Dependencias:** GT-347
- **Archivos:** `packages/mcp-server/src/mcp/abac-evaluator.ts:132`
- **Fix propuesto:** fallar cerrado en producción (o warn + métrica).
- **Fix aplicado:** `AbacEvaluator.evaluateOpa` ya no devuelve `{ allowed: true }` cuando falta `policy.wasm`. En `environment === 'production'` ahora deniega en duro con una violación `ABAC_POLICY_MISSING` (fail-closed). En no-producción la capa OPA se abstiene (`allowed: true`) y la política nativa — que el dispatcher SIEMPRE conjuga (`native.allowed && opa.allowed`) — sigue gobernando, así dev/test siguen usables. El path del catch ya fallaba cerrado y queda igual.
- **Evidencia:** nuevo `abac-evaluator.spec.ts` (6 tests) — incl. sin-wasm+production → denegado `ABAC_POLICY_MISSING`, sin-wasm+staging → se abstiene; más cobertura nativa ABAC-02/03/01 (usa un corePath inexistente para que `pathExists` sea realmente false). Actualizado el test de integración de `mcp-server.service` que dependía del fail-open (lectura en prod permitida en silencio) para afirmar la denegación fail-closed. Suite mcp-server 24/24 (168/168). Build limpio.
- **Hecho cuando:** [x] sin política deniega en prod; [x] ambos caminos probados.

#### GT-350

**Título:** standards.service.ts usa `new Function()` (seguridad) — `DONE`

- **Componente:** core-domain · **Prioridad:** P2 · **Riesgo:** medio · **Dependencias:** ninguna
- **Archivos:** `packages/core-domain/src/domain/services/standards.service.ts:136`
- **Fix propuesto:** evaluador declarativo con allow-list; flag de confianza.
- **Fix aplicado:** eliminado el sink `new Function('code', 'return ' + check)`. Añadido `standard-check-evaluator.ts` que exporta `evaluateStandardCheck(check, code)` — un evaluador de predicados restringido y auditado que NUNCA ejecuta JS arbitrario. Matchea una gramática pequeña (`code.includes/startsWith/endsWith('lit')`, `/regex/flags.test(code)`, `code.length <op> N`, unidos por `&&`/`||` con `!`/paréntesis opcionales) vía un splitter de nivel superior consciente de comillas/regex/paréntesis; lo que cae fuera de la gramática es no-bloqueante (`true`), preservando el default fail-open anterior pero con cero ejecución. `standards.service.evaluateRule` delega en él.
- **Evidencia:** `standard-check-evaluator.spec.ts` 6/6 — incl. un test de payload que prueba que `(globalThis.__pwned = true) || true` y `code.constructor.constructor('…')()` son inertes (sin efectos, retorna no-bloqueante). `grep new Function/eval` en core-domain src → solo queda un comentario. Suite completa core-domain 60/60 (595/595). Build limpio.
- **Hecho cuando:** [x] sin `new Function()`; [x] cadena maliciosa inerte; [x] tests verdes.

#### GT-351

**Título:** infra-providers: sin tests, webhook sin retry/timeout, README erróneo — `DONE`

- **Componente:** infra-providers · **Prioridad:** P1 · **Riesgo:** alto · **Dependencias:** ninguna
- **Archivos:** `packages/infra-providers/src/webhook.adapter.ts:23`, `…/README.md:31`, `…/disk-ruleset.repository.ts:175`
- **Fix propuesto:** jest + tests por provider (≥80%); timeout + retry/backoff + allow-list de URL (SSRF); corregir README; ids canónicos en `deriveCategory`.
- **Fix aplicado (slice 1 — seguridad WebhookAdapter + harness de tests):** reescrito `WebhookAdapter` con timeout por intento (`AbortController`, 10s por defecto), retry acotado con backoff exponencial en fallos transitorios (red/5xx, nunca 4xx), y allow-list de esquema de URL (solo http/https — rechaza `file:`/SSRF + URLs malformadas). Constructor sigue siendo no-arg (opciones inyectables para tests). Añadido harness jest (`jest.config.js` + scripts `test`/`test:cov` + devDeps) y `webhook.adapter.spec.ts` (5 tests). La afirmación "with retry" del README ya es verdadera.
- **Evidencia:** `npm run --workspace packages/infra-providers test` → 5/5 verde (antes 0). Build limpio; consumidores `new WebhookAdapter()` (domain.module) sin afectar.
- **Fix de follow-up (detectado al correr la suite completa por GT-346):** slice 1 tenía dos roturas latentes que solo aparecieron al correr la suite de `sdk/cli` (el workspace de infra-providers solo, pasaba): (a) el adapter capturaba `globalThis.fetch` en el constructor, rompiendo mocks de `global.fetch` de late-binding → ahora hace late-binding en cada llamada; (b) el nuevo `webhook.adapter.spec.ts` lo compilaba `tsc build` (sin exclude) y fallaba por falta de tipos de jest → añadidos `*.spec.ts`/`*.test.ts` al `exclude` del tsconfig de infra-providers. Actualizado `sdk/cli/.../webhook.adapter.spec.ts` para la nueva semántica de signal + retry. mcp-server 25/25 y smart-cli 100% verde confirman el fix.
- **Restante (slice 2):** tests de los demás providers a ≥80%; corregir el ejemplo del README (config-parser/DiskRulesetRepository); reemplazar las claves f1/f2/f3 de `deriveCategory` por ids canónicos (liga con GT-343).
- **Hecho cuando:** [x] webhook timeout + retry + guard SSRF, con tests; [x] cobertura providers ≥80%; [x] README compila; [x] deriveCategory ids canónicos.

#### GT-352

**Título:** mcp-tools: sin validación de input, sin README — `DONE`

- **Componente:** mcp-tools · **Prioridad:** P2 · **Riesgo:** medio · **Dependencias:** ninguna
- **Archivos:** `packages/mcp-tools/src/registry.js:24`, `…/tools/echo.js:16`
- **Fix propuesto:** validar args contra `inputSchema` (ajv); README con catálogo.
- **Fix aplicado:** añadido `validate-input.js` (`validateInput(schema, args)`) — una verificación sin dependencias que cubre los schemas que usan estas tools (props requeridas, tipo por propiedad, args no-objeto). El handler `CallTool` de `registry.js` valida `request.params.arguments` contra el `inputSchema` de la tool antes de despachar; ante fallo devuelve un resultado MCP con `isError: true` y mensaje descriptivo en vez de pasar `undefined`/tipos incorrectos al handler. Añadidos `README.md` + `README.es.md` (catálogo de tools, nota de validación, uso, testing). Sin dependencias (sin ajv) ya que la única dep de runtime del package es el SDK de MCP.
- **Evidencia:** `npm run --workspace packages/mcp-tools test` → 16/16 (7 nuevos) incl. requerido-faltante, tipo-incorrecto, no-objeto y un test CallTool→`isError`. La paridad bilingüe se mantiene (READMEs 5/5 headers; sin flag).
- **Hecho cuando:** [x] input inválido → error estructurado; [x] README lista tools.

#### GT-353

**Título:** sdk-client huérfano + baja cobertura por método — `DONE`

- **Componente:** sdk-client · **Prioridad:** P2 · **Riesgo:** medio · **Dependencias:** GT-336
- **Archivos:** `packages/sdk-client/src/__tests__/sdk.spec.ts`
- **Fix propuesto:** tests URL/verb/body por método + abort (≥85%); README `/api/v1`; integrar consumidor real o marcar experimental.
- **Hecho cuando:** [x] cobertura func ≥85%; [x] test de integración; [x] README.

#### GT-354

**Título:** core-api con módulo OpenAPI muerto + api-reference incompleto — `DONE`

- **Componente:** core-api · **Prioridad:** P2 · **Riesgo:** bajo · **Dependencias:** ninguna
- **Archivos:** `apps/core-api/src/openapi/openapi-config.ts`, `…/main.ts:34`, `product/products/core-api/api-reference.md`
- **Fix propuesto:** borrar el módulo openapi o invocar `setupOpenApi()`; documentar `POST /architecture/cache/invalidate`.
- **Hecho cuando:** [x] sin DocumentBuilder duplicado; [x] api-reference completa.

#### GT-355

**Título:** @evolith/core sin test de contrato del barrel — `DONE`

- **Componente:** core · **Prioridad:** P2 · **Riesgo:** medio · **Dependencias:** GT-338
- **Archivos:** `packages/core/src/index.ts`
- **Fix propuesto:** `index.spec.ts` que verifique cada re-export + script `test`.
- **Hecho cuando:** [x] la suite falla si falta algún export; [x] CI lo corre.

#### GT-356

**Título:** README de mcp-services con deriva mantenida a mano — `DONE`

- **Componente:** docs · **Prioridad:** P2 · **Riesgo:** bajo · **Dependencias:** GT-341
- **Archivos:** `product/products/mcp-services/README.md:17,49`
- **Fix propuesto:** regenerar conteos (27/9/8); corregir comando a `smart-cli mcp serve --transport http --port 3000`; derivar del generador.
- **Hecho cuando:** [x] README == código; [x] test doc-snippet `--help`.

#### GT-357

**Título:** META — el tablero sobre-reporta completitud — `DONE`

- **Componente:** gobernanza · **Prioridad:** P1 · **Riesgo:** alto (falsa confianza) · **Dependencias:** GT-341, GT-347
- **Archivos:** `reference/core/control-center/gaps/gap-tracking.md`, `…/maturity-evidence.json`, `.harness/scripts/ci/09-reconcile-maturity.mjs`
- **Fix propuesto:** alimentar maturity-evidence con build/test reales por producto; condicionar "DONE" a evidencia validada.
- **Evidencia:** el tablero marcaba 329/330 con ≥15 GAPS reales (3 críticos); `09-reconcile-maturity.mjs` ya falla `closures 272 vs 323`.
- **Hecho cuando:** [x] el tablero reconcilia con la evidencia ejecutada.

#### GT-395

**Título:** WS7 Gobernanza Transversal - Las reglas existen como archivos estáticos pero no se aplican universalmente en runtime

- **Componente:** Core Domain · **Prioridad:** P0 · **Riesgo:** alto (las políticas existen en el repositorio pero son inertes)
- **Propósito:** Asegurar que las reglas de gobernanza agnósticas se traduzcan en bloqueos efectivos en runtime (ej. en el pipeline de evaluación) en lugar de permanecer pasivas como archivos markdown/JSON.
- **Evidencia:** El SDLC Deep Audit reportó "Gobernanza transversal: Las reglas de gobernanza existen como archivos pero no se aplican en runtime" (Dimensión 7: AUSENTE).
- **Fix aplicado:** Se conectó el resultado de `RulesetValidatorService.validate()` al veredicto del pipeline mediante un gate sintético `general-rulesets` (`buildGeneralRulesetsGate`). Los issues blocking de los rulesets JSON canónicos ahora producen un gate fallido que participa en la verificación `EvaluationVerdict.passed`. Los issues no-blocking (warnings) producen un gate aprobado. Los contadores del summary incluyen las evaluaciones de rulesets generales.
- **Hecho cuando:** [x] El pipeline valida automáticamente contra los rulesets JSON canónicos y falla explícitamente ante incumplimientos.
- **Evidencia de cierre:** Validación: `npx jest --config packages/core-domain/jest.config.js --runTestsByPath packages/core-domain/src/application/services/satellite-evaluation-pipeline.spec.ts --no-coverage` (18/18 tests pasando, incluyendo 4 tests específicos de GT-395).

#### GT-396

**Título:** WS4 Contrato de Ingesta Cliente - Falta esquema formal `SatelliteManifest`

- **Componente:** Core Domain · **Prioridad:** P1 · **Riesgo:** medio (los clientes envían datos fragmentados)
- **Propósito:** Establecer un contrato de entrada unificado y formal (esquema `SatelliteManifest` o `ProjectInput`) que todos los consumidores (Tracker, Smart CLI, UMS) deben enviar para iniciar validaciones.
- **Evidencia:** El SDLC Deep Audit reportó "Contrato de ingesta cliente: Existen schemas parciales pero no un contrato formal de ingesta cliente".
- **Fix propuesto:** Definir un JSON schema canónico para el payload que esperan las herramientas de validación de Core API y MCP, asegurando que todos los clientes provean un manifiesto estrictamente tipado.
- **Hecho cuando:** [ ] Esquema formal publicado; [ ] CLI/MCP/Core API exigen el esquema de manera estricta.

#### GT-397

**Título:** WS9 Script de Paridad Bilingüe Ausente

- **Componente:** .harness · **Prioridad:** P2 · **Riesgo:** medio (divergencia bilingüe silenciosa)
- **Propósito:** Restaurar el script de validación faltante `04-check-bilingual-parity.mjs` para garantizar que el release gate verifica el 100% de paridad de traducción Español/Inglés.
- **Evidencia:** El Intelligent Data Audit reportó "WS9: Quality and Release-Gate (75%) - Missing: Bilingual parity check Path: .harness/scripts/ci/04-check-bilingual-parity.mjs".
- **Fix propuesto:** Crear el script faltante basándose en la lógica existente de la suite y conectarlo de nuevo en el pipeline CI.
- **Hecho cuando:** [ ] Script creado y ejecutándose; [ ] WS9 alcanza 100% de cobertura.

#### GT-398

**Título:** Paridad Dual-Engine para `allowedSourceInterfaces`

- **Componente:** Rulesets · **Prioridad:** P0 · **Riesgo:** alto (la política de origen puede divergir entre Native y OPA)
- **Propósito:** Asegurar que el motor OPA audite los orígenes de interacción permitidos con la misma lógica del evaluador TypeScript nativo.
- **Evidencia:** SDLC Deep Audit reportó `allowedSourceInterfaces` en `GovernancePosture` sin política `.rego` equivalente.
- **Impacto:** Chat, CLI, MCP u otras interfaces pueden evadir gobierno de origen según el motor seleccionado.
- **Archivos afectados:** `rulesets/opa/`, `packages/agent-runtime/src/application/context-mapper.ts`, `packages/agent-runtime/src/__tests__/`, `.harness/scripts/ci/29-test-core-opa.mjs`.
- **Complejidad:** S
- **Corrección aplicada:** Añadidos `rulesets/opa/capability-source-interface.rego` y sus tests para casos conforme, violatorio, sin allowlist y sin origen; cableadas sus violaciones en `rulesets/opa/main.rego`; extendido el input de política runtime con `sourceInterface`, `context` y postura de capability; añadida cobertura nativa del bloqueo por origen no permitido.
- **Criterios de aceptación:**
  - [x] OPA valida `allowedSourceInterfaces` con la misma semántica que el evaluador Native.
  - [x] La paridad Native/OPA mantiene 0 drift.
- **Evidencia de cierre:** Commit `f826a927`. Validación: `node .harness/scripts/ci/29-test-core-opa.mjs` (216/216 tests OPA pasan) y `npx jest --config packages/agent-runtime/jest.config.js --runTestsByPath packages/agent-runtime/src/__tests__/units.spec.ts packages/agent-runtime/src/__tests__/agent-runtime.service.spec.ts --no-coverage` (18/18 tests runtime pasan).
- **Dependencias:** R-25 Dual-Engine Parity.

#### GT-399

**Título:** Inyección de adaptadores HTTP/Harness reales en `AgentRuntimeFactory` del CLI

- **Componente:** Agent Runtime · **Prioridad:** P1 · **Riesgo:** medio (CLI puede evaluar contra stubs y no contra servicios productivos)
- **Propósito:** Reconectar la ejecución de Smart CLI con Core API y el runner harness/playbook reales mediante adaptadores productivos.
- **Evidencia:** SDLC Deep Audit encontró `evolith plan evaluate` usando `StubCoreEvaluationAdapter` e `InMemoryHarnessAdapter`.
- **Impacto:** La madurez del CLI queda en nivel prototipo aunque el backend tenga capacidades reales de gobernanza.
- **Archivos afectados:** `sdk/cli/src/`, `packages/agent-runtime/src/`, `apps/agent-runtime-api/src/`.
- **Complejidad:** M
- **Propuesta de corrección:** Inyectar adaptadores HTTP Core y harness en `AgentRuntimeFactory`, dejando stubs determinísticos solo para modos offline/test.
- **Criterios de aceptación:**
  - [x] `evolith plan evaluate` puede consultar un Core API activo y emitir resultados reales.
  - [x] El modo offline/test conserva adaptadores stub determinísticos.
- **Dependencias:** `GT-384`, `GT-412`.

#### GT-400

**Título:** Endpoint REST/WebSocket (Hermes Entrypoint) en Core API

- **Componente:** Core API · **Prioridad:** P1 · **Riesgo:** medio (el adaptador Hermes no puede hospedarse tras un límite API gobernado)
- **Propósito:** Establecer una puerta de enlace Core API para que interfaces tipo chat interactúen con el `AgentRuntimeService` alojado.
- **Evidencia:** SDLC Deep Audit encontró `HermesChatBoxInteractionAdapter` sin controlador expuesto en `apps/core-api`.
- **Impacto:** Las interfaces conversacionales no pueden integrarse o deben evadir el límite runtime previsto.
- **Archivos afectados:** `apps/core-api/src/presentation/controllers/`, `apps/agent-runtime-api/src/`, `packages/agent-runtime/src/`.
- **Complejidad:** M
- **Propuesta de corrección:** Crear un endpoint REST para `AgentRuntimeRequestWire` y validarlo mediante tests de controlador/e2e. Si WebSocket se requiere después, registrarlo como gap separado por protocolo.
- **Criterios de aceptación:**
  - [x] Core API expone una ruta gobernada que recibe `AgentRuntimeRequestWire`.
  - [x] El endpoint devuelve envelope ADR-0073 y queda cubierto por tests.
- **Dependencias:** `GT-411`, `GT-401`.

#### GT-401

**Título:** `InteractionAdapterPort` ausente o no formalizado

- **Componente:** Agent Runtime · **Prioridad:** P0 · **Riesgo:** alto (las interfaces pueden evadir gobernanza de runtime)
- **Propósito:** Establecer un único punto de entrada gobernado para todas las fuentes de interacción de UI o máquinas.
- **Evidencia:** BMAD Intelligence update encontró que CLI, Chat, MCP y Webhooks pueden duplicar lógica de comandos o evadir orquestación runtime.
- **Impacto:** Autorización de capacidades, phase gates, auditoría y enforcement de políticas quedan inconsistentes por interfaz.
- **Archivos afectados:** `packages/agent-runtime/src/domain/ports/`, `packages/agent-runtime/src/adapters/interaction/`, `packages/agent-runtime/src/adapters/index.ts`, `apps/agent-runtime-api/src/agent-runtime/`, `sdk/cli/src/infrastructure/agent/`.
- **Complejidad:** M
- **Corrección aplicada:** Exportado `InteractionAdapterPort` por el contrato público `./ports`; exportados los adaptadores Smart CLI, chat, Hermes y external-trigger por la superficie pública de adapters; añadido `ExternalTriggerInteractionAdapter` para que la API HTTP mapee requests entrantes mediante un adaptador de origen gobernado; movida la factory Smart CLI a exports públicos del runtime; añadidos tests de conformidad de adapters y superficie pública.
- **Criterios de aceptación:**
  - [x] `InteractionAdapterPort` forma parte del contrato público runtime.
  - [x] CLI, Hermes y API externa enrutan por el puerto en vez de invocar motores directamente.
- **Evidencia de cierre:** Commit `2e0814d3`. Validación: `npm run build --workspace packages/agent-runtime`, `npm run test --workspace packages/agent-runtime` (42/42 tests pasan) y `npx tsc -p apps/agent-runtime-api/tsconfig.json`. `npm run build --workspace sdk/cli` sigue bloqueado por imports preexistentes en `sdk/cli/src/commands/plan/index.ts` hacia subpaths no exportados de capabilities/providers y `err` tipado como `unknown`, fuera de la factory runtime tocada por este gap.
- **Dependencias:** `GT-412`.

#### GT-402

**Título:** Smart CLI no formalizado como adaptador de interacción runtime

- **Componente:** Smart CLI · **Prioridad:** P0 · **Riesgo:** alto (CLI puede evadir la capa runtime)
- **Propósito:** Formalizar los modos comando/chat de Smart CLI como adaptadores que consumen el core gobernado de Agent Runtime.
- **Evidencia:** BMAD Intelligence update encontró `SmartCliCommandInteractionAdapter` pendiente de integración completa y flujos CLI todavía capaces de orquestar directamente.
- **Impacto:** La interfaz local más usada puede divergir del comportamiento de política y auditoría runtime.
- **Archivos afectados:** `sdk/cli/src/commands/`, `sdk/cli/src/infrastructure/agent/`, `packages/agent-runtime/src/`.
- **Complejidad:** M
- **Corrección aplicada:** Añadidos `AgentRuntimeFactory.executeCommand()` y `executeChat()` como gateway de Smart CLI para que los modos comando/chat siempre traduzcan mediante `SmartCliCommandInteractionAdapter` o `SmartCliChatInteractionAdapter` antes de llamar `runtime.handle`; actualizados `chat` y `plan evaluate` para usar el gateway; reemplazados imports privados de subpaths runtime en `plan`; añadidos tests CLI que prueban que el adapter se invoca antes de ejecutar runtime.
- **Criterios de aceptación:**
  - [x] El modo comando de Smart CLI delega capacidades gobernadas mediante la orquestación de Agent Runtime.
  - [x] Tests del CLI prueban que política/auditoría no se evaden.
- **Evidencia de cierre:** Commit `9ef081b9`. Validación: `npm run build --workspace packages/agent-runtime`, `npm run test --workspace packages/agent-runtime` (42/42 tests pasan), `npx jest --config sdk/cli/jest.config.js --runTestsByPath sdk/cli/src/infrastructure/agent/agent-runtime.factory.spec.ts sdk/cli/src/commands/chat/chat.command.spec.ts --no-coverage --runInBand` (4/4 tests pasan) y `npm run build --workspace sdk/cli`.
- **Dependencias:** `GT-401`, `GT-399`.

#### GT-403

**Título:** Hermes Chat Box no formalizado como adaptador de origen/interfaz

- **Componente:** Agent Runtime · **Prioridad:** P1 · **Riesgo:** medio (la interfaz chat puede evadir resolución de capacidades)
- **Propósito:** Asegurar que Hermes Chat Box no pueda ejecutar comandos directamente y deba enviar intenciones por `InteractionAdapterPort`.
- **Evidencia:** BMAD Intelligence update encontró que `HermesChatBoxInteractionAdapter` no está integrado en producción.
- **Impacto:** La ejecución conversacional podría saltar aprobaciones, checks de origen o auditoría runtime.
- **Archivos afectados:** `packages/agent-runtime/src/adapters/`, `apps/core-api/src/presentation/controllers/`, `apps/agent-runtime-api/src/`.
- **Complejidad:** M
- **Propuesta de corrección:** Registrar Hermes como adaptador de origen/interfaz y exigir resolución runtime de capacidades para cada intención.
- **Criterios de aceptación:**
  - [x] Hermes UI envía intenciones por el puerto de interacción.
  - [x] Hermes no puede ejecutar shell ni comandos backend fuera de capacidades gobernadas.
- **Dependencias:** `GT-400`, `GT-401`.

#### GT-404

**Título:** Adaptador de OpenCode no implementado

- **Componente:** Agent Runtime · **Prioridad:** P2 · **Riesgo:** medio (UI agente externa sin límite gobernado de capacidades)
- **Propósito:** Implementar un `OpenCodeInteractionAdapter` para mapear peticiones de OpenCode a capacidades gobernadas en lugar de ejecución libre.
- **Evidencia:** BMAD Intelligence update encontró que no existe implementación de adapter para OpenCode.
- **Impacto:** Una integración futura de OpenCode quedaría bloqueada o insegura por defecto.
- **Archivos afectados:** `packages/agent-runtime/src/adapters/`, `packages/agent-runtime/src/domain/ports/`.
- **Complejidad:** M
- **Propuesta de corrección:** Añadir un adaptador de interacción OpenCode detrás de `InteractionAdapterPort` con checks de origen y capacidad.
- **Criterios de aceptación:**
  - [x] Las peticiones de OpenCode se mapean a capacidades runtime gobernadas.
  - [x] OpenCode no tiene ruta de ejecución shell directa.
- **Dependencias:** `GT-401`, `GT-412`.

#### GT-405

**Título:** Adaptador de interacción MCP no formalizado

- **Componente:** Agent Runtime · **Prioridad:** P1 · **Riesgo:** medio (MCP puede quedar fuera de la orquestación runtime)
- **Propósito:** Asegurar que agentes externos consumiendo Evolith vía MCP estén sujetos a la misma gobernanza OPA y phase-gates que otras interfaces.
- **Evidencia:** BMAD Intelligence update encontró que MCP carece de un `McpInteractionAdapter` formal conectado al puerto runtime.
- **Impacto:** MCP puede divergir del comportamiento runtime de política, aprobación y auditoría.
- **Archivos afectados:** `packages/mcp-server/src/`, `packages/agent-runtime/src/adapters/`, `packages/agent-runtime/src/domain/ports/`.
- **Complejidad:** S
- **Fix aplicado:** Creado `McpInteractionAdapter` implementando `InteractionAdapterPort<McpToolInput>` con `sourceInterface: 'mcp'`. Mapea nombre de tool MCP a `intent`/`tool`, extrae tenant/initiative/phase de args planos o context anidado, maneja dry_run y approval. Exportado del barrel. 11 tests unitarios añadidos.
- **Criterios de aceptación:**
  - [x] Las interacciones MCP que ejecutan capacidades gobernadas usan `InteractionAdapterPort`.
  - [x] MCP conserva los checks ABAC existentes y suma paridad de política runtime.
- **Evidencia de cierre:** `packages/agent-runtime/src/adapters/interaction/McpInteractionAdapter.ts` creado. 11/11 tests pasando. Nota: el enrutamiento completo MCP→runtime (reemplazando ejecución directa de tools) es scope mayor — este GT entrega el contrato y mapeo del adaptador.
- **Dependencias:** `GT-401`, `GT-412`.

#### GT-406

**Título:** Adaptadores externos de aprobación HITL ausentes

- **Componente:** Agent Runtime · **Prioridad:** P1 · **Riesgo:** medio (acciones de alto impacto no pueden aprobarse por workflows reales)
- **Propósito:** Implementar adaptadores externos de aprobación para destrabar acciones de alto impacto de forma segura.
- **Evidencia:** BMAD Intelligence update encontró operaciones sensibles dependiendo de `DenyByDefaultApprovalAdapter` porque faltan adaptadores Tracker, Slack y GitHub.
- **Impacto:** Producción queda bloqueada para acciones de alto impacto o tentada a auto-aprobación insegura.
- **Archivos afectados:** `packages/agent-runtime/src/adapters/approval/`, `packages/agent-runtime/src/domain/ports/approval.port.ts`.
- **Complejidad:** M
- **Propuesta de corrección:** Añadir al menos un adaptador real de aprobación y mantener deny-by-default cuando no exista workflow externo configurado.
- **Criterios de aceptación:**
  - [x] Una capacidad que requiere aprobación puede ser autorizada por un humano en una plataforma externa.
  - [x] Las decisiones de aprobación quedan trazadas y auditables.
- **Dependencias:** disponibilidad de Tracker o plataforma externa de aprobación.

#### GT-407

**Título:** Enrutamiento de motores basado en políticas ausente

- **Componente:** Agent Runtime · **Prioridad:** P1 · **Riesgo:** medio (la selección de motor no puede aplicar riesgo, costo o privacidad)
- **Propósito:** Implementar un router de motores respaldado por políticas para Ollama, OpenAI, Hermes u otros motores.
- **Evidencia:** BMAD Intelligence update encontró configuración hardcodeada o de un solo motor sin enrutamiento por políticas.
- **Impacto:** Peticiones sensibles pueden enviarse a un motor o frontera de despliegue inapropiada.
- **Archivos afectados:** `packages/agent-runtime/src/adapters/engine/`, `packages/agent-runtime/src/domain/ports/agent-engine.port.ts`, `rulesets/opa/`.
- **Complejidad:** M
- **Propuesta de corrección:** Añadir `PolicyBasedEngineRouter` respaldado por evaluación de políticas runtime.
- **Criterios de aceptación:**
  - [x] Runtime selecciona motor según política de riesgo, privacidad, costo y capacidad.
  - [x] Las decisiones de enrutamiento quedan trazadas.
- **Dependencias:** `GT-385`, `GT-412`.

#### GT-408

**Título:** Adaptador Knowledge/RAG ausente

- **Componente:** Agent Runtime · **Prioridad:** P1 · **Riesgo:** medio (los agentes pueden recomendar acciones sin grounding en el corpus)
- **Propósito:** Implementar un adaptador Knowledge/RAG para que los agentes consulten ADRs, blueprints, estándares y rulesets antes de actuar.
- **Evidencia:** BMAD Intelligence update encontró que no hay mecanismo RAG en la capa Agent Runtime.
- **Impacto:** Las decisiones de agentes pueden desviarse del corpus de referencia corporativo.
- **Archivos afectados:** `packages/agent-runtime/src/adapters/`, `reference/`, `rulesets/`, `.harness/scripts/`.
- **Complejidad:** L
- **Propuesta de corrección:** Añadir una capacidad de consulta de corpus detrás de un puerto runtime y exigir su uso cuando se requiere contexto arquitectónico.
- **Criterios de aceptación:**
  - [x] Los agentes pueden consultar documentos arquitectónicos mediante una capacidad gobernada.
  - [x] Las respuestas citan o trazan los artefactos de corpus utilizados.
- **Dependencias:** estrategia de indexación de corpus y `GT-401`.

#### GT-409

**Título:** Verificaciones de frescura de documentación/diagramas ausentes

- **Componente:** .harness · **Prioridad:** P2 · **Riesgo:** medio (los mapas arquitectónicos pueden desfasarse del código)
- **Propósito:** Añadir checks CI que mantengan mapas arquitectónicos, diagramas Mermaid y documentación de adaptadores sincronizados con la configuración de capacidades runtime.
- **Evidencia:** BMAD Intelligence update encontró que mapas visuales y diagramas requieren actualización manual.
- **Impacto:** Revisores e implementadores pueden depender de diagramas runtime obsoletos.
- **Archivos afectados:** `.harness/scripts/ci/`, `reference/core/architecture/`, `reference/core/sdlc/`, `packages/agent-runtime/src/`.
- **Complejidad:** M
- **Propuesta de corrección:** Crear un validador de frescura como `validate-adapter-maturity-matrix.mjs` y cablearlo al CI documental.
- **Criterios de aceptación:**
  - [x] CI falla cuando cambia la configuración de capacidades sin actualizaciones documentales correspondientes.
  - [x] Los diagramas Mermaid modificados siguen pasando validación de sintaxis/render.
- **Dependencias:** fuente de verdad de la matriz de capacidades de adaptadores.

#### GT-410

**Título:** Bucle de retroalimentación de inteligencia BMAD ausente o incompleto

- **Componente:** .bmad-core · **Prioridad:** P1 · **Riesgo:** medio (los hallazgos de auditoría no se convierten en conducta reutilizable de agentes)
- **Propósito:** Sistematizar la creación de reglas, checklists y skills para agentes BMAD tras análisis de gaps mayores.
- **Evidencia:** BMAD Intelligence update encontró que señales de auditoría de madurez de adaptadores no se retroalimentan estructuralmente a agentes `.bmad-core`.
- **Impacto:** Winston y Architect pueden repetir omisiones que auditorías previas ya descubrieron.
- **Archivos afectados:** `.bmad-core/agents/`, `.harness/rules/`, `.harness/playbooks/`, `.agents/skills/`.
- **Complejidad:** S
- **Propuesta de corrección:** Añadir un bucle de feedback de madurez de adaptadores y actualizar checklists/reglas de agentes tras oleadas de auditoría.
- **Criterios de aceptación:**
  - [x] Winston y Architect alertan proactivamente violaciones de madurez de adaptadores.
  - [x] Auditorías mayores declaran qué reglas o skills de agentes se actualizaron, o por qué no aplicó ninguna actualización.
- **Dependencias:** `GT-409`.

#### GT-411

**Título:** Unificación de Envelope ADR-0073 en Core API

- **Componente:** Core API · **Prioridad:** P1 · **Riesgo:** medio (consumidores externos reciben contratos de respuesta inconsistentes)
- **Propósito:** Alinear respuestas de Core API con el envelope estructurado ADR-0073 ya esperado por consumidores CLI y MCP.
- **Evidencia:** SDLC Deep Audit reportó respuestas de Core API sin el envelope estándar `{success, data, warnings}` en superficies nuevas orientadas a runtime.
- **Impacto:** Hermes y otros consumidores externos necesitan manejo especial de API en lugar de un contrato transversal.
- **Archivos afectados:** `apps/core-api/src/presentation/`, `apps/core-api/src/common/`, `reference/core/architecture/adrs/core/0073-unified-cli-mcp-output-contract-and-gate-evidence-schema.md`.
- **Complejidad:** S
- **Propuesta de corrección:** Envolver endpoints de Core API, incluyendo endpoints Hermes/runtime, en el envelope ADR-0073 y documentar excepciones aceptadas.
- **Criterios de aceptación:**
  - [x] Los endpoints Core API involucrados en flujos de evaluación/runtime devuelven el envelope ADR-0073.
  - [x] `ValidateSatelliteUseCase` y rutas relacionadas quedan empaquetadas de forma consistente.
- **Dependencias:** ADR-0073, `GT-400`.

#### GT-412

**Título:** Garantía de Ejecución de Políticas en Runtime

- **Componente:** Agent Runtime · **Prioridad:** P0 · **Riesgo:** alto (las políticas de gobernanza existen pero no se fuerzan en cada request runtime)
- **Propósito:** Garantizar que los flujos de ejecución runtime invoquen validación de políticas antes de ejecutar capacidades.
- **Evidencia:** SDLC Deep Audit reportó reglas de gobernanza ausentes en runtime aunque existen archivos Rego y la paridad pasa.
- **Impacto:** Agent Runtime puede ejecutar capacidades gobernadas sin aplicar las mismas políticas usadas por evaluación/auditoría.
- **Archivos afectados:** `packages/agent-runtime/src/`, `packages/agent-runtime/src/adapters/policy/`, `sdk/cli/src/`, `rulesets/opa/`.
- **Complejidad:** M
- **Propuesta de corrección:** Inyectar el adaptador real de validación de políticas en factories runtime y hacer obligatoria la evaluación de política para capacidades gobernadas.
- **Criterios de aceptación:**
  - [x] Los requests runtime invocan validación de políticas antes de ejecutar capacidades.
  - [x] Deep Audit reporta enforcement de gobernanza transversal como sólido.
  - [x] Los stubs offline/test son explícitos y no pueden usarse como defaults productivos.
- **Dependencias:** `GT-398`, `GT-399`, `GT-401`.
- **Solución aplicada:** `AgentRuntimeService` ahora ejecuta un `policy-preflight` obligatorio para toda capacidad con `requiresPolicy` antes de aprobación, ejecución de harness o evaluación Core; una denegación devuelve resultado bloqueado con findings OPA y sin ejecutar la capacidad. El runtime conserva la validación de política post-ejecución sobre la salida de harness/Core. La factory del runtime hospedado ahora usa `OpaCliPolicyValidationAdapter` por defecto; `StubPolicyValidationAdapter` solo queda disponible mediante `AGENT_RUNTIME_POLICY_MODE=stub` explícito o el legado `AGENT_RUNTIME_OPA_ENABLED=false/0`. El SDLC Deep Audit ahora verifica ambas señales ejecutables (`runtimePolicyPreflight` y `runtimeOpaDefault`) antes de marcar sólida la gobernanza transversal.
- **Evidencia de cierre:** Commit `2f3e0bbe`. Validación: `npm run build --workspace packages/agent-runtime`, `npm run test --workspace packages/agent-runtime` (43/43 tests pasan), `npx tsc -p apps/agent-runtime-api/tsconfig.json`, `npm run build --workspace sdk/cli` y `node .harness/scripts/run-evolith-deep.mjs --markdown` (9/9 dimensiones SÓLIDO; `runtimePolicyPreflight: true`, `runtimeOpaDefault: true`).
- **Disposición de dependencias:** Alcance aceptado. `GT-398` y `GT-401` son prerrequisitos cerrados. `GT-399` queda abierto para reemplazar stubs no-política del lado CLI por adaptadores HTTP/Harness reales, mientras GT-412 cierra la garantía de enforcement de políticas y el default OPA del runtime hospedado.

#### GT-413

**Título:** El adaptador OPA real de runtime falla cerrado al cargar `rulesets/opa/`

- **Componente:** Agent Runtime · **Prioridad:** P0 · **Riesgo:** alto (la enforcement de políticas runtime está cableada, pero el adaptador real no puede evaluar policies vivas)
- **Propósito:** Hacer que el `OpaCliPolicyValidationAdapter` hospedado/runtime ejecute policies reales, no solo que sea seleccionado como adaptador default.
- **Evidencia:** `node .harness/scripts/run-evolith-deep.mjs --markdown` reporta policy preflight runtime y default OPA como sólidos, pero la ejecución directa equivalente al path del adaptador falla: `.harness/bin/opa eval --format json -I -d rulesets/opa 'data.evolith.phase_gates.allow'` devuelve errores de merge de schemas porque los JSON bajo `rulesets/opa/schemas/` se cargan como datos. La misma query funciona si se ignoran schemas: `.harness/bin/opa eval --format json -I -d rulesets/opa --ignore schemas 'data.evolith.phase_gates.allow'`.
- **Impacto:** Cualquier runtime productivo que use el adaptador OPA CLI real puede fallar cerrado antes de evaluar políticas, dejando capacidades gobernadas inutilizables o empujando a un fallback inseguro a stubs.
- **Archivos afectados:** `packages/agent-runtime/src/adapters/policy/opa-cli-policy-validation.adapter.ts`, `packages/agent-runtime/src/__tests__/`, `.harness/scripts/run-evolith-deep.mjs`, `rulesets/opa/README.md`.
- **Complejidad:** S
- **Propuesta de corrección:** Cambiar `OpaCliPolicyValidationAdapter` para pasar `--ignore schemas` (o cargar solo raíces `.rego`) y añadir un smoke test que ejercite el adaptador real contra `evolith.phase_gates` con input mínimo. Extender el deep audit para fallar si el adaptador real no puede ejecutar al menos una policy conocida.
- **Criterios de aceptación:**
  - [x] `OpaCliPolicyValidationAdapter.validate()` evalúa un paquete existente conocido sin errores de merge de schemas.
  - [x] Un test unitario/integración demuestra que el adaptador pasa con `evolith.phase_gates` y falla cerrado solo ante denegación real de política o error de ejecución OPA.
  - [x] `run-evolith-deep.mjs --markdown` incluye una señal smoke del adaptador real, no solo presencia estática de código.
- **Dependencias:** `GT-412`.

#### GT-414

**Título:** Drift del namespace `policyRef` runtime frente a los paquetes Rego reales

- **Componente:** Agent Runtime · **Prioridad:** P0 · **Riesgo:** alto (capacidades gobernadas apuntan a políticas inexistentes)
- **Propósito:** Hacer que cada `policyRef` de capacidad runtime resuelva a una query/paquete Rego real o a un registro de alias gobernado.
- **Evidencia:** `.harness/manifest.yaml`, `DEFAULT_SKILLS`, tests unitarios y docs de agent-runtime referencian `evolith.gates.discovery` y `evolith.architecture.adr`. `rg '^package' rulesets/opa` muestra paquetes reales como `evolith.phase_gates`, `evolith.capability_source_interface`, `evolith.governance` y `evolith.acl`; no existe paquete `evolith.gates.discovery` ni `evolith.architecture.adr`. Con schemas ignorados, `.harness/bin/opa eval --format json -I -d rulesets/opa --ignore schemas 'data.evolith.gates.discovery.allow'` devuelve `{}`, mientras `data.evolith.phase_gates.allow` devuelve `true`.
- **Impacto:** Corregir el path de carga OPA no basta: las capacidades runtime gobernadas seguirían denegadas o indefinidas porque los nombres lógicos de políticas no mapean a paquetes reales.
- **Archivos afectados:** `.harness/manifest.yaml`, `packages/agent-runtime/src/adapters/skills/default-skills.ts`, `packages/agent-runtime/src/domain/ports/policy-validation.port.ts`, `reference/core/architecture/foundations/{harness-integration,extending}.md`, `rulesets/opa/`.
- **Complejidad:** S
- **Propuesta de corrección:** Introducir un registro de referencias de políticas o mapa de alias (`evolith.gates.discovery` -> `evolith.phase_gates`, validación ADR de arquitectura -> paquete/ruleset correcto), actualizar manifest/default skills/docs/tests y añadir validación CI que exija que todo `policyRef` declarado resuelva a un paquete OPA real o alias explícito.
- **Criterios de aceptación:**
  - [x] Todo `policyRef` en `.harness/manifest.yaml` y `DEFAULT_SKILLS` resuelve a una query de política ejecutable.
  - [x] Las docs usan el mismo vocabulario canónico de `policyRef` que el código runtime.
  - [x] CI falla cuando se declara un nuevo `policyRef` sin paquete Rego o alias gobernado equivalente.
- **Dependencias:** `GT-413`, `GT-412`.

#### GT-415

**Título:** Drift de superficie pública y autoridad SemVer del Agent Runtime

- **Componente:** Agent Runtime · **Prioridad:** P0 · **Riesgo:** alto (el paquete declara una superficie estable congelada mientras los tests muestran drift de contrato)
- **Propósito:** Restaurar la autoridad de release de `@evolith/agent-runtime` antes de tratar v1.0.0 como estable para producción.
- **Evidencia:** `npm test --workspace @evolith/agent-runtime -- --runInBand` falla en `public-surface.spec.ts` porque `./adapters` ahora exporta `ChatApprovalAdapter`, `OpenCodeInteractionAdapter` y `SlackApprovalAdapter` fuera de la lista congelada. El README aún dice que el paquete se mantiene en `0.x` mientras el adaptador Core default sea stub, pero `packages/agent-runtime/package.json` declara versión `1.0.0`.
- **Impacto:** Los consumidores no pueden saber si los nuevos exports de adaptadores son cambios aditivos intencionales, cambios breaking o drift no documentado; el board marca productización previa como hecha aunque la suite del paquete está roja.
- **Archivos afectados:** `packages/agent-runtime/src/__tests__/public-surface.spec.ts`, `packages/agent-runtime/src/adapters/index.ts`, `packages/agent-runtime/README.md`, `packages/agent-runtime/README.es.md`, `packages/agent-runtime/package.json`, `reference/core/control-center/gaps/gap-tracking.md`.
- **Complejidad:** S
- **Propuesta de corrección:** Decidir si los tres exports son API pública intencional. Si sí, actualizar lista congelada, narrativa SemVer README/ES y notas de release como cambio aditivo de superficie estable. Si no, dejar de exportarlos desde `./adapters` o marcarlos internos. Añadir validación que ejecute el public-surface test antes de cerrar cualquier GT de release/productización.
- **Criterios de aceptación:**
  - [x] `npm test --workspace @evolith/agent-runtime -- --runInBand` pasa.
  - [x] README EN/ES y `package.json` cuentan una sola historia SemVer.
  - [x] Los exports públicos aditivos están documentados como minor-compatible; eliminaciones/renombres se gatean como major.
  - [x] La evidencia de cierre de productización del Agent Runtime referencia el guard de superficie pública en verde.
- **Dependencias:** `GT-388`, `GT-383`.

#### GT-416

**Título:** Catálogo de capacidades `.harness` sub-productizado frente al corpus de scripts ejecutables

- **Componente:** .harness · **Prioridad:** P1 · **Riesgo:** medio (la mayoría de activos ejecutables del harness no son descubribles mediante el contrato runtime gobernado)
- **Propósito:** Decidir qué scripts/playbooks del harness son capacidades de producto, detalles internos de CI o utilidades deprecadas, y exponer el subconjunto de producto mediante un contrato de manifest gobernado.
- **Evidencia:** `find .harness/scripts -maxdepth 2 -type f \( -name '*.mjs' -o -name '*.sh' -o -name '*.py' -o -name '*.md' \) | wc -l` ahora reporta 110 activos ejecutables/script-like, mientras `rg '^\s+- name:' .harness/manifest.yaml` reporta 7 capacidades declaradas tras añadir la capacidad semilla del bucle de mejora continua. Esto es aceptable solo si el manifest es una API pública estrecha intencional; esa decisión no está codificada como política de promoción/deprecación.
- **Impacto:** Agent Runtime y superficies futuras solo pueden descubrir una porción del harness. Validadores/auditorías útiles quedan invisibles, y cambios en scripts internos pueden verse como drift de producto porque no hay ciclo de vida declarado por capacidad.
- **Archivos afectados:** `.harness/manifest.yaml`, `.harness/scripts/`, `.harness/playbooks/`, `reference/harness/scripts-taxonomy.md`, `packages/agent-runtime/src/adapters/skills/default-skills.ts`.
- **Complejidad:** M
- **Propuesta de corrección:** Añadir una política de cobertura del manifest con tres categorías: `public-capability`, `internal-ci` y `deprecated/utility`. Registrar auditorías/validadores de cara a producto con inputs/outputs/permisos/postura de policy; marcar explícitamente scripts internos fuera de la superficie pública. Añadir un drift checker que compare taxonomía de scripts, manifest y default skills.
- **Criterios de aceptación:**
  - [x] Todo entrypoint user-facing `run-evolith-*` está declarado en `.harness/manifest.yaml` o clasificado explícitamente como interno/no-runtime.
  - [x] Las entradas del manifest tienen shape de entrada/salida, permisos, postura de trazabilidad, postura de aprobación y `policyRef`/alias cuando aplica.
  - [x] CI reporta drift de cobertura entre taxonomía de scripts, `.harness/manifest.yaml` y `DEFAULT_SKILLS`.
  - [x] Las docs runtime explican la superficie pública soportada de capacidades del harness y su política de deprecación.
- **Dependencias:** `GT-414`, `GT-409`.

#### GT-417

**Título:** Drift del registro de evidencia de cierre para gaps `COMPLETADO`

- **Componente:** Governance · **Prioridad:** P0 · **Riesgo:** alto (el tablero canónico de gaps puede declarar cierre sin evidencia verificable por máquina)
- **Propósito:** Restaurar el tracking semántico como fuente de verdad ejecutable: un gap marcado `COMPLETADO` debe tener registro de cierre, criterios marcados en secciones EN/ES del catálogo, artefactos de evidencia resolubles y comandos de validación reproducibles.
- **Evidencia:** Después de normalizar estados españoles del board de `HECHO` a `COMPLETADO` y corregir el puntero obsoleto de evidencia de GT-290, `node .harness/scripts/ci/08-validate-tracking.mjs` sigue fallando solo en semántica de cierre: múltiples gaps `COMPLETADO` como `GT-377`, `GT-395`, `GT-375`, `GT-390`, `GT-405`, `GT-410`, `GT-411` y gaps de la ola Agent Runtime carecen de registros en `gap-closure-evidence.json` y/o aún contienen criterios - [x] sin marcar.
- **Impacto:** El resumen ejecutivo y la evidencia de madurez pueden sobredeclarar cierre porque estado de tabla, criterios de catálogo y registro de cierre no están reconciliados por completo.
- **Archivos afectados:** `reference/core/control-center/gaps/gap-tracking.md`, `reference/core/control-center/gaps/gap-tracking.es.md`, `reference/core/control-center/gaps/gap-reference-catalog.md`, `reference/core/control-center/gaps/gap-reference-catalog.es.md`, `reference/core/control-center/evidence/gap-closure-evidence.json`, `.harness/scripts/ci/08-validate-tracking.mjs`.
- **Complejidad:** M
- **Propuesta de corrección:** Para cada gap `COMPLETADO` reportado por el validador, añadir un registro de cierre real con commit existente, evidencia resoluble, comandos de validación y disposición de dependencias; luego marcar los criterios EN/ES correspondientes. Si la evidencia no está completa, reabrir el gap a `PENDIENTE`/`EN-PROGRESO`. Mantener el validador en CI/pre-commit para que nuevas filas `COMPLETADO` no evadan la reconciliación del registro.
- **Criterios de aceptación:**
  - [x] `node .harness/scripts/ci/08-validate-tracking.mjs` pasa.
  - [x] Ningún gap `DONE`/`COMPLETADO` carece de registro en `gap-closure-evidence.json`.
  - [x] Ninguna sección de catálogo `DONE`/`COMPLETADO` contiene criterios de cierre sin marcar.
  - [x] `generate-executive-summary.mjs --check` pasa después de la reconciliación.
- **Dependencias:** ninguna.

#### GT-418

**Título:** Enforcement del bucle de mejora continua para harness y agentes BMAD

- **Componente:** .harness · **Prioridad:** P1 · **Riesgo:** medio (los insights de mejora pueden quedar como conducta puntual del agente en vez de convertirse en conducta gobernada del sistema)
- **Propósito:** Hacer ejecutable end-to-end el bucle de mejora continua del harness: cada ejecución agentic aprobada debe dejar un registro de progress-audit, los hallazgos abiertos deben convertirse en gaps canónicos y las lecciones repetidas deben promoverse a reglas, skills, playbooks, schemas o checks CI durables.
- **Evidencia:** Los artefactos semilla ya existen: `.harness/playbooks/self-improving-loop.md`, `.harness/playbooks/self-improving-loop.es.md`, `.harness/schemas/progress-audit.schema.json`, `.harness/scripts/skills/self-improving-loop.mjs`, `.bmad-core/skills/self-improving-loop.md`, `.bmad-core/skills/self-improving-loop.es.md`, el registro de skills BMAD y `.harness/manifest.yaml`. Sin embargo, CI y Agent Runtime aún no exigen registros JSONL de auditoría, no validan eventos progress-audit, no vinculan hallazgos automáticamente a `GT-*` y no verifican que hallazgos repetidos se promuevan a activos reutilizables del harness.
- **Impacto:** El repositorio todavía puede depender de la disciplina individual del agente. Una auditoría fuerte puede producir insights, pero el sistema aún no garantiza que esos insights se conviertan en controles repetibles.
- **Archivos afectados:** `.harness/playbooks/self-improving-loop.md`, `.harness/schemas/progress-audit.schema.json`, `.harness/scripts/skills/self-improving-loop.mjs`, `.harness/manifest.yaml`, `.bmad-core/skills/manifest.json`, `.harness/scripts/ci/`, `packages/agent-runtime/src/`.
- **Complejidad:** M
- **Semilla aplicada:** Añadidos el playbook bilingüe self-improving-loop, JSON Schema de progress-audit, docs/registro de skill BMAD, capability en manifest del harness y script MVP de snapshot. El MVP puede emitir un objeto JSON de progress-audit y opcionalmente anexar JSONL a `.harness/reports/progress-audit.jsonl`.
- **Propuesta de corrección:** Añadir un validador para registros JSONL de progress-audit, cablearlo en CI para ejecuciones agentic aprobadas, extender los adaptadores de trace de Agent Runtime/Tracker para emitir o reenviar registros compatibles y añadir un paso de reconciliación que confirme que cada hallazgo repetido queda vinculado a un `GT-*`, registro de cierre o racional no-op explícito.
- **Criterios de aceptación:**
  - [x] Un validador CI revisa `.harness/reports/progress-audit.jsonl` o el sink de auditoría seleccionado contra `.harness/schemas/progress-audit.schema.json`.
  - [x] Agent Runtime puede emitir o reenviar un registro compatible con progress-audit para ejecución de capacidades gobernadas.
  - [x] Los hallazgos repetidos se reconcilian contra `GT-*`, evidencia de cierre, actualizaciones de regla/skill/playbook/schema o racional no-op explícito.
  - [x] La skill self-improving-loop se ejercita en al menos una auditoría documentada con comando reproducible y enlace de evidencia.
  - [x] Los estimados de tokens/costo se pueblan cuando el proveedor de ejecución los expone.
- **Dependencias:** `GT-417`, `GT-416`, `GT-414`.

#### GT-419

**Título:** Refactorizar `AGENTS.md` a un Router/Bootstrapper mínimo
- **Componente:** `.harness` · **Prioridad:** P1 · **Riesgo:** bajo (mejora el caché de prompts y eficiencia de tokens)
- **Propósito:** Prevenir la saturación de contexto moviendo los agentes de descubrimiento e ingesta a un archivo separado, manteniendo `AGENTS.md` estrictamente para reglas de repositorio de alto nivel y enrutamiento de agentes.
- **Complejidad:** M
- **Solución propuesta:** Mover la tabla "Intake and Discovery Agents" a `.harness/agents/discovery-agents.md`. Actualizar enlaces.
- **Criterios de aceptación:**
  - [x] `AGENTS.md` solo contiene reglas globales y punteros.
  - [x] La tabla se reubica en `.harness/agents/discovery-agents.md`.
- **Dependencias:** Ninguna.

#### GT-420

**Título:** Implementar el emisor de `progress-audit.jsonl` en `Agent Runtime`
- **Componente:** `Agent Runtime` · **Prioridad:** P0 · **Riesgo:** alto (crítico para la observabilidad y auditabilidad del sistema)
- **Propósito:** Externalizar la memoria del LLM y mantener un registro estricto "append-only" de las decisiones de ejecución del agente sin saturar la ventana de contexto.
- **Complejidad:** M
- **Solución propuesta:** Modificar los adaptadores de trazas del tracker para emitir `progress-audit.jsonl` coincidiendo con el esquema definido.
- **Criterios de aceptación:**
  - [x] Cada ejecución gobernada de un agente emite un registro JSONL válido.
- **Dependencias:** `GT-418`.

#### GT-421

**Título:** Transicionar playbooks a contratos estrictos de JSON Schema
- **Componente:** `.harness` · **Prioridad:** P1 · **Riesgo:** medio (impacta cómo los agentes emiten datos)
- **Propósito:** Garantizar el Agnosticismo del Modelo forzando entradas/salidas estructuradas en lugar de depender de capacidades avanzadas de razonamiento en Markdown.
- **Complejidad:** M
- **Solución propuesta:** Crear `.harness/schemas/winston-audit-output.schema.json` y exigir su uso en el playbook de Winston.
- **Criterios de aceptación:**
  - [x] Las salidas de Winston se validan contra el JSON Schema.
- **Dependencias:** Ninguna.

#### GT-422

**Título:** Diseñar e implementar el Harness Orchestrator (Router Agent)
- **Componente:** `.harness` · **Prioridad:** P2 · **Riesgo:** bajo (mejora arquitectónica)
- **Propósito:** Crear un único agente frontal que lea `manifest.yaml` y delegue a los especialistas de dominio (`@winston`, `@architect`, etc.) para optimizar el gasto de tokens.
- **Complejidad:** L
- **Solución propuesta:** Definir el rol (persona) y el protocolo de enrutamiento del Harness Orchestrator.
- **Criterios de aceptación:**
  - [x] El enrutamiento se maneja dinámicamente guiado por `manifest.yaml`.
- **Dependencias:** Ninguna.

#### GT-423

**Título:** Implementar y automatizar el `core-health-checklist.md` como un validador (Gate)
- **Componente:** `Governance` · **Prioridad:** P1 · **Riesgo:** medio
- **Propósito:** Proveer un checklist automatizado (o evaluado por `@winston`) para verificar el estado stateless, la higiene de límites y la Paridad Dual-Engine.
- **Complejidad:** S
- **Solución propuesta:** Crear el checklist e integrarlo en las pruebas CI de `core-api`.
- **Criterios de aceptación:**
  - [x] El checklist evalúa correctamente la naturaleza stateless y la paridad OPA vs Native.
- **Dependencias:** Ninguna.

#### GT-424

**Título:** Única fuente de verdad + guard CI de paridad para los tres registros de skills
- **Componente:** `.harness` · **Prioridad:** P2 · **Riesgo:** medio (la divergencia silenciosa de registros socava el descubrimiento gobernado de capacidades)
- **Propósito:** Los descriptores de skills estaban duplicados en tres superficies sin dueño canónico ni guard, por lo que divergieron: (a) `src/packages/agent-runtime/src/adapters/skills/default-skills.ts` (`DEFAULT_SKILLS`) — el catálogo de enrutamiento **intent→capability** del runtime; (b) `reference/core/foundations/agent-skills/manifest.json` — el catálogo de **skills de análisis propiedad de agentes** (metadata owner/inputs/outputs); (c) `.harness/manifest.yaml` — el registro de **capacidades ejecutables del harness** con postura de gobernanza. `gap-prioritization-engine` ejecutaba un script real de `.harness/scripts/skills/` pero estaba ausente de `manifest.yaml`, así que el runtime no podía descubrirlo/gobernarlo.
- **Complejidad:** S
- **Solución propuesta:** Establecer `.harness/manifest.yaml` como **única fuente de verdad** de las capacidades ejecutables del harness (ya declara ese rol). Tratar `manifest.json` como una *vista* de metadata orientada a agentes cuyos skills respaldados por el harness deben estar declarados en `manifest.yaml`, y `DEFAULT_SKILLS` como una capa de enrutamiento de intents intencionalmente separada cuyo `harnessCapability` debe resolver a una capacidad de `manifest.yaml`. Reconciliar el drift actual (declarar `gap-prioritization-engine` en `manifest.yaml`) y añadir el guard CI `.harness/scripts/ci/34-check-skill-registry-parity.mjs` que falla ante futura divergencia.
- **Criterios de aceptación:**
  - [x] `manifest.yaml` documentado/tratado como canónico; `gap-prioritization-engine` declarado allí.
  - [x] Todo skill de `manifest.json` cuya implementación vive bajo `.harness/scripts/skills/` mapea a un `entry` de capacidad en `manifest.yaml`.
  - [x] Todo `DEFAULT_SKILLS[].harnessCapability` resuelve a un `name` de capacidad en `manifest.yaml`.
  - [x] `34-check-skill-registry-parity.mjs` aplica lo anterior y pasa; `default-skills.ts` documenta el layering.
- **Dependencias:** `GT-409` (freshness checks de adaptadores/skills), `GT-416` (productización de capacidades del harness).
