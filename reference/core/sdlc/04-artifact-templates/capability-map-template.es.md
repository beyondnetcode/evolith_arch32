# Plantilla: Mapa de Capacidades

> **Navegación Bilingüe:** [English Version](./capability-map-template.md)
> **Propósito:** Descomposición de capacidades a nivel de dominio antes del desglose de épicas. Cada capacidad es una unidad de comportamiento significativa para el negocio.
>
> **Fase SDLC:** 01 - Discovery / Ideación
>
> **Subfase:** 01.1 - Knowledge-First Discovery / KDD Readiness
>
> **Responsable sugerido:** Product Owner / Business Analyst
>
> **Quality Gate:** Aprobación del Knowledge Brief

## Metadatos del Artefacto

* **URL Upstream Evolith:** `En construcción - Solicitar a Upstream`
* **Entradas Requeridas:** Discovery Knowledge Brief aprobado, Registro de Supuestos y Preguntas.
* **Salidas Esperadas:** Mapa de Capacidades que alimenta el Paquete de Contexto de Discovery e informa el desglose de épicas.
* **Taxonomía Aplicada:** Alineado con el glosario Evolith (Capability, Domain, Priority, Dependency, Epic Candidate).
* **Rules Evolith Aplicables:** R-03 (UTF-8 Clean), R-06 (Split Stories), R-13 (Functional Structure).

---

## 1. Estructura Documental (Markdown)

```markdown
# Mapa de Capacidades: [Nombre de la Iniciativa]

## 1. Descomposición de Capacidades

| ID de Capacidad | Nombre | Descripción | Dominio | Prioridad | Dependencias | Supuestos Vinculados | Candidatos a Épica |
|---|---|---|---|---|---|---|---|
| CAP-001 | [Nombre de Capacidad] | [Qué entrega esta capacidad al negocio] | [Bounded context] | Must/Should/Could/Wont | [CAP-XXX o Ninguna] | [AQ-XXX] | [EPIC-XXX] |
| CAP-002 | [Nombre de Capacidad] | [Qué entrega esta capacidad al negocio] | [Bounded context] | Must/Should/Could/Wont | [CAP-XXX o Ninguna] | [AQ-XXX] | [EPIC-XXX] |

## 2. Definiciones de Prioridad

| Prioridad | Definición |
|---|---|
| **Must** | Requerido para MVP. La iniciativa no puede entregar valor sin esta capacidad. |
| **Should** | Importante para la entrega completa de valor pero puede diferirse a una iteración posterior. |
| **Could** | Deseable. Incluir solo si los recursos y el cronograma lo permiten. |
| **Wont** | Explícitamente fuera del alcance de esta iniciativa. Registrado para trazabilidad. |

## 3. Grafo de Dependencias

[Describe o diagrama las relaciones de dependencia entre capacidades. Las capacidades sin dependencias ascendentes deben entregarse primero.]

```
CAP-001 (Verificación de Identidad)
  └── CAP-002 (Orquestación de Onboarding) depende de CAP-001
        └── CAP-003 (Escaneo de Documentos KYC) depende de CAP-002
```

## 4. Trazabilidad

| Capacidad | Knowledge Brief | Registro de Supuestos | Factibilidad Técnica | Épica |
|---|---|---|---|---|
| CAP-001 | KB-2024-001 | AQ-001, AQ-002 | TF-2024-001 | EPIC-001 |
| CAP-002 | KB-2024-001 | AQ-001 | TF-2024-001 | EPIC-002 |
```

---

## 2. Estructura de Datos (JSON)

