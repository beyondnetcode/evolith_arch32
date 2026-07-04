# Guía de Adopción Sin Servidor

> **Navegación Bilingüe:** [English](./adoption.md) | [Español](./adoption.es.md)

**Propietario:** Ingeniería de Plataforma
**Topología:** Sin Servidor

---

## Criterios de Entrada

Adoptar serverless cuando se cumplan todos los siguientes:

- La carga de trabajo es orientada a eventos o esporádica con patrones de tráfico impredecibles
- El presupuesto de latencia permite hasta 1500 ms por invocación
- La tolerancia a inicio en frío es de al menos 1000 ms (SV-R04)
- El equipo tiene experiencia con al menos la plataforma de funciones de un proveedor de nube
- La organización acepta la dependencia de servicios gestionados

No adoptar serverless para cargas de trabajo sostenidas de alto rendimiento que excedan los presupuestos de concurrencia o requieran latencia inferior a 100 ms.

## Organización de Funciones

Organizar funciones por contexto acotado. Cada contexto acotado posee sus funciones, eventos y datos. Mantener un catálogo de funciones con:

- Nombre y propósito de la función
- Equipo propietario
- Tipo de disparador y esquema de eventos
- SLA (latencia, tasa de error)
- Presupuesto de costo por ejecución

## Desarrollo Local

Configurar emulación local para iteración rápida. Usar herramientas como SAM Local, Functions Framework o serverless-offline. Probar integración función-a-función en un entorno de staging. Mantener la emulación local alineada con configuraciones de producción.

## Lista de Verificación de Preparación

- [ ] Descomposición de funciones completa — cada función tiene una única responsabilidad
- [ ] Roles IAM asignados con privilegio mínimo (SV-SEC-01)
- [ ] DLQ configurada para todas las invocaciones asíncronas (SV-R01)
- [ ] Paquetes de despliegue bajo 50 MB (SV-R03)
- [ ] Perfilado de inicio en frío completado y dentro del presupuesto
- [ ] Monitoreo y alertas configuradas según la guía de evidencia
- [ ] Etiquetas de rastreo de costos aplicadas a todas las funciones
- [ ] Neutralidad con el proveedor evaluada (ADR-0095)
- [ ] Runbooks documentados para escenarios de fallo comunes

---

[Volver al Perfil Sin Servidor](./README.es.md)
