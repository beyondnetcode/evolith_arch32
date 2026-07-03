> **Navegación Bilingüe:** [See English version](./0103-architecture-planning-gate-intake.md)

# ADR-0103: Architecture Planning Gate como Intake de Gobernanza (Pre-Discovery)

> **Agent Signature:** Architect Agent (Winston)

> **Firma de Agente:** Architect Agent (Winston)

## Estado
Aceptado (2026-07-02 — Comité de Arquitectura)

## Fecha
2026-07-02

## Contexto y Problema

Evolith actualmente gobierna y ejecuta SDLCs mediante rulesets OPA y el directorio `.harness`. Sin embargo, existe un salto entre un requerimiento de negocio puro (un "prompt" o solicitud no estructurada) y la asignación formal de un modo SDLC (ej. estándar, gobernado, ligero). El actual Discovery Gate (Fase 1.1) se enfoca en el "Knowledge-First Discovery" y asume que la iniciativa ya está en el pipeline con un nivel de adopción asignado.

El problema: ¿Cómo introducimos una fase de evaluación preliminar que traduzca un prompt en lenguaje natural en un **Architecture Plan** estructurado, gobernado y trazable? Este plan debe dictar el modo SDLC (`full`, `tailored`, `minimal`, o `rejected`) *antes* de que se invierta esfuerzo formal en descubrimiento o ejecución, manteniendo al humano en el ciclo (Human-in-the-loop) para la aprobación y aprovechando las capacidades de IA para la generación.

## Objetivo y Alcance

Definir e incorporar el **Architecture Planning Gate** (también conocido como Evolith Architecture Plan) en el ecosistema principal.
En alcance:
- Establecer el Gate 0 (Pre-Discovery) como el punto formal de intake.
- La separación de responsabilidades: Hermes (generación), Core API & OPA (evaluación/gobernanza), Smart CLI & Tracker (interacción Human-in-the-loop).
- La máquina de estados para el Architecture Plan (`draft` -> `under_review` -> `approved` -> `executed`).

Fuera de alcance:
- La implementación detallada de los elementos de UI en Tracker.
- La lógica de ejecución para la instanciación de SDLC en etapas posteriores (delegado a motores existentes).

## Opciones Consideradas

### Opción A: Embeber lógica de planificación en el Discovery existente (Fase 1.1)
Extender el Knowledge-First Discovery Gate existente para manejar prompts crudos.
*Rechazada:* Esto confunde la decisión de "¿Deberíamos hacer esto y con qué rigor?" con la fase de "¿Tenemos suficiente conocimiento para construir esto?". Se pierde la necesidad de un aborto temprano (`rejected`) antes de gastar esfuerzo de descubrimiento.

### Opción B: Usar sistemas de tickets externos (Jira/ServiceNow) para intake
Depender de herramientas externas para realizar el intake y pasar un webhook a Evolith.
*Rechazada:* Pierde trazabilidad arquitectónica y gobernanza impulsada por OPA en la misma concepción de una idea. Evolith Tracker perdería visibilidad de planes rechazados o adaptados.

### Opción C: Architecture Planning Gate Independiente (Gate 0) (Elegida)
Introducir una nueva capacidad transversal donde un requerimiento crudo genera un Architecture Plan vía Hermes. La Core API lo evalúa contra OPA para determinar el `sdlc_mode`, y los humanos lo refinan/aprueban vía CLI/Tracker antes de que se convierta en una Iniciativa formal.

## Decisión y Justificación

### 1. Gate 0 como Mecanismo de Intake
El Architecture Planning Gate residirá *antes* de la fase Knowledge-First Discovery. Actuará como el límite de ingesta. Ninguna iniciativa o esfuerzo de descubrimiento comienza sin un plan aprobado.

### 2. Estrategia de Evaluación Desacoplada
- **Generación:** El Agent Runtime (Hermes) interpreta el prompt y genera el plan borrador (identificando componentes, riesgos e interfaces).
- **Gobernanza:** Core API invoca políticas OPA contra el plan JSON generado para imponer el `sdlc_mode` requerido.
- **Aprobación:** Un humano en el ciclo (Líder de Arquitectura / Oficial de Seguridad) debe aprobar el plan vía Smart CLI o Evolith Tracker. Los agentes no pueden ejecutar aprobación en planes gobernados sin autorización explícita.

### 3. Trazabilidad y Versionado
Los planes son inmutables una vez aprobados. Las iteraciones durante `under_review` crean nuevas versiones (`v1`, `v2`). La traza de ejecución final vincula el `Architecture Plan ID` a la `Initiative ID` resultante y a los `ADRs` requeridos.

## Evidencia y Criterios de Evaluación

- Se establece un nuevo esquema de entidad (`Architecture Plan`) dentro de la Core API.
- Las políticas OPA pueden leer exitosamente un Architecture Plan JSON y devolver una recomendación `sdlc_mode`.
- La CLI proporciona comandos `plan create`, `review`, `refine`, y `approve`.

## Consecuencias, Riesgos y Trade-offs

- **Positivas:** Reducción masiva en asignaciones de SDLC desalineadas. Cambios de alto riesgo son detectados a nivel del prompt. Trazabilidad completa desde la idea hasta la ejecución.
- **Negativas/Trade-offs:** Añade un paso extra antes de que un desarrollador pueda empezar a trabajar.
- **Mitigación:** Las reglas OPA deben afinarse para asignar automáticamente `sdlc_mode: minimal` y permitir auto-aprobación para cambios de baja complejidad y no críticos para evitar fricción cognitiva.

## Referencias
- [00-architecture-planning-gate-intake.es.md](../../../governance/sdlc/01-playbooks/00-architecture-planning-gate-intake.es.md)
