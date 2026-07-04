# Layered Verification Patterns

An agent is statistical; production software must be deterministic. To unite both worlds, the harness implements a sequential defensive shield that detects and self-corrects errors before they impact the codebase.

## The 4 Verification Layers

We adopt the following validation hierarchy based on feedback time and computational cost:

| Layer | Trigger | Estimated Time | Responsible Harness Component | Action Example |
| :--- | :--- | :--- | :--- | :--- |
| **1. PostToolUse Hook** | After every successful `tool_call` | Milliseconds (ms) | Runtime / Framework | Instantly run the linter or TS compiler on the edited file. |
| **2. Pre-commit Hook** | Manual or triggered `git commit` | Seconds (s) | Git Hooks (Husky, Lefthook) | Run specific unit tests, validate commit message format, and type-check. |
| **3. CI Pipeline** | Git Push / Pull Request | Minutes (min) | GitHub Actions / GitLab CI | Full E2E test suite, Pact Contract Testing, CodeQL/Sonar scan. |
| **4. Human Review** | Merge Approval | Hours (h) | Engineering Team | Final check for business coherence, architecture adherence, and SOLID principles. |

## Early Detection Principle (Shift-Left AI)
**The closer the error is detected to the model, the fewer tokens are wasted.**
If an agent makes a syntactic error in step 1 and the harness does not warn until step 3 (CI), the agent will continue building faulty logic upon that base, resulting in a highly expensive "Cascading Hallucination" to debug.

## Technical Hook Examples

### Node.js / TypeScript (Husky + lint-staged)
In Node environments, the local harness must be configured to trigger the self-corrector after edits:

```json
// .lintstagedrc
{
 "*.ts": [
 "eslint --fix",
 "prettier --write",
 "jest --bail --findRelatedTests"
]
}
```

### Programmatic Hook (Agent SDK)
If you are building a custom agent, the validation pattern looks like this:

```typescript
async function onAfterFileEdit(filePath: string) {
 const { execSync } = require('child_process');
 try {
 execSync(`npx eslint ${filePath}`);
 } catch (error) {
 // Return the compilation error to the Agent for auto-repair
 throw new Error(`Linter Validation Failed: ${error.message}`);
 }
}
```

## Deterministic Validation vs LLM-Based
- **Deterministic Validation (Priority):** Compilers, Linters, Unit Tests. 100% binary results. Must always execute first.
- **LLM-Based Validation (Secondary):** Using a second smaller model to audit generated code (e.g., detecting complex logic vulnerabilities). Only use when static analysis is incapable of inferring semantic context.

---
[Back to Index](./README.md)
