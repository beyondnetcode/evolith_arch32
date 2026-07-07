# Plan de Respuesta a Interrupciones de Servicio

> **Bilingual Navigation:** [English Version](./incident-response-service-outage.md)

Plan operativo para responder a interrupciones no planificadas en la plataforma Evolith.

## Clasificación de Severidad

| Nivel | Nombre | Tiempo de Respuesta | Escalación |
|-------|--------|---------------------|------------|
| P1 | Crítico — Plataforma completa caída | 15 minutos | CTO, VP Ingeniería |
| P2 | Alto — Funcionalidad principal degradada | 1 hora | Líder de Ingeniería, PO |
| P3 | Medio — Funcionalidad menor impactada | 4 horas | Ingeniero de guardia |
| P4 | Bajo — Cosmético o no urgente | 24 horas | Líder de Equipo |

## Plantilla de Comunicación

### Interna

```
[INTERRUPCIÓN] P{N} — {Servicio} está {estado}
Impacto: {descripción de usuarios/funcionalidades afectadas}
Hora de inicio: {marca de tiempo UTC}
Estado actual: Investigando / Identificado / Mitigando / Resuelto
Próxima actualización: {ETA}
Comandante del Incidente: {nombre}
```

### Externa

```
Actualmente estamos experimentando problemas con {servicio}. Nuestro equipo
está trabajando activamente en una solución. Proporcionaremos actualizaciones
cada {intervalo} en nuestra página de estado. Pedimos disculpas por las molestias.
```

## Pasos de Contención

1. Confirmar la alerta y abrir un canal de incidente.
2. Declarar el nivel de severidad y asignar Comandante del Incidente.
3. Identificar el servicio(s) afectado(s) y el radio de impacto.
4. Verificar la salud de la infraestructura: base de datos, caché, broker de mensajes.
5. Revisar despliegues recientes y cambios de configuración.
6. Si está relacionado con un despliegue, iniciar rollback según el plan de Production Rollback.
7. Notificar a las partes interesadas según la plantilla de comunicación.

## Procedimientos de Recuperación

1. Restaurar el componente fallido (reiniciar, escalar o redesplegar).
2. Verificar consistencia e integridad de datos post-recuperación.
3. Ejecutar pruebas de humo contra los endpoints afectados.
4. Monitorear tasas de errores y latencia durante 30 minutos post-recuperación.
5. Cerrar el incidente una vez confirmada la estabilidad.
6. Programar post-mortem dentro de 48 horas.

## Requisitos del Post-Mortem

- [ ] Cronología de eventos (UTC)
- [ ] Análisis de causa raíz con 5-Porqués
- [ ] Resumen de impacto (usuarios afectados, duración, impacto en datos)
- [ ] Elementos de acción con responsables y fechas límite
- [ ] Análisis de brecha de detección (¿por qué no se detectó antes?)
- [ ] Actualizaciones de runbooks si la respuesta fue ad-hoc
- [ ] Compartido con el equipo de ingeniería dentro de 5 días hábiles

## Referencias

- [ADR-0011 — Patrones de Tolerancia a Fallos y Resiliencia](../../reference/core/architecture/adrs/core/0011-fault-tolerance-resiliency-patterns.md)
- [ADR-0068 — Flujo de Git para Release de Documentación](../../reference/core/architecture/adrs/core/0068-documentation-release-gitflow.md)
