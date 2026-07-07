# Plan de Respuesta a Brechas de Datos

> **Bilingual Navigation:** [English Version](./incident-response-data-breach.md)

Plan operativo para responder a brechas de datos confirmadas o sospechadas que afectan la plataforma Evolith.

## Clasificación de Severidad

| Nivel | Nombre | Tiempo de Respuesta | Escalación |
|-------|--------|---------------------|------------|
| Crítico | PII/credenciales expuestas externamente | Inmediato | CTO, Legal, DPO |
| Alto | Exfiltración interna de datos confirmada | 1 hora | Líder de Seguridad, CTO |
| Medio | Patrón de acceso sospechoso detectado | 4 horas | Líder de Seguridad, Líder de Ingeniería |
| Bajo | Posible violación de política | 24 horas | Líder de Equipo, Cumplimiento |

## Plantilla de Comunicación

### Notificación Regulatoria (si aplica)

```
A: {Autoridad Supervisora}
Asunto: Notificación de Brecha de Datos — Plataforma Evolith

Fecha de la brecha: {marca de tiempo UTC}
Naturaleza de la brecha: {descripción}
Categorías de sujetos de datos: {tipos}
Número aproximado afectado: {cantidad}
Consecuencias probables: {evaluación}
Medidas tomadas: {acciones de contención}
Contacto DPO: {nombre, correo}
```

### Escalación Interna

```
[INCIDENTE DE SEGURIDAD] {Severidad} — {Resumen}
Tipos de datos afectados: {PII, credenciales, financieros, etc.}
Método de detección: {alerta, reporte de usuario, registro de auditoría}
Estado: Investigando / Contenido / Resuelto
Notificación regulatoria requerida: Sí / No / En revisión
Comandante del Incidente: {nombre}
```

## Pasos de Contención

1. Declarar el incidente de seguridad inmediatamente.
2. Aislar los sistemas afectados de la red (NO apagar).
3. Preservar toda evidencia: registros, volcados de memoria, capturas de red.
4. Revocar y rotar credenciales potencialmente comprometidas.
5. Bloquear vectores de ataque identificados en el perímetro de red.
6. Involucrar Legal y Oficial de Protección de Datos si hay PII involucrado.
7. Documentar todas las acciones con marcas de tiempo para el rastro forense.

## Procedimientos de Recuperación

1. Parchear la vulnerabilidad o configuración errónea explotada.
2. Rotar todas las credenciales que pudieron haber sido expuestas.
3. Verificar la integridad de datos en sistemas afectados.
4. Restaurar desde copias de seguridad limpias si se confirma corrupción de datos.
5. Implementar monitoreo adicional en superficies afectadas.
6. Realizar cacería de amenazas para confirmar que no queden mecanismos de persistencia.
7. Notificar a usuarios afectados si se confirma exposición de PII.
8. Presentar notificaciones regulatorias dentro de los plazos requeridos (72h GDPR).

## Requisitos del Post-Mortem

- [ ] Cronología forense con cadena de custodia
- [ ] Análisis del vector de ataque (cómo ocurrió la brecha)
- [ ] Evaluación del alcance de datos (qué fue accedido/exfiltrado)
- [ ] Lista de verificación de cumplimiento regulatorio
- [ ] Evidencia de rotación de credenciales
- [ ] Acciones de monitoreo mejorado
- [ ] Mejoras en políticas y controles
- [ ] Lecciones aprendidas compartidas con el equipo completo de ingeniería

## Referencias

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [ADR-0011 — Patrones de Tolerancia a Fallos y Resiliencia](../../reference/core/architecture/adrs/core/0011-fault-tolerance-resiliency-patterns.md)
- [ADR-0028 — Infraestructura Híbrida Self-Hosted](../../reference/core/architecture/adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.md)
