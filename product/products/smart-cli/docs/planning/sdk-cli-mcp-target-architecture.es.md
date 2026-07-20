# Arquitectura Objetivo de SDK/CLI/MCP

> **Estado:** Propuesto
> **Fecha:** 2026-06-06
> **Referencia:** Evolith Product Vision Master §2.3

---

## 1. Principios de Diseño

### 1.1 Evolith Core como Única Fuente de Verdad

Todas las operaciones del SDK, CLI y MCP se derivan de los artefactos de Evolith Core:
- Rulesets en `rulesets/`
- ADRs en `reference/core/architecture/adrs/`
- Estándares en `reference/core/sdlc/standards/`
- Esquemas en `src/rulesets/schema/`
- Plantillas en `.harness/templates/`

Ningún componente crea su propia verdad. Cada regla, artefacto y estándar debe ser trazable hasta su fuente en Evolith Core.

### 1.2 SDK como Única Capa Lógica

```
┌─────────────────────────────────────────────────────────┐
│                    Evolith Core                          │
│         (rulesets, ADRs, standards, schemas)             │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    Evolith SDK                           │
│  CoreProvider │ RulesetRegistry │ Validator │ Executor  │
└────────┬────────────────┬──────────────────┬────────────┘
         │                │                  │
         ▼                ▼                  ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│    CLI      │   │  MCP Server │   │  CI/CD      │
│ (Commands)  │   │   (Tools)   │   │ (Actions)   │
└─────────────┘   └─────────────┘   └─────────────┘
```

### 1.3 Separación de Preocupaciones

| Capa | Responsabilidad |
|------|----------------|
| **SDK** | Lógica de negocio, resolución de reglas, validación, ejecución |
| **CLI** | Interacción humana, scripts, integración en pipelines |
| **MCP** | Consumo por agentes de IA, integración con IDE, ejecución de herramientas |
| **Tracker** | Flujos de aprobación, pistas de auditoría, funcionalidades SaaS (FUERA DEL ALCANCE de Core) |
| **ACLs** | Integración con sistemas externos (FUERA DEL ALCANCE del SDK) |

### 1.4 Segregación de Interfaces

- CLI expone comandos optimizados para terminal con salida coloreada
- MCP expone herramientas JSON-RPC con entradas/salidas estructuradas
- SDK proporciona interfaces síncronas y asíncronas
- Ninguna capacidad es exclusiva de una interfaz a menos que esté justificada por el tipo de interacción

---

## 2. Arquitectura del SDK

### 2.1 Estructura de Paquetes

```
@beyondnet/evolith-sdk (futuro)
├── @beyondnet/evolith-sdk-core        # Carga de Core, resolución de reglas, validación
├── @beyondnet/evolith-sdk-artifacts   # Generación y validación de artefactos
├── @beyondnet/evolith-sdk-sdlc        # Puertas de fase, recolección de evidencia
└── @beyondnet/evolith-sdk-mcp         # Adaptadores de protocolo MCP

@beyondnet/evolith-cli (actual)
└── Implementa comandos CLI usando @beyondnet/evolith-sdk-core
```

**Nota:** Actualmente, el SDK y el CLI están combinados en `src/sdk/cli/`. Una refactorización futura debería extraer el SDK en paquetes separados.

### 2.2 Servicios Core

#### CoreLoader
- Carga Evolith Core desde el sistema de archivos o una URL remota
- Almacena en caché los metadatos de Core para rendimiento
- Valida la integridad de Core (versión, estructura)

#### RulesetRegistry
- Descubre todos los rulesets en Core
- Proporciona metadatos (versión, fecha de vigencia, categoría)
- Soporta filtrado por categoría, severidad, fase

#### RulesetResolver
- Resuelve qué reglas aplican a un satélite dado
- Maneja la cadena de herencia (Core → Satélite)
- Gestiona la compatibilidad de versiones

#### RulesetValidator
- Ejecuta validación contra el estado de un satélite
- Devuelve hallazgos estructurados con severidad y estado de bloqueo
- Soporta validación incremental (solo archivos modificados)

#### ArtifactService
- Genera artefactos a partir de plantillas (PRD, Historia de Usuario, ADR, etc.)
- Valida artefactos contra esquemas JSON
- Soporta generación bilingüe (EN/ES)

#### SDLCService
- Gestiona transiciones de fase
- Recolecta y valida evidencia de puertas de fase
- Reporta el estado del SDLC

#### EvidenceService
- Recolecta evidencia para reportes de cumplimiento
- Agrega hallazgos entre rulesets
- Genera cadenas de evidencia trazables

#### DriftDetectionService
- Compara el estado del satélite contra los rulesets de Core
- Identifica desviación arquitectónica
- Reporta la severidad de la desviación y los componentes afectados

