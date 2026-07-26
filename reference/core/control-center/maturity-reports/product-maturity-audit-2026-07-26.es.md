# Evolith — Auditoría de madurez de producto (2026-07-26)

> **Navegación Bilingüe:** [English Version](./product-maturity-audit-2026-07-26.md)

> **Qué es y qué NO es este documento.** Es una **auditoría puntual, fechada e inmutable**: retrata el estado del producto el 2026-07-26 y no se actualiza. **No es una segunda superficie de madurez.** La superficie viva sigue siendo [maturity-assessment.md](./maturity-assessment.md), y las desviaciones que esta auditoría encuentra en ella se corrigen allí, no aquí. Los gaps derivados se registran exclusivamente en el [Gap Tracking Board](../gaps/gap-tracking.md) (`GT-569`…`GT-578`), nunca en este documento. Mantener este fichero como registro histórico y no bifurcarlo es deliberado: duplicar superficies vivas es precisamente la causa raíz **C4** que esta auditoría identifica.

**Fecha:** 2026-07-26 · **Repositorio:** `beyondnetcode/evolith_arch32` @ `develop` (cf5c94b0)
**Alcance:** producto completo — no solo el código: mercado, arquitectura, calidad, testing, entrega, seguridad, operación, superficies, documentación, dominio/datos, proceso, dependencias, capa IA, frontera Core↔Tracker, capacidad.

**Método:** 12 auditores independientes, cada uno seguido de un verificador adversarial encargado de refutarlo; un crítico de completitud que detectó 3 huecos y disparó 3 auditorías de relleno; una síntesis; y un red team final que re-verificó a mano cada cifra contra el repositorio. 31 agentes, 4,75 M tokens, 2.423 llamadas a herramientas. Regla de evidencia: toda afirmación exige `ruta:línea` o un comando con su salida real; la documentación del propio repositorio se trató como *afirmación*, nunca como evidencia.

---

## 1. Veredicto ejecutivo

Evolith es **un motor de gobernanza determinista real, envuelto en una capa de gobernanza que no gobierna.**

La ingeniería del núcleo es buena y verificable: se instala desde npm, arranca en **517–698 ms** en un directorio vacío sin servidor, sin base de datos y sin Docker; el grafo de paquetes tiene **20 aristas y 0 ciclos**; `strict: true` en los 10 workspaces sin un solo override; **7 ficheros por encima de 500 LOC de 585**; y el lint de fronteras hexagonales rechaza de verdad —comprobado con sondas sintéticas— sobre **34.755 de 62.342 LOC de producción (55,7 %)**, dentro de jobs requeridos.

Y sin embargo, **el número que sostiene el producto no significa nada**. De 379 reglas del corpus, el motor nativo evalúa 108 y reporta 111; **271 devuelven `skipped`, de las cuales 192 son blocking**, se excluyen del denominador y no existe ningún campo que lo revele (`grep -rn "rulesSkipped" src` → 0 resultados). Un satélite con 192 reglas bloqueantes sin ejecutar recibe un PASS limpio. El mismo campo falla también en la dirección contraria: `validate --engine opa --core <repo>` devuelve **`rulesChecked: 379` habiendo ejecutado cero políticas** (el wasm no resuelve contra el layout del propio Core). El contador no tiene semántica en ninguna dirección.

**No existe la capa "Enforced" que el producto vende.** El check requerido `Validate documentation` lleva rojo desde el 2026-07-23T13:26Z — **43 de 43 runs completados fallidos** más 5 cancelados — y se han mergeado 8 PRs por encima; el último, el #209, entró a `main` con **0 reviews y 5 checks en FAILURE**. `enforce_admins = false`, `required_pull_request_reviews = null`, `develop` sin protección alguna. El workflow que contiene CodeQL, Trivy, gitleaks, ZAP y `npm audit` acumula **82 fallos / 17 cancelaciones / 1 éxito en sus últimos 100 runs** y **ninguno de sus 13 jobs es un contexto requerido**.

Lo instalable hoy (**1.1.0, 2026-07-18**) es anterior a la ola de correcciones de seguridad del **2026-07-23**, cuyo CHANGELOG público enumera los ficheros vulnerables por nombre mientras `SECURITY.md` promete que la línea 1.1.x está *actively patched*. Y el quickstart del README **falla dos veces**: `evolith` no es un binario publicado, y `init` crea un subdirectorio, así que el `validate` siguiente apunta al padre.

Comercialmente no hay nada que defender: **0 estrellas, 0 forks, 0 watchers, 0 issues o PRs externos en 80 días públicos**; ni una aparición de *ideal customer profile*, *design partner*, *pilot customer* o *willingness to pay* en 929 documentos en inglés; sin precio, sin unidad de medición, sin un solo entorno desplegado.

> **ACMM ponderado: 2,0 / 5 · Peldaño real: Implemented.**
> La ingeniería es de buena calidad. La gobernanza sobre esa ingeniería es **teatro medido**.

**Estadio de producto:** prototipo público de un solo autor con artefactos publicados en npm. Pre-alfa comercial. El motor de evaluación local es usable hoy por un desarrollador aislado; todo lo que lo rodea —release automatizado, enforcement, integración con el producto monetizable, operación, precio— es pre-producción o inexistente.

---

## 2. Fiabilidad de este informe

El red team verificó a mano las cifras que sostienen los riesgos top. **La columna vertebral aguanta, varias cifras al dígito.** Lo que no aguantó está segregado abajo, porque un informe sobre inflación de evidencia no puede permitirse inflar la suya.

