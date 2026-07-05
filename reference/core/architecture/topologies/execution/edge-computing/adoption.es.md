# Guía de Adopción de Computación en el Borde

> **Navegación Bilingüe:** [English](./adoption.md) | [Español](./adoption.es.md)

**Propietario:** Ingeniería de Plataforma
**Topología:** Computación en el Borde

## Criterios de Entrada

Antes de adoptar la computación en el borde, evalúe si su workload cumple con los criterios de entrada.

### Matriz de Evaluación

| Criterio | Requisito | Medición | Umbral |
|----------|-----------|----------|--------|
| Latencia | De cara al usuario, baja latencia | Latencia de extremo a extremo | < 200ms |
| Localidad de Datos | Específico del usuario o región | Patrón de acceso a datos | > 80% local |
| Regulatorio | Residencia de datos requerida | Auditoría de cumplimiento | Requerido |
| Disponibilidad | Capacidad sin conexión necesaria | Análisis de conectividad | Intermitente |
| Costo | Alto volumen de solicitudes | Conteo de solicitudes | > 100K/día |

### Lista de Verificación de Criterios de Entrada

```bash
# Evaluar preparación para adopción del borde
edge-cli adoption evaluate \
  --service product-api \
  --check-latency \
  --check-locality \
  --check-regulatory \
  --check-offline

# Salida:
# SERVICE: product-api
# LATENCY_BENEFIT: 65ms (PASS)
# DATA_LOCALITY: 92% local (PASS)
# REGULATORY: GDPR required (PASS)
# OFFLINE_NEEDED: yes (PASS)
# ADOPTION_SCORE: 95/100
# RECOMMENDATION: ADOPT
```

### Flujo de Decisión

```
Evaluación del Workload
       │
       ├── Latencia < 200ms?
       │       ├── SÍ → Proceder
       │       └── NO → Evaluar alternativas en la nube
       │
       ├── Localidad de datos > 80%?
       │       ├── SÍ → Proceder
       │       └── NO → Considerar enfoque híbrido
       │
       ├── Regulatorio requerido?
       │       ├── SÍ → Borde requerido
       │       └── NO → Evaluar costo-beneficio
       │
       └── Sin conexión necesario?
               ├── SÍ → Borde requerido
               └── NO → Evaluar alternativas
```

## Aprovisionamiento de Nodos

Aprovisionar nodos del borde según los requisitos de su workload.

### Flujo de Aprovisionamiento

```bash
# Aprovisionar nodos del borde para un nuevo despliegue
edge-cli node provision \
  --cluster edge-cluster-01 \
  --nodes 4 \
  --role compute \
  --specs "cpu=4,memory=8Gi,storage=50Gi" \
  --region us-west-2 \
  --zone-usability high

# Salida:
# PROVISIONING: 4 nodes
# CLUSTER: edge-cluster-01
# REGION: us-west-2
# SPECS: cpu=4,memory=8Gi,storage=50Gi
# STATUS: provisioning...
# NODES:
#   - edge-node-01: provisioning
#   - edge-node-02: provisioning
#   - edge-node-03: provisioning
#   - edge-node-04: provisioning
```

### Guía de Dimensionamiento de Nodos

| Tipo de Workload | CPU | Memoria | Almacenamiento | Caso de Uso |
|------------------|-----|---------|----------------|-------------|
| Contenido estático | 2 | 4Gi | 20Gi | CDN, activos |
| Caché de API | 4 | 8Gi | 50Gi | APIs REST |
| Cómputo pesado | 8 | 16Gi | 100Gi | Inferencia ML |
| Almacenamiento pesado | 4 | 8Gi | 200Gi | Almacenamiento de medios |

### Aprovisionamiento Automatizado

```yaml
# infrastructure/edge-nodes.yaml
provisioning:
  cluster: edge-cluster-01
  nodes:
    - name: edge-node-01
      role: compute
      specs:
        cpu: 4
        memory: 8Gi
        storage: 50Gi
      region: us-west-2
      zone: us-west-2a
    - name: edge-node-02
      role: compute
      specs:
        cpu: 4
        memory: 8Gi
        storage: 50Gi
      region: us-west-2
      zone: us-west-2b
  networking:
    vpc: edge-vpc-01
    subnet: edge-subnet-01
    security_groups:
      - edge-sg-compute
      - edge-sg-monitoring
```

