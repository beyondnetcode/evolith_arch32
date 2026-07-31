# Postura de cadena de suministro y de repositorio (GT-597)

**Estado:** medición cableada, línea base sin sembrar (ver §1.4) · **Última verificación contra el estado real:** 2026-07-30

Este documento existe porque la postura era prosa. La auditoría de madurez de
producto del 2026-07-26 tuvo que descubrir **a mano** que `enforce_admins=false`,
que ningún check requerido era de seguridad, que `develop` estaba sin proteger y
que ninguno de los paquetes publicados llevaba `dist.attestations`. Cada uno de
esos hechos es comprobable por una máquina de forma programada.

Aquí viven tres cosas, y nada más:

1. **Cómo se mide la postura** — la puntuación automatizada, externa y numérica,
   y el mecanismo exacto por el que una regresión se vuelve visible.
2. **El nivel SLSA objetivo declarado**, y un inventario honesto de la brecha
   hasta él, incluido lo que solo puede hacer el dueño del repositorio.
3. **Un mapeo de los controles que existen de verdad** a IDs de práctica de NIST
   SSDF v1.1, con la verificación detrás de cada fila.

> **Regla de lectura.** Cada fila registra *cómo se verificó*. Un control sin
> columna de verificación no entra en este documento. Una tabla de mapeo que
> listara controles que este repositorio no tiene sería la misma prosa que este
> gap viene a sustituir, disfrazada de identificadores estándar.

---

## 1. Cómo se mide la postura

### 1.1 La puntuación

