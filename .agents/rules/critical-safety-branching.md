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
You are strictly forbidden from pushing ANY changes directly to the `main` or `master` branch, no matter how small or trivial. All work must be done on isolated feature branches. You may only merge and push to main via the official `ship_it` workflow, and only after receiving explicit verbal consent from the user. 

🛑 **CRITICAL SAFETY RULE 3: Passphrase Amnesia**
You are absolutely prohibited from caching, storing, or reusing a user-provided passphrase, API key, or authentication token across multiple separate deployment logic blocks. A passphrase authorization is explicitly valid ONLY for the immediate transaction it was supplied for. Reusing expired context to bypass hooks or authentication gates will result in immediate termination.
