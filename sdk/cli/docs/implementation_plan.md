# Implementación del CLI de Evolith

Este documento describe el plan técnico para construir el **Evolith CLI**, como parte del SDK oficial en el repositorio `evolith_arch32`. El CLI permitirá automatizar y guiar la inicialización y configuración de repositorios satélite siguiendo los estándares de Evolith.

## Arquitectura y Stack Tecnológico Propuesto

Basado en los nuevos requerimientos (Daemon, Integración IDE, MCP) y el uso de **Node.js con TypeScript**, recomiendo fuertemente usar **NestJS** junto con **SQLite**.

**¿Por qué NestJS?**
1. **Estructura Empresarial:** Al ser el SDK oficial, NestJS provee inyección de dependencias y modularidad, ideal para manejar la complejidad creciente (CLI interactivo + Daemon de fondo + Servidor MCP).
2. **nest-commander:** NestJS cuenta con soporte oficial para CLIs, permitiendo escribir comandos de consola estructurados mientras se reutilizan los mismos servicios del Daemon.
3. **Servidor MCP/API Integrado:** El Daemon necesita exponer endpoints locales para Antigravity/VSCode. NestJS brilla exactamente en esto.

**Base de Datos Local (YAML / JSON):**
Para mantener el estado de sincronización de plantillas, configuración del CLI y caché de repositorios satélites locales, usaremos **archivos de configuración en formato YAML o JSON** (ubicados generalmente en `~/.evolith/config.yaml`).

**Integración con IDEs (VSCode / Antigravity - OpenCode Style):**
El daemon de NestJS incluirá un servidor MCP (Model Context Protocol). Esto permitirá que asistentes como Antigravity o extensiones de VSCode descubran los comandos del CLI nativamente, permitiendo a los usuarios invocar comandos de Evolith directamente desde el chat del IDE o la paleta de comandos (similar a OpenCode).

**¿Por qué Archivos Planos sobre SQLite/Prisma?**
Para un CLI que se distribuirá vía NPM y binarios autónomos (NuGet/pkg), llevar un motor de base de datos como Prisma+SQLite incrementa drásticamente el peso del paquete (por los binarios de Prisma) y complica el empaquetado. Herramientas líderes de la industria (AWS CLI, GitHub CLI, Vercel) utilizan archivos YAML o JSON locales por ser ligeros, fáciles de leer por humanos y no requerir dependencias binarias pesadas. Utilizaremos librerías ligeras (como `conf` o `yaml`) para manejar este estado.

## Execution Modes

El CLI soportará múltiples formas de ejecución para adaptarse al entorno del usuario:
1. **Global (NPM):** `npm install -g @evolith/smart-cli` permitiendo usar `smart-cli init` en cualquier directorio.
2. **Npx (On-demand):** `npx @evolith/smart-cli init` para asegurar usar siempre la última versión sin instalarla globalmente.
3. **Local/Script:** Ejecución desde el paquete local clonado (`npm run cli -- init`) útil para desarrollo del propio SDK.
4. **Daemon Service:** Ejecución en segundo plano persistente (`smart-cli daemon start`).

## Template Management & Synchronization

Las plantillas vivirán dentro de `sdk/cli/templates/` para asegurar que el paquete distribuido (NPM) sea autocontenido y portable.
**Mecanismo de sincronización:** Se desarrollará un script interno/comando (`smart-cli internal sync-templates`) que se ejecutará en tiempo de compilación o mediante un Hook de Git. Este script copiará los archivos oficiales de `.harness/` y `reference/` hacia `sdk/cli/templates/`, garantizando que el CLI siempre se empaquete con la última versión de los estándares de Evolith sin obligar al usuario a hacer mantenimiento manual.

## Características "Premium" del CLI
1. **Terminal UI (TUI) Moderna:** Uso de `@clack/prompts` para el modo interactivo (tipo *stepper*, similar a SvelteKit) y `ora` para indicadores de carga rápidos y limpios.
2. **Modo Simulacro (`--dry-run`):** Todos los comandos soportarán esta bandera para simular y previsualizar qué archivos se crearían/modificarían sin tocar el disco.
3. **Idempotencia:** Ejecutar el comando múltiples veces generará el mismo resultado esperado. El CLI saltará (`[SKIP]`) las configuraciones que ya estén aplicadas según el estándar.
4. **Auto-Update Notifications:** Al finalizar la ejecución, el CLI verificará asíncronamente en NPM si existe una nueva versión y sugerirá la actualización.
5. **Telemetría Opt-In:** Se recopilarán datos básicos de uso de comandos (completamente anónimo y desactivable) para medir la adopción en la organización.
6. **Reportes de Auditoría (CI/CD Gates):** El comando `smart-cli validate` soportará `--format json` para generar reportes estructurados que permitan a los pipelines de los satélites bloquear o aprobar _Pull Requests_ en base a las métricas de gobernanza.
7. **Git Hooks Automáticos:** Durante la inicialización (`smart-cli init`), el CLI configurará **Husky** en el repositorio satélite para asegurar validaciones _pre-commit_ (paridad bilingüe, anclas, diagramas) directamente en la máquina del desarrollador.