**Verificado de forma independiente (por mí y/o por el red team, con comando y salida):**
379 reglas totales / 192 blocking saltadas · `rulesSkipped` inexistente · 43 runs rojos consecutivos · PR #209 con 0 reviews y 5 checks rojos · protección de `main` (6 contextos, `enforce_admins=false`, 0 reviews) · `develop` sin protección · 82/17/1 en `sdk-cli-ci` · npm 1.1.0 del 2026-07-18 frente a fixes del 2026-07-23 · 0 de 8 paquetes con `dist.attestations` · el SDK 1.1.0 instalado como directorio real bajo el CLI mientras el workspace está en 2.0.0 · la cadena Tracker→SKIPPED extremo a extremo · RLS/CDC con 0 ocurrencias en código · Alertmanager/k6/helm-lint/`gen_ai` en cero · 2.716 de 2.730 commits del mismo email · 928 `.ts` / 343 spec / 585 no-spec / 7 ficheros >500 LOC · MCP publicado 47/47 FORBIDDEN sobre stdio.

**Cifras que NO deben citarse fuera sin regenerar:**

| Cifra | Estado |
|---|---|
| `npm audit`: 9 vulns / 7 high (prod) vs 29 (dev) | **No verificable hoy** — el endpoint bulk del registry devuelve JSON inválido |
| 3.803 tests verdes · 88,09 % cobertura CLI · 76,14 % core-domain | **No reproducido** — salen de `coverage-summary.json` obsoleto en disco; el conteo de bloques `it()` da 3.481 |
| Tiempos O(N²): 0,233 s / 7,03 s / 29,7 s | **No reproducido** por nadie salvo el auditor original; el mecanismo (escaneo lineal en `overlay-file-system.ts:100,130`) sí está confirmado |
| 715 enlaces internos rotos | **Mecanismo confirmado** (`01-validate-docs.mjs:190` solo matchea targets que empiezan por `.`), número no recomputado |

**Cuatro conteos documentales corregidos a la baja** (estaban inflados en la primera síntesis): el comando fantasma son **447 invocaciones en 49 ficheros**, no 529 en 37 · ficheros ES sin traducir: **2 byte-idénticos + ~12 por heurística de vocabulario**, no 46 · validadores desconectados: **~9 de 46 scripts** (15 no invocados, de los que ~6 son librerías), no "11 de 39" ni "43 guards" · reglas con campo de chequeo máquina: **303 con `validationQuery` en prosa, 6 con bloque `enforce:` ejecutable** (y el mapper lo descarta, así que el efectivo es 0), no "1 de 379".

---

## 3. Scorecard

Peldaños: **Documented** < **Implemented** < **Tested** < **Enforced** < **Operated**.
Ninguna de las 15 filas alcanza *Operated*. Ninguna alcanza *Enforced* de forma sostenible.

| # | Dimensión | ACMM | Peldaño | Peso | Mayor brecha |
|---|---|---|---|---|---|
| 1 | **Producto y mercado** | 2,0 | Implemented | 5 | 0 ICP en 929 docs EN; 0 precio; 0 clientes; 0 conversión en 80 días |
| 2 | **Arquitectura** | 3,0 | Tested | 4 | 36,7 % del corpus es ejecutable; lo demás desaparece del veredicto sin contador |
| 3 | **Calidad de código** | 2,3 | Implemented | 3 | Lint del CLI muerto desde ESLint 9, tapado con `continue-on-error`; 437 errores en core-api que nadie ejecuta |
| 4 | **Testing** | 2,8 | Tested | 4 | 94,7 % unitario, 0 contra BD o contenedor; ~340 tests en 3 workspaces sin job de CI |
| 5 | **CI/CD y release** | 2,2 | Implemented ⬇ | 5 | El camino de release jamás ha corrido de punta a punta; 7 de 8 paquetes publican sin build |
| 6 | **Seguridad** | 2,2 ⬇ | Implemented ⬇ | 5 | 0 de los 6 checks requeridos es de seguridad; path traversal en 2 superficies de red |
| 7 | **Operabilidad** | 2,0 | Implemented | 4 | 0 entornos; Alertmanager inexistente; ningún chart validado por ningún job |
| 8 | **Superficies y DX** | 1,5 ⬇ | Implemented ⬇ | 5 | El paquete MCP publicado rechaza sus 47 tools sobre stdio; el quickstart falla dos veces |
| 9 | **Documentación** | 3,0 | Tested | 2 | Valida FORMA, no SUSTANCIA: el gate bilingüe compara conteo de cabeceras |
| 10 | **Datos y dominio** | 2,0 | Implemented | 4 | 192 reglas blocking sin evaluar e invisibles; agregados más ricos desconectados |
| 11 | **Proceso y gobernanza** | 2,3 | Implemented | 3 | Bus factor 1; 0 aprobaciones en 82 PRs; tablero GT que certifica DONE contra defectos vivos |
| 12 | **Dependencias** | 2,3 | Implemented | 3 | 0 de 8 con attestations; monorepo partido en silencio; Node 20 en EOL desde 2026-04-30 |
| 13 | **Capa IA/LLM** *(follow-up)* | 1,5 | Implemented | 5 | Vende gobernanza de IA y publica su único egress LLM sin ninguno de los controles que vende |
| 14 | **Frontera Core↔Tracker** *(follow-up)* | 1,5 | Implemented | 5 | El camino insignia registra SKIPPED sobre FAIL reales, con ambos CI en verde |
| 15 | **Capacidad y rendimiento** *(follow-up)* | 1,5 | Initial ⬇ | 4 | Nadie midió nunca nada; techo accidental de 100 KB (~15 ficheros) |

