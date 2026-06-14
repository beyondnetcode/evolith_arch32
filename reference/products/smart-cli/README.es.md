# Evolith CLI

Interfaz de línea de comandos para gobernanza, validación de estándares e integración con agentes IA.

## Características

- **Gobernanza**: Gestión de ADR, seguimiento de estándares, instalación de agentes
- **Validación**: Cumplimiento del repositorio contra los estándares de Evolith
- **Integración IA**: Servidor MCP para llamadas de herramientas de agentes IA
- **Observabilidad**: Logging estructurado, métricas, reporte de errores

## Instalación

### npm (Recomendado)

```bash
npm install -g @evolith/smart-cli
```

### Manual

Descarga el binario más reciente desde [GitHub Releases](https://github.com/beyondnetcode/evolith_arch32/releases) y agrégalo a tu PATH.

### Verificar Instalación

```bash
smart-cli --version
# smart-cli version 1.1.0
```

## Inicio Rápido

### 1. Inicializar un Repositorio

```bash
cd tu-proyecto
smart-cli init
```

Esto crea un archivo `evolith.yaml` con la configuración por defecto.

### 2. Ejecutar la Primera Validación

```bash
smart-cli validate
```

Salida:
```
✓ Validando repositorio...
✓ El repositorio cumple con los estándares de Evolith
```

### 3. Instalar un Agente

```bash
smart-cli agents install
# Seleccionar la plantilla "standard" cuando se solicite
```

## Comandos

### validate

Valida el cumplimiento del repositorio contra los estándares de Evolith.

```bash
smart-cli validate [opciones]

Opciones:
  --satellite <ruta>    Ruta al repositorio satélite (por defecto: cwd)
  --core <ruta>         Ruta a Evolith Core
  --format <formato>    Formato de salida: json, table, yaml, markdown
  --output <archivo>    Escribir salida a archivo
  --ruleset <id>        Validar ruleset específico (acl, open-core, inheritance)
  --engine <engine>     Motor de evaluación de políticas: native u opa (por defecto: native)
```

**Evaluación de Políticas Dual-Engine:**
La CLI soporta la evaluación de políticas utilizando el motor integrado en TypeScript (`native`) o módulos WebAssembly de Open Policy Agent (`opa`). Ver [Core ADR-0041](../../architecture/adrs/core/0041-dual-engine-policy-evaluation.es.md) para más detalles.

**Ejemplos:**

```bash
# Validación básica
smart-cli validate

# Salida JSON para automatización
smart-cli validate --format json

# Salida en tabla para humanos
smart-cli validate --format table

# Validar ruleset específico
smart-cli validate --ruleset acl
```

### adr

Gestionar Registros de Decisiones de Arquitectura.

```bash
smart-cli adr <comando>

Comandos:
  create     Crear nuevo ADR
  list       Listar todos los ADR
  get        Mostrar detalles del ADR
  update     Actualizar ADR existente
  matrix     Mostrar matriz de ADR
```

**Ejemplos:**

```bash
# Crear nuevo ADR
smart-cli adr create

# Listar todos los ADR
smart-cli adr list

# Obtener ADR específico
smart-cli adr get ADR-0002
```

### standards

Gestionar estándares de gobernanza.

```bash
smart-cli standards <comando>

Comandos:
  init       Inicializar directorio de estándares
  list       Listar todos los estándares
  get        Mostrar detalles del estándar
  validate   Validar contra estándares
  export     Exportar estándar a markdown/json
```

**Ejemplos:**

```bash
# Inicializar estándares
smart-cli standards init

# Listar estándares
smart-cli standards list
```

### agents

Instalar y gestionar agentes de Evolith.

```bash
smart-cli agents <comando>

Comandos:
  install    Instalar nuevo agente
  list       Listar agentes instalados
  remove     Eliminar agente
  validate   Validar ruleset del agente
  upgrade    Actualizar agente
```

**Ejemplos:**

```bash
# Instalación interactiva
smart-cli agents install

# Listar agentes
smart-cli agents list
```

### history

Ver y gestionar historial de comandos.

```bash
smart-cli history [opciones]

Opciones:
  --list              Listar comandos recientes
  --get <id>          Mostrar detalles del comando
  --search <consulta> Buscar comandos
  --stats             Mostrar estadísticas
  --clear             Limpiar historial
```

**Ejemplos:**

```bash
# Mostrar últimos 20 comandos
smart-cli history

# Mostrar estadísticas
smart-cli history --stats

# Buscar comandos
smart-cli history --search validate
```

### completion

Generar scripts de completado de shell.

```bash
smart-cli completion --install <shell>

Shells soportados: bash, zsh, fish
```

**Ejemplos:**

```bash
# Instalar completado bash
smart-cli completion --install bash

# Instalar completado zsh
smart-cli completion --install zsh
```

## Servidor MCP (Integración con Agentes IA)

La CLI de Evolith incluye un servidor MCP para integración con agentes IA.

### Iniciar el Servidor MCP

```bash
smart-cli mcp serve
```

El servidor se comunica vía stdio JSON-RPC.

### Smoke Test MCP

Usar el smoke test antes de releases o cambios de protocolo MCP:

```bash
npm run mcp:smoke
```

El smoke verifica `initialize`, `tools/list`, `resources/list`, `prompts/list` y una llamada real `tools/call` mediante la CLI compilada.

También puedes iniciar en modo HTTP:

```bash
smart-cli mcp serve --transport http --port 3000
```

### Herramientas MCP Disponibles

| Herramienta | Descripción |
|-------------|-------------|
| `evolith-validate` | Validar cumplimiento del repositorio |
| `evolith-agent-install` | Instalar nuevo agente |
| `evolith-agent-list` | Listar agentes instalados |
| `evolith-agent-validate` | Validar ruleset del agente |
| `evolith-agent-upgrade` | Actualizar un agente existente |
| `evolith-agent-remove` | Eliminar un agente |
| `evolith-architecture-validate` | Validar arquitectura (F1/F2/F3) con análisis profundo opcional |
| `evolith-sdlc-handoff` | Generar manifiesto de artefactos de transición de fase |
| `evolith-sdlc-status` | Mostrar estado de phase gate SDLC |
| `evolith-config-get` | Obtener valor de configuración de `evolith.yaml` |
| `evolith-config-set` | Establecer valor de configuración en `evolith.yaml` |
| `evolith-metrics` | Obtener métricas del servidor MCP |
| `evolith-moscow-create` | Crear un nuevo análisis de priorización MoSCoW |
| `evolith-moscow-load` | Cargar un análisis MoSCoW existente |
| `evolith-moscow-update` | Actualizar un ítem en un análisis MoSCoW |
| `evolith-moscow-remove` | Eliminar un ítem de un análisis MoSCoW |
| `evolith-moscow-list` | Listar todos los análisis MoSCoW de un repositorio |
| `evolith-moscow-validate` | Validar la corrección de un análisis MoSCoW |
| `evolith-moscow-report` | Generar un reporte markdown desde un análisis MoSCoW |

### Configuración para Cursor AI

Agregar a `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "evolith": {
      "command": "smart-cli",
      "args": ["mcp", "serve"]
    }
  }
}
```

### Configuración para Claude Desktop

Agregar a `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "evolith": {
      "command": "smart-cli",
      "args": ["mcp", "serve"]
    }
  }
}
```

## Ejemplo de Flujo de Trabajo con Agente IA

Cuando está integrado con un agente IA, puedes tener conversaciones como:

```
Tú: Valida mi repositorio
Agente: Déjame ejecutar la validación...

      await mcp.callTool('evolith-validate', {
        path: '/user/project',
        format: 'summary'
      })

Resultado: ✓ El repositorio cumple con los estándares de Evolith
         Reglas verificadas: 12
         Todas las puertas pasaron

Tú: Muéstrame el estado SDLC
Agente: Déjame verificar el estado de los phase gates...

      await mcp.callTool('evolith-sdlc-status', {
        path: '/user/project'
      })

Resultado: Fase 1 — 3 gates pasados, 0 fallados
         Todos los artefactos de evidencia presentes
```

## Configuración

Evolith usa un archivo `evolith.yaml` en la raíz del repositorio:

```yaml
coreRef:
  version: "1.0.0"
  path: "../../evolith"

governance:
  version: "1.0"
  adrRegistry:
    - id: "ADR-0001"
      status: "accepted"

product:
  name: "mi-proyecto"
  type: "library"
  runtime: "typescript"
```

## Formatos de Salida

Todos los comandos soportan múltiples formatos de salida:

```bash
# JSON (por defecto para automatización)
smart-cli validate --format json

# Tabla (legible para humanos)
smart-cli validate --format table

# YAML (integración en pipelines)
smart-cli validate --format yaml

# Markdown (documentación)
smart-cli validate --format markdown
```

## Solución de Problemas

### Comando no encontrado

Si `evolith` no se encuentra después de la instalación, asegúrate de que el binario global de npm está en tu PATH:

```bash
# Agregar a ~/.bashrc o ~/.zshrc
export PATH="$(npm config get prefix)/bin:$PATH"
```

### Servidor MCP no responde

Asegúrate de que el servidor MCP está corriendo:

```bash
smart-cli mcp serve &
```

### La validación falla

Verifica que tu `evolith.yaml` existe y es válido:

```bash
cat evolith.yaml
smart-cli validate --verbose
```

## Desarrollo

### Construir desde el Código Fuente

```bash
cd sdk/cli
npm install
npm run build
npm link  # Enlazar globalmente para pruebas
```

### Ejecutar Pruebas

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar con reporte de cobertura
npm run test:cov
```

**Cobertura (v1.1.0):** 80.65% statements · 81.47% lines · 1.206 tests unitarios + 121 E2E. La superficie instalable se rastrea en el [Inventario de Superficie del Producto](./product-inventory.es.md) generado.

### Estructura del Proyecto

```
sdk/cli/
├── src/
│   ├── commands/      # Comandos CLI (adr, validate, agents, etc.)
│   ├── application/   # Casos de uso
│   ├── domain/        # Lógica de negocio (servicios, entidades)
│   ├── infrastructure/# Integraciones externas (catálogo, CLI)
│   └── core/          # Compartido (DI, observabilidad, errores, MCP)
├── shell/             # Scripts de completado de shell
├── templates/         # Plantillas de configuración
└── docs/              # Documentación
```

## Documentación

- [Guía de Demo SMART CLI](docs/SMART-CLI-DEMO.es.md) - Guía completa que cubre todos los comandos, flujo SDLC, tipos de producto, integración MCP y validación de arquitectura
- [Visión](docs/VISION.es.md) - Visión y hoja de ruta de la CLI
- [Modelos de Datos](docs/data-models.es.md) - Modelos de datos del dominio
- [Integración MCP](docs/MCP-INTEGRATION.md) - Detalles de integración del servidor MCP

## Contribuir

1. Haz fork del repositorio
2. Crea una rama de característica
3. Haz cambios con pruebas
4. Envía un pull request

## Licencia

ISC

## Soporte

- [Documentación](https://github.com/beyondnetcode/evolith_arch32#readme)
- [Rastreador de Incidencias](https://github.com/beyondnetcode/evolith_arch32/issues)
- [Discusiones](https://github.com/beyondnetcode/evolith_arch32/discussions)
