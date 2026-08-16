# Política de Seguridad

> **Navegación Bilingüe:** [English](./SECURITY.md)

Los mantenedores de Evolith se toman en serio la seguridad del framework y de sus
superficies de ejecución (CLI, servidor MCP y Service CORE API). Este documento
explica qué versiones reciben actualizaciones de seguridad y cómo reportar una
vulnerabilidad de forma responsable.

## Versiones Soportadas

Las correcciones de seguridad se aplican a la última línea de release menor. Las
líneas antiguas no reciben backports; por favor actualiza a una versión
soportada antes de reportar.

| Versión | Soportada          | Notas                                     |
| ------- | ------------------ | ----------------------------------------- |
| 1.1.x   | :white_check_mark: | Línea estable actual — parcheada activamente |
| 1.0.x   | :white_check_mark: | Solo correcciones críticas                |
| < 1.0   | :x:                | Pre-release; sin soporte                  |

## Reportar una Vulnerabilidad

**Por favor, no abras issues, pull requests ni discussions públicos para
vulnerabilidades de seguridad.** La divulgación pública antes de que exista una
corrección pone en riesgo a todos los usuarios.

Usa uno de los canales privados siguientes:

1. **GitHub Private Vulnerability Reporting (preferido).** Ve a la pestaña
   **Security → Report a vulnerability** del repositorio
   (<https://github.com/beyondnetcode/evolith_arch32/security/advisories/new>).
   Esto abre un aviso privado visible solo para ti y para los mantenedores.
2. **Correo electrónico.** Escribe a **beyondnet.peru@gmail.com** con el asunto
   `[SECURITY] Evolith — <resumen corto>`. Si deseas cifrar el reporte, solicita
   la clave pública del mantenedor en un primer mensaje de contacto que no
   contenga detalles sensibles.

### Qué incluir

Para ayudarnos a triar rápidamente, por favor aporta:

- Una descripción de la vulnerabilidad y su impacto.
- El componente afectado (CLI, servidor MCP, Core API, un ruleset/política
  concreta, una dependencia) y la versión (`1.1.0`, SHA de commit o rama).
- Instrucciones de reproducción paso a paso o una prueba de concepto.
- Cualquier mitigación conocida o corrección sugerida.

### Alcance

**Dentro del alcance:** el código fuente de Evolith en este repositorio —
`src/sdk/`, `src/apps/`, `src/packages/`, las políticas OPA y los rulesets bajo
`src/rulesets/`, el harness de CI/CD (`.harness/`, `.github/workflows/`) y los
paquetes publicados `@beyondnet/evolith-*`.

**Fuera del alcance:** las dependencias de terceros (repórtalas upstream;
nosotros las seguimos vía Dependabot y `npm audit`), los problemas que requieren
una máquina de desarrollo comprometida o credenciales ya filtradas, y los
hallazgos en documentación de ejemplo o referencia que no afectan a superficies
ejecutables.

## Objetivos de Respuesta

Estos son objetivos de buena fe para un proyecto mantenido por la comunidad, no
garantías contractuales:

| Etapa                              | Objetivo                        |
| ---------------------------------- | ------------------------------- |
| Acuse de recibo del reporte        | En un plazo de 3 días hábiles   |
| Evaluación inicial / triaje        | En un plazo de 7 días hábiles   |
| Corrección o mitigación para High/Critical | En 30 días (mejor esfuerzo) |
| Divulgación pública coordinada     | Tras publicar una corrección    |

## Proceso de Divulgación

1. Reportas de forma privada a través de uno de los canales anteriores.
2. Confirmamos la recepción, evaluamos la severidad (estilo CVSS: Low / Medium /
   High / Critical) y podemos hacer preguntas aclaratorias.
3. Desarrollamos y probamos una corrección en una rama privada.
4. Publicamos una versión parcheada y un GitHub Security Advisory acreditando a
   quien reportó (salvo que se solicite anonimato).
5. Coordinamos contigo el calendario de divulgación pública.

## Reconocimiento

Agradecemos a las personas investigadoras de seguridad que reportan de forma
responsable. Con tu consentimiento, te acreditaremos en el aviso publicado y en
el `CHANGELOG.md`.

## Salida de Red y Tratamiento de Datos

Evolith es local-first. El CLI, los rulesets, las políticas OPA y el Core de
evaluación stateless se ejecutan todos en la máquina del operador, y el contenido
del repositorio nunca se sube: la evaluación ocurre donde está el código. El Core
API y el transporte HTTP del MCP son servidores que hospeda el propio operador.
Ninguna superficie reporta telemetría, analítica ni comprobación de licencia a
los mantenedores.

Existe exactamente **una** integración saliente con terceros en los paquetes
publicados. Está **deshabilitada por defecto** y lo siguiente es su divulgación
completa. Responde cuestionarios empresariales y DPAs desde esta sección.

### La única ruta de salida

| Elemento | Divulgación |
|---|---|
| Componente | `GeminiProvider`, un export público de `@beyondnet/evolith-agent-runtime` (`src/packages/agent-runtime/src/providers/GeminiProvider.ts`) |
| Endpoint | un `POST` HTTPS a `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent`, modelo por defecto `gemini-2.5-flash`. El paquete no contacta con ningún otro host. |
| Estado por defecto | **DESHABILITADO.** Sin configuración el provider no abre ningún socket: registra el intento rechazado y lanza `LlmEgressDisabledError`. |
| Activación explícita | la variable de entorno `EVOLITH_LLM_EGRESS=true` (o `1`), o un `new GeminiProvider({ enabled: true })` explícito. No existe ninguna ruta de activación implícita. |
| Credencial | `EVOLITH_LLM_API_KEY`, con `GEMINI_API_KEY` como alternativa. Se transmite en la cabecera `x-goog-api-key`, nunca en el query string de la URL. Sin clave, la llamada se rechaza antes de abrir un socket. |
| Límites de transporte | timeout de 30.000 ms vía `AbortController`; 60.000 bytes / ~15.000 tokens estimados, aplicados sobre los bytes exactos a enviar y **fallando cerrado** en lugar de truncar. |
| Humano en el bucle | el cableado previsto inyecta el provider como `IAssistantTransport` de `SupervisedAssistantClient`, que a su vez está apagado por defecto y exige una aprobación humana explícita antes de alcanzar el transporte. |

**Datos transmitidos.** A través de la costura gobernada `IAssistantTransport`:
la intención de la petición, el id opcional de la herramienta, los parámetros de
la petición, el flag `dryRun` y el catálogo de skills gobernadas (solo id y
descripción). A través de la costura obsoleta `ILLMProvider`
(`generateStructuredJson`): el system prompt y el user prompt del llamante
literalmente. Ambas se redactan de secretos antes de serializar, sobre 8 clases
de patrones — claves privadas PEM, JWTs, access key ids de AWS, claves de API de
Google, PATs de GitHub, tokens de Slack, tokens `Bearer` y asignaciones genéricas
de `KEY`/`SECRET`/`TOKEN`/`PASSWORD`.

**Datos excluidos deliberadamente.** El id de tenant, el id de producto, el id de
iniciativa, la referencia de workspace, la identidad del solicitante y el
contenido del repositorio no forman parte del payload de transporte, por
construcción.

**Auditabilidad.** Cada intento, incluidos los rechazos, emite una línea JSON sin
contenido con el prefijo `[evolith:llm-egress]` que lleva provider, endpoint,
propósito, resultado, conteos de bytes y tokens, número de redacciones, estado
HTTP, duración e id de correlación. El contenido del prompt y de la respuesta
nunca se registra.

### Sub-encargados del tratamiento

| Sub-encargado | Propósito | Cuándo se activa |
|---|---|---|
| Google LLC — Gemini API | Inferencia LLM para la ruta de asistente/plan del agent-runtime | Solo cuando la salida LLM se arma explícitamente vía `EVOLITH_LLM_EGRESS`; nunca por defecto |

Un colector de OpenTelemetry configurado por el operador (`OTEL_ENABLED=true`)
recibe trazas del CLI, pero es el endpoint del propio operador, no un encargado
del lado de los mantenedores.

### Limitaciones conocidas de estos controles

Se declaran para que una persona revisora no tenga que descubrirlas:

- La redacción se basa en patrones, no es un control de prevención de pérdida de
  datos: reduce materialmente la fuga accidental de credenciales, no garantiza su
  ausencia.
- Los controles de cabecera, timeout, presupuesto, redacción y esquema de
  respuesta están cubiertos por tests unitarios con un `fetch` inyectado. **No**
  se han ejercitado contra el endpoint real de Google.
- Los valores de timeout y presupuesto se heredan del propio revisor de CI del
  repositorio y no están afinados para prompts interactivos grandes, que fallan
  cerrado en lugar de degradarse.
- Ningún comando registrado en el CLI publicado alcanza hoy este provider, así
  que una instalación por defecto del CLI no realiza ninguna salida LLM.
- Los tarballs de npm actualmente en el registro son anteriores a este
  endurecimiento; los controles descritos arriba están en `develop` y llegan al
  registro con la siguiente release. Hasta entonces, trata el `GeminiProvider`
  publicado como no gobernado y no lo armes.
- El repositorio todavía no ejecuta contra sí mismo las 9 reglas bloqueantes
  `AAI-*` de IA agéntica del propio producto en CI; esa puerta sigue abierta.

## Postura Operativa de Seguridad

Como referencia, este proyecto ya aplica:

- Escaneo de dependencias vía Dependabot y `npm audit` (puerta de CI en
  `--audit-level=high`).
- SAST vía CodeQL, escaneo de contenedores y sistema de ficheros vía Trivy, y
  escaneo de secretos vía gitleaks en CI (`.github/workflows/sdk-cli-ci.yml`).
  `CodeQL SAST` es un check de estado **requerido** tanto en `main` como en
  `develop`.
- Escaneo de secretos de GitHub con protección de push habilitada en el
  repositorio.
- Validación de entrada, cabeceras de seguridad (`helmet`), limitación de tasa y
  autenticación por API key en las superficies ejecutables.
- Los secretos nunca se commitean; `.env` está en gitignore y las credenciales se
  gestionan fuera del repositorio.

### Postura de cadena de suministro: medida, no afirmada

La prosa no es una postura. La lista anterior dice qué existe; no puede decir si
seguirá siendo cierta el mes que viene. Dos artefactos responden a eso en su
lugar:

- **Una puntuación numérica, automatizada y externa.**
  [OpenSSF Scorecard](https://scorecard.dev) se ejecuta semanalmente desde
  `.github/workflows/openssf-scorecard.yml`, publica en la API pública de OpenSSF,
  sube SARIF a code scanning y —esta es la parte que lo convierte en una medida—
  se compara contra los suelos comprometidos en
  `.harness/security/scorecard-baseline.json` mediante una puerta que **falla el
  workflow ante una regresión**.
- **Un mapeo control por control**, con la verificación detrás de cada fila, más
  el objetivo SLSA declarado y un inventario honesto de la distancia hasta él:
  [Postura de Cadena de Suministro y Repositorio](./reference/core/control-center/security/supply-chain-posture.es.md).

**Verificar lo que instalas.** Los paquetes publicados por
`.github/workflows/npm-release.yml` llevan atestaciones de provenance de npm,
firmadas vía Sigstore contra una identidad OIDC de GitHub. Verifícalas tú mismo:

```bash
npm audit signatures
```

Siete de los ocho paquetes `@beyondnet/evolith-*` llevan una atestación en su
versión `latest` a fecha de 2026-07-30; `@beyondnet/evolith-contracts` y toda
versión publicada antes de que ese workflow existiera, no. El documento de
postura nombra cada hueco y a quién le toca cerrarlo, en lugar de redondear al
alza.
