# Repository Approved Tools Inventory


---

## 1. Filesystem Interaction (Provided by Host / Shell)
* **`read_file`**: Lee el contenido de un archivo de texto de forma segura.
* **`write_to_file`**: Sobrescribe o crea archivos de texto. Requiere ganchos de verificación después de la ejecución.
* **`ls/list_dir`**: Lista recursivamente la estructura de un directorio.
* **`grep_search`**: búsqueda rápida de subcadenas en toda la base de código.
## 2. Software Life-Cycle Tools (Executed via Terminal Harness)
* **`run_command`**: Ejecuta comandos bash/ps1 arbitrarios. **CRÍTICO**: Altamente restringido. No se puede ejecutar en CI/CD sin una zona de pruebas dura.
* **`npm_run`**: Específicamente diseñado para ejecutar activadores de scripts de repositorio estándar definidos en `package.json`.
* **`git_commit`**: permite al agente verificar el progreso automáticamente.
## 3. Corporate MCP Catalog (Under Active Development)
* *Próximamente*: `confluence_search`: para proporcionar un contexto de arquitectura centralizada.
* *Próximamente*: `jira_update_ticket`: para sincronizar el progreso del desarrollo con los tickets administrativos.
* *Próximamente*: `sentry_fetch_issue`: para enviar registros de errores de producción reales a los agentes de depuración.

---
[Volver al índice](./README.md)