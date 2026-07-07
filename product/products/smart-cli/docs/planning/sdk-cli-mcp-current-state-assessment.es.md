# SDK/CLI/MCP — Evaluación del Estado Actual

> **Estado:** Diagnóstico Histórico Sustituido
> **Fecha:** 2026-06-06
> **Referencia:** Evolith Product Vision Master §2.3
> **Sustituido por:** `reference/core/control-center/gaps/gap-tracking.md` (tablero único de seguimiento de gaps)
> **Excepción Bilingüe:** Las notas de planificación del SDK actualmente no tienen contraparte en ES; el estado bilingüe autoritativo se mantiene en el par de análisis de gaps de visión.

---

## 0. Corrección del Estado Actual — 2026-06-08

Este diagnóstico se conserva únicamente como contexto histórico. Ya no refleja la implementación actual de CLI/MCP.

Estado actual verificado:
- La compilación TypeScript pasa con `npm run build`.
- MCP ya no es un stub; existen transportes JSON-RPC stdio y HTTP/SSE local mínimo.
- MCP expone handlers de herramientas, recursos, prompts y métricas.
- `npm test` ahora inicia la suite tras reparar la configuración de Jest y dependencias faltantes, pero la suite completa aún no está verde.
- La preparación para el lanzamiento sigue bloqueada por pruebas fallidas/sensibles al sandbox y la falta de evidencia de smoke test de MCP.

Utilice el análisis de gaps actual de Core para la planificación activa:
[Evolith Core Gap Tracking Board](../../../../../reference/core/control-center/gaps/gap-tracking.md)

## 1. Resumen Ejecutivo

La infraestructura SDK/CLI/MCP de Evolith se encuentra en **etapa de fundación temprana**. El framework CLI y la lógica de validación central son funcionales, pero el servidor MCP está completamente stubeado, y la mayoría de los comandos de alto nivel (agents, upgrade, docs, scaffold) son implementaciones POC con comentarios TODO en lugar de lógica real.

**Puntuación de Madurez:** ~30%

| Componente | Estado | Cobertura |
|------------|--------|-----------|
| CLI Framework | IMPLEMENTADO | 100% |
| Validación Central | IMPLEMENTADO | ~40% de rulesets |
| Servidor MCP | NO_IMPLEMENTADO | 0% |
| UI Interactiva | IMPLEMENTADO | 100% |
| Operaciones de Archivos | IMPLEMENTADO | 100% |
| Instalación de Agentes | STUB | 0% |
| Lógica de Upgrade | STUB | 0% |
| Scaffolding de Docs | STUB | 0% |
| Scaffolding de Arquitectura | PARCIALMENTE_IMPLEMENTADO | ~20% |
| Operaciones SDLC | MOCK/POC | ~10% |
| Pruebas Unitarias | LIMITADO | ~25% |
| Pruebas E2E | STUBS | ~10% |

---

## 2. Estructura del SDK

### 2.1 Lenguaje y Framework

- **Lenguaje:** TypeScript 6.0.3
- **Runtime:** Node.js (módulo CommonJS)
- **Framework CLI:** NestJS 11.x con nest-commander 3.20.1
- **Gestor de Paquetes:** npm

### 2.2 Estructura de Directorios

```
sdk/cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── main.ts                      # Punto de entrada
│   ├── app.module.ts                # Módulo raíz de NestJS
│   ├── commands/
│   │   ├── init/
│   │   │   ├── init.command.ts      # Inicializar satellite
│   │   │   ├── agents.command.ts    # Gestión de agentes
│   │   │   └── upgrade.command.ts   # Upgrade de satellite
│   │   ├── validate/
│   │   │   └── validate.command.ts  # Validación de rulesets
│   │   ├── docs/
│   │   │   └── docs.command.ts      # Scaffolding de docs
│   │   ├── mcp/
│   │   │   └── mcp-serve.command.ts # Servidor MCP
│   │   ├── sdlc/
│   │   │   ├── sdlc.command.ts      # Padre (subcomandos)
│   │   │   ├── handoff.command.ts   # Transición de fase
│   │   │   └── generate-domain.command.ts
│   │   └── architecture/
│   │       └── scaffold.command.ts  # Configuración de Nx workspace
│   └── core/
│       ├── config/
│       │   └── config.service.ts    # Gestión de config YAML
│       ├── filesystem/
│       │   └── file-manager.service.ts  # Operaciones seguras de archivos
│       ├── sync/
│       │   └── sync.service.ts      # Sincronización de templates
│       ├── validators/
│       │   └── ruleset-validator.service.ts  # Validación central
│       ├── mcp/
│       │   ├── mcp-server.service.ts # Servidor MCP (stub)
│       │   └── watcher.service.ts   # Vigilante de archivos
│       └── architecture/
│           ├── workspace-manager.strategy.ts  # Interfaz
│           └── nx-workspace.strategy.ts      # Implementación Nx
└── test/
    └── *.e2e-spec.ts
```

