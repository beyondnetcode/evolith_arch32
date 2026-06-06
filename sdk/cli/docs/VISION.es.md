# Smart CLI — Visión del Producto

> **Bilingual Navigation:** [English](./VISION.md)
> **Estado:** Borrador
> **Owner:** Tablero de Arquitectura Evolith
> **Última Actualización:** 2026-06-06

---

## 1. Declaración de Visión

**Smart CLI** es la interfaz de línea de comandos inteligente que hace que la gobernanza de Evolith sea accesible para cada desarrollador. Transforma decisiones arquitectónicas complejas en experiencias guiadas y conversacionales — permitiendo a los equipos construir software compliant sin convertirse en expertos en gobernanza.

> *"De gobernanza compleja a comandos simples."*

---

## 2. Imagen Conceptual

### 2-1 El Smart CLI como un Compañero IA

```mermaid
graph TB
    subgraph User["Experiencia del Desarrollador"]
        DEV["👨‍💻 Desarrollador"]
        NAT["Lenguaje Natural\n'Necesito validar mi repo'"]
        CONV["Flujo Conversacional"]
    end

    subgraph CLI["Motor Smart CLI"]
        PARSE["Parser de Intenciones"]
        CONTEXT["Motor de Contexto\n(Evolith Core)"]
        GUIDANCE["Asistente Guiado"]
        EXEC["Ejecución Inteligente"]
    end

    subgraph Output["Resultado"]
        VALID["Validado ✓"]
        REPORT["Reporte / Artefacto"]
        CONFIG["Config Generada"]
    end

    DEV --> NAT
    NAT --> CONV
    CONV --> PARSE
    PARSE --> CONTEXT
    CONTEXT --> GUIDANCE
    GUIDANCE --> EXEC
    EXEC --> OUTPUT
    OUTPUT --> VALID

    style User fill:#1e3a5f,stroke:#3b82f6,color:#fff
    style CLI fill:#065f46,stroke:#10b981,color:#fff
    style Output fill:#4a1d96,stroke:#a855f7,color:#fff
```

### 2-2 El CLI como Ventana al Evolith Core

```mermaid
graph TB
    subgraph EvolithCore["Evolith Core\n(Corpus de Referencia)"]
        CORE_ADRS["ADRs"]
        CORE_RULES["Rulesets"]
        CORE_STDS["Estándares"]
        CORE_TAX["Taxonomía"]
    end

    subgraph SmartCLI["Smart CLI\n(Capa de Interoperabilidad)"]
        CLI_CMD["Comandos\ninit, validate, adr, agents, sdlc"]
        CLI_MCP["Servidor MCP\nHerramientas + Recursos"]
        CLI_INT["Contexto Inteligente"]
    end

    subgraph Users["Ecosistema de Desarrolladores"]
        IDE["Cursor / Claude\n(Asistentes IA)"]
        TERMINAL["Terminal Directa\nUso"]
        CI["Pipelines CI/CD"]
    end

    Users --> CLI_CMD
    Users --> CLI_MCP
    CLI_CMD --> CORE_ADRS
    CLI_CMD --> CORE_RULES
    CLI_CMD --> CORE_STDS
    CLI_CMD --> CORE_TAX
    CLI_MCP --> CORE_ADRS
    CLI_MCP --> CORE_RULES

    style EvolithCore fill:#1e3a5f,stroke:#3b82f6,color:#fff
    style SmartCLI fill:#065f46,stroke:#10b981,color:#fff
    style Users fill:#4a1d96,stroke:#a855f7,color:#fff
```

---

## 3. Propuestas de Valor Core

### 3-1 Para Desarrolladores Individuales

| Antes (Sin Smart CLI) | Después (Con Smart CLI) |
|-----------------------|-------------------------|
| Leer 50 páginas de ADRs | Preguntar: `smart-cli adr suggest --context authentication` |
| Validar manualmente 20 reglas | Ejecutar: `smart-cli validate --ruleset acl` |
| Adivinar patrones arquitectónicos | Obtener guía: `smart-cli init --wizard` |
| Buscar docs por horas | `smart-cli architecture ask "¿Cuál es el patrón de auth?"` |

### 3-2 Para Equipos

```mermaid
graph LR
    subgraph Before["Sin Smart CLI"]
        A1["Decisiones\nInconsistentes"]
        A2["Deuda de\nGobernanza"]
        A3["Silos de\nConocimiento"]
    end

    subgraph After["Con Smart CLI"]
        B1["Decisiones\nGuiadas"]
        B2["Cumplimiento\nAutomático"]
        B3["Conocimiento\nCompartido"]
    end

    A1 -.->|"Fricción"| B1
    A2 -.->|"Riesgo"| B2
    A3 -.->|"Cuello de Botella"| B3

    style Before fill:#9f1239,stroke:#f43f5e,color:#fff
    style After fill:#065f46,stroke:#10b981,color:#fff
```

