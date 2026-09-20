# Captura de la compuerta de fase

> **Navegación Bilingüe:** [English](./phase-gate-capture.md)

La portada muestra `evolith gate evaluate` y `evolith phase advance` sobre un satélite
recién inicializado. Este fichero es esa ejecución completa, para que la animación se
pueda comprobar en vez de creer — incluida la orden que falla sin `--core`, que la
animación solo nombra en su pie.

## Condiciones

| | |
|---|---|
| **Fecha** | 2026-09-20 |
| **Paquete** | `@beyondnet/evolith-cli@1.3.2`, resuelto por `npx -y` desde el registro público |
| **Dónde** | un contenedor `node:20` limpio: `/work/my-project` (vacío; luego `git init` y `evolith init --name my-project --yes`) junto a `/work/evolith`, un checkout de este repositorio en `142b8324` (`main`, 2026-09-19), montado en solo lectura |
| **Definiciones de gate** | `reference/governance/sdlc/gates/gate-f1.json` … `gate-f5.json` de ese checkout — el tarball no las trae (ver abajo) |
| **Códigos de salida** | `1` sin `--core` — la herramienta falló · `2` con `--core`, dos veces — la puerta bloqueó |

Reprodúcelo (Docker; el checkout puede ser cualquier clon de este repositorio):

```bash
git clone --depth 1 https://github.com/beyondnetcode/evolith_arch32 evolith
docker run --rm -it -v "$PWD/evolith:/work/evolith:ro" -w /work node:20 bash
```

y, dentro del contenedor:

```bash
mkdir my-project && cd my-project && git init -q
npx -y @beyondnet/evolith-cli@1.3.2 init --name my-project --yes
npx -y @beyondnet/evolith-cli@1.3.2 gate evaluate --phase discovery                   # exit 1
npx -y @beyondnet/evolith-cli@1.3.2 gate evaluate --phase discovery --core ../evolith  # exit 2
npx -y @beyondnet/evolith-cli@1.3.2 phase advance --from discovery --to design --core ../evolith
echo $?                                                                              # 2
```

## Qué deciden las dos órdenes

- **`gate evaluate --phase discovery`** carga el gate de Discovery (`business-sign-off`,
  `gate-f1.json`) y comprueba su evidencia obligatoria contra el satélite. Se exigen
  seis artefactos y en un repositorio recién creado no existe ninguno, así que el
  veredicto es `FAILED` y el código de salida `2`. Cada artefacto ausente es una fila
  `[error]` que nombra la regla (`PG-1-EVIDENCE-*`), el artefacto y la ruta donde se
  esperaba.
- **`phase advance --from discovery --to design`** ejecuta el mismo gate y convierte el
  veredicto en una *propuesta de transición*: `NOT RECOMMENDED`. No mueve nada. La
  fase de `evolith.yaml` sigue en `phase-0`; la propuesta es el registro sobre el que
  decide un humano — o el Tracker.

Ambas salen con `2` por la misma razón que `validate` en la portada: una condición
bloqueante que no se cumple. El `1` es otra cosa, y la primera orden de abajo lo enseña.

## La ejecución, sin editar

Se quitan las secuencias de control del terminal y el spinner de progreso; nada más
se elimina, reordena ni reescribe. El `stderr` se cita aparte donde no estuvo vacío.

`init`, para que conste — el satélite son cinco ficheros y un directorio `src/`:

```
$ npx -y @beyondnet/evolith-cli@1.3.2 init --name my-project --yes
│
◇  
│
◆  ✓ Satellite my-project initialised
│
●    Directory: /work/my-project
│
●    Artifacts creados: 5
│
●      - evolith.yaml
│
●      - README.md
│
●      - README.es.md
│
●      - package.json
│
●      - commitlint.config.mjs
│
▲  Warnings:
│
▲    - Conventional Commits are configured (commitlint.config.mjs) but nothing runs them: the `hooks` feature was not selected, so no commit-msg hook was installed. Wire commitlint into CI or re-run with --features hooks.

Next steps:
  1. evolith validate
  2. evolith agents install
  3. evolith sdlc handoff --from phase-0 --to phase-1

│
└  Done!

exit=0
```

Las tres órdenes de las que trata la portada:

