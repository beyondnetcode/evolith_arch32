# BMAD Composable Skills Framework

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

**Purpose:** Define, register, and discover composable skills that BMAD agents can invoke to perform specialized tasks on the Evolith repository.

---

## 1. What Are Skills?

A **skill** is a self-contained, composable capability that an agent can invoke to perform a specific task. Skills differ from raw scripts in that:

- They have a **declared contract** (inputs, outputs, owner) in `manifest.json`.
- They are **discoverable** — agents can list available skills and select the right one.
- They are **composable** — multiple skills can be chained in a workflow.
- They follow a **consistent pattern** — every skill has a documentation file, a manifest entry, and an optional implementation script.

## 2. Skill Structure

```
.bmad-core/skills/
├── README.md                              # This file
├── README.es.md                           # Spanish version
├── manifest.json                          # Registry of all skills
├── requirements-traceability-mapper.md    # Skill definition (EN)
├── requirements-traceability-mapper.es.md # Skill definition (ES)
├── gap-prioritization-engine.md           # Skill definition (EN)
├── gap-prioritization-engine.es.md        # Skill definition (ES)
├── adr-freshness-monitor.md              # Skill definition (EN)
├── adr-freshness-monitor.es.md           # Skill definition (ES)
├── self-improving-loop.md                # Skill definition (EN)
└── self-improving-loop.es.md             # Skill definition (ES)
```

Implementation scripts live alongside other harness scripts:

```
.harness/scripts/skills/
├── requirements-traceability-mapper.mjs
├── gap-prioritization-engine.mjs
├── adr-freshness-monitor.mjs
└── self-improving-loop.mjs
```

## 3. How to Define a New Skill

### Step 1: Create the skill documentation

Create `skills/<skill-name>.md` with:

```markdown
# <Skill Name>

## Purpose
<One-paragraph description>

## Contract
| Field | Value |
|-------|-------|
| ID | `<skill-id>` |
| Owner | `@<agent-role>` |
| Version | `X.Y.Z` |
| Inputs | <list of input artifacts> |
| Outputs | <list of output artifacts> |

## Algorithm
<Step-by-step description of what the skill does>

## Usage
\`\`\`bash
node .harness/scripts/skills/<skill-name>.mjs [flags]
\`\`\`

## Output Format
<JSON schema or example of the output>
```

### Step 2: Create the Spanish counterpart

Create `skills/<skill-name>.es.md` with identical `##` and `###` header structure.

### Step 3: Register in manifest.json

Add an entry to the `skills` array in `manifest.json`:

```json
{
  "id": "<skill-name>",
  "name": "<Human-readable name>",
  "version": "1.0.0",
  "owner": "@<agent-role>",
  "description": "<Short description>",
  "inputs": ["<input1>", "<input2>"],
  "outputs": ["<output1>"],
  "file": ".harness/scripts/skills/<skill-name>.mjs",
  "tags": ["<tag1>", "<tag2>"]
}
```

### Step 4: Implement the script (optional)

If the skill has an implementation, create `.harness/scripts/skills/<skill-name>.mjs` following the pattern:

```javascript
#!/usr/bin/env node
const SCRIPT_VERSION = "1.0.0";

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`<Skill Name> v${SCRIPT_VERSION}\n\nUsage: ...`);
  process.exit(0);
}

// Implementation...
console.log(JSON.stringify(result, null, 2));
process.exit(0);
```

## 4. How Agents Consume Skills

Agents reference skills in two ways:

### 4.1 Via YAML Frontmatter

Each agent persona file declares available skills:

```yaml
---
name: Analyst Agent
skills:
  - requirements-traceability-mapper
---
```

### 4.2 Via Script Invocation

Agents invoke skills directly:

```bash
# Run a skill
node .harness/scripts/skills/requirements-traceability-mapper.mjs

# With flags
node .harness/scripts/skills/gap-prioritization-engine.mjs --threshold 30
```

## 5. Available Skills

| ID | Name | Owner | Description |
|----|------|-------|-------------|
| `requirements-traceability-mapper` | Requirements Traceability Mapper | @analyst | Maps epics/stories to ADRs, rulesets, and tests |
| `gap-prioritization-engine` | Gap Prioritization Engine | @po | Calculates gap priority by impact × urgency |
| `adr-freshness-monitor` | ADR Freshness Monitor | @architect | Scans ADRs for staleness (>180 days) |
| `self-improving-loop` | Self Improving Loop | @winston | Emits progress-audit records and routes repeated findings into gaps, rules, skills, playbooks, schemas, or CI |

## 6. Skill Lifecycle

```
draft → proposed → accepted → active
```

| Stage | Gate |
|-------|------|
| **draft** | Skill doc + manifest entry created |
| **proposed** | Implementation script created, passes `--help` |
| **accepted** | Script produces correct output, registered in manifest |
| **active** | Agent persona references skill, used in workflows |

---

*See [BMAD Core README](../README.md) for repository context.*
*See [manifest.json](./manifest.json) for the complete skill registry.*
