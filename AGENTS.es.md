## Proyecto
Referencia técnica abierta para productos que empiezan simple, maduran hacia monolitos modulares y evolucionan hacia servicios distribuidos solo cuando el producto y la operación lo justifican.

Este repositorio define la línea base arquitectónica, los estándares de gobernanza, las reglas del harness y los patrones de implementación de referencia utilizados por repositorios satélite.

## Compilación y Ejecución
- Revisión de documentación de referencia: usar primero `README.md`, `MASTER_INDEX.md` y el árbol `reference/` en la raíz.
- Instalación del sandbox demo: `cd src && npm install`
- Ejecución del sandbox demo: `cd src && npm run dev`
- Infraestructura demo: `cd src && docker-compose -f ../reference/infrastructure/docker-compose.yml up -d`
- Saneamiento de codificación Markdown: `python ./.bmad-core/scripts/cleanup_markdown_encoding.py`

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
  - `src/` sandbox demo

## Convenciones
- Leer la línea base agnóstica antes de aplicar cualquier guía específica de runtime.
- Tratar las lecciones de repositorios satélite como candidatas para promoverlas a estándares corporativos reutilizables.
- Mantener los estándares agnósticos de runtime a menos que la guía pertenezca claramente a un perfil específico de runtime.
- Las historias funcionales deben permanecer legibles para el negocio y aislar el detalle técnico en `Technical Requirements`.
- Preferir la propiedad explícita de bounded context, los límites de contratos y la preparación para la extracción sobre la distribución prematura.

## Reglas de Agentes
- Leer `./.harness/rules/global-rules.md` antes de responder o editar.
- Usar el playbook relevante de `./.harness/playbooks/` para auditorías, revisiones de arquitectura y tareas de ingeniería repetidas.
- Cuando la guía del stack cambie materialmente, actualizar juntos los estándares afectados, `AGENTS.md` y los perfiles autoritativos específicos de runtime.
- Los estándares de multi-tenancy deben preservar dos capas: filtrado en la capa de aplicación como primario, enforcement nativo de base de datos como failsafe secundario.
- No convertir un estándar corporativo en un documento específico de producto a menos que el área del repositorio esté explícitamente orientada al producto.

## Fuera de Alcance
- No debilitar ni eliminar los requisitos de gobernanza bilingüe.
- No sobrescribir perfiles específicos de runtime con suposiciones de otro runtime.
- No tratar el sandbox demo como la única fuente de verdad para la arquitectura corporativa.
