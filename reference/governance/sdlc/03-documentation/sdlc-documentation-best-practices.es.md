# Mejores Prácticas para la Documentación del SDLC

> **Navegación Bilingüe:** [English Version](./sdlc-documentation-best-practices.md)

Esta política dicta cómo el conocimiento técnico y arquitectónico DEBE madurar junto con las entregas de código en todas las fases del ciclo de vida, desde el MVP hasta producción.

---

## 1. Objetivos Clave
Prevenir la "putrefacción documental" (información desactualizada) y mantener una fuente única, veraz y versionada de la verdad para todo el ecosistema de ingeniería.

---

## 2. Estándares Nucleares Estratégicos

### A. Documentación como Código (Docs as Code)
Tratar la documentación exactamente igual que al código de producción.
* Almacenar contenido narrativo en Markdown junto al código de la aplicación.
* Utilizar Control de Versiones estándar (Git) para auditoría e historial de diferencias (diffs).
* Someter los documentos a revisiones de código (Pull Requests) para garantizar precisión.

### B. Ciclo de Vida Sincronizado y Versionado
Los documentos deben madurar exactamente de forma síncrona con los incrementos de funcionalidad.
* **Regla:** Ningún código de feature debe integrarse en ramas estables sin su actualización documental delta.
* El estado documental DEBE mapearse a los Git Tags de Release (ej: la doc v1.2.0 refleja exactamente la mecánica del software v1.2.0).

### C. Madurez Incremental (Evolución)
No intentar alcanzar el detalle exhaustivo el Día 1.
* **Fase 1 (MVP):** Mantener READMEs minimalistas y atómicos que solo cubran la comprensión central de ingeniería.
* **Fase 2+ (Escalamiento):** Expandir tutoriales, mapas conceptuales más profundos y diagramas de modos de fallo de forma iterativa.

### D. Automatización Primero (Auto-Gen)
Maximizar la actualización no-humana de artefactos para garantizar fiabilidad.
* Exponer esquemas de API vivos directamente desde los metadatos del código fuente (Swagger/OpenAPI).
* Aprovechar el lenguaje de marcado Mermaid.js para diagramas directamente dentro del markdown, permitiendo trazabilidad visual sin archivos binarios.

### E. Legibilidad de Historias Funcionales
Los requisitos funcionales deben ser legibles por Product Owners y Analistas de Negocio antes de ser útiles para ingeniería.
* Las Historias Funcionales DEBEN separar propósito de negocio, actores, flujos, reglas de negocio y criterios de aceptación del detalle de implementación.
* APIs, payloads, protocolos, base de datos, caché, controles de seguridad y restricciones de runtime DEBEN ubicarse en una sección dedicada de Requisitos Técnicos.
* Ver el [Estándar de Redacción de Historias Funcionales](functional-story-writing-standard.es.md).

---

## 3. Ciclo de Retroalimentación y Limpieza

1. **Retroalimentación Continua:** Toda página publicada DEBE invitar a correcciones vía creación de tickets simples si los detalles parecen ambiguos.
2. **Auditoría de Obsolescencia:** Durante el retiro o la depreciación de cualquier microservicio o funcionalidad, una subtarea explícita DEBE disparar el borrado de la documentación expirada para limpiar el ruido ambiente.

---

## 4. Estándar de Formato Profesional
Toda la documentación debe adherirse a estándares profesionales de nivel empresarial:
* **Sin Emojis:** Evitar completamente el uso de emojis en títulos, encabezados y cuerpo del texto.
* **Sin Iconos UTF-8:** Evitar iconos UTF-8 decorativos o caracteres no estándar.
* **Prioridad Estructural:** Priorizar el texto plano, encabezados estándar de Markdown, tablas limpias y listas simples.
* **Nomenclatura Técnica:** Mantener una terminología técnica consistente y profesional en todos los idiomas.

---
[Volver al Índice](./README.es.md)
