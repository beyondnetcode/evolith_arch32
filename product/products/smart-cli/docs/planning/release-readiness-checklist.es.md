# Lista de Verificación de Preparación para Release

> **Estado:** Borrador
> **Fecha:** 2026-06-06
> **Propietario:** Equipo SDK

---

## 1. Descripción General

Esta lista define los criterios de preparación para liberar los componentes SDK, CLI y MCP. Cada phase gate tiene requisitos específicos que deben cumplirse antes del release.

---

## 2. Gates Universales Pre-Release

Estos gates aplican a cada release independientemente de la fase.

### 2.1 Calidad de Código

- [ ] Todo TypeScript compila sin errores (`npm run build`)
- [ ] Sin comentarios `TODO` o `FIXME` en el alcance del release
- [ ] Sin secretos, llaves o credenciales hardcodeadas
- [ ] Sin console.log/debug en código de producción
- [ ] `version` en Package.json actualizada apropiadamente (semver)
- [ ] `CHANGELOG.md` actualizado con cambios del release

### 2.2 Documentación

- [ ] README.md refleja el estado actual de SDK/CLI/MCP
- [ ] Todos los métodos públicos de API tienen comentarios JSDoc
- [ ] Guía de migración creada si existen cambios breaking
- [ ] Documentación bilingüe actualizada (pares EN + ES)

### 2.3 Git y Control de Versiones

- [ ] Historial de commits limpio (sin commits WIP)
- [ ] Tag de versión creado: `sdk-cli-mcp-vX.Y.Z`
- [ ] Protección de rama habilitada en `main`
- [ ] PR revisado y aprobado (mínimo 1 aprobador)

---

## 3. Gates de Fase 1 (Base SDK)

### 3.1 Servicios Core del SDK

- [ ] `RulesetValidatorService` implementado y probado unitariamente (80%+ cobertura)
- [ ] `EvolithYamlService` implementado y probado unitariamente
- [ ] `BilingualValidationService` implementado y probado unitariamente
- [ ] `ArchitectureValidationService` skeleton implementado
- [ ] Todos los servicios exportan interfaces TypeScript adecuadas

### 3.2 Comando Validate del CLI

- [ ] Flag `--satellite` funcional
- [ ] Flag `--core` funcional
- [ ] Flag `--ruleset` funcional
- [ ] Flag `--format` funcional (json, summary, table)
- [ ] Flag `--output` funcional (ruta a archivo)
- [ ] Comando `validate` pasa todas las pruebas de integración

### 3.3 Paquete SDK

- [ ] `package.json` tiene `name` correcto: `@evolith/sdk`
- [ ] Campo `exports` mapea correctamente todos los puntos de entrada del servicio
- [ ] Campo `types` apunta al archivo de declaración correcto
- [ ] SDK puede importarse en proyecto TypeScript externo
- [ ] SDK hace tree-shaking correctamente (sin código no usado empaquetado)

---

## 4. Gates de Fase 2 (Finalización CLI)

### 4.1 Comandos de Gestión de Agentes

- [ ] `smart-cli agent install` crea estructura de ruleset válida
- [ ] `smart-cli agent list` muestra agentes instalados
- [ ] `smart-cli agent validate` valida ruleset del agente
- [ ] `smart-cli agent upgrade` maneja actualizaciones de versión
- [ ] `smart-cli agent remove` elimina agente limpiamente

### 4.2 Validación de Arquitectura

- [ ] `smart-cli architecture validate` verifica independencia modular F1
- [ ] `smart-cli architecture validate` verifica límites de contratos F2
- [ ] `smart-cli architecture validate` verifica preparación para extracción F3
- [ ] Salida de validación incluye violaciones de reglas específicas con códigos

### 4.3 Operaciones SDLC

- [ ] `smart-cli sdlc handoff` genera manifiesto de artefactos
- [ ] `smart-cli sdlc handoff` valida requisitos de phase gate
- [ ] `smart-cli sdlc status` muestra estado actual del phase gate
- [ ] `smart-cli sdlc advance` dispara transición de fase (si autorizado)

---

## 5. Gates de Fase 3 (Implementación MCP)

### 5.1 Core del Servidor MCP

- [ ] Servidor MCP inicia vía comando `smart-cli mcp`
- [ ] Cumplimiento JSON-RPC 2.0 verificado
- [ ] StdioServerTransport implementado correctamente
- [ ] Servidor responde a solicitud `initialize`
- [ ] Servidor responde a solicitud `shutdown`

### 5.2 Herramientas MCP

- [ ] Herramienta `evolith-validate` acepta argumentos `path`, `format`, `ruleset`
- [ ] `evolith-validate` retorna resultado JSON estructurado
- [ ] Herramienta `evolith-agent-install` acepta argumentos `name`, `template`
- [ ] `evolith-agent-install` retorna confirmación de instalación
- [ ] Herramienta `evolith-architecture-validate` implementada
- [ ] Herramienta `evolith-sdlc-handoff` implementada

### 5.3 Recursos MCP

- [ ] Recurso `evolith://rulesets` lista rulesets disponibles
- [ ] Recurso `evolith://ruleset/{name}` retorna contenido del ruleset
- [ ] Recurso `evolith://phase-gates` muestra estado de fase actual
- [ ] Recurso `evolith://agents` lista agentes instalados

### 5.4 Prompts MCP

- [ ] Plantilla de prompt `evolith/validate-repository` definida
- [ ] Plantilla de prompt `evolith/agent-onboarding` definida
- [ ] Plantilla de prompt `evolith/architecture-review` definida
- [ ] Prompts incluyen instrucciones adecuadas para Claude Desktop

---

## 6. Gates de Fase 4+ (Futuro)

### 6.1 Extracción SDK

- [ ] SDK publicado en registro npm (si aplica)
- [ ] Estrategia de versionado SDK documentada
- [ ] Política de deprecación SDK definida

### 6.2 Sistema de Plugins

- [ ] Interfaz de plugin documentada (ver G-10)
- [ ] Mecanismo de descubrimiento de plugins implementado
- [ ] Modelo de seguridad/sandboxing de plugins definido

---

## 7. Pruebas de Regresión

Antes de cualquier release, ejecute el siguiente conjunto de regresión:

### 7.1 Regresión Core

```
npm run test:unit -- --reporter=verbose
npm run test:integration -- --reporter=verbose
npm run build
```

### 7.2 Regresión CLI

```
node dist/cli.js validate --help
node dist/cli.js validate --satellite --format=json
node dist/cli.js agent install --name=regression-test --dir=/tmp/test-agent
node dist/cli.js agent list
```

### 7.3 Regresión MCP

```
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | node dist/mcp-server.js
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | node dist/mcp-server.js
```

---

## 8. Firmas de Release

| Rol | Nombre | Fecha | Firma |
|-----|--------|------|-------|
| Propietario SDK | | | |
| Propietario CLI | | | |
| Propietario MCP | | | |
| Revisor de Arquitectura | | | |

---

## 9. Referencias

- [Estrategia de Testing](./testing-strategy.md)
- [Roadmap de Implementación](./sdk-cli-mcp-implementation-roadmap.md)
- [Análisis de Gaps](./sdk-cli-mcp-gap-analysis.md)
