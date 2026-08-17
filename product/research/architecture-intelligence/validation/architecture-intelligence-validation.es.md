# Architecture Intelligence Validation


---

## Purpose
Asegúrese de que el conocimiento de la arquitectura seleccionada siga siendo coherente con las expectativas de taxonomía, gobernanza y legibilidad de la IA de Evolith.
## Required Checks
Cada artefacto de Architecture Intelligence debe verificar:

- Utiliza nombres de archivos de kebab-case.
- Vive bajo `product/research/architecture-intelligence/`.
- Tiene un título y un propósito claros.
- Define problema, contexto, solución, beneficios y compensaciones.
- Define la posición de Evolith y el nivel de adopción cuando es un patrón.
- Enlaces a ADR relacionados cuando corresponda.
- No promueve ideas externas como estándares sin la aprobación del ADR.
- Evita mandatos específicos de productos a menos que tengan un alcance explícito.
- Mantiene a la UMS como evidencia aplicada, no como autoridad universal.
- Utiliza enlaces relativos que resuelven.
- Evita nombres de patrones duplicados o conflictivos.
- Incluye el impacto de la IA cuando sea relevante.
## AI Readiness Checks
Los artefactos consumibles por IA deben ser:

- de estructura determinista
- conciso pero completo
- explícito sobre el nivel de autoridad
- vinculado al control de ADR o estándares
- claro sobre suposiciones y limitaciones
## Failure Conditions
Un artefacto no debe marcarse como completo si:

- los enlaces están rotos
- Faltan referencias ADR
- se viola la taxonomía
- una recomendación carece de análisis de compensaciones
- las ideas externas se copian sin contextualización
- el documento confunde evidencia aplicada con política universal
## Recommended Review Roles
- Arquitecto
- BMAD PO
- Control de calidad de BMAD
- Revisor de gobernanza de IA

---

[Volver a Arquitectura Inteligente](../README.md)