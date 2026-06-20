# Agentic CI and RAG Support Runbook

> **Bilingual Navigation:** [Version en Espanol](./agentic-ci-rag-support.es.md)

**Classification:** Operations and Infrastructure
**Status:** Active
**Owner:** Platform and Architecture
**Scope:** Wilson agentic review and RAG index preparation in GitHub Actions.

## Purpose

Operate the Gemini-backed Wilson review and the RAG chunking pipeline safely. This guide covers support procedures; it does not define the architectural rules reviewed by Wilson.

## Secure Gemini Configuration

Create a Gemini API key in Google AI Studio, restrict it to the Gemini API, and store it only as the GitHub repository Actions secret `EVOLITH_LLM_API_KEY`.

The `Wilson Agentic Review` CI job supplies the secret with `EVOLITH_AGENTIC_REVIEW=true`. The job fails when the secret is absent, Gemini cannot be contacted, or Wilson reports a violation. Never place the key in source code, repository variables, logs, issues, or a committed `.env` file. Rotate a key immediately after exposure.

## Review Triage

| Signal | Meaning | Operator action |
|---|---|---|
| Missing key | CI cannot authenticate to Gemini | Add or rotate the repository secret, then rerun the job. |
| Gemini API failure | Provider, quota, or network failure | Check Google AI Studio quota and key restrictions; rerun only after the cause is resolved. |
| `VIOLATION_DETECTED` | Wilson found a governed architecture issue | Treat it as a blocking review finding; correct code or documentation and rerun CI. |

## RAG Index Preparation

The RAG job divides changed English reference documents at H2/H3 boundaries and then by a maximum of about 512 tokens. This keeps retrieval focused and prevents large gap catalogs from consuming the whole agent context.

`EVOLITH_RAG_SYNC=true` enables the live-sync branch. The current implementation prepares and reports chunks; connecting a vector-store provider remains an infrastructure adapter task. Do not claim documents are indexed until that adapter confirms successful upserts.

## Support Checklist

1. Confirm the GitHub secret exists without attempting to print its value.
2. Review the `Wilson Agentic Review` job log for the actual Gemini result.
3. Inspect RAG chunk counts and oversized warnings after documentation changes.
4. Rotate exposed keys and rerun affected workflows.
5. Keep provider credentials and vector-store configuration outside the reference corpus.

## Related Authority

- [ADR-0090 Rule Language Policy](../governance/adr/adr-0090-rule-language-policy.md)
- [AI Architecture Assistant](../governance/standards/ai-augmented/08-architecture-ai-assistant/README.md)
- [Wilson Audit Playbook](../../.harness/playbooks/wilson-audit-playbook.md)

---
[Back to Operations](./README.md)
