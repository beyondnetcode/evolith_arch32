# ADR-0122: Estándar de seguridad en la ejecución de shell

> **Navegación Bilingüe:** [English Version](./0122-shell-execution-safety-standard.md)

| Campo | Valor |
|---|---|
| **Estado** | Aceptado |
| **Fecha** | 2026-07-23 |
| **Decisores** | Comité de Arquitectura |
| **Historia técnica** | OWASP A03 — inyección (CWE-78, CWE-88) |

## Contexto

Varios componentes ejecutaban comandos de shell: la herramienta de andamiaje del MCP usaba `exec()`, el evaluador OPA de la Core API usaba `exec()`, y el adaptador de procesos del harness en agent-runtime usaba `sh -c` con interpolación de cadenas. El CLI tenía dos métodos: `execute()` (con shell) y `executeFile()` (sin shell).

## Decisión

### 1. Por defecto, ejecución sin shell
- Toda ejecución de comandos nueva DEBE usar `execFile()` o `spawn()` con arrays de argumentos.
- `exec()` (con shell) queda PROHIBIDO en código nuevo.
- El uso existente de `exec()` DEBE migrarse a `execFile()`, con su GT-xx registrado.

### 2. La entrada del usuario nunca llega al shell
- Los parámetros derivados de entrada del usuario NO DEBEN interpolarse en cadenas de comando.
- Los valores controlados por el usuario se pasan por variables de entorno o por el array de argumentos de `spawn()`.

### 3. Validación contra lista de permitidos
- Los parámetros que determinan qué binario o script se ejecuta DEBEN validarse contra una lista de permitidos.
- Por ejemplo: `frontend` → `['react', 'angular', 'vue']` antes de pasarlo a NxWorkspaceStrategy.

### 4. El runner `shell` del harness
- El runner `shell` de `HarnessProcessAdapter` DEBE pasar los argumentos por stdin o por variables de entorno, NUNCA interpolándolos en la línea de comandos.
- Los scripts de shell DEBEN leer de `$AGENT_RUNTIME_ARGS` o de stdin.

### 5. Política de obsolescencia
- `execute()` (con shell) y `NpmProvider.exec()` quedan obsoletos.
- Todos los llamadores DEBEN migrar a `executeFile()` en un plazo de 90 días.

## Consecuencias

- El patrón de `GT-346` (superficie de inyección de shell cerrada) pasa a ser estándar corporativo.
- Todo script de CI y toda capacidad del harness nuevos han de usar ejecución sin shell.
- `CommandExecutor.executeFile()` es el método canónico de ejecución segura.

## ADRs relacionados

- ADR-0073 (contrato unificado de salida del CLI)
- GT-346 (superficie de inyección de shell cerrada)
- GT-251 (inyección de comandos en el comando update, corregida)

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
