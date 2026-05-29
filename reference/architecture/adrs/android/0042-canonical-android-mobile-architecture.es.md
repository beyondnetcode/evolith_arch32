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

---
[Volver al Índice](./README.es.md)