Para integración con el CLI de Evolith, scaffolding automatizado e ingestión de agentes de IA.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Capability Map",
  "type": "object",
  "required": ["id", "capabilities"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Identificador único de esta instancia de Mapa de Capacidades."
    },
    "capabilities": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "description", "domain", "priority", "dependencies", "relatedAssumptions", "epicCandidates"],
        "properties": {
          "id": {
            "type": "string",
            "description": "Identificador único de la capacidad (ej., CAP-001)."
          },
          "name": {
            "type": "string",
            "description": "Nombre corto y descriptivo de la capacidad."
          },
          "description": {
            "type": "string",
            "description": "Qué entrega esta capacidad al negocio."
          },
          "domain": {
            "type": "string",
            "description": "Bounded context o dominio de negocio al que pertenece esta capacidad."
          },
          "priority": {
            "type": "string",
            "enum": ["Must", "Should", "Could", "Wont"],
            "description": "Nivel de prioridad MoSCoW."
          },
          "dependencies": {
            "type": "array",
            "items": { "type": "string" },
            "description": "IDs de capacidades que deben entregarse antes que esta."
          },
          "relatedAssumptions": {
            "type": "array",
            "items": { "type": "string" },
            "description": "IDs del Registro de Supuestos y Preguntas que afectan esta capacidad."
          },
          "epicCandidates": {
            "type": "array",
            "items": { "type": "string" },
            "description": "IDs de épicas propuestas que implementarían esta capacidad."
          }
        }
      },
      "description": "Unidades de comportamiento significativas para el negocio de la iniciativa."
    }
  }
}
```

---

## 3. Ejemplo Mínimo Aplicado

```json
{
  "id": "CM-2024-001",
  "capabilities": [
    {
      "id": "CAP-001",
      "name": "Verificación de Identidad",
      "description": "Verificar la identidad del cliente contra requisitos KYC/AML usando verificaciones automatizadas de documentos y coincidencia biométrica.",
      "domain": "Ciclo de Vida del Cliente",
      "priority": "Must",
      "dependencies": [],
      "relatedAssumptions": ["AQ-001", "AQ-002"],
      "epicCandidates": ["EPIC-001"]
    },
    {
      "id": "CAP-002",
      "name": "Orquestación de Onboarding",
      "description": "Coordinar el flujo de trabajo de onboarding de múltiples pasos entre verificación de identidad, creación de cuenta y secuencia de bienvenida.",
      "domain": "Ciclo de Vida del Cliente",
      "priority": "Must",
      "dependencies": ["CAP-001"],
      "relatedAssumptions": ["AQ-001"],
      "epicCandidates": ["EPIC-002"]
    },
    {
      "id": "CAP-003",
      "name": "Escaneo de Documentos KYC",
      "description": "Escanear y extraer datos de documentos de identidad usando OCR y validar contra requisitos regulatorios.",
      "domain": "Compliance",
      "priority": "Should",
      "dependencies": ["CAP-002"],
      "relatedAssumptions": ["AQ-003"],
      "epicCandidates": ["EPIC-003"]
    },
    {
      "id": "CAP-004",
      "name": "Onboarding por Canal de Socios",
      "description": "Extender el flujo de onboarding para soportar integraciones de canales de socios con marca personalizada y mapeo de campos.",
      "domain": "Ciclo de Vida del Cliente",
      "priority": "Could",
      "dependencies": ["CAP-002"],
      "relatedAssumptions": ["AQ-004"],
      "epicCandidates": []
    }
  ]
}
```

---

## 4. Handoff hacia la Siguiente Fase

El **Mapa de Capacidades** alimenta directamente:

1. **Paquete de Contexto de Discovery** — las capacidades poblan el array `capabilities` del JSON del paquete de contexto.
2. **Factibilidad Técnica** — las capacidades `Must` informan el alcance de NFR y el análisis de restricciones.
3. **Desglose de épicas** — cada capacidad `Must` y `Should` se convierte en candidata a épica para el Design Baseline.
4. **Estimación Ballpark** — la cantidad de capacidades y la profundidad de dependencias informan el dimensionamiento del esfuerzo.
5. **Modelo DDD** — las capacidades se mapean a raíces de agregado y límites de bounded context.

Las capacidades marcadas `Wont` se rastrean explícitamente para gobernanza de alcance y consideración de roadmap futuro.

---

## Quality Checklist

- [ ] Cada capacidad tiene una descripción clara y significativa para el negocio (sin detalle de implementación técnica)
- [ ] Cada capacidad `Must` tiene al menos un candidato a épica
- [ ] El grafo de dependencias no tiene ciclos
- [ ] Todos los `relatedAssumptions` referencian IDs válidos del Registro de Supuestos y Preguntas
- [ ] Ninguna capacidad está huérfana (cada ítem enlaza al Knowledge Brief)
- [ ] Los niveles de prioridad siguen las definiciones MoSCoW consistentemente
- [ ] El lenguaje es consistente (sin mezcla de EN/ES dentro del archivo)

---

## Nivel de Adopción Recomendado

**Obligatorio** para todas las iniciativas con un Knowledge Brief aprobado. El mapa de capacidades debe completarse antes de la aprobación del Design Baseline y usarse como base para el desglose de épicas.

---

## Criterios de Actualización

| Disparador | Acción |
|---|---|
| Nueva capacidad identificada durante discovery | Agregar al array de capacidades con dependencias y prioridad |
| Supuesto invalidado que afecta una capacidad | Revisar y actualizar prioridad o marcar como bloqueada |
| Capacidad diferida a iteración futura | Cambiar prioridad de Must/Should a Could/Wont |
| Épica aprobada para una capacidad | Actualizar epicCandidates con el ID de épica asignado |
| Dependencia resuelta | Eliminar del array de dependencias, actualizar orden de entrega |
| Cambio de alcance del Knowledge Brief | Revisión completa del mapa de capacidades; agregar/eliminar/repriorizar según sea necesario |
