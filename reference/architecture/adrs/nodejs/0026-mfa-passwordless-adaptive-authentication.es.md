# [ADR 0026](0026-mfa-passwordless-adaptive-authentication.md): Plataforma Adaptativa de MFA y Passwordless

## Estado
Aprobado

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
- [ADR-0020: Abstracción de IdP](../../adrs/core/0020-identity-provider-abstraction-strategy.md)
- [Guía Oficial de WebAuthn](https://webauthn.guide/)

---
[Volver al Índice](./README.es.md)
