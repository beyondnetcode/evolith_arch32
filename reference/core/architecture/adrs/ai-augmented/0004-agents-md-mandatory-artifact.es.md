> **Navegacion Bilingue:** [English Version](./0004-agents-md-mandatory-artifact.md)

# ADR-0004: AGENTS.md como Artefacto Obligatorio del Repositorio

## Status
Aceptado

## Date
2026-06-23

## Contexto y Problema
Los asistentes de codificacion por IA (Codex, Copilot, Claude Code) leen el contexto del repositorio desde `AGENTS.md` (o equivalente) para comprender las convenciones del proyecto, comandos de validacion y restricciones arquitectonicas. Sin un artefacto estandarizado y obligatorio, cada asistente llega con diferentes suposiciones, lo que genera generacion de codigo inconsistente, pasos de validacion omitidos y violaciones de convenciones especificas del proyecto.

En Evolith Core, `AGENTS.md` ya cumple este rol, pero su adopcion en repositorios satelite es voluntaria. Algunos satelites no tienen `AGENTS.md`, otros tienen versiones desactualizadas, y ninguno es validado por CI. Esto crea una regresion silenciosa de calidad: los asistentes de IA en repos satelite operan sin barandillas.

El impacto practical es medible: cuando un asistente de IA no conoce los comandos de validacion del proyecto, no puede verificar su propia salida. Cuando no conoce las convenciones de codificacion, genera codigo que las viola. Cuando no conoce los limites arquitectonicos, crea acoplamiento que el equipo debe desenredar despues.

## Decision
Mandamos `AGENTS.md` como un artefacto requerido para cada repositorio en el ecosistema Evolith con las siguientes reglas:

### 1. Requisito de Presencia
Todo repositorio que contenga codigo fuente o documentacion DEBE tener un `AGENTS.md` a nivel raiz. Los repositorios sin uno fallan el gate `validate-root-cleanliness.mjs`. El gate verifica existencia del archivo, tamano no cero y presencia de al menos un encabezado `##`.

### 2. Contenido Minimo
`AGENTS.md` DEBE contener como minimo:
- **Contexto del proyecto**: Que es el repositorio y su rol en el ecosistema
- **Comandos de construccion y ejecucion**: Como construir, probar y validar el proyecto
- **Convenciones de codificacion**: Reglas de estilo especificas del lenguaje, patrones de nomenclatura, organizacion de archivos
- **Comandos de validacion**: Los comandos exactos que ejecuta CI (para que los agentes puedan reproducirlos localmente)
- **Restricciones arquitectonicas**: Patrones clave, limites de capas y anti-patrones a evitar

La seccion de comandos de validacion es critica: es el contrato entre el pipeline CI y el asistente de IA. Si un comando listado en `AGENTS.md` no existe o tiene un error de ortografia, el asistente intentara ejecutar un script inexistente, llevando a confusion y tokens desperdiciados.

### 3. Requisito Bilingue
Para Evolith Core y repositorios de gobernanza, `AGENTS.md` DEBE tener una contraparte `AGENTS.es.md` con paridad estructural. Los repositorios satelite pueden eximirse del `AGENTS.md` bilingue con una excepcion documentada explicita. El `AGENTS.md` bilingüe asegura que los contribuyentes y agentes hispanohablantes reciban guia equivalente.

### 4. Validacion CI
El script `validate-docs.mjs` DEBE verificar la presencia de `AGENTS.md` en todo repositorio donde se ejecute. `AGENTS.md` faltante o vacio activa un fallo de CI. La frescura del contenido se valida verificando que los scripts y comandos referenciados existan en el sistema de archivos. Las referencias obsoletas (apuntando a scripts renombrados o eliminados) activan una advertencia.

### 5. Herencia de Satelites
Los repositorios satelite DEBEN heredar de la linea base corporativa de `AGENTS.md` y extenderla con convenciones especificas del satelite. NO DEBEN anular reglas de nivel corporativo sin un ADR aceptado. El patron de herencia es: linea base corporativa + adiciones del satelite, nunca reemplazo de la linea base corporativa. Esto previene que overrides especificos del satelite debilicen silenciosamente los estandares corporativos.

### 6. Proteccion contra Obsolescencia
Cada `AGENTS.md` DEBE incluir un comentario de fecha `Last validated` en la parte superior. Si esta fecha tiene mas de 90 dias, el script `validate-docs.mjs` emite una advertencia. Esto previene que el artefacto se convierta en documentacion obsoleta en la que nadie confia.

## Consecuencias

### Positivas
- **Consistencia**: Los asistentes de IA en todos los repositorios comparten una comprension comun de las convenciones del proyecto.
- **Descubribilidad**: Nuevos contribuyentes (humanos o IA) pueden comprender cualquier repositorio leyendo un solo archivo.
- **Aplicacion de calidad**: La validacion CI previene configuracion de agente desactualizada o faltante.
- **Coherencia del ecosistema**: Los repos satelite permanecen alineados con los estandares corporativos.
- **CI auto-documentado**: Cuando los comandos de validacion se listan en `AGENTS.md`, el pipeline CI se auto-documenta.

### Negativas
- **Carga de mantenimiento**: `AGENTS.md` debe actualizarse cuando cambian las convenciones, agregando un punto de contacto de documentacion.
- **Rigidez para repos pequeños**: Los repositorios triviales pueden encontrar que el contenido minimo es desproporcionado con su tamano.
- **Riesgo de obsolescencia**: Sin la proteccion de fecha de version, `AGENTS.md` puede quedarse obsoleto silenciosamente.

### Neutrales
- **Alcance de migracion**: Los repositorios existentes sin `AGENTS.md` deben agregar uno antes de que el gate CI se aplique. Un periodo de gracia permite adopcion incremental. El script `validate-root-cleanliness.mjs` registra una advertencia (no un fallo) durante el periodo de gracia.

## Referencias
- [ADR-0001: Ingenieria de Harness](./0001-harness-engineering.es.md)
- [ADR-0002: Protocolo de Integracion MCP](./0002-mcp-integration-protocol.es.md)
- [validate-root-cleanliness.mjs](../../../../../.harness/scripts/ci/03-validate-root-cleanliness.mjs)
- [AGENTS.es.md](../../../../../AGENTS.es.md)
- [ADR-0012: Aplicacion de Convenciones](../core/0049-naming-semantics-clean-code-policy.es.md)
- [ADR-0068: Gitflow de Release de Documentacion](../core/0068-documentation-release-gitflow.es.md)

---
[Volver al Indice de ADRs](../README.es.md)

> **Firma del Agente:** Agente Arquitecto
