# Guía de Configuración de Plugins de Kong (Modo DB-less)

Para integrar **Kong Open Source** delante de tu **BFF de NestJS (Tier 2)**, la mejor práctica moderna es usar el **modo DB-less**. En lugar de almacenar la configuración en PostgreSQL, defines todas las rutas y plugins en un archivo YAML (`kong.yml`) que vive en tu repositorio. Esto se alinea perfectamente con la filosofía **GitOps**.

A continuación se detalla cómo estructurar este archivo para implementar Limitación de Tasa (Rate Limiting), Validación JWT y Enrutamiento hacia tu BFF de NestJS.

---

## 1. Esqueleto Principal (`kong.yml`)

Este esqueleto principal define los servicios (tu backend de NestJS), las rutas (URLs expuestas) y los plugins (reglas de infraestructura).

```yaml
_format_version: "3.0"
_transform: true

services:
 - name: nestjs-bff-service
 url: http://nestjs-bff:3000 # La URL interna de tu contenedor Docker de NestJS
 routes:
 - name: public-api-route
 paths:
 - /api/v1
 strip_path: false # Mantiene /api/v1 al reenviar a NestJS

 # 2. PLUGINS APLICADOS A NIVEL DE SERVICIO
 plugins:
 # A) Rate Limiting: Protege NestJS de cargas excesivas
 - name: rate-limiting
 config:
 second: 10 # Máximo 10 peticiones por segundo
 hour: 10000 # Máximo 10k por hora
 policy: local # Almacena los contadores en la memoria de Kong
 fault_tolerant: true
 hide_client_headers: false

 # B) Validación JWT: Bloquea el tráfico no autenticado en el Tier 1
 - name: jwt
 config:
 claims_to_verify:
 - exp # Verifica que el token no haya expirado
 run_on_preflight: false # No requiere token para peticiones OPTIONS (CORS)
 uri_param_names:
 - jwt

 # C) CORS: Resuelve Preflights sin tocar el backend
 - name: cors
 config:
 origins:
 - "*" # Reemplazar con lista blanca como https://myapp.com
 methods:
 - GET
 - POST
 - PATCH
 - DELETE
 - OPTIONS
 headers:
 - Accept
 - Authorization
 - Content-Type
 exposed_headers:
 - X-Request-Id
 credentials: true
 max_age: 3600

# 4. CONSUMERS Y CREDENCIALES (Para validar JWTs)
# Kong necesita conocer secretos válidos para verificar firmas de tokens.
consumers:
 - username: app-frontend-consumer
 jwt_secrets:
 - key: "myapp-issuer" # Coincide con el claim 'iss' dentro del JWT
 secret: "my-super-secret-key" # El mismo secreto compartido con NestJS
```

---

## 2. Flujo de Datos Arquitectónico

1. **El cliente realiza la petición:** `GET /api/v1/orders` con la cabecera `Authorization: Bearer <token>`.
2. **Kong intercepta (Tier 1):**
 * **Rate Limiting:** Verifica que la IP del cliente no haya excedido el límite. Devuelve `429 Too Many Requests` inmediatamente si se viola. *NestJS nunca se entera.*
 * **CORS:** Resuelve las preflights `OPTIONS` automáticamente.
 * **JWT:** Decodifica el token, valida la firma contra el secreto y verifica `exp`. Devuelve `401 Unauthorized` si es inválido. *NestJS nunca se entera.*
3. **Reenvío al BFF (Tier 2):** Si las comprobaciones pasan, Kong reenvía la petición HTTP intacta a `http://nestjs-bff:3000/api/v1/orders`.
4. **NestJS actúa:** Recibe tráfico pre-validado. Solo lee la carga útil del JWT para identificar al usuario y procede con los flujos de trabajo de negocio.

---

## 3. Avanzado: Inyectando Información de Usuario a NestJS

Por defecto, cuando Kong valida un JWT, puede inyectar cabeceras adicionales. Puedes configurar Kong para pasar claims en cabeceras específicas:

```yaml
 - name: jwt
 config:
 claims_to_verify:
 - exp
 header_names:
 - X-Authenticated-Userid # Mapea un claim personalizado si se especifica
```

En tu código de **NestJS**, en lugar de re-validar la criptografía (desperdiciando CPU), simplemente confías en Kong y lees las cabeceras en tu AuthGuard:

```typescript
@Injectable()
export class KongAuthGuard implements CanActivate {
 canActivate(context: ExecutionContext): boolean {
 const request = context.switchToHttp().getRequest();
 
 // Kong garantizó la legitimidad del token. Solo leemos los claims inyectados.
 const userId = request.headers['x-consumer-username']; 
 
 if (!userId) throw new UnauthorizedException();
 
 request.user = { id: userId };
 return true;
 }
}
```

## 4. Beneficios de esta Estrategia

* **Protección a Costo Cero:** Los ataques o tokens expirados se descartan a nivel del proxy, preservando los hilos del bucle de eventos de NestJS Node.js para usuarios válidos reales.
* **Seguridad de Infraestructura:** Si añades otro servicio de backend (ej. Go o Python), Kong los protege de forma idéntica sin duplicar la lógica de autenticación.

---
[Volver al Índice](./README.es.md)
