# Evolith Production Secrets (Coolify / K8s)

Para habilitar la conectividad de los contenedores en Coolify (VPS de producción) con los servicios requeridos, se deben aprovisionar las siguientes variables de entorno de manera segura (Encriptadas) en la interfaz web de Coolify bajo los Settings del Proyecto, o crear el Secret correspondiente en Kubernetes si el VPS opera en modo clúster puro.

> [!CAUTION]
> **NUNCA** guardes este archivo con valores reales (raw) ni lo incluyas en control de versiones. Este archivo sirve únicamente como plantilla para la carga manual en la consola del VPS.

## 1. Core API (`core-api-auth`)
Servicio responsable del motor de evaluación.
Requiere autenticación para responder a peticiones externas (Agent Runtime y Tracker).

```env
# Clave principal (Bearer) para las llamadas a la API de Evolith Core
EVOLITH_API_KEY=your_production_secure_key_here
```

## 2. Agent Runtime (`agent-runtime-auth`)
Servicio satélite que orquesta los agentes locales/remotos.
Necesita conectarse de vuelta al Core.

```env
# URL interna/pública hacia el core-api
EVOLITH_CORE_API_URL=http://core-api:3000

# Debe coincidir con la clave configurada en core-api
EVOLITH_API_KEY=your_production_secure_key_here
```

## 3. MCP Server (`mcp-auth` & `opa-bundle-credentials`)
Servidor de Contexto del Modelo (MCP) para la validación de políticas.

```env
# Claves de acceso a Open Policy Agent u orígenes de las políticas
OPA_BUNDLE_CREDENTIALS=your_opa_credentials
OPA_BUNDLE_SIGNING_KEY=your_opa_signing_key

# Autenticación MCP
MCP_API_TOKEN=your_mcp_secure_token
```

## 4. Evolith Tracker (Base de Datos)
El sistema *Core* es stateless, pero Evolith Tracker (UI en .NET) requiere conectividad PostgreSQL para almacenar la gobernanza.

```env
# Ubicación y credenciales de la Base de Datos (en provisiones administradas o PostgreSQL nativo)
DATABASE_URL=postgres://tracker_user:tracker_pass@postgres-host:5432/tracker_governance
```

## Instrucciones de Inyección en Coolify
1. Iniciar sesión en el panel de **Coolify** de la infraestructura de Hostinger.
2. Navegar al Proyecto / Entorno de **Evolith Production**.
3. En la configuración de **Environment Variables**, añadir cada clave mencionada arriba.
4. Asegurar marcar el checkbox de **Build Variable** o **Secret** (encriptado) dependiendo de la visibilidad deseada (los tokens deben estar ocultos/encriptados).
5. (Opcional) Si la infraestructura se gestiona en Helm/K8s de manera explícita, se puede inyectar el secreto por nombre:
   ```yaml
   apiVersion: v1
   kind: Secret
   metadata:
     name: core-api-auth
   type: Opaque
   stringData:
     EVOLITH_API_KEY: "tu_clave_real"
   ```
