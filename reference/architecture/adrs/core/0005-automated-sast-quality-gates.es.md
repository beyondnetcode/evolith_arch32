# [ADR 0005](0005-automated-sast-quality-gates.es.md): Puertas de Calidad SAST Automatizadas en CI/CD

## Estado
Aprobado

## Fecha
2026-05-08

## Contexto y Problema
Las vulnerabilidades de seguridad introducidas a través del código (inyección SQL, polución de prototipo, deserialización insegura) se pasan por alto frecuentemente en las revisiones manuales de código. Además, las dependencias de terceros pueden introducir CVEs conocidos que no se detectan sin un escaneo automatizado. La seguridad debe imponerse mecánicamente, no dejarse a la revisión humana.

## Objetivo y Alcance
Establecer una capacidad obligatoria para Pruebas Estáticas de Seguridad de Aplicaciones Automatizadas (SAST) como una puerta de calidad en todos los pipelines de CI/CD para todos los stacks.

## Opciones Consideradas
- **Seleccionada:** Puertas de Calidad SAST Automatizadas en CI/CD
- **Otras:** Revisiones de seguridad manuales (rechazadas debido a la inconsistencia y escala).

## Decisión y Justificación
Integrar **SAST Automatizado y Escaneo de Vulnerabilidades de Dependencias** como puertas de calidad obligatorias en el pipeline de CI/CD para todos los repositorios.

**Puertas de la pipeline:**
1. **Análisis Estático SAST** - Se ejecuta en cada pull request. Escanea patrones de vulnerabilidad OWASP Top 10 en el código fuente. Los PRs con hallazgos `High` (Altos) o `Critical` (Críticos) se bloquean para su fusión. *(Ejemplo de implementación: GitHub CodeQL)*.
2. **Escaneo de Vulnerabilidades de Dependencias** - Una auditoría de dependencias se ejecuta en CI. Cualquier dependencia con un CVE `High` o `Critical` bloquea la pipeline. *(Ejemplo de implementación: npm audit / dotnet list package --vulnerable)*.
3. **Detección de Secretos** - El escaneo de secretos se habilita en el repositorio para detectar claves de API o credenciales comprometidas accidentalmente.

**SLA:** Todos los hallazgos `Critical` deben resolverse dentro de 24 horas. Hallazgos `High` dentro de 72 horas.

## Evidencias y Criterios de Evaluación
Evaluado contra principios generales de arquitectura como mantenibilidad y seguridad. La aplicación mecánica automatizada garantiza una postura de seguridad base antes de que el código entre en las ramas principales.

## Consecuencias, Riesgos y Trade-offs

### Positivas
- Las vulnerabilidades de seguridad se capturan en el momento del PR, antes de llegar a cualquier entorno.
- Crea una pista de auditoría documentada de decisiones de seguridad para requisitos de cumplimiento.

### Negativas
- Los escaneos SAST añaden duración (2-5 minutos) a la pipeline de CI.
- Los falsos positivos requieren supresión manual con comentarios de justificación documentados.

## Referencias
- Ninguna

## Decisiones y Estándares Relacionados
- [ADR-0009: Fijación Estricta de Dependencias](../../adrs/core/0009-strict-dependency-pinning-vulnerability-management.es.md)

---
[Volver al Índice](./README.es.md)

> **Agent Signature:** Architect Agent
