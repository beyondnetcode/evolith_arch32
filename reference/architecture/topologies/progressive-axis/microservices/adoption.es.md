# Guía de Adopción de Microservicios

> **Navegación Bilingüe:** [English](./adoption.md) | [Español](./adoption.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Microservicios

## Criterios de Entrada

La adopción de microservicios requiere alcanzar al menos el 80% de madurez en la fase de Fundamentos (F2). La descomposición prematura crea monolitos distribuidos. Valide lo siguiente antes de entrar a F3:

- Pipeline CI/CD operativo con pruebas automatizadas
- Runtime de contenedores probado en staging
- Pila de observabilidad desplegada (rastreo, registro, métricas)
- Evaluación de preparación del equipo completada

## Propiedad del Equipo

Aplique **MS-R08** (Propiedad de Guardia). Cada servicio debe tener un equipo propietario designado. El equipo propietario es responsable del desarrollo, pruebas, despliegue y soporte de guardia. Ningún servicio puede existir sin propiedad clara.

## Soporte Políglota

Los microservicios permiten elecciones tecnológicas políglotas por servicio. Los equipos pueden elegir diferentes lenguajes y marcos de trabajo según el ajuste del dominio. Aplique estándares comunes para: formato de registro, propagación de trazas, endpoints de sondas de salud y contratos de API.

## Lista de Verificación de Adopción

- [ ] Madurez F2 >= 80% validada
- [ ] Límites de descomposición de servicios definidos (contextos delimitados DDD)
- [ ] Pipeline CI/CD por servicio (o fábrica de pipelines)
- [ ] Malla de servicios desplegada y mTLS aplicado
- [ ] Framework de pruebas de contrato integrado
- [ ] Pila de observabilidad operativa (rastreo, registro, métricas, paneles)
- [ ] Rotación de guardia establecida por servicio
- [ ] Gestión de secretos integrada
- [ ] Etiquetas de atribución de costos aplicadas
- [ ] Proceso de baja documentado

## Estrategia de Migración

Migre incrementalmente usando el patrón Higo Estrangulador. Extraiga un contexto delimitado a la vez. Valide cada extracción antes de continuar. Nunca intente una migración big-bang.

## Anti-Patrones a Evitar

- Monolito distribuido: servicios que deben desplegarse juntos
- Nano-servicios: servicios demasiado pequeños para justificar overhead operativo
- Bases de datos compartidas: violando MS-R06
- Propiedad faltante: servicios sin cobertura de guardia (MS-R08)

## Referencias

| Regla | Descripción |
|-------|-------------|
| **MS-R08** | Propiedad de Guardia |

---
[Volver al Perfil de Microservicios](./README.es.md)
