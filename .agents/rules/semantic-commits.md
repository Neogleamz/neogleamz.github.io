---
name: semantic_commits
description: "Strict enforcement of Conventional Commits formatting for all version control operations."
trigger: "/commits, /git, semantic commits"
---

# Semantic Commits Enforcer Rule

**🛑 MANDATORY 24/7 CONTINUOUS MICRO-COMMIT RULE 🛑**
You are strictly commanded to operate in a continuous micro-commit workflow at all times, 24/7, 365 days a year. 
- You MUST instantly execute a `git add` and `git commit` immediately after modifying ANY file in the codebase.
- You must NOT wait until the end of a feature, workflow, or prompt to bundle changes together. 
- Every single logical change, bug fix, or syntax tweak must be instantly locked into the local history using semantic commits. No exceptions.

Whenever you execute "any" Git commit on behalf of the user, you are **forbidden** from writing a generic or unstructured commit message.

1. You must strictly adhere to the Conventional Commits framework. 
   **Format:** `type(scope): subject`

2. Allowed Types:
   - `feat:` for new UI fragments, screens, or core modules.
   - `fix:` for resolving bugs, crashes, or incorrect behaviors.
   - `docs:` for modifying the Master Reference or Readme.
   - `style:` for code formatting or CSS structure (no DOM logic changes).
   - `refactor:` for rearranging code logic without changing behavior.
   - `perf:` for performance/memory improvements (e.g., optimizing DOM repaints, fixing event listener memory leaks).
   - `chore:` for updating rules, tooling, bucket lists, or managing dependencies.

3. The `scope` must accurately reflect the specific component or system being modified in parentheses (e.g., `feat(production-manager)`, `fix(soulz-ble-sync)`, `docs(master-reference)`).

4. If a commit contains a breaking change to the database or hardware protocol, you must append `!` to the type (e.g., `feat(ble-protocol)!: altered required data packets`).

5. If a commit is generated automatically via a workflow (such as the Midnight Oil Protocol), you must dynamically inject this formatting scheme into the automated `git commit -m` command.