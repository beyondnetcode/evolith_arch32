# Guía de Adopción del Monolito Modular

> **Navegación Bilingüe:** [English](./adoption.md) | [Español](./adoption.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Monolito Modular

---

## Criterios de Entrada

Antes de adoptar la topología de monolito modular, los equipos deben satisfacer todos los criterios de entrada. Estos aseguran que el equipo y la organización están listos para la disciplina modular.

- **Claridad de dominio:** Contextos delimitados identificados y documentados; propiedad de equipo por contexto definida
- **Estructura de equipo:** Equipos multifuncionales alineados a contextos delimitados; máximo 8-10 ingenieros por equipo
- **Infraestructura:** Pipeline CI/CD capaz de pruebas a nivel de módulo; aprovisionamiento de base de datos por módulo
- **Gobernanza:** Junta de Arquitectura establecida; proceso de revisión para límites de módulo definido
- **Herramientas:** Linter de límites de módulo configurado; escáner de acceso entre módulos disponible

**Decisión Go/No-Go:** La Junta de Arquitectura revisa los criterios de entrada; se requiere aprobación antes de que comience la adopción.

## Estructura de Equipo

Los equipos se organizan alrededor de contextos delimitados, no capas técnicas. Cada equipo posee uno o más módulos de extremo a extremo.

- **Alcance del equipo:** Un contexto delimitado por equipo (preferido) o contextos estrechamente relacionados
- **Responsabilidades:** Diseño, desarrollo, prueba, despliegue y operación de módulos poseídos
- **Autonomía:** Los equipos toman decisiones independientes dentro de los límites de sus módulos
- **Coordinación:** Las decisiones entre módulos se escalan a la Junta de Arquitectura

**Topología de equipo:**

| Rol | Responsabilidad | Cantidad por equipo |
|-----|----------------|---------------------|
| Líder de Módulo | Arquitectura, decisiones de diseño | 1 |
| Ingenieros | Implementación, pruebas | 4-6 |
| SRE | Operaciones, monitoreo, respuesta a incidentes | 1 |
| Propietario de Producto | Requisitos, priorización | 1 |

## Flujo de Trabajo de Desarrollo

El flujo de trabajo de desarrollo impone límites de módulo en cada etapa.

1. **Diseño:** Revisión de límites de módulo antes de que comience la implementación
2. **Implementación:** Desarrollo a nivel de módulo con enfoque de interfaz primero
3. **Pruebas:** Pruebas unitarias (limitadas al módulo), pruebas de integración (contratos entre módulos), pruebas de sistema (pila completa)
4. **Revisión:** La revisión de código verifica el cumplimiento de límites de módulo
5. **Despliegue:** Puertas de calidad a nivel de módulo en el pipeline CI/CD

**Prácticas clave:**
- Desarrollo de interfaz primero: definir APIs antes de la implementación
- Pruebas de contrato: verificar contratos entre módulos en CI
- Revisión de esquema: cambios de base de datos revisados por la Junta de Arquitectura
- Catálogo de eventos: eventos de dominio documentados y versionados

## Lista de Verificación de Adopción

- [ ] Contextos delimitados identificados y documentados
- [ ] Estructura de equipo alineada a contextos
- [ ] Linter de límites de módulo configurado
- [ ] Escáner de acceso entre módulos habilitado
- [ ] Pipeline CI/CD soporta pruebas a nivel de módulo
- [ ] Aprovisionamiento de base de datos por módulo configurado
- [ ] Registro estructurado con ID de correlación implementado
- [ ] Endpoints de verificación de salud para todos los módulos definidos
- [ ] Patrones de interruptor de circuito implementados para llamadas entre módulos
- [ ] Proceso de revisión de la Junta de Arquitectura establecido

## Criterios de Salida para F2

Un módulo está listo para salir de F1 (monolito modular) y entrar a F2 (servicios distribuidos) cuando se cumplen todos los criterios de salida.

- **Puntuación de preparación >= 70%** sostenida durante 3 meses
- **Justificación de negocio** aprobada por la Junta de Arquitectura
- **Equipo dedicado** asignado y capacitado para operación del servicio
- **Infraestructura** provisionada y probada con carga
- **Plan de migración** documentado y revisado
- **Plan de reversión** probado y validado
- **Monitoreo** establecido tanto para el monolito como para el nuevo servicio durante la transición

---

[Volver al Perfil de Monolito Modular](./README.es.md)
