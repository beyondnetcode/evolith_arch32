# Evolith: Commercial Narrative and Product Strategy

> **Core Vision:** Evolith is an executable architectural governance framework. We democratize *how* software is structured (Open Source), but we commercialize enterprise *observability and control* (Evolith Tracker).

---

## 1. The Problem (The Market Pain)

Companies invest thousands of dollars in software architects to design robust systems and write Architecture Decision Records (ADRs). However, the operational reality is different:
* **Documentation dies:** ADRs live in static wikis that no one consults during development.
* **Silent degradation:** With staff turnover and the pressure to deliver fast (and now, with AI agents generating code at high speed), the architecture deviates from the original design (Architecture Drift).
* **Uncontrollable Technical Debt:** By the time management realizes the mess, refactoring the system is expensive and paralyzes the business.

## 2. The Baseline Solution: Evolith Core (Open Source)

**Evolith Core** transforms architecture rules from simple "text documents" into **executable code**.

* **For the Developer:** It works like an architectural linter. With a simple `evolith validate` in their CLI, they know in seconds if their code complies with the rules.
* **For AI Agents:** Through the MCP Server, agents like Claude or Cursor instantly understand the company's standards before writing a single line of code.
* **For the Pipeline (CI/CD):** It acts as an automated security guard, blocking any *Pull Request* that attempts to introduce architecture violations (Phase Gates).

> [!TIP]
> **The Adoption Strategy (The Trojan Horse):** Evolith Core is **free and Open Source**. The goal is for developers and technical leads to adopt it massively because it reduces friction, speeds up code-reviews, and improves the quality of their daily work.

---

## 3. Client Deployment Architecture (Hub & Spoke Model)

When we sell and install Evolith in a corporation, the governance architecture operates under a centralized "Hub and Satellite" model, clearly separating where rules are *born* and where they are *executed*.

### A. The Source of Truth (The Central Repository)
A single repository is created in the company, conventionally named **`[company]-evolith-core`** or **`architecture-baseline`**.
* This repository acts as the technical "Constitution". All ADRs (Markdown), Rulesets (JSON/YAML), and OPA Policies (`.rego`) live here.
* These rules are packaged in the engine container (Core API) and executed centrally at millisecond speeds thanks to compilation to `policy.wasm`.
* Only Enterprise Architects have permissions to approve changes in this repository.

### B. The Consumers (Satellite Repositories)
The hundreds of product or microservice repositories that developers have are called **satellites**.
* These repositories **do not contain the rules**.
* When a programmer in a satellite runs `evolith validate`, the CLI remotely queries the central repository's engine.
* **Competitive Advantage:** If the company updates a security standard in the `[company]-evolith-core` repository, all satellite repositories in the organization automatically start being audited under the new rule, without having to make manual updates in 500 different projects.

---

## 4. Evolution and Adaptability (Future-Proofing)

Technology changes fast. What is a standard today is obsolete tomorrow. How does Evolith survive the emergence of new topologies (e.g., Agentic AI, Data Mesh)?

* **Agnostic Engine:** Evolith's magic is that **it has no specific architectures hardcoded in its code**. The engine only knows how to process abstract rules. If the company wants to adopt a new pattern, it just adds a new folder with rules in the central repository, and the engine learns to evaluate it instantly.
* **The Progressive Axis:** Evolith does not assume that all projects are perfect Microservices. It allows mapping evolutionary rules: from a fast MVP, to a Modular Monolith, to distributed services, applying the right rules according to the product's maturity stage.

### Ingestion of New Knowledge (Automation and GitOps)
Updating these rules is not a tedious, manual job; it is automated across the 3 interfaces:
1. **The AI Path (MCP Server):** The MCP server is bidirectional. An authorized AI agent can analyze a new industry trend, automatically draft an ADR and a `.rego` file, and propose a *Pull Request* in the central repository.
2. **The Developer Path (CLI):** The CLI has *scaffolding* tools (e.g., `evolith adr create`) that generate the entire base structure to add a new standard in seconds.
3. **The Infrastructure Path (GitOps):** When a *Pull Request* is approved in the central corporate repository, the infrastructure updates via *Webhooks*. The Core API engine downloads the newly compiled policies and performs a **hot-reload**, updating the company's brain without service interruptions.

---

## 5. The Monetization Model: Evolith Tracker (Enterprise)

While Evolith Core solves the individual developer's problem in their repository (tactical vision), the CTO and Engineering Directors have a bigger problem (strategic vision).

This is where **Evolith Tracker**, our commercial product, comes in.

### Closing the Sale:
Once the client has Evolith Core running in 50 different projects (satellites), the CTO faces a corporate blind spot:
* *"How do I know which of our 50 projects are complying with the central architecture and which are a risk?"*
* *"How do I manage different rules for the Payments Division and the Logistics Division?"*

**Evolith Tracker is sold as the Corporate Control Center (Control Plane):**
* **Global Observability:** Executive dashboards with the "Maturity Report" of the entire organization.
* **Multi-Tenancy:** Centralized management of policies, tenants, and repositories.
* **Exception Management:** Visual approval workflows for when a team needs to break a rule due to a business emergency.
* **ROI Traceability:** Charts demonstrating to management how technical debt is decreasing over time thanks to Evolith Core.

---

## 6. Strategy Summary (Product-Led Growth)

1. **Seed:** We distribute Evolith Core for free. Technical teams install it for the immense value of automating architecture validations and governing their AI Agents via MCP.
2. **Land:** Evolith becomes the de facto standard in the company's CI/CD pipelines. The architecture of the satellites anchors to the central repository (`[company]-evolith-core`), evolves dynamically, and stops degrading.
3. **Expand:** We sell **Evolith Tracker** to decision-makers (CTOs/Enterprise Architects) who need visibility, aggregated reports, and centralized control of the hundreds of Evolith Core nodes deployed in their ecosystem.
