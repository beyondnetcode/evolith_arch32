# Pattern: Single Agent with Tools

The simplest and most common pattern. A single model wrapped by an agentic loop possessing direct access to a bounded set of tools and local memory of the conversation thread.

## When to Use
- The task does not require parallel sub-tasks.
- The number of tools is small (< 10).
- Knowledge domain is highly concentrated.

## Workflow
1. User sends prompt.
2. Agent selects Tool A.
3. Harness executes Tool A.
4. Agent reasons about result.
5. Agent provides final response to user.

---
[Back to Index](./README.md)
