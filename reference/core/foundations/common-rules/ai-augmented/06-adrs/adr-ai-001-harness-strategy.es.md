# ADR-AI-001: Harness Engineering as standard for development and agentic products


---

## Context
La arquitectura corporativa actual no define mecanismos estandarizados sobre cómo los equipos de desarrollo deben incorporar agentes de Inteligencia Artificial en su flujo de trabajo o productos de software. Históricamente, cada equipo ha utilizado enfoques fragmentados (como ingeniería rápida simple) que carecen de reproducibilidad, verificabilidad y seguridad.
## Decision
Decidimos formalmente adoptar la disciplina de **Ingeniería de Arneses** como estándar obligatorio para cualquier iniciativa de agencia dentro de la empresa. Esto implica que la inteligencia de una solución no será evaluada únicamente por su propuesta o el modelo elegido, sino por la robustez del entorno que la rodea definido bajo los 4 pilares establecidos:
1. Documentación como Código (`AGENTS.md`).
2. Restricciones arquitectónicas legibles por máquina.
3. Verificación en capas secuenciales (Hooks -> Pre-commit -> CI).
4. Cosecha periódica de deuda técnica generada por la IA.
## Alternatives Considered
* **Ingeniería rápida pura:** Descartado porque carece de control de errores determinista y se degrada rápidamente en las escalas de producción.
* **Marcos de terceros como estándar único:** descartados (por ejemplo, forzando solo LangChain) debido a la alta volatilidad en el ecosistema actual; Preferimos estandarizar la estrategia de aprovechamiento, no la herramienta específica.
* **Sin estandarización:** Descartado debido al alto riesgo de deuda técnica incoherente y fragmentación metodológica.
## Consequences
* **Positivo:** Aumento espectacular en las tasas de éxito de los agentes, auditabilidad del comportamiento de los agentes y reutilización de patrones de seguridad corporativos.
* **Negativo:** Curva de aprendizaje inicial más alta para configurar enlaces y el requisito de mantener el archivo `AGENTS.md` manualmente.
* **Compensación:** Sacrificamos la velocidad fugaz ("Hacks") en favor de la estabilidad a largo plazo.
## References
* Mitchell Hashimoto - Ingeniería de arneses (febrero de 2026)
* OpenAI: ingeniería de arneses con Codex (febrero de 2026)
* Martin Fowler / Thoughtworks - Ingeniería de arneses (febrero de 2026)

---
[Volver al índice](./README.md)