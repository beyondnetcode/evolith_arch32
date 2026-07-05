# Guía de Integración MCP de Evolith para Agentes IA

## Descripción General

La CLI de Evolith incluye un servidor de Protocolo de Contexto de Modelo (MCP) que permite a los agentes de IA interactuar con las herramientas de gobernanza de Evolith. Esta guía muestra cómo configurar y usar Evolith con asistentes de codificación de IA populares.

## ¿Qué es MCP?

El Protocolo de Contexto de Modelo es un estándar para que los agentes de IA utilicen herramientas. Cuando configuras Evolith como un servidor MCP, los agentes de IA como Cursor o Claude pueden:

1. **Descubrir herramientas disponibles** - El agente consulta `tools/list` para ver qué puede hacer
2. **Llamar herramientas** - El agente invoca `tools/call` con el nombre de la herramienta y sus argumentos
3. **Leer recursos** - El agente accede a documentación y datos
4. **Usar prompts** - El agente obtiene guías estructuradas para flujos de trabajo

---

## Configuración de Cursor AI

### 1. Instalar Evolith CLI

```bash
npm install -g @evolith/smart-cli
```

### 2. Configurar el Servidor MCP

Crea o edita `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "evolith": {
      "command": "smart-cli",
      "args": ["mcp", "serve"],
      "env": {
        "EVOLITH_CORE_PATH": "/path/to/evolith"
      }
    }
  }
}
```

### 3. Reiniciar Cursor AI

Cierra y vuelve a abrir Cursor AI para cargar la nueva configuración MCP.

### 4. Usar Evolith en Cursor

Una vez configurado, puedes conversar con Cursor:

```
Usuario: Valida mi repositorio
→ Cursor llama a la herramienta evolith-validate
→ Muestra los resultados de validación

Usuario: Muéstrame la matriz de ADR
→ Cursor llama a la herramienta evolith-adr-list
→ Muestra los ADR con su estado

Usuario: Instala un agente estándar
→ Cursor llama a la herramienta evolith-agent-install
→ Guía a través de la instalación
```

---

## Configuración de Claude Desktop

### 1. Instalar Evolith CLI

```bash
npm install -g @evolith/smart-cli
```

### 2. Configurar el Servidor MCP

Edita `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "evolith": {
      "command": "smart-cli",
      "args": ["mcp", "serve"],
      "env": {
        "EVOLITH_CORE_PATH": "/path/to/evolith"
      }
    }
  }
}
```

### 3. Reiniciar Claude Desktop

Cierra y vuelve a abrir Claude Desktop para cargar la configuración MCP.

---

## Herramientas Disponibles

### Herramientas de Validación

#### `evolith-validate`

Valida el cumplimiento del repositorio contra los estándares de Evolith.

**Argumentos:**
```typescript
{
  path: string;           // Ruta al repositorio (requerido)
  format?: 'json' | 'summary' | 'table';  // Formato de salida
  ruleset?: string;       // Conjunto de reglas específico (acl, open-core, etc.)
  corePath?: string;      // Ruta a Evolith Core
}
```

**Ejemplo:**
```javascript
const result = await callTool('evolith-validate', {
  path: '/user/project',
  format: 'summary'
});
// Devuelve: { status: 'passed', rulesChecked: 12, issues: [] }
```

#### `evolith-architecture-validate`

Valida la arquitectura del repositorio contra las reglas F1/F2/F3.

**Argumentos:**
```typescript
{
  path: string;
  level?: 'F1' | 'F2' | 'F3';  // Nivel de arquitectura
}
```

---

### Herramientas ADR

#### `evolith-adr-list`

Lista todos los ADR en el repositorio.

**Argumentos:**
```typescript
{
  status?: string;  // Filtrar por estado (accepted, proposed, etc.)
}
```

#### `evolith-adr-get`

Obtiene detalles de un ADR específico.

**Argumentos:**
```typescript
{
  id: string;  // ID del ADR (ej., "ADR-0002")
}
```

---

### Herramientas de Agente

#### `evolith-agent-install`

Instala un nuevo agente de Evolith.

**Argumentos:**
```typescript
{
  name: string;              // Nombre del agente
  template?: string;         // Plantilla (standard, minimal, enterprise)
  dir?: string;              // Directorio de instalación
}
```

#### `evolith-agent-list`

Lista los agentes instalados.

**Argumentos:**
```typescript
{
  dir?: string;  // Directorio a buscar
}
```

#### `evolith-agent-validate`

Valida el conjunto de reglas de un agente.

**Argumentos:**
```typescript
{
  name: string;  // Nombre del agente
  dir?: string;  // Directorio del agente
}
```

---

### Herramientas SDLC

#### `evolith-sdlc-handoff`

Genera un manifiesto de transferencia de fase.

**Argumentos:**
```typescript
{
  path: string;           // Ruta del repositorio
  fromPhase: string;      // Fase de origen (phase-0, phase-1, etc.)
  toPhase: string;        // Fase de destino
}
```