### 2.3 Dependencias

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| @clack/prompts | ^1.5.1 | UI interactiva de CLI |
| @nestjs/common | ^11.1.24 | Framework DI |
| @nestjs/core | ^11.1.24 | Runtime NestJS |
| chalk | ^4.1.2 | Colores de terminal |
| chokidar | ^5.0.0 | Vigilancia de archivos |
| conf | ^15.1.0 | Almacenamiento de config |
| fs-extra | ^11.3.5 | Operaciones de archivos |
| nest-commander | ^3.20.1 | Framework de comandos CLI |
| ora | ^9.4.0 | Indicadores de spinner |
| yaml | ^2.9.0 | Parseo de YAML |

---

## 3. Inventario de Comandos CLI

### 3.1 Comandos Implementados

| Comando | Estado | Notas |
|---------|--------|-------|
| `smart-cli validate` | IMPLEMENTADO | Validación completa con --satellite, --core, --ruleset, --format, --output |
| `smart-cli init` | PARCIALMENTE_IMPLEMENTADO | Wizard interactivo funciona; modo batch stub; creación de archivos mockeada |
| `smart-cli mcp serve` | PARCIALMENTE_IMPLEMENTADO | Watcher inicia pero el servidor MCP es stub |

### 3.2 Comandos Stub

| Comando | Estado | Evidencia |
|---------|--------|-----------|
| `smart-cli agents` | STUB | `// TODO: Logic for agent installation` (agents.command.ts:14) |
| `smart-cli upgrade` | STUB | `// TODO: logic for upgrading satellite structures safely` (upgrade.command.ts:14) |
| `smart-cli docs` | STUB | `// TODO: logic for scaffolding docs` (docs.command.ts:14) |

### 3.3 Comandos POC

| Comando | Estado | Evidencia |
|---------|--------|-----------|
| `smart-cli sdlc handoff` | MOCK/POC | `[MOCK] Starting handoff process...` (handoff.command.ts:14) |
| `smart-cli sdlc generate` | MOCK/POC | `[MOCK] Generating domain...` (generate-domain.command.ts:15) |
| `smart-cli scaffold` | PARCIALMENTE_IMPLEMENTADO | Prompts funcionan; exec mockeado via setTimeout |

---

## 4. Inventario del Servidor MCP

### 4.1 Estado Actual

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Transporte | NO_IMPLEMENTADO | McpServerService solo registra "Servidor MCP en escucha" |
| Herramientas | NO_IMPLEMENTADO | No existen definiciones de herramientas |
| Recursos | NO_IMPLEMENTADO | No existen handlers de recursos |
| Prompts | NO_IMPLEMENTADO | No existen plantillas de prompts |
| Integración con Watcher | PARCIALMENTE_IMPLEMENTADO | WatcherService vigila archivos pero no notifica a MCP |

### 4.2 Capacidades del Watcher (Parcial)

El `WatcherService` vigila:
- `**/*.md` — Archivos Markdown
- `package.json` — Manifiesto del paquete
- `evolith.setup.json` — Configuración de Evolith

Detecta cambios en:
- `reference/core/architecture/` — Documentos de arquitectura
- `docs/` — Documentación

Pero solo registra recomendaciones, no se integra con el protocolo MCP.

---

## 5. Cobertura de Validación de Rulesets

### 5.1 Validación Completa (Siempre se Ejecuta)

| ID de Regla | Verificación | Implementado |
|-------------|--------------|--------------|
| GOV-01 | evolith.yaml existe | SÍ |
| GOV-02 | governance.version declarado | SÍ |
| INH-02 | coreRef.version es semver válido | SÍ |
| ACL-01 | Directorio ACL no vacío | SÍ |
| OCB-01 | Licencia no es enterprise-only | SÍ |

### 5.2 Validación Selectiva (flag --ruleset)

| ID de Ruleset | Soportado |
|---------------|-----------|
| adr-0002 | SÍ |
| adr-0005 | SÍ |
| adr-0010 | SÍ |
| adr-0018 | SÍ |
| adr-0032 | SÍ |
| adr-0040 | SÍ |
| adr-0050 | SÍ |
| acl | SÍ |
| open-core | SÍ |
| inheritance | SÍ |

### 5.3 NO Validado por CLI

| Categoría | Rulesets |
|-----------|----------|
| Arquitectura | f1-modular-monolith, f2-distributed-modules, f3-microservicios |
| Transversales | compliance-baseline, definition-of-done, engineering-manifesto, repository-taxonomy |
| SDLC | phase-gates, quality-thresholds |
| Gobernanza | satellite-contracts, executive-scorecards |