### 2.3 Interfaz del SDK

```typescript
interface EvolithClient {
  core: CoreService;
  rulesets: RulesetService;
  validate: ValidationService;
  artifacts: ArtifactService;
  sdlc: SDLCService;
  evidence: EvidenceService;
}

interface CoreService {
  load(path?: string): Promise<CoreMetadata>;
  info(): CoreMetadata;
  validate(): ValidationResult;
  update(): Promise<UpdateResult>;
  search(query: string): Promise<SearchResult[]>;
}

interface RulesetService {
  list(): Promise<Ruleset[]>;
  get(id: string): Promise<Ruleset>;
  resolve(satellitePath: string): Promise<ResolvedRuleset[]>;
  validate(satellitePath: string, rulesetId?: string): Promise<ValidationResult>;
  explain(ruleId: string): Promise<RuleExplanation>;
}

interface ValidationService {
  project(path: string): Promise<ValidationResult>;
  ruleset(satellitePath: string, rulesetId: string): Promise<ValidationResult>;
  architecture(satellitePath: string): Promise<ValidationResult>;
  sdlc(satellitePath: string): Promise<ValidationResult>;
  all(satellitePath: string): Promise<ValidationResult>;
}

interface ArtifactService {
  list(): Promise<ArtifactTemplate[]>;
  generate(templateId: string, context: ArtifactContext): Promise<GeneratedArtifact>;
  validate(artifact: GeneratedArtifact): Promise<ValidationResult>;
  schema(templateId: string): Promise<JSONSchema>;
}

interface SDLCService {
  status(satellitePath: string): Promise<SDLCStatus>;
  nextGate(satellitePath: string): Promise<PhaseGate>;
  validateGate(satellitePath: string, gateId: string): Promise<GateValidationResult>;
  evidence(satellitePath: string, gateId: string): Promise<Evidence[]>;
}
```

---

## 3. Arquitectura del CLI

### 3.1 Estructura de Comandos

```
evolith-cli <dominio> <acción> [opciones]

Dominios:
  core        - Información y gestión de Core
  ruleset     - Descubrimiento y validación de rulesets
  validate    - Validación de proyectos
  artifact    - Generación de artefactos
  sdlc        - Operaciones de SDLC
  gate        - Operaciones de puertas de fase
  adr         - Gestión de ADRs
  agent       - Gestión de agentes
  scaffold    - Andamiaje de arquitectura
```

### 3.2 Opciones Globales

| Opción | Descripción |
|--------|-------------|
| `--core <ruta>` | Ruta a Evolith Core (por defecto: detección automática) |
| `--satellite <ruta>` | Ruta al repositorio satélite (por defecto: dir. actual) |
| `--format <json\|yaml\|text>` | Formato de salida (por defecto: text) |
| `--output <ruta>` | Escribir salida a un archivo |
| `--verbose` | Habilitar salida detallada |
| `--quiet` | Suprimir salida no esencial |
| `--dry-run` | Simular sin realizar cambios |

### 3.3 Códigos de Error

| Código | Nombre | Descripción |
|--------|--------|-------------|
| 0 | SUCCESS | Operación completada exitosamente |
| 1 | VALIDATION_FAILED | Una o más reglas fallaron la validación |
| 2 | CONFIGURATION_ERROR | Configuración o entradas inválidas |
| 3 | CORE_NOT_FOUND | Evolith Core no encontrado en la ruta |
| 4 | RULESET_NOT_FOUND | El ruleset solicitado no existe |
| 5 | INVALID_INPUT | Argumentos u opciones inválidos |
| 6 | VERSION_CONFLICT | Discrepancia de versión Core/satélite |
| 7 | EXECUTION_ERROR | Error durante la ejecución del comando |
| 8 | PARTIAL_SUCCESS | Operación completada con advertencias |
| 9 | INTERNAL_ERROR | Error interno inesperado |

### 3.4 Formato de Salida

Todos los comandos devuelven JSON estructurado cuando se usa `--format json`:

```json
{
  "success": true,
  "operation": "validate_project",
  "coreVersion": "1.0.0",
  "rulesetVersion": "1.0.0",
  "timestamp": "2026-06-06T12:00:00Z",
  "summary": {
    "evaluated": 47,
    "passed": 44,
    "failed": 2,
    "warnings": 1
  },
  "findings": [
    {
      "ruleId": "HXA-01",
      "severity": "MUST",
      "title": "Core has zero framework dependencies",
      "status": "passed",
      "location": "src/domain/"
    }
  ],
  "traceability": [
    {
      "source": "rulesets/adr/adr-0002-hexagonal-architecture.rules.json",
      "rule": "HXA-01",
      "artifact": "src/domain/User.ts"
    }
  ],
  "metadata": {
    "satellite": "ums",
    "phase": "F1",
    "duration": "2.3s"
  }
}
```

