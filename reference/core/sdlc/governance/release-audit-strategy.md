# · Automated Versioning & Continuous Audit Strategy

To maintain a strict, traceable audit log synchronized with GitHub, this repository can use the spec-driven AI-DD method [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) without making it the identity of the documentation. The release process does not rely on manual document drafting. Instead, we leverage the engineering workflow already in place (**Conventional Commits**) combined with the native power of our orchestrator: **Nx Release**.

## 1. The Pillar: Conventional Commits
Since we have already implemented `commitlint`, the repository knows exactly what type of change occurred.
- `fix(auth): ...` -> Generates an automatic patch release (e.g., `v1.0.0` to `v1.0.1`).
- `feat(api): ...` -> Generates an automatic minor release (e.g., `v1.0.1` to `v1.1.0`).
- If a commit includes `BREAKING CHANGE` -> Generates an automatic major release (e.g., `v1.1.0` to `v2.0.0`).

## 2. Automation with `nx release`
Nx includes a native versioning suite for monorepos that executes the following audit cycle with a single command (`npx nx release`):

1. **Automatic Versioning**: Nx analyzes all commits since the last deployment and calculates the new SemVer (Semantic Versioning) for the API and Web applications.
2. **`CHANGELOG.md` Generation**: Nx creates (or updates) a physical `CHANGELOG.md` file in the project's root. This file serves as your **Official Audit Document**, detailing:
 - Newly added features.
 - Resolved bug fixes.
 - Hypertext links pointing directly to the commit hashes on GitHub for absolute traceability.
3. **Git Tagging**: Creates a tag in Git (e.g., `v1.1.0`) pointing exactly to the state of the codebase at that specific moment.
4. **GitHub Releases Synchronization**: When configured with GitHub Actions, this `CHANGELOG` is automatically published under the "Releases" tab of your cloud repository.

---

## 3. Benefits for Reference Skeleton
* **Zero Manual Effort**: No more manual drafting of release notes.
* **Forensic Auditing**: If a version like `v1.2.0` fails in production, `CHANGELOG.md` tells you exactly which commits introduced the error and who made them.
* **Total Transparency**: Executives or QA can see a user-friendly, human-readable document in GitHub Releases explaining what each deployment contains.

---

## 4. Action Plan (Next Steps)
To activate this, we only need to:
1. Modify your `nx.json` file to enable the `"release"` configuration block.
2. Test generating our first `v1.0.0` version and our first foundational `CHANGELOG.md`.

---
[Back to Index](./README.md)