⬇ = nivel o peldaño rebajado por el red team respecto de la síntesis.

**Ponderado por peso: 2,0 / 5.** Las cinco dimensiones de peso 5 —producto/mercado, CI-CD, seguridad, superficies, capa IA y frontera Tracker— promedian 1,9. Las mejor puntuadas (arquitectura 3,0, documentación 3,0) son las de menor peso para la madurez *de producto*.

---

## 4. Las cinco causas raíz sistémicas

Esto es el núcleo del análisis: cinco mecanismos explican casi todos los síntomas de las 15 dimensiones.

### C1 — Todo instrumento puntúa como PASS el caso que no sabe medir

No es un bug repetido: es un patrón de diseño involuntario. Cada gate se escribió para cerrar un ticket GT cuyo criterio de aceptación era *"el gate existe y está verde"*, nunca *"el gate se pone rojo ante una entrada mala conocida"*. No hay control negativo en ninguna parte —ni mutation testing, ni fixture deliberadamente rota, ni aserción de cobertura distinta de cero— y **ningún instrumento publica su propio denominador**.

Síntomas medidos:
- 271 reglas `skipped` excluidas de `rulesChecked`, 192 de ellas blocking, en un veredicto PASS.
- El mismo campo reporta **379 comprobadas habiendo ejecutado 0 políticas** cuando el motor OPA no arranca.
- Un evaluador que lanza una excepción se convierte en `skipped` (`native-evaluator.ts:69-72`): **un crash es indistinguible de una regla verde**.
- El gate de paridad de superficies clasifica 8 ítems como *undetermined* y aun así imprime éxito.
- El oráculo cross-surface **excluye FORBIDDEN** de la comparación de errores — precisamente el 100 % de la superficie MCP stdio.
- El validador de enlaces solo matchea `./` y `../`.
- La paridad bilingüe compara el conteo de cabeceras `##`.
- `36-validate-agent-memory.mjs` imprime verde tras leer un directorio que no existe.
- El job Trivy no pasa `exit-code` (default 0): **no puede fallar nunca**.
- Un load test mide la latencia de 404s (ruta equivocada) y lanza `ReferenceError` en la primera iteración.

**El antídoto ya existe dentro de casa** y esto es lo esperanzador: `34-boundary-guard-repository.mjs:57-73` sale 1 si el directorio no existe **y** sale 1 si escaneó cero ficheros, con el comentario literal *"A zero-file scan must never be reported as boundary guard passed"*. Y el gate de contrato del Tracker incluye un **auto-test negativo** que corrompe un pin y exige que el guard falle. El patrón está inventado; se aplicó a 2 guards de ~46.

**Arreglo:** convertir el control negativo en criterio de aceptación. Todo gate publica su denominador y sale 1 con cero elementos; todo gate lleva una fixture mala que DEBE ponerlo rojo en CI; `ValidationResult` gana `rulesSkipped` y un estado `errored` distinto de `skipped`.

### C2 — La reorganización a `src/` migró el código y los imports, no los literales de ruta

El compilador detecta un módulo movido. **Nada detecta un fichero movido referenciado por una cadena**, y una ruta que no resuelve produce silencio, no error. Agravante: los literales rotos viven en scripts que a su vez están desconectados o gated por un secreto, así que nunca se ejecutan y nunca lanzan.

- `OpaEvaluator` hardcodea `<corePath>/rulesets/opa/policy.wasm` y nunca recibió el sondeo dual que sí tiene `DiskRulesetRepository`: **el motor OPA entero es no funcional contra el layout del Core**.
- El comando `upgrade` —el único mecanismo de migración de un cliente— diffea contra `<corePath>/rulesets`, que no existe: propone cero cambios.
- El config de fronteras del CLI guarda `src/domain`, `src/application` y `src/core`: **los tres nunca han existido**.
- `sdk-cli-ci.yml:467` invoca `.harness/scripts/ci/13-agentic-code-review.mjs`, fichero inexistente; y el script real apunta a `packages/mcp-server/dist/main.js`, ruta pre-refactor. **"Winston Agentic Review" está muerto dos veces** y reporta `success`.
- El `evolith.yaml` que genera `init` hornea `coreRef.path: "../evolith"` — un hermano que ni siquiera coincide con el nombre real del repo (`evolith_arch32`).

**Arreglo:** un guard de ~40 líneas que resuelva contra disco todo literal de ruta en `.harness/scripts/**`, pasos `run:` de workflows, values de Helm y constantes de evaluadores. Habría capturado cada instancia de arriba.

### C3 — Un aparato de gobernanza multipersona desplegado en una organización de una persona

Un mantenedor solo no puede ser bloqueado por sus propios gates sin detener todo el trabajo. Así que el bypass de admin se activó por necesidad práctica y no se revisó nunca; el hook pre-push que reescribía ficheros trackeados hizo de `git push --no-verify` el camino rutinario, eliminando también la capa local. **Nadie ha observado jamás qué ocurre cuando un gate bloquea legítimamente un cambio.**

`enforce_admins=false` · `required_pull_request_reviews=null` · `develop` sin protección · `ci-cd.yml` no corre en push a `develop` · 0 aprobaciones de segunda persona en 82 PRs · commitlint ni instalado ni configurado, con `.husky/commit-msg` fallando abierto · `strict=false` permite mergear contra base obsoleta.

**Arreglo — y es contraintuitivo:** *menos* gates. Reducir el conjunto requerido a un núcleo pequeño que esté genuinamente verde, activar `enforce_admins=true` **sobre ese núcleo**, y declarar advisory todo lo demás en vez de dejarlo required-pero-ignorado. Con bus factor 1, 6 gates decorativos son estrictamente peores que 2 que muerden.