---

## 4. Arquitectura del Servidor MCP

### 4.1 Transporte

**Primario:** stdio (JSON-RPC sobre stdin/stdout)
**Secundario:** HTTP (opcional, para clientes basados en navegador)

### 4.2 Clasificación de Capacidades

| Tipo | Caso de Uso | Ejemplos |
|------|-------------|----------|
| **Tool** | Operaciones que cambian estado o computan | validate_project, generate_artifact, execute_ruleset |
| **Resource** | Acceso a datos de solo lectura | core_info, rulesets_list, adr_get |
| **ResourceTemplate** | Consultas de datos parametrizadas | artifact_search, adr_search |
| **Prompt** | Patrones de interacción reutilizables | prepare_discovery, review_architecture |

### 4.3 Recursos

```
evolith://core/info                      # Metadatos de Core
evolith://core/capabilities              # Capacidades soportadas
evolith://rulesets                       # Todos los rulesets
evolith://rulesets/{id}                  # Ruleset específico
evolith://rulesets/{id}/rules            # Reglas en un ruleset
evolith://adrs                           # Todos los ADRs
evolith://adrs/{id}                      # ADR específico
evolith://artifacts/templates            # Plantillas de artefactos
evolith://sdlc/phases                    # Fases de SDLC
evolith://sdlc/gates/{phase}             # Puertas para una fase
evolith://standards                      # Corpus de estándares
evolith://taxonomy                       # Taxonomía del repositorio
```

### 4.4 Herramientas

```typescript
// Herramientas de Validación
validate_project(satellitePath?: string): Promise<ValidationResult>
validate_ruleset(rulesetId: string, satellitePath?: string): Promise<ValidationResult>
validate_architecture(satellitePath?: string): Promise<ValidationResult>

// Herramientas de Rulesets
list_rulesets(category?: string): Promise<Ruleset[]>
get_ruleset(rulesetId: string): Promise<Ruleset>
explain_rule(ruleId: string): Promise<RuleExplanation>
resolve_rulesets(satellitePath: string): Promise<ResolvedRuleset[]>

// Herramientas de Artefactos
list_artifact_templates(): Promise<ArtifactTemplate[]>
generate_artifact(templateId: string, context: ArtifactContext): Promise<GeneratedArtifact>
validate_artifact(artifact: object): Promise<ValidationResult>

// Herramientas de Arquitectura
initialize_architecture(phase: F1|F2|F3, options: ArchitectureOptions): Promise<ArchitectureResult>
detect_architecture_drift(satellitePath?: string): Promise<DriftReport>
inspect_architecture(satellitePath?: string): Promise<ArchitectureReport>

// Herramientas de SDLC
get_sdlc_status(satellitePath?: string): Promise<SDLCStatus>
validate_phase_gate(phase: number, gate: number, satellitePath?: string): Promise<GateResult>

// Herramientas de ADR
list_adrs(status?: string): Promise<ADR[]>
get_adr(adrId: string): Promise<ADR>
create_adr(context: ADRContext): Promise<CreatedADR>

// Herramientas de Core
search_core(query: string): Promise<SearchResult[]>
get_core_info(): Promise<CoreInfo>
```

### 4.5 Prompts

```typescript
// Patrones de interacción reutilizables para agentes de IA

implement_with_evolith:
  "Estás implementando una funcionalidad siguiendo la gobernanza de Evolith.
   Primero, consulta los rulesets aplicables para la fase de este satélite.
   Luego, genera los artefactos usando las plantillas aprobadas.
   Finalmente, valida todos los cambios contra los rulesets."

review_architecture:
  "Revisa la arquitectura del satélite proporcionado contra
   el ruleset F1/F2/F3 que coincida con su fase actual.
   Identifica cualquier violación y sugiere correcciones."

prepare_discovery:
  "Ayuda al usuario a prepararse para el Descubrimiento de Fase 1.
   Genera un Lienzo de Descubrimiento, ROI del Caso de Negocio y Estimación Preliminar
   usando las plantillas aprobadas y las reglas de validación."

generate_adr:
  "Guía al usuario en la creación de un Registro de Decisión Arquitectónica.
   Asegúrate de que todas las secciones requeridas estén presentes y sean trazables hasta los ADRs de Core."
```

---

## 5. Modelos Compartidos

### 5.1 ValidationResult

