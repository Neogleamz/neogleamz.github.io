---
name: zero_bypass_intake
description: "Triggers when the user requests to urgently pivot and execute a hotfix or major feature mid-session, interrupting their current workflow."
trigger: "/zero_bypass_intake, pivot to this, fix this bug right now, emergency hotfix"
---

# The Zero-Bypass Protocol (Emergency Pivot & Defibrillator)

When the user requests to actively pivot their session and drop everything to fix a new bug or build an urgent feature, execute this sequence:

1. **The Intercept**: Acknowledge the request by stating: *"Emergency pivot initiated. Stashing active context and routing through zero-bypass..."*
2. **Context Preservation (WIP Stash)**:
   - Run `git status` to check for active modifications.
   - If modifications exist, instantly execute `git add .` and `git commit -m "chore: WIP stash before emergency pivot"` to securely freeze their active epic context locally.
3. **Triaging & Injection**: 
   - Analyze the request. Generate a short slug for the task (e.g. `fix/auth-crash`).
   - Inject the task as a `- [ ]` markdown item into the top of the `## 🔴 P0 Critical (Blockers & Hotfixes)` section in @/tools/SK8Lytz_Bucket_List.md.
   - Append the token tracking tag (e.g., `[🤖 AI Model] [🧠 TBD / 5k] [💸 TBD / $0.02]`).
4. **Environment Reset & Execution**:
   - Execute `git checkout main`
   - Execute `git pull origin main` (if remote exists)
   - Execute `git checkout -b <slug>` to create the new hotfix workspace.
   - Present a highly-detailed Implementation Plan for the bug fix/feature, and await their approval to begin coding.

---

## 🛑 MANDATORY OUTPUT FORMAT (ALL MODELS MUST FOLLOW)

> [!CAUTION]
> **STRICT LINKING MANDATE:** You MUST NEVER surround file paths with backticks (like ile.md). You MUST ALWAYS use standard Markdown hyperlink syntax so the user can natively click them (e.g., [file.md](file:///absolute/path/to/file.md)).


After completing the context stash and environment reset (Steps 1-4), you MUST render the following structured output before presenting the Implementation Plan. Every model (Claude, Gemini, GPT) must produce this exact structure:

### 🚨 Zero-Bypass Pivot Confirmation

Render a Gate Results Table:
```
| Gate | Result | Detail |
|---|---|---|
| 💾 WIP Stash | ✅ | Committed `abc1234` on `feat/xxx` |
| 📋 P0 Injection | ✅ | `fix/auth-crash` added to P0 queue |
| 🔀 Branch Reset | ✅ | Checked out `main`, pulled latest |
| 🌿 Hotfix Branch | ✅ | Created `fix/auth-crash` |
```

Render a `> [!WARNING]` block: "Previous work on `feat/xxx` has been frozen at commit `abc1234`. Resume with `git checkout feat/xxx` after this hotfix is shipped."

Then present the Implementation Plan as usual.