## CI/CD Pipeline & GitHub Releases
Se configurará un pipeline completo de GitHub Actions (`.github/workflows/sdk-cli-release.yml`) encargado de:
- **Automatizar Changelogs:** Generación automática de *Release Notes* basada en Conventional Commits (usando herramientas como `release-please` o `standard-version`).
- **NPM & NuGet Publishing:** Publicar automáticamente el paquete `@evolith/smart-cli` a NPM, y empaquetar una distribución binaria usando `pkg` para distribuirlo opcionalmente vía NuGet u otros repositorios de binarios internos.
- **GitHub Releases:** Etiquetar y publicar la versión en la pestaña de Releases de GitHub.

## Proposed Changes

### Arquitectura del CLI

Se creará un proyecto en la ruta `/sdk/cli` utilizando **NestJS**, **TypeScript** y **SQLite**:
- `@nestjs/core`, `@nestjs/common`: Base del framework.
- `nest-commander`: Para el parseo y ejecución de comandos CLI.
- `inquirer` o `prompts`: Para el asistente interactivo.
- `chokidar`: Para el File Watcher del daemon.
- `yaml` y `conf` (o equivalente): Para el almacenamiento ligero de configuraciones.
- `fs-extra`: Para manipulación segura de archivos.

Se definirá la siguiente estructura de directorios:

#### [NEW] /sdk/cli/package.json
Archivo de configuración de Node.js.

#### [NEW] /sdk/cli/src/main.ts
Punto de entrada ejecutable del CLI usando `CommandFactory` de NestJS.

#### [NEW] /sdk/cli/src/app.module.ts
Módulo raíz que importa los sub-módulos (Commands, Daemon, Database, Utils).

#### [NEW] /sdk/cli/src/commands/init.command.ts
Comando `smart-cli init` implementado como un Command de NestJS. Maneja modo interactivo y batch.

#### [NEW] /sdk/cli/src/commands/agents.command.ts
#### [NEW] /sdk/cli/src/commands/validate.command.ts
#### [NEW] /sdk/cli/src/commands/docs.command.ts
#### [NEW] /sdk/cli/src/commands/upgrade.command.ts
#### [NEW] /sdk/cli/src/commands/daemon.command.ts
Comandos auxiliares del CLI para el manejo de agentes, validación, scaffold, upgrades y daemon.

#### [NEW] /sdk/cli/src/daemon/daemon.module.ts
Módulo de NestJS responsable del servidor de background.

#### [NEW] /sdk/cli/src/daemon/watcher.service.ts
Servicio que monitorea los cambios locales en el repositorio satélite utilizando `chokidar`. Al detectar patrones de promoción upstream, guarda eventos en SQLite y notifica.

#### [NEW] /sdk/cli/src/daemon/mcp-server.service.ts
Servicio que expone el CLI a herramientas como **Antigravity** o **VSCode** mediante MCP o API local.

#### [NEW] /sdk/cli/src/sync/sync.service.ts
Servicio interno encargado de copiar y sincronizar las plantillas desde el repo padre (`evolith`) hacia `sdk/cli/templates` en tiempo de build.

#### [NEW] /sdk/cli/src/utils/publish.ts
Scripts para publicar en NPM/NuGet.

#### [NEW] /sdk/cli/src/utils/file-manager.service.ts
Módulo responsable de copiar archivos de forma segura: verificando si existen, preguntando confirmación para sobrescribir, creando backups y llevando el registro para el reporte final (`setup-report.md`).

#### [NEW] /sdk/cli/templates/
Directorio que contendrá las plantillas base (archivos esqueleto) si se decide no leerlos directamente del repositorio padre.

#### [NEW] /sdk/cli/README.md
Documentación específica del CLI, cómo instalarlo y usarlo localmente y en repositorios satélite.

### Actualización de Documentación Evolith (Estricta adherencia a reglas)

La documentación se elaborará respetando de manera estricta los estándares y **reglas de documentación de Evolith** (paridad bilingüe, anclas estables, validación de Mermaid, etc.).

#### [MODIFY] /README.md & /README.es.md
Se agregará una sección destacada en los README principales mencionando el **Evolith SDK / CLI**. Incluirá un link altamente visible explicando qué es, qué problema resuelve y guiando a la documentación principal de uso.

#### [MODIFY] /MASTER_INDEX.md & /MASTER_INDEX.es.md
Se agregarán los enlaces directos y resaltados apuntando a la documentación oficial del CLI.

#### [NEW] /reference/sdk/cli/README.md & /reference/sdk/cli/README.es.md
(O en `/sdk/cli/README.md` según aplique). Documentación técnica exhaustiva bilingüe explicando:
- Cómo instalar y usar (modos interactivo y batch).
- Relación con Evolith SDK y BMAD.
- Referencia de comandos.
- Cómo extender el CLI.

## Verification Plan

### Automated Tests
- Se incluirán pruebas unitarias mínimas (usando un test runner como `jest` o `node:test`) para validar que el parseo de configuración (batch mode) y las reglas de `fileManager.js` (no sobrescribir sin permiso) funcionen correctamente.
- Se verificará que el CLI pueda ser invocado (ej. `node ./bin/evolith.js --help`).

### Manual Verification
- Ejecutar `smart-cli init` en una carpeta de prueba interactiva y validar el `setup-report.md` generado.
- Ejecutar `smart-cli init --config evolith.setup.json` con un archivo de prueba para comprobar el modo desatendido.
- Verificar que los archivos generados en la carpeta de prueba incluyan `README.md`, `AGENTS.md` y estructura de directorios acorde a los estándares Evolith.
