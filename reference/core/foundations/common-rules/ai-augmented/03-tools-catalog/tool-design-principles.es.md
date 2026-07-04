# Principios de Diseño para Herramientas Inteligentes

## Contexto

Un LLM no ve el código; solo ve la documentación. Una herramienta exquisitamente escrita con metadatos mal descritos da como resultado un agente inútil.

Seguir estos 5 principios maximiza la probabilidad de una llamada de herramienta exitosa en un 90%.

---

## 1. Determinismo Semántico (Nomenclatura Clara)

El nombre de la herramienta debe ser altamente explícito y evitar jerga profesional no relacionada con la acción.

### Ejemplos Correctos

```typescript
// Herramientas MCP de Evolith - Nombres claros orientados a la acción
'evolith-architecture-evaluate'  // Evalúa patrones de arquitectura
'evolith-gate-status'            // Obtiene estado de validación de gates
'evolith-moscow-analyze'         // Ejecuta priorización MoSCoW
'evolith-auto-fix'               // Aplica correcciones automáticas
```

### Ejemplos Incorrectos

```typescript
// Vagos, cargados de jerga, o ambiguos
'hacer_trabajo'           // ¿Qué trabajo?
'procesar_datos'          // ¿Qué datos? ¿Qué procesamiento?
'calcular_impuesto_envío'  // Aceptable pero podría ser más claro
'obtener_usuario_por_email' // Bueno pero inconsistente
'evolith-cosa'            // Sin significado
```

### Convención de Nomenclatura para Herramientas MCP de Evolith

```typescript
// Patrón: evolith-{dominio}-{accion}
// dominio: architecture, sdlc, planning, validation, configuration
// acción: evaluate, validate, generate, export, analyze, fix

const nomenclaturaHerramientas = {
  dominio: ['architecture', 'sdlc', 'planning', 'validation', 'configuration'],
  accion: ['evaluate', 'validate', 'generate', 'export', 'analyze', 'fix'],
  ejemplo: 'evolith-architecture-evaluate'
};
```

---

## 2. El Principio de Hiper-Explicitud en Descripciones

Una descripción no es para un humano, es para un motor de búsqueda de espacio vectorial.

### Descripción Incorrecta

```typescript
{
  name: 'evolith-gate-status',
  description: 'Obtiene estado del gate.'  // Demasiado vago
}
```

### Descripción Correcta

```typescript
{
  name: 'evolith-gate-status',
  description: `Mostrar estado actual de validación de gates de fase SDLC y métricas DORA.
    
USE ESTA HERRAMIENTA CUANDO:
- El usuario pregunta sobre cumplimiento de gates de fase (ej. "¿Estamos listos para fase 2?")
- El usuario quiere ver métricas DORA (frecuencia de despliegue, lead time, etc.)
- Validando si un proyecto cumple requisitos de transición de fase

NO USE ESTA HERRAMIENTA PARA:
- Validación de patrones de arquitectura (use evolith-architecture-evaluate)
- Validación de artefactos (use evolith-validate)
- Propuestas de transición de fase (use evolith-phase-advance)

SALIDA: Estado del gate (passed/failed/pending) + dashboard de métricas DORA con:
- Frecuencia de despliegue
- Lead time para cambios
- Tiempo medio de recuperación (MTTR)
- Tasa de fallos en cambios`
}
```

### Plantilla de Descripción

```typescript
interface DescripcionHerramienta {
  /** Resumen de una línea de lo que hace la herramienta */
  resumen: string;
  
  /** Cuándo usar esta herramienta (condiciones de activación) */
  usarCuando: string[];
  
  /** Cuándo NO usar esta herramienta (límites) */
  noUsarPara: string[];
  
  /** Formato y contenido de salida esperado */
  salida: string;
}
```

---

## 3. Schemas Estrictos (Zod / JSON Schema)

Nunca defina un argumento como una `string` suelta. Use Zod y restricciones siempre que sea posible para restringir la "creatividad" del modelo.

### Argumento Vago (INCORRECTO)

