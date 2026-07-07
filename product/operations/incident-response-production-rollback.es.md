# Plan de Respuesta a Rollbacks en Producción

> **Bilingual Navigation:** [English Version](./incident-response-production-rollback.md)

Plan operativo para realizar rollbacks de emergencia o planificados de despliegues en producción en la plataforma Evolith.

## Clasificación de Severidad

| Radio de Impacto | Nombre | Tiempo de Respuesta | Escalación |
|-----------------|--------|---------------------|------------|
| > 50% usuarios | Rollback de Servicio Completo | 15 minutos | CTO, Líder de Ingeniería, PO |
| 10 – 50% usuarios | Rollback Parcial de Servicio | 1 hora | Líder de Ingeniería, PO |
| < 10% usuarios | Rollback de Funcionalidad Individual | 4 horas | Líder de Equipo |

## Plantilla de Comunicación

### Interna

```
[ROLLBACK] {Alcance} — {Servicio/Funcionalidad}
Disparador: {bug / regresión de rendimiento / corrupción de datos / seguridad}
Despliegue a revertir: {SHA del commit o versión}
Estado objetivo del rollback: {versión anterior}
ETA para finalización: {tiempo}
Impacto: {descripción}
Responsable del Rollback: {nombre}
```

### Externa (si es visible para el usuario)

```
Hemos identificado un problema con {funcionalidad/servicio} y estamos revirtiendo
a una versión estable. Algunos usuarios pueden experimentar una interrupción
temporal. Esperamos resolución completa dentro de {ETA}. Pedimos disculpas
por las molestias.
```

## Pasos de Contención

1. Identificar el despliegue fallido: versión, timestamp y alcance del cambio.
2. Evaluar el radio de impacto: qué usuarios, servicios y flujos de datos están afectados.
3. Determinar el tipo de rollback: servicio completo, parcial, o bandera de funcionalidad individual.
4. Congelar todos los demás despliegues hasta completar el rollback.
5. Notificar a las partes interesadas según la plantilla de comunicación.
6. Capturar el estado actual (registros, métricas, estado de base de datos) antes del rollback.

## Procedimientos de Recuperación

### Árbol de Decisión

1. **¿Hay bandera de funcionalidad disponible?** → Desactivar la bandera; no se necesita despliegue.
2. **¿Hay migración de base de datos involucrada?** → Evaluar compatibilidad hacia atrás; puede necesitar script de rollback de migración.
3. **¿Hay cambio ruptor de API?** → Revertir a versión anterior; coordinar con consumidores.
4. **¿No hay migración ni cambio ruptor?** → Rollback estándar de contenedor/servicio.

### Ejecución

1. Ejecutar el rollback vía pipeline CI/CD o despliegue manual.
2. Verificar que los endpoints de salud del servicio retornen códigos de estado esperados.
3. Ejecutar pruebas de humo contra recorridos críticos de usuario.
4. Verificar consistencia de datos (verificar escrituras parciales o registros huérfanos).
5. Monitorear tasas de errores y latencia durante 30 minutos post-rollback.
6. Confirmar con las partes interesadas que el problema está resuelto.
7. Cerrar el incidente de rollback.

## Requisitos del Post-Mortem

- [ ] Cronología del despliegue (qué se desplegó, cuándo, por quién)
- [ ] Análisis de fallo (qué falló y por qué)
- [ ] Efectividad del rollback (¿fue completo? ¿problemas residuales?)
- [ ] Evaluación de impacto en datos (¿corrupción o pérdida de datos?)
- [ ] Mejoras en el proceso de despliegue
- [ ] Brechas de pruebas que permitieron pasar el problema
- [ ] Revisión de estrategia de banderas de funcionalidad (si aplica)

## Referencias

- [ADR-0068 — Flujo de Git para Release de Documentación](../../reference/core/architecture/adrs/core/0068-documentation-release-gitflow.md)
- [ADR-0050 — Estrategia de Branching Gitflow](../../reference/core/architecture/adrs/core/0050-gitflow-branching-strategy.md)
- [ADR-0025 — Abstracción de Proveedor de Feature Flags](../../reference/core/architecture/adrs/core/0025-feature-flag-provider-abstraction.md)
