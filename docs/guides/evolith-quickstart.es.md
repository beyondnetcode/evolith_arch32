# Guía de Inicio Rápido: Evolith (Paso a Paso)

Esta guía te ayudará a instalar y poner en marcha Evolith en **menos de 5 minutos**, para que puedas comenzar a validar la arquitectura de tu código.

---

## Paso 1: Levantar el Cerebro (Evolith Core API)

El Core API es el servidor central que contiene las reglas de arquitectura de tu empresa. Debes levantarlo primero para que los clientes puedan consultarlo.

Tienes dos opciones para iniciarlo en tu máquina local:

### Opción A: Vía Docker Compose (Más Rápido)
Ideal para desarrolladores. Levanta la API y la base de datos PostgreSQL mínima necesaria.
```bash
docker-compose -f product/infra/docker-compose.yml up -d postgres
```

### Opción B: Vía Kubernetes / Helm (Entorno Completo)
Ideal para simulaciones de producción o arquitectos. Levanta el clúster local, la base de datos, el Gateway y el Core API.
```bash
./.harness/scripts/run-core-local.sh
```

Una vez que termine, el servidor estará escuchando en `http://localhost:30080`. Puedes ver la documentación de la API generada en `http://localhost:30080/api/docs`.

---

## Paso 2: Instalar el Cliente (Evolith CLI)

El CLI es la herramienta que utilizarán los desarrolladores en su día a día.

1. Instala el paquete de forma global usando npm:
```bash
npm install -g @beyondnet/evolith-cli
```

2. Configura la URL del servidor al que el CLI debe apuntar (el que levantamos en el Paso 1). Puedes hacerlo exportando una variable de entorno:
```bash
export EVOLITH_CORE_URL="http://localhost:30080/api/v1"
```

---

## Paso 3: Tu Primera Validación

Ve a la carpeta raíz de cualquier proyecto de software (satélite) que quieras validar y ejecuta el comando de validación.

```bash
cd mi-proyecto-backend
evolith validate
```

**¿Qué sucede detrás de escena?**
El CLI tomará el estado actual de tu código, se conectará al Core API central y evaluará tu proyecto contra las reglas OPA y los ADRs oficiales de la empresa. En segundos, te devolverá un reporte indicando si cumples con el estándar o si hay violaciones de arquitectura.

---

## Paso 4: (Opcional) Conectar a tu Agente de IA

Evolith no es solo para humanos. Puedes conectar tu editor de código basado en IA (Cursor, Claude Desktop, etc.) para que "entienda" tu arquitectura.

Para arrancar el servidor MCP, simplemente ejecuta:
```bash
evolith mcp start
```

Luego, en la configuración de Cursor o Claude Desktop, añade este servidor MCP local. A partir de ese momento, tu Agente de IA sabrá qué patrones usar, qué librerías están prohibidas y cómo debe estructurar el código antes de escribir una sola línea.