---

## 6. Cobertura de Pruebas

### 6.1 Pruebas Unitarias

| Servicio | Cobertura |
|----------|-----------|
| ConfigService | SÍ — get/set/addSatellite |
| SyncService | SÍ — lógica de copia de archivos |
| WatcherService | SÍ — startWatching/destroy |
| FileManagerService | SÍ — escenarios de safeCopy |
| RulesetValidatorService | **NO** — Faltante |

**Cobertura de Pruebas Unitarias:** ~25% (4 de ~16 servicios)

### 6.2 Pruebas E2E

Las 6 pruebas E2E son stubs mínimos que solo ejecutan el comando sin verificar comportamiento.

| Comando | Estado E2E |
|---------|------------|
| init | STUB |
| validate | STUB |
| agents | STUB |
| docs | STUB |
| upgrade | STUB |
| mcp-serve | STUB |

---

## 7. Violaciones Arquitectónicas

### 7.1 El Servidor MCP No Implementa el Protocolo

`McpServerService.onModuleInit()` debería usar `@modelcontextprotocol/sdk` o similar para implementar transporte JSON-RPC sobre stdio. Actualmente solo registra un mensaje.

### 7.2 CLI No Tiene Validación de Arquitectura

`smart-cli validate` no verifica:
- Reglas de arquitectura F1/F2/F3
- Límites de arquitectura hexagonal
- Aislamiento de capa de dominio
- Implementación de multi-tenencia

### 7.3 Los Comandos No Son Extensibles

No existe un sistema de plugins. Agregar nuevos comandos requiere modificar el código base directamente.

### 7.4 El Watcher de MCP No Notifica

`WatcherService` detecta desviación arquitectónica pero no tiene mecanismo para enviar notificaciones a clientes MCP.

---

## 8. Configuración

### 8.1 Almacenamiento de Config

Usa el paquete `conf` con extensión de archivo YAML:
- **Ruta:** `~/.config/evolith-cli/` (dependiente de la plataforma)
- **Valores por defecto:** `{ version: "1.0.0", telemetryEnabled: true, knownSatellites: [] }`

### 8.2 Configuración de Satellite

Los satellites usan `evolith.yaml` en la raíz con la siguiente estructura:
- `apiVersion: evolith.dev/v1`
- `kind: Satellite`
- `metadata.name`, `metadata.phase`, `metadata.architectureVersion`
- `spec.coreRef.version`, `spec.coreRef.rulesetVersion`
- `spec.runtime.language`, `spec.runtime.framework`
- `spec.sdlc.currentPhase`, `spec.sdlc.gates`
- `spec.boundedContexts`
- `spec.compliance.adrRegistry`, `spec.compliance.qualityWaivers`
- `spec.governance.executiveSponsor`

---

## 9. Formatos de Salida

### 9.1 Salida JSON (comando validate)

```json
{
  "status": "failed",
  "rulesChecked": 5,
  "issues": [
    {
      "ruleId": "GOV-01",
      "severity": "MUST",
      "category": "governance",
      "title": "evolith.yaml missing",
      "description": "...",
      "file": "/path/to/evolith.yaml",
      "blocking": true
    }
  ],
  "coreRef": { "version": null, "path": null },
  "timestamp": "2026-06-06T12:00:00.000Z"
}
```

### 9.2 Códigos de Salida

| Código | Significado |
|--------|-------------|
| 0 | ÉXITO |
| 1 | VALIDACIÓN_FALLIDA |
| (no definido) | Otros errores |

---

## 10. Resumen de Gaps

| Gap | Severidad | Impacto |
|-----|-----------|---------|
| Servidor MCP no implementado | CRÍTICO | Los agentes de IA no pueden consumir la gobernanza de Evolith |
| Instalación de agentes no implementada | ALTO | Los satellites no pueden incorporar agentes de IA |
| Lógica de upgrade no implementada | ALTO | No hay ruta segura de upgrade para satellites |
| Validación de arquitectura incompleta | ALTO | No se pueden validar reglas F1/F2/F3 |
| Watcher MCP no integrado | MEDIO | Sin detección de desviación arquitectónica en tiempo real |
| Operaciones SDLC son mocks | MEDIO | Los phase gates no pueden ejecutarse |
| Baja cobertura de pruebas | MEDIO | Riesgo de regresiones |
| Sin sistema de plugins | BAJO | Extensibilidad limitada |

---

## 11. Próximos Pasos

Ver: `sdk-cli-mcp-implementation-roadmap.md`

---

[Volver al Índice de Planificación SDK/CLI](./README.md)