### C4 — Las olas agénticas crean el artefacto nuevo *al lado* del viejo, sin obligación de matar al predecesor

El repositorio contiene dos de cada cosa, y con frecuencia **la que se ejecuta o se envía es la peor de las dos**.

- Dos implementaciones de egress LLM con posturas opuestas: la interna de CI con key en header, redacción, presupuesto y fail-closed; **la publicada en npm con la key en la query string y cero controles**.
- El resolver compartido de rutas de rulesets existe y **ambos** consumidores de `policy.wasm` lo esquivan.
- El subsistema enforcer GT-514/524, completo y testeado, **no puede dispararse nunca** porque `disk-ruleset.repository.ts:189-202` descarta el bloque `enforce:`. Un campo faltante en un mapper silencia un subsistema entero.
- `SupervisedAssistantClient` es el puerto LLM arquitectónicamente correcto (fail-closed, HITL, off por defecto) y `GeminiProvider` lo esquiva por un segundo puerto en el mismo paquete.
- Cuatro conteos distintos de tools MCP, dos de comandos CLI, tres presupuestos de latencia y dos de error simultáneos, dos suites k6 con puertos distintos.

**Arreglo:** "predecesor retirado" como criterio de aceptación obligatorio de toda ola; regla de *prohibir el primitivo crudo* (cada abstracción nueva llega con la eliminación del camino alternativo y una regla de import restringido que impida recrearlo).

### C5 — El tablero de gaps registra INTENCIÓN, no RESULTADO — y alimenta lo que lee un comprador

El guard de evidencia comprueba que `validationCommands` sean cadenas no vacías **pero nunca las ejecuta**. Un GT puede cerrarse contra un comando que no existe.

GT-146 cierra con comandos que apuntan a tres ficheros inexistentes · GT-147 cierra sobre un script que ningún workflow invoca · GT-142 "Real LLM Bridge Pipeline in CI" figura DONE mientras el job jamás ejecutó su script · GT-12 (`--dry-run`) figura DONE con el flag parseado y nunca leído, **defecto vivo en el 1.1.0 publicado** · GT-568 registra "0 vulnerabilidades" mientras el gate está rojo · **81 de 539 registros (15 %) no contienen ningún comando: son prosa**.

**Arreglo:** que CI ejecute todos los `validationCommands` y falle si alguno no resuelve; que ningún GT pueda cerrarse con evidencia que sea solo prosa.

---

## 5. Riesgos, rankeados por impacto × probabilidad

| # | Riesgo | Prob. | Esfuerzo |
|---|---|---|---|
| 1 | **El veredicto es un falso verde por construcción.** 271 de 379 reglas no se evalúan, se excluyen del denominador y no hay campo que lo revele. En modo OPA el mismo campo reporta 379 habiendo ejecutado 0 políticas. Un evaluador que crashea es indistinguible de uno verde. | certain | días (reporting) + trimestres (handlers) |
| 2 | **La integración insignia Tracker→Core registra SKIPPED sobre FAIL reales.** El Core devuelve `{topology,gates,summary}`, el Tracker liga `{overallVerdict,results.gate[]}`; `ToDecision` cae a `"SKIPPED"` y se persiste con `status=COMPLETED`. Ambos CI verdes, 0 tests de contrato cross-repo. | certain | días + semanas |
| 3 | **El paquete instalable hoy es anterior a los CRITICAL, y el repo público publica el mapa.** npm sirve 1.1.0 del 2026-07-18; los fixes son del 2026-07-23; el CHANGELOG los nombra por fichero bajo `[Unreleased]`; `SECURITY.md` promete 1.1.x parcheada. | certain | **horas** |
| 4 | **No existe capa de enforcement.** Check requerido rojo 43 runs, 8 PRs mergeados a través, `enforce_admins=false`, `develop` sin protección, 0 de 6 contextos requeridos es de seguridad. Cada peldaño "Enforced" de 1.716 documentos colapsa a "Implemented". | certain | horas de config, semanas para ponerlo verde |
| 5 | **La superficie MCP no funciona en su configuración documentada.** Verificado contra el **tarball publicado**: 47 tools anunciadas, **47/47 FORBIDDEN** sobre stdio. Las dos vías de escape que el código define (`--allow-no-auth`, `EVOLITH_MCP_ALLOW_NO_AUTH`) **existen y no hacen nada** — peor que su ausencia. Ambos oráculos de CI son ciegos por construcción. | certain | horas para el fix |
| 6 | **Los primeros 60 segundos fallan dos veces.** `evolith` no es un bin publicado (solo `evolith-cli`/`evolith-mcp`), y `init` crea un subdirectorio, así que el `validate` siguiente valida el padre → `GOV-000` + 41 blocking. Dentro del satélite correcto: 46 hallazgos / 39 blocking, dominados por reglas internas del monorepo del vendedor. El binario además se autoidentifica como `main` en su propia ayuda. | certain | horas + días |
| 7 | **Techo accidental de ~15 ficheros y camino cuadrático.** `body-parser` impone 102.400 B por defecto, jamás sobrescrito; el fichero 16 del propio repo ya lo rompe; `grep '413\|PayloadTooLarge'` en `src` → 0. El productor arma hasta 8 MB contra un consumidor de 100 KB (desajuste 80×). k6 en 0 de 12 workflows. | certain | semanas |
| 8 | **Egress LLM sin gobierno en un producto que vende gobernanza de IA.** `GeminiProvider.ts:17` pone la API key en la query string; sin timeout, presupuesto, redacción ni telemetría; export público de un paquete publicado. Disclosure: cero en README/SECURITY.md y los 8 READMEs. *Exposición **latente***: el único llamador in-tree es un comando `plan` que ni está registrado en el módulo del CLI — pero está en la superficie pública que lee un revisor. | certain | días + horas |
| 9 | **La autoevaluación que leería un comprador está inflada y es falsificable en 10 minutos.** `maturity-assessment.md` marca Seguridad *Level 4 / Validated* citando RLS y CDC → **0 ficheros** en todo `src`; marca *Level 4 / Validated* citando Nx → no existe `nx.json`. El propio documento define Validated como *"passing all quality gates, tests, and active in CI/CD"*. | certain | días |
| 10 | **Nada está operado ni puede estarlo.** `VPS_DEPLOY_ENABLED=false`; **0 ocurrencias de Alertmanager** en todo el repo; ningún chart trae ServiceMonitor; 10 de 14 alertas enlazan a runbooks en un directorio inexistente; la telemetría se escribe a un `.jsonl` local que nunca sale del disco. Sin señal de uso, no hay forma de podar una superficie de este tamaño. | certain | semanas |
| 11 | **Los dos motores dan veredictos irreconciliables sobre la misma entrada.** Mismo satélite recién creado con el artefacto publicado: native → 96 comprobadas / 39 blocking; OPA → 353 / 46. La afirmación de paridad dual-engine 8/8 es falsa de forma demostrable **en dos comandos**. | certain | semanas |
| 12 | **El acoplamiento con el único producto monetizable no está pinneado.** El compose construye desde `../../../evolith_tracker/src` sin submódulo, tag ni digest; el `main` del Tracker **no tiene branch protection** (frente a 6 checks en el motor); su UI son 25.961 LOC con **0 tests**. Ningún tercero puede reproducir la única demo del producto. | certain | días + semanas |
| 13 | **Bus factor 1 sobre una base con 44,3 % sin gate de fronteras.** 2.716 de 2.730 commits del mismo email; 0 aprobaciones en 82 PRs; el paquete con toda la lógica de agentes (7.723 LOC, 29 specs, incluido el guard que congela el contrato npm de un paquete publicado) **no tiene job de test en ninguno de los 12 workflows**. | certain | horas (jobs) / meses (bus factor) |
| 14 | **La composite action de integración renderiza siempre "0 violation(s) found".** El `jq` lee `.summary.violations`, clave que no existe en el envelope. *Matiz importante:* la action **sí bloquea correctamente** (propaga el exit code); lo roto es el contador y el texto del PR. Y ningún workflow del repo la ejercita, así que no hay regresión posible. | certain | **horas** |

