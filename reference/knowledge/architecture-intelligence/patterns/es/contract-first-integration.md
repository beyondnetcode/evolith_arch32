# Integración Contract First

## Problema

Los módulos pierden independencia cuando se comunican mediante detalles internos en lugar de contratos claros.

## Contexto

Aplica a arquitecturas modulares donde los dominios deben colaborar sin depender de implementación interna.

## Solución

Definir contratos explícitos antes de integrar módulos.

Los contratos pueden ser:

- APIs
- eventos
- comandos
- consultas
- esquemas versionados

## Reglas

- Integrar mediante contratos documentados.
- Evitar depender de modelos internos de otros módulos.
- Revisar cambios de contrato como cambios arquitectónicos.
- Validar contratos críticos con pruebas automatizadas.

## Beneficios

- reduce acoplamiento
- mejora coordinación entre equipos
- facilita pruebas de contrato
- mejora uso por agentes IA
- prepara evolución distribuida

## Tradeoffs

- requiere diseño inicial
- exige disciplina de versionado
- requiere gobernanza
- puede requerir pruebas adicionales

## Posición Evolith

Recomendado.

## Nivel de adopción

Empresarial.

## Impacto IA

Alto. Los agentes IA producen mejores resultados cuando los contratos son claros y estables.

---

[Volver a Architecture Intelligence](../../README.es.md)
