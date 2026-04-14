---
name: health_check
description: "Scans the codebase for vulnerabilities and technical debt, then triages findings into the bucket list."
trigger: "/health_check, /health-check, run health check, clean the house"
---

# Tech Debt Janitor Workflow

When the user invokes `/health-check` (or uses phrases like "run health check" or "clean the house"), execute this maintenance sweep:

1. **Dependency Audit**: 
   - Run `npm outdated` and `npm audit` in the terminal.
   - Analyze the output. Prioritize vulnerabilities in "dependencies" (production code) over "devDependencies".
   - Note major version updates that might break the Vanilla JS/Browser environment.

2. **The TODO Hunt**: 
   - Use the `grep_search` tool to scan the codebase for: `TODO:`, `FIXME:`, and `HACK:`.
   - Extract the file path, line number, and a brief snippet of context for each.

3. **Bucket List Integration**: 
   - Open @/tools/SK8Lytz_Bucket_List.md.
   - If the file exceeds 30,000 characters, process the edit in parts.
   - Format findings into `- [ ]` tasks. Example: `- [ ] \`debt/security\` : Update noble library. [🤖 AI Model] [🧠 TBD / 5k] [💸 TBD / $0.02]`
   - **CRITICAL TELEMETRY RULE**: You MUST explicitly append the token tracking metadata to the end of EVERY generated task.
   - Append these to a section titled `## 🧹 Technical Debt` at the bottom of the file.

4. **SITREP**: 
   - Output a summary: 
     - Number of vulnerabilities (Critical vs. Moderate).
     - Number of new code-debt items found.
     - State of the `@/tools/SK8Lytz_Bucket_List.md` after the sync.
   - Wait for the user to select a priority from the new list.