```typescript
// No haga esto - demasiado permisivo
interface SchemaMalo {
  estado: string;           // Podría ser cualquier cosa
  formato: string;          // ¿Qué formatos son válidos?
  fase: string;             // ¿Qué fases existen?
}
```

### Schema Estricto (CORRECTO)

```typescript
import { z } from 'zod';

// Herramienta MCP de Evolith - evolith-gate-status
const SchemaGateStatus = z.object({
  since: z.number()
    .int()
    .min(1)
    .max(365)
    .default(90)
    .describe('Días de historial de git a analizar (1-365, defecto: 90)')
});

// Herramienta MCP de Evolith - evolith-validate
const SchemaValidate = z.object({
  phase: z.enum(['discovery', 'inception', 'construction', 'transition'])
    .optional()
    .describe('Fase SDLC a validar'),
  gate: z.enum(['gate-1', 'gate-2', 'gate-3', 'gate-4'])
    .optional()
    .describe('Gate específico a validar'),
  format: z.enum(['text', 'json'])
    .default('text')
    .describe('Formato de salida'),
  dir: z.string()
    .optional()
    .describe('Directorio base para validación (defecto: cwd)')
});

// Herramienta MCP de Evolith - evolith-auto-fix
const SchemaAutoFix = z.object({
  rulesetId: z.enum([
    'domain-purity',
    'hexagonal-boundaries',
    'layer-isolation',
    'artifact-coherence'
  ]).optional().describe('Ruleset a corregir'),
  violations: z.array(z.object({
    ruleId: z.string().describe('Identificador de regla (ej. "DOMAIN-001")'),
    filePath: z.string().describe('Ruta relativa al archivo violatorio'),
    message: z.string().describe('Descripción de violación')
  })).optional().describe('Violaciones específicas a corregir'),
  dryRun: z.boolean()
    .default(false)
    .describe('Vista previa de correcciones sin aplicar cambios'),
  dir: z.string().optional().describe('Directorio base para rutas relativas')
});
```

### Patrón de Validación de Schema

```typescript
// Todas las herramientas MCP de Evolith siguen este patrón
async function validarYEjecutar<T>(
  schema: z.ZodSchema<T>,
  entradaCruda: unknown,
  ejecutar: (validado: T) => Promise<ToolResult>
): Promise<ToolResult> {
  const resultadoParseo = schema.safeParse(entradaCruda);
  
  if (!resultadoParseo.success) {
    return {
      success: false,
      error: {
        type: 'INVALID_INPUT',
        message: 'Validación de schema falló',
        details: resultadoParseo.error.errors.map(e => ({
          field: e.path.join('.'),
          expected: e.message,
          received: entradaCruda
        }))
      }
    };
  }
  
  return ejecutar(resultadoParseo.data);
}
```

---

## 4. Alta Idempotencia (Seguro para Reintentar)

Los agentes frecuentemente entran en bucles de reintento recursivos ante fallos. Si una herramienta falla a la mitad, ejecutarla nuevamente NO DEBE generar efectos secundarios duplicados.

### Patrón de Idempotencia

```typescript
interface EntradaHerramientaIdempotente {
  /** Clave única para prevenir operaciones duplicadas */
  idempotencyKey?: string;
  
  /** Datos de operación */
  data: Record<string, unknown>;
}

interface ResultadoHerramientaIdempotente {
  success: boolean;
  idempotencyKey: string;
  wasCached: boolean;  // true si esta fue una solicitud duplicada
  result?: unknown;
  error?: ToolError;
}

// Ejemplo: evolith-sdlc-handoff con idempotencia
async function sdlcHandoff(
  entrada: EntradaHerramientaIdempotente & {
    fromPhase: string;
    toPhase: string;
    project?: string;
  }
): Promise<ResultadoHerramientaIdempotente> {
  const clave = entrada.idempotencyKey ?? generarClave(entrada);
  
  // Verificar si ya fue procesado
  const cacheado = await storeIdempotencia.get(clave);
  if (cacheado) {
    return {
      success: true,
      idempotencyKey: clave,
      wasCached: true,
      result: cacheado
    };
  }
  
  // Ejecutar operación
  const resultado = await realizarHandoff(entrada);
  
  // Almacenar para futuros reintentos idempotentes
  await storeIdempotencia.set(clave, resultado, ttl: 3600);
  
  return {
    success: true,
    idempotencyKey: clave,
    wasCached: false,
    resultado
  };
}
```