---

## 6. Fortalezas reales

No son de cortesía: son las que un comprador competente valoraría, y varias son raras.

1. **La mitad simbólica de la tesis se ejecuta de verdad, offline y en menos de un segundo.** Tarball publicado con `policy.wasm` y 84 políticas `.rego`; ejecución en directorio vacío en **517–520 ms** en caliente, sin BD, sin servidor, sin Docker. El *time-to-first-run* sub-segundo es la precondición técnica exacta de un wedge bottom-up, y casi ningún competidor de la categoría la cumple.
2. **El enforcement de fronteras hexagonales es real**, comprobado con sondas sintéticas que efectivamente rechazan (`There is no rule allowing dependencies from elements of type "domain" to elements of type "infrastructure"`), y está dentro de contextos requeridos. La mayoría de repos que shippean `eslint-plugin-boundaries` lo tienen mal configurado y es un no-op silencioso.
3. **Existe disciplina anti-pase-vacuo, nacida de haberse quemado antes y documentada como aprendizaje.** Es el antídoto exacto a la causa raíz C1, ya inventado en casa. El problema es de despliegue (2 guards de ~46), no de capacidad.
4. **La paridad de superficies se verifica bidireccionalmente contra código vivo**, no contra una lista a mano: 68 operaciones, `0 unregistered, 0 obsolete`. Es el único sitio del repositorio donde el proyecto se mide contra código en vez de contra prosa, y el diseño del oráculo (misma pregunta a tres superficies) es superior a lo que hace la mayoría de equipos de plataforma.
5. **Base técnica ordenada y legible:** 20 aristas / 0 ciclos, `strict:true` sin overrides en los 10 workspaces, densidad de `any` del 0,192 %, 7 ficheros >500 LOC de 585, 6 TODOs de 2 días. En 62 k LOC escritas por una persona en olas agénticas, la ausencia de god-files no es lo esperable.
6. **La tesis de posicionamiento es autocrítica y su diferenciador existe en código.** `§14.2 "The honest moat"` rechaza explícitamente el motor de reglas como foso; y `enforce edit` + el `PreToolUse` hook de Claude Code (exit code 2 bloqueante) están implementados con specs. Nombra un trabajo real y desocupado.
7. **El gate de conformidad de contrato del Tracker se auto-testea:** falla el job si un pin corrupto pasa, anclado a un artefacto npm público reproducible sin credenciales. **El mejor artefacto individual de toda la auditoría.**
8. **La implementación correcta de egress LLM ya existe dentro de casa**, con 27 tests: key en header, presupuesto, 8 patrones de redacción, fail-closed. Convierte el riesgo #8 de problema de diseño en problema de portado.
9. **Corpus bilingüe EN/ES completo** (~787 pares), incluidos los payloads de rulesets. Prácticamente ningún competidor shippea un corpus español de primera clase — sería componente de foso si el ICP se nombrara.

---

## 7. Kill shots — las preguntas de una due diligence técnica

Ordenadas por lo que más daño hace en la sala.

