# Evolith Navigation Hub

> **Bilingual navigation:** [Versión en Español](./README.es.md)  
> **Root portal:** [README](../../README.md)

This directory centralizes repository-level navigation documents that used to live in the repository root.

Keeping them here reduces root-level noise while preserving user experience through compatibility stubs at the old root paths.

## Goal and Objectives

> **Goal:** provide one authoritative place for every repository-wide navigation surface, so readers always know where to look next.

**Objectives:**

- Keep the Global Master Index as the single complete navigation surface of the repository.
- Track documentation releases and bilingual EN/ES coverage from the same hub.
- Preserve legacy root links through lightweight compatibility stubs.

## Documents

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Master Index](./MASTER_INDEX.md) | Complete repository navigation index by intent, role, and domain | Locate any artifact quickly | Navigation index | Yes |
| [Bilingual Index](./BILINGUAL_INDEX.md) | Auto-generated EN/ES pairing status for every reference document | Audit bilingual coverage | Auto-generated index | No |
| [Documentation Version Log](./DOCUMENTATION_VERSIONS.md) | Documentation release history and release policy | Trace documentation releases | Version log | No |

## Compatibility

The following root files remain as lightweight compatibility stubs:

| Legacy root path | New location |
|---|---|
| `MASTER_INDEX.md` | `reference/navigation/MASTER_INDEX.md` |
| `MASTER_INDEX.es.md` | `reference/navigation/MASTER_INDEX.es.md` |
| `DOCUMENTATION_VERSIONS.md` | `reference/navigation/DOCUMENTATION_VERSIONS.md` |
| `DOCUMENTATION_VERSIONS.es.md` | `reference/navigation/DOCUMENTATION_VERSIONS.es.md` |

---

[Back to Reference Hub](../README.md)
