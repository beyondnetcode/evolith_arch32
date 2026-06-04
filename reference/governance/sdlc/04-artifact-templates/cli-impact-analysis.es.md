# Análisis de Impacto en el CLI: Automatización SDLC (Fase 1 y 2)

> **Propósito:** Evaluar y definir las capacidades técnicas que el CLI de Evolith debe implementar para soportar los nuevos artefactos y formatos (JSON/YAML/CSV) introducidos en la Fase 1 (Discovery) y Fase 2 (Design) del SDLC.
> 
> **Fase SDLC:** Transversal
> 
> **Responsable:** Arquitecto de Plataforma

## 1. Capacidad de Scaffolding

El CLI requerirá nuevos comandos para inicializar los artefactos:

- `evolith sdlc init discovery` -> Genera `discovery-canvas-template.es.md` y `discovery-canvas.json`.
- `evolith sdlc init business-case` -> Genera `business-case-roi-template.es.md` y `business-case.yaml`.
- `evolith sdlc init ballpark` -> Genera `ballpark-estimation-template.es.md` y `ballpark.json`.
- `evolith sdlc init story` -> Genera `evolith-user-story-template.es.md`.
- `evolith sdlc init backlog` -> Genera `agile-backlog-template.es.md`.
- `evolith sdlc init ddd-model` -> Genera `ddd-model-template.es.md` con esqueleto Mermaid.

## 2. Capacidad de Validación Estructural

El CLI deberá validar la integridad de los datos estructurados en las Quality Gates:

- **JSON Schema Validator:** Integrar un motor de validación para asegurar que los JSON del *Discovery Canvas*, *Ballpark Estimation* y *User Story* cumplen con los esquemas definidos.
- **YAML Linter:** Para el *Business Case ROI*, verificar formato y propiedades (e.g. `expectedBenefit` debe ser número).
- **Control de Tipos:** Validar enums como T-Shirt sizing (`S`, `M`, `L`, `XL`) en estimaciones.
- **Linter de Lenguaje Ubicuo:** `evolith sdlc check ubiquitous-language` parsea la Sección 1 del modelo DDD y cruza con los JSONs de User Stories para detectar desviaciones léxicas.
- **Prevención de Deriva:** `evolith validate drift` compara el AST del código fuente contra el diagrama Mermaid del modelo DDD.

## 3. Trazabilidad y Handoff (Pipelines Automáticos)

El CLI implementará comandos de "Handoff" (Transición) entre fases:

- `evolith sdlc handoff to-business-case --from discovery.json` -> El CLI lee el problema y el valor esperado y pre-puebla el YAML del Business Case.
- `evolith sdlc handoff to-ballpark --from business-case.yaml` -> El CLI extrae el ID de la iniciativa y el `targetTimeInMonths` para fijar límites en la estimación.
- `evolith sdlc handoff to-ddd --from backlog.json` -> El CLI extrae sustantivos y verbos de los Acceptance Criteria para proponer Entidades y Eventos en el diagrama Mermaid del DDD Model.
- `evolith sdlc generate domain --from ddd-model.md` -> El CLI genera el código boilerplate de Arquitectura Hexagonal basándose en los estereotipos Mermaid (`<<Entity>>`, `<<Value Object>>`).
- `evolith sdlc export backlog --format csv` -> Transforma el JSON del backlog a CSV para importación masiva en herramientas PPM.

## 4. Compatibilidad con Rules Evolith

- El CLI debe ser responsable de inyectar el **UTF-8 Clean** (R-03) de manera forzosa al hacer el scaffolding.
- El CLI debe autogenerar los archivos de **Paridad Bilingüe** (R-19) cuando detecte que un usuario inicializa un `.es.md`.
