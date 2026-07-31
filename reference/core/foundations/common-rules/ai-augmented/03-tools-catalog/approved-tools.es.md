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

## 4. Evolith MCP Tools (Implemented)

> **Aquí no vive una segunda copia de los nombres de herramientas.** Esta página enumeraba 11 herramientas, de las cuales siete (`evolith-agent-handoff`, `evolith-architecture-evaluate`, `evolith-gate-status`, `evolith-moscow-analyze`, `evolith-moscow-export`, `evolith-alias`, `evolith-schema`) **nunca existieron o ya no existen en el código**. Un duplicado mantenido a mano de la superficie de herramientas deriva en cuanto se agrega o renombra una, así que se eliminó. No lo reintroduzcas.

El servidor MCP de Evolith registra **51** herramientas de gobernanza. La lista autoritativa, derivada de la fuente, es la tabla **Tool Inventory** del [Catálogo de Herramientas MCP de Evolith](./evolith-mcp-tools.es.md) — reconciliada desde los registros de herramientas en `src/packages/mcp-server/src/tools/`. Verificable con:

```bash
grep -rhoE "name: '(evolith-[a-z0-9-]+)'" src/packages/mcp-server/src/tools/*.ts \
  --exclude='*.spec.ts' | sort -u | wc -l   # -> 50
```

Ejemplos ilustrativos únicamente (no es un catálogo):

- `evolith-validate` - Validar un repositorio satélite contra las reglas de Evolith
- `evolith-sdlc-handoff` - Generar artefactos de handoff SDLC
- `evolith-phase-advance` - Proponer transiciones de fase
- `evolith-auto-fix` - **Auto-corregir violaciones arquitectónicas** (GT-115)

Todas las herramientas siguen los [Principios de Diseño de Herramientas](./tool-design-principles.es.md) para comportamiento determinístico consumible por agentes.

---
[Volver al índice](./README.md)