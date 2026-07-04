# Kong Plugins Config Guide (DB-less Mode)

To integrate **Kong Open Source** in front of your **NestJS BFF (Tier 2)**, the modern best practice is using **DB-less mode**. Instead of storing configuration in PostgreSQL, you define all routes and plugins in a YAML file (`kong.yml`) living in your repository. This aligns perfectly with **GitOps** philosophy.

Below is how to structure this file to implement Rate Limiting, JWT Validation, and Routing to your NestJS BFF.

---

## 1. Main Skeleton (`kong.yml`)

This main skeleton defines the services (your NestJS backend), routes (exposed URLs), and plugins (infrastructure infrastructure rules).

```yaml
_format_version: "3.0"
_transform: true

services:
 - name: nestjs-bff-service
 url: http://nestjs-bff:3000 # The internal URL of your NestJS Docker container
 routes:
 - name: public-api-route
 paths:
 - /api/v1
 strip_path: false # Keeps /api/v1 when forwarding to NestJS

 # 2. PLUGINS APPLIED AT SERVICE LEVEL
 plugins:
 # A) Rate Limiting: Protects NestJS from excessive load
 - name: rate-limiting
 config:
 second: 10 # Maximum 10 requests per second
 hour: 10000 # Max 10k per hour
 policy: local # Stores counters in Kong memory
 fault_tolerant: true
 hide_client_headers: false

 # B) JWT Validation: Blocks unauthenticated traffic at Tier 1
 - name: jwt
 config:
 claims_to_verify:
 - exp # Verifies the token has not expired
 run_on_preflight: false # Doesn't require token for OPTIONS (CORS) requests
 uri_param_names:
 - jwt

 # C) CORS: Resolves Preflights without touching the backend
 - name: cors
 config:
 origins:
 - "*" # Replace with whitelist like https://myapp.com
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

# 4. CONSUMERS AND CREDENTIALS (To validate JWTs)
# Kong needs to know valid secrets for verifying token signatures.
consumers:
 - username: app-frontend-consumer
 jwt_secrets:
 - key: "myapp-issuer" # Matches 'iss' claim inside the JWT
 secret: "my-super-secret-key" # Same secret shared with NestJS
```

---

## 2. Architectural Data Flow

1. **Client performs request:** `GET /api/v1/orders` with Header `Authorization: Bearer <token>`.
2. **Kong intercepts (Tier 1):**
 * **Rate Limiting:** Verifies client IP has not exceeded limit. Returns `429 Too Many Requests` immediately if violated. *NestJS never hears about it.*
 * **CORS:** Resolves `OPTIONS` preflights automatically.
 * **JWT:** Decodes token, validates signature against secret and checks `exp`. Returns `401 Unauthorized` if invalid. *NestJS never hears about it.*
3. **Relay to BFF (Tier 2):** If checks pass, Kong forwards the HTTP request intact to `http://nestjs-bff:3000/api/v1/orders`.
4. **NestJS acts:** Receives pre-validated traffic. It only reads the JWT payload to identify the user and proceeds with business workflows.

---

## 3. Advanced: Injecting User Info to NestJS

By default, when Kong validates a JWT, it can inject additional headers. You can configure Kong to pass claims in specific headers:

```yaml
 - name: jwt
 config:
 claims_to_verify:
 - exp
 header_names:
 - X-Authenticated-Userid # Maps custom claim if specified
```

In your **NestJS** code, instead of re-validating cryptography (wasting CPU), you simply trust Kong and read headers in your AuthGuard:

```typescript
@Injectable()
export class KongAuthGuard implements CanActivate {
 canActivate(context: ExecutionContext): boolean {
 const request = context.switchToHttp().getRequest();
 
 // Kong guaranteed token legitimacy. We just read claims injected.
 const userId = request.headers['x-consumer-username']; 
 
 if (!userId) throw new UnauthorizedException();
 
 request.user = { id: userId };
 return true;
 }
}
```

## 4. Benefits of this Strategy

* **Zero Cost Protection:** Attacks or expired tokens are dropped at the proxy level, preserving NestJS Node.js event loop threads for actual valid users.
* **Infrastructure Security:** If you add another backend service (e.g., Go or Python), Kong protects them identically without duplicating auth logic.

---
[Back to Index](./README.md)
