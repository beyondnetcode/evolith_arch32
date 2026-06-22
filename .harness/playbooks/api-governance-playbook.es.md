# Playbook de Gobernanza de API

## Cuándo Usarlo

- al revisar contratos de backend
- al diseñar endpoints REST
- al diseñar consultas GraphQL
- al validar manejadores de consultas o repositorios

## Verificaciones Obligatorias

1. Las responsabilidades de REST y GraphQL son explícitas.
2. Los comandos siguen siendo REST-first a menos que un ADR aprobado indique lo contrario.
3. La semántica de consultas permanece equivalente entre REST y GraphQL cuando ambos están expuestos.
4. La paginación, filtrado, ordenamiento y normalización de estado/búsqueda están centralizados.
5. El mapeo de errores se mantiene estructurado y predecible.
6. Los ejemplos de persistencia específicos de runtime no filtran suposiciones de otro motor o framework.
7. Multi-tenencia mantiene el filtrado primario en capa de aplicación y el secundario nativo de base de datos.

## Objetivo Arquitectónico

La API se mantiene mantenible como monolito modular hoy y extraíble mañana.
