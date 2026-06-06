<div align="center">

# Evolith: Progressive Architecture Reference Base

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

[![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)]()
[![Method](https://img.shields.io/badge/Method-Spec--driven_AI--DD-blueviolet?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-informational?style=for-the-badge)]()
[![CI](https://img.shields.io/github/actions/workflow/status/beyondnetcode/evolith_arch32/docs.yml?style=for-the-badge&label=CI)](https://github.com/beyondnetcode/evolith_arch32/actions)
[![Coverage](https://img.shields.io/badge/Docs-100%25-brightgreen?style=for-the-badge)](./COVERAGE_REPORT.md)

<br/>

<a href="./reference/governance/sdlc/assets/master-view.png" title="Evolith E2E Product Vision — click to enlarge">
  <img src="./reference/governance/sdlc/assets/master-view.png"
       alt="Evolith E2E Product Vision"
       width="780"
       style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);" />
</a>

<sub>↑ Evolith E2E Product Vision · MD3 — <i>click to enlarge</i></sub>

<br/>

**Evolith is the corporate architecture upstream for product repositories.**<br/>
It defines reusable architecture standards, governance rules, ADRs, patterns,<br/>
and operating guidance that satellite products inherit and specialize.

> *Separate conceptually before separating physically.*

---

## 📑 Quick Navigation Menu

| Category | Entry Point | Description |
|----------|-------------|-------------|
| 📚 **Architecture** | [Hub](./reference/architecture/README.md) | Patterns, blueprints, decisions |
| 🏛️ **ADRs** | [Registry](./reference/architecture/adrs/README.md) | 70+ architecture decisions |
| 🏗️ **Engineering** | [Manifesto](./reference/governance/standards/engineering/engineering-manifesto.md) | Standards, conventions |
| 🚦 **SDLC** | [Governance](./reference/governance/sdlc/README.md) | Phase gates, delivery flow |
| 🤖 **AI & Tools** | [Smart CLI](./sdk/cli/README.md) | `npx @evolith/smart-cli init` |
| 📊 **Vision** | [Product Vision](./reference/governance/standards/vision/evolith-product-vision-master.md) | Strategy & roadmap |
| 🔍 **Gap Analysis** | [Analysis](./reference/governance/standards/vision/gap-analysis-core.md) | Current state vs vision |
| 📋 **Full Index** | [Master Index](./reference/navigation/MASTER_INDEX.md) | Complete navigation |
| 🚀 **Applied Reference** | [UMS Demo](./reference/knowledge/demo/README.md) | Real product example |

---

## 🎯 Start Here — Choose Your Path

### Path 1 — 5-Minute Overview

📄 [Executive One-Pager](./reference/governance/standards/communication/visuals/v01-executive-one-pager.md) · [Español](./reference/governance/standards/communication/visuals/v01-executive-one-pager.es.md)

*What is Evolith? Why do we need it? What is UMS?*

### Path 2 — By Role

| Role | Start Here | Then Read |
|------|------------|-----------|
| 🏛️ **Architect** | [Architecture Hub](./reference/architecture/README.md) | [ADR Matrix](./reference/architecture/adrs/adr-matrix.md) |
| 👨‍💻 **Developer** | [Engineering Manifesto](./reference/governance/standards/engineering/engineering-manifesto.md) | [UMS Reference](./reference/knowledge/demo/README.md) |
| 🛠️ **DevOps/SRE** | [Operations Hub](./reference/operations/README.md) | [Infrastructure](./reference/infrastructure/README.md) |
| 📦 **Product/PM** | [UMS Reference Model](./reference/knowledge/demo/ums-reference-model.md) | [Adoption Cases](./reference/knowledge/adoption-cases.md) |
| 🤖 **AI Contributor** | [AI-Augmented Standards](./reference/governance/standards/ai-augmented/README.md) | [AGENTS.md](./AGENTS.md) |

### Path 3 — Make an Architectural Decision

1. Check [ADR Registry](./reference/architecture/adrs/README.md) — decision already exists?
2. If not, use [ADR Template](./reference/governance/sdlc/04-artifact-templates/adr-template.md)
3. Submit for [Architecture Board](./reference/governance/standards/communication/architecture-communication-strategy.md) review

---

## 📂 Repository Structure (Deep Dive)

### 📚 Architecture & Patterns
| Artifact | Purpose |
|----------|---------|
| [Architecture Hub](./reference/architecture/README.md) | Central entry for architecture |
| [Blueprints](./reference/architecture/blueprints/README.md) | Technical stacks, reference models |
| [Canonical Patterns](./reference/architecture/canonical-patterns/README.md) | Reusable design patterns |
| [C4 Topology Spec](./reference/architecture/blueprints/c4-topology-spec.md) | System visualization |

### 🏛️ Architecture Decision Records
| Artifact | Purpose |
|----------|---------|
| [ADR Registry](./reference/architecture/adrs/README.md) | All ADRs by runtime |
| [Core ADRs](./reference/architecture/adrs/core/README.md) | Language-agnostic decisions |
| [Node.js ADRs](./reference/architecture/adrs/nodejs/README.md) | Node.js specific |
| [.NET ADRs](./reference/architecture/adrs/dotnet/README.md) | .NET specific |
| [ADR Matrix](./reference/architecture/adrs/adr-matrix.md) | Decision overview |

### 🏗️ Engineering Standards
| Artifact | Purpose |
|----------|---------|
| [Engineering Manifesto](./reference/governance/standards/engineering/engineering-manifesto.md) | Core principles |
| [Contract Testing](./reference/governance/standards/engineering/contract-testing-guideline.md) | Integration testing |
| [Observability](./reference/governance/standards/engineering/observability-playbook.md) | Monitoring & tracing |
| [Vendor Risk](./reference/governance/standards/engineering/vendor-risk-assessment.md) | Third-party assessment |

### 🚦 SDLC & Delivery
| Artifact | Purpose |
|----------|---------|
| [SDLC Governance](./reference/governance/sdlc/README.md) | Phase gates, quality gates |
| [Artifact Templates](./reference/governance/sdlc/04-artifact-templates/README.md) | PRD, ADR, Stories templates |
| [Definition of Done](./reference/governance/sdlc/02-engineering/construction-focused-sdlc-framework.md) | DoD checklist |

### 🤖 AI-Augmented Engineering
| Artifact | Purpose |
|----------|---------|
| [AI Standards](./reference/governance/standards/ai-augmented/README.md) | AI integration standards |
| [MCP Integration](./reference/governance/standards/ai-augmented/02-mcp-integration/README.md) | MCP protocol guide |
| [Smart CLI](./sdk/cli/README.md) | CLI for satellite onboarding |

### 📊 Vision & Strategy
| Artifact | Purpose |
|----------|---------|
| [Product Vision](./reference/governance/standards/vision/evolith-product-vision-master.md) | Full vision statement |
| [Gap Analysis](./reference/governance/standards/vision/gap-analysis-core.md) | ⚠️ **NEW** Current state vs vision |
| [Evolutionary Roadmap](./reference/governance/standards/vision/evolutionary-strategy-roadmap.md) | Phase-by-phase plan |
| [Maturity Matrix](./reference/governance/standards/vision/maturity-matrix.md) | Organization maturity assessment |

### 🚀 Applied Reference
| Artifact | Purpose |
|----------|---------|
| [UMS Reference Hub](./reference/knowledge/demo/README.md) | Applied product reference |
| [UMS Architecture](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) | External UMS docs |
| [Adoption Cases](./reference/knowledge/adoption-cases.md) | Lessons from real products |

---

## 🔧 Tools & Scripts

### Smart CLI (Official)
```bash
# Initialize new satellite repository
npx @evolith/smart-cli init

# Validate against Evolith standards
smart-cli validate

# Manage ADRs
smart-cli adr create
smart-cli adr list

# MCP server for AI assistants
smart-cli mcp serve
```

📖 [CLI Documentation](./sdk/cli/README.md)
📊 [CLI Architecture](./sdk/cli/ARCHITECTURE.md)
🎯 [CLI Product Vision](./sdk/cli/docs/VISION.md)
🔍 [Gap Analysis](./sdk/cli/docs/planning/sdk-cli-mcp-current-state-assessment.md)

### Pre-commit Hooks
| Hook | Purpose |
|------|---------|
| [validate-docs.mjs](./.harness/scripts/validate-docs.mjs) | Link & anchor validation |
| [check-bilingual-parity.mjs](./.harness/scripts/check-bilingual-parity.mjs) | EN/ES structure parity |
| [impact-analysis-synchronizer.mjs](./.harness/scripts/impact-analysis-synchronizer.mjs) | Cross-repo impact sync |

---

## 📖 Evolith vs UMS — What Goes Where

| Question | Evolith (Reference) | UMS (Product) |
|----------|---------------------|---------------|
| What belongs here? | Reusable standards, principles, ADRs, governance, canonical patterns | Product-specific implementation evidence |
| How does a product contribute? | Propose an ADR backed by real evidence | Provide executable proof of concept |
| What stays local? | Enterprise policy must go through governance | Product routes, schemas, seeds, branding |

UMS is the official executable reference. See [Adoption Cases](./reference/knowledge/adoption-cases.md) for real examples.

---

## 🤝 Contribution

Before contributing, read:

- [AGENTS.md](./AGENTS.md) — Agent rules and conventions
- [Repository Taxonomy](./reference/governance/standards/repository-taxonomy.es.md) — What goes where
- [Child Repository Inheritance Guide](./reference/governance/standards/onboarding/child-repository-inheritance-guide.md) — How products inherit

---

## 📋 All Navigation Indexes

| Index | Purpose |
|-------|---------|
| [Master Index](./reference/navigation/MASTER_INDEX.md) | Complete repository navigation |
| [Architecture Index](./reference/architecture/README.md) | All architecture artifacts |
| [Vision Index](./reference/governance/standards/vision/README.md) | Strategy & gap analysis |
| [SDLC Index](./reference/governance/sdlc/README.md) | Delivery & governance artifacts |
| [Bilingual Index](./reference/navigation/BILINGUAL_INDEX.md) | EN/ES document pairs |

---

## License

Published under the [MIT License](./LICENSE).

---

<div align="center">
  <sub>Evolith - Enterprise Architecture Platform | Progressive Reference Corpus | Spec-driven AI-DD</sub>
</div>