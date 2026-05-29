# [ADR 0005](0005-ci-cd-quality-codeql.md): Puertas de Calidad de Seguridad CI/CD con CodeQL

## Estado
Aprobado

## Fecha
2026-05-08

## Contexto
Las vulnerabilidades de seguridad introducidas a través del código (inyección SQL, polución de prototipo, deserialización insegura) se pasan por alto frecuentemente en las revisiones manuales de código. Además, las dependencias de terceros pueden introducir CVEs conocidos que no se detectan sin un escaneo automatizado. La seguridad debe imponerse mecánicamente, no dejarse a la revisión humana.

## Decisión
Integrar **GitHub CodeQL** y **npm audit** como puertas de calidad obligatorias en la pipeline de CI/CD.

**Puertas de la pipeline:**

1. **Análisis Estático CodeQL** - Se ejecuta en cada pull request. Escanea patrones de vulnerabilidad OWASP Top 10 en el código fuente de TypeScript. Los PRs con hallazgos `High` (Altos) o `Critical` (Críticos) se bloquean para su fusión.

2. **Escaneo de Vulnerabilidades de Dependencias** - `npm audit --audit-level=high` se ejecuta en CI. Cualquier dependencia con un CVE `High` o `Critical` bloquea la pipeline.

3. **Detección de Secretos** - El escaneo de secretos integrado de GitHub se habilita en el repositorio para detectar claves de API o credenciales comprometidas accidentalmente.

**SLA:** Todos los hallazgos `Critical` deben resolverse dentro de 24 horas. Hallazgos `High` dentro de 72 horas.

## Consecuencias

### Positivas
- Las vulnerabilidades de seguridad se capturan en el momento del PR, antes de llegar a cualquier entorno.
- Cero costo de infraestructura adicional - CodeQL es gratuito para repositorios públicos y de GitHub Team.
- Crea una pista de auditoría documentada de decisiones de seguridad para requisitos de cumplimiento.

### Negativas
- Los escaneos de CodeQL añaden aproximadamente entre 2-5 minutos a la duración de la pipeline de CI.
- Los falsos positivos requieren supresión manual con comentarios de justificación documentados.

## Referencias
- [Documentación de GitHub CodeQL](https://docs.github.com/en/code-security/code-scanning)
- [ADR-0009: Fijación Estricta de Dependencias](../../adrs/core/0009-strict-dependency-pinning-vulnerability-management.md)

---
[Volver al Índice](./README.es.md)