**1. «De vuestro corpus, ¿qué fracción se ejecuta cuando corro `validate`? Enseñadme el denominador.»**
111 reportadas sobre 108 ejecutadas de 379 (29 %). 192 reglas blocking saltadas e invisibles. En modo OPA: 379 reportadas, 0 políticas ejecutadas. *Severidad: fatal — invalida toda cifra de cobertura comunicada.*

**2. «¿Está verde vuestra propia rama protegida? Abramos Actions.»**
No. 43 runs rojos consecutivos en un check requerido, 8 PRs mergeados a través, el último con 0 reviews. *Fatal en este producto concretamente: la tesis vendida es "CONTROL, no READ" y el vendedor no ejerce control sobre su propio trunk.*

**3. «Enseñadme la integración funcionando de punta a punta sobre una violación real.»**
Se persiste `decision=SKIPPED, status=COMPLETED` sobre un FAIL arquitectónico duro. *Fatal: la promesa central falla en silencio dejando una pista de auditoría que miente activamente.*

**4. «Enseñadme un cliente. O un design partner. O una persona que no seáis vosotros.»**
0 estrellas / forks / watchers en 80 días; 100 de 101 issues son el bot propio; 0 de 107 PRs externos. Hay tráfico de embudo superior (73 vistas / 14 únicos en 14 días, referrers de Google, ChatGPT, LinkedIn) y **conversión cero**. *Fatal para una ronda o una adquisición.*

**5. «Corramos vuestro quickstart tal cual está escrito.»**
Falla dos veces, y quien lo supera recibe 39 hallazgos blocking de las reglas internas del monorepo del vendedor. *Crítica — explica por sí sola el perfil de adopción cero.*

**6. «La versión que instalo hoy, ¿tiene parcheados los CRITICAL que documentasteis?»**
No. Ocho días publicada sin parchear, con el mapa de los agujeros en el CHANGELOG público y `SECURITY.md` prometiendo lo contrario. *Crítica — parada dura en revisión de seguridad de cliente.*

**7. «Vuestra autoevaluación dice Level 4 / Validated en seguridad. Enseñadme el código.»**
RLS y CDC: 0 ficheros. Nx: no existe. *Fatal para la credibilidad — encontrada una inflación, ningún revisor puede seguir usando el resto del documento, incluidas las puntuaciones honestas.*

**8. «¿Cuál es el tamaño máximo de repositorio que soporta vuestro endpoint?»**
Nunca se midió. Techo real ~15 ficheros. *Crítica — no hay respuesta posible a la pregunta de capacidad de un cliente empresarial.*

**9. «¿Qué envía vuestra librería a terceros, y con qué controles?»**
API key en la query string, sin controles, sin una línea de disclosure, en un producto que vende gobernanza de IA. *Crítica — cuestionario de seguridad empresarial y DPA bloqueados.*

**10. «Vuestro código, ¿pasa vuestras propias reglas blocking de IA agéntica?»**
No: incumple ≥4 de las 9 reglas AAI. No existe `agent.config.json` en la raíz, así que la topología agentic-ai nunca se evalúa contra Evolith. `grep -rn 'gen_ai' src .harness` → 0. *Crítica — invalida la afirmación de que las reglas son aplicables.*

**11. «¿Cuánto cuesta y qué está detrás del muro de pago?»**
No existe unidad de medición, tier, frontera free/paid, SLA ni precio. Lo único de pago es el Tracker, que un hub vende como *"Active product"* y su propio hub, un directorio más abajo, declara *"Conceptual / design-stage — not yet implemented"*. *Crítica para inversión.*

**12. «Si vuestro CI se rompiera sin que os dierais cuenta, ¿cómo lo sabríais?»**
Ya está pasando: "Winston Agentic Review" concluye `success` y ejecuta su script en 0 runs. Trivy no puede fallar nunca. ZAP escanea 3 sondas de salud sin autenticar y reporta *"PASS: 146"*. *Crítica — el sistema de detección tiene el mismo defecto que audita.*

**13. «¿Quién más puede mantener esto si os atropella un autobús?»**
Nadie. *Crítica en diligencia de adquisición — el activo es el conocimiento de una persona, no el repositorio.*

**14. «El paquete que instalo, ¿está construido a partir del código que estoy leyendo?»**
No garantizado: 7 de 8 sin `prepublishOnly`, 0 de 8 con attestations, publicados a mano. *Alta.*

---

## 8. Roadmap secuenciado por dependencia

### Semana 0–1 · Detener la hemorragia de credibilidad
*Todo son horas, sin dependencias entre sí. Prerrequisito de cualquier conversación con cliente, inversor o comprador.*

- Publicar **1.2.0** con la ola de seguridad, deprecar 1.1.0 en npm apuntando a la corregida, mover la sección de `[Unreleased]` al heading publicado y emitir el advisory que `SECURITY.md` ya promete.
- Poner `main` en verde: el rojo es una aserción de staleness de doc derivada (`exploration.spec.ts:289`) — **minutos, no días**.
- Arreglar el quickstart **en sus dos causas**: alias `evolith` en el bin map (2 líneas, coincide con las 447 invocaciones ya escritas), y que `init` sin `--name` inicialice en el cwd o que el README diga `cd my-sat`. Fijar el `program name` (hoy la ayuda dice `main`).
- Corregir el `jq` de la composite action a `.data.issues | map(select(.blocking)) | length`.
- `GeminiProvider`: key al header `x-goog-api-key`, `AbortController`, cap de bytes y `redactSecrets` **portados del código que ya existe** en `.harness/scripts/ci/agentic/`.
- Añadir sección *"Egress de red y tratamiento de datos"* a README, README.es, SECURITY.md y READMEs de `agent-runtime` y `cli`.
- Degradar `maturity-assessment.md` Pillar 1 a `Designed`; borrar las citas de RLS, CDC y Nx; reportar paridad contra el artefacto publicado.
- Decidir y etiquetar qué artefacto describe cada conteo de superficie: **HEAD sirve 50/12/8, el paquete publicado 47/11/8** y ninguna doc lo dice.

