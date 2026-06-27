# Política de Seguridad

> **Navegación Bilingüe:** [English version](./SECURITY.md)

Los mantenedores de Evolith toman muy en serio la seguridad del framework y sus
superficies de ejecución (CLI, servidor MCP y Service CORE API). Este documento
explica qué versiones reciben actualizaciones de seguridad y cómo reportar una
vulnerabilidad de forma responsable.

## Versiones con Soporte

Las correcciones de seguridad se aplican a la línea de versiones menores más
reciente. Las versiones anteriores no reciben backports; por favor actualiza a
una versión soportada antes de reportar.

| Versión | Soportada          | Notas                                      |
| ------- | ------------------ | ------------------------------------------ |
| 1.1.x   | :white_check_mark: | Línea estable actual — parcheada activamente |
| 1.0.x   | :white_check_mark: | Solo correcciones críticas                 |
| < 1.0   | :x:                | Pre-lanzamiento; sin soporte               |

## Reportar una Vulnerabilidad

**Por favor no abras issues públicos, pull requests ni discusiones en GitHub
para vulnerabilidades de seguridad.** La divulgación pública antes de que haya
un arreglo disponible pone en riesgo a todos los usuarios.

Usa uno de los canales privados a continuación:

1. **Reporte Privado de Vulnerabilidades de GitHub (preferido).** Ve a la
   pestaña **Security → Report a vulnerability** del repositorio
   (<https://github.com/beyondnetcode/evolith_arch32/security/advisories/new>).
   Esto abre un advisory privado visible solo para ti y los mantenedores.
2. **Correo electrónico.** Escribe a **beyondnet.peru@gmail.com** con el asunto
   `[SECURITY] Evolith — <resumen breve>`. Si deseas cifrar el reporte,
   solicita la clave pública del mantenedor en un primer mensaje sin detalles
   sensibles.

### Qué incluir

Para ayudarnos a priorizar rápidamente, por favor proporciona:

- Una descripción de la vulnerabilidad y su impacto.
- El componente afectado (CLI, servidor MCP, Core API, un ruleset/policy
  específico, una dependencia) y la versión (`1.1.0`, SHA del commit, o rama).
- Instrucciones de reproducción paso a paso o una prueba de concepto.
- Mitigaciones conocidas o correcciones sugeridas.

### Alcance

**En alcance:** el código fuente de Evolith en este repositorio — `sdk/`,
`apps/`, `packages/`, las políticas OPA y rulesets en `rulesets/`, el harness
de CI/CD (`.harness/`, `.github/workflows/`), y los paquetes publicados
`@evolith/*`.

**Fuera de alcance:** dependencias de terceros (repórtalas upstream; las
rastreamos via Dependabot y `npm audit`), issues que requieren una máquina de
desarrollador comprometida o credenciales ya filtradas, y hallazgos en
documentación de ejemplo/referencia que no afecten superficies ejecutables.

## Objetivos de Respuesta

Estos son objetivos de buena fe para un proyecto mantenido por la comunidad,
no garantías contractuales:

| Etapa                               | Objetivo                       |
| ----------------------------------- | ------------------------------ |
| Acuse de recibo del reporte         | Dentro de 3 días hábiles       |
| Evaluación inicial / triaje         | Dentro de 7 días hábiles       |
| Corrección para Alto/Crítico        | Dentro de 30 días (mejor esfuerzo) |
| Divulgación pública coordinada      | Después de publicar la corrección |

## Proceso de Divulgación

1. Reportas privadamente a través de uno de los canales anteriores.
2. Confirmamos recepción, evaluamos la severidad (estilo CVSS: Baja / Media /
   Alta / Crítica) y podemos hacer preguntas de clarificación.
3. Desarrollamos y probamos una corrección en una rama privada.
4. Publicamos una versión parcheada y un Security Advisory de GitHub
   acreditando al reportero (a menos que se solicite anonimato).
5. Coordinamos contigo el plazo de divulgación pública.

## Reconocimiento

Agradecemos a los investigadores de seguridad que reportan de forma responsable.
Con tu consentimiento, te acreditaremos en el advisory publicado y en el
`CHANGELOG.md`.

## Postura de Seguridad Operacional

Como referencia, este proyecto ya aplica:

- Escaneo de dependencias via Dependabot y `npm audit` (CI gate en `--audit-level=high`).
- SAST via CodeQL, escaneo de contenedor/filesystem via Trivy, y detección de
  secretos via gitleaks en CI (`.github/workflows/sdk-cli-ci.yml`).
- Validación de entrada, cabeceras de seguridad (`helmet`), limitación de tasa
  y autenticación por API-key en las superficies ejecutables.
- Los secretos nunca se commitean; `.env` está en git-ignore y las credenciales
  se gestionan fuera del repositorio.