```typescript
interface ValidationResult {
  success: boolean;
  operation: string;
  coreVersion: string;
  rulesetVersion: string;
  timestamp: string;
  summary: {
    evaluated: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  findings: Finding[];
  evidence: Evidence[];
  traceability: TraceabilityEntry[];
  metadata: Record<string, any>;
}

interface Finding {
  ruleId: string;
  severity: 'MUST' | 'SHOULD' | 'COULD';
  title: string;
  description: string;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  location?: string;
  expected?: string;
  actual?: string;
  blocking: boolean;
}
```

### 5.2 Ruleset

```typescript
interface Ruleset {
  id: string;
  title: string;
  description: string;
  version: string;
  effectiveDate: string;
  category: string;
  scope: 'core' | 'satellite';
  rules: Rule[];
  source: string;  // Ruta en Core
}

interface Rule {
  id: string;
  severity: 'MUST' | 'SHOULD' | 'COULD';
  title: string;
  description: string;
  validationQuery: string;
  blocking: boolean;
  category?: string;
  layer?: string;
  references?: string[];
}
```

---

## 6. Estrategia de Caché

### 6.1 Caché de Metadatos de Core

- **TTL:** 5 minutos
- **Ubicación:** `~/.cache/evolith-core/`
- **Invalidación:** Al actualizar Core o al refrescar manualmente

### 6.2 Caché de Resolución de Rulesets

- **TTL:** 1 hora
- **Alcance:** Por satélite (basado en el hash de evolith.yaml)
- **Invalidación:** Al actualizar rulesets o al cambiar evolith.yaml

### 6.3 Caché de Validación

- **TTL:** Hasta el próximo commit de git
- **Alcance:** Por archivo (basado en el hash del archivo)
- **Invalidación:** Al detectar un cambio en el archivo mediante el watcher

---

## 7. Consideraciones de Seguridad

### 7.1 Integridad de Core

- El SDK verifica la firma de Core (futuro: HMAC)
- No se permite la modificación de archivos de Core a través del SDK
- Acceso de solo lectura a Core por defecto

### 7.2 Validación de Satélites

- Valida contra los rulesets de Core, no contra copias locales
- Previene que los satélites distribuyan reglas modificadas
- Exige el fijado de versiones (INH-02)

### 7.3 Seguridad del MCP

- No se ejecuta código arbitrario
- Las operaciones con archivos están limitadas al directorio del satélite
- Sin solicitudes de red por defecto (telemetría opcional)

---

## 8. Requisitos No Funcionales

### 8.1 Rendimiento

- Carga de Core: < 500ms (en caché)
- Validación de reglas: < 100ms por regla
- Validación completa del proyecto: < 10s para un satélite típico

### 8.2 Modo Offline

- CLI completamente funcional sin conexión (Core incluido o en caché)
- MCP puede operar sin conexión con metadatos de Core en caché

### 8.3 Observabilidad

- Registro estructurado (JSON a stdout)
- Niveles de registro: error, warn, info, debug
- Telemetría solo con adhesión voluntaria (desactivada por defecto)

---

## 9. Puntos de Extensión

### 9.1 Sistema de Plugins (Futuro)

```typescript
interface EvolithPlugin {
  name: string;
  version: string;
  commands?: Command[];
  tools?: Tool[];
  resources?: Resource[];
  hooks?: Hook[];
}
```

### 9.2 Rulesets Personalizados (Futuro)

Los satélites pueden definir rulesets locales que extienden Core:
- Colocados en el directorio `rulesets/local/`
- Se cargan después de los rulesets de Core
- No pueden sobrescribir reglas de Core (INH-01)

---

## 10. Estrategia de Migración

### Fase 1: Extracción del SDK
1. Extraer la lógica de Core en `@beyondnet/evolith-sdk-core`
2. Mantener el CLI en `@beyondnet/evolith-cli` usando el SDK
3. Mantener la compatibilidad hacia atrás

### Fase 2: Finalización del MCP
1. Implementar el servidor MCP usando el SDK
2. Mantener el CLI como interfaz principal para humanos
3. MCP para agentes de IA e IDEs

### Fase 3: División de Paquetes
1. Dividir el SDK en `@beyondnet/evolith-sdk-core`, `@beyondnet/evolith-sdk-artifacts`, `@beyondnet/evolith-sdk-sdlc`
2. Publicar en npm
3. El CLI depende de los paquetes del SDK

---

## 11. Documentos Relacionados

- `sdk-cli-mcp-current-state-assessment.md` - Estado actual
- `sdk-api-capability-catalog.md` - Detalles de la API
- `cli-command-catalog.md` - Comandos del CLI
- `mcp-capability-catalog.md` - Capacidades de MCP
- `sdk-cli-mcp-implementation-roadmap.md` - Plan de implementación

---

[Volver al Índice de Planificación SDK/CLI](./README.md)
