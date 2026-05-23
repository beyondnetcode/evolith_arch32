# Política de Taxonomía y Estructuración del Repositorio (Enterprise)

> **Estado:** Aceptado | **Versión:** 4.1.0 | **Framework:** Enterprise Repository Taxonomy & Docs-as-Code

Este documento establece la **política oficial** de estructuración, taxonomía y gobernanza para este repositorio de referencia arquitectónica.

---

## 1. Estructura Estándar de Directorios (The Blue-Map Layout)

```text
/ (Repository Root) - [CAPA DE GOBERNANZA]
 README.md # Portal Ejecutivo (Visión y onboarding)
 MASTER_INDEX.md # Hub de Navegación SSoT
 .harness/ # Contexto de IA (Reglas, Memoria)
 reference/ # CORPUS DE REFERENCIA: Arquitectura, gobernanza, conocimiento, operaciones e infraestructura
   getting-started/ # ORIENTACIÓN: Rutas guiadas por rol y propósito de lectura
   architecture/ # PLANOS: ADRs, blueprints, C4 model y perfiles de stack
     adrs-es/adr-matrix.es.md # DESCUBRIMIENTO: Decisiones indexadas por necesidad
   governance/ # LEYES: Políticas, SDLC, estándares, onboarding y reglas documentales
     glossary.es.md # LENGUAJE: Terminología canónica y límites conceptuales
   knowledge/ # APRENDIZAJE: Documentación demo, investigación, POCs y ejemplos
     demo/demo-vs-reference.es.md # LÍMITE: Guía general frente a elecciones de la demo
   operations/ # RUN: Playbooks operacionales y observabilidad
   infrastructure/ # CIMIENTOS: Plataforma local, gateway, contenedores y activos de infraestructura
 src/ # SOURCE: Implementación ejecutable de referencia y sandbox técnico
```

> [!IMPORTANT]
> **Prohibición de Carpetas "Basura":** Está estrictamente prohibido crear carpetas con nombres como `utils`, `misc`, `temp`, `common`, `shared` sin contexto. Toda pieza de código debe pertenecer a un Dominio, Infraestructura u Operaciones.

## 2. Taxonomía y Convenciones de Nombres

- **Directorios y Archivos Base:** `kebab-case` estricto (ej. `user-management`).
- **ADRs:** `[ID-4-digitos]-[titulo-descriptivo].md` -> `0001-use-postgresql-for-users.md`
- **Naming de Capas en Dominios:**
 - `app-*`: Aplicación o artefacto desplegable (Ej: `app-user-api`).
 - `lib-*`: Librería de dominio o técnica compartida (Ej: `lib-auth-guard`).

## 3. Estrategia de Navegación (SSoT)

1. **Entrada Pública:** `README.es.md` explica la visión y conduce al recorrido adecuado.
2. **Navegación por Rol:** `reference/getting-started/README.es.md` contiene secuencias cortas de lectura; `MASTER_INDEX.es.md` continúa como índice exhaustivo.
3. **Terminología:** `reference/governance/glossary.es.md` es canónico para conceptos como referencia de arquitectura progresiva, arc32, BMAD-METHOD, estándar, ADR y demo sandbox.
4. **Descubrimiento de Decisiones:** `reference/architecture/adrs-es/adr-matrix.es.md` relaciona necesidades arquitectónicas con sus registros controladores.
5. **Docs-as-Code:** Prohibido repetir estándares; siempre enlazar al artefacto canónico bajo `reference/`.
6. **Breadcrumbs:** Todo documento Markdown profundo debe contener un enlace de retroceso a `MASTER_INDEX.es.md` o a un hub propietario que conduzca a este.

## 4. Política de Capas Documentales

La documentación debe distinguir la arquitectura reutilizable de las decisiones ilustrativas de implementación.

| Capa | Propósito | Ubicaciones canónicas | Autoridad |
|---|---|---|---|
| Orientación | Ayudar al lector a ingresar y navegar el corpus | `README.es.md`, `MASTER_INDEX.es.md`, `reference/getting-started/`, `reference/governance/glossary.es.md` | Navegacional; enlaza artefactos controladores |
| Referencia Canónica | Definir reglas, decisiones, políticas y criterios de selección tecnológica | `reference/architecture/`, `reference/governance/` | Normativa o decisoria según el estado del documento |
| Ejemplo Aplicado | Demostrar patrones en un contexto ejecutable concreto | `reference/knowledge/demo/`, `src/` | Ilustrativa salvo adopción explícita en un artefacto canónico |

Reglas obligatorias de interpretación:

- Una tecnología utilizada por la demo To-Do no constituye un mandato tecnológico universal.
- La guía específica de un runtime debe identificarse como perfil, opción o implementación demo, salvo que esté regida por un ADR seleccionado.
- Nueva documentación de demo debe enlazar `reference/knowledge/demo/demo-vs-reference.es.md` cuando un lector pueda confundir razonablemente el ejemplo con una política general.
- El corpus documental canónico vive en `reference/`; no se debe crear una jerarquía paralela `docs/` en la raíz.

## 5. Separación de Responsabilidades

1. **Código Fuente (`src/apps`, `src/libs`)**: Contiene la lógica de negocio, implementaciones técnicas y pruebas unitarias.
2. **Gobernanza Arquitectónica (`reference/architecture/`)**: Contiene la justificación de las decisiones (ADRs) y la visión técnica a largo plazo.
3. **Gobernanza de Producto y Proceso (`reference/governance/`)**: Contiene estándares, SDLC, onboarding, políticas y reglas documentales.
4. **Conocimiento y Demo (`reference/knowledge/`)**: Contiene documentación funcional, técnica, investigación, POCs y material de aprendizaje.

Está terminantemente prohibido duplicar información de gobernanza dentro de los directorios de código fuente. Toda referencia técnica debe apuntar al artefacto canónico correspondiente dentro de `reference/`.

## 6. Política de Raíz del Repositorio

La raíz debe mantenerse pequeña, legible y navegable. El descubrimiento público empieza en `README.md` y `MASTER_INDEX.md`; los artefactos profundos de arquitectura, gobernanza, operaciones, infraestructura y conocimiento viven bajo `reference/`.

Solo estas categorías están permitidas en raíz:

- Archivos públicos de navegación (`README.md`, `README.es.md`, `MASTER_INDEX.md`, `MASTER_INDEX.es.md`, `LICENSE`).
- Dot-folders de tooling y plataforma (`.github/`, `.harness/`, `.bmad-core/`, configuración de editores y automatización).
- `src/` para implementación ejecutable.
- `reference/` para el corpus documental y arquitectónico.

---
[Volver al Hub de Referencia](../../../README.es.md)