### Cuándo se Requiere Idempotencia

| Tipo de Herramienta | ¿Idempotencia Requerida? | Razón |
|---------------------|-------------------------|-------|
| Consultas solo-lectura | No | Sin efectos secundarios |
| Creación de archivos | Sí | Prevenir duplicados |
| Transiciones de estado | Sí | Prevenir doble-transición |
| Llamadas API externas | Sí | Prevenir cobros/solicitudes duplicadas |
| Validación | No | Sin efectos secundarios |

### Estado de Idempotencia de Herramientas MCP de Evolith

| Herramienta | Mutativa | ¿Idempotente? | Notas |
|-------------|----------|---------------|-------|
| `evolith-agent-handoff` | Sí | Sí | Verifica config de agente existente |
| `evolith-architecture-evaluate` | No | N/A | Solo-lectura |
| `evolith-gate-status` | No | N/A | Solo-lectura |
| `evolith-moscow-analyze` | No | N/A | Solo-lectura |
| `evolith-moscow-export` | Sí | Sí | Sobrescribe archivo de salida |
| `evolith-sdlc-handoff` | Sí | Sí | Usa clave de idempotencia |
| `evolith-validate` | No | N/A | Solo-lectura |
| `evolith-phase-advance` | Sí | Sí | Verifica propuestas existentes |
| `evolith-auto-fix` | Sí | Sí | Rastrea correcciones aplicadas |
| `evolith-alias` | Sí | Sí | Actualiza aliases existentes |
| `evolith-schema` | Sí | Sí | Sobrescribe archivos de schema |

---

## 5. Manejo Semántico de Errores

Si la herramienta falla, devuelva una explicación textual que ayude al modelo a comprender cómo solucionar la llamada.

### Error Incorrecto (No Útil)

```typescript
// No haga esto - el agente no puede recuperarse
{
  success: false,
  error: {
    type: 'INTERNAL_SERVER_ERROR',
    message: 'HTTP 500'
  }
}
```

### Error Correcto (Accionable)

```typescript
// Herramienta MCP de Evolith - evolith-validate
{
  success: false,
  error: {
    type: 'INVALID_INPUT',
    message: 'Validación de schema falló',
    details: [
      {
        field: 'phase',
        expected: 'Uno de: discovery, inception, construction, transition',
        received: 'development',
        suggestion: '¿Quizás quiso decir "construction"? Esa es la fase de implementación.'
      }
    ],
    retryable: true,
    retryGuidance: 'Corrija el valor de fase a una fase SDLC válida y reintente'
  }
}
```

### Schema de Respuesta de Error

```typescript
interface ToolError {
  /** Categoría de error para manejo programático */
  type: 'INVALID_INPUT' | 'NOT_FOUND' | 'PERMISSION_DENIED' | 'CONFLICT' | 'INTERNAL_ERROR';
  
  /** Mensaje legible por humanos */
  message: string;
  
  /** Errores detallados a nivel de campo */
  details?: Array<{
    field: string;
    expected: string;
    received: unknown;
    suggestion?: string;
  }>;
  
  /** ¿Puede el agente reintentar para solucionar esto? */
  retryable: boolean;
  
  /** Guía sobre cómo solucionar y reintentar */
  retryGuidance?: string;
  
  /** Herramientas relacionadas que podrían ayudar */
  relatedTools?: string[];
}
```

### Guía de Tipos de Error

| Tipo de Error | Cuándo Usar | Acción del Agente |
|---------------|-------------|-------------------|
| `INVALID_INPUT` | Validación de schema falló | Corregir entrada y reintentar |
| `NOT_FOUND` | Recurso no existe | Crear recurso o elegir otro diferente |
| `PERMISSION_DENIED` | Permisos insuficientes | Solicitar permiso o saltar |
| `CONFLICT` | Recurso ya existe | Usar nombre diferente o actualizar existente |
| `INTERNAL_ERROR` | Bug de herramienta | Reportar y escalar |

