# ADR-0048: Estandarización de Taxonomía Empresarial y Layout (Enterprise Standards)

## Estado
Aceptado

## Fecha
2026-05-29

## Contexto
A medida que el ecosistema evoluciona hacia un Monolito Progresivo, la proliferación de carpetas anidadas y la falta de convenciones estrictas de nombres han generado una alta carga cognitiva para los equipos de ingeniería. Se requería una política inmutable que unificara la estructura de directorios, redujera el ruido visual de la raíz, separara el código fuente del corpus de referencia y garantizara el principio de **Docs-as-Code**.

Esta estandarización también optimiza la interacción con agentes de Inteligencia Artificial mediante el soporte del método spec-driven AI-DD **BMAD-METHOD**, pero el driver principal es la mantenibilidad y la arquitectura enterprise.

## Decisión
Se ha decidido adoptar la **Taxonomía Enterprise v4.0 (Minimal Root, Reference Corpus & Source)** como el estándar arquitectónico oficial. Esta política impone la segregación entre el portal público de raíz, el corpus documental (`reference/`) y la implementación técnica (`src/`).

Las reglas inmutables son:
1. **Raíz Minimalista**: La raíz del repositorio debe mantenerse pequeña y navegable. Los puntos de entrada públicos viven en raíz; la documentación profunda vive en `reference/`; la implementación ejecutable vive en `src/`.
2. **Corpus de Referencia (`reference/`)**: Los dominios documentales transversales deben vivir bajo:
 * `reference/architecture/`: ADRs, blueprints, C4 model y perfiles de stack.
 * `reference/governance/`: Políticas, SDLC, estándares, onboarding y reglas documentales.
 * `product/research/`: Documentación demo, investigación, POCs y ejemplos.
 * `product/operations/`: Observabilidad, monitoreo y playbooks operacionales.
 * `product/infra/`: Plataforma local, gateway, contenedores y activos de infraestructura.
3. **Source Root (`src/`)**: Único contenedor de la implementación técnica. No debe contener carpetas redundantes de dominio intermedio.
4. **Monorepo Standard (Nx)**: Dentro de `src/`, el código se organiza siguiendo las mejores prácticas de Nx:
 * `src/apps/`: Aplicaciones desplegables.
 * `src/libs/`: Librerías compartidas.
 * `src/package.json` & `src/nx.json`: El motor técnico reside en la raíz de `src/`.
5. **Límites de Responsabilidad**: El código fuente debe ser agnóstico a la documentación de negocio, permitiendo que la gobernanza evolucione sin afectar el build path.

## Consecuencias
### Positivas:
* **Mejora del Developer Experience (DX):** La navegación se simplifica radicalmente y se guía a través del `MASTER_INDEX.md`.
* **Escalabilidad Inmediata:** La clara separación en `src` facilita la futura extracción de microservicios (Microservice Extraction Readiness).
* **Mejor Interacción con IA:** Los agentes como Cline/Windsurf/Cursor tienen ahora un "Contexto AI" aislado y optimizado (`.harness`) sin generar ruido visual en la raíz.

### Negativas/Riesgos:
* **Refactoring Inicial:** Implicó un cambio mayor a nivel de carpetas que requirió re-escribir hipervínculos internos en toda la documentación.
* **Curva de Aprendizaje:** Los nuevos desarrolladores deben ser capacitados sobre la política de taxonomía (ubicada en `reference/governance/standards/repository-taxonomy.es.md`) antes de crear nuevas carpetas.





## Objetivo y Alcance

Backfill histórico: Abordar la tensión arquitectónica donde a medida que el ecosistema evoluciona hacia un Monolito Progresivo, la proliferación de carpetas anidadas y la falta de convenciones estrictas de nombres han generado una alta carga cognitiva para los equipos de ingeniería, estableciendo un límite estándar.

## Opciones Consideradas

- **Seleccionada:** Estandarización de Taxonomía Empresarial y Layout (Enterprise Standards)
- **Otras:** Desconocido (el registro histórico no enumera explícitamente alternativas rechazadas).

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad).

## Decisiones y Estándares Relacionados

Ninguna explícitamente enlazada.

---
[Volver al Registro ADR](./README.es.md)

> **Agent Signature:** Architect Agent
