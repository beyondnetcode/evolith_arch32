# ADR-AI-005: Human-in-the-Loop policy for operations with irreversible impact


---

## Context
Otorgar autonomía total a un agente para ejecutar funciones con efectos secundarios en el mundo real presenta un riesgo operativo catastrófico e inaceptable para la organización. Los agentes pueden alucinar argumentos, entrar en bucles infinitos o ser manipulados mediante inyecciones indirectas.
## Decision
Definimos categorías estrictas de operaciones que **SIEMPRE** requieren la interrupción del ciclo agencial y la aprobación humana física y explícita. Esto es independiente del nivel de confianza en el modelo o el conjunto de pruebas.

**Categorías de bloqueo:**
1. Modificar o eliminar datos en entornos de producción.
2. Envío de notificaciones/correos electrónicos externos en nombre de la marca.
3. Operaciones financieras (pagos, devoluciones) que superen el umbral de seguridad empresarial.
4. Cambios críticos en las configuraciones de seguridad de la red o IAM en la nube.
## Consequences
* **Mitigación de riesgos extremos:** Evita que el escenario del "agente deshonesto" elimine servidores o gaste un presupuesto ilimitado de la nube.
* **Responsabilidad Legal:** Garantiza un seguimiento donde un humano es siempre el firmante final de la acción, abarcando el cumplimiento normativo.
* **Pérdida de autonomía pura:** Los flujos de agentes nocturnos o en tiempo real sufrirán una latencia de horas esperando la aprobación humana para continuar.

---
[Volver al índice](./README.md)