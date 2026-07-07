# Plan de Respuesta a CVE de Dependencias

> **Bilingual Navigation:** [English Version](./incident-response-dependency-cve.md)

Plan operativo para responder a Vulnerabilidades y Exposiciones Comunes (CVE) descubiertas en dependencias de terceros utilizadas por la plataforma Evolith.

## Clasificación de Severidad

| Rango CVSS | Nombre | Tiempo de Respuesta | Escalación |
|------------|--------|---------------------|------------|
| 9.0 – 10.0 | Crítico | 24 horas | Líder de Seguridad, Líder de Ingeniería |
| 7.0 – 8.9 | Alto | 72 horas | Líder de Ingeniería |
| 4.0 – 6.9 | Medio | 7 días hábiles | Líder de Equipo |
| 0.1 – 3.9 | Bajo | 30 días | Ingeniero de guardia |

## Plantilla de Comunicación

### Aviso Interno

```
[AVISO CVE] {Severidad} — {CVE-ID}
Paquete: {nombre}@{versión}
Puntuación CVSS: {puntuación}
Componente(s) afectado(s): {servicio(s)}
Explotabilidad: {PoC disponible / Teórico / No explotable en nuestra configuración}
Parche disponible: {Sí — versión X.Y.Z / No — workaround: ...}
Fecha límite de remediación: {fecha}
Responsable: {nombre}
```

### Actualización para Parts Interesadas

```
Se ha identificado una vulnerabilidad {severidad} ({CVE-ID}) en una dependencia
de terceros. Evaluación de impacto: {resumen}. Estamos {aplicando el parche /
implementando un workaround} y esperamos completar para {fecha}. No se ha
identificado exposición de datos en este momento.
```

## Pasos de Contención

1. Identificar la dependencia vulnerable y su versión desde el aviso CVE.
2. Determinar qué servicios y entornos usan el paquete afectado.
3. Evaluar la explotabilidad: verificar PoC público, exposición de red y requisitos de autenticación.
4. Verificar si la vulneribilidad está siendo explotada activamente.
5. Si es Crítico y explotado activamente: aislar servicios afectados inmediatamente.
6. Revisar el grafo de dependencias para exposición transitiva.
7. Notificar a las partes interesadas según la plantilla de comunicación.

## Procedimientos de Recuperación

1. Buscar un parche upstream o versión corregida.
2. Si hay parche: actualizar y ejecutar la suite completa de pruebas.
3. Si no hay parche: implementar reglas WAF, validación de entrada o controles a nivel de red.
4. Reconstruir contenedores/imágenes con la dependencia actualizada.
5. Desplegar en staging primero, verificar, luego promover a producción.
6. Verificar que el CVE está resuelto mediante escáner de vulnerabilidades post-despliegue.
7. Actualizar el archivo de lock de dependencias y fijar la versión segura.
8. Documentar la remediación en el issue de seguimiento del CVE.

## Requisitos del Post-Mortem

- [ ] Detalles del CVE y evaluación CVSS
- [ ] Inventario de servicios y entornos afectados
- [ ] Tiempo desde detección hasta remediación
- [ ] Método de remediación (parche / workaround / eliminación)
- [ ] Cobertura de pruebas para la remediación
- [ ] Mejoras en políticas de gestión de dependencias
- [ ] Análisis de brechas de cobertura de escaneo automatizado
- [ ] Mejoras en seguridad de la cadena de suministro

## Referencias

- [ADR-0025 — Abstracción de Proveedor de Feature Flags](../../reference/core/architecture/adrs/core/0025-feature-flag-provider-abstraction.md)
- [ADR-0011 — Patrones de Tolerancia a Fallos y Resiliencia](../../reference/core/architecture/adrs/core/0011-fault-tolerance-resiliency-patterns.md)
- [Base de Datos Nacional de Vulnerabilidades NIST](https://nvd.nist.gov/)
