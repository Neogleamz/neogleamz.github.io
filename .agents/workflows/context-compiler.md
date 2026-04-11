---
name: context_memory_compiler
description: "Forces the AI to scan the codebase and update the architectural blueprint within the Master Reference."
trigger: "/sync, sync architecture, update memory, compile context"
---

# Context Memory Compiler Workflow

When the user invokes `/sync` (or says "sync architecture", "update memory", or "compile context"), you must execute the following workflow to ensure our project documentation matches the reality of the codebase:

1. **Analyze Codebase State**: Use your `run_command` or file-reading tools to briefly scan the `src/` directory to understand the current file structure, Vanilla JS module imports, and data flow.
2. **Update the Blueprint**: 
   - Open `@/tools/SK8Lytz_App_Master_Reference.md` (remembering to process in chunks if it exceeds 30,000 characters).
   - Locate the `## Architecture Map` section (create it if it doesn't exist).
   - Strictly adhering to the *Surgical Strike Protocol*, inject a high-level, extremely concise summary of the app's current architecture. 
   - Detail exactly how the Vanilla JS front-end communicates with Supabase (via the JS client), and how the client-side browser logic manages the Bluetooth LE connections using the Web Bluetooth API (`navigator.bluetooth`).
3. **Update the State Tree**: Include a markdown tree of the core project structure, noting what each primary directory is responsible for.
4. **Commit the Memory**: 
   - Execute `git status` to verify.
   - Execute `git add tools/SK8Lytz_App_Master_Reference.md`
   - Execute `git commit -m "docs(architecture): compile and sync context memory map"`
5. **Halt**: Output a message confirming the Master Reference has been updated and the AI's context is officially synced.