# Agentic Maturity Self-Assessment Guide

This questionnaire allows Tech Leads to instantly diagnose the AI integration phase of their current product and what is required to scale.

## Quick Self-Test

Answer YES or NO to the following statements:

### Block A (Level 1)
1. Does `AGENTS.md` exist in the repository? `[]`
2. Does the team use an automatic Linter before committing AI-suggested changes? `[]`
3. Has at least one `Agent Rule` been configured to prevent a repetitive bug? `[]`
> *If you checked all YES, you meet Level 1 (AI-Assisted).*

### Block B (Level 2)
4. Does the product directly invoke an LLM during runtime (e.g., NestJS service calling GPT)? `[]`
5. Have internal endpoints been packaged under an MCP Server connector? `[]`
6. Do tools exposed to the model possess strict Zod or JSON Schema validation? `[]`
> *If you checked all YES, you have scaled to Level 2 (AI-Integrated).*

### Block C (Level 3)
7. Does a flow exist that halts AI execution to await explicit human confirmation? `[]`
8. Are 100% of tool calls recorded in an immutable audit log? `[]`
9. Does a budget limit quota exist that stops consumption if the agent goes rogue? `[]`
> *If you checked all YES, you possess the maturity of Level 3 (AI-Orchestrated).*

---

## Next Steps
Once your current level is determined, schedule an alignment review with the AI CoE (Center of Excellence) to authorize access to advanced backend credentials or corporate model clusters.

---
[Back to Index](./README.md)
