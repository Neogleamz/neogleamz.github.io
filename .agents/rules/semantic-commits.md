---
description: "Auto-migrated Core A.I. Rule"
mode: "always"
trigger: "always_on"
---

# The Semantic Commits Enforcer Rule

Whenever you execute a Git commit on behalf of the user, you are **forbidden** from writing a generic or unstructured commit message.
1. You must strictly adhere to the Conventional Commits framework. 
   **Format:** `type(scope): subject`
2. Allowed Types:
   - `feat:` for new UI fragments, screens, or core modules.
   - `fix:` for resolving bugs, crashing, or incorrect behaviors.
   - `docs:` for modifying the Master Reference or Readme.
   - `style:` for code formatting or CSS structure (no logic changes).
   - `refactor:` for rearranging code logic without changing behavior.
   - `perf:` for performance/memory improvements (React loop optimization, etc).
   - `chore:` for updating rules, tooling, bucket lists, or managing dependencies.
3. The `scope` must accurately reflect the specific component or system being modified in parentheses (e.g., `feat(ble-protocol)`, `fix(docked-controller)`, `docs(master-reference)`).
4. If a commit contains a breaking change to the database or Ble protocol, you must append `!` to the type (e.g., `feat(db)!: added required columns`).
5. If a commit is generated automatically via a Ship-It or Bucketlist phase, you must dynamically inject this formatting scheme into the automated `git commit -m` command.
