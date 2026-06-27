# Política de Seguridad

> **Navegación bilingüe:** [English Version](./SECURITY.md)

Los mantenedores de Evolith se toman en serio la seguridad del framework y de
sus superficies de ejecución (CLI, servidor MCP y Service CORE API). Este
documento explica qué versiones reciben actualizaciones de seguridad y cómo
reportar una vulnerabilidad de forma responsable.

## Versiones Soportadas

Las correcciones de seguridad se aplican a la última línea de versión menor. Las
líneas antiguas no reciben *backports*; por favor actualiza a una versión
soportada antes de reportar.

| Versión | Soportada          | Notas                                       |
| ------- | ------------------ | ------------------------------------------- |
| 1.1.x   | :white_check_mark: | Línea estable actual — parcheada activamente |
| 1.0.x   | :white_check_mark: | Solo correcciones críticas                  |
| < 1.0   | :x:                | Pre-release; sin soporte                     |

## Cómo Reportar una Vulnerabilidad

**Por favor, no abras *issues*, *pull requests* ni *discussions* públicos para
vulnerabilidades de seguridad.** La divulgación pública antes de que exista una
corrección pone en riesgo a todos los usuarios.

Usa uno de los canales privados siguientes:

1. **Reporte Privado de Vulnerabilidades de GitHub (preferido).** Ve a la
   pestaña **Security → Report a vulnerability** del repositorio
   (<https://github.com/beyondnetcode/evolith_arch32/security/advisories/new>).
   Esto abre un *advisory* privado visible solo para ti y los mantenedores.
2. **Correo electrónico.** Escribe a **beyondnet.peru@gmail.com** con el asunto
   `[SECURITY] Evolith — <resumen corto>`. Si deseas cifrar el reporte, solicita
   la clave pública del mantenedor en un primer mensaje sin detalles sensibles.

### Qué incluir

Para ayudarnos a clasificar rápido, por favor incluye:

- Una descripción de la vulnerabilidad y su impacto.
- El componente afectado (CLI, servidor MCP, Core API, un ruleset/policy
  específico, una dependencia) y la versión (`1.1.0`, SHA del commit o rama).
- Pasos de reproducción o una prueba de concepto.
- Mitigaciones conocidas o correcciones sugeridas.

### Alcance

**Dentro de alcance:** el código fuente de Evolith en este repositorio —
`sdk/`, `apps/`, `packages/`, las políticas OPA y rulesets bajo `rulesets/`, el
*harness* de CI/CD (`.harness/`, `.github/workflows/`) y los paquetes publicados
`@evolith/*`.

**Fuera de alcance:** dependencias de terceros (repórtalas *upstream*; las
seguimos vía Dependabot y `npm audit`), problemas que requieren una máquina de
desarrollo ya comprometida o credenciales ya filtradas, y hallazgos en
documentación de ejemplo/referencia que no afectan superficies ejecutables.

## Objetivos de Respuesta

Son objetivos de buena fe para un proyecto mantenido por la comunidad, no
garantías contractuales:

| Etapa                              | Objetivo                          |
| ---------------------------------- | --------------------------------- |
| Acuse de recibo del reporte        | En 3 días hábiles                 |
| Evaluación inicial / triaje        | En 7 días hábiles                 |
| Corrección o mitigación Alta/Crítica | En 30 días (mejor esfuerzo)     |
| Divulgación pública coordinada     | Tras publicar una corrección      |

## Proceso de Divulgación

1. Reportas en privado por uno de los canales anteriores.
2. Confirmamos recepción, evaluamos severidad (estilo CVSS: Baja / Media / Alta
   / Crítica) y podemos pedir aclaraciones.
3. Desarrollamos y probamos una corrección en una rama privada.
4. Publicamos una versión parcheada y un GitHub Security Advisory acreditando a
   quien reportó (salvo que se solicite anonimato).
5. Coordinamos contigo el calendario de divulgación pública.

## Reconocimiento

Agradecemos a quienes investigan y reportan de forma responsable. Con tu
consentimiento, te acreditaremos en el *advisory* publicado y en el
`CHANGELOG.md`.

## Postura Operativa de Seguridad

Como referencia, este proyecto ya aplica:

- Escaneo de dependencias vía Dependabot y `npm audit` (gate de CI a
  `--audit-level=high`).
- SAST vía CodeQL, escaneo de contenedores/sistema de archivos vía Trivy y
  escaneo de secretos vía gitleaks en CI (`.github/workflows/sdk-cli-ci.yml`).
- Validación de entrada, cabeceras de seguridad (`helmet`), *rate limiting* y
  autenticación por API-key en las superficies ejecutables.
- Los secretos nunca se commitean; `.env` está en `.gitignore` y las
  credenciales se gestionan fuera del repositorio.
