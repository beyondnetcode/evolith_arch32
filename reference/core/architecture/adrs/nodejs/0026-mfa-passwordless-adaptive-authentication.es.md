# [ADR 0026](0026-mfa-passwordless-adaptive-authentication.md): Plataforma Adaptativa de MFA y Passwordless

## Estado
Accepted

## Fecha
2026-05-09

## Contexto
La validación convencional de contraseñas y el MFA por SMS estático en bruto es fuertemente vulnerable a la ingeniería social agresiva y a los vectores de phishing. Los clientes corporativos demandan cumplimiento de Zero-Trust, requiriendo mecanismos criptográficos resistentes al phishing junto con experiencias sin fricción que no agoten a los usuarios finales.

## Decisión
Desplegar un **Marco de MFA Adaptativo Gestionado por Riesgo** que impulse la pipeline de autenticación Core:

1. **Primero Passwordless (Sin Contraseña)**: Infundir WebAuthn nativo (Passkeys) en los flujos de autenticación, empoderando a los usuarios finales para vincular hardware de alta seguridad (TouchID, FaceID, Yubikeys) nativamente a los inicios de sesión.
2. **Puntuación Adaptativa**: Desplegar puntos de control en la pipeline sin estado que inspeccionen metadatos (vectores IP, anomalías de huella digital, verificaciones de viajes imposibles por ubicación). Producir matrices de riesgo internas.
3. **Aumento Dinámico (Dynamic Step-Up)**: Alejarse de las fricciones de "siempre encendido". Disparar solicitudes de múltiples factores dinámicamente solo ante violaciones del umbral de puntuación de riesgo o peticiones que toquen rutas transaccionales críticas para el negocio.
4. **Gobernanza por Inquilino**: Permitir que cada perfil de Inquilino (Tenant) empresarial active, configure y mande su umbral exacto de postura de seguridad preferida.

## Consecuencias

### Positivas
- Establece la mejor defensa en su clase contra el Phishing coincidiendo con los estrictos estándares NIST SP 800-63B.
- Eleva dramáticamente el rendimiento de los operadores al reducir la fatiga de validación redundante en vectores de dispositivos seguros y establecidos.

### Negativas
- Curva de aprendizaje de incorporación inicial para perfiles de operadores no técnicos.
- Mínima sobrecarga de procesamiento de criptografía requerida por cada inicio de sesión.

## Referencias
- [ADR-0020: Abstracción de IdP](../../adrs/core/0020-identity-provider-abstraction-strategy.es.md)
- [Guía Oficial de WebAuthn](https://webauthn.guide/)







## Objetivo y Alcance

Backfill histórico: Abordar la tensión arquitectónica donde la validación convencional de contraseñas y el MFA por SMS estático en bruto es fuertemente vulnerable a la ingeniería social agresiva y a los vectores de phishing, estableciendo un límite estándar.

## Opciones Consideradas

- **Seleccionada:** Plataforma Adaptativa de MFA y Passwordless
- **Otras:** Desconocido (el registro histórico no enumera explícitamente alternativas rechazadas).

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad).

## Decisiones y Estándares Relacionados

- [ADR-0020: Abstracción de IdP](../../adrs/core/0020-identity-provider-abstraction-strategy.es.md)
- [Guía Oficial de WebAuthn](https://webauthn.guide/)

## Vigilancia Tecnológica (Tendencias, Madurez, Adopción, Soporte)

MFA, passwordless y autenticación adaptativa están en etapa de crecimiento hacia adopción mainstream. FIDO2/WebAuthn tienen soporte maduro en navegadores y son cada vez más exigidos por políticas de seguridad empresarial. Presión regulatoria (PSD2, GDPR) impulsa la adopción continua. Vigencia esperada: el patrón MFA/passwordless es un requisito de seguridad permanente.

## Fuentes Actuales

- Especificación FIDO2/WebAuthn — https://webauthn.io, consultado 2026-06-20.
- Guías de autenticación OWASP — https://cheatsheetseries.owasp.org, consultado 2026-06-20.

---
[Volver al Índice](./README.es.md)
