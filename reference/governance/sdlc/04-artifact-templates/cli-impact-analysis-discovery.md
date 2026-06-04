# Análisis de Impacto en el CLI: Artefactos Fase 1 (Discovery)

> **Propósito:** Evaluar y definir las capacidades técnicas que el CLI de Evolith debe implementar para soportar los nuevos artefactos y formatos (JSON/YAML/CSV) introducidos en la Fase 1 del SDLC.
> 
> **Fase SDLC:** 01 - Discovery
> 
> **Responsable:** Arquitecto de Plataforma

## 1. Capacidad de Scaffolding

El CLI requerirá nuevos comandos para inicializar los artefactos:

- `evolith sdlc init discovery` -> Genera `discovery-canvas-template.es.md` y `discovery-canvas.json`.
- `evolith sdlc init business-case` -> Genera `business-case-roi-template.es.md` y `business-case.yaml`.
- `evolith sdlc init ballpark` -> Genera `ballpark-estimation-template.es.md` y `ballpark.json`.
- `evolith sdlc init story` -> Genera `evolith-user-story-template.es.md`.
- `evolith sdlc init backlog` -> Genera `agile-backlog-template.es.md`.

## 2. Capacidad de Validación Estructural

El CLI deberá validar la integridad de los datos estructurados en las Quality Gates:

- **JSON Schema Validator:** Integrar un motor de validación para asegurar que los JSON del *Discovery Canvas*, *Ballpark Estimation* y *User Story* cumplen con los esquemas definidos.
- **YAML Linter:** Para el *Business Case ROI*, verificar formato y propiedades (e.g. `expectedBenefit` debe ser número).
- **Control de Tipos:** Validar enums como T-Shirt sizing (`S`, `M`, `L`, `XL`) en estimaciones.

## 3. Trazabilidad y Handoff (Pipelines Automáticos)

El CLI implementará comandos de "Handoff" (Transición) entre fases:

- `evolith sdlc handoff to-business-case --from discovery.json` -> El CLI lee el problema y el valor esperado y pre-puebla el YAML del Business Case.
- `evolith sdlc handoff to-ballpark --from business-case.yaml` -> El CLI extrae el ID de la iniciativa y el `targetTimeInMonths` para fijar límites en la estimación.
- `evolith sdlc export backlog --format csv` -> Transforma el JSON del backlog a CSV para importación masiva en Jira u otras herramientas de PPM.

## 4. Compatibilidad con Rules Evolith

- El CLI debe ser responsable de inyectar el **UTF-8 Clean** (R-03) de manera forzosa al hacer el scaffolding.
- El CLI debe autogenerar los archivos de **Paridad Bilingüe** (R-19) cuando detecte que un usuario inicializa un `.es.md`.