## Pipeline de Despliegue

Desplegar workloads en el borde utilizando un pipeline controlado.

### Etapas del Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│  Pipeline de Despliegue del Borde                           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │ Compilar│→ │ Probar  │→ │ Estaging│→ │ Despleg │       │
│  │         │  │         │  │         │  │         │       │
│  │ Compilar│  │ Unit    │  │ Canary  │  │ Rolling │       │
│  │ Empaquet│  │ Integ.  │  │ Shadow  │  │ Blue/Grn│       │
│  │ Validar │  │ E2E     │  │ Carga   │  │ Rápido  │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Configuración del Pipeline

```yaml
# .edge-deploy.yaml
pipeline:
  stages:
    - name: build
      steps:
        - edge-cli build --optimize
        - edge-cli package --minify
        - edge-cli validate --check-deps
    
    - name: test
      steps:
        - edge-cli test unit --coverage 80%
        - edge-cli test integration --timeout 60s
        - edge-cli test e2e --browser chrome
    
    - name: stage
      steps:
        - edge-cli deploy --target canary --percentage 10%
        - edge-cli monitor --duration 300s
        - edge-cli analyze --error-rate 0.1%
    
    - name: deploy
      strategy: rolling
      batch_size: 25%
      pause_on_failure: true
      rollback_on_error: true
```

### Estrategias de Despliegue

| Estrategia | Velocidad | Riesgo | Retroceso | Caso de Uso |
|------------|-----------|--------|-----------|-------------|
| Rolling | Media | Bajo | Fácil | Predeterminado |
| Blue/Green | Rápida | Medio | Rápido | Crítico |
| Canary | Lenta | Bajo | Fácil | Experimental |
| Shadow | Media | Bajo | Ninguno | Validación |

## Lista de Verificación de Adopción

Utilizar esta lista de verificación para asegurar una adopción exitosa del borde.

### Pre-Adopción

- [ ] Workload cumple criterios de entrada
- [ ] Requisitos de latencia validados
- [ ] Cumplimiento de residencia de datos verificado
- [ ] Análisis costo-beneficio completado
- [ ] Capacitación del equipo programada

### Infraestructura

- [ ] Nodos del borde aprovisionados
- [ ] Conectividad de red establecida
- [ ] Políticas de seguridad configuradas
- [ ] Monitoreo y alertas configurados
- [ ] Respaldo y recuperación probados

### Despliegue

- [ ] Aplicación adaptada para el borde
- [ ] Datos primero local implementados
- [ ] Estrategias de sincronización configuradas
- [ ] Resolución de conflictos probada
- [ ] Modo sin conexión validado

### Operaciones

- [ ] Manuales operativos creados
- [ ] Turno de guardia establecido
- [ ] Líneas base de rendimiento establecidas
- [ ] Seguimiento de costos habilitado
- [ ] Revisiones regulares programadas

### Post-Adopción

- [ ] Métricas de rendimiento recolectadas
- [ ] Retroalimentación del usuario recopilada
- [ ] Optimización de costos revisada
- [ ] Lecciones aprendidas documentadas
- [ ] Plan de escalabilidad preparado

## Cronograma de Migración

### Semana 1-2: Evaluación

- Evaluar workloads para elegibilidad en el borde
- Validar requisitos de latencia y residencia de datos
- Completar análisis costo-beneficio
- Seleccionar workload piloto

### Semana 3-4: Infraestructura

- Aprovisionar nodos del borde
- Configurar redes y seguridad
- Configurar monitoreo y alertas
- Probar conectividad y conmutación por error

### Semana 5-6: Aplicación

- Adaptar aplicación para despliegue en el borde
- Implementar patrones de datos primero local
- Configurar estrategias de sincronización
- Probar capacidades sin conexión

### Semana 7-8: Despliegue

- Desplegar en entorno canary
- Ejecutar pruebas de carga y validación
- Desplegar en producción (rolling)
- Monitorear y optimizar

---
[Volver al Perfil de Computación en el Borde](./README.es.md)
