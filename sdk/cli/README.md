# Evolith SDK CLI

Welcome to the official Evolith CLI. This tool is designed to automate the adoption of Evolith standards, architecture, and governance in satellite repositories.

Language: [English](./README.md) | [Español](./README.es.md)

## Installation

You can install the tool globally via NPM:

```bash
npm install -g @evolith/cli
```

Or run it on demand using `npx`:

```bash
npx @evolith/cli init
```

## Main Commands

### `init`
Interactively initializes a satellite repository, setting up bilingual documentation rules, base templates, and required agents.
*Supports interactive mode (wizard) and batch mode via `--config evolith.setup.json`.*

### `agents`
Installs and configures agents in your repository (e.g., `bmad`, `architecture`, `qa`).
```bash
evolith agents install
```

### `validate`
Verifies that the repository complies with Evolith structure and rules (Mermaid, stable anchors, bilingual parity).
Ideal for use in your CI/CD pipelines:
```bash
evolith validate --format json
```

### `daemon`
Starts the background watcher and the MCP (Model Context Protocol) server to integrate with IDEs like VSCode or assistants like Antigravity.
```bash
evolith daemon start
```

### `upgrade`
Downloads the latest upstream Evolith rules, templates, and guidelines and intelligently applies them to the satellite without overwriting custom code (idempotent).

## How-To

A typical workflow with the Evolith CLI in a satellite repository:

1. **Initialize the environment**:
   Go to your project directory (or create it) and run the initialization command. This will set up the base rules, directory structures, and templates:
   ```bash
   npx @evolith/cli init
   ```

2. **Install the required agents**:
   To add capabilities like QA validation or architecture design, install the preconfigured agents:
   ```bash
   evolith agents install
   ```

3. **Validate your repository (CI/CD)**:
   You can continuously validate (e.g., in a pre-commit hook or pipeline) that bilingual documentation, Mermaid diagrams, and links are correct:
   ```bash
   evolith validate --format json
   ```

## Architecture

To learn about implementation details, technical decisions, and the domain model behind the CLI and the broader SDK, see the following architecture documentation:

* [Evolith SDK Architecture](../../reference/architecture/evolith-sdk/README.md)
* [Domain Model](../../reference/architecture/evolith-sdk/domain-model.md)
* [Technical Design](../../reference/architecture/evolith-sdk/technical-design.md)

## Governance
This CLI strictly adheres to the policies established in Evolith's `AGENTS.md`.

