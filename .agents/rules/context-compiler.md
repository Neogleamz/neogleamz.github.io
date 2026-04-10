# Context Memory Compiler Rule

When I instruct you to "sync architecture", "update memory", or "compile context", you must execute the following workflow to ensure our project documentation matches the reality of the codebase:

1. **Analyze Codebase State**: Use your tools to briefly scan the `src/`, `services/`, and API directories to understand the current file structure and data flow.
2. **Update the Blueprint**: 
   - Create or overwrite a file at `docs/ARCHITECTURE_MAP.md`.
   - Write a high-level, extremely concise summary of the app's current architecture. 
   - Detail exactly how the front-end communicates with the Node.js backend, and how the backend manages the Bluetooth LE connections to the Zengge hardware.
3. **Update the State Tree**: Include a markdown tree of the core project structure, noting what each primary directory is responsible for.
4. **Commit the Memory**: 
   - Execute `git add docs/ARCHITECTURE_MAP.md`
   - Execute `git commit -m "chore: update AI architecture memory map"`
5. **Halt**: Output a message confirming the map has been updated.
