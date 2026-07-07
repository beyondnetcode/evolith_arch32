# Authoritative Tech Stack: Android & Kotlin Ecosystem

> **Bilingual Navigation:** [Versión en Español](./../blueprints/authoritative-tech-stack-android.md)

**Document Type:** Runtime Addendum 
**Prerequisite:** MUST be read after the **[Agnostic Baseline](./authoritative-tech-stack-agnostic.md)**. 

---

## 1. Executive Compliance Matrix (Vendor Mandates)

| Category | Approved Tool / Framework | Validated Version | ADR Required to Swap? | Explicitly Rejected Alternatives |
| :--- | :--- | :--- | :--- | :--- |
| **Runtime Base** | **Kotlin JVM** | 1.9+ | **YES** | Java (Native Android) |
| **UI Framework** | **Jetpack Compose** | Latest | **YES** | XML Views / DataBinding |
| **Local DB** | **Room** | 2.6.x+ | **NO** | Realm, SQLite Raw |
| **Async / Streams** | **Kotlin Coroutines + Flow** | Latest | **YES** | RxJava 2/3 |

---
-> Back to **[Global Master Index](../../control-center/taxonomy/MASTER_INDEX.md)**

---
[Back to Index](./README.md)