---

## 4. Concepto del Producto: Tres Modos

### 4-1 Modo Interactivo (Por Defecto)

Asistentes guiados con UI rica:

```
┌─────────────────────────────────────────────────┐
│  🚀 Asistente Smart CLI Init                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  Configuremos tu repositorio satélite.          │
│                                                 │
│  ◆ Nombre del Proyecto: [________________]      │
│                                                 │
│  ◆ Runtime:                                     │
│    ○ NodeJS / TypeScript                        │
│    ○ .NET / C#                                  │
│    ○ Android / Kotlin                           │
│                                                 │
│  ◆ Arquitectura:                                │
│    ○ Clean Architecture                         │
│    ○ Hexagonal (Puertos y Adaptadores)          │
│    ○ DDD (Diseño Dirigido por Dominio)          │
│                                                 │
│  ◆ Monorepo:                                    │
│    ○ Ninguno (standalone)                       │
│    ○ Nx                                         │
│    ○ NPM Workspaces                             │
│                                                 │
│  ◆ Instalar Agentes:                            │
│    □ @architect (recomendado)                   │
│    □ @validator                                 │
│                                                 │
│           [Cancelar]              [Crear →]     │
└─────────────────────────────────────────────────┘
```

### 4-2 Modo Batch (CI/CD)

Ejecución silenciosa con salida JSON:

```bash
smart-cli init --config project.yaml --output json | tee setup-report.json
```

### 4-3 Modo MCP (Integración IA)

stdio JSON-RPC para asistentes IA:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "evolith-validate",
    "arguments": { "path": "/repo", "format": "summary" }
  }
}
```

---

## 5. Principios de Experiencia

### 5-1 Experiencia de Desarrollador Cinco Estrellas

```mermaid
graph TB
    E1["✨ Divulgación Progresiva\nInicia simple, revela profundidad bajo demanda"]
    E2["🔮 Guía Predictiva\nAnticipa necesidades antes de preguntar"]
    E3["🛡️ Seguro por Defecto\nBloquea errores, permite exploración"]
    E4["⚡ Retroalimentación Instantánea\nCada acción tiene resultado visible"]
    E5["🌐 Contexto-Aware\nConoce tu proyecto, tu fase, tus objetivos"]

    E1 --> E2 --> E3 --> E4 --> E5 --> E1

    style E1 fill:#1e3a5f,stroke:#3b82f6,color:#fff
    style E2 fill:#065f46,stroke:#10b981,color:#fff
    style E3 fill:#4a1d96,stroke:#a855f7,color:#fff
    style E4 fill:#c2410c,stroke:#f97316,color:#fff
    style E5 fill:#9f1239,stroke:#f43f5e,color:#fff
```

### 5-2 Carga Cognitiva Mínima

```
┌─────────────────────────────────────────────────────────────┐
│                    curva de carga cognitiva                  │
│                                                             │
│   ▲                                                         │
│   │         Sin CLI           │    Con Smart CLI            │
│   │                            │                            │
│ 4 │    ┌───────────────────    │    ┌─                     │
│   │    │ Decisiones complejas  │    │  Valores guiados      │
│ 3 │    │ enterradas en docs    │    │  Contexto-aware       │
│   │    └───────────────────────    │  ─────────────────────│
│ 2 │                                 │                      │
│   │                              ───┘                       │
│ 1 │    ┌─────────────────────────────────────────          │
│   │    │ Comandos simples, resultados claros               │
│   │    └───────────────────────────────────────────────────
│   └────────────────────────────────────────────────────────►
│         Novato          Intermedio        Experto
│                        Habilidad del Desarrollador
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Journey del Usuario: Primeros 5 Minutos

### 6-1 Descubrimiento → Producción en 5 Minutos

```mermaid
sequenceDiagram
    participant Dev as Desarrollador
    participant CLI as Smart CLI
    participant Core as Evolith Core
    participant Repo as Nuevo Repo

    Dev->>CLI: smart-cli init
    CLI->>CLI: Mostrar asistente
    Dev->>CLI: Ingresar: name=mi-app, runtime=nodejs
    CLI->>Core: Cargar defaults para nodejs
    Core-->>CLI: Patrones + herramientas recomendados
    CLI->>Dev: Mostrar recomendaciones
    Dev->>CLI: Aceptar defaults
    CLI->>Repo: Crear estructura + evolith.yaml
    CLI->>Repo: Instalar agente @architect
    CLI->>Core: Registrar satélite
    Core-->>Repo: Confirmado + coreRef
    CLI-->>Dev: ✓ ¡Listo! Ejecuta: smart-cli validate

    Note over Dev,Repo: 5 minutos para satélite production-ready
```

### 6-2 Flujos de Sesión Típicos