**Salida:** `npm view` posterior a los fixes con 1.1.0 deprecada · los 6 checks en verde sin bypass · el quickstart del README completa en un contenedor limpio · la action reporta un recuento ≠ 0 sobre un fixture no conforme · cero afirmaciones `Validated` sin `file:line` o job de CI.

### Semanas 2–6 · Que el veredicto sea honesto
*Todo lo comercial depende de esto: no tiene sentido buscar un design partner para un motor que devuelve PASS sobre 192 reglas blocking que no ejecutó.*

- `rulesSkipped` + array de ids en `ValidationResult`, más un estado `errored` distinto de `skipped`; fallar el run cuando la fracción saltada supere un umbral.
- Enrutar los dos consumidores de `policy.wasm` por `rulesets-location.ts` y **unificar la semántica de skipped entre native y OPA** (hoy dan 96/39 vs 353/46 sobre la misma entrada).
- Que `OpaEvaluator` deje de devolver `passed` para reglas sin política: sin política es `skipped`, nunca un PASS contado.
- Emitir `advisory`/`blocking:false` para las **91 reglas** con el placeholder *"Concrete checks to be wired into the harness"*; enum en el schema y guard que rechace `executable` sin campo de chequeo máquina.
- **Propagar el bloque `enforce:` en `disk-ruleset.repository.ts:189-202` — un campo** — para resucitar el subsistema `CompositeRuleEvaluator`/`EnforcerEvaluator` ya construido y testeado.
- Gating por topología y `audience: core` para `CLI-RR-*` y `TAX-*`.

**Salida:** `validate` sobre un repo recién inicializado devuelve **0 blocking**, con test de aceptación · el envelope reporta checked/skipped/total · los dos motores coinciden · las 6 reglas con `enforce:` disparan contra un fixture en CI.

### Semanas 4–10 (en paralelo) · Cerrar los puntos ciegos de los instrumentos
*Sin esto, cada arreglo anterior se degrada de nuevo sin señal.*

- El guard de literales de ruta (~40 líneas).
- Extender el patrón anti-vacuo a los ~46 guards: denominador publicado + fixture negativa obligatoria.
- Ejecutar en CI todos los `validationCommands` del tablero.
- Jobs `test-agent-runtime` y `test-agent-runtime-api` (~340 tests que hoy no ejecuta nadie, incluido el guard de congelación de contrato npm de un paquete publicado).
- Migrar el CLI a flat config (`--ext` no existe en ESLint 9), quitar el `continue-on-error` de `sdk-cli-ci.yml:142`, y añadir configs de fronteras a `agent-runtime` e `infra-providers`.
- Mover los gates de paridad dual-engine al camino de PR (hoy solo cron a las 06:00).

### Semanas 8–16 · Hacer que el enforcement exista
*Depende de `main` verde y de gates no vacuos. No se arregla rápido ni con más gates.*

- Reducir el conjunto requerido a un núcleo genuinamente verde y activar `enforce_admins=true` **sobre ese núcleo**; declarar advisory el resto.
- Proteger `develop`; hacer que `ci-cd.yml` corra en push a `develop`.
- Meter al menos un check de seguridad en el núcleo requerido *(recomputar `npm audit --omit=dev` primero: la cifra que circulaba no es verificable hoy)*.
- Sacar CodeQL/Trivy/gitleaks/audit del workflow filtrado a `src/sdk/cli/**` y pasar `exit-code` a `trivy-action`.
- Actualizar la base de Node (20 en EOL desde 2026-04-30) en CI y los 4 Dockerfiles.
- Resolver la fractura del monorepo: `@beyondnet/evolith-sdk` está en 2.0.0 en el árbol y en 1.1.0 en npm, y **el CLI compila contra el tarball del registry**.

**Salida:** un PR con un check del núcleo en rojo **no** se puede mergear, demostrado empíricamente · 30 días sin un merge a `main` con contexto requerido rojo · un tag `v*` recorre el release de punta a punta con provenance.

### Semanas 8–20 · Un camino de integración demostrable y medido
- Que el branch inline devuelva el `EvaluationResult` canónico, con **test de contrato dirigido por el consumidor** ejecutado en el CI del Core y fixtures request/response publicados en `@beyondnet/evolith-contracts`.
- Pinnear el Tracker (submódulo con tag o imágenes en GHCR por digest) y aplicarle branch protection.
- Límite de body explícito con manejo de 413 en ambos extremos; sustituir los escaneos lineales de `OverlayFileSystem` por índices por prefijo; cachear el corpus.
- Unificar los 6 presupuestos de latencia en uno y cablear k6; job de `helm lint/template/kubeconform`.

**Salida:** un veredicto real round-trip con `decision ≠ SKIPPED` sobre una violación genuina · la demo se levanta desde referencias publicadas · 20.000 ficheros por debajo de 60 s dentro del límite de memoria del pod.

### Meses 3–6 · Convertir el motor en producto
*Nada de esto tiene sentido antes: hoy un design partner chocaría con el quickstart roto, el veredicto falso y un paquete sin parchear.*

