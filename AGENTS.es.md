## Proyecto
Referencia técnica abierta para productos que empiezan simple, maduran hacia monolitos modulares y evolucionan hacia servicios distribuidos solo cuando el producto y la operación lo justifican.

Este repositorio define la línea base arquitectónica, los estándares de gobernanza, las reglas del harness y los patrones de implementación de referencia utilizados por repositorios satélite. UMS es la referencia externa ejecutable oficial de producto.

## Compilación y Ejecución
- Revisión de documentación de referencia: usar primero `README.md`, `MASTER_INDEX.md` y el árbol `reference/` en la raíz.
- Referencia aplicada de producto: `https://github.com/beyondnetcode/ums`
- Setup y ejecución UMS: seguir el `README.md` vigente de UMS; este repositorio no duplica esos comandos.

## Scripts de Validación

| Script | Propósito |
|--------|-----------|
| `node .harness/scripts/ci/01-validate-docs.mjs` | Validación completa de documentación (enlaces, anclas, codificación, Mermaid) |
| `node .harness/scripts/ci/04-check-bilingual-parity.mjs` | Verifica que los pares EN/ES tengan conteos idénticos de encabezados ## y ### |
| `node .harness/scripts/bilingual-coverage.mjs` | Reporte de cobertura bilingüe (qué archivos carecen de contrapartes) |
| `node .harness/scripts/coverage-dashboard.mjs` | Genera reporte visual HTML/MD de cobertura por área |
| `node .harness/scripts/generate-es-skeleton.mjs <file.md>` | Crea un esqueleto ES desde un archivo EN (con bandera --dry-run) |
| `python ./.bmad-core/scripts/cleanup_markdown_encoding.py` | Sanea problemas de codificación UTF-8 |
| `node .harness/scripts/ci/01-validate-docs.mjs --render-mermaid` | Renderiza diagramas Mermaid a SVG para validación visual |
| `node .harness/scripts/run-wilson-audit.mjs` | Imprime el prompt para ejecutar una auditoría arquitectónica profunda vía Wilson (Arquitecto Principal) |

### Pre-commit Hook
El hook pre-commit (`.husky/pre-commit`) se ejecuta automáticamente en cada commit:
1. `lint-staged` - linting de archivos staged
2. `validate-docs.mjs` - validación completa de documentación
3. `check-bilingual-parity.mjs` - validación estructural bilingüe
4. Detección de archivos bilingües huérfanos - EN sin ES o viceversa

### Glosario de Terminología
Ver `.harness/scripts/bilingual-terminology-glossary.md` para traducciones EN/ES estandarizadas de términos técnicos. Cuando añadas nuevos términos, actualiza ambas versiones juntas.

## Arquitectura
- Rol del repositorio: referencia de arquitectura progresiva corporativa, no una base de código para un solo producto.
- Estilos primarios: monolito simple -> monolito modular -> módulos distribuidos -> microservicios
- Perfiles de runtime: línea base agnóstica más addenda específicas de runtime para Node.js, .NET, Android y ecosistemas relacionados
- Guía de persistencia: específica por runtime; nunca asumir un motor de base de datos sin leer el perfil autoritativo correspondiente
- Áreas clave:
  - `reference/architecture/`
  - `reference/governance/`
  - `.harness/`
  - `.bmad-core/`
  - `reference/knowledge/demo/` límite del modelo aplicado UMS y registro de migración

## Convenciones
- Leer la línea base agnóstica antes de aplicar cualquier guía específica de runtime.
- Tratar las lecciones de repositorios satélite como candidatas para promoverlas a estándares corporativos reutilizables.
- Mantener los estándares agnósticos de runtime a menos que la guía pertenezca claramente a un perfil específico de runtime.
- Las historias funcionales deben permanecer legibles para el negocio y aislar el detalle técnico en `Technical Requirements`.
- Preferir la propiedad explícita de bounded context, los límites de contratos y la preparación para la extracción sobre la distribución prematura.
- Usar enlaces relativos de repositorio para referencias internas de Markdown.
- Mantener los anclas de Markdown estables al renombrar encabezados; actualizar todos los enlaces entrantes en el mismo cambio.
- **Convenio de Nomenclatura Bilingüe:**
  - **Patrón A** (sufijo `.es.md`): Usar para archivos individuales (README, AGENTS, MASTER_INDEX, documentos únicos).
  - **Patrón B** (subdirectorio `-es/`): Usar para contenido agrupado con múltiples archivos (colecciones ADR, secciones de Estándares).
  - Nunca mezclar patrones dentro de la misma área de contenido. En caso de duda, usar Patrón A por simplicidad.
  - Todos los pares bilingües deben mantener paridad estructural exacta — mismo nombre de archivo, misma posición, mismas secciones.

