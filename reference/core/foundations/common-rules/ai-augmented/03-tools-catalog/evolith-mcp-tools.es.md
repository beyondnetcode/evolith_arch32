# Catálogo de Herramientas MCP de Evolith

Este documento cataloga todas las herramientas MCP proporcionadas por Evolith CLI para automatización con agentes de IA.

## Inventario de Herramientas

> **Tabla obsoleta retirada (GT-445).** Esta página listaba 11 herramientas; siete de ellas (`evolith-agent-handoff`, `evolith-architecture-evaluate`, `evolith-gate-status`, `evolith-moscow-analyze`, `evolith-moscow-export`, `evolith-alias`, `evolith-schema`) **no existen en el código**. La superficie real son **50** herramientas MCP de gobernanza. El inventario autoritativo, derivado de la fuente (`src/packages/mcp-server/src/tools/`), se mantiene en la tabla **Tool Inventory** de la [versión en inglés](./evolith-mcp-tools.md#tool-inventory); no se mantiene aquí una segunda copia traducida porque derivaría de la fuente. Regenerar la tabla en español es un follow-on de GT-445.

---

## Especificaciones de Herramientas

> **Subconjunto curado heredado — en proceso de ser superado.** Las especificaciones detalladas de abajo son anteriores a la superficie actual de 47 herramientas: varias documentan **nombres de herramientas obsoletos que ya no existen** (`evolith-agent-handoff`, `evolith-architecture-evaluate`, `evolith-gate-status`, `evolith-moscow-analyze`, `evolith-moscow-export`, `evolith-alias`, `evolith-schema`). La lista autoritativa y completa es la tabla **Tool Inventory** enlazada arriba. La regeneración completa de las especificaciones por herramienta desde la fuente es un follow-on (GT-445).

### evolith-agent-handoff

**Propósito:** Crear un archivo de configuración de agente nuevo con schema validado.

**Input Schema:**
```typescript
{
  agentName: string;
  description: string;
  role: "validator" | "generator" | "analyzer";
  rulesetId?: string;
}
```

**Output:** Archivo de configuración creado en `agents/{agentName}.yaml`

---

### evolith-architecture-evaluate

**Propósito:** Evaluar patrones de arquitectura contra rulesets definidos.

**Input Schema:**
```typescript
{
  rulesetId: string;
  dir?: string;
  format?: "text" | "json";
}
```

**Output:** Reporte de evaluación de arquitectura con violaciones y evidencia.

---

### evolith-gate-status

**Propósito:** Mostrar estado actual de validación de phase gates y métricas DORA.

**Input Schema:**
```typescript
{
  since?: number; // Días de historial git (default: 90)
}
```

**Output:** Estado de gates (passed/failed/pending) + dashboard de métricas DORA.

---

### evolith-moscow-analyze

**Propósito:** Ejecutar análisis de priorización MoSCoW en user stories.

**Input Schema:**
```typescript
{
  inputFile: string;
  outputFile?: string;
}
```

**Output:** Lista de historias priorizadas con categorías MoSCoW.

---

### evolith-moscow-export

**Propósito:** Exportar resultados de análisis MoSCoW a varios formatos.

**Input Schema:**
```typescript
{
  format: "markdown" | "json" | "csv";
  outputFile?: string;
}
```

**Output:** Archivo exportado con formato MoSCoW.

---

### evolith-sdlc-handoff

**Propósito:** Generar artefactos de handoff SDLC entre fases.

**Input Schema:**
```typescript
{
  fromPhase: string;
  toPhase: string;
  project?: string;
}
```

**Output:** Documentación de handoff con links a evidencia.

---

### evolith-validate

**Propósito:** Validar artefactos del proyecto contra requisitos de phase-gate.

**Input Schema:**
```typescript
{
  phase?: string;
  gate?: string;
  dir?: string;
  format?: "text" | "json";
}
```

**Output:** Reporte de validación con estado pass/fail por artefacto.

---

### evolith-phase-advance

**Propósito:** Proponer y evaluar transiciones de fase con evidencia.

**Input Schema:**
```typescript
{
  from: string; // Fase origen
  to: string;   // Fase destino
  project?: string;
  core?: string;
  evaluatedBy?: string;
  initiative?: string;
  tenant?: string;
  webhookUrl?: string;
  format?: "text" | "json";
}
```

**Output:** Propuesta de transición de fase con envelope de evidencia.

---

### evolith-auto-fix

**Propósito:** Aplicar automáticamente correcciones arquitectónicas a violaciones reportadas por evaluadores de reglas de Evolith Core.

**Contexto:** Cuando la validación de arquitectura reporta violaciones, esta herramienta puede aplicar estrategias de fix conocidas automáticamente sin intervención manual.

**Input Schema:**
```typescript
{
  rulesetId?: string;  // Ruleset a fixear (ej: "domain-purity", "hexagonal-boundaries")
  violations?: Array<{
    ruleId: string;
    filePath: string;
    message: string;
  }>;
  dryRun?: boolean;    // Preview de fixes sin aplicar (default: false)
  dir?: string;        // Directorio base para paths relativos
}
```

**Output Schema:**
```typescript
{
  totalViolations: number;
  fixesApplied: number;
  fixesPreview: number;
  fixesFailed: number;
  manualReview: number;
  summary: string;
}
```

**Estrategias de Fix Soportadas:**

| Estrategia | Tipo de Violación | Acción |
|------------|-------------------|--------|
| `domain-purity` | Dominio importa framework | Remover imports de framework, reemplazar con referencias a interfaces |
| `hexagonal-boundaries` | Violaciones de boundary | Enforzar separación puerto/adaptador, remover imports cross-layer |
| `missing-domain-interface` | Interfaces puerto faltantes | Generar archivos skeleton de interface con TODOs |
| `layer-isolation` | Lógica de negocio en capa incorrecta | Extraer lógica de negocio a capa de dominio apropiada |
| `artifact-coherence` | Referencias de artefactos deprecated | Actualizar referencias para coincidir con estructura actual |
| `service-purity` | Efectos secundarios en servicios de dominio | Remover console.log y otros efectos secundarios |

**Estado de Implementación:**

- DONE Todas las 8 estrategias implementadas con modos preview y apply
- DONE Soporte dry-run para preview seguro antes de aplicar cambios
- DONE Manejo de errores con mensajes detallados de fallo
- DONE Generación de resumen con conteos por estado

**Ejemplos de Uso:**

```bash
# Modo dry-run (preview sin aplicar)
evolith mcp call evolith-auto-fix --rulesetId domain-purity --dryRun

# Aplicar fixes a violaciones específicas
evolith mcp call evolith-auto-fix --rulesetId hexagonal-boundaries

# Fixear múltiples tipos de violación
evolith mcp call evolith-auto-fix --rulesetId comprehensive --dryRun

# Fixear con directorio personalizado
evolith mcp call evolith-auto-fix --rulesetId domain-purity --dir /path/to/project
```

**Características de Seguridad:**
- Modo `dryRun` permite preview antes de aplicar cambios
- Generación de resumen muestra conteos applied/preview/failed/manual
- Fixes fallidos se reportan con mensajes de error para revisión manual
- No-mutativo por defecto (requiere ejecución explícita)

**Referencias:**
- Implementación: `sdk/cli/src/infrastructure/mcp/tools/auto-fix.ts`
- Tests: `sdk/cli/src/infrastructure/mcp/tools/auto-fix.spec.ts`
- E2E: `sdk/cli/test/auto-fix.e2e-spec.ts`

---

### evolith-alias

**Propósito:** Gestionar aliases de comandos CLI para workflows personalizados.

**Input Schema:**
```typescript
{
  action: "add" | "remove" | "list";
  alias?: string;
  command?: string;
}
```

**Output:** Confirmación de gestión de alias o lista.

---

### evolith-schema

**Propósito:** Generar schemas de validación phase-gate.

**Input Schema:**
```typescript
{
  phase: string;
  gate?: string;
  outputFile?: string;
}
```

**Output:** Archivo schema generado para validación phase-gate.

---

## Principios de Diseño de Herramientas

Todas las herramientas MCP de Evolith siguen estos principios de diseño:

1. **Determinismo Semántico:** Nomenclatura clara y explícita
2. **Hiper-Explicitud:** Descripciones optimizadas para búsqueda vectorial
3. **Schemas Estrictos:** JSON Schema con constraints
4. **Alta Idempotencia:** Seguro para reintentar
5. **Manejo Semántico de Errores:** Mensajes de error accionables

Ver [Principios de Diseño de Herramientas](./tool-design-principles.md) para detalles.

---

## Uso

Las herramientas se acceden vía el servidor MCP de Evolith:

```bash
# Iniciar servidor MCP
evolith-mcp

# Llamar una herramienta
evolith mcp call <nombre-herramienta> --<opcion> <valor>
```

Para uso interactivo, configurar el agente de IA con el endpoint del servidor MCP.

---

[Volver al Índice](./README.md)
