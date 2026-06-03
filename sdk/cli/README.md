# Evolith SDK CLI

Bienvenido al CLI oficial de Evolith. Esta herramienta está diseñada para automatizar la adopción de los estándares, arquitectura y gobernanza de Evolith en repositorios satélite.

## Instalación

Puedes instalar la herramienta globalmente vía NPM:

```bash
npm install -g @evolith/cli
```

O ejecutarla bajo demanda usando `npx`:

```bash
npx @evolith/cli init
```

## Comandos Principales

### `init`
Inicializa interactivamente un repositorio satélite, configurando las reglas de documentación bilingüe, plantillas base y agentes requeridos.
*Soporta el modo interactivo (asistente) y modo batch vía `--config evolith.setup.json`.*

### `agents`
Instala y configura agentes en tu repositorio (por ejemplo, `bmad`, `architecture`, `qa`).
```bash
evolith agents install
```

### `validate`
Verifica que el repositorio cumpla con la estructura y reglas de Evolith (Mermaid, anclas estables, paridad bilingüe).
Ideal para usar en tus pipelines de CI/CD:
```bash
evolith validate --format json
```

### `daemon`
Inicia el watcher en background y el servidor MCP (Model Context Protocol) para integrarse con IDEs como VSCode o asistentes como Antigravity.
```bash
evolith daemon start
```

### `upgrade`
Descarga las últimas reglas, templates y directrices de Evolith upstream y las aplica inteligentemente al satélite sin sobrescribir código personalizado (idempotente).

## Gobernanza
Este CLI cumple estrictamente las políticas establecidas en `AGENTS.md` de Evolith.
