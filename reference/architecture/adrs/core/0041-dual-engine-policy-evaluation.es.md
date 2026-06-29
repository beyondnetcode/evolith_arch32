# ADR-0041: Evaluación de Políticas Dual-Engine (Nativo + OPA)

## Estado
Aceptado

## Fecha
2026-06-11

## Contexto
El gobierno arquitectónico de Evolith actualmente se basa en archivos JSON que contienen reglas y un CLI personalizado en TypeScript (`RuleEvaluationEngine`) para analizarlos y evaluar el espacio de trabajo físico de los repositorios satélite. Este modelo es óptimo para GitOps y el consumo por parte de agentes de IA (a través de esquemas JSON). Sin embargo, a medida que las reglas se vuelven más complejas, escribir código imperativo en TypeScript para cada nuevo invariante arquitectónico se convierte en un cuello de botella y restringe la interoperabilidad con los ecosistemas de políticas cloud-native estándar.

Open Policy Agent (OPA) con su lenguaje de políticas, Rego, es el estándar de la industria para la aplicación declarativa de políticas. Queremos adoptar OPA para estandarizar las evaluaciones de políticas sin sacrificar la simplicidad y capacidad de depuración del actual evaluador Nativo en TypeScript.

## Decisión
Implementaremos una **Estrategia de Evaluación de Políticas Dual-Engine** utilizando el Patrón Strategy (`IRuleEvaluatorStrategy`).
1. **Motor Nativo (TypeScript)**: Mantiene la lógica personalizada existente para las reglas base.
2. **Motor OPA (Wasm)**: Un nuevo evaluador que utiliza `@open-policy-agent/opa-wasm` para ejecutar archivos `.rego` localmente dentro del proceso Node.js del CLI, evitando dependencias de binarios externos para los satélites.

Para garantizar que los Agentes de IA y el core de Evolith permanezcan sincronizados, instituyemos la **Regla de Paridad Dual-Engine**: Cualquier nueva lógica de validación arquitectónica debe implementarse simultáneamente tanto en el Evaluador Nativo como en un archivo `.rego` correspondiente. El CLI contará con un switch `--engine <native|opa>` para determinar qué backend se utiliza para la validación durante el pipeline de CI/CD.

## Consecuencias
### Positivas
- **Transición Suave**: Los satélites pueden seguir usando el motor Nativo por defecto sin interrupciones mientras el motor OPA madura.
- **Interoperabilidad de Agentes**: Los Agentes de IA pueden leer reglas declarativas `.rego` para comprender profundamente las restricciones, manteniendo al mismo tiempo los metadatos estructurales JSON como contexto.
- **Cero Dependencias Externas**: El uso de `opa-wasm` significa que los pipelines de los satélites no necesitan tener instalado el binario `opa`; Node.js es suficiente.

### Negativas
- **Sobrecarga de Mantenimiento**: La Paridad Dual-Engine requiere mantener la lógica de validación en dos lenguajes distintos (TypeScript y Rego) hasta que un motor sea completamente desaprobado en el futuro.
- **Curva de Aprendizaje**: Los equipos de arquitectura y los Agentes deben comprender la sintaxis de Rego para contribuir con nuevas reglas de gobierno.

> **Agent Signature:** Architect Agent
