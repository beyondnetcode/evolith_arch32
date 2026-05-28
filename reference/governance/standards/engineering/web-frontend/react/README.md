# Web Frontend Standard - React

> Bilingual navigation: [Espanol](./README.es.md)

This section defines the Evolith enterprise standard for React-based web frontends. It is normative for reusable architecture, boilerplate rules, design-system governance, quality gates, and promotion criteria.

UMS is treated as an applied reference only. Product routes, domain modules, tenant headers, local colors, and implementation-specific decisions must remain in UMS unless they are promoted here through an ADR, standard, or canonical pattern.

## Documents

| Document | Purpose |
|---|---|
| [React Web Frontend Standard](./react-web-frontend-standard.md) | Normative standard for enterprise React web applications. |

## Authority boundary

| Concern | Evolith authority | UMS authority |
|---|---|---|
| Standards and principles | Defines mandatory and recommended reusable rules | Consumes and applies the rules |
| Boilerplate | Defines stable structure and extension points | Demonstrates one concrete implementation |
| UI system | Defines token, accessibility, and theming governance | Provides product-specific theme values and components |
| Data access | Defines reusable boundary patterns | Implements API-specific clients, headers, and contracts |
| Quality gates | Defines minimum gates | Runs local tools and reports product gaps |

## Promotion rule

A UMS practice becomes an Evolith standard only when it is validated as reusable, documented here, and approved through the proper promotion path: ADR, governance standard, or canonical pattern.

---
[Back to Engineering Standards](../README.md)