[OpenSSF Scorecard](https://scorecard.dev) corre contra este repositorio desde
[`.github/workflows/openssf-scorecard.yml`](../../../../.github/workflows/openssf-scorecard.yml).
Puntúa veinte checks — entre ellos Branch-Protection, Code-Review,
Pinned-Dependencies, CI-Tests, Token-Permissions, Signed-Releases, SAST y
Dangerous-Workflow — y produce un número agregado.

| Propiedad | Valor |
|---|---|
| Disparador | cron semanal (martes 05:27 UTC), más `branch_protection_rule`, más dispatch manual |
| Alcance | solo la rama por defecto; la puntuación es una propiedad del repositorio, no de una rama de trabajo |
| Publicado en | la API pública de OpenSSF (`publish_results: true`), de modo que el número es comprobable externamente y no autoafirmado |
| Ingerido por | GitHub code scanning, como SARIF |
| Retenido como | artefacto de workflow a 90 días (SARIF **y** JSON), que es la evidencia cruda por corrida contra la que se difunde una regresión |

El disparador `branch_protection_rule` es deliberado: vuelve a puntuar el mismo
día en que cambia la protección de ramas, en vez de hasta una semana después. Esa
es exactamente la regresión que la auditoría encontró a mano.

### 1.2 Por qué la puntuación sola no es una medida

Un número publicado que ningún job compara contra nada no puede fallar. Una
puntuación que cae de 7,1 a 4,2 produce una corrida verde idéntica a una en la
que no cambió nada, y la diferencia queda dentro de un artefacto que nadie abre
entre auditorías — el modo de fallo original, reproducido semanalmente con mejor
ergonomía.

### 1.3 El gate que sí puede ponerse en rojo

[`.harness/scripts/ci/51-validate-scorecard-regression.mjs`](../../../../.harness/scripts/ci/51-validate-scorecard-regression.mjs)
compara cada corrida contra los pisos registrados en
[`.harness/security/scorecard-baseline.json`](../../../../.harness/security/scorecard-baseline.json)
y **sale con código distinto de cero** ante cualquiera de estos casos:

- la puntuación agregada por debajo de su piso registrado;
- cualquier check individual por debajo de su piso registrado;
- un check con línea base ausente de la corrida (un check que deja de correr es
  indistinguible de uno que dejó de pasar);
- un check presente en la corrida sin piso en la línea base (una línea base
  incompleta es la forma en que un trinquete deja de trinquetear en silencio);
- un check que devuelve `-1`, el "no pude llegar a un veredicto" de Scorecard,
  frente a un piso numérico — reportado como INCONCLUSIVE, porque ese es un hecho
  distinto de una regresión;
- resultados ausentes, no parseables o que no son reconociblemente JSON de
  Scorecard;
- resultados con cero checks, rechazados a través del propio `assertScanned` del
  repositorio.

Una **mejora nunca falla**. Se imprime como sugerencia de trinquete, de modo que
subir un piso sigue siendo un commit revisado — una línea base que se actualiza
sola no puede detectar nada.

**Así, una regresión es visible por cuatro vías independientes**, y la primera no
exige que nadie se acuerde de mirar:

1. **El job programado se pone rojo.** GitHub envía correo al dueño del
   repositorio cuando un workflow programado falla en la rama por defecto. Esta es
   la vía que carga el peso.
2. **El resumen del job** nombra el check, su piso, su nueva puntuación y la razón
   que da el propio Scorecard.
3. **Aparece una alerta de code scanning** para el check que falla.
4. **La puntuación pública de OpenSSF** del repositorio baja, visible para
   cualquiera.

### 1.4 Lo que todavía no está hecho, y por qué

**La línea base no está sembrada, y por diseño el gate está rojo hasta que una
corrida real la siembre.**

Ninguna corrida de Scorecard se ha ejecutado nunca contra este repositorio: el
workflow llegó a `main` el 2026-07-29 y su primer disparo semanal no se ha
producido (`gh run list --workflow "OpenSSF Scorecard"` no devuelve nada), y la
API pública devuelve 404 para `github.com/beyondnetcode/evolith_arch32`. Escribir
pisos plausibles sin una corrida observada produciría un fichero que se parece
exactamente a una medición sin serlo.

Por eso `aggregate` es `null`, el gate falla cerrado, y su mensaje de fallo
imprime el documento JSON exacto que hay que commitear. Sembrarlo es **acción del
dueño**: lanzar el workflow (Actions → OpenSSF Scorecard → Run workflow) y
commitear el bloque impreso. Lanzarlo publica una puntuación en una API pública, y
esa es una decisión de publicación, no de un agente.

---

## 2. SLSA — objetivo declarado y brecha hasta él

### 2.1 La declaración

**Objetivo: Build track de SLSA, Build L3** — tal como lo define
[SLSA v1.2](https://slsa.dev/spec/v1.2/build-track-basics), la versión actual de
la especificación (v1.1 sigue publicada; v1.2 la sustituye). Los niveles del Build
track son Build L0 (sin requisitos), Build L1 (existe provenance), Build L2 (las
builds corren en una plataforma alojada que genera y firma la provenance) y
Build L3 (las builds corren en una plataforma endurecida con protección fuerte
contra manipulación).

Esto es un **objetivo**, no un logro. La §2.3 registra qué falta.

### 2.2 Estado observado de los artefactos publicados

Verificado el 2026-07-30 con `npm view <paquete> dist.attestations` contra el
registro público, sobre el dist-tag `latest` de cada paquete:

| Paquete | `latest` | Attestation de provenance |
|---|---|---|
| `@beyondnet/evolith-cli` | 1.2.2 | sí — predicado `https://slsa.dev/provenance/v1` |
| `@beyondnet/evolith-mcp` | 1.2.2 | sí |
| `@beyondnet/evolith-sdk` | 2.0.0 | sí |
| `@beyondnet/evolith-core` | 1.2.0 | sí |
| `@beyondnet/evolith-core-domain` | 1.2.0 | sí |
| `@beyondnet/evolith-infra-providers` | 1.2.0 | sí |
| `@beyondnet/evolith-agent-runtime` | 1.2.0 | sí |
| `@beyondnet/evolith-contracts` | 1.1.0 | **no** |

Dos correcciones al hallazgo de la auditoría, registradas porque un número
obsoleto vale tan poco como ningún número: el "0 de 8 paquetes publicados llevan
`dist.attestations`" era cierto cuando se escribió y ya no lo es. `npm-release.yml`
(GT-570) publica cada workspace desde GitHub Actions con `--provenance`, y siete
de los ocho ya llevan una. Las versiones publicadas **antes** de que ese workflow
existiera siguen sin llevarla: `npm view @beyondnet/evolith-cli@1.1.0
dist.attestations` no devuelve nada, mientras que `@1.2.0` devuelve el predicado
de provenance de SLSA.

Un consumidor lo verifica por su cuenta con:

```bash
npm audit signatures            # verifica firmas del registro Y attestations de provenance
```

### 2.3 La brecha hasta el objetivo declarado

**Qué establece el predicado y qué no.** `https://slsa.dev/provenance/v1` es el
*formato* del documento de provenance. No es un nivel. El nivel sale de cómo se
produjo esa provenance.

**Posición actual, enunciada como afirmación y no como logro.** La provenance se
genera durante una corrida en un runner alojado por GitHub y se firma vía Sigstore
contra una identidad OIDC de GitHub que los propios pasos del workflow no pueden
falsificar. Esa es la forma que SLSA v1.2 describe para **Build L2**, y la
documentación de GitHub afirma que sus artifact attestations "by itself provides
SLSA v1.0 Build Level 2". **No se ha hecho ninguna verificación independiente de
nivel alguno sobre estos artefactos**, y la propia documentación de npm no afirma
ningún nivel. Trátese Build L2 como una afirmación pendiente de verificación.

Puntos abiertos, cada uno con su responsable:

| # | Brecha | Quién puede cerrarla |
|---|---|---|
| 1 | `@beyondnet/evolith-contracts` nunca se ha publicado con provenance; su `latest` es 1.1.0, anterior a `npm-release.yml`. | **Solo el dueño del repositorio.** Publicar exige la credencial `NPM_TOKEN`. Un agente no debe usarla ni pedirla. |
| 2 | Las versiones publicadas antes de `npm-release.yml` (todas las líneas `1.0.x` y `1.1.0`) no llevan attestation y nunca la llevarán — npm no puede atestar retroactivamente un tarball ya publicado. Quien esté fijado a esas versiones no tiene provenance. | Nadie. Se registra como permanente; solo se cierra si los consumidores actualizan. |
| 3 | Build L3 exige aislamiento entre la build y el workflow llamante. `npm-release.yml` es un único job de pasos en línea, así que no existe frontera de aislamiento. La vía documentada por GitHub es un reusable workflow. | Ingeniería. **Deliberadamente no hecho aquí** — el pipeline de release es materia de `GT-570`, y dos sesiones editándolo es justo como este repositorio ya ha duplicado trabajo. |
| 4 | Ninguna instrucción de verificación publicada llegaba al consumidor antes de este documento; el paso `npm audit signatures` de arriba es la primera. | Hecho, aquí. |
| 5 | Nada verifica automáticamente la presencia de attestations. Un release futuro podría dejar caer `--provenance` en silencio y ningún check lo notaría. | Ingeniería, y va junto al punto 3 en `GT-570`. |
| 6 | La provenance se afirma solo para `latest`. No hay inventario de attestations por versión. | Ingeniería, de poco valor hasta que exista el punto 5. |

### 2.4 Ajustes del repositorio relacionados

Verificado el 2026-07-30 con `gh api repos/beyondnetcode/evolith_arch32`:

| Ajuste | Valor real | Nota |
|---|---|---|
| `secret_scanning` | habilitado | |
| `secret_scanning_push_protection` | habilitado | |
| `dependabot_security_updates` | **deshabilitado** | Las actualizaciones de versión están configuradas en `.github/dependabot.yml`; las de *seguridad* están apagadas. **Acción del dueño** — es un ajuste del repositorio. |
| `required_signatures` (main, develop) | **false** | La firma de commits no se exige. **Acción del dueño.** |
| `require_code_owner_reviews` (main, develop) | **false** | `CODEOWNERS` enruta la revisión; no la exige para mergear. **Acción del dueño.** |

---

## 3. Mapeo a SSDF v1.1

Los identificadores de práctica provienen de **NIST SP 800-218, *Secure Software
Development Framework (SSDF) Version 1.1*, febrero de 2022** — la versión final
vigente de esa publicación. Los identificadores se tomaron de la tabla de
prácticas de la propia publicación, no de memoria. Nótese que SSDF v1.1 **retiró**
`PW.3.2`, `PW.4.5` y `PW.5.2`; nada mapea a ellos.

Los estados significan exactamente:

- **IMPLEMENTED** — el control existe, se aplica, y la columna de verificación
  dice cómo se estableció.
- **PARTIAL** — existe un control real y no cubre la práctica; la brecha se
  nombra.
- **NOT IMPLEMENTED** — se nombra porque su ausencia es el dato útil.

| Tarea SSDF | Control en este repositorio | Cómo se verificó | Estado |
|---|---|---|---|
| **PO.3.1** — especificar qué herramientas deben integrar cada toolchain y cómo se integran | El toolchain es código: 14 workflows en `.github/workflows/`, 63 guards numerados bajo `.harness/scripts/ci/`, y `.harness/manifest.yaml` como superficie de descubrimiento | `ls .github/workflows`, `ls .harness/scripts/ci`; el conteo de guards sale de `42-validate-guard-denominators.mjs` reportando "63 CI guard(s)" | IMPLEMENTED |
| **PO.3.2** — desplegar, operar y mantener el toolchain de forma segura, incluida su monitorización | Los guards corren en CI y `Validate documentation` es un check requerido en `main` y en `develop`; dos meta-guards (`42`, `43`) impiden que la suite pase de forma vacua | `gh api repos/…/branches/main/protection` lista `Validate documentation`; se observó a `43-validate-guard-negative-fixtures.mjs` poner en rojo cada guard de escaneo sobre una fixture vacía | IMPLEMENTED |
| **PO.4.1** — definir criterios para los checks de seguridad del software | El conjunto de checks requeridos es el criterio de merge, y ya incluye un check de seguridad (`CodeQL SAST`) | La misma llamada `gh api`: los contextos son `Test`, `Test core-domain`, `Test core`, `Test mcp-server`, `Test core-api`, `Validate documentation`, `CodeQL SAST` | PARTIAL — los criterios son la propia lista de checks; no hay detrás un documento de criterios basado en riesgo |
| **PO.5.1 / PO.5.2** — separar y proteger los entornos y endpoints de desarrollo | — | — | NOT CLAIMED — los endpoints de desarrollo están fuera de este repositorio y nada aquí los evidencia |
| **PS.1.1** — almacenar todo el código con mínimo privilegio, con control de versiones y cambios revisados | Protección de rama en `main` y `develop`: `enforce_admins: true`, force push y borrado deshabilitados, 1 aprobación requerida; `CODEOWNERS` enruta revisión y su handle de equipo fue verificado contra la organización antes de shipear | `gh api …/branches/{main,develop}/protection` y `…/protection/required_pull_request_reviews` (`required_approving_review_count: 1`, `require_code_owner_reviews: false`); `.github/CODEOWNERS` | PARTIAL — no se exige firma de commits (`required_signatures: false`) ni revisión del code owner |
| **PS.2.1** — poner información de verificación de integridad a disposición de los adquirentes | Attestations de provenance de npm, firmadas vía Sigstore, en el `latest` de 7 de 8 paquetes; instrucción de verificación publicada en §2.2 | `npm view <pkg> dist.attestations` para los ocho paquetes, 2026-07-30 | PARTIAL — ver §2.3 puntos 1 y 2 |
| **PS.3.1** — archivar de forma segura los ficheros y datos de soporte de cada release | El registro npm retiene los tarballs y sus bundles de attestation; los artefactos de workflow retienen la evidencia de Scorecard 90 días | `npm view` como arriba; `retention-days: 90` en `openssf-scorecard.yml` | PARTIAL — no hay archivo independiente del registro |
| **PS.3.2** — recoger y compartir datos de provenance de todos los componentes, p. ej. un SBOM | Se genera un SBOM CycloneDX durante el release | `grep -rn "sbom" .github/workflows/` devuelve exactamente una línea: `sdk-cli-release.yml:129`, que genera `sbom.json` — y ningún paso en ningún sitio lo sube, adjunta o publica | **NOT IMPLEMENTED** — el SBOM se produce y se descarta. Generar un artefacto que nadie puede obtener no satisface nada |
| **PW.4.1** — adquirir y mantener componentes de terceros bien asegurados | `package-lock.json` está versionado y todos los workflows instalan con `npm ci`, así que las builds resuelven a versiones fijadas | `grep -n "npm ci" .github/workflows/*.yml` | PARTIAL — no hay criterios documentados de evaluación para adoptar una dependencia nueva |
| **PW.4.4** — verificar que los componentes de terceros cumplen, a lo largo de su ciclo de vida | Dependabot (npm semanal, GitHub Actions mensual); `npm audit --audit-level=high` como gate bloqueante de CI; Trivy escaneando filesystem/contenedor con subida de SARIF | `.github/dependabot.yml`; `sdk-cli-ci.yml:117` (`npm audit --audit-level=high`); `sdk-cli-ci.yml:406-430` (job de Trivy + `upload-sarif`) | IMPLEMENTED |
| **PW.6.1 / PW.6.2** — usar y configurar herramientas de build que mejoren la seguridad del ejecutable | Node 20 fijado en todos los workflows; builds de TypeScript en `strict`; lint de arquitectura `eslint-plugin-boundaries` en la ruta de release | `NODE_VERSION: '20'` en los workflows de release; `"strict": true` en `tsconfig.base.json:6`; paso "Architecture Boundary Lint" de `sdk-cli-release.yml` | PARTIAL — las acciones de terceros están fijadas por **tag**, no por SHA de commit, en todas partes salvo `openssf-scorecard.yml`. Eso es justo lo que puntúa el check Pinned-Dependencies de Scorecard, y puntuará bajo |
| **PW.7.1** — decidir si se usa revisión de código y/o análisis de código | Ambos están decididos y configurados: `CodeQL SAST` es un check requerido y se exige 1 aprobación en `main` y `develop`. Un ruleset activo del repositorio además solicita revisión automatizada en la rama por defecto | `gh api …/protection` y `…/required_pull_request_reviews`; `gh api repos/…/rulesets` → ruleset "Code Quality Copilot review for default branch", `enforcement: active` | IMPLEMENTED |
| **PW.7.2** — ejecutar la revisión/análisis contra un estándar de codificación segura y triar los hallazgos | CodeQL (requerido), detección de secretos con gitleaks, secret scanning de GitHub **con push protection**; los hallazgos aterrizan en code scanning; el trabajo se tría en el tablero de gaps | `sdk-cli-ci.yml:379-402` (CodeQL), `:436-455` (gitleaks); `gh api repos/…` → `secret_scanning: enabled`, `secret_scanning_push_protection: enabled` | IMPLEMENTED |
| **PW.8.2** — acotar, ejecutar y documentar las pruebas de seguridad, triando lo que encuentran | Cinco jobs de test son checks requeridos (`Test`, `Test core-domain`, `Test core`, `Test mcp-server`, `Test core-api`) | Contextos de `gh api …/protection` | PARTIAL — el job DAST de ZAP existe pero **no bloquea** y cubre solo el servidor MCP, sin autenticar, en localhost (`sdk-cli-ci.yml:487-563`, y el paquete de preparación de pentest lo dice con sus propias palabras) |
| **PW.9.1 / PW.9.2** — definir e implementar ajustes seguros por defecto | El egreso de red a LLM está deshabilitado por defecto y falla cerrado: el proveedor registra el intento rechazado y lanza en vez de abrir un socket | `src/packages/agent-runtime/src/providers/GeminiProvider.ts:264` (`options.enabled ?? envFlagEnabled(process.env[GEMINI_EGRESS_ENV_FLAG])`) y `:427` (ruta de rechazo) | IMPLEMENTED para ese control; **no se afirma** como práctica de línea base segura de todo el repositorio |
| **RV.1.1** — recoger información de vulnerabilidades de fuentes públicas e investigarla | Alertas de Dependabot, `npm audit` en CI, avisos de GitHub sobre un repositorio público | `.github/dependabot.yml`; `sdk-cli-ci.yml:117` | PARTIAL — **`dependabot_security_updates` está `disabled`** en el repositorio, así que las alertas no generan PRs de remediación automáticos |
| **RV.1.2** — revisar, analizar o probar el código para hallar vulnerabilidades no detectadas antes | CodeQL corre en cada pull request a `main` y `develop` **sin filtro de rutas**, deliberadamente, para que vea todo `src/` | `sdk-cli-ci.yml`, `on.pull_request.branches: [main, develop]` con la ausencia documentada de un filtro `paths:` | IMPLEMENTED |
| **RV.1.3** — tener una política de divulgación y remediación de vulnerabilidades, con los roles que la sostienen | [`SECURITY.md`](../../../../SECURITY.md): reporte privado vía avisos de GitHub y correo, alcance, objetivos de respuesta, proceso de divulgación y una disclosure completa de egreso de red y sub-procesadores | El propio fichero, y el endpoint de avisos de GitHub enlazado desde él | IMPLEMENTED |
| **RV.2.1** — analizar cada vulnerabilidad lo suficiente para planificar la respuesta | Los hallazgos se rastrean como filas del tablero de gaps con criticidad y criterios de aceptación | `reference/core/control-center/gaps/` | PARTIAL — la severidad es el P0–P3 del tablero, no un cálculo tipo CVSS por vulnerabilidad |
| **RV.3.3** — revisar el software buscando vulnerabilidades similares para erradicar una clase | — | — | NOT CLAIMED |

### 3.1 Responder un cuestionario desde esta tabla

El uso previsto es una consulta, no una redacción: se busca el ID de práctica que
cita el cuestionario, se lee el estado y se cita la columna de verificación. Una
fila **PARTIAL** o **NOT IMPLEMENTED** es una respuesta utilizable — un mapeo en
el que todo está en verde es un mapeo que nadie comprobó.

---

## 4. Lo que deliberadamente no se afirma

- **No se afirma ningún nivel SLSA como verificado.** La §2.3 enuncia la *forma*
  de Build L2 y dice sin rodeos que no se ha hecho verificación independiente.
- **No aparece ninguna cifra de Scorecard en este documento.** No ha habido
  ninguna corrida. Un número aquí sería invención.
- **El pipeline de release queda intacto.** Los puntos 3 y 5 de la §2.3 pertenecen
  a `GT-570`.
- **Nada de aquí cambia un ajuste del repositorio.** Cada punto dependiente del
  dueño se lista como tal, con la razón por la que lo es.
- **`PO.1`, `PO.2`, `PW.1`, `PW.2`, `RV.3.1`, `RV.3.2` y `RV.3.4` están ausentes**
  en vez de mapeados: este repositorio no tiene para ellos evidencia que
  sobreviviera a la columna de verificación.

## Relacionado

- [`SECURITY.md`](../../../../SECURITY.md) — política de divulgación de vulnerabilidades y disclosure de egreso
- [Paquete de preparación de pentest](./pentest/README.es.md) — la mitad de atacante humano de la postura de seguridad
- [Auditoría de madurez de producto, 2026-07-26](../maturity-reports/product-maturity-audit-2026-07-26.es.md) — la auditoría cuyos hallazgos descubiertos a mano motivaron esto