#### `evolith-sdlc-status`

Muestra el estado actual de la fase SDLC.

**Argumentos:**
```typescript
{
  path: string;  // Ruta del repositorio
}
```

---

### Herramientas de Configuración

#### `evolith-config-get`

Obtiene un valor de configuración.

**Argumentos:**
```typescript
{
  key: string;  // Clave de configuración (ej., "coreRef.version")
  dir?: string; // Directorio del repositorio
}
```

#### `evolith-config-set`

Establece un valor de configuración.

**Argumentos:**
```typescript
{
  key: string;   // Clave de configuración
  value: string; // Nuevo valor
  dir?: string;  // Directorio del repositorio
}
```

---

### Métricas

#### `evolith-metrics`

Obtiene métricas de uso del servidor MCP.

**Argumentos:** `{}` (ninguno)

---

## Ejemplos de Sesiones de Agente IA

### Sesión 1: Validación de Repositorio

```
Humano: Por favor, valida mi repositorio y corrige cualquier problema

Claude: Validaré tu repositorio contra los estándares de Evolith.

await callTool('evolith-validate', {
  path: '/user/project',
  format: 'summary'
})

Resultado: La validación encontró 2 problemas bloqueantes:
- GOV-01: falta evolith.yaml
- INH-02: Versión de Core no fijada

Claude: Encontré 2 problemas que necesitan corrección:

1. **falta evolith.yaml** - Tu repositorio no tiene el archivo de configuración requerido.

2. **Versión de Core no fijada** - El archivo evolith.yaml no especifica coreRef.version.

Déjame ayudarte a corregirlos:
```

### Sesión 2: Gestión de ADR

```
Humano: Crea un nuevo ADR para nuestra decisión sobre la base de datos

Claude: Crearé un nuevo Registro de Decisión de Arquitectura para tu elección de base de datos.

await callTool('evolith-adr-create', {
  title: 'Usar PostgreSQL como Base de Datos Principal',
  context: 'Necesitamos seleccionar una base de datos para nuestro almacén de datos principal...',
  decision: 'Decidimos usar PostgreSQL porque...',
  consequences: {
    positive: ['Cumplimiento ACID', 'Indexación rica', 'Soporte JSON'],
    negative: ['Requiere más memoria', 'Complejidad de migración']
  }
})

Resultado: ADR-0042 creado exitosamente
```

### Sesión 3: Instalación de Agente

```
Humano: Configura la gobernanza de Evolith para nuestro proyecto

Claude: Inicializaré la gobernanza de Evolith e instalaré el agente estándar.

Primero, revisemos el estado actual:

await callTool('evolith-sdlc-status', { path: '/user/project' })

Resultado: No se encontró evolith.yaml. Inicializando...

Ahora instalando el agente estándar:

await callTool('evolith-agent-install', {
  name: 'governance-agent',
  template: 'standard',
  dir: '/user/project'
})

Resultado: Agente instalado exitosamente con 6 conjuntos de reglas

Claude: ✅ ¡Gobernanza de Evolith inicializada!

Tu proyecto ahora tiene:
- Archivo de configuración evolith.yaml
- Agente estándar con 6 conjuntos de reglas
- Registro ADR (vacío, listo para la primera decisión)
```

---

## Recursos

El servidor MCP proporciona estos recursos:

### `evolith://adr-registry`
Lista todos los ADR con metadatos.

### `evolith://standards`
Estándares de gobernanza disponibles.

### `evolith://agents`
Agentes instalados y sus conjuntos de reglas.

---

## Prompts

El servidor MCP incluye prompts para flujos de trabajo comunes:

### `handoff-template`
Genera una plantilla de manifiesto de transferencia de fase.

### `adr-creation`
Guía a través del proceso de creación de ADR.

---

## Solución de Problemas

### Herramienta no encontrada

Si la IA dice "Herramienta no encontrada", verifica:
1. El servidor MCP está ejecutándose: `evolith-mcp serve`
2. La configuración es correcta en mcp.json
3. Reinicia la aplicación de IA

### Permiso denegado

Asegúrate de que la aplicación de IA tenga permiso para ejecutar `evolith`.

### Timeout

Para operaciones largas, aumenta el timeout en la configuración MCP:

```json
{
  "mcpServers": {
    "evolith": {
      "command": "smart-cli",
      "args": ["mcp", "serve"],
      "timeout": 30000
    }
  }
}
```

---

## Variables de Entorno

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `EVOLITH_CORE_PATH` | Ruta a Evolith Core | Auto-detect |
| `EVOLITH_CONFIG_PATH` | Ubicación de configuración personalizada | `~/.evolith` |
| `EVOLITH_LOG_LEVEL` | Nivel de registro | `info` |

---

## Próximos Pasos

1. Configura tu asistente IA con el servidor MCP
2. Intenta validar un repositorio existente
3. Crea tu primer ADR
4. Instala un agente para gobernanza automatizada
