# [ADR 0042](0042-canonical-android-mobile-architecture.md): Canonical Android Native Mobile Architecture

## 1. Status
**Status**: Approved 
**Date**: 2026-05-11 
**Scope**: Technology Stack - Mobile Specific 

---

## 2. Context
Mobile clients requiring offline resilience, custom peripherals (barcodes), or mission-critical field reliability are authorized to build using **Android Native**. To prevent architectural drift towards messy, tightly coupled activities, we must codify the authoritative blueprint.

---

## 3. Decision
The canonical Android stack consists of:

### A. Core Tech Stack
* **Language**: 100% Kotlin (Modern coroutines for async execution).
* **UI Engine**: **Jetpack Compose** (Declarative, reactive UI mapping state directly).
* **Local Storage**: **Room Database** with full SQLCipher encryption if managing PII.

### B. Architectural Style
* **Pattern**: **MVVM (Model-View-ViewModel)** combined with strict **Clean Architecture** principles.
* **Dependency Injection**: **Hilt (Dagger)** for automated dependency management.
* **Domain Rules**: All business logic lives in pure Kotlin UseCases, detached from `android.*` lifecycle dependencies.

### C. Offline First Strategy
The architecture MUST support **Offline-First**:
1. UI observes Flow from local **Room DB** (Single Source of Truth).
2. Network fetching populates Room DB in background via `WorkManager`.
3. UI reacts implicitly to DB changes. Never directly couple API fetch to UI rendering without database storage.

### D. Testing
* **Unit**: Mockk + Turbine (Flow testing) + Robolectric.
* **UI**: Compose UI Test framework.
* **End-to-End**: Maverick / Maestro runner.

---

## 4. Consequences

### Positive
* **Resilience**: Operates 100% disconnected in warehouses or field locations.
* **Native Power**: Direct usage of low-level hardware telemetry/scanners.

### Negative
* **Dev Cost**: Higher initial cost compared to cross-platform wrappers (Flutter/React Native), accepted for mission-critical operational workloads only.







## Objective and Scope

Historical backfill: Address the architectural tension where context is unavailable, establishing a standard boundary.

## Options Considered

- **Selected:** Canonical Android Native Mobile Architecture
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

None explicitly linked.

## Technology Watch (Trends, Maturity, Adoption, Support)

Kotlin and Android Jetpack are in the mainstream adoption stage for Android development. Kotlin (supported by JetBrains and Google) has been Google's preferred language for Android since 2019 with strong ecosystem adoption. Jetpack Compose is in growth-to-mainstream stage as the modern UI toolkit, progressively replacing XML layouts. Android architecture patterns (MVVM, MVI, Clean Architecture) are mature and well-documented. Expected vigencia: Kotlin 5+ years as primary Android language; Jetpack libraries 3-5 years following Google's lifecycle support policy.

## Current Sources

- Android developer documentation — https://developer.android.com, consulted 2026-06-20.
- Kotlin language documentation — https://kotlinlang.org, consulted 2026-06-20.
- Google I/O Android architecture guidance — https://developer.android.com/topic/architecture, consulted 2026-06-20.

---
[Back to Index](./README.md)
