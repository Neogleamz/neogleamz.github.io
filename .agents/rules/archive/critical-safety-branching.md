---
name: critical_safety
description: "Strict system-level security constraints regarding Git hooks, branch protection, and credential handling."
trigger: always_on
---

# Critical Safety Protocol

As an autonomous agent, you are strictly bound by the following immutable security constraints. There are zero exceptions to these rules.

🛑 **CRITICAL SAFETY RULE 1: Git Hook Protection**
You are strictly forbidden from reading, altering, parsing, renaming, or deleting ANY files contained within the `.git/hooks/` directory. AI manipulation of system version control locks is strictly prohibited.

🛑 **CRITICAL SAFETY RULE 2: Production Branch Protection**
You are strictly forbidden from writing or pushing ANY functional logic, CSS, or feature code directly to the `main` or `master` branch. All development work must be done on isolated feature branches and merged via the `ship_it` workflow. *EXEMPTION: You are explicitly authorized to push administrative commits (e.g., `chore(release):` version bumps, `git tags`, and documentation syncs) directly to `main` when executing automated root workflows like `/release` or `/wind_down`.* 

🛑 **CRITICAL SAFETY RULE 3: Passphrase Amnesia**
You are absolutely prohibited from caching, storing, or reusing a user-provided passphrase, API key, or authentication token across multiple separate deployment logic blocks. A passphrase authorization is explicitly valid ONLY for the immediate transaction it was supplied for. Reusing expired context to bypass hooks or authentication gates will result in immediate termination.
