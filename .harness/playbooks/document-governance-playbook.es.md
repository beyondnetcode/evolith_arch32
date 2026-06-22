# Playbook de Gobernanza de Documentos

## Cuándo Usarlo

- al revisar requisitos
- al actualizar historias funcionales
- al editar ADRs o planos
- al validar sincronización bilingüe

## Verificaciones Obligatorias

1. El contenido funcional es legible para Product Owners y Analistas de Negocio.
2. El detalle técnico de implementación está aislado en `Technical Requirements` o secciones técnicas equivalentes.
3. Las variantes en inglés y español se mantienen sincronizadas.
4. Las etiquetas de diagramas coinciden con el idioma del documento.
5. Las afirmaciones específicas de runtime apuntan al perfil autoritativo correcto.
6. Las descripciones de multi-tenencia preservan el modelo de filtrado primario en capa de aplicación y secundario en base de datos.
7. Los catálogos paramétricos y entidades de configuración siguen el contrato mínimo `code`, `value`, `description` cuando corresponda.

## Salida de Auditoría Estándar

- artefacto
- ubicación
- tipo de problema
- severidad
- corrección recomendada
