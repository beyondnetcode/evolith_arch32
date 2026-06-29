# Política de Seguridad

> **Navegación Bilingüe:** [English version](./SECURITY.md)

Los mantenedores de Evolith se toman en serio la seguridad del framework y de sus
superficies de ejecución (CLI, servidor MCP y la Service CORE API). Este documento
explica qué versiones reciben actualizaciones de seguridad y cómo reportar una
vulnerabilidad de forma responsable.

## Versiones Soportadas

Las correcciones de seguridad se aplican a la última línea de release menor. Las
líneas anteriores no reciben backports; por favor actualizá a una versión soportada
antes de reportar.

| Versión | Soportada          | Notas                                       |
| ------- | ------------------ | ------------------------------------------- |
| 1.1.x   | :white_check_mark: | Línea estable actual — parcheada activamente |
| 1.0.x   | :white_check_mark: | Solo correcciones críticas                  |
| < 1.0   | :x:                | Pre-release; sin soporte                    |

## Reportar una Vulnerabilidad

**Por favor no abras issues, pull requests ni discusiones públicas de GitHub para
vulnerabilidades de seguridad.** La divulgación pública antes de que exista una
corrección pone en riesgo a todos los usuarios.

Usá uno de los canales privados a continuación:

1. **GitHub Private Vulnerability Reporting (preferido).** Andá a la pestaña
   **Security → Report a vulnerability** del repositorio
   (<https://github.com/beyondnetcode/evolith_arch32/security/advisories/new>).
   Esto abre un advisory privado visible solo para vos y los mantenedores.
2. **Email.** Escribí a **beyondnet.peru@gmail.com** con el asunto
   `[SECURITY] Evolith — <resumen corto>`. Si querés cifrar el reporte, pedí la
   clave pública del mantenedor en un primer mensaje de contacto sin detalles
   sensibles.

### Qué incluir

Para ayudarnos a triar rápido, por favor proporcioná:

- Una descripción de la vulnerabilidad y su impacto.
- El componente afectado (CLI, servidor MCP, Core API, un ruleset/policy
  específico, una dependencia) y la versión (`1.1.0`, commit SHA o branch).
- Instrucciones de reproducción paso a paso o una prueba de concepto.
- Cualquier mitigación conocida o corrección sugerida.

### Alcance

**Dentro de alcance:** el código fuente de Evolith en este repositorio — `sdk/`,
`apps/`, `packages/`, las políticas OPA y rulesets bajo `rulesets/`, el harness de
CI/CD (`.harness/`, `.github/workflows/`) y los paquetes publicados `@evolith/*`.

**Fuera de alcance:** dependencias de terceros (reportalas upstream; las rastreamos
vía Dependabot y `npm audit`), problemas que requieran una máquina de desarrollo
comprometida o credenciales ya filtradas, y hallazgos en documentación de
ejemplo/referencia que no afecten superficies ejecutables.

## Objetivos de Respuesta

Estos son objetivos de buena fe para un proyecto mantenido por la comunidad, no
garantías contractuales:

| Etapa                                 | Objetivo                          |
| ------------------------------------- | --------------------------------- |
| Acuse de recibo del reporte           | Dentro de 3 días hábiles          |
| Evaluación inicial / triage           | Dentro de 7 días hábiles          |
| Corrección o mitigación para High/Critical | Dentro de 30 días (mejor esfuerzo) |
| Divulgación pública coordinada        | Después de liberar una corrección |

## Proceso de Divulgación

1. Reportás de forma privada por uno de los canales anteriores.
2. Confirmamos la recepción, evaluamos la severidad (estilo CVSS: Low / Medium /
   High / Critical) y podemos hacer preguntas aclaratorias.
3. Desarrollamos y probamos una corrección en una rama privada.
4. Liberamos una versión parcheada y publicamos un GitHub Security Advisory
   acreditando al reportante (salvo que se solicite anonimato).
5. Coordinamos la línea de tiempo de divulgación pública con vos.

## Reconocimiento

Estamos agradecidos con los investigadores de seguridad que reportan de forma
responsable. Con tu consentimiento, te acreditaremos en el advisory publicado y en
el `CHANGELOG.md`.

## Postura Operativa de Seguridad

Como referencia, este proyecto ya aplica:

- Escaneo de dependencias vía Dependabot y `npm audit` (gate de CI en `--audit-level=high`).
- SAST vía CodeQL, escaneo de contenedores/filesystem vía Trivy, y escaneo de
  secretos vía gitleaks en CI (`.github/workflows/sdk-cli-ci.yml`).
- Validación de entrada, headers de seguridad (`helmet`), rate limiting y
  autenticación por API-key en las superficies ejecutables.
- Los secretos nunca se commitean; `.env` está en `.gitignore` y las credenciales
  se gestionan fuera del repositorio.
