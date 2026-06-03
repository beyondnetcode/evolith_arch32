# Evolith SDK CLI

Bienvenido al CLI oficial de Evolith. Esta herramienta está diseñada para automatizar la adopción de los estándares, arquitectura y gobernanza de Evolith en repositorios satélite.

Language: [English](./README.md) | [Español](./README.es.md)

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

## Cómo usarlo (How-To)

Un flujo típico de trabajo con el CLI de Evolith en un repositorio satélite:

1. **Inicializar el entorno**:
   Ve al directorio de tu proyecto (o créalo) y ejecuta el comando de inicialización. Esto configurará las reglas base, estructuras de directorios y plantillas:
   ```bash
   npx @evolith/cli init
   ```

2. **Instalar los agentes requeridos**:
   Para añadir capacidades como validación QA o diseño de arquitectura, instala los agentes preconfigurados:
   ```bash
   evolith agents install
   ```

3. **Validar tu repositorio (CI/CD)**:
   Puedes validar continuamente (por ejemplo, en un hook de pre-commit o pipeline) que la documentación bilingüe, diagramas Mermaid y enlaces sean correctos:
   ```bash
   evolith validate --format json
   ```

## Arquitectura

Para conocer los detalles de implementación, decisiones técnicas y el modelo de dominio detrás del CLI y el SDK en general, consulta la siguiente documentación de arquitectura:

* [Arquitectura del Evolith SDK](../../reference/architecture/evolith-sdk/README.es.md)
* [Modelo de Dominio](../../reference/architecture/evolith-sdk/domain-model.es.md)
* [Diseño Técnico](../../reference/architecture/evolith-sdk/technical-design.es.md)

## Gobernanza
Este CLI cumple estrictamente las políticas establecidas en `AGENTS.md` de Evolith.