---

## Anti-Patrones (Qué NO Hacer)

### 1. La Caja Negra Mágica

```typescript
// INCORRECTO: La herramienta hace demasiado, el agente no puede predecir comportamiento
{
  name: 'evolith-hacer-todo',
  description: 'Maneja toda la configuración del proyecto',
  // Sin contrato claro de entrada/salida
  // Múltiples efectos secundarios
  // No se puede componer con otras herramientas
}
```

### 2. El Fallo Silencioso

```typescript
// INCORRECTO: Devuelve resultado vacío en error
async function validar(entrada) {
  try {
    return await realizarValidacion(entrada);
  } catch (e) {
    return {};  // El agente no tiene idea de qué salió mal
  }
}
```

### 3. El Schema Creativo

```typescript
// INCORRECTO: Schema demasiado permisivo invita a alucinaciones
{
  nombre: z.string(),  // ¡Podría ser cualquier cosa!
  config: z.any(),     // Sin estructura en absoluto
  opciones: z.array(z.string())  // ¿Qué opciones?
}
```

### 4. La Trampa Estatal

```typescript
// INCORRECTO: El comportamiento de la herramienta depende de estado oculto
let contadorLlamadas = 0;
async function herramienta(entrada) {
  contadorLlamadas++;
  if (contadorLlamadas === 1) return { estado: 'pendiente' };
  if (contadorLlamadas === 2) return { estado: 'procesando' };
  return { estado: 'completado' };  // El agente no puede reproducir resultados
}
```

### 5. La Brecha de Documentación

```typescript
// INCORRECTO: Herramienta implementada pero no documentada
// - Sin descripción en servidor MCP
// - Sin ejemplos en catálogo
// - El agente no puede descubrir o usar la herramienta
```

---

## Checklist de Validación

Antes de agregar una nueva herramienta MCP de Evolith, verifique:

### Nomenclatura (Principio 1)
- [ ] El nombre sigue el patrón `evolith-{dominio}-{accion}`
- [ ] El nombre describe claramente la acción
- [ ] El nombre evita jerga y ambigüedad

### Descripción (Principio 2)
- [ ] La descripción incluye condiciones USE CUANDO
- [ ] La descripción incluye límites NO USE PARA
- [ ] La descripción especifica formato de salida
- [ ] La descripción es buscable (contiene palabras clave que los agentes usarían)

### Schema (Principio 3)
- [ ] Todos los campos usan tipos específicos (enum, número con rango, etc.)
- [ ] Sin tipos `string` o `any` sueltos
- [ ] Todos los campos tienen descripciones
- [ ] Valores por defecto especificados donde sea apropiado
- [ ] Schema validado con Zod antes de ejecución

### Idempotencia (Principio 4)
- [ ] Herramientas mutativas aceptan parámetro `idempotencyKey`
- [ ] Solicitudes duplicadas devuelven resultado cacheado
- [ ] Operaciones de archivo verifican recursos existentes
- [ ] Transiciones de estado verifican estado actual

### Manejo de Errores (Principio 5)
- [ ] Errores incluyen detalles a nivel de campo
- [ ] Errores especifican si es reintentable
- [ ] Errores proporcionan guía de reintento
- [ ] Errores sugieren herramientas relacionadas cuando es útil

### Documentación
- [ ] Herramienta agregada al catálogo `evolith-mcp-tools.md`
- [ ] Herramienta agregada a `evolith-mcp-tools.es.md` (Español)
- [ ] Schemas de entrada/salida documentados
- [ ] Ejemplos de uso proporcionados
- [ ] Agregada al inventario `approved-tools.md`

---

## Referencias

- [Catálogo de Herramientas MCP de Evolith](./evolith-mcp-tools.es.md)
- [Inventario de Herramientas Aprobadas](./approved-tools.es.md)

---

[Volver al índice](./README.es.md)
