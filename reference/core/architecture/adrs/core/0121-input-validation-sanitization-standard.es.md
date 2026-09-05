# ADR-0121: Estándar de validación y saneamiento de entradas

> **Navegación Bilingüe:** [English Version](./0121-input-validation-sanitization-standard.md)

| Campo | Valor |
|---|---|
| **Estado** | Aceptado |
| **Fecha** | 2026-07-23 |
| **Decisores** | Comité de Arquitectura |
| **Historia técnica** | OWASP API3 / A03 — autorización rota a nivel de propiedad de objeto / inyección |

## Contexto

Las herramientas MCP aceptan rutas del sistema de ficheros, parámetros controlados por el usuario y entrada dinámica. Existían protecciones contra el recorrido de rutas en `resources.service.ts`, pero no se aplicaban de forma consistente a todas las herramientas. La herramienta de andamiaje aceptaba parámetros de framework y ORM sin validarlos contra una lista de permitidos.

## Decisión

### 1. Saneamiento de rutas de entrada
- Toda herramienta que acepte una ruta del sistema de ficheros DEBE usar `sanitizePathInput()`, de `src/packages/mcp-server/src/utils/path-security.ts`.
- La función rechaza secuencias `..`, rutas absolutas fuera del directorio base y caracteres ajenos a `[a-zA-Z0-9_\-\/\.]`.

### 2. Listas de permitidos para parámetros
- Los parámetros controlados por el usuario que acaben en un comando de shell o en un recurso del sistema DEBEN validarse contra una lista de permitidos.
- Por ejemplo: `frontend` → `['react', 'angular', 'vue']`, `orm` → `['prisma', 'typeorm', 'drizzle']`.
- Los valores desconocidos DEBEN rechazarse con un mensaje de error claro que enumere los valores admitidos.

### 3. Validación del cuerpo de la petición
- Todos los servicios NestJS DEBEN usar `ValidationPipe` con `whitelist: true` y `forbidNonWhitelisted: true`.
- Las excepciones para endpoints de cuerpo dinámico (por ejemplo, agent-runtime-api) han de documentarse y usar una validación específica de esa entrada.

### 4. Saneamiento de cabeceras
- Las cabeceras que se reflejen en la respuesta DEBEN validarse contra `^[a-zA-Z0-9_\-\.]+$` antes de devolverse.
- Longitud máxima del valor de una cabecera: 256 caracteres.

### 5. Identificadores de correlación
- DEBEN generarse en el servidor (UUID v4). Los identificadores de correlación que aporte el cliente se aceptan, pero se validan.

## Consecuencias

- Toda herramienta MCP nueva ha de importar y usar `sanitizePathInput()`.
- Las herramientas existentes sin saneamiento de rutas han de auditarse.
- La utilidad `path-security.ts` es la única fuente de verdad para la validación de rutas.

## ADRs relacionados

- ADR-0073 (contrato unificado de salida del CLI — sin ejecución arbitraria de comandos)
- ADR-0082 (frontera de confianza — el contenido no confiable es dato, no instrucción)

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