## Frontera de Carpetas — `reference/` vs `docs/`

Este repositorio tiene **dos capas documentales distintas** por diseño:

| Capa | Carpeta | Propietario | Propósito |
| :--- | :--- | :--- | :--- |
| Corpus de Referencia Arquitectónica | `reference/` | Arquitectura / Gobernanza | Línea base normativa, reutilizable y cross-product |
| Artefactos de Planificación e Implementación | `docs/` | BMAD Method / Equipos | PRDs, épicas, historias, retrospectivas específicas de producto |

Estas dos capas no se solapan. Las decisiones arquitectónicas van en `reference/architecture/adrs/`. Los planes de producto van en `docs/planning-artifacts/`. No crear contenido en `docs/` que deba vivir en `reference/`, ni viceversa.

## Reglas de Agentes
- Leer `./.harness/rules/global-rules.md` antes de responder o editar.
- Usar el playbook relevante de `./.harness/playbooks/` para auditorías, revisiones de arquitectura y tareas de ingeniería repetidas.
- Cuando la guía del stack cambie materialmente, actualizar juntos los estándares afectados, `AGENTS.md` y los perfiles autoritativos específicos de runtime.
- Los estándares de multi-tenancy deben preservar dos capas: filtrado en la capa de aplicación como primario, enforcement nativo de base de datos como failsafe secundario.
- No convertir un estándar corporativo en un documento específico de producto a menos que el área del repositorio esté explícitamente orientada al producto.
- Verificación Obligatoria de Enlaces: verificar todos los enlaces internos y anclas antes de completar cualquier tarea de documentación.
- Consistencia Bilingüe: cualquier actualización a un documento en inglés debe tener una contraparte en español o una excepción documentada explícitamente.
- Validación de Diagramas: cualquier bloque Mermaid modificado debe pasar validación de sintaxis; usar validación de renderizado para cambios materiales de diagramas.
- Calidad de Actualización de Agentes: cualquier actualización de persona de agente debe declarar alcance, entradas, salidas, restricciones, transferencia y lista de verificación de validación, y formato de salida de auditoría.
- Cobertura de Reglas: al agregar o cambiar reglas de validación, actualizar la regla de referencia, la tabla de reglas globales y el comportamiento del script de validación juntos.
- Dual-Engine Parity: al crear o modificar reglas de arquitectura, DEBES implementar la lógica TANTO en el evaluador nativo TypeScript como en un archivo `.rego` OPA correspondiente.
- Fallar Rápido en Docs: si se encuentran enlaces no resueltos, referencias faltantes, anclas inválidas, diagramas inválidos o brechas de par de idiomas, fallar la tarea y reportar las anomalías en lugar de asumir la finalización.
- Aplicación de Patrones Canónicos:
  - NO asumir Active Record. Siempre recomendar y hacer cumplir los patrones Data Mapper y Repository para desacoplar la lógica de dominio de la persistencia.
  - Hacer cumplir límites estrictos de aislamiento de Domain-Driven Design (DDD).
  - Recomendar Transactional Outbox para eventos entre servicios.

## Puertas de Calidad de Documentación
- Los enlaces relativos internos deben resolverse desde la ubicación del archivo donde aparecen.
- Las anclas de Markdown deben existir en el destino Markdown referenciado.
- Los bloques Mermaid deben usar declaraciones soportadas e IDs de nodo estables para los bordes.
- La navegación bilingüe no debe permanecer como un marcador de posición en documentos finalizados.
- La salida UTF-8 no debe incluir marcas BOM, caracteres de reemplazo, mojibake o símbolos de rango emoji.
- Los finales de línea CRLF no están permitidos en la documentación Markdown.

## Fuera de Alcance
- No debilitar ni eliminar los requisitos de gobernanza bilingüe.
- No sobrescribir perfiles específicos de runtime con suposiciones de otro runtime.
- No tratar elecciones específicas de producto UMS como arquitectura universal sin un artefacto aceptado en este repositorio.