# Pattern: Plan-and-Execute

We force the ecosystem to decouple strategic intent from tactical implementation.

1. **The Planner:** Receives the request and generates a DAG (Directed Acyclic Graph) of sequential or parallel steps.
2. **Checkpoint (Optional):** Pauses for human review of the Plan.
3. **The Executor:** A worker loop that takes the first plan item, completes it, marks as done, and moves to the next until the queue is drained.

---
[Back to Index](./README.md)
