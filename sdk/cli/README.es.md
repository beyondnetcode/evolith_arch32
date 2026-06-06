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
npm install -g @evolith/cli
```

### Manual

Descarga el binario más reciente desde [GitHub Releases](https://github.com/beyondnetcode/evolith_arch32/releases) y agrégalo a tu PATH.

### Verificar Instalación

```bash
evolith --version
# evolith version 1.0.0
```

## Inicio Rápido

### 1. Inicializar un Repositorio

```bash
cd tu-proyecto
evolith init
```

Esto crea un archivo `evolith.yaml` con la configuración por defecto.

### 2. Ejecutar la Primera Validación

```bash
evolith validate
```

Salida:
```
✓ Validando repositorio...
✓ El repositorio cumple con los estándares de Evolith
```

### 3. Instalar un Agente

```bash
evolith agents install
# Seleccionar la plantilla "standard" cuando se solicite
```

## Comandos

### validate

Valida el cumplimiento del repositorio contra los estándares de Evolith.

```bash
evolith validate [opciones]

Opciones:
  --satellite <ruta>    Ruta al repositorio satélite (por defecto: cwd)
  --core <ruta>         Ruta a Evolith Core
  --format <formato>    Formato de salida: json, table, yaml, markdown
  --output <archivo>    Escribir salida a archivo
  --ruleset <id>        Validar ruleset específico (acl, open-core, inheritance)
```

**Ejemplos:**

```bash
# Validación básica
evolith validate

# Salida JSON para automatización
evolith validate --format json

# Salida en tabla para humanos
evolith validate --format table

# Validar ruleset específico
evolith validate --ruleset acl
```

### adr

Gestionar Registros de Decisiones de Arquitectura.

```bash
evolith adr <comando>

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
evolith adr create

# Listar todos los ADR
evolith adr list

# Obtener ADR específico
evolith adr get ADR-0002
```

### standards

Gestionar estándares de gobernanza.

```bash
evolith standards <comando>

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
evolith standards init

# Listar estándares
evolith standards list
```

### agents

Instalar y gestionar agentes de Evolith.

```bash
evolith agents <comando>

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
evolith agents install

# Listar agentes
evolith agents list
```

### history

Ver y gestionar historial de comandos.

```bash
evolith history [opciones]

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
evolith history

# Mostrar estadísticas
evolith history --stats

# Buscar comandos
evolith history --search validate
```

### completion

Generar scripts de completado de shell.

```bash
evolith completion --install <shell>

Shells soportados: bash, zsh, fish
```

**Ejemplos:**

```bash
# Instalar completado bash
evolith completion --install bash

# Instalar completado zsh
evolith completion --install zsh
```

## Servidor MCP (Integración con Agentes IA)

La CLI de Evolith incluye un servidor MCP para integración con agentes IA.

### Iniciar el Servidor MCP

```bash
evolith mcp serve
```

El servidor se comunica vía stdio JSON-RPC.

También puedes iniciar en modo HTTP:

```bash
evolith mcp serve --transport http --port 3000
```

### Herramientas MCP Disponibles

| Herramienta | Descripción |
|-------------|-------------|
| `evolith-validate` | Validar cumplimiento del repositorio |
| `evolith-agent-install` | Instalar nuevo agente |
| `evolith-agent-list` | Listar agentes instalados |
| `evolith-agent-validate` | Validar ruleset del agente |
| `evolith-architecture-validate` | Validar arquitectura |
| `evolith-sdlc-handoff` | Generar transición de fase |
| `evolith-sdlc-status` | Mostrar estado de fase SDLC |
| `evolith-config-get` | Obtener valor de configuración |
| `evolith-config-set` | Establecer valor de configuración |
| `evolith-metrics` | Obtener métricas del servidor MCP |

### Configuración para Cursor AI

Agregar a `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "evolith": {
      "command": "evolith",
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
      "command": "evolith",
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

Tú: Muéstrame los ADR
Agente: Déjame obtener la lista de ADR...

      await mcp.callTool('evolith-adr-list', {})

Resultado: Se encontraron 5 ADR:
         - ADR-0001: Plantilla de Registro de Decisión de Arquitectura
         - ADR-0002: Arquitectura Hexagonal (aceptado)
         - ADR-0003: Pirámide de Pruebas (aceptado)
```

## Configuración

Evolith usa un archivo `evolith.yaml` en la raíz del repositorio:

```yaml
coreRef:
  version: "1.0.0"
  path: "../evolith"

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
evolith validate --format json

# Tabla (legible para humanos)
evolith validate --format table

# YAML (integración en pipelines)
evolith validate --format yaml

# Markdown (documentación)
evolith validate --format markdown
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
evolith mcp serve &
```

### La validación falla

Verifica que tu `evolith.yaml` existe y es válido:

```bash
cat evolith.yaml
evolith validate --verbose
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
npm test
```

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