```mermaid
graph TB
    subgraph Morning["Revisión Matutina"]
        M1["smart-cli sdlc status"] --> M2["Salud de phase gates"]
        M2 --> M3["Gates: 3/5 pasaron ✓"]
    end

    subgraph Task["Tarea de Desarrollo"]
        T1["smart-cli validate"] --> T2["Verificaciones: 15 pasaron"]
        T2 --> T3["Advertencias: 2 (no bloqueantes)"]
        T3 --> T4["Sugerencia: Ejecuta smart-cli docs --fix"]
    end

    subgraph Review["Code Review"]
        R1["smart-cli adr list"] --> R2["Mostrar: 5 ADRs activos"]
        R2 --> R3["Verificar: ADR-0023 aún válido?"]
        R3 --> R4["Decisión: aún aplica ✓"]
    end

    style Morning fill:#1e3a5f,stroke:#3b82f6,color:#fff
    style Task fill:#065f46,stroke:#10b981,color:#fff
    style Review fill:#4a1d96,stroke:#a855f7,color:#fff
```

---

## 7. Identidad de Marca

### 7-1 Concepto Visual

```
╔═══════════════════════════════════════════════════════════════╗
║                                                                ║
║     ██████╗ ███████╗███╗   ██╗ ██████╗  ██████╗ ██████╗      ║
║     ██╔══██╗██╔════╝████╗  ██║██╔════╝ ██╔═══██╗██╔══██╗     ║
║     ██████╔╝█████╗  ██╔██╗ ██║██║  ███╗██║   ██║██████╔╝     ║
║     ██╔═══╝ ██╔══╝  ██║╚██╗██║██║   ██║██║   ██║██╔══██╗     ║
║     ██║     ███████╗██║ ╚████║╚██████╔╝╚██████╔╝██║  ██║     ║
║     ╚═╝     ╚══════╝╚═╝  ╚═══╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝     ║
║                                                                ║
║              ╔═══════════════════════════════╗                ║
║              ║    smart-cli — evolve smart    ║                ║
║              ╚═══════════════════════════════╝                ║
║                                                                ║
║     Colores:                                                   ║
║       Primario: #3B82F6 (Azul — Confianza)                    ║
║       Acento:  #10B981 (Verde — Éxito)                        ║
║       Oscuro:  #1E3A5F (Azul Marino — Profesional)            ║
║       Alerta:  #EF4444 (Rojo — Atención)                      ║
║                                                                ║
╚═══════════════════════════════════════════════════════════════╝
```

### 7-2 Concepto de Logo

```mermaid
graph TB
    subgraph LogoConcept["Logo: El Puntero Inteligente"]
        ICON["▶"]
        TEXT["smart-cli"]
        CONTEXT["evolve → smart"]
    end

    style ICON fill:#10b981,stroke:#10b981,color:#fff
    style TEXT fill:#1e3a5f,stroke:#3b82f6,color:#fff
    style CONTEXT fill:#4a1d96,stroke:#a855f7,color:#fff
```

**Concepto:** El botón de play (▶) representa movimiento hacia adelante, progresión inteligente y acción. La flecha sugiere guía hacia mejores decisiones arquitectónicas.

---

## 8. Métricas de Éxito

### 8-1 KPIs de Adopción de Desarrolladores

| Métrica | Objetivo | Medición |
|---------|----------|----------|
| Tiempo hasta primera validación exitosa | < 2 min | Telemetría |
| Comandos ejecutados por sesión | > 5 | Analíticas |
| Uso de herramientas MCP por asistentes IA | Creciendo | Logs de integración |
| Índice de adherencia de proyectos guiados por CLI | > 85% | Auditoría periódica |

### 8-2 Puertas de Calidad

```mermaid
graph TB
    G1["✓ Sintaxis Válida"] --> G2["✓ Semántica Válida"]
    G2 --> G3["✓ Contexto-Aware"]
    G3 --> G4["✓ Alineado con Mejores Prácticas"]
    G4 --> G5["✓ Production Ready"]

    style G1 fill:#1e3a5f,stroke:#3b82f6,color:#fff
    style G2 fill:#065f46,stroke:#10b981,color:#fff
    style G3 fill:#4a1d96,stroke:#a855f7,color:#fff
    style G4 fill:#c2410c,stroke:#f97316,color:#fff
    style G5 fill:#9f1239,stroke:#f43f5e,color:#fff
```

---

## 9. Roadmap

| Fase | Enfoque | Hito |
|------|---------|------|
| **Beta** | Comandos core | validate, init, adr, agents |
| **v1.0** | Integración MCP | Suite completa de herramientas + soporte asistentes IA |
| **v1.1** | Guía de fases | Asistente interactivo SDLC |
| **v2.0** | Agentes autónomos | Auto-curación de cumplimiento arquitectónico |

---

*Smart CLI — Haciendo la gobernanza de Evolith accesible, un comando a la vez.*

---

[Back to CLI Index](../README.md)