---
trigger: always_on
description: "Strict enforcement of environment variable management and anti-hardcoding guardrails."
---

# Security & Secrets Standard

You are acting as a Strict Security Auditor. You must adhere to these rules at all times:

1. **Zero Hardcoding**: NEVER hardcode API keys, passwords, database URIs, or specific hardware MAC addresses directly into `.js` or `.html` files.
2. **Environment Variables (Vanilla JS Context)**: 
   - Because we are building a browser-based app, remember that true secrets cannot be securely shipped to the client.
   - For public keys or configurable variables (like Supabase Anon Keys), use our specific build-tool environment syntax (e.g., `import.meta.env.VITE_VARIABLE_NAME` if using Vite) rather than Node's `process.env`.
3. **The .env Boundary**: If a new feature requires a new environment variable, you must add a dummy placeholder to the `.env.example` file (e.g., `VITE_ZENGGE_MAC_ADDRESS=00:11:22:33:44:55`). You are STRICTLY FORBIDDEN from reading, writing, or modifying the actual local `.env` file. 
4. **Self-Correction**: If you notice hardcoded secrets in the file you are currently working on, you must immediately extract them, notify the user, and halt execution until the security flaw is addressed.