```
$ npx -y @beyondnet/evolith-cli@1.3.2 gate evaluate --phase discovery
│
■  Error: ENOENT: no such file or directory, scandir '/work/my-project/reference/governance/sdlc/gates'
│
└  Failed

exit=1

$ npx -y @beyondnet/evolith-cli@1.3.2 gate evaluate --phase discovery --core ../evolith
┌  Gate business-sign-off — phase discovery
│
●  Verdict: FAILED (ruleset rulesets/sdlc/phase-gates.rules.json@2.0.0)
│
▲  [error] PG-1-EVIDENCE-prd @ PRD: Artifact not found: /work/my-project/docs/prd.md
│
▲  [error] PG-1-EVIDENCE-discovery-canvas @ Discovery Canvas: Artifact not found: /work/my-project/docs/discovery-canvas.md
│
▲  [error] PG-1-EVIDENCE-technical-feasibility-canvas @ Technical Feasibility Canvas: Artifact not found: /work/my-project/docs/technical-feasibility.md
│
▲  [error] PG-1-EVIDENCE-ballpark-estimation @ Ballpark Estimation: Artifact not found: /work/my-project/docs/ballpark-estimation.md
│
▲  [error] PG-1-EVIDENCE-moscow-prioritization-matrix @ MoSCoW Prioritization Matrix: Artifact not found: /work/my-project/.evolith/moscow/phase-0.json
│
▲  [error] PG-1-EVIDENCE-build-versus-compose-analysis @ Build-versus-Compose Analysis: Artifact not found: /work/my-project/.evolith/build-vs-compose.json
│
└  Evaluated by human at 2026-09-20T03:45:10.277Z

exit=2

$ npx -y @beyondnet/evolith-cli@1.3.2 phase advance --from discovery --to design --core ../evolith
┌  Phase Transition Proposal: discovery -> design
│
●  Transition is NOT RECOMMENDED
│
●  Evidence Verdict: FAILED (ruleset rulesets/sdlc/phase-gates.rules.json@2.0.0)
│
▲  [error] PG-1-EVIDENCE-prd @ PRD: Artifact not found: /work/my-project/docs/prd.md
│
▲  [error] PG-1-EVIDENCE-discovery-canvas @ Discovery Canvas: Artifact not found: /work/my-project/docs/discovery-canvas.md
│
▲  [error] PG-1-EVIDENCE-technical-feasibility-canvas @ Technical Feasibility Canvas: Artifact not found: /work/my-project/docs/technical-feasibility.md
│
▲  [error] PG-1-EVIDENCE-ballpark-estimation @ Ballpark Estimation: Artifact not found: /work/my-project/docs/ballpark-estimation.md
│
▲  [error] PG-1-EVIDENCE-moscow-prioritization-matrix @ MoSCoW Prioritization Matrix: Artifact not found: /work/my-project/.evolith/moscow/phase-0.json
│
▲  [error] PG-1-EVIDENCE-build-versus-compose-analysis @ Build-versus-Compose Analysis: Artifact not found: /work/my-project/.evolith/build-vs-compose.json
│
└  Proposed at 2026-09-20T03:45:12.501Z

exit=2
```

`stderr` de la primera orden (las otras dos no escribieron nada en `stderr`):

```
[Nest] [AppModule] WARN GateRegistryService: failed to load the artifact registry: ENOENT: no such file or directory, open '/work/my-project/src/rulesets/sdlc/artifact-registry.json'
[Nest] [GateCommand] ERROR Command execution failed: ENOENT: no such file or directory, scandir '/work/my-project/reference/governance/sdlc/gates'
Error: ENOENT: no such file or directory, scandir '/work/my-project/reference/governance/sdlc/gates'
    at fail (/root/.npm/_npx/34c429256ffa78f0/node_modules/@beyondnet/evolith-cli/dist/commands/gate/gate.command.js:61:23)
    at GateCommand.executeCommand (/root/.npm/_npx/34c429256ffa78f0/node_modules/@beyondnet/evolith-cli/dist/commands/gate/gate.command.js:92:20)
    …
```

## Qué de esto es un defecto

- **`gate evaluate` y `phase advance` necesitan un checkout de este repositorio en
  disco.** Sin `--core` (ni `EVOLITH_CORE_PATH`, ni un perfil), la CLI compone
  `reference/governance/sdlc/gates` y `src/rulesets/sdlc/artifact-registry.json` sobre
  el propio satélite, no encuentra ninguno y sale con `1`. El tarball trae
  `rulesets/sdlc/phase-gates.rules.json` — el respaldo que usaría el validador — pero
  el resolutor nunca llega a él. El servidor MCP arregló el mismo defecto para su
  paquete en GT-705 empaquetando los dos árboles; la CLI no recibió ese cambio. Se
  sigue como GT-714 en el [tablero de gaps](../../reference/core/control-center/gaps/gap-tracking.es.md).
- **Un `exit 1` que se lee como herramienta rota es el código correcto**, y por eso la
  portada insiste en la diferencia: `1` y `3` significan que el repositorio *no fue
  evaluado*. El defecto es que una instalación limpia llegue ahí, no que se reporte.
- **`init` imprime una etiqueta en español dentro de una ejecución en inglés**
  (`Artifacts creados: 5`). Cosmético; se anota para que nadie lo lea como un error de
  transcripción.

Todo lo demás es comportamiento por diseño: los seis artefactos son la evidencia
obligatoria del gate de Discovery, y un satélite que no tiene ninguno no debería ser
recomendado para Design.
