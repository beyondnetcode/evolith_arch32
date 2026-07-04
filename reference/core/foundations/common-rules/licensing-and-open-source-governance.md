# Licensing & Open Source Governance — Responsible Selection of Zero-Cost Technologies

> **Bilingual Navigation:** [Versión en Español](./licensing-and-open-source-governance.es.md)
>
> **Evolith Classification:** Mandatory standard for technology selection and dependency governance
>
> **Owner:** Evolith Architecture Board
>
> **Status:** Active reference
>
> **Parent:** [Corporate Standards Center](../README.md)

---

## Purpose

Licensing & Open Source Governance defines how Evolith teams must evaluate, select, and document open source, free software, copyleft, Creative Commons, source-available, and commercial technologies.

Evolith promotes a **zero base development cost** strategy, but zero cost does not mean absence of obligations. Every dependency, tool, library, template, asset, dataset, model, documentation component, or external component must have an identified, compatible, and governance-accepted license.

---

## Guiding Principle

> Zero initial license cost does not mean zero legal, operational, or commercial risk.

Evolith prioritizes technologies with no initial licensing cost when they are technically mature, sustainable, and legally compatible. However, selection must consider:

- Commercial use rights.
- Modification rights.
- Redistribution rights.
- Attribution obligations.
- Source code disclosure obligations.
- Direct or indirect copyleft risk.
- Network, SaaS, or distribution restrictions.
- Patents and warranties.
- License change risk.
- Real cost of support, operations, and maintenance.

---

## Licensing Taxonomy

| Category | Meaning | Common examples | Evolith position |
|---|---|---|---|
| Public domain / public dedication | The author waives or reduces economic rights to the extent permitted | CC0, Unlicense | Allowed with basic review |
| Permissive open source | Allows use, modification, and redistribution with lightweight obligations | MIT, BSD, Apache-2.0, ISC | Preferred |
| Weak copyleft | Protects specific components and often allows integration with proprietary software under conditions | LGPL, MPL-2.0 | Allowed with review |
| Strong copyleft | May require distributed derivatives to keep the same license | GPL | Conditional; requires ADR and legal review when distributed |
| Network copyleft | Extends obligations to network or SaaS use | AGPL | Restricted; requires explicit approval |
| Creative Commons | Licenses for content, documentation, images, text, or assets; not recommended for software | CC BY, CC BY-SA, CC BY-NC, CC BY-ND | Allowed only for content; review restrictions |
| Source-available | Code is visible but not necessarily open source; may restrict competitive, commercial, or production use | BSL/BUSL, SSPL-like, proprietary source access licenses | Restricted; treat as commercial |
| Freeware / proprietary free-of-charge | No cost, but without broad modification or redistribution rights | Free closed tools | Allowed only as tooling, not as core dependency without review |
| Commercial / proprietary | Requires contract, subscription, EULA, or paid license | SaaS, commercial SDKs, enterprise components | Allowed by business exception |
| No declared license | No explicit reuse permission | Public repositories without LICENSE | Prohibited for reuse |

---

## Key Differences

| Concept | Focus | Evolith clarification |
|---|---|---|
| Open source | Meets criteria for source access, modification, redistribution, and non-discrimination | Visible code is not enough |
| Free software | Emphasizes user freedoms to run, study, modify, and redistribute | Free means libre, not necessarily zero price |
| Copyleft | Requires preserving freedoms in redistributions or derivatives | May affect architecture, distribution, and commercial strategy |
| Creative Commons | Designed primarily for creative content and documentation | Do not use as a software license unless formally evaluated |
| Commercial | Defines rights through contract, EULA, or subscription | Can be valid, but breaks zero base cost if mandatory |
| Source-available | Code is accessible but restricted | Do not classify automatically as open source |

---

## Evolith Decision Matrix

| Need | Default recommendation | Avoid unless approved |
|---|---|---|
| Runtime library in backend or frontend | MIT, Apache-2.0, BSD, ISC | GPL, AGPL, custom license, no license |
| Main application framework | MIT, Apache-2.0, BSD | Restrictive source-available, mandatory commercial |
| Database or local infrastructure | Apache-2.0, PostgreSQL-like, permissive OSS | SSPL-like, AGPL without review, mandatory SaaS |
| Local development tool | Permissive OSS or free tool with acceptable EULA | Tools preventing reproducible CI/CD |
| Evolith documentation | Repository license or compatible Creative Commons | CC-NC/ND if enterprise reuse or adaptation is required |
| Images, icons, music, assets | CC BY, CC0, clear commercial license | No license, NC, ND, generated assets without clear usage rights |
| Templates, prompts, and training material | Clear documentation license with attribution | Material copied without source or permission |
| AI models, datasets, or embeddings | Explicit license compatible with commercial use | Missing license, research-only, non-commercial, dataset without provenance |
| Product core component | Permissive license or approved commercial | Strong copyleft without distribution strategy |

---

## Preference Policy

### Preferred

Use by default when technical maturity, security, and compatibility are satisfied:

- MIT.
- Apache-2.0.
- BSD-2-Clause / BSD-3-Clause.
- ISC.
- PostgreSQL License.
- CC0 for assets or content when applicable.
- CC BY for content with clear attribution.

### Allowed with Review

May be used when obligations and compatibility are documented:

- MPL-2.0.
- LGPL.
- EPL.
- CC BY-SA.
- Non-critical freeware tools.
- Optional and replaceable commercial services.

### Restricted

Requires ADR, legal review, or Architecture Board approval:

- GPL in distributed components.
- AGPL in web, SaaS, or network-exposed systems.
- Source-available licenses.
- Licenses with non-commercial clauses.
- Licenses with no-derivatives clauses.
- Custom licenses.
- Dependencies without recognized SPDX identifiers.
- Components with recent license changes.

### Prohibited by Default

Must not be used unless an exceptional authorization is granted:

- Code with no declared license.
- Code copied from blogs, gists, or answers without a license.
- Assets without verifiable source or license.
- Licenses that prohibit commercial use when the product may have enterprise exploitation.
- Licenses that prevent modifying, auditing, deploying, or operating the system.

---

## Zero Development Cost Rule

The Evolith zero development cost strategy means:

| Dimension | Rule |
|---|---|
| Initial development | Prefer technologies with no license cost to build, test, and deploy locally |
| Core dependencies | Prefer mature permissive OSS communities |
| Enterprise tools | Must be optional, replaceable, or justified by ROI |
| External SaaS | Must not be required to run the base product unless an ADR exists |
| Commercial licenses | Must be explicitly approved as a business exception |
| Hidden cost | Support, operations, lock-in, security, and compliance must be evaluated |

The promise does not mean that everything must be free of charge. It means the base product must be buildable and evolvable without being blocked by paid licenses, closed vendors, or restrictions incompatible with enterprise use.

---

## Mandatory Selection Checklist

Before adding a technology, the technical owner must answer:

- What is the exact license and SPDX identifier?
- Does it allow commercial use?
- Does it allow modification?
- Does it allow redistribution?
- Does it require attribution or notice preservation?
- Does it require publishing proprietary or derivative source code?
- Is the obligation triggered by distribution, linking, modification, or network use?
- Is it compatible with the product repository license?
- Does the license apply to code, documentation, assets, datasets, or AI models?
- Is there patent risk?
- Is there license-change or dual-licensing risk?
- Is there a mature permissive alternative?
- Can it be replaced without rewriting the core?
- Is the dependency registered in the SBOM inventory?

---

## Operational Risk Classification

| Level | Description | Required action |
|---|---|---|
| Low | Known permissive license, standard use, mature community | Register in inventory |
| Medium | Weak copyleft, documentation license, freeware, or external asset | Technical review and evidence of obligations |
| High | Strong copyleft, source-available, commercial EULA, dataset/model | ADR and Architecture Board review |
| Critical | No license, incompatible NC/ND, AGPL in SaaS, ambiguous custom license | Block until legal review or replacement |

---

## Compliance Obligations

Every product inheriting Evolith must maintain:

- Repository `LICENSE` file.
- Dependency and license inventory.
- Required notices and attributions.
- SBOM when applicable to enterprise release.
- Review evidence for restricted licenses.
- ADR for licensing decisions affecting architecture, distribution, SaaS, monetization, or intellectual property.
- Approved exception register.

---

## Relationship with SDLC Artifacts

| Artifact | Expected use |
|---|---|
| PRD | Declare cost, commercialization, distribution, and enterprise-use constraints |
| ADR | Justify restricted, commercial, copyleft, or source-available licenses |
| Technical Story | Register new dependencies, license, and obligations |
| Test Summary Report | Evidence dependency/license scans passed |
| Release Notes | Declare relevant dependency, license, or notice changes |
| SBOM / Inventory | Maintain evidence of used components and their licenses |

---

## Creative Commons Rules

Creative Commons should be used primarily for content, not software.

| CC license | Recommended use | Risk |
|---|---|---|
| CC0 | Assets or content reusable without attribution | Low |
| CC BY | Documentation, images, or content with attribution | Low |
| CC BY-SA | Content that may require derivatives to use the same license | Medium |
| CC BY-NC | Restricts commercial use | High for enterprise products |
| CC BY-ND | Restricts derivative works | High if adaptation is required |
| CC BY-NC-ND | Highly restrictive | Avoid in Evolith products |

---

## Evolith Decision

Evolith adopts a pragmatic position: maximize zero base development cost without sacrificing legal safety, traceability, intellectual property, or commercial viability.

Technology selection must favor permissive and sustainable licenses. Copyleft, source-available, restrictive Creative Commons, and commercial licenses may be valid in specific contexts, but require explicit governance before becoming a relevant product dependency.

---

## External References

- Open Source Initiative — Open Source Definition.
- Free Software Foundation — Free Software Definition.
- Creative Commons — Licensing Considerations.
- SPDX — License List.

---

[Back to Engineering Index](./README.md)