- **Nombrar un ICP concreto** y escribirlo; reclutar 3 design partners **solo** para el camino `enforce edit` + GitHub Action; congelar todo lo demás.
- Publicar el hook `enforce edit` como plugin de Claude Code / Cursor, donde la audiencia ya está.
- Levantar un entorno operado con Alertmanager, ServiceMonitor y runbooks ejecutables; medir un SLI real.
- Exponer las dos métricas más baratas que ya son derivables (violaciones bloqueadas en gate; bloqueos del edit-hook por semana) con telemetría opt-in.
- Escribir el modelo de negocio y **decidir explícitamente si el vehículo de monetización sigue siendo el Tracker o pasa a ser el wedge del CLI** — hoy los documentos asumen lo primero y toda la ingeniería va a lo segundo.
- Autogobernarse: `agent.config.json` raíz y evaluar el repo contra las 9 reglas AAI blocking en CI. Es simultáneamente el arreglo y **la mejor demo de venta disponible**.

---

## 9. Qué tendría que ser cierto

Ocho premisas hoy sin validar de las que depende que Evolith sea un producto comercial:

1. Que exista **al menos un comprador** para quien "bloquear de forma determinista lo que produce un agente de código" sea un problema con presupuesto asignado hoy. Cero de 929 documentos nombra a ese comprador.
2. Que la fracción realmente ejecutable pueda subir del 29 % sin **reescribir el corpus**. Si cerrar la brecha exige escribir ~240 handlers, el coste del producto es de otro orden de magnitud.
3. Que **el foso sea el corpus y no el motor**. Si el corpus es replicable en meses, lo defendible es el grafo vivo + el enforcement en tiempo de edición — y entonces buena parte de los 1.716 documentos es coste, no activo.
4. Que **un mantenedor único pueda operar un aparato multipersona**. La evidencia dice que no. O entra un segundo par de manos, o el aparato encoge a lo que una persona mantiene verde.
5. Que **el Tracker siga siendo el vehículo de monetización**. Hoy los documentos lo asumen mientras toda la ingeniería va al wedge del CLI, y el Tracker existe (25.961 LOC de UI) contradiciendo a la documentación del Core que dice que no existe.
6. Que el mercado **tolere una herramienta de gobernanza cuyo vendedor no se gobierna**. Es el ángulo exacto por el que atacaría un incumbente en una evaluación comparada.
7. Que exista una **arquitectura de evaluación que escale sin reescribirse**. Nunca se ha medido, porque no hay producción.
8. Que el ratio **1,9 : 1 de documentación sobre código** (221.305 líneas `.md` frente a 116.243 `.ts`) sea un activo y no un pasivo de mantenimiento. Hoy la evidencia apunta a lo segundo: la doc es la superficie con más drift medido del repositorio.

---

## 10. Anexo — Afirmaciones descartadas

30 afirmaciones cayeron o se corrigieron en verificación adversarial. Se listan porque un informe que solo muestra lo que sobrevivió no es auditable. Las más relevantes:

**Refutadas (se cayeron):**
- *"`evolith-mcp` sin argumentos arranca y sale sin escuchar"* — `serve` **es** el default; el README acierta.
- *"La mitad LLM de la tesis neuro-simbólica no existe en el código"* — existe y funciona; el problema es que está **sin gobernar**. Una afirmación de la forma *"X no existe en ninguna parte"* nunca debió emitirse desde búsquedas de keywords sobre markdown.
- *"6 ciclos de import causan `undefined` en runtime"* — todas las back-edges son type-only y `tsc` las elimina. Severidad: cosmética.
- *"El umbral de cobertura del 80 % no está enforced y CONTRIBUTING.md miente"* — sí está enforced con gate `jq`/`bc`; el auditor buscó en el workflow equivocado.
- *"El 70 % del TypeScript nunca se escanea; cero SAST"* — se infirió del trigger sin consultar la API: 57 de 64 alertas CodeQL están precisamente en los paquetes declarados no escaneados. Es latencia a nivel de PR, no ausencia.
- *"Los 9 probes de Kubernetes apuntan a un handler constante"* — es lo correcto para liveness/startup; el defecto real es **una** probe (`values.yaml:78`). ~9× menos ancho de lo afirmado.
- *"El tracing está apagado por defecto"* — está **encendido en cada contenedor y fallando al exportar**; la remediación propuesta era un no-op.
- *"El override de `brace-expansion` bloquea el fix que fue creado para entregar"* — el parche se publicó 5 días **después** del override. El rojo es decaimiento de advisories, no un cierre fabricado.

**Corregidas en dirección contraria (peor de lo reportado):**
- *"Los 8 paquetes llevan provenance SLSA"* — el auditor leyó `dist.signatures` como provenance. **0 de 8** llevan `dist.attestations`.
- *"Dos checks de branch protection están rojos"* — solo uno lo es, **y no hay misterio sobre cómo aterrizan commits rojos**: `enforce_admins` es explícitamente false y son pushes directos.

**Corregidas a la baja (aritmética):**
- 46,7 % sin lint de fronteras → **44,3 % del código de producción**.
- 1.129 ficheros `.ts` no-spec → **585**; 8 ficheros >500 LOC → **7**.
- 31 advisories / 29 HIGH como exposición de cliente → el árbol de producción es mucho menor *(cifra exacta pendiente de recomputar)*.
- 72,2 % de commits solo-Markdown → **39,2 % estricto** (883/2.255).

---

*Informe generado mediante auditoría multi-agente con verificación adversarial. Toda cifra marcada como verificada lleva detrás un comando ejecutado contra este repositorio o contra el artefacto publicado en npm. Las cifras no verificadas están segregadas en §2 y no deben citarse fuera sin regenerarse.*
